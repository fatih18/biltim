'use client'

import { useEffect, useRef } from 'react'
import { LuLoader } from 'react-icons/lu'
import type { ChatMessage } from '@/app/_store/vorionChatStore'
import { cn } from '@/app/_utils'
import { MessageItem } from '../MessageItem'

// ============================================================================
// Types
// ============================================================================

interface MessageListProps {
  messages: ChatMessage[]
  onLoadMore?: () => void
  isLoadingMore?: boolean
  hasMore?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageList({ messages, onLoadMore, isLoadingMore, hasMore }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isInitialLoadRef = useRef(true)

  // Auto-scroll to bottom on new messages (only for new messages, not when loading older)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      // On initial load, scroll to bottom immediately
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialLoadRef.current = false
    } else {
      // On new message, smooth scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, messages[messages.length - 1]?.content])

  // Maintain scroll position when loading older messages
  useEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0 && !isInitialLoadRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current
      if (scrollDiff > 0) {
        containerRef.current.scrollTop = scrollDiff
      }
    }
  }, [messages.length])

  // Intersection Observer for infinite scroll upward
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasMore && !isLoadingMore) {
          // Save current scroll height before loading more
          if (containerRef.current) {
            prevScrollHeightRef.current = containerRef.current.scrollHeight
          }
          onLoadMore()
        }
      },
      { threshold: 0.1, root: containerRef.current }
    )

    const topElement = topRef.current
    if (topElement) {
      observer.observe(topElement)
    }

    return () => {
      if (topElement) {
        observer.unobserve(topElement)
      }
    }
  }, [hasMore, onLoadMore, isLoadingMore])

  if (messages.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4',
        'overflow-y-auto flex-1'
      )}
    >
      {/* Load More Trigger - At the top */}
      {hasMore && (
        <div ref={topRef} className="py-3 flex items-center justify-center min-h-[48px]">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/40">
              <LuLoader size={16} className="animate-spin text-[#c68e76]" />
              <span>Loading older messages...</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-300 dark:text-white/20">Scroll up for more</span>
          )}
        </div>
      )}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
