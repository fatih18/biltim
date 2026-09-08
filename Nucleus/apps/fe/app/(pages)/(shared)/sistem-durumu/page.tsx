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
import { useEffect, useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { Spark, type SparkTone } from './Spark'
import { peakOf, series, spanMinutes, statsOf } from './chart'
import {
  type ActionMap,
  checkTone,
  formatBytes,
  formatUptime,
  percent,
  usageTone,
  useSystemStatus,
} from './useSystemStatus'
import { durumGruplari, kisaYol, paylar } from './traffic'

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

/**
 * One bar carrying the whole population, split by share.
 *
 * A stacked bar answers the question a row of counters cannot: how much of the
 * traffic is each thing. It also makes a small number of server errors
 * visible next to a large number of successes, which a percentage rounded to
 * one decimal hides.
 */
function StackedBar({
  parcalar,
}: {
  parcalar: Array<{ etiket: string; adet: number; oran: number; ton: 'good' | 'warn' | 'bad' }>
}) {
  const RENK = {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-rose-500',
  } as const
  const NOKTA = {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-rose-500',
  } as const

  if (parcalar.length === 0) {
    return <p className="text-xs text-slate-600 dark:text-slate-400">Henüz istek kaydı yok.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {parcalar.map((p) => (
          <div
            key={p.etiket}
            className={RENK[p.ton]}
            /* En küçük dilim bile görünsün: yüzde 0.4'lük bir hata payı
               tamamen kaybolursa çubuk "hiç hata yok" demiş olur. */
            style={{ width: `${Math.max(p.oran, p.adet > 0 ? 1.5 : 0)}%` }}
            title={`${p.etiket}: ${p.adet} (%${p.oran.toFixed(1)})`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {parcalar.map((p) => (
          <span
            key={p.etiket}
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <span className={`h-2 w-2 rounded-full ${NOKTA[p.ton]}`} />
            {p.etiket}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{p.adet}</span>
            <span className="text-slate-500 dark:text-slate-400">%{p.oran.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** A ranked list where the bar IS the share, so the eye sorts before the mind. */
function ShareList({
  satirlar,
  bosMesaj,
}: {
  satirlar: Array<{ ad: string; adet: number; oran: number }>
  bosMesaj: string
}) {
  if (satirlar.length === 0) {
    return <p className="text-xs text-slate-600 dark:text-slate-400">{bosMesaj}</p>
  }
  const enBuyuk = Math.max(...satirlar.map((r) => r.oran), 1)
  return (
    <ul className="space-y-2">
      {satirlar.map((r) => (
        <li key={r.ad} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span
              className="truncate font-medium text-slate-800 dark:text-slate-200"
              title={r.ad}
            >
              {kisaYol(r.ad)}
            </span>
            <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
              {r.adet}
              <span className="ml-1 text-slate-500 dark:text-slate-500">%{r.oran.toFixed(1)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
              /* Ölçek en büyüğe göre: hepsi mutlak yüzdeyle çizilseydi
                 yirmi ucun dağıldığı bir kurulumda bütün çubuklar
                 birbirinden ayırt edilemeyecek kadar kısa kalırdı. */
              style={{ width: `${Math.max((r.oran / enBuyuk) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
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

/**
 * A number with the shape of the hour behind it. The reading answers "what is
 * true now"; the line answers "is it getting worse", which is the question
 * someone opens this screen to ask.
 */
function TrendStat({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  values,
  max,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: Tone
  values: number[]
  max?: number
}) {
  const sparkTone: SparkTone =
    tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : tone === 'bad' ? 'bad' : 'info'
  const stats = statsOf(values)
  return (
    <div className={`overflow-hidden rounded-xl border bg-white dark:bg-slate-900 ${RING[tone]}`}>
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span className={INK[tone]}>{icon}</span>
          {label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-semibold ${INK[tone]}`}>{value}</span>
          {stats ? (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              son 1 saat · en yüksek {stats.max.toFixed(stats.max < 10 ? 1 : 0)}
            </span>
          ) : null}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
        ) : null}
      </div>
      <Spark values={values} tone={sparkTone} max={max} label={`${label} son bir saat`} />
    </div>
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
  const [logLevel, setLogLevel] = useState<string>('')
  const [logTerm, setLogTerm] = useState<string>('')
  const [logTermApplied, setLogTermApplied] = useState<string>('')

  // The typed term is debounced before it becomes a request.
  useEffect(() => {
    const timer = setTimeout(() => setLogTermApplied(logTerm.trim()), 350)
    return () => clearTimeout(timer)
  }, [logTerm])

  const logQuery = useMemo(
    () => ({ level: logLevel, term: logTermApplied }),
    [logLevel, logTermApplied]
  )

  const status = useSystemStatus(actions, nowMs, logQuery)

  const s = status.snapshot ?? {}
  const checks = status.readiness?.checks ?? {}
  const serving = status.readiness?.status === 'ready'

  const errorRate = s.application?.errors?.rate
  const errorTone: Tone = typeof errorRate === 'number' && errorRate > 0 ? 'bad' : 'ok'
  const blocked = s.application?.rateLimits?.blocked
  const blockedTone: Tone = typeof blocked === 'number' && blocked > 0 ? 'warn' : 'ok'
  const slow = s.database?.queries?.slowQueries
  const slowTone: Tone = typeof slow === 'number' && slow > 0 ? 'warn' : 'ok'

  const h = status.history
  const cpuSeries = useMemo(() => series(h, 'system.cpu.usage'), [h])
  const memSeries = useMemo(() => series(h, 'system.memory.usagePercent'), [h])
  const reqSeries = useMemo(() => series(h, 'application.requests.perMinute'), [h])
  const rtSeries = useMemo(() => series(h, 'application.responseTime.avg'), [h])
  const errSeries = useMemo(() => series(h, 'application.errors.rate'), [h])
  const blockedSeries = useMemo(() => series(h, 'application.rateLimits.blocked'), [h])
  const connSeries = useMemo(() => series(h, 'database.connections.active'), [h])
  const diskSeries = useMemo(() => series(h, 'system.disk.usagePercent'), [h])
  const lagSeries = useMemo(() => series(h, 'system.process.eventLoopLag'), [h])
  const querySeries = useMemo(() => series(h, 'database.queries.avgTime'), [h])
  const peak = useMemo(() => peakOf(h), [h])
  const span = useMemo(() => spanMinutes(h), [h])

  const logs = useMemo(() => status.logs.slice(0, 60), [status.logs])

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

        <Section
          title="Sunucu kaynakları"
          subtitle={
            span
              ? `Makinenin yükü ve son ${span} dakikanın seyri. %80 üstü sarı, %90 üstü kırmızı.`
              : 'Makinenin yükü. %80 üstü sarı, %90 üstü kırmızı.'
          }
        >
          <div className={grid}>
            <TrendStat
              icon={<Cpu size={14} />}
              label="İşlemci"
              value={percent(s.system?.cpu?.usage)}
              hint={s.system?.cpu?.cores ? `${s.system.cpu.cores} çekirdek` : undefined}
              tone={usageTone(s.system?.cpu?.usage)}
              values={cpuSeries}
              max={100}
            />
            <TrendStat
              icon={<MemoryStick size={14} />}
              label="Bellek"
              value={percent(s.system?.memory?.usagePercent)}
              /*
               * The scope belongs on the tile, because the same percentage
               * means two different things.
               *
               * Inside a container the server reports the cgroup working set —
               * the number that actually predicts an out-of-memory kill. With
               * no cgroup and no /proc/meminfo it falls back to "everything the
               * OS has not left free", which on a healthy machine is nearly all
               * of it: this screen read %99.6 on a laptop with nothing wrong.
               * Without the label, a permanently red tile teaches whoever
               * watches it to ignore the screen.
               */
              hint={`${formatBytes(s.system?.memory?.used)} / ${formatBytes(s.system?.memory?.total)}${
                s.system?.memory?.scope === 'container'
                  ? ' — kapsayıcıya ayrılan'
                  : s.system?.memory?.scope === 'host'
                    ? ' — makinenin tamamı (önbellek dahil)'
                    : ''
              }`}
              tone={usageTone(s.system?.memory?.usagePercent)}
              values={memSeries}
              max={100}
            />
            <TrendStat
              icon={<HardDrive size={14} />}
              label="Disk"
              value={percent(s.system?.disk?.usagePercent)}
              hint={`${formatBytes(s.system?.disk?.used)} / ${formatBytes(s.system?.disk?.total)}`}
              tone={usageTone(s.system?.disk?.usagePercent)}
              values={diskSeries}
              max={100}
            />
            <TrendStat
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
              values={lagSeries}
            />
          </div>
        </Section>

        <Section title="Trafik" subtitle="Son bir dakikanın isteği, yanıt süresi ve reddedilenler.">
          <div className={grid}>
            <TrendStat
              icon={<Activity size={14} />}
              label="Dakikada istek"
              value={n(s.application?.requests?.perMinute)}
              hint={`Toplam ${n(s.application?.requests?.total)}`}
              values={reqSeries}
            />
            <TrendStat
              icon={<Timer size={14} />}
              label="Yanıt süresi"
              value={n(s.application?.responseTime?.avg, ' ms')}
              hint={`p95 ${n(s.application?.responseTime?.p95, ' ms')}`}
              values={rtSeries}
            />
            <TrendStat
              icon={<AlertTriangle size={14} />}
              label="Hata oranı"
              value={percent(errorRate)}
              hint={`Toplam ${n(s.application?.errors?.total)} hata`}
              tone={errorTone}
              values={errSeries}
            />
            <TrendStat
              icon={<AlertTriangle size={14} />}
              label="Oran sınırına takılan"
              value={n(blocked)}
              hint="Artıyorsa kullanıcılar giriş yapamıyor olabilir"
              tone={blockedTone}
              values={blockedSeries}
            />
          </div>
        </Section>

        {/*
          What the server is actually being asked to do.
          
          All three breakdowns were already in the snapshot — 23 endpoints, the
          status codes and the methods — and none of them reached the screen. A
          wall of counters says the system is busy; this says WHAT it is busy
          with, which is the question someone opens this page to answer.
        */}
        <Section
          title="Trafik dağılımı"
          subtitle="İsteklerin nasıl sonuçlandığı ve yükü hangi uçların taşıdığı — açılıştan bu yana."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <Activity size={14} />
                Sonuçlar
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                İstemci hatası birinin hatalı istek göndermesi; sunucu hatası bizim.
              </p>
              <div className="mt-4">
                <StackedBar parcalar={durumGruplari(s.application?.requests?.byStatus)} />
              </div>
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Metotlar
                </div>
                <div className="mt-3">
                  <ShareList
                    satirlar={paylar(s.application?.requests?.byMethod, 5)}
                    bosMesaj="Henüz istek kaydı yok."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <ServerCog size={14} />
                En çok çağrılan uçlar
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Çubuk, en yoğun uca göre ölçeklenir; yüzde toplam içindeki payıdır.
              </p>
              <div className="mt-4">
                <ShareList
                  satirlar={paylar(s.application?.requests?.byEndpoint, 8)}
                  bosMesaj="Henüz istek kaydı yok."
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Veritabanı" subtitle="Bağlantı havuzu ve sorgu süreleri.">
          <div className={grid}>
            <TrendStat
              icon={<Database size={14} />}
              label="Aktif bağlantı"
              value={n(s.database?.connections?.active)}
              hint={`${n(s.database?.connections?.idle)} boşta · ${n(s.database?.connections?.total)} toplam`}
              values={connSeries}
            />
            <TrendStat
              icon={<Timer size={14} />}
              label="Ortalama sorgu"
              value={
                typeof s.database?.queries?.avgTime === 'number'
                  ? `${s.database.queries.avgTime} ms`
                  : '—'
              }
              values={querySeries}
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

        <Section
          title="Taşınan en yüksek yük"
          subtitle="Bu kurulumun gerçekten karşıladığı en yoğun dakika — tahmin değil, ölçüm."
        >
          {peak ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {peak.requestsPerMinute}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  istek / dakika
                </span>
                {peak.at ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(peak.at).toLocaleString('tr-TR')}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">O anki işlemci</div>
                  <div className={`mt-1 text-lg font-semibold ${INK[usageTone(peak.cpu)]}`}>
                    {percent(peak.cpu)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">O anki p95 yanıt</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {n(peak.responseTime, ' ms')}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">O anki hata oranı</div>
                  <div
                    className={`mt-1 text-lg font-semibold ${
                      (peak.errorRate ?? 0) > 0 ? INK.bad : INK.ok
                    }`}
                  >
                    {percent(peak.errorRate)}
                  </div>
                </div>
              </div>

              {/*
                Deliberately a floor, not a ceiling. Extrapolating from an idle
                system — "40 requests a minute at 12 ms, so it will do 40.000 at
                12 ms" — has never been true of any server. What can be said
                honestly is that it carried this much, and here is what the
                machine looked like while it did.
              */}
              <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Bu bir <span className="font-medium">taban</span>: sistemin bu yükü taşıdığı
                ölçüldü. Üst sınır, bir şey bozulana kadar yüklenerek yapılan bir koşuyla
                belirlenir; öyle bir koşu yapılmadıkça buraya bir kapasite sayısı yazmak
                ölçülmemiş bir şeyi uydurmak olur.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Henüz kayda değer bir yük ölçülmedi. Bu kutu, sistem gerçek trafik taşıdıkça
              o anın rakamlarıyla dolar.
            </div>
          )}
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
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              {Object.entries(status.levelCounts).map(([level, count]) => {
                const active = logLevel === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLogLevel(active ? '' : level)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'border-slate-400 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${LEVEL_STYLE[level] ?? 'text-slate-600 dark:text-slate-400'}`}
                  >
                    {level}: {count}
                  </button>
                )
              })}

              <input
                type="search"
                value={logTerm}
                onChange={(event) => setLogTerm(event.target.value)}
                placeholder="Kayıtlarda ara…"
                aria-label="Sunucu kayıtlarında ara"
                className="ml-auto w-48 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
              />

              {logLevel || logTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setLogLevel('')
                    setLogTerm('')
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Temizle
                </button>
              ) : null}
            </div>

            {logs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400">
                {status.isLoading
                  ? 'Yükleniyor…'
                  : status.logs.length > 0
                    ? 'Bu filtrelerle kayıt bulunamadı.'
                    : 'Kayıt yok.'}
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
