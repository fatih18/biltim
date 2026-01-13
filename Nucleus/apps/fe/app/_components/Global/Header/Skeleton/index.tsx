import { nanoid } from 'nanoid'
import type { JSX } from 'react'
import { cn } from '@/app/_utils'

export type SkeletonHeaderProps = {
  className?: string
}

export function SkeletonHeader({ className }: SkeletonHeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'h-24 sticky top-0 z-40 w-full transition-all border-b border-slate-100 backdrop-blur-xl bg-gray-900/80',
        className
      )}
    >
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        {/* Logo skeleton */}
        <div className="flex items-center mr-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-200 p-2 rounded-lg w-8 h-8 animate-pulse" />
            <div className="h-5 bg-slate-200 rounded-md w-32 animate-pulse" />
          </div>
        </div>

        {/* Desktop navigation skeleton */}
        <div className="hidden xl:flex items-center space-x-2">
          {Array.from({ length: 5 }).map((_) => (
            <div key={`nav-skeleton-${nanoid()}`} className="flex items-center px-3 py-2">
              <div className="w-5 h-5 mr-2 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-4 bg-slate-200 rounded-md w-16 animate-pulse" />
            </div>
          ))}
        </div>

        {/* User section skeleton - Desktop */}
        <div className="hidden xl:flex items-center gap-4 ml-auto">
          <div className="flex items-center border-r border-slate-200 pr-4 mr-4">
            <div className="rounded-full w-8 h-8 bg-slate-200 animate-pulse mr-3" />
            <div className="flex flex-col gap-1">
              <div className="h-3 bg-slate-200 rounded-md w-24 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <div className="h-3 bg-slate-200 rounded-full w-10 animate-pulse mt-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-8 bg-slate-200 rounded-md w-20 animate-pulse" />
        </div>

        {/* Mobile hamburger skeleton */}
        <div className="xl:hidden flex items-center justify-end ml-auto">
          <div className="w-10 h-10 bg-slate-200 rounded-md animate-pulse" />
        </div>
      </div>
    </header>
  )
}

export function SkeletonMobileMenu(): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
      <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl p-4">
        {/* User profile skeleton */}
        <div className="px-4 py-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full w-10 h-10 bg-slate-200 animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="h-4 bg-slate-200 rounded-md w-32 animate-pulse" />
              <div className="flex items-center gap-2 mt-1">
                <div className="h-4 bg-slate-200 rounded-full w-12 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="w-full h-10 bg-slate-200 rounded-md animate-pulse mt-4" />
        </div>

        {/* Mobile navigation skeleton */}
        <div className="flex flex-col space-y-1 mt-4 px-2">
          {Array.from({ length: 5 }).map((_) => (
            <div
              key={`mobile-nav-skeleton-${nanoid()}`}
              className="flex items-center px-3 py-3 rounded-md"
            >
              <div className="w-5 h-5 mr-3 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-4 bg-slate-200 rounded-md w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
