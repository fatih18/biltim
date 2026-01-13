interface TestCardProps {
  testName: string
  zustandTime?: number
  hstateTime?: number
  contextTime?: number
}

export function TestCard({ testName, zustandTime, hstateTime, contextTime }: TestCardProps) {
  const times = [
    { name: 'zustand', time: zustandTime },
    { name: 'hstate', time: hstateTime },
    { name: 'context', time: contextTime },
  ].filter((t) => t.time !== undefined) as { name: string; time: number }[]

  // Sort by time to get rankings
  const sortedTimes = [...times].sort((a, b) => a.time - b.time)
  const rankings = new Map<string, number>()
  sortedTimes.forEach((item, index) => {
    rankings.set(item.name, index + 1)
  })

  const winner = times.length > 0 && sortedTimes[0] ? sortedTimes[0].name : null

  const maxTime = Math.max(...times.map((t) => t.time))
  const minTime = Math.min(...times.map((t) => t.time))
  const percentDiff = maxTime > 0 ? (((maxTime - minTime) / maxTime) * 100).toFixed(1) : '0'

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-300">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/50 rounded-lg transition-all duration-300 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
            {testName}
          </h3>
          {winner && (
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  winner === 'zustand'
                    ? 'bg-blue-500'
                    : winner === 'hstate'
                      ? 'bg-purple-500'
                      : 'bg-green-500'
                }`}
              />
              <span className="text-xs text-gray-500 font-mono">+{percentDiff}%</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div
            className={`p-2 rounded transition-all duration-300 relative ${
              winner === 'zustand' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">Zustand</div>
              {zustandTime && rankings.has('zustand') && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    rankings.get('zustand') === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : rankings.get('zustand') === 2
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {rankings.get('zustand')}.
                </span>
              )}
            </div>
            <div
              className={`text-base font-mono transition-all duration-300 ${
                winner === 'zustand' ? 'text-blue-700 font-bold' : 'text-gray-600'
              }`}
            >
              {zustandTime ? `${zustandTime.toFixed(1)}ms` : '-'}
            </div>
          </div>

          <div
            className={`p-2 rounded transition-all duration-300 relative ${
              winner === 'hstate' ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">H-State</div>
              {hstateTime && rankings.has('hstate') && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    rankings.get('hstate') === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : rankings.get('hstate') === 2
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {rankings.get('hstate')}.
                </span>
              )}
            </div>
            <div
              className={`text-base font-mono transition-all duration-300 ${
                winner === 'hstate' ? 'text-purple-700 font-bold' : 'text-gray-600'
              }`}
            >
              {hstateTime ? `${hstateTime.toFixed(1)}ms` : '-'}
            </div>
          </div>

          <div
            className={`p-2 rounded transition-all duration-300 relative ${
              winner === 'context' ? 'bg-green-50 border border-green-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">Context</div>
              {contextTime && rankings.has('context') && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    rankings.get('context') === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : rankings.get('context') === 2
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {rankings.get('context')}.
                </span>
              )}
            </div>
            <div
              className={`text-base font-mono transition-all duration-300 ${
                winner === 'context' ? 'text-green-700 font-bold' : 'text-gray-600'
              }`}
            >
              {contextTime ? `${contextTime.toFixed(1)}ms` : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
