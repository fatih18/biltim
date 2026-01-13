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
  lorem: '',
  ipsum: null,
  dolor: undefined,
  sit: [],
  amet: {
    foo: '',
    bar: 0,
  },
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useBetaStore }
