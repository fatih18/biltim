import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../../AuthV2/helpers'

type OneDriveGraphFileFacet = {
  mimeType?: string
}

type OneDriveGraphItemWithDownload = {
  name?: string
  file?: OneDriveGraphFileFacet
  '@microsoft.graph.downloadUrl'?: string
}

type GetAzureDriveFileParams = {
  itemId?: string
}

type GetAzureDriveFileQuery = {
  driveId?: string
}

export async function GetAzureDriveFileDownloadUrl(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth Azure GetDriveFileDownloadUrl',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const params = (req.params || {}) as unknown as GetAzureDriveFileParams
      const query = (req.query || {}) as unknown as GetAzureDriveFileQuery

      const itemId = params.itemId
      const driveId = query.driveId

      if (!itemId) {
        return generateResponse({
          isSuccess: false,
          message: 'Missing itemId',
          errors: 'MissingItemId',
          status: 400,
          request: req,
        })
      }

      const companyInfo = getCompanyInfoFromHeaders(req)
      const profile = getProfileFromHeaders(req)

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
      const path = driveId
        ? `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`
        : `/me/drive/items/${encodeURIComponent(itemId)}`

      const graphResponse = await fetch(`${baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${oauth.access_token}`,
        },
      })

      if (!graphResponse.ok) {
        const errorText = await graphResponse.text()
        console.error('Azure OneDrive file lookup failed:', errorText)
        return generateResponse({
          isSuccess: false,
          message: 'Failed to fetch OneDrive file',
          errors: errorText,
          status: graphResponse.status,
          request: req,
        })
      }

      const json = (await graphResponse.json()) as OneDriveGraphItemWithDownload

      const downloadUrl = json['@microsoft.graph.downloadUrl'] as string | undefined
      if (!downloadUrl) {
        return generateResponse({
          isSuccess: false,
          message: 'Download URL not available for this file',
          errors: 'MissingDownloadUrl',
          status: 500,
          request: req,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: 'OneDrive file download URL fetched',
        data: {
          downloadUrl,
          name: json.name as string | undefined,
          mimeType: json.file?.mimeType as string | undefined,
        },
        status: 200,
        request: req,
      })
    },
  })
}
