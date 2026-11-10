/*
 * R72: the plan that did not go stays "held" across a reload.
 *
 * When the plan stamp of a sent audit is refused or does not get an answer, the
 * audit is on the server and its plan is not sent; the page holds the form and
 * offers "Yeniden gönder" for THAT audit (planStampOutcome.ts). The hold lived
 * in the page's memory only: leaving the screen, a reload or a closed tab
 * dropped it, the plan came back as an open "planned" plan with a restored
 * draft, and the auditor, with nothing on screen saying an audit was already
 * filed, filled it in again and filed a second audit.
 *
 * Here the hold is written to the offline database the page already keeps
 * (its key-value table), one record per plan, and read again when that plan is
 * opened. It is forgotten once the stamp went through. Every call swallows the
 * store's errors: a store that cannot be written must never turn a saved audit
 * into a failed one, it only loses the reminder.
 */
import type { SavedGap, SavedGapKind } from "./resendPlan";

/** What is remembered per plan: the audit already on the server and the message that stays on the page. */
export type HeldSend = { planId: string; auditId: string; kind: SavedGapKind; text: string };

/** A stored value as read back: anything may be missing or wrong, so every field is checked. */
export type StoredHeldSend = Partial<Record<keyof HeldSend, string>>;

/** The key-value table the record lives in; injected so the logic is testable without a browser. */
export type HeldSendStore = {
  read: (key: string) => Promise<StoredHeldSend | null>;
  write: (key: string, value: HeldSend) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

/** One record per plan, in a namespace of its own beside the other snapshots. */
export function heldSendKey(planId: string): string {
  return `held-send:${planId}`;
}

/** The record for this plan when the stored value is whole; null for anything else (never a guess). */
export function validHeldSend(stored: StoredHeldSend | null, planId: string): HeldSend | null {
  if (!stored || stored.planId !== planId) return null;
  const { auditId, text, kind } = stored;
  if (typeof auditId !== "string" || auditId.trim() === "") return null;
  if (typeof text !== "string" || text.trim() === "") return null;
  return { planId, auditId, kind: kind === "incomplete" ? "incomplete" : "unsent", text };
}

/** The message the page shows for a remembered hold. */
export function heldGapOf(held: HeldSend): SavedGap {
  return { kind: held.kind, text: held.text };
}

/** Remembers the hold; a store failure is logged and ignored. */
export async function rememberHeldSend(store: HeldSendStore, held: HeldSend): Promise<void> {
  try {
    await store.write(heldSendKey(held.planId), held);
  } catch (err) {
    console.warn("held send not remembered", err);
  }
}

/** The hold remembered for this plan, or null (none, unreadable or malformed). */
export async function recallHeldSend(store: HeldSendStore, planId: string): Promise<HeldSend | null> {
  try {
    return validHeldSend(await store.read(heldSendKey(planId)), planId);
  } catch {
    return null;
  }
}

/** Forgets the hold once the stamp went through. */
export async function forgetHeldSend(store: HeldSendStore, planId: string): Promise<void> {
  try {
    await store.remove(heldSendKey(planId));
  } catch (err) {
    console.warn("held send not forgotten", err);
  }
}
