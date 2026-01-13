'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuBookOpen,
  LuChevronLeft,
  LuChevronRight,
  LuCommand,
  LuLoader,
  LuMessageSquare,
  LuMonitor,
  LuPencil,
  LuPlus,
  LuSearch,
  LuServer,
  LuTerminal,
  LuTrash2,
  LuVideo,
  LuX,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import type { VorionConversationResponse } from '@/lib/api'
import { ConfirmModal } from '../ConfirmModal'
import { isInternalConversation } from '../constants'

// ============================================================================
// Types
// ============================================================================

interface ChatSidebarProps {
  onNewChat: () => void
  onSelectConversation: (conversationId: string) => void
  onDeleteConversation: (conversationId: string) => void
  onLoadMore?: () => void
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

interface ConversationItemProps {
  conversation: VorionConversationResponse
  isSelected: boolean
  isRenaming?: boolean
  onSelect: () => void
  onDelete: () => void
  onRename?: (newTitle: string) => void
}

// ============================================================================
// Sub-Components
// ============================================================================

function ConversationItem({
  conversation,
  isSelected,
  isRenaming,
  onSelect,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const title = conversation.title || 'New Conversation'
  const messageCount = conversation.message_count || 0
  const lastMessageAt = conversation.last_message_at
    ? new Date(conversation.last_message_at).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commitRename = useCallback(() => {
    const next = draftTitle.trim()
    setIsEditing(false)
    if (!next || next === title) {
      setDraftTitle(title)
      return
    }
    if (onRename) {
      onRename(next)
    }
  }, [draftTitle, title, onRename])

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setDraftTitle(title)
      setIsEditing(true)
    },
    [title]
  )

  return (
    <div
      className={cn(
        'group relative w-full rounded-xl overflow-hidden',
        'transition-all duration-200 ease-out',
        isSelected
          ? 'bg-gradient-to-r from-[#c68e76]/10 to-[#c68e76]/5 dark:from-[#c68e76]/15 dark:to-[#c68e76]/5'
          : 'hover:bg-zinc-100/80 dark:hover:bg-white/5'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200',
          isSelected ? 'h-8 bg-[#c68e76]' : 'h-0 bg-transparent'
        )}
      />

      {/* Full-row select button behind content */}
      {!isEditing && (
        <button
          type="button"
          onClick={onSelect}
          className="absolute inset-0 z-0"
          aria-label={`Select conversation: ${title}`}
        />
      )}

      <div className="flex items-start gap-3 p-3 pl-4">
        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
          {/* Title row */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setIsEditing(false)
                    setDraftTitle(title)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'flex-1 px-2 py-1 rounded-md text-sm font-medium',
                  'bg-white dark:bg-zinc-800',
                  'border border-[#c68e76]/50',
                  'text-zinc-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/30',
                  'shadow-sm',
                  'pointer-events-auto'
                )}
                placeholder="Conversation name..."
              />
              <span className="text-[10px] text-zinc-400 whitespace-nowrap">Enter to save</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p
                onDoubleClick={startEditing}
                className={cn(
                  'text-[13px] font-medium truncate cursor-default',
                  isSelected ? 'text-[#c68e76]' : 'text-zinc-800 dark:text-white/90'
                )}
                title="Double-click to rename"
              >
                {isRenaming ? (
                  <span className="flex items-center gap-1.5">
                    <LuLoader size={12} className="animate-spin" />
                    Saving...
                  </span>
                ) : (
                  title
                )}
              </p>
              {!isRenaming && onRename && (
                <button
                  type="button"
                  onClick={startEditing}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 pointer-events-auto',
                    'p-1 rounded-md',
                    'text-zinc-400 hover:text-[#c68e76]',
                    'hover:bg-[#c68e76]/10',
                    'transition-all duration-150'
                  )}
                  aria-label="Rename conversation"
                  title="Rename"
                >
                  <LuPencil size={11} />
                </button>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={cn(
                'text-[11px]',
                isSelected ? 'text-[#c68e76]/70' : 'text-zinc-400 dark:text-white/40'
              )}
            >
              {messageCount} messages
            </span>
            {lastMessageAt && (
              <>
                <span className="text-zinc-300 dark:text-white/20 text-[11px]">•</span>
                <span
                  className={cn(
                    'text-[11px]',
                    isSelected ? 'text-[#c68e76]/70' : 'text-zinc-400 dark:text-white/40'
                  )}
                >
                  {lastMessageAt}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={cn(
              'p-1.5 rounded-md pointer-events-auto',
              'text-zinc-400 hover:text-red-500',
              'hover:bg-red-50 dark:hover:bg-red-500/10',
              'transition-colors'
            )}
            aria-label="Delete conversation"
            title="Delete"
          >
            <LuTrash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <LuSearch
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/40"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations..."
        className={cn(
          'w-full pl-9 pr-3 py-2 rounded-lg text-sm',
          'bg-zinc-100 dark:bg-white/5',
          'border border-zinc-200 dark:border-white/10',
          'text-zinc-900 dark:text-white',
          'placeholder:text-zinc-400 dark:placeholder:text-white/40',
          'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
          'transition-all duration-200'
        )}
      />
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatSidebar({
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onLoadMore,
  isLoading,
  isLoadingMore,
  hasMore = false,
  isMobileOpen = false,
  onMobileClose,
}: ChatSidebarProps) {
  const store = useVorionChatStore()
  const actions = useGenericApiActions()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<VorionConversationResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [showWorkspaceLinks, setShowWorkspaceLinks] = useState(false)

  // Filter conversations:
  // 1. Hide internal/system conversations (meeting analyzer, etc.)
  // 2. Apply search query filter
  const filteredConversations = store.conversations.filter((conv) => {
    const title = conv.title || ''

    // Always hide internal conversations from the main list
    if (isInternalConversation(title)) return false

    // Apply search filter
    if (!searchQuery) return true
    return title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Debug: see what sidebar sees vs store
  useEffect(() => {
    console.log('[ChatSidebar] conversations', {
      raw: store.conversations.length,
      filtered: filteredConversations.length,
      searchQuery,
    })
  }, [store.conversations.length, filteredConversations.length, searchQuery])

  // If first page only contains internal/filtered-out conversations, auto-load more
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoadingMore) return
    if (filteredConversations.length > 0) return
    if (store.conversations.length === 0) return

    // We have conversations but none are visible (likely all internal) – try loading next page
    onLoadMore()
  }, [hasMore, onLoadMore, isLoadingMore, filteredConversations.length, store.conversations.length])

  const handleCollapse = useCallback(() => {
    store.setSidebarCollapsed(!store.isSidebarCollapsed)
  }, [store.isSidebarCollapsed])

  const handleRenameConversation = (conversationId: string, newTitle: string) => {
    const title = newTitle.trim()
    if (!title) return

    setRenamingConversationId(conversationId)

    actions.VORION_UPDATE_CONVERSATION?.start({
      payload: { _conversation_id: conversationId, title },
      onAfterHandle: (data) => {
        setRenamingConversationId(null)
        if (data) {
          store.updateConversation(data)
          toast.success('Conversation renamed')
        }
      },
      onErrorHandle: (error: unknown, _code: number | null) => {
        setRenamingConversationId(null)

        let message = 'Failed to rename conversation'
        if (typeof error === 'string') {
          message = error
        } else if (
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ) {
          message = (error as { message?: unknown }).message as string
        }

        toast.error('Failed to rename conversation', {
          description: message,
        })
      },
    })
  }

  // Handle conversation selection with mobile close
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      onSelectConversation(conversationId)
      // On mobile, close the sidebar after selection
      onMobileClose?.()
    },
    [onSelectConversation, onMobileClose]
  )

  // Handle delete with confirmation
  const handleDeleteClick = useCallback((conv: VorionConversationResponse) => {
    setDeleteTarget(conv)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    setIsDeleting(true)
    onDeleteConversation(deleteTarget.id)
    // Reset state after a short delay
    setTimeout(() => {
      setDeleteTarget(null)
      setIsDeleting(false)
    }, 500)
  }, [deleteTarget, onDeleteConversation])

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  // Infinite scroll - Intersection Observer
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1, root: listRef.current }
    )

    const loadMoreElement = loadMoreRef.current
    if (loadMoreElement) {
      observer.observe(loadMoreElement)
    }

    return () => {
      if (loadMoreElement) {
        observer.unobserve(loadMoreElement)
      }
    }
  }, [hasMore, onLoadMore, isLoadingMore])

  // Collapsed state - Hidden on mobile (we have a separate menu button)
  if (store.isSidebarCollapsed) {
    return (
      <aside
        className={cn(
          // Hidden on mobile, only show on desktop
          'hidden md:flex flex-col items-center py-4 gap-2',
          'w-14 h-full',
          'bg-white dark:bg-zinc-900',
          'border-r border-zinc-200 dark:border-white/10',
          'transition-all duration-300'
        )}
      >
        <button
          type="button"
          onClick={handleCollapse}
          className={cn(
            'p-2 rounded-lg',
            'text-zinc-600 dark:text-white/60',
            'hover:bg-zinc-100 dark:hover:bg-white/5',
            'transition-colors duration-200'
          )}
          aria-label="Expand sidebar"
        >
          <LuChevronRight size={20} />
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            'p-2 rounded-lg',
            'text-[#c68e76] bg-[#c68e76]/10',
            'hover:bg-[#c68e76]/20',
            'transition-colors duration-200'
          )}
          aria-label="New chat"
        >
          <LuPlus size={20} />
        </button>
      </aside>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/20 z-40 md:hidden cursor-default"
          onClick={onMobileClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          'flex flex-col h-full',
          'bg-white dark:bg-zinc-900',
          'transition-all duration-300',
          // Mobile: Fixed overlay that doesn't affect layout
          'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm',
          // Desktop: Relative positioning in flex layout
          'md:relative md:z-auto md:w-72 lg:w-80',
          'border-r border-zinc-200 dark:border-white/10',
          // Mobile visibility - slide in/out
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header - Vorion Branding */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/10">
          {/* Top row: Logo + close/collapse */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Vorion
            </h1>
            <div className="flex items-center gap-1">
              {/* Mobile: Close button */}
              <button
                type="button"
                onClick={onMobileClose}
                className={cn(
                  'p-1.5 rounded-lg md:hidden',
                  'text-zinc-400 dark:text-white/40',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors duration-200'
                )}
                aria-label="Close sidebar"
              >
                <LuX size={18} />
              </button>
              {/* Desktop: Collapse button */}
              <button
                type="button"
                onClick={handleCollapse}
                className={cn(
                  'p-1.5 rounded-lg hidden md:flex',
                  'text-zinc-400 dark:text-white/40',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors duration-200'
                )}
                aria-label="Collapse sidebar"
              >
                <LuChevronLeft size={18} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* New Conversation */}
            <button
              type="button"
              onClick={onNewChat}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl',
                'bg-[#c68e76]/10 hover:bg-[#c68e76]/20',
                'border border-[#c68e76]/20 hover:border-[#c68e76]/30',
                'transition-all duration-200',
                'group'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'p-1.5 rounded-lg',
                    'bg-[#c68e76]/20 group-hover:bg-[#c68e76]/30',
                    'transition-colors'
                  )}
                >
                  <LuPlus size={14} className="text-[#c68e76]" />
                </div>
                <span className="text-sm font-medium text-[#c68e76]">New conversation</span>
              </div>
              <kbd
                className={cn(
                  'hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                  'bg-[#c68e76]/10 border border-[#c68e76]/20',
                  'text-[10px] font-medium text-[#c68e76]/70'
                )}
              >
                <LuCommand size={10} />4
              </kbd>
            </button>

            {/* Workspace section - compact & collapsible */}
            <div className="pt-1 border-t border-zinc-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowWorkspaceLinks((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-white/50">
                  Workspace
                </span>
                <LuChevronRight
                  size={14}
                  className={cn(
                    'text-zinc-400 transition-transform',
                    showWorkspaceLinks && 'rotate-90'
                  )}
                />
              </button>

              <div
                className={cn(
                  'grid transition-all duration-200 ease-out',
                  showWorkspaceLinks
                    ? 'grid-rows-[1fr] opacity-100 mt-1'
                    : 'grid-rows-[0fr] opacity-0 mt-0'
                )}
              >
                <nav className="overflow-hidden space-y-0.5">
                  <Link
                    href="/pocs/vorion/workflows/1"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <LuLoader size={14} className="text-zinc-500 dark:text-white/60" />
                    <span>Workflows</span>
                  </Link>

                  <Link
                    href="/pocs/vorion/analyzer"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LuVideo size={14} className="text-zinc-500 dark:text-white/60" />
                        <span>Meet Analyzer</span>
                      </span>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">
                        Beta
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/pocs/vorion/api-sandbox"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <LuTerminal size={14} className="text-zinc-500 dark:text-white/60" />
                    <span>API Sandbox</span>
                  </Link>

                  <Link
                    href="/pocs/vorion/computer-use"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LuMonitor size={14} className="text-zinc-500 dark:text-white/60" />
                        <span>Computer Use</span>
                      </span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
                        Beta
                      </span>
                    </div>
                  </Link>

                  {/* Coming soon items */}
                  <button
                    type="button"
                    disabled
                    className={cn(
                      'flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-500 dark:text-white/60',
                      'bg-zinc-50/70 dark:bg-white/[0.02]',
                      'border border-dashed border-zinc-200 dark:border-white/10',
                      'cursor-default'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <LuTerminal size={14} className="text-zinc-500 dark:text-white/60" />
                      <span>Multi-Agent System</span>
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      Coming soon
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className={cn(
                      'flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-500 dark:text-white/60',
                      'bg-zinc-50/70 dark:bg-white/[0.02]',
                      'border border-dashed border-zinc-200 dark:border-white/10',
                      'cursor-default'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <LuMessageSquare size={14} className="text-zinc-500 dark:text-white/60" />
                      <span>Chatbots</span>
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      Coming soon
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className={cn(
                      'flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-500 dark:text-white/60',
                      'bg-zinc-50/70 dark:bg-white/[0.02]',
                      'border border-dashed border-zinc-200 dark:border-white/10',
                      'cursor-default'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <LuLoader size={14} className="text-zinc-500 dark:text-white/60" />
                      <span>Widgets</span>
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      Coming soon
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className={cn(
                      'flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-500 dark:text-white/60',
                      'bg-zinc-50/70 dark:bg-white/[0.02]',
                      'border border-dashed border-zinc-200 dark:border-white/10',
                      'cursor-default'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <LuServer size={14} className="text-zinc-500 dark:text-white/60" />
                      <span>Marketplace</span>
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      Coming soon
                    </span>
                  </button>

                  <Link
                    href="/pocs/vorion/knowledgebases"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <LuBookOpen size={14} className="text-zinc-500 dark:text-white/60" />
                    <span>Knowledge Bases</span>
                  </Link>

                  <Link
                    href="/pocs/vorion/tools"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <LuTerminal size={14} className="text-zinc-500 dark:text-white/60" />
                    <span>Tools</span>
                  </Link>

                  <Link
                    href="/pocs/vorion/mcp-servers"
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm',
                      'text-zinc-700 dark:text-white/80',
                      'hover:bg-zinc-50 dark:hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <LuServer size={14} className="text-zinc-500 dark:text-white/60" />
                    <span>MCP Servers</span>
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-100 dark:border-white/5">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Conversations List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Initial loading - only when list is empty */}
          {isLoading && filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#c68e76]/30 border-t-[#c68e76] rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <LuMessageSquare
                size={32}
                className="mx-auto mb-2 text-zinc-300 dark:text-white/20"
              />
              <p className="text-sm text-zinc-500 dark:text-white/40">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={onNewChat}
                  className="mt-2 text-sm text-[#c68e76] hover:underline"
                >
                  Start a new chat
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Conversation Items */}
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={store.selectedConversationId === conv.id}
                  isRenaming={renamingConversationId === conv.id}
                  onSelect={() => handleSelectConversation(conv.id)}
                  onDelete={() => handleDeleteClick(conv)}
                  onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                />
              ))}

              {/* Load More Trigger - At the bottom */}
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="py-3 flex items-center justify-center min-h-[48px]"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/40">
                      <LuLoader size={16} className="animate-spin text-[#c68e76]" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-300 dark:text-white/20">
                      Scroll for more
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Conversation"
        description={`"${deleteTarget?.title || 'This conversation'}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
