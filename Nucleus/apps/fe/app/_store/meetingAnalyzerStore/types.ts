'use client'

// ============================================================================
// Types for Meeting Analyzer Store
// ============================================================================

export interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
  isFinal?: boolean
  confidence?: number
}

export interface ActionItem {
  id: string
  owner: string
  action: string
  dueDate: string | null
  priority: 'high' | 'medium' | 'low'
  sourceSnippet: string
  extractedAt: number
  status: 'pending' | 'completed'
}

export interface LLMConfig {
  provider: string
  model: string
  language: string
}

export type MeetingAnalyzerStoreProps = {
  // Internal conversation for analyzer features
  conversationId: string | null
  isCreatingConversation: boolean

  // Transcript
  transcriptSegments: TranscriptSegment[]
  transcript: string // Continuously growing transcript

  // Action Items
  actionItems: ActionItem[]
  isExtractingActions: boolean
  lastProcessedSegmentIndex: number
  lastProcessedCharIndex: number

  // LLM Config
  llmConfig: LLMConfig | null

  // Recording state (shared across tabs)
  isRecording: boolean
  meetingLanguage: 'en-US' | 'tr-TR'
}

export type MeetingAnalyzerStoreMethods = {
  // Conversation
  setConversationId: (id: string | null) => void
  setCreatingConversation: (creating: boolean) => void

  // Transcript
  addTranscriptSegment: (segment: TranscriptSegment) => void
  updateTranscriptSegment: (id: string, updates: Partial<TranscriptSegment>) => void
  appendText: (text: string) => void
  clearTranscript: () => void

  // Action Items
  addActionItems: (items: ActionItem[]) => void
  updateActionItem: (id: string, updates: Partial<ActionItem>) => void
  toggleActionItemStatus: (id: string) => void
  removeActionItem: (id: string) => void
  clearActionItems: () => void
  setExtractingActions: (extracting: boolean) => void
  setLastProcessedIndex: (index: number) => void
  setLastProcessedCharIndex: (index: number) => void

  // LLM Config
  setLLMConfig: (config: LLMConfig | null) => void

  // Recording
  setIsRecording: (recording: boolean) => void
  setMeetingLanguage: (lang: 'en-US' | 'tr-TR') => void

  // Reset all
  resetAnalyzer: () => void
}
