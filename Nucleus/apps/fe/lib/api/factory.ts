'use server'

/**
 * API Factory - Server Action
 * Uses @hidayetcanozcan/nucleus-generic-api-caller package
 */

import type { BaseError } from '@hidayetcanozcan/nucleus-generic-api-caller'
import { createNucleusApiFactory } from '@hidayetcanozcan/nucleus-generic-api-caller/server'
import { cookies, headers } from 'next/headers'

import { apiConfig } from './config'
import type { Endpoints, FactoryPayloadValue } from './types'

// Create the API caller using the package
const NucleusApi = createNucleusApiFactory(apiConfig)

/**
 * Main Factory Function - Server Action wrapper
 */
export async function FactoryFunction<
  Payload extends Record<string, FactoryPayloadValue> | undefined | FormData,
  Success,
  Error extends BaseError = BaseError,
>(payload: Payload, endpoint: Endpoints) {
  const cookieStore = await cookies()
  const headersList = await headers()

  return NucleusApi<Payload, Success, Error>(payload, endpoint, {
    cookies: {
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string, opts?: Parameters<typeof cookieStore.set>[2]) => {
        cookieStore.set(name, value, opts)
      },
      delete: (name: string) => {
        cookieStore.delete(name)
      },
    },
    headers: {
      get: (name: string) => headersList.get(name),
      forEach: (cb: (value: string, key: string) => void) => {
        headersList.forEach(cb)
      },
    },
  })
}

/**
 * Factory wrapper for hook usage
 */
export async function Factory(_config: { endpoint: Endpoints }) {
  return FactoryFunction
}
