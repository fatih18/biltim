import { formatRejectedAt } from "@/app/_utils/planReview";

/**
 * Why Merkez Ekip returned the audit, on the row of the plan that waits for its
 * correction (R30). Shown only while the plan is rejected: the columns stay in
 * the table until the plan is approved, but they are history by then.
 */
export function RejectedPlanNote(props: {
  reason: string | null | undefined;
  rejectedAt: string | null | undefined;
}) {
  const text = (props.reason ?? "").trim();
  const when = formatRejectedAt(props.rejectedAt);
  return (
    <div className="w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-left text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="font-semibold">Merkez Ekip düzeltme istedi</p>
      <p className="mt-0.5 whitespace-pre-line break-words">
        {text || "Sebep okunamadı. Ayrıntı için Merkez Ekip ile görüşün."}
      </p>
      {when ? <p className="mt-1 text-amber-700 dark:text-amber-300">{when}</p> : null}
    </div>
  );
}
