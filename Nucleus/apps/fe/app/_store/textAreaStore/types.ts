// Claims enum for authorization

export type StoreProps = {
  textValue: string
  panelPosition: 'above' | 'below'
  isPanelAOpen: boolean
  isPanelBOpen: boolean
  isPanelCOpen: boolean
  panelAState: 'main' | 'projects' | 'upload' | 'onedrive'
  panelBState: 'main' | 'styles' | 'tools'
  isThinkingExtended: boolean
  isAgenticMode: boolean
  isWebSearchEnabled: boolean
  isResearchMode: boolean
  selectedStyle: string | null
  selectedProject: string | null
  selectedProjectSlug: string | null
  selectedProvider: string | null
  selectedModel: string[] | null
  isMultiModel: boolean
  selectedTools: string[] | null
  uploadedFiles: File[] | null
  isScreenRecording: boolean
  stopScreenRecordingCallback: (() => void) | null
  isOutlookOverlayOpen: boolean
}

export type StoreMethods = {
  test: () => string
}
