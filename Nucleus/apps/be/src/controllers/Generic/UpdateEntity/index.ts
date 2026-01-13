import type * as tables from '@monorepo/db-entities/schemas'
import { type EntityInsertType, GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { resolveSchemaEntityKey, withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'
import { convertDates } from '@/utils/ConvertDates'

export async function GenericUpdateEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Update ${schema.tablename}`,
    endpoint: async function endpoint() {
      const body = request.body as Partial<EntityInsertType<EntityName>>
      const headers = request.request.headers

      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo

      let user_id: string | undefined
      try {
        const profile = JSON.parse(headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub.toString()
      } catch (_) {
        user_id = undefined
      }

      const entityKey = resolveSchemaEntityKey(schema)

      const entity = await GenericAction({
        schema_name: companyInfo.schema_name || 'main',
        table_name: entityKey as EntityName,
        action_type: 'UPDATE',
        data: convertDates(body),
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
        message: `${schema.tablename} updated successfully`,
        data: singular,
        status: 200,
        request,
      })
    },
  })
}
