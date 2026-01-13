import type { MouseEvent, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
  className?: string
}
