import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import { create } from 'zustand'

// Types
export interface TestItem {
  id: string
  name: string
  value: number
  tags: string[]
  metadata: {
    created: number
    updated: number
  }
}

export interface TestState extends Record<string, unknown> {
  items: TestItem[]
  counter: number
  settings: {
    theme: 'light' | 'dark'
    notifications: boolean
    nested: {
      deep: {
        value: string
      }
    }
  }
  renderCount: number
}

// Zustand Store
export const useZustandStore = create<
  TestState & {
    addItem: (item: TestItem) => void
    updateItem: (id: string, updates: Partial<TestItem>) => void
    removeItem: (id: string) => void
    incrementCounter: () => void
    updateSettings: (updates: Partial<TestState['settings']>) => void
    updateDeepNested: (value: string) => void
    reset: () => void
  }
>((set) => ({
  items: [],
  counter: 0,
  settings: {
    theme: 'light',
    notifications: true,
    nested: {
      deep: {
        value: 'initial',
      },
    },
  },
  renderCount: 0,

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  incrementCounter: () =>
    set((state) => ({
      counter: state.counter + 1,
    })),

  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  updateDeepNested: (value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        nested: {
          ...state.settings.nested,
          deep: {
            value,
          },
        },
      },
    })),

  reset: () =>
    set({
      items: [],
      counter: 0,
      settings: {
        theme: 'light',
        notifications: true,
        nested: {
          deep: {
            value: 'initial',
          },
        },
      },
      renderCount: 0,
    }),
}))

// H-State Store
type HStateStoreProps = TestState
type HStateStoreMethods = {
  addItem: (item: TestItem) => void
  updateItem: (id: string, updates: Partial<TestItem>) => void
  removeItem: (id: string) => void
  incrementCounter: () => void
  updateSettings: (updates: Partial<TestState['settings']>) => void
  updateDeepNested: (value: string) => void
  reset: () => void
}

const hStateMethodCreators: MethodCreators<HStateStoreProps, HStateStoreMethods> = {
  addItem: (store) => (item) => {
    store.items = [...store.items, item]
  },

  updateItem: (store) => (id, updates) => {
    store.items = store.items.map((item: TestItem) =>
      item.id === id ? { ...item, ...updates } : item
    )
  },

  removeItem: (store) => (id) => {
    store.items = store.items.filter((item: TestItem) => item.id !== id)
  },

  incrementCounter: (store) => () => {
    store.counter = store.counter + 1
  },

  updateSettings: (store) => (updates) => {
    store.settings = { ...store.settings, ...updates }
  },

  updateDeepNested: (store) => (value) => {
    store.settings = {
      ...store.settings,
      nested: {
        ...store.settings.nested,
        deep: { value },
      },
    }
  },

  reset: (store) => () => {
    store.items = []
    store.counter = 0
    store.settings = {
      theme: 'light',
      notifications: true,
      nested: {
        deep: {
          value: 'initial',
        },
      },
    }
    store.renderCount = 0
  },
}

const initialHState: HStateStoreProps = {
  items: [],
  counter: 0,
  settings: {
    theme: 'light',
    notifications: true,
    nested: {
      deep: {
        value: 'initial',
      },
    },
  },
  renderCount: 0,
}

export const { useStore: useHStateStore } = createStore(initialHState, hStateMethodCreators)
