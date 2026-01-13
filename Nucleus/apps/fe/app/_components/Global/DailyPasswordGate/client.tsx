'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type StatusState = {
  type: 'success' | 'error'
  message: string
} | null

export function DailyPasswordGateClient() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusState>(null)
  const router = useRouter()

  const isDisabled = useMemo(() => loading || password.trim().length === 0, [loading, password])
  const buttonLabel = loading ? 'Doğrulanıyor...' : 'Erişim Sağla'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isDisabled) return

    setLoading(true)
    setStatus(null)

    try {
      const response = await fetch('/api/check-daily-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.isValid) {
        setStatus({ type: 'success', message: 'Şifre doğrulandı. Yönlendiriliyorsunuz...' })
        router.refresh()
      } else {
        setStatus({
          type: 'error',
          message: data.message ?? 'Şifre doğrulanamadı. Lütfen tekrar deneyin.',
        })
      }
    } catch (error) {
      console.error('Error verifying password', error)
      setStatus({
        type: 'error',
        message: 'Beklenmeyen bir hata oluştu. Lütfen biraz sonra tekrar deneyin.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_45%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.15),_transparent_45%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl p-8 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              Rise Consulting Güvenlik Erişimi
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">Günlük Şifre Koruması</h1>
              <p className="text-base text-slate-200">
                Bu sayfa Rise Consulting güvenlik ekibi tarafından korumaya alınmıştır. Günlük
                şifrenizi güvenlik ekibinden talep edebilir ve doğrulama sonrasında erişim
                sağlayabilirsiniz.
              </p>
              <p className="text-sm text-slate-300">
                * Şifreler her gün yenilenir ve erişim talepleri kayıt altına alınır.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="daily-pass" className="text-sm font-medium text-slate-100">
                Günlük Şifre
              </label>
              <div className="relative">
                <input
                  id="daily-pass"
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">
                  (Günlük)
                </span>
              </div>
            </div>

            {status ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  status.type === 'success'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                }`}
              >
                {status.message}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Rise Consulting Güvenlik Ekibi ile iletişime geçerek güncel erişim şifrenizi talep
                edebilirsiniz.
              </p>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-sky-500 px-4 py-3 text-base font-semibold text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
