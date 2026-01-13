import type { ReactNode } from 'react'
import { cn } from '@/app/_utils'
import type { TableColumn, TableProps, TableRow } from './types'

function renderCell<TData extends Record<string, unknown>>(column: TableColumn<TData>, row: TData) {
  if (column.render) {
    return column.render(row)
  }
  if (column.accessor !== undefined) {
    const value =
      typeof column.accessor === 'string'
        ? row[column.accessor as keyof TData]
        : row[column.accessor]
    return value as ReactNode
  }
  return null
}

function buildRows<TData extends Record<string, unknown>>(
  data: TData[],
  makeRowKey: (row: TData, index: number) => string
): TableRow<TData>[] {
  return data.map((row, index) => ({
    key: makeRowKey(row, index),
    original: row,
  }))
}

export function Table<TData extends Record<string, unknown>>({
  columns,
  data,
  makeRowKey,
  caption,
  emptyState,
  className,
  headClassName,
  bodyClassName,
}: TableProps<TData>) {
  const rows = buildRows(data, makeRowKey)

  return (
    <div className={cn('overflow-hidden rounded-3xl border border-slate-200 bg-white', className)}>
      <table className="w-full table-fixed border-collapse">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className={cn('bg-slate-50', headClassName)}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500',
                  column.align === 'center' ? 'text-center' : '',
                  column.align === 'right' ? 'text-right' : '',
                  column.width
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn('divide-y divide-slate-100', bodyClassName)}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                {emptyState ?? 'Kayıt bulunamadı'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={`${row.key}-${column.id}`}
                    className={cn(
                      'px-4 py-3 text-sm text-slate-700',
                      column.align === 'center' ? 'text-center' : '',
                      column.align === 'right' ? 'text-right' : ''
                    )}
                  >
                    {(renderCell(column, row.original) as ReactNode) ?? null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
