import { query } from '../db'
import { type Caller, isAdmin, isCentral, resolveCaller } from './caller'

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
const AUDIT_PATH = /^\/fiveSAudits\/([^/?]+)/
const AUDIT_COLLECTION = /^\/fiveSAudits\/?$/
const PLAN_PATH = /^\/fiveSAuditPlans\/([^/?]+)/
const PLAN_COLLECTION = /^\/fiveSAuditPlans\/?$/
const FINDING_COLLECTION = /^\/fiveSFindings\/?$/
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH'])
const LOCATION_ITEM = /^\/fiveSLocations\/([^/?]+)\/?$/
const TEAM_ITEM = /^\/fiveSAuditTeams\/([^/?]+)\/?$/
/** `DELETE /<entity>/bulk`, an array of ids; see the DELETE branch below. */
const MASTER_BULK = /^\/(fiveSLocations|fiveSAuditTeams)\/bulk\/?$/

/**
 * A plan the auditor has sent and Merkez Ekip has not yet approved.
 *
 * The customer's rule (7 Oct notes, #28): an audit the auditor closes is not
 * finished until Merkez Ekip looks at it. Until then the plan sits here; only
 * Merkez Ekip moves it to `completed`.
 */
export const PENDING_APPROVAL = 'pending_approval'

/** The cap the planning screen shows as "Düzenle (N hak)". */
export const MAX_DATE_CHANGES = 2

/**
 * Today, on the plant's calendar.
 *
 * The pool opens with `-c timezone=UTC`, so a plain server-side date is up to
 * three hours behind the people using this. Between 00:00 and 03:00 in Turkey
 * that makes the current day look like tomorrow, and a rule that refuses
 * "tomorrow" would refuse a finding recorded right now.
 */
export const PLANT_TZ = process.env.BILTIM_TZ || 'Europe/Istanbul'

export function todayAtPlant(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PLANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export type RuleContext = {
  request: Request
  body: unknown
  /** Injected so the rules can be tested without a database. */
  read?: (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>
  /**
   * Who is calling, injected by tests. Left undefined, it is read from the
   * request's access token (see `caller.ts`) — and only when a rule needs it.
   */
  caller?: Caller | null
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

/**
 * A location or team an open plan still points at cannot be deleted.
 *
 * `five_s_audit_plans.location_id` and `assigned_team_id` carry no foreign
 * key, and nucleus's generic DELETE is a hard delete, so nothing stopped it.
 * Measured on production (30 Sep, 11:45 UTC): three locations and three teams
 * were deleted from Ana Veri Yönetimi while two planned audits still named
 * them. The plans stayed, pointing at rows that no longer exist; the home
 * page showed "-" for the location and "—" for the team, and nobody could say
 * where or by whom those audits were meant to be done.
 *
 * Completed plans do not block: they are history, and the customer must be
 * able to clean test data out. The message says what to do instead.
 */
async function guardMasterDataDelete(
  path: string,
  read: NonNullable<RuleContext['read']>
): Promise<Response | undefined> {
  const target = LOCATION_ITEM.exec(path)
    ? { id: LOCATION_ITEM.exec(path)?.[1], column: 'location_id', label: 'Bu lokasyon', hint: 'lokasyonu pasif yapın' }
    : TEAM_ITEM.exec(path)
      ? { id: TEAM_ITEM.exec(path)?.[1], column: 'assigned_team_id', label: 'Bu ekip', hint: 'ekibi pasif yapın' }
      : null
  if (!target?.id) return undefined

  // `::text` so an id that is not a uuid answers "no plan" instead of a 500.
  // `coalesce(is_active, true)`: a plan nobody deactivated is active.
  const rows = await read(
    `select count(*)::int as n from main.five_s_audit_plans
      where ${target.column}::text = $1 and coalesce(is_active, true)
        and coalesce(status, '') <> 'completed'`,
    [decodeURIComponent(target.id)]
  )
  const open = Number(rows[0]?.n ?? 0)
  if (!Number.isFinite(open) || open <= 0) return undefined
  return refuse(
    `${target.label} ${open} açık denetim planında kullanılıyor; silinirse o planların nerede ve kimle yapılacağı kaybolur. Önce planları başka birine taşıyın ya da silin, veya ${target.hint}.`
  )
}

/** The ids a `DELETE …/bulk` names; its body is a bare JSON array. */
async function readIdArray(request: Request): Promise<string[]> {
  try {
    const parsed = await request.clone().json()
    return Array.isArray(parsed) ? parsed.map((v) => String(v ?? '')).filter(Boolean) : []
  } catch {
    return []
  }
}

/** Display names for user ids: "Ad Soyad", or the e-mail when there is no profile. */
async function userNames(read: NonNullable<RuleContext['read']>, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const rows = await read(
    `select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email, u.id::text) as name
       from main.users u left join main.profiles p on p.user_id = u.id
      where u.id::text = any($1::text[])`,
    [ids]
  )
  return rows.map((r) => String(r.name ?? '')).filter(Boolean)
}

/** A jsonb array as node-pg hands it over: already parsed, or still text. */
function jsonArray(value: unknown): unknown[] {
  let v = value
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return []
    }
  }
  return Array.isArray(v) ? v : []
}

function jsonIds(value: unknown): string[] {
  return jsonArray(value)
    .map((x) => String(x ?? ''))
    .filter(Boolean)
}

/**
 * A location's field manager cannot be on the team that audits it (#13).
 *
 * The 5S audit is an outside look at a place; the person responsible for the
 * place auditing it is the one thing the method rules out. The planner let any
 * team be put on any location. Returns the names that clash, empty when none.
 */
export async function fieldManagerOnTeam(
  read: NonNullable<RuleContext['read']>,
  locationId: string,
  teamId: string
): Promise<string[]> {
  if (!locationId || !teamId) return []
  const locations = await read(
    'select field_manager_user_ids from main.five_s_locations where id::text = $1',
    [locationId]
  )
  const managers = new Set(jsonIds(locations[0]?.field_manager_user_ids))
  if (managers.size === 0) return []

  const teams = await read('select leader_user_id from main.five_s_audit_teams where id::text = $1', [teamId])
  const members = await read(
    `select user_id from main.five_s_audit_team_members
      where team_id::text = $1 and coalesce(is_active, true)`,
    [teamId]
  )
  const onTeam = new Set(
    [teams[0]?.leader_user_id, ...members.map((m) => m.user_id)].filter(Boolean).map(String)
  )
  const clash = [...onTeam].filter((id) => managers.has(id))
  if (clash.length === 0) return []
  const names = await userNames(read, clash)
  return names.length > 0 ? names : clash
}

/** How many photos a finding row (or a write to one) carries on one side. */
export function photoCount(row: Record<string, unknown>, side: 'before' | 'after'): number {
  const files = jsonArray(row[`photo_${side}_files`]).length
  const url = row[`photo_${side}_url`]
  return Math.max(files, typeof url === 'string' && url.trim() ? 1 : 0)
}

export async function enforceBusinessRules(ctx: RuleContext): Promise<Response | undefined> {
  const { request } = ctx
  const read = ctx.read ?? query

  // Who is calling, looked up once and only when a rule asks.
  let callerLookup: Promise<Caller | null> | undefined
  const who = (): Promise<Caller | null> => {
    if (ctx.caller !== undefined) return Promise.resolve(ctx.caller)
    callerLookup ??= resolveCaller(request, read).catch(() => null)
    return callerLookup
  }

  if (request.method === 'DELETE') {
    const deletePath = new URL(request.url).pathname

    /*
     * The second door. nucleus serves `DELETE /<entity>/bulk` for any entity
     * whose bulk endpoints are switched on; Biltim's are off today, so this is
     * the check waiting on the door if they are ever switched on. Each id goes
     * through the same rule as the by-id DELETE.
     */
    const bulk = MASTER_BULK.exec(deletePath)
    if (bulk) {
      for (const id of await readIdArray(request)) {
        const refusal = await guardMasterDataDelete(`/${bulk[1]}/${encodeURIComponent(id)}`, read)
        if (refusal) return refusal
      }
      return undefined
    }

    if (!LOCATION_ITEM.test(deletePath) && !TEAM_ITEM.test(deletePath)) return undefined
    return guardMasterDataDelete(deletePath, read)
  }
  if (!WRITE_METHODS.has(request.method)) return undefined

  const path = new URL(request.url).pathname
  if (
    !FINDING_PATH.test(path) &&
    !FINDING_COLLECTION.test(path) &&
    !PLAN_PATH.test(path) &&
    !PLAN_COLLECTION.test(path) &&
    !AUDIT_PATH.test(path) &&
    !AUDIT_COLLECTION.test(path)
  ) {
    return undefined
  }

  const body = await readBody(ctx)

  /*
   * Nothing was found, and no audit was carried out, on a day that has not
   * happened yet.
   *
   * Measured: five of the eight audits in the database carried a date in the
   * future, because picking a planned audit copies the PLAN's date into the
   * form — an audit performed today against a plan dated 5 December was
   * recorded as happening on 5 December. Two findings inherited the same
   * date. The consequence is not cosmetic: the reports endpoint averages
   * (completed_at - detected_date), and with a detection date in the future
   * that average came out at **-88 days**. "Bu ay yapılan denetimler" counts
   * the same column.
   *
   * A plan's own `planned_date` is deliberately not checked here — a plan is
   * supposed to be in the future.
   */
  const bodyDates = await readBody(ctx)
  const today = todayAtPlant()
  const futureField = (
    [
      ['detected_date', 'detectedDate', 'Tespit tarihi'],
      ['audit_date', 'auditDate', 'Denetim tarihi'],
    ] as const
  ).find(([snake, camel]) => {
    const raw = bodyDates[snake] ?? bodyDates[camel]
    if (raw === undefined || raw === null || raw === '') return false
    const key = toDateKey(raw)
    return key !== '' && key > today
  })
  if (futureField) {
    return refuse(`${futureField[2]} gelecekte olamaz.`)
  }

  /*
   * A 5S score is out of 100, and the database will take 150.
   *
   * Measured: the edit modal's own field says max="100" and the browser marks
   * 150 invalid, but the form submits regardless — the audit was stored with
   * total_score 150.00, and PATCH with the same value answered 200. Every
   * number the customer is shown is computed from these columns: the period
   * average, the "hedef üstü / hedef altında" verdict, the trend line. One
   * mistyped score moves all of them, and nothing on any screen says the value
   * is impossible.
   *
   * The ceiling is the one the form already claims, so this refuses only what
   * the screen would never have sent.
   */
  if (AUDIT_PATH.test(path) || AUDIT_COLLECTION.test(path)) {
    const b = await readBody(ctx)
    const SCORE_FIELDS: Array<[string, string]> = [
      ['total_score', 'Toplam puan'],
      ['score_s1', 'S1 puanı'],
      ['score_s2', 'S2 puanı'],
      ['score_s3', 'S3 puanı'],
      ['score_s4', 'S4 puanı'],
      ['score_s5', 'S5 puanı'],
    ]
    for (const [snake, label] of SCORE_FIELDS) {
      const camel = snake.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
      const raw = b[snake] ?? b[camel]
      if (raw === undefined || raw === null || raw === '') continue
      const n = Number(raw)
      if (!Number.isFinite(n)) {
        return refuse(`${label} sayı olmalıdır.`)
      }
      if (n < 0 || n > 100) {
        return refuse(`${label} 0 ile 100 arasında olmalıdır; gönderilen: ${raw}.`)
      }
    }
  }

  /*
   * A closed finding keeps its evidence (#31).
   *
   * Closing requires an "after" photo, and the photo is what the finding is
   * closed ON. The screen let anyone who could edit the finding remove it
   * afterwards, which left a closed finding with nothing behind the word
   * "closed". Removing a photo from a closed finding is now Merkez Ekip's or a
   * Super Admin's call; adding one stays open to everyone.
   */
  const findingItem = request.method !== 'POST' ? FINDING_PATH.exec(path) : null
  if (findingItem) {
    const sides = (['after', 'before'] as const).filter(
      (side) => `photo_${side}_files` in body || `photo_${side}_url` in body
    )
    if (sides.length > 0) {
      const rows = await read(
        `select status, photo_after_url, photo_after_files, photo_before_url, photo_before_files
           from main.five_s_findings where id::text = $1`,
        [decodeURIComponent(findingItem[1] ?? '')]
      )
      const row = rows[0]
      if (row && String(row.status ?? '').toLowerCase() === 'closed') {
        const removes = sides.some((side) => {
          const next = { ...row }
          for (const key of [`photo_${side}_files`, `photo_${side}_url`]) {
            if (key in body) next[key] = body[key]
          }
          return photoCount(next, side) < photoCount(row, side)
        })
        if (removes && !isAdmin(await who())) {
          return refuse(
            'Kapatılmış bulgunun fotoğrafı yalnız Merkez Ekip veya Super Admin tarafından silinebilir.'
          )
        }
      }
    }
  }

  /*
   * Nobody audits the place they are responsible for (#27).
   *
   * Someone can be an auditor on one team and a location's field manager at
   * the same time. The home page offered them "Denetimi Başlat" on the audit of
   * their own location, and the audit was saved. An audit is recorded against
   * a plan by POST /fiveSAudits with `plan_id`; that is where it is refused.
   * Merkez Ekip, who may correct any audit, is not held to it.
   */
  if (AUDIT_COLLECTION.test(path) && request.method === 'POST') {
    const planId = String(body.plan_id ?? body.planId ?? '').trim()
    if (planId) {
      const caller = await who()
      if (caller && !isCentral(caller)) {
        const rows = await read(
          `select l.field_manager_user_ids from main.five_s_audit_plans p
             join main.five_s_locations l on l.id = p.location_id
            where p.id::text = $1`,
          [planId]
        )
        if (jsonIds(rows[0]?.field_manager_user_ids).includes(caller.userId)) {
          return refuse(
            'Saha sorumlusu olduğunuz lokasyonun denetimini siz yapamazsınız; bu denetimi ekipteki diğer denetçiler başlatmalıdır.'
          )
        }
      }
    }
  }

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
   * A finding needs to say what was found, and where.
   *
   * None of description, location_name, finding_type or detected_date is NOT
   * NULL, so POST /fiveSFindings with an empty body answered 200 and created a
   * row. Eight of them existed in the local database with nothing in any
   * column — invisible on the dashboard, which counts through five_s_audits,
   * and meaningless in the register. The audit form and the single-finding
   * modal both require all four.
   */
  if (FINDING_COLLECTION.test(path) && request.method === 'POST') {
    const body0 = await readBody(ctx)
    const has = (k: string) => {
      const v = body0[k] ?? body0[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]
      return typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null
    }
    const missing = ['description', 'location_name', 'finding_type', 'detected_date'].filter(
      (k) => !has(k)
    )
    if (missing.length > 0) {
      return refuse(
        `Bulgu kaydedilemedi: ${missing.join(', ')} alanları zorunludur.`
      )
    }
  }

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

  /*
   * The location's field manager is not on the team sent to audit it (#13).
   * Checked when an audit plan is created, and when a plan's location or team
   * changes — the stored half fills in whichever the write leaves out.
   */
  const planItem = request.method !== 'POST' ? PLAN_PATH.exec(path) : null
  const touchesPlacement = 'location_id' in body || 'assigned_team_id' in body
  if ((planCreate || planItem) && touchesPlacement) {
    let locationId = String(body.location_id ?? '').trim()
    let teamId = String(body.assigned_team_id ?? '').trim()
    if (planItem && (!locationId || !teamId)) {
      const rows = await read(
        'select location_id, assigned_team_id from main.five_s_audit_plans where id::text = $1',
        [decodeURIComponent(planItem[1] ?? '')]
      )
      locationId ||= String(rows[0]?.location_id ?? '')
      teamId ||= String(rows[0]?.assigned_team_id ?? '')
    }
    const clash = await fieldManagerOnTeam(read, locationId, teamId)
    if (clash.length > 0) {
      return refuse(
        `${clash.join(', ')} bu lokasyonun saha sorumlusu; kendi lokasyonunu denetleyen ekipte yer alamaz. Başka bir ekip seçin ya da ekibi düzenleyin.`
      )
    }
  }

  /*
   * Only Merkez Ekip finishes an audit (#28).
   *
   * Sending the form used to stamp the plan `completed`. It now stamps it
   * `pending_approval`, and `completed` is what Merkez Ekip's "Onayla" writes.
   * A client that still sends `completed` — an iPad on the old screen — is
   * told why rather than allowed past the approval.
   */
  if (planCreate && String(body.status ?? '') === 'completed' && !isCentral(await who())) {
    return refuse('Denetim planı tamamlandı olarak oluşturulamaz; tamamlamayı Merkez Ekip onaylar.')
  }

  if (planItem) {
    const touches =
      body.planned_date !== undefined || body.status !== undefined || body.date_change_count !== undefined
    if (!touches) return undefined

    const rows = await read(
      'select planned_date, date_change_count, status from main.five_s_audit_plans where id::text = $1',
      [decodeURIComponent(planItem[1] ?? '')]
    )
    const row = rows[0]
    if (!row) return undefined

    const storedStatus = String(row.status ?? '')
    const incomingStatus = body.status === undefined ? undefined : String(body.status ?? '')
    const used = Number(row.date_change_count ?? 0)

    if (incomingStatus === 'completed' && storedStatus !== 'completed' && !isCentral(await who())) {
      return refuse(
        'Denetim Merkez Ekip onayıyla tamamlanır. Denetçi formu gönderdiğinde plan "Onay Bekliyor" durumuna geçer.'
      )
    }
    if (
      storedStatus === 'completed' &&
      incomingStatus !== undefined &&
      incomingStatus !== 'completed' &&
      !isCentral(await who())
    ) {
      return refuse('Tamamlanmış bir denetimin durumu yalnız Merkez Ekip tarafından değiştirilebilir.')
    }

    // The two changes a plan is allowed are spent, not refilled — except by
    // the godmin, the install's own account for putting things right.
    if (body.date_change_count !== undefined) {
      const incomingCount = Number(body.date_change_count)
      if (Number.isFinite(incomingCount) && Number.isFinite(used) && incomingCount < used) {
        if (!(await who())?.isGod) {
          return refuse('Tarih değiştirme hakkı geri verilemez.')
        }
      }
    }

    if (body.planned_date !== undefined) {
      const stored = toDateKey(row.planned_date)
      const incoming = toDateKey(body.planned_date)

      // Writing the same date back is not a change; only a real move counts.
      if (!incoming || incoming === stored) return undefined

      const caller = await who()

      /*
       * The date of an audit that has been carried out is a record, not a plan
       * (#16). Merkez Ekip may correct it; the team leader who could move it
       * while it was planned may not rewrite it afterwards.
       */
      const done = storedStatus === 'completed' || storedStatus === PENDING_APPROVAL
      if (done && !isCentral(caller)) {
        return refuse('Tamamlanmış denetimin tarihi yalnız Merkez Ekip tarafından değiştirilebilir.')
      }

      // #32: the godmin moves any date, any number of times. A correction to a
      // finished audit is not a postponement and does not spend a change.
      if (caller?.isGod || done) return undefined

      if (Number.isFinite(used) && used >= MAX_DATE_CHANGES) {
        return refuse(
          `Denetim tarihi en fazla ${MAX_DATE_CHANGES} kez değiştirilebilir; bu plan için hak kalmadı.`
        )
      }
    }
    return undefined
  }

  return undefined
}
