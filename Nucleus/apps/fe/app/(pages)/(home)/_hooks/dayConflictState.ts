/*
 * What the same-day clash check (R28) says about the day a plan is being given,
 * decided from plain values so the hook is only wiring and the rules can be
 * tested without a DOM:
 *
 *  - one read answers one question: plan, day and attempt make its key;
 *  - an answer that arrives after the choice moved on is dropped;
 *  - nothing to check is `idle`, a read on its way is `loading`;
 *  - a failed read is `failed`, never an empty list: it must not look like
 *    "nothing clashes".
 */

/** `idle`: nothing to check yet. `loading`: the day is being read. */
export type DayConflictStatus = 'idle' | 'loading' | 'ready' | 'failed'

/** What one read came back with; a failed read carries no warnings and is not an empty list. */
export type DayConflictOutcome = { failed: false; warnings: string[] } | { failed: true }

/** The outcome of the read that was asked under `key`. */
export type DayConflictAnswer = { key: string; failed: boolean; warnings: string[] }

/** The same plan, day and attempt are the same question; a retry is a new attempt and so a new key. */
export function conflictKey(planId: string, day: string, attempt: number): string {
  return `${planId}|${day}|${attempt}`
}

/** There is something to check once there is a way to read it and a chosen day. */
export function isChecking(hasLoader: boolean, day: string): boolean {
  return hasLoader && day !== ''
}

/**
 * The answer to keep for a read that has just come back, or `null` when it is
 * late: a newer request was started, or the screen left, since this one began.
 * `latest` is the number of the newest request; `request` is this read's own.
 */
export function takeAnswer(input: {
  latest: number
  request: number
  key: string
  outcome: DayConflictOutcome
}): DayConflictAnswer | null {
  if (input.latest !== input.request) return null
  return input.outcome.failed
    ? { key: input.key, failed: true, warnings: [] }
    : { key: input.key, failed: false, warnings: input.outcome.warnings }
}

/** What to show for the question `key`, given the last answer that was kept. */
export function conflictView(input: {
  active: boolean
  key: string
  answer: DayConflictAnswer | null
}): { status: DayConflictStatus; warnings: string[] } {
  if (!input.active) return { status: 'idle', warnings: [] }
  // An answer to an earlier question (another day, another attempt) is not this one's.
  if (input.answer?.key !== input.key) return { status: 'loading', warnings: [] }
  return { status: input.answer.failed ? 'failed' : 'ready', warnings: input.answer.warnings }
}
