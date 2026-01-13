'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { HeaderViewStateUpdates } from '../../_components/Global/Header/types'
import type { HeaderStoreMethods, HeaderStoreProps } from './types'

const initialStore: HeaderStoreProps = {
  ui: {
    isExpanded: false,
    isProfileOpen: false,
    isSearchOpen: false,
    isDarkMode: false,
    activeNav: 'dashboard',
  },
}

function createUpdateUi(store: HeaderStoreProps) {
  function updateUi(updates: HeaderViewStateUpdates): undefined {
    store.ui = {
      ...store.ui,
      ...updates,
    }

    return undefined
  }

  return updateUi
}

const storeMethodCreators: MethodCreators<HeaderStoreProps, HeaderStoreMethods> = {
  updateUi: createUpdateUi,
}

const { useStore } = createStore<HeaderStoreProps, HeaderStoreMethods>(
  initialStore,
  storeMethodCreators
)

export { useStore as useHeaderStore }
