'use client'

import { useEffect, useRef } from 'react'
import { TestCard } from './components/TestCard'
import { usePerformanceTest } from './hooks/usePerformanceTest'
import { ContextStoreProvider, useContextStore } from './stores/contextStore'
import { useHStateStore, useZustandStore } from './stores/testStores'

function PerformanceContent() {
  const zustandStore = useZustandStore()
  const hStateStore = useHStateStore()
  const contextStore = useContextStore()
  const { testResults, isRunning, currentTest, progress, runAllTests } = usePerformanceTest(
    zustandStore,
    hStateStore as unknown as Parameters<typeof usePerformanceTest>[1],
    contextStore
  )

  const zustandRenderCount = useRef(0)
  const hStateRenderCount = useRef(0)

  useEffect(() => {
    zustandRenderCount.current++
  })

  useEffect(() => {
    hStateRenderCount.current++
  })

  const calculateWinner = (testName: string) => {
    const times = [
      { store: 'zustand', time: testResults.zustand[testName] },
      { store: 'hstate', time: testResults.hstate[testName] },
      { store: 'context', time: testResults.context[testName] },
    ].filter((t) => t.time !== undefined) as { store: string; time: number }[]

    if (times.length === 0) return null
    const minTime = Math.min(...times.map((t) => t.time))
    return times.find((t) => t.time === minTime)?.store
  }

  const allTestNames = Object.keys({
    ...testResults.zustand,
    ...testResults.hstate,
    ...testResults.context,
  })
  const zustandWins = allTestNames.filter((test) => calculateWinner(test) === 'zustand').length
  const hstateWins = allTestNames.filter((test) => calculateWinner(test) === 'hstate').length
  const contextWins = allTestNames.filter((test) => calculateWinner(test) === 'context').length

  // Overall rankings
  const overallRankings = [
    { store: 'zustand', wins: zustandWins },
    { store: 'hstate', wins: hstateWins },
    { store: 'context', wins: contextWins },
  ]
    .sort((a, b) => b.wins - a.wins)
    .reduce(
      (acc, item, index) => {
        acc[item.store] = index + 1
        return acc
      },
      {} as Record<string, number>
    )

  const hasResults = Object.keys(testResults.zustand).length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Hero Summary - Results First */}
        {hasResults && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Test Results</h2>
              <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono">
                {Object.keys(testResults.zustand).length} tests completed
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-500/20 backdrop-blur rounded-lg p-4 relative">
                {zustandWins > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      overallRankings.zustand === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : overallRankings.zustand === 2
                          ? 'bg-gray-300 text-gray-700'
                          : 'bg-orange-300 text-orange-900'
                    }`}
                  >
                    {overallRankings.zustand}.
                  </div>
                )}
                <div className="text-sm text-gray-300 mb-1">🔵 Zustand</div>
                <div className="text-3xl font-bold mb-2">{zustandWins}</div>
                <div className="text-xs text-gray-400">victories</div>
              </div>
              <div className="bg-purple-500/20 backdrop-blur rounded-lg p-4 relative">
                {hstateWins > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      overallRankings.hstate === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : overallRankings.hstate === 2
                          ? 'bg-gray-300 text-gray-700'
                          : 'bg-orange-300 text-orange-900'
                    }`}
                  >
                    {overallRankings.hstate}.
                  </div>
                )}
                <div className="text-sm text-gray-300 mb-1">🟣 H-State v2</div>
                <div className="text-3xl font-bold mb-2">{hstateWins}</div>
                <div className="text-xs text-gray-400">victories</div>
              </div>
              <div className="bg-green-500/20 backdrop-blur rounded-lg p-4 relative">
                {contextWins > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      overallRankings.context === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : overallRankings.context === 2
                          ? 'bg-gray-300 text-gray-700'
                          : 'bg-orange-300 text-orange-900'
                    }`}
                  >
                    {overallRankings.context}.
                  </div>
                )}
                <div className="text-sm text-gray-300 mb-1">🟢 Context API</div>
                <div className="text-3xl font-bold mb-2">{contextWins}</div>
                <div className="text-xs text-gray-400">victories</div>
              </div>
            </div>
          </div>
        )}

        {/* Header - Compact */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Performance Benchmark
              </h1>
              <p className="text-sm text-gray-600">
                Zustand vs H-State v2 vs Context API · 9 Scenarios
              </p>
            </div>

            <button
              type="button"
              onClick={runAllTests}
              disabled={isRunning}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'
              }`}
            >
              {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
            </button>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{currentTest}</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Metrics - Compact */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">Zustand</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-mono">{zustandStore.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Renders</span>
                  <span className="font-mono">{zustandRenderCount.current}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">H-State</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-mono">{hStateStore.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Renders</span>
                  <span className="font-mono">{hStateRenderCount.current}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Info */}
        {!hasResults && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📊 3 State Managers × 9 Test Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-blue-900 mb-2 text-sm">Test Scenarios:</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Small, Medium & Large Arrays (1k, 5k, 10k)</li>
                  <li>• Array Updates & Removals (1k ops)</li>
                  <li>• Object Updates: Shallow & Deep (10k ops)</li>
                  <li>• Primitive Counter (100k increments)</li>
                  <li>• State Read Performance (100k reads)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-900 mb-2 text-sm">State Managers:</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>
                    🔵 <strong>Zustand</strong> - Redux-like external store
                  </li>
                  <li>
                    🟣 <strong>H-State v2</strong> - Proxy-free reactive store
                  </li>
                  <li>
                    🟢 <strong>Context API</strong> - React built-in state
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Results Gallery */}
        {hasResults && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Detailed Results</h2>
              <span className="text-xs text-gray-500 font-mono">
                {Object.keys(testResults.zustand).length} tests
              </span>
            </div>

            {/* Gallery Grid - 2 cols on mobile, 3 on tablet+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys({
                ...testResults.zustand,
                ...testResults.hstate,
                ...testResults.context,
              }).map((testName, idx) => (
                <TestCard
                  key={idx}
                  testName={testName}
                  zustandTime={testResults.zustand[testName]}
                  hstateTime={testResults.hstate[testName]}
                  contextTime={testResults.context[testName]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Performance() {
  return (
    <ContextStoreProvider>
      <PerformanceContent />
    </ContextStoreProvider>
  )
}
