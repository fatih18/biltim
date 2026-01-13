'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import type { TestItem, TestState } from './testStores'

interface ContextStoreType extends TestState {
  addItem: (item: TestItem) => void
  updateItem: (id: string, updates: Partial<TestItem>) => void
  removeItem: (id: string) => void
  incrementCounter: () => void
  updateSettings: (updates: Partial<TestState['settings']>) => void
  updateDeepNested: (value: string) => void
  reset: () => void
}

const ContextStore = createContext<ContextStoreType | undefined>(undefined)

const initialState: TestState = {
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

export function ContextStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TestState>(initialState)

  const addItem = (item: TestItem) => {
    setState((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }))
  }

  const updateItem = (id: string, updates: Partial<TestItem>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }))
  }

  const removeItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }))
  }

  const incrementCounter = () => {
    setState((prev) => ({
      ...prev,
      counter: prev.counter + 1,
    }))
  }

  const updateSettings = (updates: Partial<TestState['settings']>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }))
  }

  const updateDeepNested = (value: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        nested: {
          ...prev.settings.nested,
          deep: {
            value,
          },
        },
      },
    }))
  }

  const reset = () => {
    setState(initialState)
  }

  const value: ContextStoreType = {
    ...state,
    addItem,
    updateItem,
    removeItem,
    incrementCounter,
    updateSettings,
    updateDeepNested,
    reset,
  }

  return <ContextStore.Provider value={value}>{children}</ContextStore.Provider>
}

export function useContextStore() {
  const context = useContext(ContextStore)
  if (!context) {
    throw new Error('useContextStore must be used within ContextStoreProvider')
  }
  return context
}
