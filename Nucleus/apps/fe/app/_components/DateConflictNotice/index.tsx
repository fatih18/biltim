import React from 'react'

/**
 * The amber notice for same-day clashes (R28).
 *
 * It says who is already busy and where, then says plainly that this is a
 * warning and the plan can still be saved. Renders nothing when there is
 * nothing to warn about.
 */
export function DateConflictNotice({
  warnings,
  compact = false,
}: {
  warnings: readonly string[]
  /** For a narrow table cell: tighter padding. */
  compact?: boolean
}) {
  if (warnings.length === 0) return null

  return (
    <div
      role="status"
      className={[
        'space-y-1 rounded-md border border-amber-500/40 bg-amber-100 text-amber-900',
        'dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 sm:text-xs">Çakışma uyarısı</p>
      <ul className="list-disc space-y-0.5 pl-4">
        {warnings.map((warning) => (
          <li key={warning} className="text-[11px] text-amber-800 dark:text-amber-200 sm:text-xs">
            {warning}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-amber-700 dark:text-amber-300/80 sm:text-xs">
        Bu bir uyarıdır, kaydı engellemez; isterseniz yine de devam edebilirsiniz.
      </p>
    </div>
  )
}
