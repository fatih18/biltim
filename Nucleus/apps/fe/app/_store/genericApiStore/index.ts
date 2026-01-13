'use client'

import * as AllSchemas from '@monorepo/db-entities/schemas'
import { createStore } from 'h-state'
import type { MethodCreators, StoreType } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

// Recursive initialize - tüm table ve method'ları boş obje olarak oluştur
function createInitialStore(): StoreProps {
  const store = {} as StoreProps

  for (const [key] of Object.entries(AllSchemas)) {
    // T_Users -> Users -> users
    const entityName = key.replace(/^T_/, '')
    const tableName = entityName.toLowerCase() as keyof StoreProps

    // Her table için method objesi oluştur
    store[tableName] = {
      get: undefined,
      create: undefined,
      update: undefined,
      delete: undefined,
      toggle: undefined,
      verification: undefined,
    }
  }

  return store
}

const initialStore = createInitialStore()

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

// Type-safe wrapper
function useGenericApiStore(): StoreType<StoreProps, StoreMethods> {
  return useStore()
}

export { useGenericApiStore }
