import { fiveSOfflineDb, nowIso, type OutboxRow } from './fiveSOfflineDb'

let isSyncing = false

function stringifyErr(e: any) {
    return e?.cause?.message ?? e?.message ?? String(e)
}

/**
 * actions: useGenericApiActions() çıktısı
 * uploadAnswerPhoto: senin hook’tan gelen uploader
 */
export async function syncFiveSOutbox(opts: {
    actions: any
    uploadAnswerPhoto: (args: { file: File }) => Promise<{ fileId?: string; fileUrl?: string }>
}) {
    if (isSyncing) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    isSyncing = true
    try {
        // pending + error olanları da tekrar deneyebiliriz (şimdilik pending)
        const items = await fiveSOfflineDb.outbox
            .where('status')
            .anyOf(['pending', 'error'])
            .sortBy('createdAt')

        for (const item of items) {
            await processOne(item, opts)
        }
    } finally {
        isSyncing = false
    }
}

async function mark(rowId: string, patch: Partial<OutboxRow>) {
    await fiveSOfflineDb.outbox.update(rowId, { ...patch, updatedAt: nowIso() })
}

async function processOne(item: OutboxRow, opts: { actions: any; uploadAnswerPhoto: any }) {
    // optimistic lock
    await mark(item.id, { status: 'syncing', lastError: null })

    try {
        if (item.type === 'AUDIT_CREATE') {
            const serverAuditId = await syncAuditCreate(item, opts.actions)
            await fiveSOfflineDb.audit_map.put({
                auditClientId: item.auditClientId!,
                serverAuditId,
                updatedAt: nowIso(),
            })
            await mark(item.id, { status: 'done' })
            return
        }

        if (item.type === 'FINDING_CREATE') {
            const map = await fiveSOfflineDb.audit_map.get(item.auditClientId!)
            if (!map?.serverAuditId) {
                // audit daha sync olmamış → tekrar pending yap
                await mark(item.id, { status: 'pending' })
                return
            }

            await syncFindingCreate(item, map.serverAuditId, opts.actions, opts.uploadAnswerPhoto)
            await mark(item.id, { status: 'done' })
            return
        }

        await mark(item.id, { status: 'done' })
    } catch (e) {
        const msg = stringifyErr(e)
        const nextAttempts = (item.attempts ?? 0) + 1
        await mark(item.id, { status: 'error', lastError: msg, attempts: nextAttempts })
    }
}

async function startAsPromise(startFn: any, args: any) {
    return await new Promise<any>((resolve, reject) => {
        if (!startFn) return reject(new Error('action.start not found'))
        startFn({
            ...args,
            onAfterHandle: (data: any) => resolve(data),
            onErrorHandle: (err: any) => reject(err),
        })
    })
}

async function syncAuditCreate(item: OutboxRow, actions: any) {
    const resp = await startAsPromise(actions.ADD_FIVE_S_AUDIT?.start, {
        payload: item.payload,
        disableAutoRedirect: true,
    })

    const auditId = resp?.data?.id ?? resp?.id ?? resp?.data?.[0]?.id ?? null
    if (!auditId) throw new Error('Audit id not returned')

    return String(auditId)
}

async function syncFindingCreate(
    item: OutboxRow,
    serverAuditId: string,
    actions: any,
    uploadAnswerPhoto: (args: { file: File }) => Promise<{ fileId?: string; fileUrl?: string }>
) {
    const fileIds: string[] = item.payload?.__local_file_ids ?? []
    const uploaded: Array<{ file_id: string | null; url: string | null }> = []

    // upload files
    for (const fid of fileIds) {
        const fr = await fiveSOfflineDb.files.get(fid)
        if (!fr?.blob) continue
        const file = fr.blob as File
        const up = await uploadAnswerPhoto({ file })
        const file_id = up?.fileId ? String(up.fileId) : null
        const url = up?.fileUrl ? String(up.fileUrl) : null
        if (file_id || url) uploaded.push({ file_id, url })
    }

    const primary = uploaded[0] ?? null

    // finding payload
    const payload = { ...item.payload }
    delete payload.__local_file_ids

    payload.audit_id = serverAuditId
    payload.photo_before_files = uploaded
    payload.photo_before_file_id = primary?.file_id ?? undefined
    payload.photo_before_url = primary?.url ?? undefined

    const resp = await startAsPromise(actions.ADD_FIVE_S_FINDING?.start, {
        payload,
        disableAutoRedirect: true,
    })

    const findingId = resp?.data?.id ?? resp?.id ?? resp?.data?.[0]?.id ?? null
    if (!findingId) {
        // BE idempotent ise duplicatede de id dönsun ?

    }
}
