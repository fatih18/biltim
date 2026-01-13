import { cn } from '@/app/_utils'
import type { CardProps, CardVariant } from './types'

function getVariantClasses(variant: CardVariant): string {
  const map: Record<CardVariant, string> = {
    elevated: 'bg-white shadow-lg border border-slate-100',
    outline: 'bg-white border border-slate-200',
    ghost: 'bg-transparent border border-transparent',
  }
  return map[variant]
}

export function Card({
  variant = 'elevated',
  title,
  description,
  children,
  actions,
  className,
  headerClassName,
  contentClassName,
}: CardProps) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-3xl p-6 transition-shadow',
        getVariantClasses(variant),
        className
      )}
    >
      {title ? (
        <header className={cn('mb-4 flex flex-col gap-2', headerClassName)}>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </header>
      ) : null}
      <div className={cn('flex-1', contentClassName)}>{children}</div>
      {actions ? <footer className="mt-6 flex items-center gap-3">{actions}</footer> : null}
    </section>
  )
}
