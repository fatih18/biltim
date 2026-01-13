'use client'

import {
  createNucleusApiHook,
  GenericMethods,
  generateEndpointKey,
  type SchemaDefinition,
} from '@hidayetcanozcan/nucleus-generic-api-caller'
import * as AllSchemas from '@monorepo/db-entities/schemas'
import { useMemo } from 'react'

import { type ActionTypes, CustomEndpoints, Endpoints, Factory, VorionEndpoints } from '@/lib/api'

// -----------------------------------------------------------------------------
// Metadata types (used by buildPayloadTemplate and API sandbox UIs)
// -----------------------------------------------------------------------------

export interface GenericEndpointMeta {
  kind: 'generic'
  endpointKey: string
  endpoint: string
  schema: SchemaDefinition
  method: GenericMethods
}

export interface CustomEndpointMeta {
  kind: 'custom'
  endpointKey: string
  endpoint: string
}

export interface VorionEndpointMeta {
  kind: 'vorion'
  endpointKey: string
  endpoint: string
}

export type GenericActionMeta = GenericEndpointMeta | CustomEndpointMeta | VorionEndpointMeta

function resolveEndpoint(input: string): string {
  const raw = String(input ?? '').trim()
  const byKey = (Endpoints as Record<string, string>)[raw]
  return byKey ?? raw
}

function toFetchableEndpoint(input: string): string {
  const s = String(input ?? '').trim()

  if (/^https?:\/\//i.test(s)) return encodeURI(s)

  if (s.includes('?') || s.includes('#')) {
    const abs = s.startsWith('/') ? s : `/${s}`
    return encodeURI(abs)
  }

  const abs = s.startsWith('/') ? s : `/${s}`
  const parts = abs.split('/').map((p, i) => (i === 0 ? p : encodeURIComponent(p)))
  return parts.join('/')
}

export const useGenericApiActions = createNucleusApiHook<typeof Endpoints, ActionTypes>({
  endpoints: Endpoints,
  customEndpoints: CustomEndpoints,
  schemas: AllSchemas,
  // Factory: returns a function that will be called with (payload, endpoint)
  factory: async (endpoint: string) => {
    const resolved = resolveEndpoint(endpoint)
    const safeEndpoint = toFetchableEndpoint(resolved)

    const action = await Factory({
      endpoint: safeEndpoint as (typeof Endpoints)[keyof typeof Endpoints],
    })

    return action as (payload: unknown, endpoint: string) => Promise<unknown>
  },

  routerPush: (path: string) => {
    if (typeof window !== 'undefined') window.location.href = path
  },
})

// Backward-compatible alias for older imports
export const useGenericApiStore = useGenericApiActions

// -----------------------------------------------------------------------------
// Metadata hook - provides endpoint metadata for sandboxes
// -----------------------------------------------------------------------------

export function useGenericApiMetadata(): Record<string, GenericActionMeta> {
  return useMemo(() => {
    const meta: Record<string, GenericActionMeta> = {}

    // Generic endpoints from schemas
    const allMethods: GenericMethods[] = [
      GenericMethods.GET,
      GenericMethods.CREATE,
      GenericMethods.UPDATE,
      GenericMethods.DELETE,
      GenericMethods.TOGGLE,
      GenericMethods.VERIFICATION,
    ]

    for (const [, schemaValue] of Object.entries(AllSchemas)) {
      const schema = schemaValue as SchemaDefinition
      const tablename = schema.tablename
      if (!tablename) continue

      const excluded = (schema.excluded_methods ?? []) as GenericMethods[]

      for (const method of allMethods) {
        if (excluded.includes(method)) continue

        const endpointKey = generateEndpointKey(tablename, method)
        const endpoint = (Endpoints as Record<string, string>)[endpointKey]
        if (!endpoint) continue

        meta[endpointKey] = {
          kind: 'generic',
          endpointKey,
          endpoint,
          schema,
          method,
        }
      }
    }

    // Custom endpoints metadata
    for (const key of Object.keys(CustomEndpoints)) {
      const endpointKey = key
      const endpoint = (Endpoints as Record<string, string>)[endpointKey]
      if (!endpoint) continue

      if (!meta[endpointKey]) {
        meta[endpointKey] = {
          kind: 'custom',
          endpointKey,
          endpoint,
        }
      }
    }

    // Vorion endpoints metadata - marked separately for special handling
    for (const key of Object.keys(VorionEndpoints)) {
      const endpointKey = key
      const endpoint = (Endpoints as Record<string, string>)[endpointKey]
      if (!endpoint) continue

      meta[endpointKey] = {
        kind: 'vorion',
        endpointKey,
        endpoint,
      }
    }

    return meta
  }, [])
}
