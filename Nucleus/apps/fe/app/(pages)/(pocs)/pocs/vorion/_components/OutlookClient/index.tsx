'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LuLoader, LuMail, LuRefreshCw, LuX } from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useTextAreaStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import { OutlookChatView } from './OutlookChatView'
import { OutlookSidebar } from './OutlookSidebar'
import type { ConversationThread, OutlookMessage } from './types'

export function OutlookClient() {
  const store = useTextAreaStore()
  const actions = useGenericApiActions()

  const [messages, setMessages] = useState<OutlookMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Selected thread - stored separately to prevent sidebar pagination from affecting it
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null)
  const [selectedThreadMessages, setSelectedThreadMessages] = useState<OutlookMessage[]>([])
  const [selectedThreadMeta, setSelectedThreadMeta] = useState<{
    threadName: string
    isGroup: boolean
    participants: Array<{ name: string | null; address: string | null }>
  } | null>(null)

  // Sidebar (conversation list) pagination
  const [sidebarHasMore, setSidebarHasMore] = useState(true)
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false)

  // Thread (selected conversation) pagination
  const [loadingMoreFor, setLoadingMoreFor] = useState<string | null>(null)
  const [threadHasMore, setThreadHasMore] = useState<Record<string, boolean>>({})

  const containerRef = useRef<HTMLDivElement>(null)

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const closeOverlay = () => {
    setIsVisible(false)
    setTimeout(() => {
      store.isOutlookOverlayOpen = false
    }, 400)
  }

  const loadMessages = () => {
    if (!actions.GET_AZURE_MAIL_MESSAGES) {
      setError('Outlook integration is not available')
      return
    }

    setIsLoading(true)
    setError(null)

    actions.GET_AZURE_MAIL_MESSAGES.start({
      disableAutoRedirect: true,
      payload: { top: 50 },
      onAfterHandle: (data) => {
        const items = data?.data ?? []
        setMessages(items)
        setIsLoading(false)
      },
      onErrorHandle: (err) => {
        console.log('Failed to load Outlook messages:', err)
        setIsLoading(false)
        setError('Failed to load Outlook messages')
        toast.error('Failed to load Outlook messages')
      },
    })
  }

  useEffect(() => {
    loadMessages()
  }, [])

  // Load more messages for sidebar (all inbox, no filter)
  const loadMoreSidebarMessages = () => {
    if (!actions.GET_AZURE_MAIL_MESSAGES) return
    if (isLoadingSidebar) return
    if (!sidebarHasMore) return

    setIsLoadingSidebar(true)

    actions.GET_AZURE_MAIL_MESSAGES.start({
      disableAutoRedirect: true,
      payload: { top: 30, skip: messages.length },
      onAfterHandle: (data) => {
        const newItems = (data?.data ?? []) as OutlookMessage[]

        if (newItems.length === 0) {
          setSidebarHasMore(false)
        } else {
          // Merge without duplicates
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const uniqueNew = newItems.filter((m) => !existingIds.has(m.id))
            return [...prev, ...uniqueNew]
          })
        }

        setIsLoadingSidebar(false)
      },
      onErrorHandle: (err) => {
        console.log('Failed to load more sidebar messages:', err)
        setIsLoadingSidebar(false)
      },
    })
  }

  // Load more messages for a specific sender (infinite scroll)
  const loadMoreForSender = (senderEmail: string, currentCount: number) => {
    if (!actions.GET_AZURE_MAIL_MESSAGES) return
    if (loadingMoreFor === senderEmail) return // Already loading
    if (threadHasMore[senderEmail] === false) return // No more messages

    setLoadingMoreFor(senderEmail)

    actions.GET_AZURE_MAIL_MESSAGES.start({
      disableAutoRedirect: true,
      payload: { top: 20, skip: currentCount, senderEmail },
      onAfterHandle: (data) => {
        const newItems = (data?.data ?? []) as OutlookMessage[]

        if (newItems.length === 0) {
          // No more messages for this sender
          setThreadHasMore((prev) => ({ ...prev, [senderEmail]: false }))
        } else {
          // Merge new messages (avoid duplicates by id)
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const uniqueNew = newItems.filter((m) => !existingIds.has(m.id))
            return [...prev, ...uniqueNew]
          })
        }

        setLoadingMoreFor(null)
      },
      onErrorHandle: (err) => {
        console.log('Failed to load more messages:', err)
        setLoadingMoreFor(null)
      },
    })
  }

  // Reply state
  const [isReplying, setIsReplying] = useState(false)

  // Handle reply to email
  const handleReply = (params: {
    subject: string
    body: string
    to: Array<{ address: string; name?: string | null }>
    cc?: Array<{ address: string; name?: string | null }>
    mode: 'reply' | 'replyAll' | 'new'
    attachments?: Array<{ name: string; contentType?: string | null; contentBase64: string }>
  }) => {
    if (!actions.SEND_AZURE_MAIL) {
      toast.error('Reply feature is not available')
      return
    }

    if (params.to.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }

    setIsReplying(true)

    actions.SEND_AZURE_MAIL.start({
      disableAutoRedirect: true,
      payload: {
        subject: params.subject,
        body: params.body,
        to: params.to,
        cc: params.cc,
        mode: params.mode,
        attachments: params.attachments,
      },
      onAfterHandle: () => {
        toast.success(params.mode === 'replyAll' ? 'Reply sent to all' : 'Reply sent')
        setIsReplying(false)
        // Refresh messages to show the sent reply
        loadMessages()
      },
      onErrorHandle: (err) => {
        console.log('Failed to send reply:', err)
        toast.error('Failed to send reply')
        setIsReplying(false)
      },
    })
  }

  // Group messages - smart grouping:
  // 1. First group by conversationId
  // 2. If a conversation has only 1 unique sender (notifications), merge by sender
  // 3. If a conversation has 2+ unique senders (real conversation), keep separate
  const threads = useMemo<ConversationThread[]>(() => {
    // Step 1: Group by conversationId first
    const convMap = new Map<string, OutlookMessage[]>()
    for (const msg of messages) {
      const convId = msg.conversationId || msg.id
      if (!convMap.has(convId)) {
        convMap.set(convId, [])
      }
      convMap.get(convId)?.push(msg)
    }

    // Step 2: Analyze each conversation and decide grouping strategy
    const finalThreadMap = new Map<string, ConversationThread>()

    for (const [convId, convMessages] of convMap.entries()) {
      // Count unique senders in this conversation
      const uniqueSenders = new Set(
        convMessages.map((m) => (m.fromAddress || m.from || '').toLowerCase())
      )

      // If only 1 unique sender, group by sender (notification style)
      // If 2+ unique senders, it's a real conversation - keep by conversationId
      const isRealConversation = uniqueSenders.size > 1
      const groupKey = isRealConversation
        ? convId // Keep conversationId for real conversations
        : Array.from(uniqueSenders)[0] || convId // Group by sender for notifications

      if (!finalThreadMap.has(groupKey)) {
        finalThreadMap.set(groupKey, {
          threadKey: groupKey,
          threadName: '',
          isGroup: false,
          participants: [],
          messages: [],
          latestDate: '',
          unreadCount: 0,
        })
      }

      const thread = finalThreadMap.get(groupKey)
      if (!thread) continue

      // Add all messages from this conversation
      for (const msg of convMessages) {
        thread.messages.push(msg)
        if (!msg.isRead) {
          thread.unreadCount++
        }
        // Update latest date
        if (!thread.latestDate || new Date(msg.receivedDateTime) > new Date(thread.latestDate)) {
          thread.latestDate = msg.receivedDateTime
        }
      }
    }

    // Step 3: Compute participants and names for each final thread
    for (const thread of finalThreadMap.values()) {
      const participantMap = new Map<string, { name: string | null; address: string | null }>()
      const senderSet = new Set<string>()

      for (const msg of thread.messages) {
        // Track unique senders
        if (msg.fromAddress) {
          senderSet.add(msg.fromAddress.toLowerCase())
          const key = msg.fromAddress.toLowerCase()
          if (!participantMap.has(key)) {
            participantMap.set(key, { name: msg.from, address: msg.fromAddress })
          }
        }

        // Add to recipients
        for (const r of msg.toRecipients || []) {
          if (r.address) {
            const key = r.address.toLowerCase()
            if (!participantMap.has(key)) {
              participantMap.set(key, { name: r.name, address: r.address })
            }
          }
        }

        // Add cc recipients
        for (const r of msg.ccRecipients || []) {
          if (r.address) {
            const key = r.address.toLowerCase()
            if (!participantMap.has(key)) {
              participantMap.set(key, { name: r.name, address: r.address })
            }
          }
        }
      }

      thread.participants = Array.from(participantMap.values())

      // Determine if it's a group conversation (multiple unique senders actively participating)
      thread.isGroup = senderSet.size > 1

      // Build thread name
      if (thread.isGroup) {
        // Show sender names for group conversations
        const senderNames = thread.participants
          .filter((p) => p.address && senderSet.has(p.address.toLowerCase()))
          .slice(0, 3)
          .map((p) => p.name?.split(' ')[0] || p.address?.split('@')[0] || 'Unknown')
        thread.threadName = senderNames.join(', ') + (senderSet.size > 3 ? '...' : '')
      } else {
        // Single sender - use sender name
        const firstMsg = thread.messages[0]
        thread.threadName = firstMsg?.from || firstMsg?.fromAddress || 'Unknown'
      }
    }

    // Sort threads by latest message date (newest first)
    return Array.from(finalThreadMap.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    )
  }, [messages])

  // Build selected thread from separate state (prevents sidebar pagination from affecting it)
  const selectedThread = useMemo<ConversationThread | null>(() => {
    if (!selectedThreadKey || !selectedThreadMeta) return null
    return {
      threadKey: selectedThreadKey,
      threadName: selectedThreadMeta.threadName,
      isGroup: selectedThreadMeta.isGroup,
      participants: selectedThreadMeta.participants,
      messages: selectedThreadMessages,
      latestDate: selectedThreadMessages[0]?.receivedDateTime ?? '',
      unreadCount: selectedThreadMessages.filter((m) => !m.isRead).length,
    }
  }, [selectedThreadKey, selectedThreadMeta, selectedThreadMessages])

  // Handle thread selection - load all messages for that thread
  const handleSelectThread = (thread: ConversationThread) => {
    // Set initial state from sidebar
    setSelectedThreadKey(thread.threadKey)
    setSelectedThreadMessages([...thread.messages])
    setSelectedThreadMeta({
      threadName: thread.threadName,
      isGroup: thread.isGroup,
      participants: thread.participants,
    })

    // If this is a single-sender thread (notifications grouped by sender),
    // load more messages from that sender to get full conversation
    if (!thread.isGroup && thread.participants[0]?.address) {
      const senderEmail = thread.participants[0].address
      loadMessagesForThread(senderEmail, thread.messages)
    }
  }

  // Load all messages for a specific thread/sender
  const loadMessagesForThread = (senderEmail: string, currentMessages: OutlookMessage[]) => {
    if (!actions.GET_AZURE_MAIL_MESSAGES) return

    actions.GET_AZURE_MAIL_MESSAGES.start({
      disableAutoRedirect: true,
      payload: { top: 50, senderEmail },
      onAfterHandle: (data) => {
        const newItems = data?.data ?? []
        if (newItems.length > 0) {
          // Merge with current messages, avoiding duplicates
          const existingIds = new Set(currentMessages.map((m) => m.id))
          const allMessages = [
            ...currentMessages,
            ...newItems.filter((m: OutlookMessage) => !existingIds.has(m.id)),
          ]
          // Sort by date
          allMessages.sort(
            (a, b) =>
              new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
          )
          setSelectedThreadMessages(allMessages)
        }
      },
      onErrorHandle: (err) => {
        console.log('Failed to load thread messages:', err)
      },
    })
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Outlook Email Client"
      className="fixed inset-0 z-50"
      style={{
        backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0)',
        transition: 'background-color 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          closeOverlay()
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          closeOverlay()
        }
      }}
    >
      <div
        className={cn('absolute inset-0', 'bg-white dark:bg-zinc-950', 'flex flex-col')}
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isVisible ? 1 : 0,
          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out',
        }}
      >
        {/* Header - Monochrome Professional */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-3',
            'border-b border-zinc-200 dark:border-zinc-800',
            'bg-zinc-50 dark:bg-zinc-900'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <LuMail size={18} className="text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight">
                Inbox
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Microsoft Outlook</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadMessages}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                'text-xs font-medium',
                'text-zinc-600 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                'active:bg-zinc-200 dark:active:bg-zinc-700',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <LuRefreshCw size={12} className={cn(isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button
              type="button"
              onClick={closeOverlay}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-md',
                'text-zinc-500 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                'hover:text-zinc-900 dark:hover:text-white',
                'active:bg-zinc-200 dark:active:bg-zinc-700',
                'transition-colors duration-150'
              )}
              aria-label="Close"
            >
              <LuX size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
              <div className="flex flex-col items-center gap-3 text-center">
                <LuLoader className="h-6 w-6 text-zinc-400 animate-spin" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading inbox...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                  <LuMail className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{error}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Check your Azure connection in Settings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadMessages}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                    'border border-zinc-300 dark:border-zinc-600',
                    'text-xs font-medium text-zinc-700 dark:text-zinc-300',
                    'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    'transition-colors duration-150'
                  )}
                >
                  <LuRefreshCw size={12} />
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar - Conversations */}
              <div
                className={cn(
                  'w-72 lg:w-80 xl:w-96 flex-shrink-0',
                  'border-r border-zinc-200 dark:border-zinc-800',
                  'bg-zinc-50 dark:bg-zinc-900'
                )}
              >
                <OutlookSidebar
                  threads={threads}
                  selectedThread={selectedThread}
                  onSelectThread={handleSelectThread}
                  onLoadMore={loadMoreSidebarMessages}
                  isLoadingMore={isLoadingSidebar}
                  hasMore={sidebarHasMore}
                />
              </div>

              {/* Main content - Chat view */}
              <div className="flex-1 min-w-0 bg-white dark:bg-zinc-950">
                <OutlookChatView
                  thread={selectedThread}
                  onLoadMore={loadMoreForSender}
                  isLoadingMore={loadingMoreFor === selectedThread?.threadKey}
                  hasMore={threadHasMore[selectedThread?.threadKey ?? ''] !== false}
                  onReply={handleReply}
                  isReplying={isReplying}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { OutlookClient as OutlookOverlay }
