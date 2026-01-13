'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { MeetingAnalyzerStoreMethods, MeetingAnalyzerStoreProps } from './types'

// ============================================================================
// Initial State
// ============================================================================

const initialStore: MeetingAnalyzerStoreProps = {
  // Conversation
  conversationId: null,
  isCreatingConversation: false,

  // Transcript
  transcriptSegments: [],
  transcript: '',

  // Action Items
  actionItems: [],
  isExtractingActions: false,
  lastProcessedSegmentIndex: -1,
  lastProcessedCharIndex: 0,

  // LLM Config
  llmConfig: null,

  // Recording
  isRecording: false,
  meetingLanguage: 'en-US',
}

// ============================================================================
// Store Methods
// ============================================================================

const storeMethodCreators: MethodCreators<MeetingAnalyzerStoreProps, MeetingAnalyzerStoreMethods> =
  {
    // Conversation
    setConversationId: (store) => (id) => {
      store.conversationId = id
    },

    setCreatingConversation: (store) => (creating) => {
      store.isCreatingConversation = creating
    },

    // Transcript
    addTranscriptSegment: (store) => (segment) => {
      store.transcriptSegments = [...store.transcriptSegments, segment]
    },

    updateTranscriptSegment: (store) => (id, updates) => {
      store.transcriptSegments = store.transcriptSegments.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      )
    },

    appendText: (store) => (text) => {
      const trimmed = text.trim()
      if (trimmed) {
        store.transcript = store.transcript + (store.transcript ? ' ' : '') + trimmed
      }
    },

    clearTranscript: (store) => () => {
      store.transcriptSegments = []
      store.transcript = ''
    },

    // Action Items
    addActionItems: (store) => (items) => {
      store.actionItems = [...store.actionItems, ...items]
    },

    updateActionItem: (store) => (id, updates) => {
      store.actionItems = store.actionItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    },

    toggleActionItemStatus: (store) => (id) => {
      store.actionItems = store.actionItems.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'pending' ? 'completed' : 'pending' }
          : item
      )
    },

    removeActionItem: (store) => (id) => {
      store.actionItems = store.actionItems.filter((item) => item.id !== id)
    },

    clearActionItems: (store) => () => {
      store.actionItems = []
    },

    setExtractingActions: (store) => (extracting) => {
      store.isExtractingActions = extracting
    },

    setLastProcessedIndex: (store) => (index) => {
      store.lastProcessedSegmentIndex = index
    },

    setLastProcessedCharIndex: (store) => (index) => {
      store.lastProcessedCharIndex = index
    },

    // LLM Config
    setLLMConfig: (store) => (config) => {
      store.llmConfig = config
    },

    // Recording
    setIsRecording: (store) => (recording) => {
      store.isRecording = recording
    },

    setMeetingLanguage: (store) => (lang) => {
      store.meetingLanguage = lang
    },

    // Reset all
    resetAnalyzer: (store) => () => {
      store.conversationId = null
      store.isCreatingConversation = false
      store.transcriptSegments = []
      store.transcript = ''
      store.actionItems = []
      store.isExtractingActions = false
      store.lastProcessedSegmentIndex = -1
      store.lastProcessedCharIndex = 0
      store.llmConfig = null
      store.isRecording = false
      store.meetingLanguage = 'en-US'
    },
  }

// ============================================================================
// Export Store
// ============================================================================

const { useStore } = createStore<MeetingAnalyzerStoreProps, MeetingAnalyzerStoreMethods>(
  initialStore,
  storeMethodCreators
)

export { useStore as useMeetingAnalyzerStore }
export * from './types'
