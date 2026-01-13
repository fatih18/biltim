import type { HeaderViewState, HeaderViewStateUpdates } from '../../_components/Global/Header/types'

type HeaderStoreProps = {
  ui: HeaderViewState
}

type HeaderStoreMethods = {
  updateUi: (updates: HeaderViewStateUpdates) => undefined
}

type HeaderStore = HeaderStoreProps & HeaderStoreMethods

export type { HeaderStore, HeaderStoreMethods, HeaderStoreProps }
