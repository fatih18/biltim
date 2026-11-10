import { prepareNotice } from './prepare'
import { findNoticeCandidates, writeNotices } from './queries'
import {
  NOTICE_BATCH,
  NOTICE_KINDS,
  NOTICE_RETRY_MS,
  NOTICE_SPEC,
  NOTICE_WINDOW_HOURS,
  type NoticeDeps,
  type NoticeKind,
} from './types'

/**
 * What happened to one plan event:
 *  - `written`: the notifications were added;
 *  - `already`: every recipient had the notice already (another process was first);
 *  - `nobody`: nobody is left to tell (no active account on the team or among the field managers); nothing was written;
 *  - `gone`: the plan stopped existing between the candidate list and now.
 */
export type NoticeOutcome = 'written' | 'already' | 'nobody' | 'gone'

export const NOTICE_KIND_TR: Record<NoticeKind, string> = {
  created: 'plan bildirimi',
  completed: 'denetim sonucu bildirimi',
}

const restKey = (kind: NoticeKind, planId: string): string => `${kind}:${planId}`

export async function processNotice(
  kind: NoticeKind,
  planId: string,
  deps: Pick<NoticeDeps, 'sql' | 'transaction'>
): Promise<{ outcome: NoticeOutcome; added: number }> {
  const prepared = await prepareNotice(deps.sql, kind, planId)
  if (!prepared) return { outcome: 'gone', added: 0 }
  if (prepared.recipients.length === 0) return { outcome: 'nobody', added: 0 }

  const spec = NOTICE_SPEC[kind]
  const added = await writeNotices(deps.transaction, {
    recipients: prepared.recipients,
    title: prepared.title,
    body: prepared.body,
    type: spec.type,
    source: `${spec.sourcePrefix}${planId}`,
  })
  return { outcome: added > 0 ? 'written' : 'already', added }
}

export type NoticeReport = {
  /** Plans looked at in this pass (at most `NOTICE_BATCH`). */
  plans: number
  /** Notifications added. */
  added: number
  nobody: number
  failed: number
  /** Plans left alone because they were set aside a short while ago. */
  resting: number
}

const isResting = (resting: Map<string, number>, key: string, now: number): boolean => {
  const at = resting.get(key)
  return at !== undefined && now - at < NOTICE_RETRY_MS
}

/** Entries of plans the window has left are forgotten; their plans are no candidates anyway. */
function forgetOld(resting: Map<string, number>, now: number): void {
  const horizon = NOTICE_WINDOW_HOURS * 3_600_000
  for (const [key, at] of resting) if (now - at >= horizon) resting.delete(key)
}

type Pending = { kind: NoticeKind; id: string }

/** One from each kind in turn, so a mass planning cannot keep a finished audit's notice waiting. */
function interleave(lists: Pending[][]): Pending[] {
  const out: Pending[] = []
  const longest = Math.max(0, ...lists.map((list) => list.length))
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) {
      const item = list[i]
      if (item) out.push(item)
    }
  }
  return out
}

/**
 * One pass: the plans each notice is still owed for, at most `NOTICE_BATCH` in all. A plan that fails or has nobody to
 * tell is set aside for `NOTICE_RETRY_MS`, so it cannot use up the batch every minute. A failing plan costs one line for
 * the whole pass; the plans after it are still handled. A failing candidate query is not caught here: the worker logs it.
 */
export async function runNoticePass(deps: NoticeDeps): Promise<NoticeReport> {
  const report: NoticeReport = { plans: 0, added: 0, nobody: 0, failed: 0, resting: 0 }
  const at = deps.now()
  forgetOld(deps.resting, at)

  const lists: Pending[][] = []
  for (const kind of NOTICE_KINDS) {
    if (deps.stopped?.()) break
    // Plans resting take a slot in the list but not in the batch.
    const resting = [...deps.resting.keys()].filter((key) => key.startsWith(`${kind}:`) && isResting(deps.resting, key, at)).length
    const ids = await findNoticeCandidates(deps.sql, kind, NOTICE_BATCH + resting)
    const due = ids.filter((id) => !isResting(deps.resting, restKey(kind, id), at))
    report.resting += ids.length - due.length
    lists.push(due.map((id) => ({ kind, id })))
  }

  let firstError = ''
  let told = 0
  for (const { kind, id } of interleave(lists).slice(0, NOTICE_BATCH)) {
    if (deps.stopped?.()) break
    report.plans += 1
    const key = restKey(kind, id)
    try {
      const { outcome, added } = await processNotice(kind, id, deps)
      report.added += added
      if (added > 0) told += 1
      if (outcome === 'nobody') {
        report.nobody += 1
        if (!deps.resting.has(key)) {
          deps.log.info(`[bildirim] ${NOTICE_KIND_TR[kind]}: plan ${id} için bildirim yazılacak kimse yok (ekipte ya da lokasyonun saha sorumlularında etkin hesap yok); ${Math.round(NOTICE_RETRY_MS / 60_000)} dakikada bir yeniden bakılır`)
        }
      }
      if (outcome === 'nobody' || outcome === 'gone') deps.resting.set(key, at)
    } catch (error) {
      report.failed += 1
      deps.resting.set(key, at)
      firstError ||= error instanceof Error ? error.message : String(error)
    }
  }

  if (report.added > 0) deps.log.info(`[bildirim] ${told} plan için ${report.added} bildirim yazıldı`)
  if (report.failed > 0) {
    deps.log.error(`[bildirim] ${report.failed} plan için bildirim yazılamadı, ${Math.round(NOTICE_RETRY_MS / 60_000)} dakika sonra yeniden denenecek. İlk hata: ${firstError}`)
  }
  return report
}
