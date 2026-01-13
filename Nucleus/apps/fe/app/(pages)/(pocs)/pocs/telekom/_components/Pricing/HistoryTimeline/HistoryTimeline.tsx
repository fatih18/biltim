'use client'

import { Badge, Card } from '@/app/_components/Global'
import type { HistoryTimelineProps } from './types'

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('tr-TR')
}

export function HistoryTimeline({ store }: HistoryTimelineProps) {
  const snapshots = store.history.snapshots
  const filters = store.history.filters

  return (
    <Card title="Geçmiş Kayıtlar" description="Zaman içinde yapılan hesaplama kayıtları.">
      <div className="flex flex-col gap-4">
        <section className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{`Filtre - Para Birimi: ${filters.currency}`}</span>
          <span>{`Durum: ${filters.status}`}</span>
          <span>{`Tarih Aralığı: ${filters.fromDate ?? 'Yok'} - ${filters.toDate ?? 'Yok'}`}</span>
          <span>{`Min Marj: ${filters.minimumMargin ?? '-'}`}</span>
        </section>

        {snapshots.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Henüz geçmiş kayıt bulunamadı. Bir hesaplama kaydedildiğinde burada görünecek.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.snapshotId}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4"
              >
                <header className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {snapshot.snapshotName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(snapshot.savedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{snapshot.currency}</Badge>
                    <Badge
                      variant={
                        snapshot.status === 'approved'
                          ? 'success'
                          : snapshot.status === 'cancelled'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {snapshot.status.toUpperCase()}
                    </Badge>
                  </div>
                </header>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">Satış:</span>
                    <span>{` ${snapshot.salePrice.toLocaleString('tr-TR', { style: 'currency', currency: snapshot.currency })}`}</span>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">EBIT Marjı:</span>
                    <span>{` ${snapshot.ebitMargin.toFixed(2)}%`}</span>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">NPV Marjı:</span>
                    <span>{` ${snapshot.npvMargin.toFixed(2)}%`}</span>
                  </div>
                </div>
                {snapshot.notes ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {snapshot.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
