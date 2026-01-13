'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

export default function OAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const message = searchParams.get('message')

    if (oauth === 'success') {
      toast.success('Successfully connected!')
      // Redirect to home after a short delay
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else if (oauth === 'linked') {
      toast.success('Account linked successfully!')
      setTimeout(() => {
        router.push('/profile')
      }, 1000)
    } else if (oauth === 'error') {
      toast.error(message || 'OAuth connection failed')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500 mx-auto" />
        <p className="mt-4 text-sm text-slate-600">Processing your authentication...</p>
      </div>
    </div>
  )
}
