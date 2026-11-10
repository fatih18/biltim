/*
 * The attendance box of the audit form.
 *
 * Notlar 07.10 (Kurallar): the auditor ticks whether the location's field
 * manager took part; not ticked, the audit scores 0.
 * Notlar 22.10 (satır 39), after the customer tried it: the box reads "Bölge
 * sorumlusu veya görevlendirdiği kişi denetime katıldı", and while it is NOT
 * ticked the questions are passive and Kaydet finishes the audit as it stands.
 *
 * Every decision that follows from the box lives here, so the page only wires
 * them in and the online save, the offline queue and Merkez Ekip's correction
 * cannot disagree:
 *
 *   - is the form passive            -> isAuditPassive
 *   - must the questions be answered -> areAnswersRequired
 *   - what the plan is stamped with  -> attendanceToRecord
 *   - which answers are stored       -> answersToStore
 *
 * A location with no field manager has nobody whose absence could zero the
 * audit: nothing is passive there and the plan records no attendance (null).
 */

/** What the form knows about attendance. */
export type AttendanceState = {
  /** The location has a field manager defined; without one the rule does not apply. */
  locationHasFieldManager: boolean;
  /** The tick. `undefined` is a box nobody has touched yet, which is not a tick. */
  fieldManagerAttended: boolean | null | undefined;
};

/** The questions are switched off: the rule applies and nobody ticked the box. */
export function isAuditPassive(state: AttendanceState): boolean {
  return state.locationHasFieldManager && state.fieldManagerAttended !== true;
}

/** Whether Kaydet may insist on an answer (and its details) for every question. */
export function areAnswersRequired(state: AttendanceState): boolean {
  return !isAuditPassive(state);
}

/**
 * What the score rule is told: false makes scoreAudit return 0. Where the
 * rule does not apply the audit counts as attended.
 */
export function attendanceForScoring(state: AttendanceState): boolean {
  return !isAuditPassive(state);
}

/**
 * What the plan is stamped with: the tick as a plain true/false, or null (no
 * record) where the location has no field manager and the rule does not apply.
 */
export function attendanceToRecord(state: AttendanceState): boolean | null {
  return state.locationHasFieldManager ? state.fieldManagerAttended === true : null;
}

/**
 * The answers an audit is scored from and stored with. A passive audit has
 * none: whatever was typed before the box was unticked stays in the form's own
 * state (ticking the box again brings it back) but is neither scored, queued,
 * sent nor turned into findings.
 */
export function answersToStore<A>(
  state: AttendanceState,
  answers: Readonly<Record<string, A>>,
): Readonly<Record<string, A>> {
  return isAuditPassive(state) ? {} : answers;
}
