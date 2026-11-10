import { formatRejectedAt } from '@/app/_utils/planReview'

/**
 * The reason Merkez Ekip gave, kept on the correction screen: the team that
 * corrects the audit should not have to remember it from the home list (R30).
 */
export function RejectedAuditNotice(props: {
  reason: string | null | undefined
  rejectedAt: string | null | undefined
}) {
  const text = (props.reason ?? '').trim()
  const when = formatRejectedAt(props.rejectedAt)
  return (
    <section
      aria-label="Düzeltme sebebi"
      className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <h2 className="font-semibold">Merkez Ekip&apos;in düzeltme sebebi</h2>
      <p className="mt-1 whitespace-pre-line break-words">
        {text || 'Sebep okunamadı. Ayrıntı için Merkez Ekip ile görüşün.'}
      </p>
      {when ? <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{when}</p> : null}
    </section>
  )
}
