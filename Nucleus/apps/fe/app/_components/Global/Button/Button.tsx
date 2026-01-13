import { cn } from '@/app/_utils'
import type { ButtonProps, ButtonSize, ButtonVariant } from './types'

function getVariantClasses(variant: ButtonVariant): string {
  const map: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary:
      'bg-white text-blue-600 border border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50',
  }
  return map[variant]
}

function getSizeClasses(size: ButtonSize): string {
  const map: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  }
  return map[size]
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  onClick,
  children,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60',
        getVariantClasses(variant),
        getSizeClasses(size),
        className
      )}
    >
      {children}
    </button>
  )
}

export function ButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>
}
