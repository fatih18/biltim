import { Skeleton } from "@/app/_components/Global/Skeleton";

/*
 * The plan list while it loads (rule 4.8.3: a skeleton mirrors the loaded
 * layout and follows its breakpoints). A plan is a card of two columns below
 * `sm`, three from `sm`, and one row of twelve columns from `md`; the cells
 * below take the same spans as HomeAuditListPanel's rows, so nothing jumps
 * when the answer arrives. The column names (`md:hidden`) are the card's own
 * labels, the table header above carries them from `md`.
 */

const CELLS: readonly { key: string; label: string; value: string }[] = [
  { key: "date", label: "w-10", value: "w-20" },
  { key: "period", label: "w-12", value: "w-14" },
  { key: "location", label: "w-14", value: "w-24" },
  { key: "people", label: "w-20", value: "w-28" },
  { key: "team", label: "w-16", value: "w-24" },
  { key: "status", label: "w-12", value: "w-16 md:mx-auto" },
];

function PlanSkeletonRow() {
  return (
    <div className="grid grid-cols-2 items-start gap-x-3 gap-y-2 border-t border-slate-300 px-3 py-2 sm:grid-cols-3 md:grid-cols-12 md:gap-2 dark:border-slate-800/80">
      {CELLS.map((cell) => (
        <div key={cell.key} className="col-span-1 md:col-span-2">
          <Skeleton shape="text" className={`mb-1.5 h-2.5 md:hidden ${cell.label}`} />
          <Skeleton shape="text" className={`h-4 ${cell.value}`} />
          {cell.key === "status" && <Skeleton className="mt-1.5 h-6 w-20 md:mx-auto" />}
        </div>
      ))}
    </div>
  );
}

export function PlanListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, index) => (
        <PlanSkeletonRow key={`plan-skeleton-${index}`} />
      ))}
    </div>
  );
}
