'use client'

import { useId } from 'react'
import { Card } from '@/app/_components/Global'
import type { ProjectInfoPanelProps } from './types'

export function ProjectInfoPanel({ store }: ProjectInfoPanelProps) {
  const dateId = useId()
  const currencyId = useId()
  const exchangeRateId = useId()
  const customerId = useId()
  const trackInvestmentId = useId()
  const trackInvestmentsId = useId()

  return (
    <Card title="Proje Bilgileri" description="Temel proje parametrelerini yönetin.">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={dateId}>
            Proje Tarihi
          </label>
          <input
            id={dateId}
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={store.inputs.project.projectDate}
            onChange={(event) => {
              store.setProjectDate(event.target.value)
            }}
            aria-label="Proje tarihini seçin"
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={currencyId}>
            Para Birimi
          </label>
          <select
            id={currencyId}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={store.inputs.project.currency}
            onChange={(event) => {
              store.setProjectCurrency(event.target.value as typeof store.inputs.project.currency)
            }}
            aria-label="Para birimini seçin"
          >
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={exchangeRateId}>
            Kur (TRY karşılığı)
          </label>
          <input
            id={exchangeRateId}
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={store.inputs.project.exchangeRateToTry}
            onChange={(event) => {
              store.setExchangeRate(Number(event.target.value))
            }}
            aria-label="Kur değerini girin"
            step="0.01"
            min="0"
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={customerId}>
            Müşteri
          </label>
          <input
            id={customerId}
            type="text"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={store.inputs.project.customerName ?? ''}
            placeholder="Müşteri adı"
            onChange={(event) => {
              store.setCustomerName(event.target.value === '' ? null : event.target.value)
            }}
            aria-label="Müşteri adını girin"
          />
        </fieldset>

        <fieldset className="flex items-center gap-3">
          <input
            id={trackInvestmentId}
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
            checked={store.inputs.project.trackInvestment}
            onChange={(event) => {
              store.toggleTrackInvestment(event.target.checked)
            }}
            aria-label="Yatırım takibini etkinleştir"
          />
          <label className="text-sm text-slate-700" htmlFor={trackInvestmentId}>
            Yatırım Takibi
          </label>
        </fieldset>

        <fieldset className="flex items-center gap-3">
          <input
            id={trackInvestmentsId}
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
            checked={store.inputs.project.trackInvestments}
            onChange={(event) => {
              store.toggleTrackInvestments(event.target.checked)
            }}
            aria-label="Yatırımları izle"
          />
          <label className="text-sm text-slate-700" htmlFor={trackInvestmentsId}>
            Yatırımlar
          </label>
        </fieldset>
      </div>
    </Card>
  )
}
