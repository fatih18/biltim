import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export type BadgeProps = {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}
