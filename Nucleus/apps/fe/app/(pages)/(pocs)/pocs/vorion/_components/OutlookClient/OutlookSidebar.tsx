'use client'

import { useCallback, useRef } from 'react'
import { LuLoader, LuMail, LuUsers } from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { ConversationThread } from './types'

interface OutlookSidebarProps {
  threads: ConversationThread[]
  selectedThread: ConversationThread | null
  onSelectThread: (thread: ConversationThread) => void
  onLoadMore?: () => void
  isLoadingMore?: boolean
  hasMore?: boolean
}

export function OutlookSidebar({
  threads,
  selectedThread,
  onSelectThread,
  onLoadMore,
  isLoadingMore = false,
  hasMore = true,
}: OutlookSidebarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll handler - load more when near bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !onLoadMore || isLoadingMore || !hasMore) return

    const container = scrollContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container

    // When within 100px of bottom, load more
    if (scrollHeight - scrollTop - clientHeight < 100) {
      onLoadMore()
    }
  }, [onLoadMore, isLoadingMore, hasMore])
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) {
      return 'Yesterday'
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    const first = parts[0]
    const second = parts[1]
    if (first && second && first.length > 0 && second.length > 0) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Subtle colored avatars - soft pastel tones
  const getAvatarShade = (key: string) => {
    const shades = [
      'bg-slate-400 dark:bg-slate-600',
      'bg-stone-400 dark:bg-stone-600',
      'bg-zinc-500 dark:bg-zinc-500',
      'bg-neutral-500 dark:bg-neutral-500',
      'bg-sky-400/80 dark:bg-sky-700',
      'bg-teal-400/80 dark:bg-teal-700',
      'bg-indigo-400/80 dark:bg-indigo-700',
      'bg-violet-400/80 dark:bg-violet-700',
    ]
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash)
    }
    return shades[Math.abs(hash) % shades.length]
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Conversations
        </h2>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          {threads.length} contact{threads.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <LuMail className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No conversations</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {threads.map((thread) => {
              const isSelected = selectedThread?.threadKey === thread.threadKey
              const latestMsg = thread.messages[0]

              return (
                <button
                  key={thread.threadKey}
                  type="button"
                  onClick={() => onSelectThread(thread)}
                  className={cn(
                    'w-full px-4 py-3 flex items-start gap-3 text-left transition-all duration-150',
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-l-2 border-zinc-900 dark:border-white'
                      : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent'
                  )}
                >
                  {/* Avatar - different for groups */}
                  {thread.isGroup ? (
                    <div className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900">
                      <LuUsers size={16} />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-white text-xs font-semibold',
                        getAvatarShade(thread.threadKey)
                      )}
                    >
                      {getInitials(thread.threadName)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {thread.isGroup && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                            {thread.participants.length}
                          </span>
                        )}
                        <p
                          className={cn(
                            'text-sm truncate',
                            thread.unreadCount > 0
                              ? 'font-semibold text-zinc-900 dark:text-white'
                              : 'font-medium text-zinc-700 dark:text-zinc-200'
                          )}
                        >
                          {thread.threadName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {thread.unreadCount > 0 && (
                          <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded bg-blue-600 dark:bg-blue-500 text-white text-[9px] font-bold">
                            {thread.unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                          {formatDate(thread.latestDate)}
                        </span>
                      </div>
                    </div>

                    <p
                      className={cn(
                        'text-xs mt-0.5 truncate',
                        thread.unreadCount > 0
                          ? 'text-zinc-700 dark:text-zinc-300'
                          : 'text-zinc-500 dark:text-zinc-400'
                      )}
                    >
                      {latestMsg?.subject || '(No subject)'}
                    </p>

                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                      {latestMsg?.bodyPreview || ''}
                    </p>
                  </div>
                </button>
              )
            })}

            {/* Loading indicator at bottom */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <LuLoader className="h-4 w-4 text-zinc-400 animate-spin mr-2" />
                <span className="text-xs text-zinc-400">Loading more...</span>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && threads.length > 0 && (
              <div className="text-center py-3">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  All conversations loaded
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
