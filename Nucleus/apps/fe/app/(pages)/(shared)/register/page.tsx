'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { FiEyeOff, FiLock, FiMail } from 'react-icons/fi'
import { AbstractAnimatedBackground, SocialLoginButton } from '@/app/_components'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '@/app/_store'
export default function Register() {
  const actions = useGenericApiActions()
  const store = useStore()
  const router = useRouter()

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    actions.REGISTER?.start({
      payload: {
        email: event.currentTarget.email.value,
        password: event.currentTarget.password.value,
      },
      onAfterHandle: () => {
        store.isLoginChecked = true
        router.push('/')
      },
      onErrorHandle: (error) => {
        console.error('Register failed:', error)
      },
    })
  }

  return (
    <main className="bg-white text-neutral-900">
      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <div className="absolute inset-0 lg:hidden">
          <AbstractAnimatedBackground />
          <div className="absolute inset-0 bg-white/25" />
        </div>
        <div className="relative flex flex-col justify-center px-5 py-12 sm:px-12 lg:px-[72px]">
          <div className="mx-auto w-full max-w-md sm:max-w-[420px]">
            <div className="mb-12 lg:hidden">
              <div className="flex items-center gap-3 mx-auto w-fit">
                <Image src="/logo.png" alt="Logo" width={128} height={128} />
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-100 bg-white min-w-96 px-8 pb-10 pt-9 shadow-[0_32px_80px_rgba(15,23,42,0.08)]">
              <header className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.32em] text-neutral-500 text-center">
                  Create your account
                </p>
                <h1 className="mt-3 text-3xl font-bold text-neutral-900 text-center sm:text-4xl">
                  Join Nucleus
                </h1>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500 text-center">
                  Start collaborating with your team and unlock your workspace in seconds.
                </p>
              </header>

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <fieldset>
                  <label
                    htmlFor="register-email"
                    className="text-sm font-semibold text-neutral-700"
                  >
                    Email
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-blue-500">
                      <FiMail className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <input
                      id="register-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="example@mail.com"
                      required
                      className="h-12 w-full rounded-lg border border-neutral-200 bg-white pl-12 pr-4 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <label
                    htmlFor="register-password"
                    className="text-sm font-semibold text-neutral-700"
                  >
                    Password
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-blue-500">
                      <FiLock className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <input
                      id="register-password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                      className="h-12 w-full rounded-lg border border-neutral-200 bg-white pl-12 pr-12 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
                      <FiEyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Use at least 8 characters, including uppercase, lowercase, and a number for
                    stronger security.
                  </p>
                </fieldset>

                <fieldset>
                  <label
                    htmlFor="register-confirm-password"
                    className="text-sm font-semibold text-neutral-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-blue-500">
                      <FiLock className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <input
                      id="register-confirm-password"
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                      className="h-12 w-full rounded-lg border border-neutral-200 bg-white pl-12 pr-12 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
                      <FiEyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <label className="flex items-start gap-3 text-sm text-neutral-600">
                    <input
                      type="checkbox"
                      name="terms"
                      required
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-neutral-600">
                    <input
                      type="checkbox"
                      name="marketing"
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Send me updates about product news, announcements, and featured content.
                    </span>
                  </label>
                </fieldset>

                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  {actions.REGISTER?.state?.isPending ? 'Registering...' : 'Create account'}
                </button>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-neutral-200" />
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
                      or continue with
                    </span>
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <SocialLoginButton
                      provider="github"
                      onClick={() => handleSocialLogin('github')}
                    />
                    <SocialLoginButton
                      provider="facebook"
                      onClick={() => handleSocialLogin('facebook')}
                    />
                    <SocialLoginButton
                      provider="google"
                      onClick={() => handleSocialLogin('google')}
                    />
                    <SocialLoginButton
                      provider="microsoft"
                      onClick={() => handleSocialLogin('microsoft')}
                    />
                    <SocialLoginButton
                      provider="apple"
                      onClick={() => handleSocialLogin('apple')}
                    />
                  </div>
                </div>

                <p className="text-center text-xs text-neutral-500">
                  We respect your privacy and will never share your personal information without
                  consent.
                </p>
              </form>

              <p className="mt-10 text-center text-sm text-neutral-500">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block">
          <div className="relative z-10 h-full border-l-5 border-l-neutral-200 flex opacity-90">
            <div className="flex w-full justify-center">
              <div
                className="absolute inset-0 size-fit animate-pulse m-auto"
                style={{ animation: 'slowSpin 22s linear infinite, pulse 2s ease-in-out infinite' }}
              >
                <Image src="/outer-logo.png" alt="Logo" width={256} height={256} />
              </div>
              <div className="m-auto">
                <Image src="/inner-logo.png" alt="Logo" width={256} height={256} />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center mt-[20rem]">
              <Image src="/logo-label.png" alt="Logo" width={256} height={256} />
            </div>
          </div>
          <AbstractAnimatedBackground />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/10" />
        </div>
      </section>
    </main>
  )
}
