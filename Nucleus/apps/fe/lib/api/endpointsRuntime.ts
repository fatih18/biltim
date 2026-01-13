/**
 * Generic Endpoints Runtime Generator
 * Uses @hidayetcanozcan/nucleus-generic-api-caller package
 */

import type { SchemaDefinition } from '@hidayetcanozcan/nucleus-generic-api-caller'
import { generateGenericEndpoints as generateFromPackage } from '@hidayetcanozcan/nucleus-generic-api-caller'
import * as AllSchemas from '@monorepo/db-entities/schemas'

/**
 * Generate all generic endpoints and settings from project schemas
 * Uses the package's generateGenericEndpoints with project-specific schemas
 */
export function generateGenericEndpoints() {
  // Convert AllSchemas to the expected format
  const schemas: Record<string, SchemaDefinition> = {}

  for (const [key, schema] of Object.entries(AllSchemas)) {
    // biome-ignore lint/suspicious/noExplicitAny: Schema types vary
    const s = schema as any
    if (s.tablename) {
      schemas[key] = {
        tablename: s.tablename,
        excluded_methods: s.excluded_methods,
        is_formdata: s.is_formdata,
      }
    }
  }

  return generateFromPackage(schemas)
}
