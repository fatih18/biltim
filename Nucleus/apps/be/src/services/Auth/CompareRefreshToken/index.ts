import { HashRefreshToken } from '../HashRefreshToken'

export function CompareRefreshToken(plainToken: string, hashedToken: string): boolean {
  const computedHash = HashRefreshToken(plainToken)
  return computedHash === hashedToken
}
