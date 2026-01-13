'use client'

import { Badge, Button, Card, Table } from '@/app/_components/Global'
import type { TableColumn } from '@/app/_components/Global/Table/types'
import type { ScenarioAnalysisProps } from './types'

function formatDays(mode: 'cash' | 'credit', days: number): string {
  if (mode === 'cash') {
    return 'Peşin'
  }
  return `${days} gün`
}

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

export function ScenarioAnalysis({ store }: ScenarioAnalysisProps) {
  const scenarioResultsMap: Record<
    string,
    (typeof store.scenarios.comparison.scenarios)[number] | undefined
  > = {}
  for (const result of store.scenarios.comparison.scenarios) {
    scenarioResultsMap[result.scenarioId] = result
  }
  const selectedScenarioId = store.scenarios.selectedScenarioId

  const columns: TableColumn<(typeof store.scenarios.parameters)[number]>[] = [
    {
      id: 'scenario',
      header: 'Senaryo',
      render: (row) => {
        const result = scenarioResultsMap[row.id]
        const isRecommended = store.scenarios.comparison.recommendedScenarioId === row.id
        const isSelected = selectedScenarioId === row.id
        return (
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">{row.name}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {row.kind === 'base'
                  ? 'Varsayılan'
                  : row.kind === 'optimized'
                    ? 'Optimize'
                    : 'Özel'}
              </span>
              {isRecommended ? <Badge variant="success">Önerilen</Badge> : null}
              {!row.isEnabled ? <Badge variant="warning">Pasif</Badge> : null}
              {isSelected ? <Badge variant="info">Aktif</Badge> : null}
              {result && result.warnings.length > 0 ? <Badge variant="danger">Uyarı</Badge> : null}
            </div>
          </div>
        )
      },
      width: '22%',
    },
    {
      id: 'payment',
      header: 'Ödeme & Tahsilat',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600">
          <span>{`Alış: ${formatDays(row.purchaseTerm.mode, row.purchaseTerm.days)}`}</span>
          <span>{`Satış: ${formatDays(row.salesTerm.mode, row.salesTerm.days)}`}</span>
        </div>
      ),
      width: '18%',
    },
    {
      id: 'rates',
      header: 'Oranlar',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600">
          <span>{`Kar Marjı: ${formatPercentage(row.markup)}`}</span>
          <span>{`Aylık Finansman: ${formatPercentage(row.financeRate)}`}</span>
          <span>{`Yıllık İskonto: ${formatPercentage(row.discountRate)}`}</span>
        </div>
      ),
      width: '20%',
    },
    {
      id: 'metrics',
      header: 'Sonuçlar',
      render: (row) => {
        const result = scenarioResultsMap[row.id]
        if (!result) {
          return <span className="text-xs text-slate-500">Sonuç yok</span>
        }
        return (
          <div className="flex flex-col text-xs text-slate-600">
            <span>{`EBIT: ${formatCurrency(result.ebit)}`}</span>
            <span>{`NPV: ${formatCurrency(result.npv)}`}</span>
            <span>{`Marj: ${formatPercentage(result.margin)}`}</span>
          </div>
        )
      },
      width: '20%',
    },
    {
      id: 'actions',
      header: 'İşlemler',
      align: 'right',
      render: (row) => {
        const checkboxId = `${row.id}-enabled`
        const result = scenarioResultsMap[row.id]
        return (
          <div className="flex flex-col items-end gap-2 text-xs">
            <div className="flex items-center gap-2">
              <input
                id={checkboxId}
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={row.isEnabled}
                onChange={(event) => {
                  store.toggleScenarioEnabled(row.id, event.target.checked)
                }}
              />
              <label className="text-slate-600" htmlFor={checkboxId}>
                Aktif
              </label>
            </div>
            <Button
              onClick={() => {
                store.selectScenario(row.id)
              }}
              disabled={!row.isEnabled || (result ? result.warnings.length > 0 : false)}
              variant="primary"
              size="sm"
            >
              Aktif Yap
            </Button>
          </div>
        )
      },
      width: '20%',
    },
  ]

  return (
    <Card
      title="Senaryo Analizi"
      description="Farklı vadeleri ve karlılık sonuçlarını karşılaştırın."
    >
      <Table
        columns={columns}
        data={store.scenarios.parameters}
        makeRowKey={(row) => row.id}
        emptyState="Tanımlı senaryo bulunamadı"
      />
    </Card>
  )
}
