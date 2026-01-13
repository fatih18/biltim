import type * as tables from '@monorepo/db-entities/schemas'
import { HybridGenericSearch } from '@monorepo/generics'
import { parseFiltersFromQuery, withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

export async function GenericGetEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Get ${schema.tablename}`,
    endpoint: async function endpoint() {
      const filters = parseFiltersFromQuery(request.query)

      const companyInfo = JSON.parse(
        request.request.headers.get('company_info') || '{}'
      ) as CompanyInfo

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
