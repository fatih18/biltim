/**
 * OAuth Provider Types and Interfaces
 *
 * This file contains all type definitions for OAuth providers.
 * When adding a new provider, extend the OAuthProvider enum.
 */

export enum OAuthProvider {
  GITHUB = 'github',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  APPLE = 'apple',
}

export type OAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
}

export type OAuthUserProfile = {
  provider: OAuthProvider
  providerId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  profileData: Record<string, unknown>
}

export type OAuthTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

export type OAuthState = {
  returnUrl?: string
  linkToUserId?: string // If linking to existing user
  timestamp: number
}
