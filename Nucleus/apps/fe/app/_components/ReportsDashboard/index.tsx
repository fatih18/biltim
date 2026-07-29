'use client'

import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, RefreshCw } from 'lucide-react'
import { DateInput } from '@/app/_components/DateInput'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

/* ───────────── Types ───────────── */

type Row = Record<string, unknown>

type DashboardData = {
  byLocationType: Row[]
  statusCounts: Row[]
  overdueActions: Row[]
  scoresByDepartment: Row[]
  byStepCode: Row[]
  scoreTrend: Row[]
  planCompliance: Row[]
  findingsPerTeam: Row[]
  departmentSummary: Row[]
  mapHeat: Row[]
}

const CHART_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#22d3ee', '#e879f9', '#a3e635', '#f472b6',
]

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const str = (v: unknown) => String(v ?? '')

/* ───────────── Small UI helpers ───────────── */

function Card(props: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${props.className ?? ''}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-100">{props.title}</h3>
        {props.subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{props.subtitle}</p>}
      </div>
      {props.children}
    </section>
  )
}

function StatCard(props: { label: string; value: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass =
    props.tone === 'good'
      ? 'text-emerald-300'
      : props.tone === 'warn'
        ? 'text-amber-300'
        : props.tone === 'bad'
          ? 'text-rose-300'
          : 'text-sky-300'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-[11px] text-slate-400">{props.label}</div>
      <div className={`mt-1 text-xl font-bold ${toneClass}`}>{props.value}</div>
    </div>
  )
}

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 12,
}

/* ───────────── Pivot helpers ───────────── */

function pivot(rows: Row[], rowKey: string, colKey: string, valueKey: string) {
  const cols = new Set<string>()
  const map = new Map<string, Record<string, number | string>>()
  for (const r of rows) {
    const rk = str(r[rowKey]) || 'Bilinmiyor'
    const ck = str(r[colKey]) || 'Bilinmiyor'
    cols.add(ck)
    const entry = map.get(rk) ?? { name: rk }
    entry[ck] = num(entry[ck]) + num(r[valueKey])
    map.set(rk, entry)
  }
  return { data: Array.from(map.values()), columns: Array.from(cols) }
}

/* ───────────── Before/After photo report (rapor 3) ───────────── */

type PhotoItem = { file_id?: string | null; url?: string | null }
type FindingPhotoRow = {
  id: string
  finding_no?: number
  location_name?: string
  finding_type?: string
  status?: string
  photo_before_files?: PhotoItem[] | null
  photo_after_files?: PhotoItem[] | null
}

function photoUrl(p?: PhotoItem | null): string | null {
  if (!p) return null
  if (p.file_id) return `/api/view-file/${encodeURIComponent(p.file_id)}`
  return p.url ?? null
}

function BeforeAfterReport() {
  const actions = useGenericApiActions()
  const [rows, setRows] = React.useState<FindingPhotoRow[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const a = (actions as any).GET_FIVE_S_FINDINGS
    if (!a?.start) return
    setLoading(true)
    a.start({
      payload: {
        page: 1,
        limit: 30,
        orderBy: 'created_at',
        orderDirection: 'desc',
        filters: { status: 'closed' },
      },
      onAfterHandle: (resp: any) => {
        const root = resp?.data
        const arr: FindingPhotoRow[] = root?.data ?? (Array.isArray(root) ? root : [])
        setRows(
          (arr ?? []).filter(
            (f) =>
              (f.photo_before_files?.length ?? 0) > 0 && (f.photo_after_files?.length ?? 0) > 0
          )
        )
        setLoading(false)
      },
      onErrorHandle: () => setLoading(false),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="text-xs text-slate-400">Yükleniyor...</div>
  if (rows.length === 0)
    return <div className="text-xs text-slate-400">Öncesi/sonrası fotoğraflı kapatılmış bulgu bulunamadı.</div>

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.slice(0, 12).map((f) => {
        const before = photoUrl(f.photo_before_files?.[0])
        const after = photoUrl(f.photo_after_files?.[0])
        return (
          <div key={f.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-200 truncate">{f.location_name ?? '-'}</span>
              <span className="text-slate-500">#{f.finding_no ?? '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <div className="mb-0.5 text-[10px] text-rose-300">Önce</div>
                {before ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={before} alt="önce" className="h-24 w-full rounded object-cover" loading="lazy" />
                ) : (
                  <div className="h-24 rounded bg-slate-800" />
                )}
              </div>
              <div>
                <div className="mb-0.5 text-[10px] text-emerald-300">Sonra</div>
                {after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={after} alt="sonra" className="h-24 w-full rounded object-cover" loading="lazy" />
                ) : (
                  <div className="h-24 rounded bg-slate-800" />
                )}
              </div>
            </div>
            <div className="mt-1 text-[10px] text-slate-500 truncate">{f.finding_type ?? ''}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────── Factory map heat (rapor 11) ───────────── */

function heatColor(openCount: number, max: number) {
  if (max <= 0) return '#34d399'
  const ratio = Math.min(openCount / max, 1)
  if (ratio >= 0.66) return '#f87171'
  if (ratio >= 0.33) return '#fbbf24'
  return '#34d399'
}

function FactoryMapHeat({ mapHeat }: { mapHeat: Row[] }) {
  const placed = mapHeat.filter((l) => l.map_x != null && l.map_y != null)
  const unplaced = mapHeat.filter((l) => l.map_x == null || l.map_y == null)
  const maxOpen = Math.max(1, ...mapHeat.map((l) => num(l.open_findings)))

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60" style={{ aspectRatio: '16/9' }}>
        {/* Kroki placeholder — gerçek kroki görseli eklendiğinde arka plana konabilir */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-20">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="border border-slate-700" />
          ))}
        </div>
        <div className="absolute left-2 top-2 text-[10px] text-slate-500">
          Fabrika Krokisi (lokasyon koordinatları Ana Veri Yönetimi'nden girilebilir)
        </div>
        {placed.map((l) => (
          <div
            key={str(l.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${num(l.map_x)}%`, top: `${num(l.map_y)}%` }}
            title={`${str(l.name)} — Açık: ${num(l.open_findings)}, Toplam: ${num(l.total_findings)}${l.avg_close_days != null ? `, Ort. kapama: ${l.avg_close_days} gün` : ''}`}
          >
            <div
              className="flex items-center justify-center rounded-full font-bold text-slate-950 shadow-lg"
              style={{
                backgroundColor: heatColor(num(l.open_findings), maxOpen),
                width: 28 + Math.min(num(l.open_findings), 10) * 2,
                height: 28 + Math.min(num(l.open_findings), 10) * 2,
                fontSize: 11,
              }}
            >
              {num(l.open_findings)}
            </div>
            <div className="mt-0.5 max-w-[80px] truncate text-center text-[9px] text-slate-300">{str(l.name)}</div>
          </div>
        ))}
        {placed.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Henüz koordinatı girilmiş lokasyon yok.
          </div>
        )}
      </div>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unplaced.map((l) => (
            <span
              key={str(l.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px] text-slate-300"
              title="Kroki koordinatı girilmemiş"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: heatColor(num(l.open_findings), maxOpen) }}
              />
              {str(l.name)} ({num(l.open_findings)})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────── Main dashboard ───────────── */

export function ReportsDashboard({ compact = false }: { compact?: boolean }) {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const qs = params.toString()
      const res = await fetch(`/api/reports/dashboard${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error(`Rapor verisi alınamadı (${res.status})`)
      const json = await res.json()
      const d = json?.data ?? json
      setData(d as DashboardData)
    } catch (e: any) {
      console.error('dashboard report error', e)
      setError(String(e?.message ?? 'Rapor verisi alınamadı'))
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const locationTypePivot = React.useMemo(
    () => pivot(data?.byLocationType ?? [], 'location_name', 'finding_type', 'count'),
    [data]
  )
  const stepCodePivot = React.useMemo(
    () => pivot(data?.byStepCode ?? [], 'location_name', 'step_code', 'count'),
    [data]
  )
  const statusPivot = React.useMemo(() => {
    const rows = (data?.statusCounts ?? []).map((r) => ({
      ...r,
      status_label: str(r.status) === 'open' ? 'Açık' : str(r.status) === 'in_progress' ? 'Devam Ediyor' : 'Kapalı',
    }))
    return pivot(rows, 'location_name', 'status_label', 'count')
  }, [data])

  const totals = React.useMemo(() => {
    const summary = data?.departmentSummary ?? []
    const auditCount = summary.reduce((s, r) => s + num(r.audit_count), 0)
    const open = summary.reduce((s, r) => s + num(r.open_findings), 0)
    const closed = summary.reduce((s, r) => s + num(r.closed_findings), 0)
    const overdue = data?.overdueActions?.length ?? 0
    const trend = data?.scoreTrend ?? []
    const last = trend[trend.length - 1]
    return {
      auditCount,
      open,
      closed,
      overdue,
      lastAvg: last ? num(last.avg_total).toFixed(1) : '-',
    }
  }, [data])

  if (error) {
    return (
      <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4 text-sm text-rose-200">
        {error}
        <button type="button" onClick={fetchData} className="ml-3 underline">
          Tekrar dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtre çubuğu */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">Başlangıç</label>
          <DateInput
            value={dateFrom}
            onChange={setDateFrom}
            className="date-dark rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-300">Bitiş</label>
          <DateInput
            value={dateTo}
            onChange={setDateTo}
            className="date-dark rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs hover:bg-slate-950 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Yenile
        </button>
      </div>

      {/* Özet kartlar (rapor 2 + 10 özet) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Toplam Denetim" value={String(totals.auditCount)} />
        <StatCard label="Son Dönem Ort. Puan" value={String(totals.lastAvg)} tone={Number(totals.lastAvg) >= 75 ? 'good' : 'warn'} />
        <StatCard label="Açık Bulgu" value={String(totals.open)} tone="warn" />
        <StatCard label="Kapalı Bulgu" value={String(totals.closed)} tone="good" />
        <StatCard label="Termin Geçmiş" value={String(totals.overdue)} tone={totals.overdue > 0 ? 'bad' : 'good'} />
      </div>

      {/* Rapor 7: Puan trendi */}
      <Card title="5S Puan Trendi" subtitle="Denetim dönemlerine göre ortalama puan — hedef karşılaştırmalı">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data?.scoreTrend ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: 'Hedef 75', fill: '#f59e0b', fontSize: 10 }} />
            <Line type="monotone" dataKey="avg_total" name="Ortalama Puan" stroke="#38bdf8" strokeWidth={2} dot />
            <Line type="monotone" dataKey="avg_target" name="Hedef" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Rapor 1: Bölge × bulgu tipi */}
        <Card title="Bölge / Bulgu Tipi Dağılımı" subtitle="Hangi bölgede hangi tip bulgular yoğun">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationTypePivot.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {locationTypePivot.columns.map((c, i) => (
                <Bar key={c} dataKey={c} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rapor 2: Açık/Kapalı bulgu */}
        <Card title="Açık / Kapalı Bulgu Sayıları" subtitle="Bölge bazında durum dağılımı">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusPivot.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Açık" fill="#f87171" />
              <Bar dataKey="Devam Ediyor" fill="#fbbf24" />
              <Bar dataKey="Kapalı" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rapor 5: Puanlar bölge bazında */}
        <Card title="Bölge Bazında Puanlar" subtitle="Ortalama toplam puan (hedef çizgisi 75)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.scoresByDepartment ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="department_name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="6 3" />
              <Bar dataKey="avg_total" name="Ort. Puan" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rapor 6: Bölge × S adımı */}
        <Card title="Bölge / 5S Adımı Dağılımı" subtitle="Bulgular hangi S adımından çıkıyor">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stepCodePivot.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stepCodePivot.columns.map((c, i) => (
                <Bar key={c} dataKey={c} stackId="s" fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rapor 9: Ekip başına ortalama bulgu */}
        <Card title="Denetim Başına Ortalama Bulgu" subtitle="Ekip bazında bulgu yoğunluğu">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.findingsPerTeam ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="team_name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="avg_findings_per_audit" name="Ort. Bulgu / Denetim" fill="#a78bfa" />
              <Bar dataKey="audit_count" name="Denetim Sayısı" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rapor 8: Denetim planına uyum */}
        <Card title="Denetim Planına Uyum" subtitle="Plan durumları ve katılım bilgisi">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2 text-center">Plan</th>
                  <th className="px-3 py-2 text-center">Denetçi Katıldı</th>
                  <th className="px-3 py-2 text-center">Saha Sor. Katıldı</th>
                  <th className="px-3 py-2 text-center">Saha Sor. Katılmadı</th>
                </tr>
              </thead>
              <tbody>
                {(data?.planCompliance ?? []).map((r, i) => (
                  <tr key={i} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">
                      {str(r.status) === 'planned' ? 'Planlandı' : str(r.status) === 'completed' ? 'Tamamlandı' : str(r.status) === 'cancelled' ? 'İptal' : str(r.status)}
                    </td>
                    <td className="px-3 py-2 text-center">{num(r.count)}</td>
                    <td className="px-3 py-2 text-center text-emerald-300">{num(r.auditor_attended)}</td>
                    <td className="px-3 py-2 text-center text-emerald-300">{num(r.field_manager_attended)}</td>
                    <td className="px-3 py-2 text-center text-rose-300">{num(r.field_manager_missed)}</td>
                  </tr>
                ))}
                {(data?.planCompliance ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">Veri yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Rapor 10: Müdürlük bazlı özet */}
      <Card title="Müdürlük Bazlı Özet" subtitle="Denetim sayısı, ortalama puan ve bulgu durumları (müdürlük eşlemesi Ana Veri Yönetimi'ndeki lokasyonlardan gelir)">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Müdürlük</th>
                <th className="px-3 py-2 text-center">Denetim</th>
                <th className="px-3 py-2 text-center">Ort. Puan</th>
                <th className="px-3 py-2 text-center">Açık</th>
                <th className="px-3 py-2 text-center">Kapalı</th>
                <th className="px-3 py-2 text-center">Geciken</th>
              </tr>
            </thead>
            <tbody>
              {(data?.departmentSummary ?? []).map((r, i) => (
                <tr key={i} className="border-t border-slate-800/80">
                  <td className="px-3 py-2">{str(r.department_name)}</td>
                  <td className="px-3 py-2 text-center">{num(r.audit_count)}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${num(r.avg_total) >= 75 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {r.avg_total != null ? num(r.avg_total).toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2 text-center text-rose-300">{num(r.open_findings)}</td>
                  <td className="px-3 py-2 text-center text-emerald-300">{num(r.closed_findings)}</td>
                  <td className="px-3 py-2 text-center text-amber-300">{num(r.overdue_findings)}</td>
                </tr>
              ))}
              {(data?.departmentSummary ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">Veri yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rapor 4: Termin geçmiş aksiyonlar */}
      <Card title="Termin Tarihi Geçmiş Aksiyonlar" subtitle="Termini geçmiş, hâlâ açık bulgular">
        <div className="max-h-80 overflow-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Lokasyon</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Aksiyon</th>
                <th className="px-3 py-2">Termin</th>
                <th className="px-3 py-2 text-center">Gecikme</th>
                <th className="px-3 py-2">Sorumlu</th>
              </tr>
            </thead>
            <tbody>
              {(data?.overdueActions ?? []).map((r) => (
                <tr key={str(r.id)} className="border-t border-slate-800/80">
                  <td className="px-3 py-2 text-slate-400">{num(r.finding_no)}</td>
                  <td className="px-3 py-2">{str(r.location_name)}</td>
                  <td className="px-3 py-2 text-sky-300">{str(r.finding_type)}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={str(r.action_to_take)}>{str(r.action_to_take) || '-'}</td>
                  <td className="px-3 py-2">{str(r.due_date).slice(0, 10)}</td>
                  <td className="px-3 py-2 text-center font-semibold text-rose-300">{num(r.overdue_days)} gün</td>
                  <td className="px-3 py-2">{str(r.responsible_name) || '-'}</td>
                </tr>
              ))}
              {(data?.overdueActions ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">Termini geçmiş açık aksiyon yok. 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!compact && (
        <>
          {/* Rapor 11: Fabrika krokisi ısı haritası */}
          <Card title="Fabrika Krokisi — Bulgu Isı Haritası" subtitle="Açık bulgu sayısına göre kırmızı/sarı/yeşil; büyüklük yoğunluğu gösterir">
            <FactoryMapHeat mapHeat={data?.mapHeat ?? []} />
          </Card>

          {/* Rapor 3: Önce / Sonra fotoğraflı rapor */}
          <Card title="Önce / Sonra Fotoğraflı Bulgular" subtitle="Kapatılmış bulguların iyileştirme fotoğrafları">
            <BeforeAfterReport />
          </Card>
        </>
      )}
    </div>
  )
}
