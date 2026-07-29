import type * as tables from '@monorepo/db-entities/schemas'
import { HybridGenericSearch } from '@monorepo/generics'
import { parseFiltersFromQuery, withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import {
  getUserRoleNames,
  hasAnyRole,
  isGodAdmin,
  PRIVILEGED_ROLES,
} from '@/services/Authorization'
import { generateResponse } from '@/utils'

export async function GenericGetEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Get ${schema.tablename}`,
    endpoint: async function endpoint() {
      let filters = parseFiltersFromQuery(request.query)

      const companyInfo = JSON.parse(
        request.request.headers.get('company_info') || '{}'
      ) as CompanyInfo

      // 5S bulguları: Saha Sorumlusu sadece kendi sorumlu olduğu bulguları,
      // Denetçi sadece kendi açtığı bulguları görebilir.
      if (schema.tablename === 'five_s_findings') {
        let user_id = ''
        try {
          const profile = JSON.parse(
            request.request.headers.get('profile') || '{}'
          ) as TokenPayload
          user_id = profile.sub?.toString() ?? ''
        } catch (_) {
          user_id = ''
        }

        if (user_id) {
          const schemaName = companyInfo.schema_name || 'main'
          const [roleNames, isGod] = await Promise.all([
            getUserRoleNames({ userId: user_id, schemaName }),
            isGodAdmin({ userId: user_id, schemaName }),
          ])

          const isPrivileged = isGod || hasAnyRole(roleNames, PRIVILEGED_ROLES)

          if (!isPrivileged) {
            const isFieldManager = roleNames.includes('field manager')
            const isAuditor = roleNames.includes('auditor')

            if (isFieldManager) {
              filters = { ...(filters ?? {}), responsible_user_id: user_id }
            } else if (isAuditor) {
              filters = { ...(filters ?? {}), auditor_user_id: user_id }
            }
          }
        }
      }

      const res = await HybridGenericSearch({
        schema_name: companyInfo.schema_name || 'main',
        config: schema.SearchConfig,
        params: {
          page: Number(request.query.page) || 1,
          limit: Number(request.query.limit) || 10,
          search: request.query.search,
          orderBy: request.query.orderBy,
          orderDirection: request.query.orderDirection as 'asc' | 'desc' | undefined,
          filters,
          includeRelations: true,
        },
      })

      return generateResponse({
        isSuccess: true,
        message: `${schema.tablename} retrieved successfully`,
        data: res,
        status: 200,
        request,
      })
    },
  })
}
