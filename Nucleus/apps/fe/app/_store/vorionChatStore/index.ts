'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { ChatMessage, StoreMethods, StoreProps } from './types'

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// Initial Store State
// ============================================================================

const initialStore: StoreProps = {
  // Conversations
  conversations: [],
  selectedConversationId: null,
  isLoadingConversations: false,

  // Messages
  messagesByConversation: {},

  // Streaming
  isStreaming: false,
  streamingMessageId: null,
  streamingContent: '',
  streamingReasoning: null,

  // LLM Models
  availableLLMs: null,

  // UI
  isSidebarOpen: true,
  isSidebarCollapsed: false,
}

// ============================================================================
// Store Methods
// ============================================================================

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  // Conversation management
  setConversations: (store) => (conversations) => {
    store.conversations = conversations
  },

  addConversation: (store) => (conversation) => {
    store.conversations = [conversation, ...store.conversations]
  },

  updateConversation: (store) => (conversation) => {
    store.conversations = store.conversations.map((c) =>
      c.id === conversation.id ? conversation : c
    )
  },

  removeConversation: (store) => (conversationId) => {
    store.conversations = store.conversations.filter((c) => c.id !== conversationId)
    if (store.selectedConversationId === conversationId) {
      store.selectedConversationId = null
    }
    // Also clear messages
    const { [conversationId]: _, ...rest } = store.messagesByConversation
    store.messagesByConversation = rest
  },

  selectConversation: (store) => (conversationId) => {
    store.selectedConversationId = conversationId
  },

  // Message management
  addMessage: (store) => (message) => {
    const conversationId = message.conversationId
    const existing = store.messagesByConversation[conversationId] || []
    store.messagesByConversation = {
      ...store.messagesByConversation,
      [conversationId]: [...existing, message],
    }
  },

  updateMessage: (store) => (messageId, updates) => {
    const newMessages: Record<string, ChatMessage[]> = {}
    for (const [convId, messages] of Object.entries(store.messagesByConversation)) {
      newMessages[convId] = messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    }
    store.messagesByConversation = newMessages
  },

  setMessagesForConversation: (store) => (conversationId, messages) => {
    store.messagesByConversation = {
      ...store.messagesByConversation,
      [conversationId]: messages,
    }
  },

  prependMessagesToConversation: (store) => (conversationId, messages) => {
    const existing = store.messagesByConversation[conversationId] || []
    store.messagesByConversation = {
      ...store.messagesByConversation,
      [conversationId]: [...messages, ...existing],
    }
  },

  clearMessages: (store) => (conversationId) => {
    const { [conversationId]: _, ...rest } = store.messagesByConversation
    store.messagesByConversation = rest
  },

  // Streaming
  startStreaming: (store) => (conversationId, messageId) => {
    store.isStreaming = true
    store.streamingMessageId = messageId
    store.streamingContent = ''
    store.streamingReasoning = null

    // Add a placeholder message
    const existing = store.messagesByConversation[conversationId] || []
    store.messagesByConversation = {
      ...store.messagesByConversation,
      [conversationId]: [
        ...existing,
        {
          id: messageId,
          conversationId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ],
    }
  },

  appendStreamChunk: (store) => (chunk) => {
    store.streamingContent += chunk.chunk
    if (chunk.reasoning) {
      store.streamingReasoning = chunk.reasoning
    }

    // Update the streaming message
    if (store.streamingMessageId) {
      const conversationId = chunk.conversation_id
      const messages = store.messagesByConversation[conversationId] || []
      store.messagesByConversation = {
        ...store.messagesByConversation,
        [conversationId]: messages.map((m) =>
          m.id === store.streamingMessageId
            ? {
                ...m,
                content: store.streamingContent,
                reasoning: store.streamingReasoning,
              }
            : m
        ),
      }
    }
  },

  finishStreaming: (store) => (chunk) => {
    if (store.streamingMessageId) {
      const conversationId = chunk.conversation_id
      const messages = store.messagesByConversation[conversationId] || []
      store.messagesByConversation = {
        ...store.messagesByConversation,
        [conversationId]: messages.map((m) =>
          m.id === store.streamingMessageId
            ? {
                ...m,
                content: store.streamingContent,
                reasoning: chunk.reasoning ?? null,
                reasoningTokens: chunk.reasoning_tokens ?? null,
                inputTokens: chunk.input_tokens,
                outputTokens: chunk.output_tokens,
                totalTokens: chunk.total_tokens,
                modelName: chunk.model_name,
                modelProvider: chunk.model_provider,
                isStreaming: false,
              }
            : m
        ),
      }
    }

    store.isStreaming = false
    store.streamingMessageId = null
    store.streamingContent = ''
    store.streamingReasoning = null
  },

  cancelStreaming: (store) => () => {
    store.isStreaming = false
    store.streamingMessageId = null
    store.streamingContent = ''
    store.streamingReasoning = null
  },

  // UI
  toggleSidebar: (store) => () => {
    store.isSidebarOpen = !store.isSidebarOpen
  },

  setSidebarCollapsed: (store) => (collapsed) => {
    store.isSidebarCollapsed = collapsed
  },

  // LLM management
  setAvailableLLMs: (store) => (llms) => {
    store.availableLLMs = llms
  },

  // Helpers
  getMessagesForConversation: (store) => (conversationId) => {
    return store.messagesByConversation[conversationId] || []
  },

  getCurrentConversation: (store) => () => {
    if (!store.selectedConversationId) return null
    return store.conversations.find((c) => c.id === store.selectedConversationId) || null
  },

  generateMessageId: () => () => {
    return generateId()
  },
}

// ============================================================================
// Export Store
// ============================================================================

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useVorionChatStore }
export * from './types'
