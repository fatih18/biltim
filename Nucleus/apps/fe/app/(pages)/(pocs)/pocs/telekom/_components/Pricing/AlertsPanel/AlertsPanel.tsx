'use client'

import { Badge, Card } from '@/app/_components/Global'
import type { AlertMessage, AlertSeverity } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing'
import type { AlertsPanelProps } from './types'

const severityLabels: Record<
  AlertSeverity,
  { label: string; variant: 'info' | 'warning' | 'danger' }
> = {
  info: { label: 'Bilgi', variant: 'info' },
  warning: { label: 'Uyarı', variant: 'warning' },
  critical: { label: 'Kritik', variant: 'danger' },
}

export function AlertsPanel({ store }: AlertsPanelProps) {
  const alerts = store.ui.alerts

  return (
    <Card title="Uyarılar" description="Finansal risk ve fırsat bildirimleri.">
      {alerts.length === 0 ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Kritik uyarı bulunmuyor. Finansal göstergeler sağlıklı görünüyor.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert: AlertMessage) => {
            const severity = severityLabels[alert.severity] ?? severityLabels.info
            return (
              <li
                key={alert.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4"
              >
                <header className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{alert.title}</span>
                    <p className="text-xs text-slate-500">{alert.description}</p>
                  </div>
                  <Badge variant={severity.variant}>{severity.label}</Badge>
                </header>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
