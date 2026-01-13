import { cn } from '@/app/_utils'
import type { BadgeProps, BadgeVariant } from './types'

function getVariantClasses(variant: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return map[variant]
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        getVariantClasses(variant),
        className
      )}
    >
      {children}
    </span>
  )
}
