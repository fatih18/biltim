import { fiveSOfflineDb, nowIso, uid, type OutboxRow, type FileRow } from './fiveSOfflineDb'

type UploadedPhotoRef = { file_id: string | null; url: string | null }

type EnqueueAuditArgs = {
    auditClientId?: string
    auditPayload: any // ADD_FIVE_S_AUDIT payload (client_submission_id dahil)
}

type EnqueueFindingArgs = {
    auditClientId: string
    findingClientId?: string
    findingPayload: any // ADD_FIVE_S_FINDING payload (client_finding_id dahil, foto hariç)
    photos: File[] // offline saklanacak
}

/** Audit create outbox */
export async function enqueueAuditCreate(args: EnqueueAuditArgs) {
    const id = uid()
    const auditClientId = args.auditClientId ?? uid()
    const ts = nowIso()

    const row: OutboxRow = {
        id,
        type: 'AUDIT_CREATE',
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: ts,
        updatedAt: ts,
        auditClientId,
        payload: {
            ...args.auditPayload,
            client_submission_id: auditClientId,
        },
    }

    await fiveSOfflineDb.outbox.put(row)
    return { outboxId: id, auditClientId }
}

/** Finding create outbox + file blobs */
export async function enqueueFindingCreate(args: EnqueueFindingArgs) {
    const id = uid()
    const findingClientId = args.findingClientId ?? uid()
    const ts = nowIso()

    const fileIds: string[] = []
    const filesToPut: FileRow[] = (args.photos ?? []).map((f) => {
        const fileId = uid()
        fileIds.push(fileId)
        return {
            id: fileId,
            createdAt: ts,
            name: f.name,
            type: f.type,
            size: f.size,
            lastModified: f.lastModified,
            blob: f, // File is a Blob
        }
    })

    const row: OutboxRow = {
        id,
        type: 'FINDING_CREATE',
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: ts,
        updatedAt: ts,
        auditClientId: args.auditClientId,
        findingClientId,
        payload: {
            ...args.findingPayload,
            client_finding_id: findingClientId,
            __local_file_ids: fileIds, // sync sırasında okunacak
        },
    }

    await fiveSOfflineDb.transaction('rw', fiveSOfflineDb.files, fiveSOfflineDb.outbox, async () => {
        if (filesToPut.length) await fiveSOfflineDb.files.bulkPut(filesToPut)
        await fiveSOfflineDb.outbox.put(row)
    })

    return { outboxId: id, findingClientId, fileIds }
}

/** yardımcı: pending sayısı */
export async function getPendingCount() {
    return await fiveSOfflineDb.outbox.where('status').equals('pending').count()
}
