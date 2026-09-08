'use client'

import { useStore } from '@store/globalStore'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { FiEye, FiLock, FiMail } from 'react-icons/fi'
import { AbstractAnimatedBackground, SocialLoginButton } from '@/app/_components'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'

/** Turns a refusal into something the person at the keyboard can act on. */
function loginErrorText(error: unknown, code?: number | null): string {
  const raw =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null
        ? String((error as { message?: unknown }).message ?? '')
        : ''

  // 429 is the one people hit without doing anything wrong: five attempts in
  // fifteen minutes locks the account's own bucket, and saying "wrong password"
  // there would send them off to reset a password that is fine. The server
  // says how long the block lasts (retryAfter, in seconds) — so say it.
  if (code === 429 || /too many|rate limit/i.test(raw)) {
    const retryAfter =
      typeof error === 'object' && error !== null
        ? Number((error as { retryAfter?: unknown }).retryAfter)
        : Number.NaN
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter >= 60
        ? `${Math.ceil(retryAfter / 60)} dakika`
        : `${Math.ceil(retryAfter)} saniye`
      : null
    return wait
      ? `Çok fazla giriş denemesi yapıldı. ${wait} sonra tekrar deneyin.`
      : 'Çok fazla giriş denemesi yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.'
  }
  if (/invalid email or password|invalid credentials/i.test(raw)) {
    return 'E-posta veya şifre hatalı.'
  }
  if (/locked/i.test(raw)) {
    return 'Hesabınız kilitli. Lütfen yöneticinizle iletişime geçin.'
  }
  if (/not verified|verify/i.test(raw)) {
    return 'E-posta adresiniz henüz doğrulanmamış.'
  }
  if (/failed to fetch|network/i.test(raw)) {
    return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'
  }
  return raw || 'Giriş yapılamadı. Lütfen tekrar deneyin.'
}

export default function Login() {
  const router = useRouter()
  const actions = useGenericApiActions()
  const store = useStore()
  const [formError, setFormError] = useState<string | null>(null)

  const handleSocialLogin = (providerId: string) => {
    if (providerId === 'github') {
      actions.GET_GITHUB_AUTH_URL?.start({
        payload: { returnUrl: '/' },
        onAfterHandle: (data) => {
          if (data?.authUrl) window.location.href = data.authUrl
        },
      })
    } else if (providerId === 'microsoft') {
      actions.GET_AZURE_AUTH_URL?.start({
        payload: { returnUrl: '/' },
        onAfterHandle: (data) => {
          if (data?.authUrl) window.location.href = data.authUrl
        },
      })
    } else {
      console.log(`Logging in with ${providerId}`)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): undefined {
    event.preventDefault()
    setFormError(null)

    actions.LOGIN_V2?.start({
      payload: {
        email: (event.currentTarget as any).email.value,
        password: (event.currentTarget as any).password.value,
      },
      onAfterHandle: () => {
        actions.GET_ME_V2?.start({
          // /auth/me takes nothing; 0.10 still requires the field to be present.
          payload: {},
          onAfterHandle: (meData) => {
            if (meData) {
              store.user = meData
              store.isLoginChecked = true
            }
            router.push('/')
          },
          onErrorHandle: (error) => {
            /*
             * The password was accepted and the session read then failed, so
             * bouncing back to /login silently looks like the password was
             * wrong — and typing it again produces the same bounce.
             */
            console.error('getMe after login error', error)
            store.user = undefined
            store.isLoginChecked = false
            setFormError(
              'Giriş yapıldı ancak oturum bilgileri alınamadı. Lütfen tekrar deneyin.'
            )
          },
        })
      },
      onErrorHandle: (error, code) => {
        /*
         * This swallowed every refusal into console.log, so a wrong password, a
         * locked account and a rate-limit block all produced the same thing on
         * screen: nothing. The form just sat there. The server does say why —
         * "Invalid email or password" — and it was being thrown away.
         */
        console.error('login error', error)
        setFormError(loginErrorText(error, code))
      },
    })

    return undefined
  }

  const isPending = !!actions.LOGIN_V2?.state?.isPending

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1.95fr]">
        {/* Mobile BG */}
        <div className="absolute inset-0 lg:hidden">
          <AbstractAnimatedBackground />
          <div className="absolute inset-0 bg-white/92 dark:bg-slate-950/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/60 dark:from-slate-950/70 dark:via-slate-950/40 dark:to-slate-950/80" />
        </div>

        {/* Left: Form */}
        <div className="relative z-10 flex flex-col justify-center px-5 py-12 sm:px-12 lg:px-[72px]">
          <div className="mx-auto w-full max-w-md sm:max-w-[420px]">
            {/* Mobile logo */}
            <div className="mb-10 lg:hidden">
              <div className="mx-auto flex w-fit items-center gap-3">
                <Image src="/logo.png" alt="Biltim 5S" width={96} height={96} className="dark:hidden" />
                <Image src="/white-logo.png" alt="" aria-hidden width={96} height={96} className="hidden dark:block" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-8 pb-10 pt-9 shadow-xl shadow-slate-950/60 backdrop-blur">
              <header className="mb-8">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600 dark:text-slate-400">
                  Hoşgeldiniz
                </p>

                <h1 className="mt-3 text-center text-3xl font-semibold text-slate-900 dark:text-slate-100 sm:text-4xl">
                  Giriş Yap
                </h1>


              </header>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <fieldset>
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-700 dark:text-sky-300">
                      <FiMail className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>

                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="example@mail.com"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 pl-12 pr-4 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 placeholder:dark:text-slate-400 outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Şifre
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-700 dark:text-sky-300">
                      <FiLock className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>

                    <input
                      id="login-password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      className="h-12 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 pl-12 pr-12 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 placeholder:dark:text-slate-400 outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    />

                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-400">
                      <FiEye className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                  </div>
                </fieldset>

                {formError ? (
                  <p
                    role="alert"
                    aria-live="assertive"
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
                  >
                    {formError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className={[
                    'inline-flex h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition',
                    'bg-sky-500 text-slate-950 hover:bg-sky-400',
                    'disabled:cursor-not-allowed disabled:opacity-70',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
                  ].join(' ')}
                >
                  {isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      name="remember"
                      className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/60 text-sky-700 dark:text-sky-400 focus:ring-sky-400"
                    />
                    Beni Hatırla
                  </label>
                </div>
              </form>


            </div>

            <p className="mt-6 text-center text-[11px] text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} Biltim • Güvenli giriş
            </p>
          </div>
        </div>

        {/* Right: Brand / Visual */}
        <div className="relative hidden overflow-hidden lg:block">
          <AbstractAnimatedBackground />
          {/*
            Every scrim belongs BEHIND the artwork. The old markup closed with a
            third overlay after the logo block and without a z-index, so it sat
            on top and dimmed the very thing it was meant to set off.
          */}
          <div className="absolute inset-0 bg-slate-950/70" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-transparent to-slate-950/45" />

          <div className="relative z-10 flex h-full flex-col border-l border-slate-300 dark:border-slate-800">
            <div className="relative flex w-full flex-1 items-center justify-center">
              {/*
                The artwork ships as dark navy, which was invisible against the
                dark scrim. `brightness-0 invert` repaints any opaque pixel pure
                white, so the composition survives and the contrast works.
              */}
              <div
                className="absolute inset-0 m-auto size-fit opacity-70"
                style={{ animation: 'slowSpin 22s linear infinite' }}
              >
                <Image
                  src="/outer-logo.png"
                  alt=""
                  aria-hidden
                  width={280}
                  height={280}
                  className="h-[280px] w-[280px] brightness-0 invert"
                />
              </div>

              <div className="relative">
                <Image
                  src="/inner-logo.png"
                  alt=""
                  aria-hidden
                  width={228}
                  height={228}
                  className="h-[228px] w-[228px] brightness-0 invert drop-shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
                />
              </div>
            </div>

            <div className="relative z-10 px-16 pb-20 text-center">
              <Image
                src="/logo-label.png"
                alt="Biltim 5S"
                width={220}
                height={34}
                className="mx-auto h-[34px] w-[220px] brightness-0 invert"
              />
              <p className="mx-auto mt-6 max-w-md text-balance text-sm leading-relaxed text-white/70">
                Saha denetimlerini planlayın, bulguları kayıt altına alın, iyileştirici
                faaliyetleri kapanışına kadar takip edin.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
