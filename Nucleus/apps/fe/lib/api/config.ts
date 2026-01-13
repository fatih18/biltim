/**
 * API Configuration for Nucleus
 */

import type { NucleusApiConfig } from '@hidayetcanozcan/nucleus-generic-api-caller'
import { settings } from './settings'
import { CustomEndpoints } from './types'

// Custom endpoints that affect auth flow
const LOGIN_ENDPOINTS = [
  CustomEndpoints.LOGIN,
  CustomEndpoints.LOGIN_V2,
  CustomEndpoints.REGISTER_V2,
]

const REFRESH_EXCLUDED = [
  CustomEndpoints.LOGIN,
  CustomEndpoints.LOGIN_V2,
  CustomEndpoints.REGISTER_V2,
  CustomEndpoints.REFRESH_V2,
  CustomEndpoints.LOGOUT_V2,
]

export const apiConfig: NucleusApiConfig = {
  baseUrl: process.env.AUTH_API_URL || '',
  alternateBaseUrl: process.env.VORION_API_URL || 'https://api.48-195-173-46.nip.io',
  shouldUseAlternateUrl: (endpoint: string) => endpoint.startsWith('Vorion: '),
  settings,
  authCookieName: 'nucleus_access_token',
  refreshCookieName: 'nucleus_refresh_token',
  refreshEndpoint: '/v2/auth/refresh',
  refreshExcludedEndpoints: REFRESH_EXCLUDED,
  authCreationEndpoints: LOGIN_ENDPOINTS,
  cookieSettingEndpoints: LOGIN_ENDPOINTS,
  logoutEndpoint: CustomEndpoints.LOGOUT_V2,
  enableBypassHeader: process.env.BYPASS_IDENTITY_MIDDLEWARE === 'true',
  debug: false,
}
