/**
 * Shared types for Vorion AI Chat components
 * Portable, theme-aware, mobile-first design system
 */

// ============================================================================
// LLM Provider Types
// ============================================================================

export interface LLMModel {
  name: string
  description?: string
  contextWindow?: number
  isDefault?: boolean
}

export interface LLMProvider {
  id: string
  provider: string
  icon?: string
  models: LLMModel[]
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    provider: 'OpenAI',
    models: [
      { name: 'GPT-4o', description: 'Most capable model', isDefault: true },
      { name: 'GPT-4o-mini', description: 'Fast and efficient' },
      { name: 'GPT-4-turbo', description: 'High performance' },
    ],
  },
  {
    id: 'anthropic',
    provider: 'Anthropic',
    models: [
      { name: 'Claude-3.5-Sonnet', description: 'Best for complex tasks', isDefault: true },
      { name: 'Claude-3.5-Haiku', description: 'Fast responses' },
      { name: 'Claude-3-Opus', description: 'Most powerful' },
    ],
  },
  {
    id: 'opensource',
    provider: 'Open Source',
    models: [
      { name: 'LLaMA-3.2', description: "Meta's latest" },
      { name: 'Qwen-2.5', description: "Alibaba's model" },
      { name: 'Mistral-Large', description: 'European excellence' },
    ],
  },
]

// ============================================================================
// Panel Menu Types
// ============================================================================

export interface PanelMenuItem {
  id: string
  icon: React.ReactNode
  label: string
  description?: string
  hasSubmenu?: boolean
  isToggle?: boolean
  requiresConnection?: boolean
  onClick?: () => void
}

export interface ProjectItem {
  id: string
  name: string
  description?: string
  icon?: string
  lastModified?: Date
}

export interface StyleItem {
  id: string
  name: string
  description?: string
  preview?: string
}

export interface ToolItem {
  id: string
  name: string
  description?: string
  category?: string
  isEnabled?: boolean
}

// ============================================================================
// Animation Variants
// ============================================================================

export type AnimationVariant = 'fade' | 'slide' | 'scale' | 'spring'

export interface AnimationConfig {
  duration: number
  delay?: number
  easing?: string
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textMuted: string
  border: string
  success: string
  warning: string
  error: string
}

// ============================================================================
// Component Size Variants
// ============================================================================

export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// ============================================================================
// Panel Position Types
// ============================================================================

export type PanelPosition = 'above' | 'below'
export type PanelState = 'main' | 'projects' | 'styles' | 'tools'

// ============================================================================
// Welcome Section Types
// ============================================================================

export interface FeatureItem {
  icon: React.ReactNode
  label: string
  description: string
}

export interface WelcomeSectionProps {
  onShowHistory?: () => void
  hasConversations?: boolean
}

// ============================================================================
// Dummy Data for Development
// ============================================================================

export const DUMMY_PROJECTS: ProjectItem[] = [
  { id: '1', name: 'Nucleus Platform', description: 'Enterprise boilerplate' },
  { id: '2', name: 'AI Dashboard', description: 'Analytics interface' },
  { id: '3', name: 'Mobile App', description: 'React Native project' },
]

export const DUMMY_STYLES: StyleItem[] = [
  { id: '1', name: 'Professional', description: 'Formal business tone' },
  { id: '2', name: 'Casual', description: 'Friendly conversation' },
  { id: '3', name: 'Technical', description: 'Detailed explanations' },
]

export const DUMMY_TOOLS: ToolItem[] = [
  { id: '1', name: 'Code Interpreter', description: 'Execute Python code', category: 'coding' },
  { id: '2', name: 'Web Browser', description: 'Browse the internet', category: 'research' },
  { id: '3', name: 'Image Generator', description: 'Create images', category: 'creative' },
]
