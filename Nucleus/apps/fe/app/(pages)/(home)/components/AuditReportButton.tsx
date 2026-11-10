import { FileSpreadsheet, Loader2 } from 'lucide-react'

/** "Raporu İndir" on a completed audit's row: the field manager's way to the audit's report. */
export function AuditReportButton(props: { busy: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      disabled={props.busy}
      title="Tamamlanan denetimin raporunu (soru formu ve bulgular) Excel olarak indir"
      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-emerald-700/50 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
    >
      {props.busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet size={12} aria-hidden="true" />}
      {props.busy ? 'Hazırlanıyor…' : 'Raporu İndir'}
    </button>
  )
}
