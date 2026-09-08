export function Loader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-6">
        {/* Animated Logo/Circles */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Outer Ring */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 opacity-30 dark:border-slate-700" />

          {/* Middle Ring */}
          <div
            className="absolute inset-3 animate-spin rounded-full border-4 border-r-transparent border-b-transparent border-l-transparent border-t-slate-800 dark:border-t-slate-200"
            style={{ animationDuration: '1.5s' }}
          />

          {/* Inner Ring */}
          <div
            className="absolute inset-6 animate-spin rounded-full border-4 border-t-transparent border-b-transparent border-l-transparent border-r-slate-500 dark:border-r-slate-400"
            style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          />

          {/* Center Dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-pulse rounded-full bg-slate-800 shadow-lg dark:bg-slate-100" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <p className="text-lg font-semibold tracking-wide text-slate-900 dark:text-slate-100">{message}</p>
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-slate-600 dark:bg-slate-300"
              style={{ animationDelay: '0s' }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-slate-500 dark:bg-slate-400"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
