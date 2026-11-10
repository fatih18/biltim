import { Loader2, Trash2 } from 'lucide-react'

/** The "Sil" of one finding row: red, outlined, readable in both themes, a touch-sized target on a phone. */
export function FindingDeleteButton(props: {
  label: string
  busy: boolean
  disabled: boolean
  onDelete: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onDelete}
      disabled={props.disabled}
      aria-label={`${props.label} sil`}
      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-rose-400/70 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/50 dark:bg-slate-950/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
    >
      {props.busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Trash2 size={12} aria-hidden="true" />}
      {props.busy ? 'Siliniyor…' : 'Sil'}
    </button>
  )
}
