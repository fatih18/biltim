import { daprManager } from '@monorepo/dapr-manager'
import * as RedisManager from '@monorepo/redis-manager'

const DEFAULT_SESSION_STORE = process.env.AUTH_V2_SESSION_STORE ?? 'statestore-redis'
const SESSION_KEY_PREFIX = process.env.AUTH_V2_SESSION_PREFIX ?? 'session'
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const USE_DAPR_FOR_REDIS = process.env.USE_DAPR_FOR_REDIS === 'true'

export type AuthSessionRecord = {
  sessionId: string
  userId: string
  refreshTokenHash: string
  deviceFingerprint?: string
  ip?: string
  userAgent?: string
  createdAt: string
  lastActiveAt: string
  expiresAt: string
}

function getSessionStoreName() {
  return DEFAULT_SESSION_STORE
}

export function getSessionTtlSeconds(): number {
  const raw = Number(process.env.AUTH_V2_SESSION_TTL_SECONDS ?? DEFAULT_SESSION_TTL_SECONDS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_SECONDS
}

function getSessionKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}:${sessionId}`
}

export async function SaveSession(record: AuthSessionRecord) {
  const key = getSessionKey(record.sessionId)
  const ttl = getSessionTtlSeconds()

  if (USE_DAPR_FOR_REDIS) {
    // Dapr kullan
    const metadata: Record<string, string> = {
      ttlInSeconds: String(ttl),
    }

    await daprManager.state.save(
      [
        {
          key,
          value: record,
          metadata,
        },
      ],
      undefined,
      getSessionStoreName()
    )
  } else {
    // Direkt Redis kullan
    await RedisManager.set(key, record, { ttl })
  }
}

export async function GetSession(sessionId: string) {
  const key = getSessionKey(sessionId)

  if (USE_DAPR_FOR_REDIS) {
    // Dapr kullan
    return await daprManager.state.get<AuthSessionRecord>(key, getSessionStoreName())
  } else {
    // Direkt Redis kullan
    return await RedisManager.get<AuthSessionRecord>(key)
  }
}

export async function DeleteSession(sessionId: string) {
  const key = getSessionKey(sessionId)

  if (USE_DAPR_FOR_REDIS) {
    // Dapr kullan
    await daprManager.state.delete(key, undefined, undefined, getSessionStoreName())
  } else {
    // Direkt Redis kullan
    await RedisManager.del(key)
  }
}

export async function UpdateSession(sessionId: string, updates: Partial<AuthSessionRecord>) {
  const existing = await GetSession(sessionId)
  if (!existing) return undefined

  const updated: AuthSessionRecord = {
    ...existing,
    ...updates,
    lastActiveAt: updates.lastActiveAt ?? new Date().toISOString(),
  }

  await SaveSession(updated)
  return updated
}
