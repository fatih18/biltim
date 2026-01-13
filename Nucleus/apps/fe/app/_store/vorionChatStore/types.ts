import type {
  VorionAvailableLLMsResponse,
  VorionConversationResponse,
  VorionStreamChunk,
} from '@/lib/api'

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface AttachedFile {
  name: string
  type: string
  size: number
  previewUrl?: string // Data URL for images
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  reasoning?: string | null
  reasoningTokens?: number | null
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cacheReadTokens?: number | null
  cacheCreationTokens?: number | null
  modelName?: string
  modelProvider?: string
  processingDurationMs?: number | null
  stopReason?: string | null
  finishReason?: string | null
  createdAt: string
  isStreaming?: boolean
  isError?: boolean
  errorMessage?: string
  attachedFiles?: AttachedFile[]
}

// ============================================================================
// Store Types
// ============================================================================

export type StoreProps = {
  // Conversations
  conversations: VorionConversationResponse[]
  selectedConversationId: string | null
  isLoadingConversations: boolean

  // Messages (keyed by conversationId)
  messagesByConversation: Record<string, ChatMessage[]>

  // Streaming state
  isStreaming: boolean
  streamingMessageId: string | null
  streamingContent: string
  streamingReasoning: string | null

  // LLM Models
  availableLLMs: VorionAvailableLLMsResponse | null

  // UI state
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
}

export type StoreMethods = {
  // Conversation management
  setConversations: (conversations: VorionConversationResponse[]) => void
  addConversation: (conversation: VorionConversationResponse) => void
  updateConversation: (conversation: VorionConversationResponse) => void
  removeConversation: (conversationId: string) => void
  selectConversation: (conversationId: string | null) => void

  // Message management
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  setMessagesForConversation: (conversationId: string, messages: ChatMessage[]) => void
  prependMessagesToConversation: (conversationId: string, messages: ChatMessage[]) => void
  clearMessages: (conversationId: string) => void

  // Streaming
  startStreaming: (conversationId: string, messageId: string) => void
  appendStreamChunk: (chunk: VorionStreamChunk) => void
  finishStreaming: (chunk: VorionStreamChunk) => void
  cancelStreaming: () => void

  // UI
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // LLM management
  setAvailableLLMs: (llms: VorionAvailableLLMsResponse) => void

  // Helpers
  getMessagesForConversation: (conversationId: string) => ChatMessage[]
  getCurrentConversation: () => VorionConversationResponse | null
  generateMessageId: () => string
}
