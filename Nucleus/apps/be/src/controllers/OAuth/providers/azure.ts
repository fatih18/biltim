/**
 * Azure OAuth Configuration
 *
 * Handles Microsoft Azure AD OAuth flow configuration and token exchange
 */

export function getAzureConfig() {
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const frontendUrl = process.env.FRONTEND_URL
  const tenantId = process.env.AZURE_TENANT_ID || 'common' // Use tenant-specific or common (multi-tenant)

  if (!clientId || !clientSecret || !frontendUrl) {
    throw new Error(
      'Azure OAuth not configured: Missing AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, or FRONTEND_URL'
    )
  }

  // Frontend will proxy /oauth/azure/callback to backend
  const redirectUri = `${frontendUrl}/oauth/azure/callback`

  return {
    clientId,
    clientSecret,
    redirectUri,
    authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read Files.Read.All Mail.Read Mail.Send offline_access',
  }
}

/**
 * Build Azure OAuth authorization URL
 */
export function buildAzureAuthUrl(state: string): string {
  const config = getAzureConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    response_mode: 'query',
  })

  return `${config.authUrl}?${params.toString()}`
}

/**
 * Exchange Azure authorization code for access token
 */
export async function exchangeAzureCode(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
}> {
  const config = getAzureConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Azure token exchange failed:', errorText)
    throw new Error(`Azure token exchange failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get Azure user profile information
 */
export async function getAzureUserProfile(accessToken: string): Promise<{
  providerId: string
  email: string
  name?: string
  profileData: unknown
}> {
  const config = getAzureConfig()

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Azure user profile fetch failed:', errorText)
    throw new Error(`Azure user profile fetch failed: ${response.statusText}`)
  }

  const profile = await response.json()

  return {
    providerId: profile.id,
    email: profile.mail || profile.userPrincipalName,
    name: profile.displayName,
    profileData: profile,
  }
}
