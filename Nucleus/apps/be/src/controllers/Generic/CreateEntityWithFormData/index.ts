import type * as tables from '@monorepo/db-entities/schemas'
import type { FileTypes } from '@monorepo/db-entities/schemas/default/file'
import { CreateFiles } from '@monorepo/generics'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

export async function GenericCreateEntityWithFormData<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Create ${schema.tablename}`,
    endpoint: async function endpoint() {
      const companyInfo = JSON.parse(
        request.request.headers.get('company_info') || '{}'
      ) as CompanyInfo

      let user_id: string | undefined
      try {
        const profile = JSON.parse(request.request.headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub.toString()
      } catch (_) {
        user_id = undefined
      }

      const body = request.body as
        | { files?: File | File[] | FileList; type?: FileTypes }
        | undefined
      const filesInput = body?.files ?? null

      const res = await CreateFiles({
        files: filesInput,
        userId: user_id,
        shared_payload: {
          action_type: 'INSERT',
          ip_address: request.request.headers.get('ip_address') || 'unknown',
          user_agent: request.request.headers.get('user-agent') || 'unknown',
          schema_name: companyInfo.schema_name || 'main',
          user_id: user_id,
        },
        type: body?.type || schema.tablename,
      })

      if (!res.isSuccess) {
        return generateResponse({
          isSuccess: false,
          message: res.message || 'Unknown error',
          data: null,
          status: res.message === 'No files provided' ? 400 : 500,
          request,
        })
      }

      const singular = res.data?.[0]

      return generateResponse({
        isSuccess: true,
        message: `${schema.tablename} created successfully`,
        data: singular,
        status: 200,
        request,
      })
    },
  })
}
