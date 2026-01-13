'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  test: (_store: StoreProps) => {
    return () => {
      return 'test'
    }
  },
}

const initialStore: StoreProps = {
  user: undefined,
  isLoginChecked: false,
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore }
