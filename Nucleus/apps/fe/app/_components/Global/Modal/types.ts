import type { ReactNode } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
}
