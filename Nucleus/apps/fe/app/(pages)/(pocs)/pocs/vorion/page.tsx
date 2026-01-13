'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LuMenu, LuPanelLeftOpen } from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useTextAreaStore, useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import {
  streamVorionPrediction,
  type VorionConversationResponse,
  type VorionMessageResponse,
  type VorionPredictionRequest,
} from '@/lib/api'
import {
  ChatArea,
  ChatSidebar,
  ConversationHeader,
  LogoSection,
  TextArea,
  WelcomeSection,
} from './_components'

// ============================================================================
// Helpers
// ============================================================================

function isConversationResponse(data: unknown): data is VorionConversationResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as VorionConversationResponse).id === 'string'
  )
}

function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error)
      if (parsed.detail) return parsed.detail
      if (parsed.message) return parsed.message
      return error
    } catch {
      return error
    }
  }
  if (error instanceof Error) {
    const match = error.message.match(/\d+ - (.+)$/)
    if (match?.[1]) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.detail) return parsed.detail
        if (parsed.message) return parsed.message
      } catch {
        return match[1]
      }
    }
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    if (err.detail) return String(err.detail)
    if (err.message) return String(err.message)
  }
  return 'An unexpected error occurred'
}

const ADJECTIVES = ['Curious', 'Bright', 'Swift', 'Calm', 'Bold', 'Vivid', 'Sharp', 'Noble']
const NOUNS = ['Phoenix', 'Storm', 'Echo', 'Dawn', 'Pulse', 'Wave', 'Spark', 'Drift']

function generateRandomTitle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function VorionPage() {
  const chatStore = useVorionChatStore()
  const textAreaStore = useTextAreaStore()
  const actions = useGenericApiActions()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Pagination state for conversations
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const PAGE_SIZE = 20

  // Message pagination state - per conversation
  const [messagePagination, setMessagePagination] = useState<
    Record<string, { page: number; hasMore: boolean }>
  >({})
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false)
  const MESSAGE_PAGE_SIZE = 10

  const isConversationActive = chatStore.selectedConversationId !== null

  // Load conversations on mount
  useEffect(() => {
    actions.VORION_LIST_CONVERSATIONS?.start({
      payload: { page: 1, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        console.log('[VorionPage] conversations loaded', {
          total: data?.total,
          items: data?.items?.length,
        })
        if (data?.items) {
          chatStore.setConversations(data.items)
          setHasMore((data.total ?? 0) > PAGE_SIZE)
          setCurrentPage(1)
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to load conversations:', error)
        toast.error('Failed to load conversations', {
          description: parseErrorMessage(error),
        })
      },
    })
  }, [])

  // Load LLMs with full metadata on mount
  useEffect(() => {
    actions.VORION_LIST_LLMS?.start({
      payload: { page_size: 100, available_only: true },
      onAfterHandle: (data) => {
        if (data?.items) {
          // Transform list response to provider-grouped format
          const providers: Record<string, typeof data.items> = {}
          for (const model of data.items) {
            const providerName = model.provider_name
            if (!providers[providerName]) {
              providers[providerName] = []
            }
            providers[providerName].push(model)
          }
          chatStore.setAvailableLLMs({
            providers,
            total_count: data.total,
          })

          // Set default model: first provider's first model (if not already set)
          if (!textAreaStore.selectedModel || textAreaStore.selectedModel.length === 0) {
            const providerNames = Object.keys(providers)
            const firstProvider = providerNames[0]
            if (firstProvider) {
              const firstProviderModels = providers[firstProvider]
              const firstModel = firstProviderModels?.[0]
              if (firstModel) {
                textAreaStore.selectedProvider = firstProvider
                textAreaStore.selectedModel = [firstModel.model_name]
              }
            }
          }
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to load LLMs:', error)
      },
    })
  }, [])

  // Handle new chat - creates a new conversation via API
  const handleNewChat = useCallback(() => {
    const title = generateRandomTitle()

    actions.VORION_CREATE_CONVERSATION?.start({
      payload: { title },
      onAfterHandle: (data) => {
        if (isConversationResponse(data)) {
          // Add to beginning of list
          chatStore.setConversations([data, ...chatStore.conversations])
          chatStore.selectConversation(data.id)
          textAreaStore.textValue = ''

          // Close sidebar on mobile
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(false)
          }
        }
      },
      onErrorHandle: (error) => {
        console.error('Failed to create conversation:', error)
        toast.error('Failed to create conversation', {
          description: parseErrorMessage(error),
        })
      },
    })
  }, [chatStore.conversations])

  // Handle show history (from welcome screen)
  const handleShowHistory = useCallback(() => {
    setIsMobileSidebarOpen(true)
  }, [])

  // Handle load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    const nextPage = currentPage + 1
    setIsLoadingMore(true)

    actions.VORION_LIST_CONVERSATIONS?.start({
      payload: { page: nextPage, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          // Append to existing conversations
          const existingIds = new Set(chatStore.conversations.map((c) => c.id))
          const newConvs = data.items.filter(
            (c: VorionConversationResponse) => !existingIds.has(c.id)
          )
          chatStore.setConversations([...chatStore.conversations, ...newConvs])
          setCurrentPage(nextPage)
          setHasMore(data.items.length >= PAGE_SIZE)
        }
        setIsLoadingMore(false)
      },
      onErrorHandle: (error) => {
        console.error('Failed to load more conversations:', error)
        setIsLoadingMore(false)
      },
    })
  }, [currentPage, hasMore, isLoadingMore, chatStore.conversations])

  // Helper to set model from messages
  const setModelFromMessages = useCallback(
    (messages: { modelName?: string; modelProvider?: string; role: string }[]) => {
      // Find the last assistant message with model info
      const lastAssistantWithModel = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.modelName && m.modelProvider)

      if (!lastAssistantWithModel?.modelName || !lastAssistantWithModel?.modelProvider) {
        return
      }

      const { modelName, modelProvider } = lastAssistantWithModel

      // If we don't have LLM metadata yet, just set raw values
      const apiLLMs = chatStore.availableLLMs
      const providers = apiLLMs?.providers

      if (!providers) {
        textAreaStore.selectedModel = [modelName]
        textAreaStore.selectedProvider = modelProvider
        return
      }

      // Try to find a provider entry that matches (case-insensitive)
      const providerEntries = Object.entries(providers)
      const exactMatch = providerEntries.find(([name]) => name === modelProvider)
      const caseInsensitiveMatch =
        exactMatch ||
        providerEntries.find(([name]) => name.toLowerCase() === modelProvider.toLowerCase())

      if (!caseInsensitiveMatch) {
        // Provider not known to LLM service – keep existing selection
        return
      }

      const [matchedProviderName, models] = caseInsensitiveMatch
      const hasModel = models.some((m) => m.model_name === modelName)

      if (!hasModel) {
        // Provider var ama bu model LLM listesinden gelmiyor – mevcut seçimi bozma
        return
      }

      // At this point provider+model çifti gerçekten LLM listesinden geliyor, güvenle set edebiliriz
      textAreaStore.selectedModel = [modelName]
      textAreaStore.selectedProvider = matchedProviderName
    },
    []
  )

  // Helper function to transform API messages
  const transformMessages = useCallback((items: VorionMessageResponse[]) => {
    return items.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role:
        msg.role === 'human'
          ? ('user' as const)
          : msg.role === 'ai'
            ? ('assistant' as const)
            : (msg.role as 'user' | 'assistant'),
      content: msg.content || '',
      reasoning: msg.extra_metadata
        ? (() => {
            try {
              const meta = JSON.parse(msg.extra_metadata)
              return meta.reasoning || null
            } catch {
              return null
            }
          })()
        : null,
      createdAt: msg.created_at,
      modelName: msg.model_name || undefined,
      modelProvider: msg.model_provider || undefined,
      inputTokens: msg.input_tokens || undefined,
      outputTokens: msg.output_tokens || undefined,
      totalTokens: msg.total_tokens || undefined,
      cacheReadTokens: msg.cache_read_tokens,
      cacheCreationTokens: msg.cache_creation_tokens,
      processingDurationMs: msg.processing_duration_ms,
      stopReason: msg.stop_reason,
      finishReason: msg.finish_reason,
    }))
  }, [])

  // Handle select conversation
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      console.log(
        '[handleSelectConversation] Before select - availableLLMs:',
        chatStore.availableLLMs
      )
      chatStore.selectConversation(conversationId)
      console.log(
        '[handleSelectConversation] After select - availableLLMs:',
        chatStore.availableLLMs
      )

      // Load messages for this conversation if not already loaded
      const existingMessages = chatStore.getMessagesForConversation(conversationId)
      if (existingMessages.length === 0) {
        actions.VORION_LIST_MESSAGES?.start({
          payload: { conversation_id: conversationId, page: 1, page_size: MESSAGE_PAGE_SIZE },
          onAfterHandle: (data) => {
            if (data?.items) {
              const messages = transformMessages(data.items)
              // Sort by sequence_number (oldest first for display)
              messages.sort((a, b) => {
                const msgA = data.items.find((m: VorionMessageResponse) => m.id === a.id)
                const msgB = data.items.find((m: VorionMessageResponse) => m.id === b.id)
                return (msgA?.sequence_number || 0) - (msgB?.sequence_number || 0)
              })
              chatStore.setMessagesForConversation(conversationId, messages)

              // Track pagination state
              const hasMoreMessages = (data.total ?? 0) > MESSAGE_PAGE_SIZE
              setMessagePagination((prev) => ({
                ...prev,
                [conversationId]: { page: 1, hasMore: hasMoreMessages },
              }))

              // Set model from last assistant message
              setModelFromMessages(messages)
            }
          },
          onErrorHandle: (error) => {
            console.error('Failed to load messages:', error)
          },
        })
      } else {
        // Messages already loaded, set model from them
        setModelFromMessages(existingMessages)
      }

      // Close sidebar on mobile after selection
      if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(false)
      }
    },
    [setModelFromMessages, transformMessages]
  )

  // Handle load more messages (older messages)
  const handleLoadMoreMessages = useCallback(() => {
    const conversationId = chatStore.selectedConversationId
    if (!conversationId || isLoadingMoreMessages) return

    const pagination = messagePagination[conversationId]
    if (!pagination?.hasMore) return

    const nextPage = pagination.page + 1
    setIsLoadingMoreMessages(true)

    actions.VORION_LIST_MESSAGES?.start({
      payload: { conversation_id: conversationId, page: nextPage, page_size: MESSAGE_PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items && data.items.length > 0) {
          const newMessages = transformMessages(data.items)
          // Sort by sequence_number (oldest first)
          newMessages.sort((a, b) => {
            const msgA = data.items.find((m: VorionMessageResponse) => m.id === a.id)
            const msgB = data.items.find((m: VorionMessageResponse) => m.id === b.id)
            return (msgA?.sequence_number || 0) - (msgB?.sequence_number || 0)
          })
          // Prepend older messages to the beginning
          chatStore.prependMessagesToConversation(conversationId, newMessages)

          // Update pagination state
          const totalLoaded = (pagination.page + 1) * MESSAGE_PAGE_SIZE
          setMessagePagination((prev) => ({
            ...prev,
            [conversationId]: {
              page: nextPage,
              hasMore: (data.total ?? 0) > totalLoaded,
            },
          }))
        }
        setIsLoadingMoreMessages(false)
      },
      onErrorHandle: (error) => {
        console.error('Failed to load more messages:', error)
        setIsLoadingMoreMessages(false)
      },
    })
  }, [
    chatStore.selectedConversationId,
    messagePagination,
    isLoadingMoreMessages,
    transformMessages,
  ])

  // Handle delete conversation
  const handleDeleteConversation = useCallback((conversationId: string) => {
    actions.VORION_DELETE_CONVERSATION?.start({
      payload: { _conversation_id: conversationId },
      onAfterHandle: () => {
        chatStore.removeConversation(conversationId)
        toast.success('Conversation deleted')
      },
      onErrorHandle: (error) => {
        console.error('Failed to delete conversation:', error)
        toast.error('Failed to delete conversation', {
          description: parseErrorMessage(error),
        })
      },
    })
  }, [])

  // Handle send message (streaming)
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || chatStore.isStreaming) return

      let conversationId = chatStore.selectedConversationId

      // Create conversation if none selected
      if (!conversationId) {
        const title = generateRandomTitle()

        await new Promise<void>((resolve) => {
          actions.VORION_CREATE_CONVERSATION?.start({
            payload: { title },
            onAfterHandle: (data) => {
              if (isConversationResponse(data)) {
                chatStore.addConversation(data)
                chatStore.selectConversation(data.id)
                conversationId = data.id
              }
              resolve()
            },
            onErrorHandle: (error) => {
              console.error('Failed to create conversation:', error)
              toast.error('Failed to create conversation', {
                description: parseErrorMessage(error),
              })
              resolve()
            },
          })
        })
      }

      if (!conversationId) return

      // Get uploaded files before clearing
      const files = textAreaStore.uploadedFiles || undefined

      // Create file previews for the message
      const attachedFiles = files
        ? await Promise.all(
            files.map(async (file) => {
              let previewUrl: string | undefined
              if (file.type.startsWith('image/')) {
                previewUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result as string)
                  reader.readAsDataURL(file)
                })
              }
              return {
                name: file.name,
                type: file.type,
                size: file.size,
                previewUrl,
              }
            })
          )
        : undefined

      // Add user message with attached files
      const userMessageId = chatStore.generateMessageId()
      chatStore.addMessage({
        id: userMessageId,
        conversationId,
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString(),
        attachedFiles,
      })

      // Clear input and files
      textAreaStore.textValue = ''
      textAreaStore.uploadedFiles = null

      // Start streaming
      const assistantMessageId = chatStore.generateMessageId()
      chatStore.startStreaming(conversationId, assistantMessageId)

      // Get selected provider and model
      const providerName = textAreaStore.selectedProvider || 'openai'
      const modelName = textAreaStore.selectedModel?.[0] || 'gpt-4o'

      // Build tool_ids from toggles + selected tools
      const toolIdSet = new Set<string>()

      if (textAreaStore.isWebSearchEnabled) {
        // Web Search tool id
        toolIdSet.add('23')
      }

      if (textAreaStore.selectedTools && textAreaStore.selectedTools.length > 0) {
        textAreaStore.selectedTools.forEach((id) => {
          if (id) toolIdSet.add(id)
        })
      }

      const toolIds: string[] | undefined = toolIdSet.size > 0 ? Array.from(toolIdSet) : undefined

      const request: VorionPredictionRequest = {
        conversation_id: conversationId,
        prompt: { text: messageText, save_prompt_with_rag_content: false },
        llm_name: providerName,
        llm_group_name: modelName,
        thinking: textAreaStore.isThinkingExtended
          ? { enabled: true, effort: 'medium' }
          : { enabled: false },
        tag_name: textAreaStore.selectedProjectSlug || undefined,
        tool_ids: toolIds,
      }

      try {
        abortControllerRef.current = new AbortController()

        for await (const chunk of streamVorionPrediction(request, files)) {
          if (chunk.is_final) {
            // Add model info if not present in chunk
            const enrichedChunk = {
              ...chunk,
              model_name: chunk.model_name || modelName,
              model_provider: chunk.model_provider || providerName,
            }
            chatStore.finishStreaming(enrichedChunk)

            // Update conversation message count
            const currentConv = chatStore.conversations.find((c) => c.id === conversationId)
            if (currentConv) {
              chatStore.updateConversation({
                ...currentConv,
                message_count: (currentConv.message_count || 0) + 2, // user + assistant
                last_message_at: new Date().toISOString(),
              })
            }
          } else {
            chatStore.appendStreamChunk(chunk)
          }
        }
      } catch (error) {
        console.error('Streaming error:', error)
        const errorMsg = parseErrorMessage(error)

        // Update the streaming message to show error
        if (chatStore.streamingMessageId) {
          chatStore.updateMessage(chatStore.streamingMessageId, {
            content: '',
            isStreaming: false,
            isError: true,
            errorMessage: errorMsg,
          })
        }
        chatStore.cancelStreaming()
      }
    },
    [
      chatStore.selectedConversationId,
      chatStore.isStreaming,
      textAreaStore.selectedProvider,
      textAreaStore.selectedModel,
      textAreaStore.isThinkingExtended,
      textAreaStore.isWebSearchEnabled,
      textAreaStore.selectedTools,
    ]
  )

  // Handle TextArea submit
  useEffect(() => {
    // We'll handle submit through a custom mechanism
    // For now, the TextArea component will call this via a global event or ref
  }, [])

  return (
    <main
      className={cn(
        // Fill safe viewport height, prevent body scroll; inner areas (messages) handle scrolling
        'h-[100svh] flex w-full max-w-full overflow-hidden',
        isConversationActive
          ? 'bg-gradient-to-br from-zinc-100 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950'
          : 'bg-zinc-50 dark:bg-zinc-900'
      )}
    >
      {/* Sidebar - Always render, control visibility via props */}
      <ChatSidebar
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onLoadMore={handleLoadMore}
        isLoading={actions.VORION_LIST_CONVERSATIONS?.state?.isPending ?? false}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        {/* Desktop: Expand Sidebar Button - Only when sidebar is collapsed */}
        {isConversationActive && chatStore.isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => chatStore.setSidebarCollapsed(false)}
            className={cn(
              'absolute left-4 top-4 z-30 p-2 rounded-lg hidden md:flex',
              'bg-white dark:bg-zinc-800',
              'border border-zinc-200 dark:border-white/10',
              'text-zinc-600 dark:text-white/60',
              'hover:bg-zinc-50 dark:hover:bg-white/5',
              'shadow-sm transition-all duration-200'
            )}
            aria-label="Expand sidebar"
          >
            <LuPanelLeftOpen size={20} />
          </button>
        )}

        {/* Header Area */}
        {isConversationActive ? (
          // Active conversation header with metadata
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            {/* Solid header content */}
            <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 pointer-events-auto">
              {/* Mobile: Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className={cn(
                  'p-2 rounded-lg md:hidden flex-shrink-0',
                  'bg-white dark:bg-zinc-800',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-600 dark:text-white/60',
                  'hover:bg-zinc-50 dark:hover:bg-white/5',
                  'shadow-sm transition-all duration-200'
                )}
                aria-label="Open conversations"
              >
                <LuMenu size={20} />
              </button>
              <div className="hidden md:block">
                <LogoSection isCompact />
              </div>
              <div className="hidden md:block h-8 w-px bg-zinc-200 dark:bg-white/10" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <ConversationHeader />
              </div>
            </div>
            {/* Gradient fade overlay - longer for smoother effect */}
            <div className="h-24 bg-gradient-to-b from-zinc-50 via-zinc-50/40 via-40% to-transparent dark:from-zinc-900 dark:via-zinc-900/40 dark:via-40% dark:to-transparent" />
          </div>
        ) : (
          // Welcome screen - with mobile menu button
          <div className="flex-shrink-0 pt-4 sm:pt-8 md:pt-12">
            {/* Mobile: Menu button at top */}
            <div className="md:hidden flex justify-start px-4 mb-4">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className={cn(
                  'p-2 rounded-lg',
                  'bg-white dark:bg-zinc-800',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-600 dark:text-white/60',
                  'hover:bg-zinc-50 dark:hover:bg-white/5',
                  'shadow-sm transition-all duration-200'
                )}
                aria-label="Open conversations"
              >
                <LuMenu size={20} />
              </button>
            </div>
            <div className="flex justify-center">
              <LogoSection isCompact={false} />
            </div>
          </div>
        )}

        {/* Chat Area or Welcome */}
        {isConversationActive ? (
          <div
            className={cn(
              'flex-1 flex flex-col pt-16 overflow-hidden bg-zinc-50 dark:bg-zinc-900',
              // Dynamic padding based on attached files
              textAreaStore.uploadedFiles && textAreaStore.uploadedFiles.length > 0
                ? 'pb-52 sm:pb-56'
                : 'pb-32 sm:pb-36'
            )}
          >
            <ChatArea
              onLoadMoreMessages={handleLoadMoreMessages}
              isLoadingMoreMessages={isLoadingMoreMessages}
              hasMoreMessages={messagePagination[chatStore.selectedConversationId || '']?.hasMore}
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900',
              'overflow-y-auto',
              textAreaStore.uploadedFiles && textAreaStore.uploadedFiles.length > 0
                ? 'pt-2 sm:pt-4 pb-52 sm:pb-56'
                : 'pt-2 sm:pt-4 pb-32 sm:pb-36'
            )}
          >
            <WelcomeSection
              onShowHistory={handleShowHistory}
              hasConversations={chatStore.conversations.length > 0}
            />
          </div>
        )}

        {/* TextArea Container */}
        <div
          className={cn(
            'absolute left-0 right-0 bottom-0 z-20',
            'p-2 sm:p-4',
            isConversationActive ? '' : 'max-w-4xl mx-auto'
          )}
        >
          <TextArea onSubmit={handleSendMessage} />
        </div>

        {/* Background decorations */}
        {isConversationActive && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
            <div
              className={cn(
                'absolute -top-32 -right-32 w-64 h-64 sm:w-96 sm:h-96',
                'bg-[#c68e76]/5 dark:bg-[#c68e76]/10 rounded-full blur-3xl'
              )}
            />
            <div
              className={cn(
                'absolute -bottom-32 -left-32 w-64 h-64 sm:w-96 sm:h-96',
                'bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl'
              )}
            />
          </div>
        )}
      </div>
    </main>
  )
}
