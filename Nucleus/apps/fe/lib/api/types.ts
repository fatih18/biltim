import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import { generateGenericEndpoints } from './endpointsRuntime'
import type { AllGenericActionTypes } from './genericTypes'
import type { VorionActionTypes, VorionMCPActionTypes } from './Vorion'
import { VorionEndpoints } from './Vorion'

// #region Extra Types
export type ApiResponse<S, E> = {
  isSuccess?: boolean
  data?: S
  errors?: E | null
  status?: number
  message?: string
}

export type FactoryPayloadValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Blob
  | File
  | ReadonlyArray<FactoryPayloadValue>
  | { [k: string]: FactoryPayloadValue }

// #region Custom (Non-Generic) Endpoints
// Manuel olarak tanımlanan özel endpoint'ler
export enum CustomEndpoints {
  LOGOUT = 'Logout',
  LOGIN = 'Login',
  REGISTER = 'Register',
  GET_ME = 'Get me',
  // AuthV2 Endpoints
  LOGIN_V2 = 'Login V2',
  REGISTER_V2 = 'Register V2',
  REFRESH_V2 = 'Refresh V2',
  LOGOUT_V2 = 'Logout V2',
  GET_ME_V2 = 'Get me V2',
  GENERATE_TENANT_SCHEMAS = 'Generate tenant schemas',
  LIST_SCHEMAS_OF_TENANT = 'List schemas of tenant',
  DROP_SCHEMA = 'Drop schema',
  EXPAND_TENANT_SCHEMA = 'Expand tenant schema',
  GET_TENANT_STATS = 'Get tenant stats',
  UPDATE_TENANT_METADATA = 'Update tenant metadata',
  BACKUP_TENANT = 'Backup tenant',
  RESTORE_TENANT = 'Restore tenant',
  // OAuth Endpoints - GitHub
  GET_GITHUB_AUTH_URL = 'Get GitHub Auth URL',
  UNLINK_GITHUB = 'Unlink GitHub',
  // OAuth Endpoints - Azure
  GET_AZURE_AUTH_URL = 'Get Azure Auth URL',
  UNLINK_AZURE = 'Unlink Azure',
  GET_AZURE_DRIVE_FILES = 'Get Azure Drive Files',
  GET_AZURE_DRIVE_FILE_DOWNLOAD_URL = 'Get Azure Drive File Download Url',
  GET_AZURE_MAIL_MESSAGES = 'Get Azure Mail Messages',
  SEND_AZURE_MAIL = 'Send Azure Mail',
  // OAuth Endpoints - Common
  GET_OAUTH_ACCOUNTS = 'Get OAuth Accounts',
}

type CustomActionTypes = {
  [CustomEndpoints.LOGIN]: {
    payload: { email: string; password: string }
    success: string
    error: string
  }
  [CustomEndpoints.LOGOUT]: {
    payload: undefined
    success: undefined
    error: string
  }
  [CustomEndpoints.REGISTER]: {
    payload: { email: string; password: string }
    success: { id: string; email: string }
    error: string
  }
  [CustomEndpoints.GET_ME]: {
    payload: undefined
    success: UserJSON
    error: string
  }
  // AuthV2 Action Types
  [CustomEndpoints.LOGIN_V2]: {
    payload: { email: string; password: string }
    success: {
      user: { id: string; email: string }
      accessToken: string
      sessionId: string
    }
    error: { email?: string; password?: string; message?: string }
  }
  [CustomEndpoints.REGISTER_V2]: {
    payload: { email: string; password: string }
    success: {
      user: { id: string; email: string }
      accessToken: string
      sessionId: string
    }
    error: { email?: string; password?: string; message?: string }
  }
  [CustomEndpoints.REFRESH_V2]: {
    payload: undefined
    success: {
      accessToken: string
      sessionId: string
    }
    error: {
      token?: string
      session?: string
      device?: string
      message?: string
    }
  }
  [CustomEndpoints.LOGOUT_V2]: {
    payload: undefined
    success: { message: string }
    error: { message?: string }
  }
  [CustomEndpoints.GET_AZURE_MAIL_MESSAGES]: {
    payload:
      | undefined
      | {
          top?: number
          skip?: number
          senderEmail?: string
        }
    success: {
      data: Array<{
        id: string
        conversationId: string
        subject: string
        from: string | null
        fromAddress: string | null
        toRecipients: Array<{ name: string | null; address: string | null }>
        ccRecipients: Array<{ name: string | null; address: string | null }>
        receivedDateTime: string
        isRead: boolean
        bodyPreview: string
        body: string
        hasAttachments: boolean
        attachments: Array<{
          id: string
          name: string
          contentType: string | null
          size: number | null
          isInline: boolean
        }>
        webLink: string
      }>
    }
    error: { message?: string }
  }
  [CustomEndpoints.SEND_AZURE_MAIL]: {
    payload: {
      messageId?: string
      subject: string
      body: string
      to: Array<{ address: string; name?: string | null }>
      cc?: Array<{ address: string; name?: string | null }>
      bcc?: Array<{ address: string; name?: string | null }>
      mode: 'new' | 'reply' | 'replyAll'
      attachments?: Array<{
        name: string
        contentType?: string | null
        contentBase64: string
      }>
    }
    success: { sent: boolean }
    error: { message?: string }
  }
  [CustomEndpoints.GET_ME_V2]: {
    payload: undefined
    success: UserJSON
    error: { message?: string }
  }
  [CustomEndpoints.GENERATE_TENANT_SCHEMAS]: {
    payload: {
      schema_name: string
      godmin_email: string
      godmin_password: string
      company_name: string
      subdomain: string
      tax_id: string
      w9: File | string
    }
    success: {
      isSuccess: boolean
      message: string
    }
    error: string
  }
  [CustomEndpoints.LIST_SCHEMAS_OF_TENANT]: {
    payload: {
      _schemaName: string
    }
    success: {
      schema: {
        schema_name: string
        schema_owner: string
      }
      tables: {
        table_name: string
        table_type: string
        column_count: number
      }[]
      indexes: {
        schemaname: string
        tablename: string
        indexname: string
        indexdef: string
      }[]
      foreignKeys: {
        table_name: string
        column_name: string
        foreign_table_name: string
        foreign_column_name: string
        constraint_name: string
      }[]
      summary: {
        tableCount: number
        indexCount: number
        foreignKeyCount: number
      }
    }
    error: string
  }
  [CustomEndpoints.DROP_SCHEMA]: {
    payload: {
      _schemaName: string
    }
    success: {
      schemaName: string
      tablesDropped: number
    }
    error: string
  }
  [CustomEndpoints.EXPAND_TENANT_SCHEMA]: {
    payload: {
      _schemaName: string
    }
    success: {
      schemaName: string
      changes: {
        tablesCreated: string[]
        columnsAdded: string[]
        columnsDropped: string[]
      }
    }
    error: string
  }
  [CustomEndpoints.GET_TENANT_STATS]: {
    payload: {
      _schemaName: string
    }
    success: {
      schemaName: string
      tables: {
        count: number
        details: Array<{
          table_name: string
          column_count: number
        }>
      }
      entityCounts: Record<string, number>
      indexes: { count: number }
      foreignKeys: { count: number }
      storage: {
        totalBytes: number
        totalMB: string
      }
      summary: {
        totalTables: number
        totalRecords: number
        totalIndexes: number
        totalForeignKeys: number
      }
      adminProfile?: {
        firstName: string | null
        lastName: string | null
        email: string | null
      }
    }
    error: string
  }
  [CustomEndpoints.UPDATE_TENANT_METADATA]: {
    payload: {
      _tenantId: string
      subdomain?: string
      is_active?: boolean
      company_name?: string
      god_admin_email?: string
      god_admin_password?: string
      god_admin_first_name?: string
      god_admin_last_name?: string
    }
    success: {
      id: string
      subdomain: string
      schema_name: string
      company_id: string
      is_active: boolean
      created_at: string
      updated_at: string
    }
    error: string
  }
  [CustomEndpoints.BACKUP_TENANT]: {
    payload: {
      _schemaName: string
    }
    success: {
      schemaName: string
      tables: Array<{
        tableName: string
        rowCount: number
        data: Record<string, unknown>[]
      }>
      metadata: {
        createdAt: string
        version: string
        totalTables: number
        totalRows: number
      }
    }
    error: string
  }
  [CustomEndpoints.RESTORE_TENANT]: {
    payload: {
      _schemaName: string
      backup: {
        schemaName: string
        tables: Array<{
          tableName: string
          rowCount: number
          data: Record<string, unknown>[]
        }>
        metadata: {
          createdAt: string
          version: string
          totalTables: number
          totalRows: number
        }
      }
      mode: 'merge' | 'replace'
    }
    success: {
      schemaName: string
      tablesRestored: number
      rowsRestored: number
      skippedTables: string[]
    }
    error: string
  }
  [CustomEndpoints.GET_GITHUB_AUTH_URL]: {
    payload: {
      returnUrl?: string
      linkToUserId?: string
    }
    success: {
      authUrl: string
      state: string
    }
    error: { message?: string }
  }
  [CustomEndpoints.UNLINK_GITHUB]: {
    payload: undefined
    success: { unlinked: boolean }
    error: { message?: string }
  }
  [CustomEndpoints.GET_AZURE_AUTH_URL]: {
    payload: {
      returnUrl?: string
      linkToUserId?: string
    }
    success: {
      authUrl: string
      state: string
    }
    error: { message?: string }
  }
  [CustomEndpoints.UNLINK_AZURE]: {
    payload: undefined
    success: { unlinked: boolean }
    error: { message?: string }
  }
  [CustomEndpoints.GET_AZURE_DRIVE_FILES]: {
    payload:
      | undefined
      | {
          parentId?: string
        }
    success: {
      data: Array<{
        id: string
        name: string
        size: number
        webUrl: string
        lastModifiedDateTime: string
        createdBy: string | null
        creatorId: string | null
        mimeType: string | null
        driveId: string | null
        graphId: string
      }>
    }
    error: { message?: string }
  }
  [CustomEndpoints.GET_AZURE_DRIVE_FILE_DOWNLOAD_URL]: {
    payload: {
      _itemId: string
      driveId?: string
    }
    success: {
      downloadUrl: string
      name?: string
      mimeType?: string
    }
    error: { message?: string }
  }
  [CustomEndpoints.GET_OAUTH_ACCOUNTS]: {
    payload: undefined // No payload - uses authenticated user
    success: {
      data: Array<{
        id: string
        provider: string
        provider_email: string | null
        created_at: string
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
    error: { message?: string }
  }
}

// #endregion

// #region Merged Endpoints & ActionTypes
import type { EndpointsKeyMap } from './endpointKeys'

// Runtime'da endpoint objesi oluştur
const { endpoints: genericEndpoints } = generateGenericEndpoints()

// Generic ve custom endpoint'leri birleştir - compile-time type ile IntelliSense çalışır
export const Endpoints: typeof CustomEndpoints & EndpointsKeyMap & typeof VorionEndpoints = {
  ...CustomEndpoints,
  ...(genericEndpoints as EndpointsKeyMap),
  ...VorionEndpoints,
}

// Endpoints tip tanımı - compile-time type'dan otomatik çıkarım
export type Endpoints = (typeof Endpoints)[keyof typeof Endpoints]

// ActionTypes - endpoint string'i key olarak kullanarak tip mapping yapar
export type ActionTypes = AllGenericActionTypes &
  CustomActionTypes &
  VorionActionTypes &
  VorionMCPActionTypes
// #endregion
