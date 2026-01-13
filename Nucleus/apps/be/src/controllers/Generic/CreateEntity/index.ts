/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import type * as tables from '@monorepo/db-entities/schemas'
import { type EntityInsertType, GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { resolveSchemaEntityKey, withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'
import { convertDates } from '@/utils/ConvertDates'

/**
 * Offline idempotency:
 * - same client_submission_id => return existing audit (no error)
 * - same client_finding_id    => return existing finding (no error)
 */
const IDEMPOTENCY_BY_TABLENAME: Record<
  string,
  { key: 'client_submission_id' | 'client_finding_id' }
> = {
  five_s_audits: { key: 'client_submission_id' },
  five_s_findings: { key: 'client_finding_id' },
}

function getIdempotencyKey(tablename: string) {
  return IDEMPOTENCY_BY_TABLENAME[tablename]?.key ?? null
}

function isUniqueViolation(err: any) {
  const code = err?.code ?? err?.cause?.code
  if (code === '23505') return true

  const msg = String(err?.message ?? err?.cause?.message ?? '').toLowerCase()
  return msg.includes('duplicate key') || msg.includes('unique') || msg.includes('23505')
}

export async function GenericCreateEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,

    operationName: `Create ${schema.tablename}`,

    endpoint: async function endpoint(req: ElysiaRequestWOBody) {
      const companyInfo = JSON.parse(
        req.request.headers.get('company_info') || '{}'
      ) as CompanyInfo

      let user_id: string | undefined
      try {
        const profile = JSON.parse(req.request.headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub.toString()
      } catch (_) {
        user_id = undefined
      }

      const entityKey = resolveSchemaEntityKey(schema)
      const schemaName = companyInfo.schema_name || 'main'

      const insertPayload = convertDates(
        req.body as Partial<EntityInsertType<EntityName>>
      ) as Partial<EntityInsertType<EntityName>>

      const idemKey = getIdempotencyKey(schema.tablename)
      const idemValue = idemKey ? (insertPayload as any)?.[idemKey] : null

      try {
        const entity = await GenericAction({
          schema_name: schemaName,
          table_name: entityKey as EntityName,
          action_type: 'INSERT',
          data: insertPayload as Partial<EntityInsertType<EntityName>>,
          user_id,
          ip_address: req.request.headers.get('ip_address') || 'unknown',
          user_agent: req.request.headers.get('user-agent') || 'unknown',
        })

        const singular = entity?.[0]

        if (!singular) {
          return generateResponse({
            isSuccess: false,
            message: `${schema.tablename} not found`,
            data: null,
            status: 404,
            request: req,
          })
        }

        return generateResponse({
          isSuccess: true,
          message: `${schema.tablename} created successfully`,
          data: singular,
          status: 200,
          request: req,
        })
      } catch (err: any) {
        //  Duplicate key => existing return (idempotent)
        if (idemKey && idemValue && isUniqueViolation(err)) {
          try {
            const readPayload: any = {
              page: 1,
              limit: 1,
              filters: {
                [idemKey]: String(idemValue),
              },
              orderBy: 'created_at',
              orderDirection: 'desc',
            }

            const existing = await GenericAction({
              schema_name: schemaName,
              table_name: entityKey as EntityName,
              action_type: 'GET',
              data: readPayload,
              user_id,
              ip_address: req.request.headers.get('ip_address') || 'unknown',
              user_agent: req.request.headers.get('user-agent') || 'unknown',
            })

            const existingRow = existing?.[0]
            if (existingRow) {
              return generateResponse({
                isSuccess: true,
                message: `${schema.tablename} already exists (idempotent)`,
                data: existingRow,
                status: 200,
                request: req,
              })
            }
          } catch (readErr) {
            console.error('Idempotent GET failed:', readErr)
          }
        }

        console.error('GenericCreateEntity INSERT error:', err)

        return generateResponse({
          isSuccess: false,
          message: `${schema.tablename} create failed: ${String(err?.message ?? err)}`,
          data: null,
          status: 500,
          request: req,
        })
      }
    },
  })
}
