import { query } from '../db'

/**
 * The 5S rules that must hold no matter who is writing.
 *
 * Both of these existed only in the browser. Measured against the live backend:
 *
 *   PUT /fiveSFindings/<id>   {"status":"closed"}          -> 200, row closed
 *                             with photo_after_url NULL
 *   PUT /fiveSAuditPlans/<id> {"planned_date":…} x5        -> 200 every time,
 *                             date_change_count reached 5 against a cap of 2
 *
 * The screen disables the control and explains why; the API accepted both. A
 * rule that only the UI enforces is not a rule — the whole point of requiring
 * an "after" photo is that a finding cannot be reported as resolved without
 * evidence, and the point of the date cap is that an audit cannot be postponed
 * indefinitely.
 *
 * This runs as the host's `onRequest` guard, which nucleus chains ahead of its
 * own inbound guard, so it covers the generated CRUD routes it could not
 * otherwise reach. Returning a Response short-circuits; returning nothing lets
 * the request through.
 */

const FINDING_PATH = /^\/fiveSFindings\/([^/?]+)/
const PLAN_PATH = /^\/fiveSAuditPlans\/([^/?]+)/
const PLAN_COLLECTION = /^\/fiveSAuditPlans\/?$/
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH'])

/** The cap the planning screen shows as "Düzenle (N hak)". */
export const MAX_DATE_CHANGES = 2

export type RuleContext = {
  request: Request
  body: unknown
  /** Injected so the rules can be tested without a database. */
  read?: (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>
}

function refuse(message: string): Response {
  return new Response(
    JSON.stringify({ success: false, isSuccess: false, message, errors: [{ message }] }),
    { status: 400, headers: { 'content-type': 'application/json' } }
  )
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/**
 * A calendar day, compared as a day.
 *
 * node-pg parses a `date` column into a Date at LOCAL midnight, so on this
 * machine (UTC+3) `2026-11-02` becomes `2026-11-01T21:00:00Z` and
 * `toISOString().slice(0,10)` reads it as the 1st. That made writing the SAME
 * date back look like a move, and it was refused with "no changes left" —
 * caught by testing the no-op path, not by reading the code.
 */
export function toDateKey(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value ?? '').slice(0, 10)
}

/** True when the value names a photo — a url or a file id, not an empty array. */
export function hasAfterPhoto(row: Record<string, unknown>): boolean {
  const url = row.photo_after_url ?? row.photoAfterUrl
  if (typeof url === 'string' && url.trim()) return true

  const fileId = row.photo_after_file_id ?? row.photoAfterFileId
  if (typeof fileId === 'string' && fileId.trim()) return true

  const files = row.photo_after_files ?? row.photoAfterFiles
  if (Array.isArray(files) && files.length > 0) return true
  if (typeof files === 'string') {
    try {
      const parsed = JSON.parse(files)
      if (Array.isArray(parsed) && parsed.length > 0) return true
    } catch {
      // Not JSON; a non-empty string here is not evidence of a photo.
    }
  }
  return false
}

/*
 * `onRequest` runs BEFORE nucleus parses the body, so `ctx.body` is undefined
 * there — measured, not assumed: the probe logged
 * `PUT /fiveSFindings/<id> body= undefined`. The guard therefore reads it
 * itself, from a CLONE, so the stream nucleus is about to read is untouched.
 */
async function readBody(ctx: RuleContext): Promise<Record<string, unknown>> {
  if (ctx.body !== undefined && ctx.body !== null) return asRecord(ctx.body)
  const type = ctx.request.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return {}
  try {
    return asRecord(await ctx.request.clone().json())
  } catch {
    // A malformed body is the route's problem to report, not this guard's.
    return {}
  }
}

export async function enforceBusinessRules(ctx: RuleContext): Promise<Response | undefined> {
  const { request } = ctx
  if (!WRITE_METHODS.has(request.method)) return undefined

  const path = new URL(request.url).pathname
  if (!FINDING_PATH.test(path) && !PLAN_PATH.test(path) && !PLAN_COLLECTION.test(path)) {
    return undefined
  }

  const body = await readBody(ctx)
  const read = ctx.read ?? query

  const finding = request.method !== 'POST' ? FINDING_PATH.exec(path) : null
  if (finding && String(body.status ?? '').toLowerCase() === 'closed') {
    // A photo supplied in the SAME request counts; the screen uploads first,
    // but a caller may legitimately do both at once.
    if (hasAfterPhoto(body)) return undefined

    const rows = await read(
      'select photo_after_url, photo_after_file_id, photo_after_files from main.five_s_findings where id = $1',
      [finding[1]]
    )
    const row = rows[0]
    if (!row) return undefined // Let the route answer 404 in its own words.
    if (!hasAfterPhoto(row)) {
      return refuse('Bulgu kapatılamaz: önce "Sonrası Fotoğraf" yüklenmelidir.')
    }
    return undefined
  }

  /*
   * A plan belongs to its period. The screen disables "Denetim Planı Oluştur"
   * for a date outside the parent's range; the API accepted 2027-03-15 into a
   * period running 2026-10-01 to 2026-12-31. The quarterly cycle is what the
   * whole 5S programme is reported on, so an audit filed under the wrong
   * quarter is not a cosmetic problem.
   */
  /*
   * A plan is one of two shapes, and "neither" is not one of them.
   *
   * A PERIOD plan carries a quarter and a date range; an AUDIT plan carries a
   * date, a location and a team. Both UI forms require exactly that
   * (submitParentPlan needs quarter + start + end, submitSubPlan needs date +
   * location + team), but none of those columns is NOT NULL, so the API
   * accepted a plan with nothing in it at all. Seven such rows reached the
   * planning screen and rendered as "— ? – ? 0 denetim planı".
   */
  if (PLAN_COLLECTION.test(path) && request.method === 'POST') {
    const body0 = await readBody(ctx)
    const has = (k: string) => {
      const v = body0[k] ?? body0[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]
      return typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null
    }
    const isPeriod = has('quarter') && has('date_range_start') && has('date_range_end')
    const isAudit = has('planned_date') && has('location_id') && has('assigned_team_id')
    if (!isPeriod && !isAudit) {
      return refuse(
        'Plan kaydedilemedi: bir dönem planı için çeyrek ve tarih aralığı, bir denetim planı için tarih, lokasyon ve ekip gereklidir.'
      )
    }
  }

  const planCreate = PLAN_COLLECTION.test(path) && request.method === 'POST'
  if (planCreate || (PLAN_PATH.test(path) && body.planned_date !== undefined)) {
    const parentId = String(body.parent_plan_id ?? body.parentPlanId ?? '').trim()
    const date = toDateKey(body.planned_date)
    if (parentId && date) {
      const parents = await read(
        'select date_range_start, date_range_end, quarter from main.five_s_audit_plans where id = $1',
        [parentId]
      )
      const parent = parents[0]
      if (parent) {
        const from = toDateKey(parent.date_range_start)
        const to = toDateKey(parent.date_range_end)
        if ((from && date < from) || (to && date > to)) {
          return refuse(
            `Denetim tarihi, bağlı olduğu dönemin (${parent.quarter ?? 'dönem'}) ${from} – ${to} aralığı dışında olamaz.`
          )
        }
      }
    }
  }

  const plan = request.method !== 'POST' ? PLAN_PATH.exec(path) : null
  if (plan && body.planned_date !== undefined) {
    const rows = await read(
      'select planned_date, date_change_count from main.five_s_audit_plans where id = $1',
      [plan[1]]
    )
    const row = rows[0]
    if (!row) return undefined

    const stored = toDateKey(row.planned_date)
    const incoming = toDateKey(body.planned_date)

    // Writing the same date back is not a change; only a real move counts.
    if (!incoming || incoming === stored) return undefined

    const used = Number(row.date_change_count ?? 0)
    if (Number.isFinite(used) && used >= MAX_DATE_CHANGES) {
      return refuse(
        `Denetim tarihi en fazla ${MAX_DATE_CHANGES} kez değiştirilebilir; bu plan için hak kalmadı.`
      )
    }
    return undefined
  }

  return undefined
}
