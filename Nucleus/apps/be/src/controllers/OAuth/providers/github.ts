/**
 * GitHub OAuth Provider Configuration
 *
 * Handles GitHub-specific OAuth flow.
 * Docs: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps
 */

import type { OAuthConfig, OAuthProvider, OAuthTokenResponse, OAuthUserProfile } from '../types'

const GITHUB_PROVIDER: OAuthProvider = 'github' as OAuthProvider

export function getGitHubConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  // Use FRONTEND_URL for redirect because frontend proxies /oauth/* to backend
  const redirectUri = `${process.env.FRONTEND_URL}/oauth/github/callback`

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials not configured')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['user:email', 'read:user'],
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
  }
}

export function buildGitHubAuthUrl(state: string): string {
  const config = getGitHubConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    allow_signup: 'true',
  })

  return `${config.authUrl}?${params.toString()}`
}

export async function exchangeGitHubCode(code: string): Promise<OAuthTokenResponse> {
  const config = getGitHubConfig()

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`)
  }

  return await response.json()
}

export async function getGitHubUserProfile(accessToken: string): Promise<OAuthUserProfile> {
  const config = getGitHubConfig()

  // Get user info
  const userResponse = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!userResponse.ok) {
    throw new Error(`GitHub user info fetch failed: ${userResponse.statusText}`)
  }

  const userData = await userResponse.json()

  // Get user emails if email is not public
  let email = userData.email
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json()
      const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)
      email = primaryEmail?.email || emails[0]?.email
    }
  }

  return {
    provider: GITHUB_PROVIDER,
    providerId: String(userData.id),
    email,
    name: userData.name || userData.login,
    avatarUrl: userData.avatar_url,
    profileData: {
      login: userData.login,
      bio: userData.bio,
      company: userData.company,
      location: userData.location,
      blog: userData.blog,
      twitter_username: userData.twitter_username,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
    },
  }
}
