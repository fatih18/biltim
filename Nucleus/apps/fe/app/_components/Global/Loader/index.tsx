export function Loader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-6">
        {/* Animated Logo/Circles */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Outer Ring */}
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full animate-spin opacity-30" />

          {/* Middle Ring */}
          <div
            className="absolute inset-3 border-4 border-t-gray-800 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"
            style={{ animationDuration: '1.5s' }}
          />

          {/* Inner Ring */}
          <div
            className="absolute inset-6 border-4 border-t-transparent border-r-gray-600 border-b-transparent border-l-transparent rounded-full animate-spin"
            style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          />

          {/* Center Dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full animate-pulse shadow-lg" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <p className="text-gray-900 font-semibold text-lg tracking-wide">{message}</p>
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
              style={{ animationDelay: '0s' }}
            />
            <span
              className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
