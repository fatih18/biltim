'use client'

import { LuSend, LuSparkles } from 'react-icons/lu'
import { useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import { MessageList } from '../MessageList'

// ============================================================================
// Types
// ============================================================================

interface ChatAreaProps {
  className?: string
  onLoadMoreMessages?: () => void
  isLoadingMoreMessages?: boolean
  hasMoreMessages?: boolean
}

// ============================================================================
// Empty Conversation State
// ============================================================================

function EmptyConversationState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className={cn(
          'w-20 h-20 rounded-3xl mb-6',
          'bg-gradient-to-br from-[#c68e76]/20 to-[#c68e76]/5',
          'dark:from-[#c68e76]/30 dark:to-[#c68e76]/10',
          'flex items-center justify-center',
          'ring-1 ring-[#c68e76]/20'
        )}
      >
        <LuSparkles size={36} className="text-[#c68e76]" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Ready to assist</h2>
      <p className="text-sm text-zinc-500 dark:text-white/50 max-w-sm mb-6">
        Type a message below to continue this conversation. I can help with coding, analysis, and
        more.
      </p>
      <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/30">
        <LuSend size={14} />
        <span>Type your message and press Enter to send</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatArea({
  className,
  onLoadMoreMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
}: ChatAreaProps) {
  const store = useVorionChatStore()

  // Access store properties directly to trigger re-renders
  const selectedId = store.selectedConversationId
  const messagesByConversation = store.messagesByConversation
  // Read streaming state to trigger re-renders during streaming
  void store.isStreaming
  void store.streamingContent

  // Get messages for the selected conversation
  const messages = selectedId ? messagesByConversation[selectedId] || [] : []

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages or Empty State */}
      {messages.length === 0 ? (
        <EmptyConversationState />
      ) : (
        <MessageList
          messages={messages}
          onLoadMore={onLoadMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          hasMore={hasMoreMessages}
        />
      )}
    </div>
  )
}
