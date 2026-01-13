'use client'
import { useStore } from '@store/globalStore'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { Loader } from '../Loader'

const unauthPaths = ['/login', '/register']
const publicPaths = ['/lyrics', '/pocs/humanis/avatar', '/pocs/vorion'] // PWA - No auth required

// Check if path is public (including sub-routes like /lyrics/settings)
const isPublicPath = (path: string) => {
  return publicPaths.some((publicPath) => path.startsWith(publicPath))
}

export function LoginChecker({ children }: { children: React.ReactNode }) {
  const actions = useGenericApiActions()
  const store = useStore()
  const path = usePathname()
  const router = useRouter()
  const isCheckingRef = useRef(false)

  // Skip auth check for public paths
  const isPublic = isPublicPath(path)
  const requiresAuth = !unauthPaths.includes(path) && !isPublic

  useEffect(() => {
    // Prevent multiple simultaneous GET_ME calls
    if (!store.isLoginChecked && requiresAuth && !isCheckingRef.current) {
      isCheckingRef.current = true

      actions.GET_ME_V2?.start({
        disableAutoRedirect: true,
        onAfterHandle: (data) => {
          console.log('getMeState', data)
          store.user = data
          store.isLoginChecked = true
          isCheckingRef.current = false
        },
        onErrorHandle: (error) => {
          console.log('error', error)
          store.isLoginChecked = true
          isCheckingRef.current = false
        },
      })
    }
  }, [store.isLoginChecked, path, requiresAuth, router, actions])

  if ((!store.isLoginChecked || !store.user) && requiresAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Loader message="Loading..." />
      </div>
    )
  }

  return children
}
