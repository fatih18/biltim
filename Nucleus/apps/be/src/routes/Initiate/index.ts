import {
  BackupTenant,
  CreateSchemas,
  dropSchema,
  ExpandSchema,
  ExpandTenantSchema,
  GetTenantStats,
  ListSchemas,
  RestoreTenant,
  UpdateTenant,
} from '@/controllers'
import type { App } from '@/server'

export function InitiateRoute(app: App) {
  return app.group('/initiate', (app) => {
    return app
      .post('/', CreateSchemas)
      .put('/', ExpandSchema)
      .get('/:schemaName', ListSchemas)
      .get('/:schemaName/stats', GetTenantStats)
      .get('/:schemaName/backup', BackupTenant)
      .post('/:schemaName/restore', RestoreTenant)
      .put('/:schemaName/expand', ExpandTenantSchema)
      .patch('/tenant/:tenantId', UpdateTenant)
      .delete('/:schemaName', dropSchema)
  })
}
