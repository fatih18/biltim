'use client'

import { Badge, Button, Card, Table } from '@/app/_components/Global'
import type { TableColumn } from '@/app/_components/Global/Table/types'
import type { ReportingPanelProps } from './types'

function formatTimestamp(value: string | null): string {
  if (value === null) {
    return 'Hiç oluşturulmadı'
  }
  return new Date(value).toLocaleString('tr-TR')
}

export function ReportingPanel({ store }: ReportingPanelProps) {
  const summaries = store.reports.availableSummaries
  const lastRequest = store.reports.lastRequest
  const columns: TableColumn<(typeof summaries)[number]>[] = [
    {
      id: 'title',
      header: 'Rapor',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.title}</span>
          <span className="text-xs text-slate-500">{row.description}</span>
        </div>
      ),
    },
    {
      id: 'generated',
      header: 'Son Oluşturma',
      align: 'right',
      render: (row) => (
        <span className="text-sm text-slate-700">{formatTimestamp(row.lastGeneratedAt)}</span>
      ),
    },
    {
      id: 'formats',
      header: 'Formatlar',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.downloadAvailableFormats.map((format) => (
            <Badge key={`${row.reportId}-${format}`} variant="neutral">
              {format.toUpperCase()}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'İşlemler',
      align: 'right',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (!lastRequest) {
                return
              }
              store.requestReport({ ...lastRequest, kind: row.kind })
            }}
            size="sm"
            disabled={!lastRequest}
          >
            Oluştur
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card title="Raporlama" description="Hazır raporları oluşturun ve indirin.">
      <Table
        columns={columns}
        data={summaries}
        makeRowKey={(row) => row.reportId}
        emptyState="Hazır rapor bulunamadı"
      />
    </Card>
  )
}
