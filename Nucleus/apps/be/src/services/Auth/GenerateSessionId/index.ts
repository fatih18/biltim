import crypto from 'node:crypto'

export function GenerateSessionId(): string {
  return crypto.randomUUID()
}
