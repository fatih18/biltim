/**
 * OAuth Utility Functions
 *
 * Shared utilities for OAuth flow management
 */

import type { OAuthState } from './types'

export function encodeOAuthState(state: OAuthState): string {
  const stateString = JSON.stringify(state)
  // In production, encrypt this. For now, base64 encode
  return Buffer.from(stateString).toString('base64url')
}

export function decodeOAuthState(stateString: string): OAuthState {
  try {
    const decoded = Buffer.from(stateString, 'base64url').toString('utf-8')
    const state = JSON.parse(decoded) as OAuthState

    // Validate timestamp (state should be used within 10 minutes)
    const tenMinutes = 10 * 60 * 1000
    if (Date.now() - state.timestamp > tenMinutes) {
      throw new Error('OAuth state expired')
    }

    return state
  } catch {
    throw new Error('Invalid OAuth state')
  }
}

export function getFrontendRedirectUrl(returnUrl?: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  // If returnUrl is provided and is a path, append it to baseUrl
  if (returnUrl?.startsWith('/')) {
    return `${baseUrl}${returnUrl}`
  }

  // If returnUrl is a full URL, use it as-is
  if (returnUrl?.startsWith('http')) {
    return returnUrl
  }

  // Default to baseUrl
  return baseUrl
}
