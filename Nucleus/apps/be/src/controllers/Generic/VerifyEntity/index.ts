import type * as tables from '@monorepo/db-entities/schemas'
import { GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

export async function GenericVerifyEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Update ${schema.tablename}`,
    endpoint: async function endpoint() {
      const headers = request.request.headers
      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo

      let user_id: string | undefined
      try {
        const profile = JSON.parse(headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub.toString()
      } catch (_) {
        user_id = undefined
      }

      const entity = await GenericAction({
        schema_name: companyInfo.schema_name || 'main',
        table_name:
          `T_${schema.tablename.charAt(0).toUpperCase() + schema.tablename.slice(1)}` as EntityName,
        action_type: 'VERIFICATION',
        user_id,
        ip_address: headers.get('ip_address') || 'unknown',
        user_agent: headers.get('user-agent') || 'unknown',
        id: request.params.id,
      })

      const singular = entity?.[0]

      if (!singular) {
        return generateResponse({
          isSuccess: false,
          message: `${schema.tablename} not found`,
          data: null,
          status: 404,
          request,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: `${schema.tablename} verified successfully`,
        data: singular,
        status: 200,
        request,
      })
    },
  })
}
