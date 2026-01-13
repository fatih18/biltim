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
  textValue: '',
  panelPosition: 'above',
  isPanelAOpen: false,
  isPanelBOpen: false,
  isPanelCOpen: false,
  isThinkingExtended: false,
  isAgenticMode: false,
  isWebSearchEnabled: false,
  isResearchMode: false,
  panelAState: 'main',
  panelBState: 'main',
  selectedStyle: null,
  selectedProject: null,
  selectedProjectSlug: null,
  selectedProvider: null,
  selectedModel: null,
  isMultiModel: false,
  selectedTools: null,
  uploadedFiles: null,
  isScreenRecording: false,
  stopScreenRecordingCallback: null,
  isOutlookOverlayOpen: false,
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useTextAreaStore }
