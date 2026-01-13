import { randomUUID } from 'node:crypto'
import { T_RemoteCommandLogs } from '@monorepo/db-entities/schemas/default/remote_command_log'
import { T_RemoteComputers } from '@monorepo/db-entities/schemas/default/remote_computer'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import {
  createPendingCommand,
  generateResponse,
  getRemoteAgentSocket,
  rejectPendingCommand,
} from '@/utils'

type CommandResult = {
  command: string
  args: string[]
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
}

export async function ExecuteRemoteCommand(req: ElysiaRequest<{ params: { agentId: string } }>) {
  return await withChecks({
    operationName: 'Execute remote command',
    req,
    endpoint: async function endpoint(req: ElysiaRequest<{ params: { agentId: string } }>) {
      const headers = req.request.headers
      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo
      const schemaName = companyInfo.schema_name || 'main'

      const params = (req.params || {}) as { agentId?: string }
      const agentId = params.agentId?.trim()

      if (!agentId) {
        return generateResponse({
          isSuccess: false,
          message: 'agentId is required',
          errors: 'Missing agentId',
          status: 400,
          request: req,
        })
      }

      const body = (req.body ?? {}) as Partial<{
        command: string
        args: string[]
        cwd?: string
        timeoutMs?: number
      }>

      const command = body.command?.trim()

      if (!command) {
        return generateResponse({
          isSuccess: false,
          message: 'command is required',
          errors: 'Missing command',
          status: 400,
          request: req,
        })
      }

      const tenantDB = await getTenantDB(schemaName)

      const existing = await tenantDB
        .select({ id: T_RemoteComputers.id })
        .from(T_RemoteComputers)
        .where(eq(T_RemoteComputers.computer_identifier, agentId))
        .limit(1)

      if (!existing[0]) {
        return generateResponse({
          isSuccess: false,
          message: 'Remote computer not found for command execution',
          errors: 'Remote computer not found',
          status: 404,
          request: req,
        })
      }

      const socket = getRemoteAgentSocket(agentId)

      if (!socket || !socket.send) {
        return generateResponse({
          isSuccess: false,
          message: 'Remote agent is not connected via WebSocket',
          errors: 'Remote agent not connected',
          status: 409,
          request: req,
        })
      }

      const timeoutMs = body.timeoutMs && body.timeoutMs > 0 ? body.timeoutMs : 30000
      const commandId = randomUUID()

      const resultPromise = createPendingCommand(commandId, timeoutMs)

      const payload = {
        type: 'command' as const,
        commandId,
        command,
        args: body.args ?? [],
        cwd: body.cwd,
        timeoutMs,
      }

      try {
        socket.send(JSON.stringify(payload))
      } catch (error) {
        rejectPendingCommand(
          commandId,
          error instanceof Error ? error : new Error('Failed to send command to remote agent')
        )

        return generateResponse({
          isSuccess: false,
          message: 'Failed to send command to remote agent',
          errors: 'Failed to send command to remote agent',
          status: 500,
          request: req,
        })
      }

      const result = (await resultPromise) as CommandResult | null

      // Get user ID from profile if available
      const profile = JSON.parse(headers.get('profile') || '{}') as { sub?: string }
      const executedByUserId = profile.sub || null

      // Log the command execution to database
      try {
        await tenantDB.insert(T_RemoteCommandLogs).values({
          remote_computer_id: existing[0].id as string,
          command,
          args: body.args ? JSON.stringify(body.args) : null,
          output: result?.stdout || null,
          stderr: result?.stderr || null,
          exit_code: result?.exitCode ?? null,
          execution_time_ms: result?.durationMs ?? null,
          timed_out: result?.timedOut ?? false,
          executed_by_user_id: executedByUserId,
        })
      } catch (logError) {
        console.error('Failed to log remote command:', logError)
        // Don't fail the request if logging fails
      }

      return generateResponse({
        isSuccess: true,
        message: 'Remote command executed',
        data: {
          agentId,
          commandId,
          result,
        },
        request: req,
      })
    },
  })
}
