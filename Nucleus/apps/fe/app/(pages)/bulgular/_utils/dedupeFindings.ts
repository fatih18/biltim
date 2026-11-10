import { foldTr } from "@/app/_utils/textSearch";
import { auditNameOfTitle } from "@/app/_utils/singleFindingTitle";

/** Only the finding fields the register reads to tell twins apart. */
export type DedupableFinding = {
  question_id?: string | null;
  description?: string | null;
  location_name?: string | null;
  status?: string | null;
  form_title?: string | null;
};

/** The question a finding is about: its column, else the line older findings wrote in the description. */
export function questionIdOfFinding(f: DedupableFinding): string {
  const fromField = (f.question_id ?? "").toString().trim();
  if (fromField) return fromField;
  const desc = f.description ?? "";
  return desc.match(/Soru ID:\s*(\S+)/)?.[1] ?? desc.match(/Bağlı Soru:\s*(\S+)/)?.[1] ?? "";
}

/*
 * The key findings share when the register shows them as ONE row; "" when a
 * finding stands alone. Display only: no record is merged or removed, the
 * extra ones are counted on the row ("+N tekrar").
 *
 * Not closed (open or "Devam ediyor"): the same question at the same location
 * is one open defect, whatever audit it came from. The audit screen counts it
 * that way too, and once one of them closes the others come back as rows.
 *
 * Closed: only twins of the SAME audit, found by the audit's name — a single
 * finding raised inside an audit carries that name too (R74). Closed findings
 * of different audits are history and stay apart.
 */
export function dedupeKey(f: DedupableFinding): string {
  const qid = questionIdOfFinding(f);
  if (!qid) return "";
  const place = foldTr(f.location_name);
  if (f.status !== "closed") return `${qid}__${place}`;
  const audit = auditNameOfTitle(f.form_title);
  return audit ? `${qid}__${place}__closed__${foldTr(audit)}` : "";
}
