'use client'

import { Badge, Card, Table } from '@/app/_components/Global'
import type { TableColumn } from '@/app/_components/Global/Table/types'
import type { CustomerInsightsProps } from './types'

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  })
  return formatter.format(value)
}

export function CustomerInsights({ store }: CustomerInsightsProps) {
  const snapshots = store.history.snapshots
  let approvedTotalMargin = 0
  let approvedCount = 0
  for (const snapshot of snapshots) {
    if (snapshot.status === 'approved') {
      approvedTotalMargin += snapshot.ebitMargin
      approvedCount += 1
    }
  }
  const recommendedMargin =
    approvedCount > 0 ? approvedTotalMargin / approvedCount : store.pricing.summary.ebitMargin
  const lastSnapshot = snapshots.length > 0 ? snapshots[0] : null

  const columns: TableColumn<(typeof snapshots)[number]>[] = [
    {
      id: 'name',
      header: 'Kayıt',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.snapshotName}</span>
          <span className="text-xs text-slate-500">
            {new Date(row.savedAt).toLocaleString('tr-TR')}
          </span>
        </div>
      ),
    },
    {
      id: 'margin',
      header: 'EBIT %',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-slate-800">{formatPercentage(row.ebitMargin)}</span>
      ),
    },
    {
      id: 'npv',
      header: 'NPV %',
      align: 'right',
      render: (row) => <span className="text-slate-700">{formatPercentage(row.npvMargin)}</span>,
    },
    {
      id: 'status',
      header: 'Durum',
      render: (row) => {
        const variant =
          row.status === 'approved' ? 'success' : row.status === 'cancelled' ? 'danger' : 'neutral'
        return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
      },
    },
  ]

  return (
    <Card
      title="Müşteri İçgörüleri"
      description="Geçmiş müşteri performansını ve önerilen marjı inceleyin."
    >
      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col rounded-2xl bg-slate-100 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Önerilen Kar Marjı
            </span>
            <span className="text-2xl font-semibold text-slate-900">
              {formatPercentage(recommendedMargin)}
            </span>
            <span className="text-xs text-slate-500">Onaylı kayıt ortalaması</span>
          </div>
          <div className="flex flex-col rounded-2xl bg-slate-100 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Güncel Satış Fiyatı
            </span>
            <span className="text-2xl font-semibold text-slate-900">
              {formatCurrency(store.pricing.summary.salePrice)}
            </span>
            <span className="text-xs text-slate-500">Mevcut hesaplama</span>
          </div>
          <div className="flex flex-col rounded-2xl bg-slate-100 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Son Kayıt Durumu
            </span>
            <span className="text-2xl font-semibold text-slate-900">
              {lastSnapshot ? lastSnapshot.status.toUpperCase() : 'Yok'}
            </span>
            <span className="text-xs text-slate-500">
              {lastSnapshot
                ? new Date(lastSnapshot.savedAt).toLocaleString('tr-TR')
                : 'Henüz kayıt yapılmadı'}
            </span>
          </div>
        </section>

        <Table
          columns={columns}
          data={snapshots.slice(0, 6)}
          makeRowKey={(row) => row.snapshotId}
          caption="Son müşteri içgörü kayıtları"
          emptyState="Müşteri içgörü kaydı bulunamadı"
        />
      </div>
    </Card>
  )
}
