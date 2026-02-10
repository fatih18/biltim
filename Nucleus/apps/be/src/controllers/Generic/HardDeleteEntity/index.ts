import { readdir } from 'node:fs/promises'
import path from 'node:path'
import * as tables from '@monorepo/db-entities/schemas'
import { getTenantDB } from '@monorepo/drizzle-manager'
import fileManager from '@monorepo/file-manager'
import { GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { eq, or } from 'drizzle-orm'
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

      if (!request.params?.id) {
        return generateResponse({
          isSuccess: false,
          message: 'Missing id',
          errors: [new Error('Missing id')],
          status: 400,
          request,
        })
      }

      if (schema.tablename === 'users') {
        const schema_name = companyInfo.schema_name || 'main'
        const userIdToDelete = request.params.id
        const db = await getTenantDB(schema_name)

        const companiesTable = tables.T_Companies.T_Companies
        const verificationsTable = tables.T_Verifications.T_Verifications
        const fiveSAuditTeamsTable = tables.T_FiveSAuditTeams.T_FiveSAuditTeams

        const blockingCompany = await db
          .select({ id: companiesTable.id })
          .from(companiesTable)
          .where(eq(companiesTable.owner_id, userIdToDelete))
          .limit(1)

        if ((blockingCompany?.length ?? 0) > 0) {
          return generateResponse({
            isSuccess: false,
            message: 'User cannot be deleted because they are an owner of a company.',
            errors: [new Error('User is referenced by companies.owner_id')],
            status: 409,
            request,
          })
        }

        const blockingVerification = await db
          .select({ id: verificationsTable.id })
          .from(verificationsTable)
          .where(eq(verificationsTable.verifier_id, userIdToDelete))
          .limit(1)

        if ((blockingVerification?.length ?? 0) > 0) {
          return generateResponse({
            isSuccess: false,
            message: 'User cannot be deleted because they are a verifier in a verification record.',
            errors: [new Error('User is referenced by verifications.verifier_id')],
            status: 409,
            request,
          })
        }

        const blockingAuditTeam = await db
          .select({ id: fiveSAuditTeamsTable.id })
          .from(fiveSAuditTeamsTable)
          .where(eq(fiveSAuditTeamsTable.leader_user_id, userIdToDelete))
          .limit(1)

        if ((blockingAuditTeam?.length ?? 0) > 0) {
          return generateResponse({
            isSuccess: false,
            message: 'User cannot be deleted because they are a leader of an audit team.',
            errors: [new Error('User is referenced by five_s_audit_teams.leader_user_id')],
            status: 409,
            request,
          })
        }

        const entity = await db.transaction(async (tx) => {
          const profilesTable = tables.T_Profiles.T_Profiles
          const userClaimsTable = tables.T_UserClaims.T_UserClaims
          const userRolesTable = tables.T_UserRoles.T_UserRoles
          const filesTable = tables.T_Files.T_Files

          await tx.delete(profilesTable).where(eq(profilesTable.user_id, userIdToDelete))
          await tx
            .delete(userClaimsTable)
            .where(
              or(
                eq(userClaimsTable.user_id, userIdToDelete),
                eq(userClaimsTable.granted_by, userIdToDelete)
              )
            )
          await tx.delete(userRolesTable).where(eq(userRolesTable.user_id, userIdToDelete))
          await tx
            .update(filesTable)
            .set({ uploaded_by: null })
            .where(eq(filesTable.uploaded_by, userIdToDelete))

          return GenericAction({
            schema_name,
            table_name: entityKey as EntityName,
            action_type: 'DELETE',
            user_id,
            ip_address: headers.get('ip_address') || 'unknown',
            user_agent: headers.get('user-agent') || 'unknown',
            id: userIdToDelete,
            tx,
          })
        })

        const singular = entity?.[0] || null

        return generateResponse({
          isSuccess: true,
          message: `${schema.tablename} hard deleted successfully`,
          data: singular,
          status: 200,
          request,
        })
      }

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
