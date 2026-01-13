import { useState } from 'react'
import type { TestItem, TestState } from '../stores/testStores'

interface ZustandStoreType extends TestState {
  addItem: (item: TestItem) => void
  updateItem: (id: string, updates: Partial<TestItem>) => void
  removeItem: (id: string) => void
  incrementCounter: () => void
  updateSettings: (updates: Partial<TestState['settings']>) => void
  updateDeepNested: (value: string) => void
  reset: () => void
}

interface HStateStoreType extends TestState {
  addItem: (item: TestItem) => void
  updateItem: (id: string, updates: Partial<TestItem>) => void
  removeItem: (id: string) => void
  incrementCounter: () => void
  updateSettings: (updates: Partial<TestState['settings']>) => void
  updateDeepNested: (value: string) => void
  reset: () => void
}

export function usePerformanceTest(
  zustandStore: ZustandStoreType,
  hStateStore: HStateStoreType,
  contextStore: HStateStoreType
) {
  const [testResults, setTestResults] = useState<{
    zustand: Record<string, number>
    hstate: Record<string, number>
    context: Record<string, number>
  }>({
    zustand: {},
    hstate: {},
    context: {},
  })
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const generateItem = (id: number): TestItem => ({
    id: `item-${id}`,
    name: `Item ${id}`,
    value: Math.random() * 1000,
    tags: [`tag1`, `tag2`, `tag3`],
    metadata: {
      created: Date.now(),
      updated: Date.now(),
    },
  })

  const runTest = (
    testName: string,
    storeType: 'zustand' | 'hstate' | 'context',
    operation: () => void,
    iterations = 1000
  ) => {
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      operation()
    }

    const end = performance.now()
    const duration = end - start

    setTestResults((prev) => ({
      ...prev,
      [storeType]: {
        ...prev[storeType],
        [testName]: duration,
      },
    }))

    return duration
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setProgress(0)

    const testSuite = [
      {
        name: 'Small Array Add (1k)',
        iterations: 1000,
        type: 'array' as const,
        desc: 'Adding 1000 items',
      },
      {
        name: 'Medium Array Add (5k)',
        iterations: 5000,
        type: 'array' as const,
        desc: 'Adding 5000 items',
      },
      {
        name: 'Large Array Add (10k)',
        iterations: 10000,
        type: 'array' as const,
        desc: 'Adding 10000 items',
      },
      {
        name: 'Array Update (1k)',
        iterations: 1000,
        type: 'array' as const,
        desc: 'Updating 1000 random items',
      },
      {
        name: 'Array Remove (1k)',
        iterations: 1000,
        type: 'array' as const,
        desc: 'Removing 1000 items',
      },
      {
        name: 'Object Shallow (10k)',
        iterations: 10000,
        type: 'object' as const,
        desc: 'Shallow object updates',
      },
      {
        name: 'Deep Nested (10k)',
        iterations: 10000,
        type: 'object' as const,
        desc: '3-level nested updates',
      },
      {
        name: 'Counter (100k)',
        iterations: 100000,
        type: 'primitive' as const,
        desc: 'Primitive value updates',
      },
      {
        name: 'State Read (100k)',
        iterations: 100000,
        type: 'read' as const,
        desc: 'Reading state values',
      },
    ]

    const totalTests = testSuite.length * 3
    let completed = 0

    for (const test of testSuite) {
      // Test Zustand
      setCurrentTest(`Zustand - ${test.name}`)
      zustandStore.reset()

      if (test.type === 'array' && test.name.includes('Add')) {
        runTest(
          test.name,
          'zustand',
          () => zustandStore.addItem(generateItem(Math.random())),
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Update')) {
        for (let i = 0; i < 100; i++) zustandStore.addItem(generateItem(i))
        runTest(
          test.name,
          'zustand',
          () =>
            zustandStore.updateItem(`item-${Math.floor(Math.random() * 100)}`, {
              value: Math.random() * 1000,
            }),
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Remove')) {
        for (let i = 0; i < 1000; i++) zustandStore.addItem(generateItem(i))
        runTest(
          test.name,
          'zustand',
          () => {
            if (zustandStore.items.length > 0 && zustandStore.items[0]) {
              zustandStore.removeItem(zustandStore.items[0].id)
            }
          },
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Shallow')) {
        runTest(
          test.name,
          'zustand',
          () => zustandStore.updateSettings({ theme: Math.random() > 0.5 ? 'light' : 'dark' }),
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Deep')) {
        runTest(
          test.name,
          'zustand',
          () => zustandStore.updateDeepNested(`value-${Math.random()}`),
          test.iterations
        )
      } else if (test.type === 'primitive') {
        runTest(test.name, 'zustand', () => zustandStore.incrementCounter(), test.iterations)
      } else if (test.type === 'read') {
        for (let i = 0; i < 100; i++) zustandStore.addItem(generateItem(i))
        runTest(
          test.name,
          'zustand',
          () => {
            const _ = zustandStore.items
            const __ = zustandStore.counter
            const ___ = zustandStore.settings
          },
          test.iterations
        )
      }

      completed++
      setProgress((completed / totalTests) * 100)
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Test H-State
      setCurrentTest(`H-State - ${test.name}`)
      hStateStore.reset()

      if (test.type === 'array' && test.name.includes('Add')) {
        runTest(
          test.name,
          'hstate',
          () => hStateStore.addItem(generateItem(Math.random())),
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Update')) {
        for (let i = 0; i < 100; i++) hStateStore.addItem(generateItem(i))
        runTest(
          test.name,
          'hstate',
          () => {
            if (hStateStore.items.length > 0 && hStateStore.items[0]) {
              hStateStore.updateItem(`item-${Math.floor(Math.random() * 100)}`, {
                value: Math.random() * 1000,
              })
            }
          },
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Remove')) {
        for (let i = 0; i < 1000; i++) hStateStore.addItem(generateItem(i))
        runTest(
          test.name,
          'hstate',
          () => {
            if (hStateStore.items.length > 0 && hStateStore.items[0]) {
              hStateStore.removeItem(hStateStore.items[0].id)
            }
          },
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Shallow')) {
        runTest(
          test.name,
          'hstate',
          () => hStateStore.updateSettings({ theme: Math.random() > 0.5 ? 'light' : 'dark' }),
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Deep')) {
        runTest(
          test.name,
          'hstate',
          () => hStateStore.updateDeepNested(`value-${Math.random()}`),
          test.iterations
        )
      } else if (test.type === 'primitive') {
        runTest(test.name, 'hstate', () => hStateStore.incrementCounter(), test.iterations)
      } else if (test.type === 'read') {
        for (let i = 0; i < 100; i++) hStateStore.addItem(generateItem(i))
        runTest(
          test.name,
          'hstate',
          () => {
            const _ = hStateStore.items
            const __ = hStateStore.counter
            const ___ = hStateStore.settings
          },
          test.iterations
        )
      }

      completed++
      setProgress((completed / totalTests) * 100)
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Test Context API
      setCurrentTest(`Context - ${test.name}`)
      contextStore.reset()

      if (test.type === 'array' && test.name.includes('Add')) {
        runTest(
          test.name,
          'context',
          () => contextStore.addItem(generateItem(Math.random())),
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Update')) {
        for (let i = 0; i < 100; i++) contextStore.addItem(generateItem(i))
        runTest(
          test.name,
          'context',
          () => {
            if (contextStore.items.length > 0 && contextStore.items[0]) {
              contextStore.updateItem(`item-${Math.floor(Math.random() * 100)}`, {
                value: Math.random() * 1000,
              })
            }
          },
          test.iterations
        )
      } else if (test.type === 'array' && test.name.includes('Remove')) {
        for (let i = 0; i < 1000; i++) contextStore.addItem(generateItem(i))
        runTest(
          test.name,
          'context',
          () => {
            if (contextStore.items.length > 0 && contextStore.items[0]) {
              contextStore.removeItem(contextStore.items[0].id)
            }
          },
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Shallow')) {
        runTest(
          test.name,
          'context',
          () => contextStore.updateSettings({ theme: Math.random() > 0.5 ? 'light' : 'dark' }),
          test.iterations
        )
      } else if (test.type === 'object' && test.name.includes('Deep')) {
        runTest(
          test.name,
          'context',
          () => contextStore.updateDeepNested(`value-${Math.random()}`),
          test.iterations
        )
      } else if (test.type === 'primitive') {
        runTest(test.name, 'context', () => contextStore.incrementCounter(), test.iterations)
      } else if (test.type === 'read') {
        for (let i = 0; i < 100; i++) contextStore.addItem(generateItem(i))
        runTest(
          test.name,
          'context',
          () => {
            const _ = contextStore.items
            const __ = contextStore.counter
            const ___ = contextStore.settings
          },
          test.iterations
        )
      }

      completed++
      setProgress((completed / totalTests) * 100)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    setIsRunning(false)
    setCurrentTest('')
  }

  return {
    testResults,
    isRunning,
    currentTest,
    progress,
    runAllTests,
  }
}
