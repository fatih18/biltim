import Dexie, { type Table } from 'dexie'

export type OutboxStatus = 'pending' | 'syncing' | 'done' | 'error'

export type OutboxType = 'AUDIT_CREATE' | 'FINDING_CREATE'

export type OutboxRow = {
    id: string // local outbox id
    type: OutboxType
    status: OutboxStatus
    attempts: number
    lastError?: string | null
    createdAt: string
    updatedAt: string

    // linkage
    auditClientId?: string // for both
    findingClientId?: string // for finding

    // payloads
    payload: any
}

export type FileRow = {
    id: string // local file id
    createdAt: string
    name: string
    type: string
    size: number
    lastModified: number
    blob: Blob
}

export type AuditMapRow = {
    auditClientId: string
    serverAuditId: string
    updatedAt: string
}

class FiveSOfflineDB extends Dexie {
    outbox!: Table<OutboxRow, string>
    files!: Table<FileRow, string>
    audit_map!: Table<AuditMapRow, string>

    constructor() {
        super('five_s_offline_db')

        this.version(1).stores({
            outbox: 'id, type, status, createdAt, auditClientId, findingClientId',
            files: 'id, createdAt',
            audit_map: 'auditClientId',
        })
    }
}

export const fiveSOfflineDb = new FiveSOfflineDB()

export function nowIso() {
    return new Date().toISOString()
}

export function uid() {
    return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`) as string
}
