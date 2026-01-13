/**
 * Shared constants for Vorion AI Chat components
 * Design tokens and configuration values
 */

// ============================================================================
// Animation Durations (in ms)
// ============================================================================

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  panel: 400,
} as const

// ============================================================================
// Breakpoints (mobile-first)
// ============================================================================

export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

// ============================================================================
// Z-Index Layers
// ============================================================================

export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  tooltip: 50,
} as const

// ============================================================================
// Color Palette (CSS Variables compatible)
// ============================================================================

export const COLORS = {
  // Brand Colors
  brand: {
    primary: '#c68e76',
    primaryHover: '#d4a08a',
    secondary: '#2c84db',
    secondaryHover: '#4a9be8',
  },
  // Semantic Colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const

// ============================================================================
// Theme-aware class mappings
// ============================================================================

export const THEME_CLASSES = {
  // Container backgrounds
  container: {
    primary: 'bg-white dark:bg-zinc-900',
    secondary: 'bg-zinc-50 dark:bg-zinc-800',
    tertiary: 'bg-zinc-100 dark:bg-zinc-700',
  },
  // Text colors
  text: {
    primary: 'text-zinc-900 dark:text-white',
    secondary: 'text-zinc-600 dark:text-zinc-300',
    muted: 'text-zinc-400 dark:text-zinc-500',
    accent: 'text-[#c68e76] dark:text-[#d4a08a]',
  },
  // Border colors
  border: {
    default: 'border-zinc-200 dark:border-white/10',
    subtle: 'border-zinc-100 dark:border-white/5',
    accent: 'border-[#c68e76]/30 dark:border-[#c68e76]/40',
    active: 'border-blue-400 dark:border-blue-400/60',
  },
  // Interactive states
  interactive: {
    hover: 'hover:bg-zinc-100 dark:hover:bg-black/20',
    active: 'bg-zinc-200 dark:bg-black/30',
    focus: 'focus:ring-2 focus:ring-[#c68e76]/50 focus:outline-none',
  },
} as const

// ============================================================================
// Panel Configuration
// ============================================================================

export const PANEL_CONFIG = {
  minWidth: 200,
  maxWidth: 400,
  mobileWidth: '100%',
  animationEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

// ============================================================================
// Textarea Configuration
// ============================================================================

export const TEXTAREA_CONFIG = {
  minRows: 2,
  maxRows: 12,
  lineHeight: 24, // pixels
  placeholder: 'Type your message...',
} as const

// ============================================================================
// Internal Conversation Configuration
// ============================================================================

/**
 * Prefix for internal/system conversations that should be hidden from the main list.
 * These are used for features like meeting analyzer, action item extraction, etc.
 */
export const INTERNAL_CONVERSATION_PREFIX = '__VORION_INTERNAL__'

/**
 * Feature keys for internal conversations.
 * Used to identify and route different internal features.
 */
export const INTERNAL_FEATURES = {
  // Meeting Analyzer Features
  MEETING_ACTION_ITEMS: 'MEETING_ACTION_ITEMS',
  MEETING_LIVE_SUMMARY: 'MEETING_LIVE_SUMMARY',
  MEETING_AGENDA_COVERAGE: 'MEETING_AGENDA_COVERAGE',
  MEETING_SPEAKER_ANALYSIS: 'MEETING_SPEAKER_ANALYSIS',
} as const

export type InternalFeatureKey = keyof typeof INTERNAL_FEATURES

/**
 * Helper to check if a conversation title indicates an internal/system conversation.
 */
export function isInternalConversation(title: string | null | undefined): boolean {
  return title?.startsWith(INTERNAL_CONVERSATION_PREFIX) ?? false
}

/**
 * Generate internal conversation title with feature key.
 * @param feature - The internal feature key
 * @param contextId - Optional context identifier (e.g., meeting ID)
 */
export function generateInternalConversationTitle(
  feature: InternalFeatureKey,
  contextId?: string
): string {
  const base = `${INTERNAL_CONVERSATION_PREFIX}${INTERNAL_FEATURES[feature]}`
  return contextId ? `${base}::${contextId}` : base
}

/**
 * Parse internal conversation title to extract feature and context.
 */
export function parseInternalConversationTitle(title: string): {
  feature: string | null
  contextId: string | null
} {
  if (!isInternalConversation(title)) {
    return { feature: null, contextId: null }
  }

  const withoutPrefix = title.slice(INTERNAL_CONVERSATION_PREFIX.length)
  const parts = withoutPrefix.split('::')

  return {
    feature: parts[0] || null,
    contextId: parts[1] || null,
  }
}

// ============================================================================
// Internal Conversation Metadata Types
// ============================================================================

export interface InternalConversationLLMConfig {
  provider: string
  model: string
  language: string
}

export interface InternalConversationMetadata {
  internal: true
  internal_type: 'meeting_analyzer'
  feature: string
  llm: InternalConversationLLMConfig
  created_at?: string
  context?: Record<string, unknown>
}
