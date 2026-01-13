import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type * as tables from '@monorepo/db-entities/schemas'
import fileManager from '@monorepo/file-manager'
import { GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { resolveSchemaEntityKey, withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

export async function GenericHardDeleteEntity<T extends keyof typeof tables>(
  schema: (typeof tables)[T],
  request: ElysiaRequestWOBody
) {
  return withChecks({
    req: request,
    operationName: `Hard Delete ${schema.tablename}`,
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

      const entityKey = resolveSchemaEntityKey(schema)

      const entity = await GenericAction({
        schema_name: companyInfo.schema_name || 'main',
        table_name: entityKey as EntityName,
        action_type: 'DELETE',
        user_id,
        ip_address: headers.get('ip_address') || 'unknown',
        user_agent: headers.get('user-agent') || 'unknown',
        id: request.params.id,
      })

      const singular = entity?.[0] || null

      if (schema.tablename === 'files') {
        const directory = (singular as { path?: string }).path
        const filename = (singular as { name?: string }).name

        if (directory && filename) {
          const fullPath = path.join(directory, filename)

          try {
            const exists = await fileManager.exists(fullPath)

            if (exists) {
              const deleted = await fileManager.deleteFile(fullPath)

              if (!deleted) {
                return generateResponse({
                  isSuccess: false,
                  message: 'Failed to remove physical file',
                  errors: [new Error(`Unable to delete file at ${fullPath}`)],
                  status: 500,
                  request,
                })
              }
            }

            try {
              const entries = await readdir(directory)

              if (entries.length === 0) {
                await fileManager.deleteDirectory({ path: directory })
              }
            } catch (directoryError) {
              console.warn(
                `Failed to remove directory ${directory} after deleting file`,
                directoryError
              )
            }
          } catch (error) {
            return generateResponse({
              isSuccess: false,
              message: 'Failed to remove physical file',
              errors: [error],
              status: 500,
              request,
            })
          }
        }
      }

      return generateResponse({
        isSuccess: true,
        message: `${schema.tablename} hard deleted successfully`,
        data: singular,
        status: 200,
        request,
      })
    },
  })
}
