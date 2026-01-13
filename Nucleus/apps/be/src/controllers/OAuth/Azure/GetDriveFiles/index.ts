import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../../AuthV2/helpers'

type OneDriveGraphUser = {
  id?: string
  displayName?: string
}

type OneDriveGraphFileFacet = {
  mimeType?: string
}

type OneDriveGraphFolderFacet = unknown

type OneDriveGraphParentReference = {
  driveId?: string
}

type OneDriveGraphRemoteItem = {
  id?: string
  file?: OneDriveGraphFileFacet
  folder?: OneDriveGraphFolderFacet
  shared?: {
    sharedBy?: {
      user?: OneDriveGraphUser
    }
  }
  parentReference?: OneDriveGraphParentReference
}

type OneDriveGraphCreatedBy = {
  user?: OneDriveGraphUser
}

type OneDriveGraphItem = {
  id?: string
  name?: string
  size?: number
  webUrl?: string
  lastModifiedDateTime?: string
  parentReference?: OneDriveGraphParentReference
  remoteItem?: OneDriveGraphRemoteItem
  file?: OneDriveGraphFileFacet
  folder?: OneDriveGraphFolderFacet
  createdBy?: OneDriveGraphCreatedBy
}

export async function GetAzureDriveFiles(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth Azure GetDriveFiles',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const companyInfo = getCompanyInfoFromHeaders(req)
      const profile = getProfileFromHeaders(req)

      const query = (req.query || {}) as { parentId?: string }
      const parentId = query.parentId

      if (!profile?.sub) {
        return generateResponse({
          isSuccess: false,
          message: 'Authentication required',
          errors: 'User not authenticated',
          status: 401,
          request: req,
        })
      }

      const userId = String(profile.sub)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      const [oauth] = await tenantDB
        .select()
        .from(T_UserOAuthProviders)
        .where(
          and(
            eq(T_UserOAuthProviders.user_id, userId),
            eq(T_UserOAuthProviders.provider, 'azure'),
            eq(T_UserOAuthProviders.is_active, true)
          )
        )
        .orderBy(T_UserOAuthProviders.created_at)
        .limit(1)

      if (!oauth || !oauth.access_token) {
        return generateResponse({
          isSuccess: false,
          message: 'No active Azure account linked',
          errors: 'NoAzureAccount',
          status: 400,
          request: req,
        })
      }

      const baseUrl = 'https://graph.microsoft.com/v1.0'

      type GraphListResponse = { value?: OneDriveGraphItem[] }

      let allItems: OneDriveGraphItem[] = []

      if (parentId && parentId.trim().length > 0) {
        const childrenResponse = await fetch(
          `${baseUrl}/me/drive/items/${encodeURIComponent(parentId)}/children?$top=50`,
          {
            headers: {
              Authorization: `Bearer ${oauth.access_token}`,
            },
          }
        )

        if (!childrenResponse.ok) {
          const errorText = await childrenResponse.text().catch(() => '')
          console.error('Azure OneDrive folder listing failed:', {
            status: childrenResponse.status,
            errorText,
          })
          return generateResponse({
            isSuccess: false,
            message: 'Failed to fetch OneDrive folder contents',
            errors: errorText,
            status: childrenResponse.status || 500,
            request: req,
          })
        }

        const json = (await childrenResponse.json()) as GraphListResponse
        allItems = json.value ?? []
      } else {
        const [rootResponse, sharedResponse] = await Promise.all([
          fetch(`${baseUrl}/me/drive/root/children?$top=50`, {
            headers: {
              Authorization: `Bearer ${oauth.access_token}`,
            },
          }),
          fetch(`${baseUrl}/me/drive/sharedWithMe`, {
            headers: {
              Authorization: `Bearer ${oauth.access_token}`,
            },
          }),
        ])

        if (!rootResponse.ok && !sharedResponse.ok) {
          const rootError = await rootResponse.text().catch(() => '')
          const sharedError = await sharedResponse.text().catch(() => '')
          console.error('Azure OneDrive list failed:', {
            rootStatus: rootResponse.status,
            rootError,
            sharedStatus: sharedResponse.status,
            sharedError,
          })
          return generateResponse({
            isSuccess: false,
            message: 'Failed to fetch OneDrive files',
            errors: rootError || sharedError,
            status: rootResponse.status || sharedResponse.status || 500,
            request: req,
          })
        }

        let rootItems: OneDriveGraphItem[] = []
        let sharedItems: OneDriveGraphItem[] = []

        if (rootResponse.ok) {
          const json = (await rootResponse.json()) as GraphListResponse
          rootItems = json.value ?? []
        } else {
          const rootError = await rootResponse.text().catch(() => '')
          console.warn('Azure OneDrive root listing failed, continuing with shared items only:', {
            status: rootResponse.status,
            rootError,
          })
        }

        if (sharedResponse.ok) {
          const json = (await sharedResponse.json()) as GraphListResponse
          sharedItems = json.value ?? []
        } else {
          const sharedError = await sharedResponse.text().catch(() => '')
          console.warn(
            'Azure OneDrive sharedWithMe listing failed, continuing with root items only:',
            {
              status: sharedResponse.status,
              sharedError,
            }
          )
        }

        allItems = [...rootItems, ...sharedItems]
      }

      const filesMap = new Map<
        string,
        {
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
        }
      >()

      for (const item of allItems) {
        const fileFacet = item.file ?? item.remoteItem?.file
        const folderFacet = item.folder ?? item.remoteItem?.folder
        if (!fileFacet && !folderFacet) {
          continue
        }
        if (!item.id) {
          continue
        }

        const sharedUser = item.remoteItem?.shared?.sharedBy?.user
        const createdUser = item.createdBy?.user
        const user = sharedUser ?? createdUser

        const remoteParent = item.remoteItem?.parentReference
        const directParent = item.parentReference
        const driveId = remoteParent?.driveId ?? directParent?.driveId ?? null

        const remoteId = item.remoteItem?.id
        const graphId = String(remoteId ?? item.id)

        const key = String(item.id)
        filesMap.set(key, {
          id: key,
          name: String(item.name ?? ''),
          size: Number(item.size ?? 0),
          webUrl: String(item.webUrl ?? ''),
          lastModifiedDateTime: String(item.lastModifiedDateTime ?? ''),
          createdBy: user?.displayName ?? null,
          creatorId: user?.id ?? null,
          mimeType: fileFacet?.mimeType ?? null,
          driveId,
          graphId,
        })
      }

      const files = Array.from(filesMap.values())

      return generateResponse({
        isSuccess: true,
        message: 'OneDrive files fetched',
        data: {
          data: files,
        },
        status: 200,
        request: req,
      })
    },
  })
}
