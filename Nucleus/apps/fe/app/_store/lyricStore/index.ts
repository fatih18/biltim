'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import { nanoid } from 'nanoid'

import { lyrics } from './lyrics'
import type { StoreMethods, StoreProps } from './types'

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  test: (_store: StoreProps) => {
    return () => {
      return 'test'
    }
  },
  updateLyric: (store: StoreProps) => {
    return (id: string, updates: Partial<Omit<import('./types').Lyric, 'id' | 'order'>>) => {
      // Create new array with updated lyric (immutable)
      const updatedLyrics = store.lyrics.map((lyric) =>
        lyric.id === id ? { ...lyric, ...updates } : lyric
      )

      store.lyrics = updatedLyrics

      // Update selectedLyric if it's the same one
      if (store.selectedLyric?.id === id) {
        const updated = updatedLyrics.find((l) => l.id === id)
        if (updated) {
          store.selectedLyric = updated
        }
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  selectLyric: (store: StoreProps) => {
    return (lyric: import('./types').Lyric | null) => {
      store.selectedLyric = lyric
    }
  },
  applyFormat: (store: StoreProps) => {
    return (id: string, format: import('./types').TextFormat) => {
      // Create new array with updated lyric (immutable)
      const updatedLyrics = store.lyrics.map((lyric) => {
        if (lyric.id === id) {
          const newFormats = [...(lyric.formats || []), format]
          return { ...lyric, formats: newFormats }
        }
        return lyric
      })

      store.lyrics = updatedLyrics

      // Update selectedLyric if it's the same one
      if (store.selectedLyric?.id === id) {
        const updated = updatedLyrics.find((l) => l.id === id)
        if (updated) {
          store.selectedLyric = updated
        }
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  removeFormat: (store: StoreProps) => {
    return (id: string, formatIndex: number) => {
      // Create new array with updated lyric (immutable)
      const updatedLyrics = store.lyrics.map((lyric) => {
        if (lyric.id === id && lyric.formats) {
          const newFormats = lyric.formats.filter((_, idx) => idx !== formatIndex)
          return { ...lyric, formats: newFormats }
        }
        return lyric
      })

      store.lyrics = updatedLyrics

      // Update selectedLyric if it's the same one
      if (store.selectedLyric?.id === id) {
        const updated = updatedLyrics.find((l) => l.id === id)
        if (updated) {
          store.selectedLyric = updated
        }
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  updateSettings: (store: StoreProps) => {
    return (settings: Partial<import('./types').GlobalSettings>) => {
      store.settings = { ...store.settings, ...settings }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  reorderLyrics: (store: StoreProps) => {
    return (fromIndex: number, toIndex: number) => {
      const currentLyrics = [...store.lyrics]
      const [moved] = currentLyrics.splice(fromIndex, 1)
      if (!moved) return

      currentLyrics.splice(toIndex, 0, moved)

      // Create new objects with updated order to avoid mutating reactive objects
      const reorderedLyrics = currentLyrics.map((lyric, index) => ({
        ...lyric,
        order: index + 1,
      }))

      store.lyrics = reorderedLyrics

      // Save to localStorage after reorder
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  initializeFromStorage: (store: StoreProps) => {
    return () => {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem('lyrics-store')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.lyrics) {
            store.lyrics = data.lyrics
          }
          if (data.settings) {
            // Merge settings with defaults to ensure all properties exist
            store.settings = {
              backgroundColor: data.settings.backgroundColor ?? '#FFFFFF',
              textColor: data.settings.textColor ?? '#1F2937',
              defaultScrollSpeed: data.settings.defaultScrollSpeed ?? 25,
              fontSize: data.settings.fontSize ?? 18,
              defaultCentered: data.settings.defaultCentered ?? false,
              titleFontSize: data.settings.titleFontSize ?? 28,
              titleColor: data.settings.titleColor ?? '#1F2937',
              bandFontSize: data.settings.bandFontSize ?? 16,
              bandColor: data.settings.bandColor ?? '#6B7280',
              libraryTitle: data.settings.libraryTitle ?? 'Library',
            }
          }
        } catch (error) {
          console.error('Failed to parse stored lyrics:', error)
        }
      } else {
        // First time - save initial data
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  saveToStorage: (store: StoreProps) => {
    return () => {
      if (typeof window === 'undefined') return

      localStorage.setItem(
        'lyrics-store',
        JSON.stringify({
          lyrics: store.lyrics,
          settings: store.settings,
        })
      )
    }
  },
  increaseFontSize: (store: StoreProps) => {
    return () => {
      if (!store.selectedLyric) return

      const currentFontSize = store.selectedLyric.fontSize ?? store.settings?.fontSize ?? 18
      const newFontSize = Math.min(currentFontSize + 2, 72) // Max 72px

      // Create new array with updated lyric (immutable)
      const updatedLyrics = store.lyrics.map((lyric) =>
        lyric.id === store.selectedLyric?.id ? { ...lyric, fontSize: newFontSize } : lyric
      )

      store.lyrics = updatedLyrics

      // Update selected lyric reference
      const updatedSelected = updatedLyrics.find((l) => l.id === store.selectedLyric?.id)
      if (updatedSelected) {
        store.selectedLyric = updatedSelected
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  decreaseFontSize: (store: StoreProps) => {
    return () => {
      if (!store.selectedLyric) return

      const currentFontSize = store.selectedLyric.fontSize ?? store.settings?.fontSize ?? 18
      const newFontSize = Math.max(currentFontSize - 2, 12) // Min 12px

      // Create new array with updated lyric (immutable)
      const updatedLyrics = store.lyrics.map((lyric) =>
        lyric.id === store.selectedLyric?.id ? { ...lyric, fontSize: newFontSize } : lyric
      )

      store.lyrics = updatedLyrics

      // Update selected lyric reference
      const updatedSelected = updatedLyrics.find((l) => l.id === store.selectedLyric?.id)
      if (updatedSelected) {
        store.selectedLyric = updatedSelected
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  toggleCentered: (store: StoreProps) => {
    return () => {
      if (!store.selectedLyric) return

      // Create new array with toggled centered (immutable)
      const updatedLyrics = store.lyrics.map((lyric) => {
        if (lyric.id !== store.selectedLyric?.id) return lyric

        const currentValue = lyric.centered ?? store.settings.defaultCentered
        const nextValue = !currentValue

        if (nextValue === store.settings.defaultCentered) {
          return {
            ...lyric,
            centered: undefined,
          }
        }

        return {
          ...lyric,
          centered: nextValue,
        }
      })

      store.lyrics = updatedLyrics

      // Update selected lyric reference
      const updatedSelected = updatedLyrics.find((l) => l.id === store.selectedLyric?.id)
      if (updatedSelected) {
        store.selectedLyric = updatedSelected
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  addLyric: (store: StoreProps) => {
    return (band: string, title: string) => {
      // Find max order
      const maxOrder = store.lyrics.reduce((max, lyric) => Math.max(max, lyric.order), 0)
      const newOrder = maxOrder + 1

      const newLyric: import('./types').Lyric = {
        id: nanoid(), // Unique ID generated once, never changes even if order changes
        order: newOrder,
        band,
        title,
        lyrics: '',
        formats: [],
      }

      // Create new array with added lyric (immutable)
      store.lyrics = [...store.lyrics, newLyric]

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  deleteLyric: (store: StoreProps) => {
    return (id: string) => {
      // Filter out the deleted lyric and create new array with updated orders
      const updatedLyrics = store.lyrics
        .filter((l) => l.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((lyric, idx) => ({
          ...lyric,
          order: idx + 1,
        }))

      // Replace entire array (avoid mutating reactive objects)
      store.lyrics = updatedLyrics

      // If deleted lyric was selected, clear selection
      if (store.selectedLyric?.id === id) {
        store.selectedLyric = null
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
  setLibraryTitle: (store: StoreProps) => {
    return (title: string) => {
      store.settings = { ...store.settings, libraryTitle: title }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'lyrics-store',
          JSON.stringify({
            lyrics: store.lyrics,
            settings: store.settings,
          })
        )
      }
    }
  },
}

// Always start with default store to avoid hydration mismatch
// localStorage will be loaded after hydration
const defaultSettings = {
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  defaultScrollSpeed: 25,
  fontSize: 18,
  defaultCentered: false,
  titleFontSize: 28,
  titleColor: '#1F2937',
  bandFontSize: 16,
  bandColor: '#6B7280',
  libraryTitle: 'Library',
}

const initialStore: StoreProps = {
  selectedLyric: null,
  settings: defaultSettings,
  lyrics,
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore }
