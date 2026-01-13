'use client'

import { useEffect } from 'react'

export function FetchDebug() {
    useEffect(() => {
        const original = window.fetch.bind(window)

        // Wrapper function
        const wrappedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                        ? input.toString()
                        : input.url

            console.log('[fetch-debug] ->', url, init?.method ?? 'GET')

            try {
                const res = await original(input as any, init)
                console.log('[fetch-debug] <-', url, res.status)
                return res
            } catch (e: any) {
                console.log('[fetch-debug] !!', url, e?.name, e?.message, e?.cause)
                throw e
            }
        }) as typeof window.fetch

        // Preserve extra properties (Next.js adds things like preconnect)
        Object.assign(wrappedFetch, window.fetch)

        window.fetch = wrappedFetch

        return () => {
            window.fetch = original
        }
    }, [])

    return null
}
