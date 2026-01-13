import { createHash } from 'node:crypto'
import { T_RemoteComputers } from '@monorepo/db-entities/schemas/default/remote_computer'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function RemoteHeartbeat(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'Remote heartbeat',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const headers = req.request.headers
      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo
      const schemaName = companyInfo.schema_name || 'main'

      const body = (req.body ?? {}) as Partial<{
        agentId: string
        status?: 'online' | 'offline' | 'error'
        timestamp?: string
      }>

      const agentId = body.agentId?.trim()

      if (!agentId) {
        return generateResponse({
          isSuccess: false,
          message: 'agentId is required',
          errors: 'Missing agentId',
          status: 400,
          request: req,
        })
      }

      const apiKeyHeader = headers.get('x-agent-api-key')?.trim()

      if (!apiKeyHeader) {
        return generateResponse({
          isSuccess: false,
          message: 'API key is required',
          errors: 'Missing x-agent-api-key header',
          status: 401,
          request: req,
        })
      }

      const tenantDB = await getTenantDB(schemaName)

      const existing = await tenantDB
        .select({
          id: T_RemoteComputers.id,
          api_key_hash: T_RemoteComputers.api_key_hash,
        })
        .from(T_RemoteComputers)
        .where(eq(T_RemoteComputers.computer_identifier, agentId))
        .limit(1)

      if (!existing[0]) {
        return generateResponse({
          isSuccess: false,
          message: 'Remote computer not found for heartbeat',
          errors: 'Remote computer not found',
          status: 404,
          request: req,
        })
      }

      // Verify API key matches
      const providedKeyHash = createHash('sha256').update(apiKeyHeader).digest('hex')
      if (existing[0].api_key_hash && existing[0].api_key_hash !== providedKeyHash) {
        return generateResponse({
          isSuccess: false,
          message: 'Invalid agent API key',
          errors: 'API key does not match',
          status: 401,
          request: req,
        })
      }

      const isOnline = body.status !== 'offline'

      await tenantDB
        .update(T_RemoteComputers)
        .set({
          last_seen: body.timestamp ? new Date(body.timestamp) : new Date(),
          is_online: isOnline,
          updated_at: new Date(),
        })
        .where(eq(T_RemoteComputers.computer_identifier, agentId))

      return generateResponse({
        isSuccess: true,
        message: 'Heartbeat received',
        data: {
          agentId,
          status: body.status ?? 'online',
          schema_name: schemaName,
        },
        request: req,
      })
    },
  })
}
