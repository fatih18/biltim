'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@store/globalStore'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { Loader } from '../Loader'

const unauthPaths = ['/login', '/register']
const publicPaths = ['/lyrics', '/pocs/humanis/avatar', '/pocs/vorion'] // PWA - No auth required

const isPublicPath = (path: string) => publicPaths.some((p) => path.startsWith(p))

export function LoginChecker({ children }: { children: React.ReactNode }) {
  const actions = useGenericApiActions()
  const store = useStore()
  const path = usePathname()
  const router = useRouter()

  const isCheckingRef = useRef(false)
  const redirectedRef = useRef(false)

  const isPublic = isPublicPath(path)
  const isUnauthPage = unauthPaths.includes(path)
  const requiresAuth = !isUnauthPage && !isPublic

  useEffect(() => {
    if (!requiresAuth) return

    if (store.user) {
      store.isLoginChecked = true
      return
    }

    // prevent multiple simultaneous GET_ME calls
    if (store.isLoginChecked || isCheckingRef.current) return
    isCheckingRef.current = true

    actions.GET_ME_V2?.start({
      disableAutoRedirect: true,

      onAfterHandle: (data) => {
        store.user = data
        store.isLoginChecked = true
        isCheckingRef.current = false
        redirectedRef.current = false
      },

      onErrorHandle: () => {
        store.user = undefined
        store.isLoginChecked = true
        isCheckingRef.current = false

        if (!redirectedRef.current && !isUnauthPage) {
          redirectedRef.current = true
          const returnUrl = encodeURIComponent(path || '/')
          router.replace(`/login?returnUrl=${returnUrl}`)
        }
      },
    })
  }, [requiresAuth, path, router, actions, store, isUnauthPage])

  if (requiresAuth && (!store.isLoginChecked || !store.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Loader message="Loading..." />
      </div>
    )
  }

  return <>{children}</>
}
