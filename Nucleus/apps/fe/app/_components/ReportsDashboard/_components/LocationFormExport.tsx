'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { downloadFile } from '@/app/_utils/downloadFile'
import { useLocationOptions } from '../_hooks/useLocationOptions'
import { reportDownloadFailureMessage } from '../_utils/downloadFailureMessage'

/*
 * The plant's own yearly workbook for one area — "5S Denetim Bulgu ve Soru
 * Formu": the findings sheet with photos and one question sheet per audit.
 * Built by the backend (/reports/location-form.xlsx) in the layout of the
 * file the customer sent.
 */

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100'
const NOTE = 'text-xs text-slate-600 dark:text-slate-400'

export function LocationFormExport() {
  const { names, loading, failed, scoped, reload } = useLocationOptions()
  const thisYear = new Date().getFullYear()
  const [location, setLocation] = useState('')
  const [year, setYear] = useState(String(thisYear))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    if (!location) return
    setBusy(true)
    setError(null)
    try {
      const result = await downloadFile('/reports/location-form.xlsx', { location_name: location, year }, 'rapor.xlsx')
      if (!result.ok) setError(reportDownloadFailureMessage(result.status, result.message))
    } finally {
      setBusy(false)
    }
  }

  // The list is never silently empty: say what is wrong, what it means, what to do.
  const emptyNote = scoped
    ? 'Size atanmış lokasyon yok, bu yüzden form alınamaz. Merkez Ekip’ten lokasyon ataması isteyin.'
    : 'Aktif lokasyon yok, bu yüzden form alınamaz. Ana Veri Yönetimi’nden lokasyon ekleyin.'

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-end">
        <div className="space-y-1 xs:min-w-[220px]">
          <label htmlFor="location-form-location" className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
            Lokasyon
          </label>
          <select
            id="location-form-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={loading || names.length === 0}
            className={`${FIELD} disabled:opacity-60`}
          >
            <option value="">{loading ? 'Lokasyonlar yükleniyor…' : 'Lokasyon seçin'}</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="location-form-year" className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
            Yıl
          </label>
          <select id="location-form-year" value={year} onChange={(e) => setYear(e.target.value)} className={FIELD}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!location || busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-700/50 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:bg-slate-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Bulgu ve Soru Formu (Excel)
        </button>
      </div>
      {!loading && !failed && names.length > 0 && <p className={NOTE}>{names.length} lokasyon listeleniyor.</p>}
      {!loading && !failed && names.length === 0 && <p className={NOTE}>{emptyNote}</p>}
      {!loading && failed && (
        <p className="text-xs text-rose-700 dark:text-rose-300">
          Lokasyon listesi alınamadı, bu yüzden form seçilemiyor. Bağlantınızı kontrol edip{' '}
          <button type="button" onClick={reload} className="underline">
            tekrar deneyin
          </button>
          .
        </p>
      )}
      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  )
}
