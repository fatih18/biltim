'use client'

import { useMemo, useState } from 'react'
import {
  LuActivity,
  LuCheck,
  LuClock,
  LuCopy,
  LuMessageSquare,
  LuSparkles,
  LuZap,
} from 'react-icons/lu'
import { useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'

// ============================================================================
// Main Component
// ============================================================================

export function ConversationHeader() {
  const store = useVorionChatStore()
  const [copiedId, setCopiedId] = useState(false)

  // Access store properties directly to trigger re-renders
  const selectedId = store.selectedConversationId
  const conversations = store.conversations
  const messagesByConversation = store.messagesByConversation
  const isStreaming = store.isStreaming

  // Find the current conversation
  const conversation = selectedId ? conversations.find((c) => c.id === selectedId) : null

  // Calculate real-time stats from messages
  const stats = useMemo(() => {
    if (!selectedId) return { messageCount: 0, totalTokens: 0, lastModel: null, lastProvider: null }

    const messages = messagesByConversation[selectedId] || []
    const assistantMessages = messages.filter((m) => m.role === 'assistant' && !m.isError)

    const totalTokens = assistantMessages.reduce((sum, m) => sum + (m.totalTokens || 0), 0)
    const lastAssistant = assistantMessages[assistantMessages.length - 1]

    return {
      messageCount: messages.length,
      totalTokens,
      lastModel: lastAssistant?.modelName || null,
      lastProvider: lastAssistant?.modelProvider || null,
    }
  }, [selectedId, messagesByConversation])

  if (!conversation) return null

  const lastMessageAt = conversation.last_message_at ? new Date(conversation.last_message_at) : null

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTokens = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
      {/* Title Section */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0" />
        <h2
          className={cn(
            'text-sm font-semibold truncate',
            'max-w-[120px] sm:max-w-[180px] md:max-w-[280px]',
            'text-zinc-800 dark:text-white'
          )}
        >
          {conversation.title || 'New Conversation'}
        </h2>

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex-shrink-0">
            <LuActivity
              size={10}
              className="text-emerald-600 dark:text-emerald-400 animate-pulse"
            />
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="hidden sm:flex items-center gap-1 ml-auto">
        {/* Messages */}
        {stats.messageCount > 0 && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'bg-zinc-100/80 dark:bg-white/5',
              'border border-zinc-200/50 dark:border-white/5'
            )}
          >
            <LuMessageSquare size={12} className="text-zinc-400 dark:text-white/40" />
            <span className="text-xs font-medium text-zinc-600 dark:text-white/60 tabular-nums">
              {stats.messageCount}
            </span>
          </div>
        )}

        {/* Tokens */}
        {stats.totalTokens > 0 && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'bg-gradient-to-r from-[#c68e76]/10 to-[#c68e76]/5',
              'dark:from-[#c68e76]/20 dark:to-[#c68e76]/10',
              'border border-[#c68e76]/20 dark:border-[#c68e76]/30'
            )}
          >
            <LuSparkles size={12} className="text-[#c68e76]" />
            <span className="text-xs font-semibold text-[#c68e76] tabular-nums">
              {formatTokens(stats.totalTokens)}
            </span>
          </div>
        )}

        {/* Model */}
        {stats.lastModel && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'bg-violet-50 dark:bg-violet-500/10',
              'border border-violet-200/50 dark:border-violet-500/20'
            )}
          >
            <LuZap size={12} className="text-violet-500 dark:text-violet-400" />
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400 truncate max-w-[120px]">
              {stats.lastModel}
            </span>
          </div>
        )}

        {/* Time */}
        {lastMessageAt && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'bg-zinc-50 dark:bg-white/[0.02]',
              'border border-zinc-200/30 dark:border-white/5'
            )}
          >
            <LuClock size={12} className="text-zinc-400 dark:text-white/30" />
            <span className="text-xs text-zinc-500 dark:text-white/40">
              {formatTime(lastMessageAt)}
            </span>
          </div>
        )}

        {/* Conversation ID - Copyable */}
        {conversation.id && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(conversation.id)
              setCopiedId(true)
              setTimeout(() => setCopiedId(false), 2000)
            }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'border transition-all duration-200',
              copiedId
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200/30 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5'
            )}
            title="Copy conversation ID"
          >
            {copiedId ? (
              <LuCheck size={12} className="text-emerald-500" />
            ) : (
              <LuCopy size={12} className="text-zinc-400 dark:text-white/30" />
            )}
            <span
              className={cn(
                'text-xs font-mono truncate max-w-[80px]',
                copiedId
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-white/40'
              )}
            >
              {copiedId ? 'Copied!' : `${conversation.id.slice(0, 8)}...`}
            </span>
          </button>
        )}
      </div>

      {/* Mobile Stats - Ultra Compact */}
      <div className="flex sm:hidden items-center gap-1 ml-auto flex-shrink-0">
        {stats.totalTokens > 0 && (
          <span className="text-[10px] text-[#c68e76] font-medium tabular-nums">
            {formatTokens(stats.totalTokens)}
          </span>
        )}
        {stats.messageCount > 0 && (
          <>
            <span className="text-zinc-300 dark:text-white/20">•</span>
            <span className="text-[10px] text-zinc-500 dark:text-white/50 tabular-nums">
              {stats.messageCount}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
