'use client'

import { useStore } from '@store/globalStore'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { FiEye, FiLock, FiMail } from 'react-icons/fi'
import { AbstractAnimatedBackground, SocialLoginButton } from '@/app/_components'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

export default function Login() {
  const router = useRouter()
  const actions = useGenericApiActions()
  const store = useStore()

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

    actions.LOGIN_V2?.start({
      payload: {
        email: (event.currentTarget as any).email.value,
        password: (event.currentTarget as any).password.value,
      },
      onAfterHandle: () => {
        actions.GET_ME_V2?.start({
          disableAutoRedirect: true,
          onAfterHandle: (meData) => {
            if (meData) {
              store.user = meData
              store.isLoginChecked = true
            }
            router.push('/')
          },
          onErrorHandle: (error) => {
            console.log('getMe after login error', error)
            store.user = undefined
            store.isLoginChecked = false
            router.push('/login')
          },
        })
      },
      onErrorHandle: (error) => {
        console.log('error', error)
      },
    })

    return undefined
  }

  const isPending = !!actions.LOGIN_V2?.state?.isPending

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1.95fr]">
        {/* Mobile BG */}
        <div className="absolute inset-0 lg:hidden">
          <AbstractAnimatedBackground />
          <div className="absolute inset-0 bg-slate-950/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80" />
        </div>

        {/* Left: Form */}
        <div className="relative z-10 flex flex-col justify-center px-5 py-12 sm:px-12 lg:px-[72px]">
          <div className="mx-auto w-full max-w-md sm:max-w-[420px]">
            {/* Mobile logo */}
            <div className="mb-10 lg:hidden">
              <div className="mx-auto flex w-fit items-center gap-3">
                <Image src="/logo.png" alt="Logo" width={96} height={96} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-8 pb-10 pt-9 shadow-xl shadow-slate-950/60 backdrop-blur">
              <header className="mb-8">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                  Hoşgeldiniz
                </p>

                <h1 className="mt-3 text-center text-3xl font-semibold text-slate-100 sm:text-4xl">
                  Giriş Yap
                </h1>


              </header>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <fieldset>
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                    Email
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-300">
                      <FiMail className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>

                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="example@mail.com"
                      required
                      className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-12 pr-4 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
                    Şifre
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-300">
                      <FiLock className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>

                    <input
                      id="login-password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-12 pr-12 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                    />

                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                      <FiEye className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                  </div>
                </fieldset>

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
                  {isPending ? 'Logging in...' : 'Sign In'}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 font-medium text-slate-300">
                    <input
                      type="checkbox"
                      name="remember"
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950/60 text-sky-400 focus:ring-sky-400"
                    />
                    Beni Hatırla
                  </label>

                  <Link
                    href="/forgot-password"
                    className="font-semibold text-sky-300 hover:text-sky-200"
                  >
                    Şifremi Unuttum ?
                  </Link>
                </div>
              </form>


            </div>

            <p className="mt-6 text-center text-[11px] text-slate-600">
              © {new Date().getFullYear()} Biltim • Secure sign-in
            </p>
          </div>
        </div>

        {/* Right: Brand / Visual */}
        <div className="relative hidden overflow-hidden lg:block">
          <AbstractAnimatedBackground />
          <div className="absolute inset-0 bg-slate-950/55" />

          <div className="relative z-10 flex h-full border-l border-slate-800">
            <div className="relative flex w-full items-center justify-center">
              <div
                className="absolute inset-0 m-auto size-fit opacity-90"
                style={{ animation: 'slowSpin 22s linear infinite' }}
              >
                <Image
                  src="/outer-logo.png"
                  alt="Logo"
                  width={256}
                  height={256}
                  className="h-[256px] w-[256px] drop-shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                />
              </div>

              <div className="relative">
                <Image
                  src="/inner-logo.png"
                  alt="Logo"
                  width={256}
                  height={256}
                  className="h-[256px] w-[256px] drop-shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                />
              </div>

              <div className="absolute inset-x-0 bottom-16 flex items-center justify-center">
                <Image
                  src="/logo-label.png"
                  alt="Logo"
                  width={256}
                  height={40}
                  className="h-[40px] w-[256px] opacity-90"
                />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/20 via-transparent to-slate-950/35" />
        </div>
      </section>
    </main>
  )
}
