'use client'

import { useCallback, useEffect, useState } from 'react'
import { syncFiveSOutbox } from './fiveSSync'
import { getPendingCount } from './fiveSOutbox'

export function useFiveSOfflineSync(opts: { actions: any; uploadAnswerPhoto: any }) {
    const [pending, setPending] = useState(0)
    const [syncing, setSyncing] = useState(false)

    const refresh = useCallback(async () => {
        setPending(await getPendingCount())
    }, [])

    const sync = useCallback(async () => {
        setSyncing(true)
        try {
            await syncFiveSOutbox(opts)
        } finally {
            setSyncing(false)
            await refresh()
        }
    }, [opts, refresh])

    useEffect(() => {
        refresh()
    }, [refresh])

    useEffect(() => {
        const onOnline = () => sync()
        window.addEventListener('online', onOnline)
        return () => window.removeEventListener('online', onOnline)
    }, [sync])

    return { pending, syncing, sync, refresh }
}
