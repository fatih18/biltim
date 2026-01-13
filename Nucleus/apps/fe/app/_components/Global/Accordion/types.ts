import type { ReactNode } from 'react'

export type AccordionItem = {
  id: string
  title: ReactNode
  description?: ReactNode
  content: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export type AccordionProps = {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpenIds?: string[]
  onChange?: (openIds: string[]) => void
  className?: string
  itemClassName?: string
  headerClassName?: string
  contentClassName?: string
  chevronClassName?: string
}
