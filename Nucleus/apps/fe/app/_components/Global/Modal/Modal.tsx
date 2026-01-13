import { cn } from '@/app/_utils'
import type { ModalProps, ModalSize } from './types'

function getSizeClasses(size: ModalSize): string {
  const map: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }
  return map[size]
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
  contentClassName,
}: ModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div
        className={cn('w-full rounded-3xl bg-white shadow-2xl', getSizeClasses(size), className)}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Modal dialog'}
      >
        <div className={cn('flex flex-col gap-4 p-6', contentClassName)}>
          {title ? (
            <header className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  onClick={onClose}
                  aria-label="Modali kapat"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              {description ? <p className="text-sm text-slate-600">{description}</p> : null}
            </header>
          ) : null}
          <div className="text-slate-700">{children}</div>
          {footer ? (
            <footer className="flex items-center justify-end gap-3 text-sm">{footer}</footer>
          ) : null}
        </div>
      </div>
    </div>
  )
}
