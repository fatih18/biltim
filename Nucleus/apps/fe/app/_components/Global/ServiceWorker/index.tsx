'use client'

import { useEffect } from 'react'

/**
 * Installs public/offline-sw.js, which lets the audit form open without a connection.
 *
 * Browsers allow a service worker only in a secure context (HTTPS or
 * localhost); on plain http://<ip> this does nothing, which is why the site
 * has to be served over HTTPS for the iPads to work offline. Not in
 * development, where it would serve stale bundles over hot reload.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !window.isSecureContext) return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/offline-sw.js').catch((error) => {
      console.warn('service worker not registered', error)
    })
  }, [])
  return null
}
