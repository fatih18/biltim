'use client'

import { Card, Kpi, Table, Tabs } from '@/app/_components/Global'
import type { TableColumn } from '@/app/_components/Global/Table/types'
import type { CashFlowProjectionProps } from './types'

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  })
  return formatter.format(value)
}

function formatMonth(year: number, month: number): string {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    month: 'short',
    year: '2-digit',
  })
  return formatter.format(new Date(Date.UTC(year, month - 1, 1))).replace(' ', '\u00A0')
}

const periodLabels: Record<'monthly' | 'quarterly' | 'yearly', string> = {
  monthly: 'Aylık',
  quarterly: 'Çeyreklik',
  yearly: 'Yıllık',
}

export function CashFlowProjection({ store }: CashFlowProjectionProps) {
  const tabs = store.cashFlow.views.map((view) => ({
    id: view.period,
    label: periodLabels[view.period],
  }))

  return (
    <Card
      title="Nakit Akış Projeksiyonu"
      description="Dönemlere göre gelir, gider ve net akış görüntüleyin."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Kpi
          title="Toplam Net"
          value={formatCurrency(store.cashFlow.summary.totalNet)}
          subValue={`İskontolu: ${formatCurrency(store.cashFlow.summary.discountedNetPresentValue)}`}
          trend={store.cashFlow.summary.totalNet >= 0 ? 'up' : 'down'}
          trendLabel={store.cashFlow.summary.totalNet >= 0 ? 'Pozitif Akış' : 'Negatif Akış'}
        />
        <Kpi
          title="Toplam Gelir"
          value={formatCurrency(store.cashFlow.summary.totalInflows)}
          subValue={`Gider: ${formatCurrency(store.cashFlow.summary.totalOutflows)}`}
          trend="steady"
          trendLabel="Brüt hareket"
        />
        <Kpi
          title="Tepe Açığı"
          value={formatCurrency(store.cashFlow.summary.peakDeficit)}
          subValue="En yüksek finansman ihtiyacı"
          trend="down"
          trendLabel="Risk göstergesi"
        />
        <Kpi
          title="Geri Ödeme"
          value={
            store.cashFlow.summary.paybackMonth
              ? formatMonth(
                  store.cashFlow.summary.paybackMonth.year,
                  store.cashFlow.summary.paybackMonth.month
                )
              : 'Hesaplanamadı'
          }
          subValue="Kümülatif nakdin sıfırladığı ay"
          trend="steady"
          trendLabel="Payback"
        />
      </div>

      <Tabs
        tabs={tabs}
        defaultActiveId={store.ui.selectedPeriod}
        onChange={(tabId) => {
          store.setSelectedPeriod(tabId as typeof store.ui.selectedPeriod)
        }}
        renderContent={(activeTab) => {
          const view =
            store.cashFlow.views.find((item) => item.period === activeTab.id) ??
            store.cashFlow.views[0]
          if (!view) {
            return (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                Nakit akışı verisi bulunamadı.
              </div>
            )
          }
          type ProjectRow = (typeof view.table.projects)[number]
          const monthColumns: TableColumn<ProjectRow>[] = []
          for (let index = 0; index < view.months.length; index += 1) {
            const month = view.months[index]
            if (!month) {
              continue
            }
            monthColumns.push({
              id: `month-${month.year}-${month.month}`,
              header: formatMonth(month.year, month.month),
              align: 'right',
              render: (row: ProjectRow) => {
                const inflow = row.inflows[index] ?? 0
                const outflow = row.outflows[index] ?? 0
                const net = row.net[index] ?? 0
                return (
                  <div className="flex flex-col items-end text-xs text-slate-600">
                    <span className="text-slate-900">{formatCurrency(net)}</span>
                    <span>{`G: ${formatCurrency(inflow)}`}</span>
                    <span>{`Ç: ${formatCurrency(outflow)}`}</span>
                  </div>
                )
              },
              width: '12%',
            })
          }
          const columns: TableColumn<ProjectRow>[] = [
            {
              id: 'project',
              header: 'Kalem',
              render: (row: ProjectRow) => (
                <span className="font-medium text-slate-800">{row.projectName}</span>
              ),
              width: '18%',
            },
            ...monthColumns,
            {
              id: 'total',
              header: 'Toplam Net',
              align: 'right' as const,
              render: (row: ProjectRow) => {
                let total = 0
                for (const value of row.net) {
                  total += value ?? 0
                }
                return <span className="font-semibold text-slate-900">{formatCurrency(total)}</span>
              },
              width: '14%',
            },
          ]

          const monthlySummary = view.table.monthlyNet.map((value, index) => {
            const month = view.months[index]
            if (!month) {
              return null
            }
            return (
              <li
                key={`summary-${month.year}-${month.month}`}
                className="flex flex-col rounded-2xl bg-slate-100 px-4 py-3"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {formatMonth(month.year, month.month)}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(value)}
                </span>
              </li>
            )
          })

          return (
            <div className="flex flex-col gap-4">
              <Table
                columns={columns}
                data={view.table.projects}
                makeRowKey={(row, index) => `${row.projectId}-${index}`}
                emptyState="Projeksiyon bulunamadı"
              />
              <div className="flex flex-col gap-2">
                <ul className="flex flex-wrap gap-3">{monthlySummary}</ul>
              </div>
            </div>
          )
        }}
      />
    </Card>
  )
}
