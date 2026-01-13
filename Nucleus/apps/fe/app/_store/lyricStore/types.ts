// Text formatting type
export type TextFormat = {
  start: number
  end: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  fontSize?: number
}

export type Lyric = {
  id: string // Generated from band-title-order combination
  order: number
  band: string
  title: string
  lyrics: string
  formats?: TextFormat[] // Optional text formatting
  fontSize?: number // Per-song font size
  centered?: boolean // Center align text
  scrollSpeed?: number // Per-song scroll speed (overrides global default)
}

export type GlobalSettings = {
  backgroundColor: string
  textColor: string
  defaultScrollSpeed: number
  fontSize: number
  defaultCentered: boolean
  // Title styling
  titleFontSize: number
  titleColor: string
  // Band name styling
  bandFontSize: number
  bandColor: string
  // Library customization
  libraryTitle: string
}

export type StoreProps = {
  lyrics: Lyric[]
  selectedLyric: Lyric | null
  settings: GlobalSettings
}

export type StoreMethods = {
  test: () => string
  updateLyric: (id: string, updates: Partial<Omit<Lyric, 'id' | 'order'>>) => void
  selectLyric: (lyric: Lyric | null) => void
  applyFormat: (id: string, format: TextFormat) => void
  removeFormat: (id: string, formatIndex: number) => void
  updateSettings: (settings: Partial<GlobalSettings>) => void
  reorderLyrics: (fromIndex: number, toIndex: number) => void
  initializeFromStorage: () => void
  saveToStorage: () => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  toggleCentered: () => void
  addLyric: (band: string, title: string) => void
  deleteLyric: (id: string) => void
  setLibraryTitle: (title: string) => void
}
