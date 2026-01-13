import * as tables from '@monorepo/db-entities/schemas'
import { GenericMethods } from '@monorepo/db-entities/types/shared'
import {
  GenericCreateEntity,
  GenericCreateEntityWithFormData,
  GenericGetEntity,
  GenericHardDeleteEntity,
  GenericToggleEntity,
  GenericUpdateEntity,
  GenericVerifyEntity,
} from '@/controllers'
import type { App } from '@/server'

export function GenericRoutes(app: App) {
  const tableObjects = Object.values(tables)

  const backend_id = process.env.NUCLEUS_APP_ID

  const filtered = tableObjects.filter((t) => t.available_app_ids.includes(backend_id))

  for (const table of filtered) {
    const excludedMethods: GenericMethods[] = table.excluded_methods ?? []

    app.group(table.tablename, (app) => {
      let routes = app

      if (!excludedMethods.includes(GenericMethods.GET)) {
        routes = routes.get(
          '/',
          (req) => {
            return GenericGetEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      if (!excludedMethods.includes(GenericMethods.CREATE)) {
        routes = routes.post(
          '/',
          (req) => {
            return table.is_formdata
              ? GenericCreateEntityWithFormData(table, req)
              : GenericCreateEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      if (!excludedMethods.includes(GenericMethods.UPDATE)) {
        routes = routes.patch(
          '/:id',
          (req) => {
            return GenericUpdateEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      if (!excludedMethods.includes(GenericMethods.DELETE)) {
        routes = routes.delete(
          '/:id',
          (req) => {
            return GenericHardDeleteEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      if (!excludedMethods.includes(GenericMethods.TOGGLE)) {
        routes = routes.patch(
          '/:id/toggle',
          (req) => {
            return GenericToggleEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      if (!excludedMethods.includes(GenericMethods.VERIFICATION)) {
        routes = routes.patch(
          '/:id/verify',
          (req) => {
            return GenericVerifyEntity(table, req)
          },
          {
            // Validation will be added later as a export from schema files
          }
        )
      }

      return routes
    })
  }

  return app
}
