'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaCheck } from 'react-icons/fa'
import { FiChevronRight } from 'react-icons/fi'
import { LuArrowLeft, LuCpu, LuInfo, LuLoader, LuSparkles, LuX, LuZap } from 'react-icons/lu'
import { useTextAreaStore, useVorionChatStore } from '@/app/_store'
import { cn } from '@/app/_utils'
import { LLM_PROVIDERS, type LLMProvider } from '../../types'

// ============================================================================
// Types
// ============================================================================

interface ProviderIconProps {
  provider: string
}

interface ModelCapabilities {
  thinking?: { supported: boolean; type: string }
  input_types?: string[]
  output_types?: string[]
  streaming?: boolean
  tools?: boolean
  vision?: boolean
  json_mode?: boolean
}

interface ModelUI {
  tier?: string
  speed?: string
  use_cases?: string[]
  display?: {
    icon?: string
    color?: string
    badge?: string
    tagline?: string
  }
  best_for?: string[]
  not_recommended_for?: string[]
}

interface ModelRateLimits {
  tokens_per_minute?: number
  requests_per_minute?: number
  tokens_per_day?: number
  concurrent_requests?: number
}

interface ModelInfo {
  name: string
  displayName: string
  description?: string | null
  contextWindow?: number
  maxOutputTokens?: number
  status?: string
  isAvailable?: boolean
  groupName?: string | null
  costPerInputToken?: number
  costPerOutputToken?: number
  capabilities?: ModelCapabilities
  ui?: ModelUI
  rateLimits?: ModelRateLimits
}

interface SmartTooltipProps {
  model: ModelInfo
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

// ============================================================================
// Helpers
// ============================================================================

function capitalizeFirst(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// Sub-Components
// ============================================================================

function ProviderIcon({ provider }: ProviderIconProps) {
  const normalizedProvider = provider.toLowerCase()
  const icons: Record<string, React.ReactNode> = {
    openai: <LuSparkles size={14} className="text-emerald-500" />,
    claude: <LuZap size={14} className="text-orange-500" />,
    anthropic: <LuZap size={14} className="text-orange-500" />,
    google: <LuCpu size={14} className="text-blue-500" />,
    azure: <LuCpu size={14} className="text-cyan-500" />,
    groq: <LuCpu size={14} className="text-purple-500" />,
  }
  return icons[normalizedProvider] ?? <LuCpu size={14} />
}

function SearchHeader({ onBack, placeholder }: { onBack: () => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 border-b border-zinc-100 dark:border-white/10">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className={cn(
          'flex-shrink-0 p-1.5 rounded-lg',
          'text-zinc-600 dark:text-white',
          'hover:bg-zinc-100 dark:hover:bg-white/10',
          'transition-colors duration-200'
        )}
      >
        <LuArrowLeft size={16} />
      </button>
      <input
        type="text"
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent text-sm',
          'text-zinc-900 dark:text-white',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:outline-none'
        )}
      />
    </div>
  )
}

function SmartTooltip({ model, isOpen, onClose, triggerRef }: SmartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{
    top?: number
    bottom?: number
    left?: number
    right?: number
  }>({})

  const formatTokens = (size?: number) => {
    if (!size) return null
    if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`
    if (size >= 1000) return `${(size / 1000).toFixed(0)}K`
    return `${size}`
  }

  const formatCost = (cost?: number) => {
    if (!cost) return null
    return `$${cost}/M`
  }

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const padding = 12
    const newPosition: typeof position = {}

    if (window.innerWidth - trigger.right >= tooltip.width + padding) {
      newPosition.left = trigger.right + padding
    } else if (trigger.left >= tooltip.width + padding) {
      newPosition.right = window.innerWidth - trigger.left + padding
    } else {
      newPosition.left = Math.max(padding, (window.innerWidth - tooltip.width) / 2)
    }

    if (window.innerHeight - trigger.bottom >= tooltip.height + padding) {
      newPosition.top = Math.max(padding, trigger.top - 20)
    } else if (trigger.top >= tooltip.height + padding) {
      newPosition.bottom = window.innerHeight - trigger.bottom + padding
    } else {
      newPosition.top = Math.max(padding, (window.innerHeight - tooltip.height) / 2)
    }
    setPosition(newPosition)
  }, [triggerRef])

  useEffect(() => {
    if (isOpen) requestAnimationFrame(calculatePosition)
  }, [isOpen, calculatePosition])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  const { capabilities, ui, rateLimits } = model

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
        zIndex: 9999,
      }}
      className={cn(
        'w-[320px] max-h-[80vh] overflow-hidden rounded-xl',
        'bg-white dark:bg-[#0a0a0a]',
        'border border-zinc-200 dark:border-zinc-800',
        'shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)]',
        'animate-in fade-in zoom-in-[0.98] duration-200'
      )}
    >
      {/* Header */}
      <div className="relative border-b border-zinc-100 dark:border-zinc-800">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-600 to-transparent" />
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {ui?.tier && (
                  <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-500">
                    {ui.tier}
                  </span>
                )}
                {ui?.display?.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded">
                    {ui.display.badge}
                  </span>
                )}
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">
                {model.displayName}
              </h4>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                {model.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mt-1 -mr-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LuX size={14} />
            </button>
          </div>
          {model.description && (
            <p className="mt-3 text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {model.description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[55vh] overflow-y-auto">
        {/* Stats */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="grid grid-cols-4 gap-1">
            <div className="text-center p-2">
              <p className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                {formatTokens(model.contextWindow)}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                Context
              </p>
            </div>
            <div className="text-center p-2 border-l border-zinc-100 dark:border-zinc-800">
              <p className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                {formatTokens(model.maxOutputTokens) || '—'}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                Output
              </p>
            </div>
            {model.costPerInputToken && (
              <div className="text-center p-2 border-l border-zinc-100 dark:border-zinc-800">
                <p className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                  {formatCost(model.costPerInputToken)}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                  In
                </p>
              </div>
            )}
            {model.costPerOutputToken && (
              <div className="text-center p-2 border-l border-zinc-100 dark:border-zinc-800">
                <p className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                  {formatCost(model.costPerOutputToken)}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Out
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                model.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">
              {model.status}
            </span>
          </div>
          {ui?.speed && (
            <>
              <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                {ui.speed}
              </span>
            </>
          )}
        </div>

        {/* Capabilities */}
        {capabilities && (
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-wrap gap-1.5">
              {capabilities.vision && (
                <span className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                  Vision
                </span>
              )}
              {capabilities.tools && (
                <span className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                  Tools
                </span>
              )}
              {capabilities.streaming && (
                <span className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                  Streaming
                </span>
              )}
              {capabilities.json_mode && (
                <span className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                  JSON
                </span>
              )}
              {capabilities.thinking?.supported && (
                <span className="px-2 py-1 text-[11px] font-medium text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-700 rounded-md">
                  Thinking
                </span>
              )}
              {capabilities.input_types?.map((type) => (
                <span
                  key={type}
                  className="px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Use Cases */}
        {ui?.use_cases && ui.use_cases.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 font-medium mb-2">
              Use Cases
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ui.use_cases.map((uc) => (
                <span
                  key={uc}
                  className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md"
                >
                  {uc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Best For */}
        {ui?.best_for && ui.best_for.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 font-medium mb-2">
              Recommended
            </p>
            <div className="space-y-1">
              {ui.best_for.slice(0, 3).map((item) => (
                <p
                  key={item}
                  className="text-[12px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-[6px] flex-shrink-0" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Not Recommended */}
        {ui?.not_recommended_for && ui.not_recommended_for.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 font-medium mb-2">
              Limitations
            </p>
            <div className="space-y-1">
              {ui.not_recommended_for.slice(0, 2).map((item) => (
                <p
                  key={item}
                  className="text-[12px] text-zinc-500 dark:text-zinc-500 flex items-start gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-[6px] flex-shrink-0" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Rate Limits */}
        {rateLimits && (rateLimits.tokens_per_minute || rateLimits.requests_per_minute) && (
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 font-medium mb-2">
              Limits
            </p>
            <div className="flex items-center gap-4 text-xs">
              {rateLimits.tokens_per_minute && (
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">TPM </span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {formatTokens(rateLimits.tokens_per_minute)}
                  </span>
                </div>
              )}
              {rateLimits.requests_per_minute && (
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">RPM </span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {rateLimits.requests_per_minute}
                  </span>
                </div>
              )}
              {rateLimits.concurrent_requests && (
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Concurrent </span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {rateLimits.concurrent_requests}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(tooltipContent, document.body)
  }
  return tooltipContent
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelC() {
  const store = useTextAreaStore()
  const chatStore = useVorionChatStore()
  const isOpen = store.isPanelCOpen
  const isAbove = store.panelPosition === 'above'

  // State for tooltip
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const infoButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Transform API LLMs to component format with full metadata
  const { llmProviders, modelInfoMap } = useMemo(() => {
    const apiLLMs = chatStore.availableLLMs
    console.log('[PanelC useMemo] apiLLMs:', apiLLMs)
    const infoMap: Record<string, ModelInfo> = {}

    if (!apiLLMs?.providers) {
      // Build info map from hardcoded providers
      for (const provider of LLM_PROVIDERS) {
        for (const model of provider.models) {
          infoMap[model.name] = {
            name: model.name,
            displayName: model.description || model.name,
            contextWindow: model.contextWindow,
            status: 'active',
            isAvailable: true,
          }
        }
      }
      return { llmProviders: LLM_PROVIDERS, modelInfoMap: infoMap }
    }

    const providers = Object.entries(apiLLMs.providers).map(([providerName, models]) => ({
      id: providerName.toLowerCase().replace(/\s+/g, '-'),
      provider: providerName,
      models: models.map((m) => {
        // Access extended fields from the model (they exist via [key: string]: unknown)
        const extendedModel = m as typeof m & {
          description?: string | null
          max_output_tokens?: number
          cost_per_input_token?: number
          cost_per_output_token?: number
          extra_metadata?: string | Record<string, unknown>
        }

        // Parse extra_metadata if available
        let extraMeta: {
          capabilities?: ModelCapabilities
          ui?: ModelUI
          rate_limits?: ModelRateLimits
        } = {}
        if (extendedModel.extra_metadata) {
          try {
            extraMeta =
              typeof extendedModel.extra_metadata === 'string'
                ? JSON.parse(extendedModel.extra_metadata)
                : (extendedModel.extra_metadata as typeof extraMeta)
          } catch {
            // Ignore parse errors
          }
        }

        // Store full info in map
        infoMap[m.model_name] = {
          name: m.model_name,
          displayName: m.display_name,
          description: extendedModel.description,
          contextWindow: m.context_window_size,
          maxOutputTokens: extendedModel.max_output_tokens,
          status: m.status,
          isAvailable: m.is_available,
          groupName: m.group_name,
          costPerInputToken: extendedModel.cost_per_input_token,
          costPerOutputToken: extendedModel.cost_per_output_token,
          capabilities: extraMeta.capabilities,
          ui: extraMeta.ui,
          rateLimits: extraMeta.rate_limits,
        }
        return {
          name: m.model_name,
          description: m.display_name,
          contextWindow: m.context_window_size,
          isDefault: false,
        }
      }),
    }))

    return { llmProviders: providers as LLMProvider[], modelInfoMap: infoMap }
  }, [chatStore.availableLLMs])

  // Case-insensitive match for provider name (API vs message provider names may differ)
  const currentProvider = llmProviders.find(
    (p) => p.provider.toLowerCase() === store.selectedProvider?.toLowerCase()
  )

  const handleModelSelect = (modelName: string) => {
    if (!store.isMultiModel) {
      // Single model mode - select and close
      store.selectedModel = [modelName]
      store.isPanelCOpen = false
    } else {
      // Multi model mode - toggle selection
      const isSelected = store.selectedModel?.includes(modelName) ?? false
      if (isSelected) {
        store.selectedModel = store.selectedModel?.filter((m) => m !== modelName) ?? null
      } else {
        store.selectedModel = [...(store.selectedModel ?? []), modelName]
      }
    }
  }

  return (
    <div
      className={cn(
        'absolute z-50 w-[240px] sm:w-[280px]',
        'rounded-xl overflow-hidden',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200 dark:border-white/10',
        'shadow-xl shadow-zinc-200/50 dark:shadow-black/30',
        'transition-all duration-300 ease-out',
        // Position - right aligned
        isAbove ? 'bottom-full mb-2 right-0 sm:right-2' : 'top-full mt-2 right-0 sm:right-2',
        // Origin for animation
        isAbove ? 'origin-bottom-right' : 'origin-top-right',
        // Visibility
        isOpen
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : cn(
              'opacity-0 scale-95 pointer-events-none',
              isAbove ? 'translate-y-2' : '-translate-y-2'
            )
      )}
      role="menu"
      aria-hidden={!isOpen}
    >
      {/* Provider Selection - always show when we don't have a valid currentProvider */}
      {!currentProvider && (
        <div className="p-1.5 sm:p-2 animate-in fade-in duration-200">
          <div className="px-2 py-1.5 mb-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-white/50 uppercase tracking-wider">
              Select Provider
            </span>
          </div>
          {llmProviders.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-xs text-zinc-400 dark:text-white/40">
              <LuLoader size={16} className="animate-spin mr-2" />
              Loading models...
            </div>
          ) : (
            llmProviders.map((llm) => (
              <button
                key={llm.id}
                type="button"
                onClick={() => {
                  store.selectedProvider = llm.provider
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full p-2.5 sm:p-3 rounded-lg',
                  'text-left text-xs sm:text-sm',
                  'text-zinc-600 dark:text-white/60',
                  'hover:text-zinc-900 dark:hover:text-white',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-all duration-200'
                )}
              >
                <ProviderIcon provider={llm.provider} />
                <span className="flex-1">{capitalizeFirst(llm.provider)}</span>
                <span className="text-xs text-zinc-400 dark:text-white/30">
                  {llm.models.length}
                </span>
                <FiChevronRight size={14} className="text-zinc-400 dark:text-white/40" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Model Selection - show when a valid provider is selected */}
      {currentProvider && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <SearchHeader
            onBack={() => {
              store.selectedProvider = null
              setActiveTooltip(null)
            }}
            placeholder="Search models..."
          />

          <div className="p-1.5 sm:p-2 max-h-[300px] overflow-y-auto">
            <div className="px-2 py-1.5 mb-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-white/50">
                {capitalizeFirst(currentProvider.provider)} Models
              </span>
            </div>

            {currentProvider.models.map((model) => {
              const isSelected = store.selectedModel?.includes(model.name) ?? false
              const modelInfo = modelInfoMap[model.name]
              const displayName = capitalizeFirst(
                modelInfo?.displayName || model.description || model.name
              )

              return (
                <div key={model.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleModelSelect(model.name)}
                    className={cn(
                      'flex items-center gap-2.5 flex-1 p-2.5 sm:p-3 rounded-lg',
                      'text-left text-xs sm:text-sm',
                      'transition-all duration-200',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                    )}
                  >
                    <span className="flex-1 truncate">{displayName}</span>
                    {store.isMultiModel && isSelected && (
                      <FaCheck size={12} className="text-blue-500 flex-shrink-0" />
                    )}
                  </button>

                  {/* Info Button */}
                  <button
                    ref={(el) => {
                      infoButtonRefs.current[model.name] = el
                    }}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTooltip(activeTooltip === model.name ? null : model.name)
                    }}
                    className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      'text-zinc-400 dark:text-white/40',
                      'hover:text-zinc-600 dark:hover:text-white/70',
                      'hover:bg-zinc-100 dark:hover:bg-white/5',
                      'transition-all duration-200',
                      activeTooltip === model.name &&
                        'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-white/70'
                    )}
                    aria-label={`Info about ${displayName}`}
                  >
                    <LuInfo size={14} />
                  </button>

                  {/* Smart Tooltip */}
                  {modelInfo && (
                    <SmartTooltip
                      model={modelInfo}
                      isOpen={activeTooltip === model.name}
                      onClose={() => setActiveTooltip(null)}
                      triggerRef={{ current: infoButtonRefs.current[model.name] ?? null }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Models Summary (Multi-model mode) */}
      {store.isMultiModel && store.selectedModel && store.selectedModel.length > 0 && (
        <div className="p-2 border-t border-zinc-100 dark:border-white/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-white/80">
              Selected ({store.selectedModel.length})
            </span>
            <button
              type="button"
              onClick={() => {
                store.selectedModel = null
              }}
              className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {store.selectedModel.map((model) => (
              <div
                key={model}
                className={cn(
                  'group flex items-center justify-between p-2 rounded-lg',
                  'bg-zinc-50 dark:bg-white/5',
                  'border border-zinc-100 dark:border-white/10'
                )}
              >
                <span className="text-xs text-zinc-700 dark:text-white/80 truncate">{model}</span>
                <button
                  type="button"
                  onClick={() => {
                    store.selectedModel = store.selectedModel?.filter((m) => m !== model) ?? null
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                >
                  <LuX size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
