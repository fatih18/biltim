'use client'

import { Card, Kpi } from '@/app/_components/Global'
import type { ProfitabilitySummaryProps } from './types'

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–' // veya "0 ₺" gösterebilirsin
  }

  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  })
  return formatter.format(value)
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

export function ProfitabilitySummary({ store }: ProfitabilitySummaryProps) {
  const summary = store.pricing.summary

  return (
    <Card title="Karlılık Özeti" description="Temel finansal göstergeler.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi
          title="Satış Geliri"
          value={formatCurrency(summary.salePrice)}
          subValue={`Brüt Kar: ${formatCurrency(summary.grossProfit)}`}
          trend="steady"
          trendLabel={`Sermaye: ${formatCurrency(summary.capitalRequirement)}`}
        />
        <Kpi
          title="EBIT"
          value={formatCurrency(summary.ebit)}
          subValue={`Marj: ${formatPercentage(summary.ebitMargin)}`}
          trend={summary.ebitMargin >= 5 ? 'up' : 'down'}
          trendLabel={summary.ebitMargin >= 5 ? 'Hedef üzerinde' : 'Düşük marj'}
        />
        <Kpi
          title="NPV"
          value={formatCurrency(summary.npv)}
          subValue={`Marj: ${formatPercentage(summary.npvMargin)}`}
          trend={summary.npv >= 0 ? 'up' : 'down'}
          trendLabel={summary.npv >= 0 ? 'Pozitif değer' : 'Negatif NPV'}
        />
        <Kpi
          title="Vergiler"
          value={formatCurrency(summary.taxAmount)}
          subValue={`Net İşletme Karı: ${formatCurrency(summary.netOperatingProfit)}`}
          trend="steady"
          trendLabel="Kurumlar Vergisi"
        />
      </div>
    </Card>
  )
}
