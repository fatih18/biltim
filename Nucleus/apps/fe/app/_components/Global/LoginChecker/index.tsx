'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@store/globalStore'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { useGetUserRole } from '@/app/_hooks/user/useGetUserRole'
import { canAccessRoute, requirementFor } from '@/app/_utils/routeAccess'
import { Loader } from '../Loader'

const unauthPaths = ['/login', '/register']
/*
 * Paths served without a session. `/lyrics` and `/pocs/*` were carried over from
 * another project and match no route here — but the check is startsWith, so
 * anything added under those prefixes later would silently be public.
 */
const publicPaths: string[] = []

const isPublicPath = (path: string) => publicPaths.some((p) => path.startsWith(p))

export function LoginChecker({ children }: { children: React.ReactNode }) {
  const actions = useGenericApiActions()
  const store = useStore()
  const path = usePathname()
  const router = useRouter()

  const { roleName, roles } = useGetUserRole()

  const isCheckingRef = useRef(false)
  const redirectedRef = useRef(false)
  const deniedRef = useRef(false)

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
      // /auth/me takes nothing; 0.10 still requires the field to be present.
      payload: {},
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

  /*
   * Signed in is not the same as allowed here (§6.10).
   *
   * The header hid some menu entries by role, but an address typed into the bar
   * ignored that: a basic account could open /generic-api, which calls any
   * endpoint, or /drizzle-tables, which draws the schema. The backend refused
   * the data, so what rendered was an administrator's console full of failed
   * requests — which should never have painted at all.
   */
  const roleNames = [roleName ?? '', ...(roles ?? []).map((r) => r?.name ?? '')].filter(Boolean)
  const me = store.user as { data?: { isGod?: boolean }; isGod?: boolean } | undefined
  const isGod = Boolean(me?.data?.isGod ?? me?.isGod)
  const isRestricted = requiresAuth && Boolean(requirementFor(path))
  const isAllowed = !isRestricted || (Boolean(store.user) && canAccessRoute(path, roleNames, isGod))

  useEffect(() => {
    if (!isRestricted || isAllowed) {
      deniedRef.current = false
      return
    }
    if (!store.isLoginChecked || !store.user) return
    if (deniedRef.current) return
    deniedRef.current = true
    router.replace('/')
  }, [isRestricted, isAllowed, store.isLoginChecked, store.user, router])

  // Navigation is asynchronous, so rendering the page "just until the redirect"
  // shows a frame of the screen the visitor was not supposed to get.
  if (isRestricted && store.isLoginChecked && store.user && !isAllowed) return null

  if (requiresAuth && (!store.isLoginChecked || !store.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Loader message="Loading..." />
      </div>
    )
  }

  return <>{children}</>
}
