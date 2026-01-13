import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../../AuthV2/helpers'

type GraphEmailAddress = {
  address?: string
  name?: string
}

type GraphRecipient = {
  emailAddress?: GraphEmailAddress
}

type GraphItemBody = {
  contentType?: string
  content?: string
}

type GraphAttachment = {
  id?: string
  name?: string
  contentType?: string
  size?: number
  isInline?: boolean
  contentId?: string
}

type GraphMessage = {
  id?: string
  conversationId?: string
  subject?: string
  from?: GraphRecipient
  toRecipients?: GraphRecipient[]
  ccRecipients?: GraphRecipient[]
  receivedDateTime?: string
  isRead?: boolean
  bodyPreview?: string
  body?: GraphItemBody
  webLink?: string
  hasAttachments?: boolean
  attachments?: GraphAttachment[]
}

type GraphListResponse = {
  value?: GraphMessage[]
}

export async function GetAzureMailMessages(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth Azure GetMailMessages',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
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

      const query = req.query as { top?: string; skip?: string; senderEmail?: string } | undefined

      const topParam = query?.top
      const top =
        Number.isFinite(Number(topParam)) && Number(topParam) > 0 && Number(topParam) <= 100
          ? Number(topParam)
          : 25

      const skipParam = query?.skip
      const skip =
        Number.isFinite(Number(skipParam)) && Number(skipParam) >= 0 ? Number(skipParam) : 0

      const senderEmail = query?.senderEmail?.toLowerCase().trim()

      const selectFields = [
        'id',
        'conversationId',
        'subject',
        'from',
        'toRecipients',
        'ccRecipients',
        'receivedDateTime',
        'isRead',
        'bodyPreview',
        'body',
        'hasAttachments',
        'webLink',
      ].join(',')

      // Build URL - Graph API doesn't support $filter with $orderby on mail
      // So we only use $orderby when there's no filter, otherwise sort in code
      let url = `${baseUrl}/me/mailFolders/Inbox/messages?$top=${top}&$skip=${skip}&$select=${encodeURIComponent(
        selectFields
      )}`

      // Expand attachments with basic metadata only (no content bytes)
      // NOTE: contentId is not a selectable property on the base attachment type in v1.0,
      // so we only select safe fields here to avoid BadRequest errors.
      url += '&$expand=attachments($select=id,name,contentType,size,isInline)'

      if (senderEmail) {
        // With filter: no $orderby (Graph API limitation)
        const filterExpr = `from/emailAddress/address eq '${senderEmail}'`
        url += `&$filter=${encodeURIComponent(filterExpr)}`
      } else {
        // Without filter: use $orderby
        url += '&$orderby=receivedDateTime desc'
      }

      const graphResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${oauth.access_token}`,
        },
      })

      if (!graphResponse.ok) {
        const errorText = await graphResponse.text().catch(() => '')
        console.error('Azure Outlook messages lookup failed:', {
          status: graphResponse.status,
          errorText,
        })
        return generateResponse({
          isSuccess: false,
          message: 'Failed to fetch Outlook messages',
          errors: errorText,
          status: graphResponse.status || 500,
          request: req,
        })
      }

      const json = (await graphResponse.json()) as GraphListResponse
      const value = json.value ?? []

      const messages = value.map((msg) => {
        const from = msg.from?.emailAddress
        const fromName = from?.name ?? null
        const fromAddress = from?.address ?? null

        // Extract all participants (to + cc)
        const toList = (msg.toRecipients ?? []).map((r) => ({
          name: r.emailAddress?.name ?? null,
          address: r.emailAddress?.address ?? null,
        }))
        const ccList = (msg.ccRecipients ?? []).map((r) => ({
          name: r.emailAddress?.name ?? null,
          address: r.emailAddress?.address ?? null,
        }))

        // Convert HTML body to plain text for full message view
        const rawBody = msg.body?.content ?? ''
        let plainBody = rawBody

        if (rawBody) {
          const isHtml = (msg.body?.contentType ?? '').toLowerCase() === 'html'

          if (isHtml) {
            // Very lightweight HTML → text conversion
            plainBody = rawBody
              // Line breaks
              .replace(/<br\s*\/?>(?=\s*<)/gi, '<br/>')
              .replace(/<br\s*\/?>(?!\n)/gi, '<br/>\n')
              .replace(/<\/(p|div|li|h[1-6])>/gi, '</$1>\n')
              // Remove style/script/head sections entirely
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<head[\s\S]*?<\/head>/gi, '')
              // Strip all remaining tags
              .replace(/<[^>]+>/g, '')
              // Decode a few common entities
              .replace(/&nbsp;/gi, ' ')
              .replace(/&amp;/gi, '&')
              .replace(/&lt;/gi, '<')
              .replace(/&gt;/gi, '>')
              .replace(/&quot;/gi, '"')
              .replace(/&#39;/gi, "'")
          }

          // Normalize whitespace
          plainBody = plainBody
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map((line) => line.replace(/\s+$/g, ''))
            .join('\n')
            .trim()
        }

        const attachments = (msg.attachments ?? []).map((att) => ({
          id: String(att.id ?? ''),
          name: att.name ?? '',
          contentType: att.contentType ?? null,
          size: typeof att.size === 'number' ? att.size : null,
          isInline: Boolean(att.isInline),
          contentId: att.contentId ?? null,
        }))

        return {
          id: String(msg.id ?? ''),
          conversationId: String(msg.conversationId ?? ''),
          subject: String(msg.subject ?? ''),
          from: fromName ?? fromAddress,
          fromAddress,
          toRecipients: toList,
          ccRecipients: ccList,
          receivedDateTime: String(msg.receivedDateTime ?? ''),
          isRead: Boolean(msg.isRead),
          bodyPreview: String(msg.bodyPreview ?? ''),
          body: plainBody,
          hasAttachments: Boolean(msg.hasAttachments) || attachments.length > 0,
          attachments,
          webLink: String(msg.webLink ?? ''),
        }
      })

      return generateResponse({
        isSuccess: true,
        message: 'Outlook messages fetched',
        data: {
          data: messages,
        },
        status: 200,
        request: req,
      })
    },
  })
}
