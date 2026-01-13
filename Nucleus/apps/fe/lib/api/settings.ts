/**
 * API Route Settings
 */

import { generateGenericEndpoints } from './endpointsRuntime'
import { CustomEndpoints } from './types'
import { vorionSettings } from './Vorion'

// Generic settings'leri al
const { settings: genericSettings } = generateGenericEndpoints()

// Custom (non-generic) settings - sadece özel endpoint'ler
const customSettings = {
  [CustomEndpoints.LOGIN]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/auth/login',
  },
  [CustomEndpoints.REGISTER]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/auth/register',
  },
  [CustomEndpoints.LOGOUT]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/auth/logout',
  },
  [CustomEndpoints.GET_ME]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/auth/me',
  },
  // AuthV2 Settings
  [CustomEndpoints.LOGIN_V2]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/v2/auth/login',
  },
  [CustomEndpoints.REGISTER_V2]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/v2/auth/register',
  },
  [CustomEndpoints.REFRESH_V2]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/v2/auth/refresh',
  },
  [CustomEndpoints.LOGOUT_V2]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/v2/auth/logout',
  },
  [CustomEndpoints.GET_ME_V2]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/v2/auth/me',
  },
  [CustomEndpoints.GENERATE_TENANT_SCHEMAS]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {},
    payload_mode: 'form-data',
    path: '/initiate',
  },
  [CustomEndpoints.LIST_SCHEMAS_OF_TENANT]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/initiate/:schemaName',
  },
  [CustomEndpoints.DROP_SCHEMA]: {
    method: 'DELETE',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/initiate/:schemaName',
  },
  [CustomEndpoints.EXPAND_TENANT_SCHEMA]: {
    method: 'PUT',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/initiate/:schemaName/expand',
  },
  [CustomEndpoints.GET_TENANT_STATS]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/initiate/:schemaName/stats',
  },
  [CustomEndpoints.UPDATE_TENANT_METADATA]: {
    method: 'PATCH',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/initiate/tenant/:tenantId',
  },
  [CustomEndpoints.BACKUP_TENANT]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/initiate/:schemaName/backup',
  },
  [CustomEndpoints.RESTORE_TENANT]: {
    method: 'POST',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/initiate/:schemaName/restore',
  },
  // OAuth Settings
  [CustomEndpoints.GET_GITHUB_AUTH_URL]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'query',
    path: '/oauth/github/auth-url',
  },
  [CustomEndpoints.UNLINK_GITHUB]: {
    method: 'DELETE',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/oauth/github/unlink',
  },
  [CustomEndpoints.GET_AZURE_AUTH_URL]: {
    method: 'GET',
    checkAuthCookie: false,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'query',
    path: '/oauth/azure/auth-url',
  },
  [CustomEndpoints.UNLINK_AZURE]: {
    method: 'DELETE',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none',
    path: '/oauth/azure/unlink',
  },
  [CustomEndpoints.GET_AZURE_DRIVE_FILES]: {
    method: 'GET',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'query',
    path: '/oauth/azure/drive/files',
  },
  [CustomEndpoints.GET_AZURE_DRIVE_FILE_DOWNLOAD_URL]: {
    method: 'GET',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'query',
    path: '/oauth/azure/drive/items/:itemId/download-url',
  },
  [CustomEndpoints.GET_AZURE_MAIL_MESSAGES]: {
    method: 'GET',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'query',
    path: '/oauth/azure/mail/messages',
  },
  [CustomEndpoints.SEND_AZURE_MAIL]: {
    method: 'POST',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'body',
    path: '/oauth/azure/mail/send',
  },
  [CustomEndpoints.GET_OAUTH_ACCOUNTS]: {
    method: 'GET',
    checkAuthCookie: true,
    headers: {
      'Content-Type': 'application/json',
    },
    payload_mode: 'none', // No payload needed - uses authenticated user
    path: '/oauth/me/accounts',
  },
} as const

// Route settings type
export type RouteSetting = {
  method: string
  checkAuthCookie: boolean
  headers: Record<string, string>
  payload_mode: 'query' | 'body' | 'form-data' | 'none'
  path: string
}

// Generic ve custom settings'leri birleştir
export const settings: Record<string, RouteSetting> = {
  ...genericSettings,
  ...customSettings,
  ...vorionSettings,
}
