import type { ReactNode } from 'react'

export type TableColumn<TData extends Record<string, unknown>> = {
  id: string
  header: ReactNode
  accessor?: keyof TData | string
  render?: (row: TData) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

export type TableProps<TData extends Record<string, unknown>> = {
  columns: TableColumn<TData>[]
  data: TData[]
  makeRowKey: (row: TData, index: number) => string
  caption?: string
  emptyState?: ReactNode
  className?: string
  headClassName?: string
  bodyClassName?: string
}

export type TableRow<TData extends Record<string, unknown>> = {
  key: string
  original: TData
}
