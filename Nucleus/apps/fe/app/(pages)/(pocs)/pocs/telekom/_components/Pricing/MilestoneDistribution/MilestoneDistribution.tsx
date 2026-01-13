'use client'

import { useId } from 'react'
import { Badge, Button, Card } from '@/app/_components/Global'
import type { MilestoneDistributionProps } from './types'

const templateOptions = [
  { id: 'equal', label: 'Eşit Dağılım' },
  { id: 'thirtyFortyThirty', label: '30-40-30' },
  { id: 'frontLoaded', label: 'Öne Yüklü' },
  { id: 'backLoaded', label: 'Sona Yüklü' },
  { id: 'custom', label: 'Özel' },
] as const

function formatMonth(year: number, month: number): string {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
  })
  return formatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

export function MilestoneDistribution({ store }: MilestoneDistributionProps) {
  const templateFieldsetId = useId()
  const distribution = store.milestones.distribution
  const settings = store.milestones.settings
  const isEditable = settings.allowManualEdit && !distribution.isLocked

  let totalPercentage = 0
  for (const entry of distribution.entries) {
    totalPercentage += entry.percentage
  }

  return (
    <Card title="Hakedis Dağılımı" description="Ödeme dağılımlarını yönetin ve güncelleyin.">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Şablonlar
            </h3>
            {distribution.isLocked ? (
              <Badge variant="warning">Kilidi Açılmadan Düzenlenemez</Badge>
            ) : null}
          </header>
          <fieldset id={templateFieldsetId} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {templateOptions.map((option) => {
              const inputId = `${templateFieldsetId}-${option.id}`
              return (
                <label
                  key={option.id}
                  htmlFor={inputId}
                  className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:border-blue-200"
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="milestone-template"
                    className="h-4 w-4"
                    checked={distribution.templateId === option.id}
                    onChange={() => {
                      store.applyMilestoneTemplate(option.id)
                    }}
                    disabled={distribution.isLocked}
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
          </fieldset>
        </section>

        <section className="flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Dağılım Girdileri
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{`Toplam: ${totalPercentage.toFixed(2)}%`}</span>
              {totalPercentage !== settings.requiredTotalPercentage ? (
                <Badge variant="danger">Toplam {settings.requiredTotalPercentage}% olmalı</Badge>
              ) : null}
            </div>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {distribution.entries.map((entry) => {
              const percentageId = `${entry.id}-percentage`
              const amountId = `${entry.id}-amount`
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4"
                >
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {formatMonth(entry.month.year, entry.month.month)}
                    </h4>
                    {entry.isEditable ? (
                      <Badge variant="info">Düzenlenebilir</Badge>
                    ) : (
                      <Badge variant="neutral">Sabit</Badge>
                    )}
                  </header>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <fieldset className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-slate-600" htmlFor={percentageId}>
                        Yüzde (%)
                      </label>
                      <input
                        id={percentageId}
                        type="number"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={entry.percentage}
                        onChange={(event) => {
                          store.updateMilestoneEntry(entry.id, {
                            percentage: Number(event.target.value),
                          })
                        }}
                        aria-label="Yüzde değeri"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={!isEditable || !entry.isEditable}
                      />
                    </fieldset>
                    <fieldset className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-slate-600" htmlFor={amountId}>
                        Tutar
                      </label>
                      <input
                        id={amountId}
                        type="number"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={entry.amount}
                        onChange={(event) => {
                          store.updateMilestoneEntry(entry.id, {
                            amount: Number(event.target.value),
                          })
                        }}
                        aria-label="Tutar"
                        step="0.01"
                        min="0"
                        disabled={!isEditable || !entry.isEditable}
                      />
                    </fieldset>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {settings.validationMessages.length > 0 ? (
          <ul className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {settings.validationMessages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : null}

        <footer className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{`Şablon: ${distribution.templateId}`}</span>
            <span>{`Toplam Tutar: ${distribution.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`}</span>
          </div>
          <Button
            onClick={() => {
              store.saveMilestoneDistribution('current')
            }}
            disabled={distribution.isLocked}
            variant="primary"
          >
            Kaydet
          </Button>
        </footer>
      </div>
    </Card>
  )
}
