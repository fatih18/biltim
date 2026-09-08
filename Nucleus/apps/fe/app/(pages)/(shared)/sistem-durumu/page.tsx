'use client'

import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  RefreshCw,
  ServerCog,
  Timer,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import {
  type ActionMap,
  checkTone,
  formatBytes,
  formatUptime,
  percent,
  usageTone,
  useSystemStatus,
} from './useSystemStatus'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral'

const RING: Record<Tone, string> = {
  ok: 'border-emerald-300 dark:border-emerald-900/70',
  warn: 'border-amber-300 dark:border-amber-900/70',
  bad: 'border-rose-300 dark:border-rose-900/70',
  neutral: 'border-slate-200 dark:border-slate-800',
}
const INK: Record<Tone, string> = {
  ok: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  bad: 'text-rose-700 dark:text-rose-300',
  neutral: 'text-slate-900 dark:text-slate-100',
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: Tone
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${RING[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className={INK[tone]}>{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${INK[tone]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

const grid = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
const n = (v: number | undefined | null, suffix = '') =>
  typeof v === 'number' && Number.isFinite(v) ? `${v}${suffix}` : '—'

const LEVEL_STYLE: Record<string, string> = {
  error: 'text-rose-700 dark:text-rose-300',
  warn: 'text-amber-700 dark:text-amber-300',
  info: 'text-slate-600 dark:text-slate-400',
  debug: 'text-slate-500 dark:text-slate-500',
}

export default function SystemStatusPage() {
  const actions = useGenericApiActions() as unknown as ActionMap
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const status = useSystemStatus(actions, nowMs)

  const s = status.snapshot ?? {}
  const checks = status.readiness?.checks ?? {}
  const serving = status.readiness?.status === 'ready'

  const errorRate = s.application?.errors?.rate
  const errorTone: Tone = typeof errorRate === 'number' && errorRate > 0 ? 'bad' : 'ok'
  const blocked = s.application?.rateLimits?.blocked
  const blockedTone: Tone = typeof blocked === 'number' && blocked > 0 ? 'warn' : 'ok'
  const slow = s.database?.queries?.slowQueries
  const slowTone: Tone = typeof slow === 'number' && slow > 0 ? 'warn' : 'ok'

  const logs = useMemo(() => status.logs.slice(0, 40), [status.logs])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Sistem Durumu</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Servislerin ayakta olup olmadığını, yükü ve sunucunun kendi kayıtlarını tek ekranda
              gösterir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNowMs(Date.now())}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} aria-hidden className={status.isLoading ? 'animate-spin' : ''} />
            Yenile
          </button>
        </header>

        <Section
          title="Servis sağlığı"
          subtitle="Uygulamanın istek karşılayabilir durumda olup olmadığı — süreç ayakta demek yetmez."
        >
          <div className={grid}>
            <Stat
              icon={<ServerCog size={14} />}
              label="Uygulama"
              value={status.loaded ? (serving ? 'Hizmet veriyor' : 'Hizmet veremiyor') : '…'}
              hint={status.latencyMs === null ? undefined : `Yoklama ${status.latencyMs} ms`}
              tone={status.loaded ? (serving ? 'ok' : 'bad') : 'neutral'}
            />
            <Stat
              icon={<Database size={14} />}
              label="Veritabanı"
              value={checks.database ? (checks.database === 'ok' ? 'Bağlı' : 'Bağlanamıyor') : '…'}
              tone={checkTone(checks.database)}
            />
            <Stat
              icon={<Zap size={14} />}
              label="Redis"
              value={checks.redis ? (checks.redis === 'ok' ? 'Bağlı' : 'Bağlanamıyor') : '…'}
              hint={
                typeof s.redis?.hitRate === 'number'
                  ? `Önbellek isabeti ${percent(s.redis.hitRate)}`
                  : undefined
              }
              tone={checkTone(checks.redis)}
            />
            <Stat
              icon={<Timer size={14} />}
              label="Çalışma süresi"
              value={formatUptime(s.system?.process?.uptime)}
              hint="Son yeniden başlatmadan bu yana"
            />
          </div>
        </Section>

        <Section title="Sunucu kaynakları" subtitle="Makinenin yükü. %80 üstü sarı, %90 üstü kırmızı.">
          <div className={grid}>
            <Stat
              icon={<Cpu size={14} />}
              label="İşlemci"
              value={percent(s.system?.cpu?.usage)}
              hint={s.system?.cpu?.cores ? `${s.system.cpu.cores} çekirdek` : undefined}
              tone={usageTone(s.system?.cpu?.usage)}
            />
            <Stat
              icon={<MemoryStick size={14} />}
              label="Bellek"
              value={percent(s.system?.memory?.usagePercent)}
              hint={`${formatBytes(s.system?.memory?.used)} / ${formatBytes(s.system?.memory?.total)}`}
              tone={usageTone(s.system?.memory?.usagePercent)}
            />
            <Stat
              icon={<HardDrive size={14} />}
              label="Disk"
              value={percent(s.system?.disk?.usagePercent)}
              hint={`${formatBytes(s.system?.disk?.used)} / ${formatBytes(s.system?.disk?.total)}`}
              tone={usageTone(s.system?.disk?.usagePercent)}
            />
            <Stat
              icon={<Gauge size={14} />}
              label="Olay döngüsü gecikmesi"
              value={n(s.system?.process?.eventLoopLag, ' ms')}
              hint="Yükseldiyse sunucu isteklere geç yanıt veriyor"
              tone={
                typeof s.system?.process?.eventLoopLag === 'number' &&
                s.system.process.eventLoopLag > 100
                  ? 'warn'
                  : 'ok'
              }
            />
          </div>
        </Section>

        <Section title="Trafik" subtitle="Son bir dakikanın isteği, yanıt süresi ve reddedilenler.">
          <div className={grid}>
            <Stat
              icon={<Activity size={14} />}
              label="Dakikada istek"
              value={n(s.application?.requests?.perMinute)}
              hint={`Toplam ${n(s.application?.requests?.total)}`}
            />
            <Stat
              icon={<Timer size={14} />}
              label="Yanıt süresi"
              value={n(s.application?.responseTime?.avg, ' ms')}
              hint={`p95 ${n(s.application?.responseTime?.p95, ' ms')}`}
            />
            <Stat
              icon={<AlertTriangle size={14} />}
              label="Hata oranı"
              value={percent(errorRate)}
              hint={`Toplam ${n(s.application?.errors?.total)} hata`}
              tone={errorTone}
            />
            <Stat
              icon={<AlertTriangle size={14} />}
              label="Oran sınırına takılan"
              value={n(blocked)}
              hint="Artıyorsa kullanıcılar giriş yapamıyor olabilir"
              tone={blockedTone}
            />
          </div>
        </Section>

        <Section title="Veritabanı" subtitle="Bağlantı havuzu ve sorgu süreleri.">
          <div className={grid}>
            <Stat
              icon={<Database size={14} />}
              label="Aktif bağlantı"
              value={n(s.database?.connections?.active)}
              hint={`${n(s.database?.connections?.idle)} boşta · ${n(s.database?.connections?.total)} toplam`}
            />
            <Stat
              icon={<Timer size={14} />}
              label="Ortalama sorgu"
              value={
                typeof s.database?.queries?.avgTime === 'number'
                  ? `${s.database.queries.avgTime} ms`
                  : '—'
              }
            />
            <Stat
              icon={<AlertTriangle size={14} />}
              label="Yavaş sorgu"
              value={n(slow)}
              tone={slowTone}
            />
            <Stat
              icon={<MemoryStick size={14} />}
              label="Redis belleği"
              value={formatBytes(s.redis?.memory?.used)}
              hint={`${n(s.redis?.connections?.connected)} bağlantı`}
            />
          </div>
        </Section>

        {status.alerts.length > 0 ? (
          <Section title="Açık uyarılar" subtitle="Eşiği aşan ölçümler.">
            <ul className="space-y-2">
              {status.alerts.map((alert, i) => (
                <li
                  key={alert.id ?? `${alert.metric}-${i}`}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <span className="font-medium">{alert.metric ?? 'Uyarı'}</span>
                  {alert.message ? ` — ${alert.message}` : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section
          title="Sunucu kayıtları"
          subtitle="Sürecin kendi çıktısı — pod'a girmeden okunabilsin diye."
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {Object.keys(status.levelCounts).length > 0 ? (
              <div className="flex flex-wrap gap-3 border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800">
                {Object.entries(status.levelCounts).map(([level, count]) => (
                  <span key={level} className={LEVEL_STYLE[level] ?? 'text-slate-600 dark:text-slate-400'}>
                    {level}: {count}
                  </span>
                ))}
              </div>
            ) : null}

            {logs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400">
                {status.isLoading ? 'Yükleniyor…' : 'Kayıt yok.'}
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-slate-200 overflow-y-auto font-mono text-xs dark:divide-slate-800">
                {logs.map((log, i) => (
                  <li key={`${log.timestamp}-${i}`} className="flex gap-3 px-4 py-1.5">
                    <span className="shrink-0 text-slate-500 dark:text-slate-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('tr-TR') : '—'}
                    </span>
                    <span
                      className={`w-12 shrink-0 uppercase ${LEVEL_STYLE[log.level ?? ''] ?? 'text-slate-600 dark:text-slate-400'}`}
                    >
                      {log.level ?? ''}
                    </span>
                    <span className="min-w-0 flex-1 break-all text-slate-800 dark:text-slate-200">
                      {log.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
