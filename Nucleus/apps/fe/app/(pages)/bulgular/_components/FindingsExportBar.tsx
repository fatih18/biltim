import { FileSpreadsheet, Loader2 } from "lucide-react";
import { EXPORT_SCOPES, type ExportScope } from "../_utils/exportScope";

/**
 * The Excel download of the Bulgular page (R48): the choice of what to
 * download (Açık ve devam eden / Kapalı / Tümü, starting on the first), the button, and one
 * sentence saying what the file will hold. The list's other filters narrow the
 * file too; the ones that are set are named under the sentence so the file is
 * never a surprise.
 *
 * It is the page header's right-hand block: left-aligned on a phone, right-
 * aligned from `md`. A radio group, so the choice is one tab stop with arrow
 * keys and a screen reader hears its name.
 */
export function FindingsExportBar(props: {
  scope: ExportScope;
  onScopeChange: (scope: ExportScope) => void;
  /** "12 açık ve devam eden bulgu indirilecek.": what will be downloaded. */
  summary: string;
  /** Set when the choice leaves nothing to download; shown instead of the summary and the button stays off. */
  problem: string | null;
  filterNotes: string[];
  downloading: boolean;
  onDownload: () => void;
}) {
  const { scope, onScopeChange, summary, problem, filterNotes, downloading, onDownload } = props;
  return (
    <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
      <fieldset className="min-w-0">
        <legend className="mb-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">İndirilecek bulgular</legend>
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950/60">
          {EXPORT_SCOPES.map((item) => (
            <label key={item.value} className="cursor-pointer">
              <input
                type="radio"
                name="findings-export-scope"
                value={item.value}
                checked={scope === item.value}
                onChange={() => onScopeChange(item.value)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-8 min-w-16 items-center justify-center rounded px-3 py-1 text-center text-xs font-medium text-slate-700 hover:bg-slate-100 peer-checked:bg-emerald-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:peer-checked:bg-emerald-700 dark:peer-checked:text-white dark:peer-focus-visible:ring-sky-400">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={onDownload}
        disabled={downloading || problem !== null}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-600/60 bg-emerald-100 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-950/30 dark:text-emerald-200 hover:dark:bg-emerald-950/60"
      >
        {downloading ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
        {downloading ? "Hazırlanıyor..." : "Bulgu Raporu (Excel)"}
      </button>

      {problem ? (
        <p role="status" className="max-w-sm text-xs text-amber-800 md:text-right dark:text-amber-200">
          {problem}
        </p>
      ) : (
        <p role="status" className="max-w-sm text-xs text-slate-700 md:text-right dark:text-slate-300">
          {summary}
        </p>
      )}
      {filterNotes.length > 0 && (
        <p className="max-w-sm text-[11px] text-slate-500 md:text-right dark:text-slate-400">
          Listedeki filtreler de uygulanır: {filterNotes.join(" · ")}
        </p>
      )}
    </div>
  );
}
