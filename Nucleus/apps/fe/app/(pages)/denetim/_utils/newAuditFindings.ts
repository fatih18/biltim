/*
 * What the new-audit save does with the results of its finding writes, and how
 * it reads the audit row's answer.
 *
 * The correction path counts what did not save and holds the plan's resend
 * (resendPlan.ts → correctionVerdict). The new-audit path awaited its finding
 * writes and threw the results away: a finding that did not save (a 5xx, a
 * refusal) left the audit on the server without it, and the plan was stamped as
 * sent all the same, with "Denetim başarıyla kaydedildi." and a redirect home.
 * Now a finding that did not save holds the stamp, the page stays, and the
 * message names the questions and the way on, like the held stamp itself.
 */
import type { Question, Step } from "../constants";
import { photoGapLabel } from "./photoRequired";
import type { FindingWrite, SavedGap } from "./resendPlan";
import { STAMP_RETRY_LABEL } from "./planStampOutcome";

/** A row an add call answers with, as far as the page reads it. */
export type CreatedRow = { id?: string | number | null };

/** What an add call answers with: the row itself, a `data` wrapper around it, or a `data` list of rows. */
export type CreatedResponse = {
  id?: string | number | null;
  data?: CreatedRow | CreatedRow[] | null;
} | null | undefined;

/** The id of the row an add call created (`data.id`, then `id`, then the first of a `data` list); null when the answer names none. */
export function createdIdOf(response: CreatedResponse): string | null {
  const wrapped = response?.data;
  const listed = Array.isArray(wrapped) ? wrapped[0]?.id : undefined;
  const single = Array.isArray(wrapped) ? undefined : wrapped?.id;
  const id = single ?? response?.id ?? listed ?? null;
  return id === null ? null : String(id);
}

/** The finding write of each answer, in order: the question ids whose finding did not save. */
export function unsavedFindingQuestionIds(
  findings: readonly { questionId: string }[],
  writes: readonly FindingWrite[],
): string[] {
  const ids: string[] = [];
  findings.forEach((answer, index) => {
    const write = writes[index];
    if (write && !write.saved && !ids.includes(answer.questionId)) ids.push(answer.questionId);
  });
  return ids;
}

/**
 * The message that holds the plan's stamp when a finding did not save: what is
 * wrong (which questions), what it means (the audit and its answers are saved,
 * the plan was not sent so that it does not go to approval incomplete) and what
 * to do (add the findings with "Tekil Bulgu +", then send again). Null when
 * every finding saved.
 */
export function unsavedFindingsGap(input: {
  findings: readonly { questionId: string }[];
  writes: readonly FindingWrite[];
  questions: readonly Question[];
  steps: readonly Step[];
}): SavedGap | null {
  const ids = unsavedFindingQuestionIds(input.findings, input.writes);
  if (ids.length === 0) return null;
  const labels = ids.map((id) => {
    const question = input.questions.find((q) => q.id === id);
    return question ? photoGapLabel(question, input.steps) : id;
  });
  const what = ids.length === 1 ? "1 bulgu kaydedilemedi" : `${ids.length} bulgu kaydedilemedi`;
  return {
    kind: "incomplete",
    text: `Denetim ve yanıtlar kaydedildi ancak ${what}: ${labels.join("; ")}. Plan eksik bulguyla onaya gitmesin diye gönderilmedi ve açık kaldı. Bu bulguları "Tekil Bulgu +" düğmesiyle (ilgili soruyu bağlı soru olarak seçip fotoğraflarıyla) ekleyin, sonra "${STAMP_RETRY_LABEL}" düğmesine basın. Denetim zaten kayıtlı olduğu için bu planı yeniden doldurmayın.`,
  };
}
