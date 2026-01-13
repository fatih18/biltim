import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../../AuthV2/helpers'

type Recipient = {
  address: string
  name?: string | null
}

type Attachment = {
  name: string
  contentType?: string | null
  contentBase64: string
}

type SendMailPayload = {
  messageId?: string
  subject: string
  body: string
  to: Recipient[]
  cc?: Recipient[]
  bcc?: Recipient[]
  mode: 'new' | 'reply' | 'replyAll'
  attachments?: Attachment[]
}

export async function SendAzureMail(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth Azure SendMail',
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

      const payload = req.body as SendMailPayload

      if (!payload || !payload.to || payload.to.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'At least one recipient is required',
          errors: 'NoRecipients',
          status: 400,
          request: req,
        })
      }

      if (!payload.body) {
        return generateResponse({
          isSuccess: false,
          message: 'Message body is required',
          errors: 'NoBody',
          status: 400,
          request: req,
        })
      }

      const baseUrl = 'https://graph.microsoft.com/v1.0'

      // Build Graph API message object
      const toRecipients = payload.to.map((r) => ({
        emailAddress: {
          address: r.address,
          name: r.name || undefined,
        },
      }))

      const ccRecipients = (payload.cc || []).map((r) => ({
        emailAddress: {
          address: r.address,
          name: r.name || undefined,
        },
      }))

      const bccRecipients = (payload.bcc || []).map((r) => ({
        emailAddress: {
          address: r.address,
          name: r.name || undefined,
        },
      }))

      const attachments = (payload.attachments || []).map((att) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name,
        contentType: att.contentType || 'application/octet-stream',
        contentBytes: att.contentBase64,
      }))

      const message = {
        subject: payload.subject || '',
        body: {
          contentType: 'Text',
          content: payload.body,
        },
        toRecipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
        bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      }

      // Send the email
      const graphResponse = await fetch(`${baseUrl}/me/sendMail`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!graphResponse.ok) {
        const errorText = await graphResponse.text().catch(() => '')
        console.error('Azure SendMail failed:', {
          status: graphResponse.status,
          errorText,
        })
        return generateResponse({
          isSuccess: false,
          message: 'Failed to send email',
          errors: errorText,
          status: graphResponse.status || 500,
          request: req,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: 'Email sent successfully',
        data: { sent: true },
        status: 200,
        request: req,
      })
    },
  })
}
