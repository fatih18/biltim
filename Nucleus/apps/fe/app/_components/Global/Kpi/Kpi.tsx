import { cn } from '@/app/_utils'
import type { KpiProps } from './types'

function getTrendClasses(trend: KpiProps['trend']): string {
  const map: Record<NonNullable<KpiProps['trend']>, string> = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    steady: 'text-slate-500',
  }
  if (trend === undefined) {
    return 'text-slate-500'
  }
  return map[trend]
}

export function Kpi({
  title,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  actions,
  className,
}: KpiProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              {icon}
            </div>
          ) : null}
          <div className="flex flex-col">
            <span className="text-sm font-medium uppercase tracking-wider text-slate-500">
              {title}
            </span>
            <span className="text-3xl font-semibold text-slate-900">{value}</span>
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <footer className="flex items-baseline gap-2 text-sm">
        {subValue ? <span className="text-slate-500">{subValue}</span> : null}
        {trendLabel ? (
          <span className={cn('font-semibold', getTrendClasses(trend))}>{trendLabel}</span>
        ) : null}
      </footer>
    </article>
  )
}
