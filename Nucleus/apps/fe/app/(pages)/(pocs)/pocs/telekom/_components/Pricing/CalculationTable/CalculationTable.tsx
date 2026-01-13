import { Card, Table } from '@/app/_components/Global'
import type { CalculationTableProps } from './types'

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  })
  return formatter.format(value)
}

function formatPeriodLabel(year?: number, month?: number): string {
  if (!year || !month) return '-' // geçersizse boş göster
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    month: 'short',
    year: 'numeric',
  })
  const date = new Date(Date.UTC(year, month - 1, 1))
  return formatter.format(date)
}

export function CalculationTable({ store }: CalculationTableProps) {
  const columns = [
    {
      id: 'label',
      header: 'Kalem',
      render: (row: (typeof store.pricing.rows)[number]) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{row.label}</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">{row.category}</span>
        </div>
      ),
      width: '30%',
    },
    {
      id: 'total',
      header: 'Tutar',
      align: 'right' as const,
      render: (row: (typeof store.pricing.rows)[number]) => (
        <span className="font-semibold text-slate-900">{formatCurrency(row.total ?? 0)}</span>
      ),
    },
    {
      id: 'percentage',
      header: '%',
      align: 'right' as const,
      render: (row: (typeof store.pricing.rows)[number]) => {
        if (row.percentage === null || row.percentage === undefined) {
          return <span className="text-slate-400">-</span>
        }
        return <span>{`${row.percentage.toFixed(2)}%`}</span>
      },
    },
    {
      id: 'periods',
      header: 'Dönem',
      render: (row: (typeof store.pricing.rows)[number]) => {
        if (!row.periods || row.periods.length === 0) {
          return <span className="text-slate-400">-</span>
        }

        const parts: string[] = []

        for (const period of row.periods) {
          const year = period.month?.year
          const month = period.month?.month
          const amount = period.amount ?? 0

          if (!year || !month) continue

          parts.push(`${formatPeriodLabel(year, month)} • ${formatCurrency(amount)}`)
        }

        if (parts.length === 0) return <span className="text-slate-400">-</span>

        return (
          <ul className="flex flex-wrap gap-2 text-xs text-slate-500">
            {parts.map((part) => (
              <li key={part} className="rounded-full bg-slate-100 px-2 py-1">
                {part}
              </li>
            ))}
          </ul>
        )
      },
    },
  ]

  return (
    <Card title="Hesaplama Tablosu" description="Satır bazında gelir ve gider detayları.">
      <Table
        columns={columns}
        data={store.pricing.rows}
        makeRowKey={(row) => row.id}
        caption="Hesaplama tablosu"
        className="border-none"
      />
    </Card>
  )
}
