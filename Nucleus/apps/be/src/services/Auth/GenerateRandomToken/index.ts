import crypto from 'node:crypto'

/**
 * Generate a cryptographically secure random token
 * Useful for email verification, password reset, etc.
 *
 * @param length - Number of bytes (default: 32, results in 64 hex characters)
 * @returns Hex-encoded random token
 */
export function GenerateRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
