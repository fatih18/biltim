import type React from 'react'

export type CardVariant = 'elevated' | 'outline' | 'ghost'

export type CardProps = {
  variant?: CardVariant
  title?: string
  description?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}
