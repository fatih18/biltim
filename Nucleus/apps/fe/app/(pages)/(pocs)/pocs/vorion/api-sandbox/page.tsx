'use client'

import Editor from '@monaco-editor/react'
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  Database,
  Loader2,
  Pin,
  PinOff,
  Play,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  useGenericApiStore as useGenericApiActions,
  useGenericApiMetadata,
} from '@/app/_hooks/UseGenericApiStore'
import { buildPayloadTemplate, cn, formatJson } from '@/app/_utils'
import {
  type GenericEndpointKeys,
  streamVorionPrediction,
  type VorionPredictionRequest,
} from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

type DynamicActionStart = (options: {
  payload: unknown
  onAfterHandle: (data: unknown) => void
  onErrorHandle: (error: unknown, code: number | null) => void
}) => Promise<void>

type VorionCategory = 'all' | 'vorion-llm' | 'vorion-rag' | 'vorion-mcp'

interface HistoryItem {
  id: string
  endpoint: string
  payload: unknown
  response: unknown
  isSuccess: boolean
  timestamp: Date
}

// ============================================================================
// Constants
// ============================================================================

const PINNED_STORAGE_KEY = 'vorion-api-sandbox-pinned'
const COLLAPSED_STORAGE_KEY = 'vorion-api-sandbox-collapsed'

// Monochrome corporate palette
const VORION_CATEGORIES: {
  id: VorionCategory
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: 'all',
    label: 'All Endpoints',
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  {
    id: 'vorion-llm',
    label: 'LLM',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: 'vorion-rag',
    label: 'RAG',
    icon: <Database className="h-3.5 w-3.5" />,
  },
  {
    id: 'vorion-mcp',
    label: 'MCP',
    icon: <Wand2 className="h-3.5 w-3.5" />,
  },
]

function getVorionCategory(key: string): VorionCategory {
  if (key.includes('LLM') || key.includes('CONVERSATION') || key.includes('PREDICTION')) {
    return 'vorion-llm'
  }
  if (
    key.includes('KNOWLEDGE') ||
    key.includes('DOCUMENT') ||
    key.includes('BATCH') ||
    key.includes('RAG') ||
    key.includes('SEARCH_KB')
  ) {
    return 'vorion-rag'
  }
  return 'vorion-mcp'
}

// ============================================================================
// Helpers
// ============================================================================

function isValidJson(value: string): boolean {
  if (!value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function extractFields(obj: unknown, prefix = ''): Array<{ key: string; value: string }> {
  const fields: Array<{ key: string; value: string }> = []
  if (obj === null || obj === undefined) return fields
  if (typeof obj !== 'object') {
    return [{ key: prefix || 'value', value: String(obj) }]
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`
      if (typeof item === 'object' && item !== null) {
        fields.push(...extractFields(item, itemPrefix))
      } else {
        fields.push({ key: itemPrefix, value: String(item) })
      }
    })
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const fieldKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        fields.push(...extractFields(value, fieldKey))
      } else {
        fields.push({ key: fieldKey, value: String(value) })
      }
    }
  }
  return fields
}

// ============================================================================
// Sub-Components
// ============================================================================

function EndpointList({
  endpoints,
  selectedEndpoint,
  onSelect,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: {
  endpoints: GenericEndpointKeys[]
  selectedEndpoint: string
  onSelect: (endpoint: GenericEndpointKeys) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: VorionCategory
  onCategoryChange: (category: VorionCategory) => void
}) {
  const [pinnedEndpoints, setPinnedEndpoints] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const savedPinned = localStorage.getItem(PINNED_STORAGE_KEY)
      if (savedPinned) setPinnedEndpoints(new Set(JSON.parse(savedPinned)))
      const savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (savedCollapsed) setCollapsedCategories(new Set(JSON.parse(savedCollapsed)))
    } catch {
      // Ignore
    }
  }, [])

  const togglePin = useCallback((endpoint: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedEndpoints((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(endpoint)) newSet.delete(endpoint)
      else newSet.add(endpoint)
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) newSet.delete(category)
      else newSet.add(category)
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  const filteredEndpoints = endpoints.filter((key) => {
    const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase())
    const category = getVorionCategory(key)
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const pinnedFiltered = filteredEndpoints.filter((key) => pinnedEndpoints.has(key))
  const unpinnedFiltered = filteredEndpoints.filter((key) => !pinnedEndpoints.has(key))

  const groupedEndpoints: Record<string, GenericEndpointKeys[]> = {}
  for (const key of unpinnedFiltered) {
    const category = getVorionCategory(key)
    if (!groupedEndpoints[category]) groupedEndpoints[category] = []
    groupedEndpoints[category].push(key)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {VORION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px',
              selectedCategory === cat.id
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Endpoint List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[calc(100vh-320px)] overflow-y-auto">
        {/* Pinned */}
        {pinnedFiltered.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 flex items-center gap-2">
              <Pin className="h-3 w-3 text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Pinned · {pinnedFiltered.length}
              </span>
            </div>
            {pinnedFiltered.map((endpoint) => {
              const isSelected = selectedEndpoint === endpoint
              return (
                <div key={endpoint} className="flex items-center group">
                  <button
                    type="button"
                    onClick={() => onSelect(endpoint)}
                    className={cn(
                      'flex-1 px-4 py-2.5 text-left text-[13px] transition-all flex items-center gap-3',
                      isSelected
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <Pin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate font-mono text-xs">{endpoint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => togglePin(endpoint, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
                  >
                    <PinOff className="h-3 w-3 text-zinc-500" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Grouped */}
        {Object.entries(groupedEndpoints).map(([category, items]) => {
          const isCollapsed = collapsedCategories.has(category)
          const catInfo = VORION_CATEGORIES.find((c) => c.id === category)
          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-zinc-400" />
                )}
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  {catInfo?.label || category} · {items.length}
                </span>
              </button>
              {!isCollapsed &&
                items.map((endpoint) => {
                  const isSelected = selectedEndpoint === endpoint
                  const isPinned = pinnedEndpoints.has(endpoint)
                  return (
                    <div key={endpoint} className="flex items-center group">
                      <button
                        type="button"
                        onClick={() => onSelect(endpoint)}
                        className={cn(
                          'flex-1 px-4 py-2.5 text-left text-[13px] transition-all flex items-center gap-3',
                          isSelected
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400'
                        )}
                      >
                        <span className="truncate font-mono text-xs">{endpoint}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => togglePin(endpoint, e)}
                        className={cn(
                          'p-2 transition-all',
                          isPinned
                            ? 'text-zinc-900 dark:text-white bg-zinc-200 dark:bg-white/20'
                            : 'opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400'
                        )}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
            </div>
          )
        })}

        {filteredEndpoints.length === 0 && (
          <div className="p-8 text-center text-zinc-400 dark:text-white/40">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Endpoint bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}

function JsonEditor({
  value,
  onChange,
  onAutoFill,
}: {
  value: string
  onChange: (value: string) => void
  onAutoFill?: () => void
}) {
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (!value.trim()) {
      setJsonError(null)
      return
    }
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }, [value])

  const handleFormat = useCallback(() => {
    if (!value.trim()) return
    try {
      const parsed = JSON.parse(value)
      onChange(JSON.stringify(parsed, null, 2))
    } catch {
      // ignore
    }
  }, [value, onChange])

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Request
        </span>
        <div className="flex items-center gap-px">
          {onAutoFill && (
            <button
              type="button"
              onClick={onAutoFill}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <Wand2 className="h-3 w-3" />
              Fill
            </button>
          )}
          <button
            type="button"
            onClick={handleFormat}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <Code2 className="h-3 w-3" />
            Format
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="relative h-80">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(v) => onChange(v || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 16, bottom: 16 },
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            fontFamily: 'JetBrains Mono, Monaco, monospace',
          }}
          loading={
            <div className="h-full flex items-center justify-center text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          }
        />
        {jsonError && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-red-500 text-white text-[10px] font-medium">
            {jsonError}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldCopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 text-left transition-all w-full',
        copied
          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
          : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-medium opacity-60 truncate">{label}</div>
        <div className="text-[10px] font-mono truncate">{value}</div>
      </div>
      {copied ? (
        <Check className="h-3 w-3 flex-shrink-0" />
      ) : (
        <Copy className="h-3 w-3 flex-shrink-0 opacity-40" />
      )}
    </button>
  )
}

function ResponseViewer({
  response,
  isSuccess,
  isLoading,
  isStreaming,
  streamingText,
}: {
  response: unknown
  isSuccess: boolean | null
  isLoading?: boolean
  isStreaming?: boolean
  streamingText?: string
}) {
  const [copied, setCopied] = useState(false)
  const [showFields, setShowFields] = useState(false)

  const displayText = streamingText || (response ? JSON.stringify(response, null, 2) : '')
  const fields = response ? extractFields(response) : []

  const handleCopy = useCallback(() => {
    if (!displayText) return
    navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [displayText])

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Response
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-900 dark:text-white animate-pulse">
              <Radio className="h-3 w-3" />
              streaming
            </span>
          )}
          {!isStreaming && isSuccess !== null && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium uppercase',
                isSuccess
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-red-500 text-white'
              )}
            >
              {isSuccess ? 'OK' : 'ERR'}
            </span>
          )}
        </div>
        {displayText && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <div className="h-80 relative">
        {isLoading && !isStreaming ? (
          <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : isStreaming && streamingText ? (
          <div className="h-full p-4 overflow-auto bg-zinc-950">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-zinc-300">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 bg-white animate-pulse ml-0.5" />
            </pre>
          </div>
        ) : displayText ? (
          <Editor
            height="100%"
            defaultLanguage="json"
            value={displayText}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 16, bottom: 16 },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              domReadOnly: true,
              fontFamily: 'JetBrains Mono, Monaco, monospace',
            }}
            loading={
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              </div>
            }
          />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-950">
            <div className="text-center">
              <span className="text-xs font-mono">No response</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Copy Fields */}
      {fields.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowFields(!showFields)}
            className="w-full px-4 py-1.5 flex items-center justify-between text-[10px] font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <span>Fields · {fields.length}</span>
            {showFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showFields && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {fields.map((field) => (
                <FieldCopyButton key={field.key} label={field.key} value={field.value} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResponseHistory({
  history,
  onClear,
  onReplay,
}: {
  history: HistoryItem[]
  onClear: () => void
  onReplay: (item: HistoryItem) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (history.length === 0) return null

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            History
          </span>
          <span className="text-[10px] text-zinc-400">{history.length}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
        {history.map((item) => (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-1 py-0.5 text-[9px] font-semibold uppercase',
                    item.isSuccess
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-red-500 text-white'
                  )}
                >
                  {item.isSuccess ? 'OK' : 'ERR'}
                </span>
                <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                  {item.endpoint}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">{timeAgo(item.timestamp)}</span>
            </button>
            {expandedId === item.id && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
                <button
                  type="button"
                  onClick={() => onReplay(item)}
                  className="mb-2 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  → Replay
                </button>
                <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 p-2 overflow-auto max-h-24">
                  {JSON.stringify(item.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StringifyTool({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStringify = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(JSON.stringify(parsed)))
      setError(null)
    } catch {
      setOutput(JSON.stringify(input))
      setError(null)
    }
  }, [input])

  const handleParse = useCallback(() => {
    if (!input.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      const parsed = JSON.parse(input)
      if (typeof parsed === 'string') {
        try {
          const doubleParsed = JSON.parse(parsed)
          setOutput(JSON.stringify(doubleParsed, null, 2))
        } catch {
          setOutput(parsed)
        }
      } else {
        setOutput(JSON.stringify(parsed, null, 2))
      }
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [input])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-zinc-900 dark:text-white" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              Stringify Tool
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">
              Input
            </span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste JSON..."
              className="w-full h-24 p-3 text-xs font-mono border-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 resize-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleStringify}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
            >
              Stringify →
            </button>
            <button
              type="button"
              onClick={handleParse}
              className="flex-1 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              ← Parse
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Output
              </span>
              {output && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div
              className={cn(
                'w-full h-24 p-3 text-xs font-mono overflow-auto',
                error
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              )}
            >
              {error ? (
                <span>{error}</span>
              ) : (
                <pre className="whitespace-pre-wrap break-all">{output}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function VorionApiSandbox() {
  const actions = useGenericApiActions()
  const metadata = useGenericApiMetadata()

  // Filter only VORION_ endpoints
  const endpoints = useMemo<GenericEndpointKeys[]>(
    () =>
      (Object.keys(actions) as string[])
        .filter((key) => key.startsWith('VORION_') && actions[key as GenericEndpointKeys])
        .map((key) => key as GenericEndpointKeys),
    [actions]
  )

  const [selectedEndpoint, setSelectedEndpoint] = useState<GenericEndpointKeys | ''>('')
  const [payloadInput, setPayloadInput] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<VorionCategory>('all')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showStringifyTool, setShowStringifyTool] = useState(false)

  useEffect(() => {
    const firstEndpoint = endpoints[0]
    if (!selectedEndpoint && firstEndpoint) {
      setSelectedEndpoint(firstEndpoint)
    }
  }, [endpoints, selectedEndpoint])

  const selectedMeta = selectedEndpoint
    ? metadata[selectedEndpoint as GenericEndpointKeys]
    : undefined
  const endpointCategory = selectedEndpoint ? getVorionCategory(selectedEndpoint) : null
  const categoryInfo = VORION_CATEGORIES.find((c) => c.id === endpointCategory)

  const handleInvoke = useCallback(async () => {
    if (!selectedEndpoint || !isValidJson(payloadInput)) return

    let parsedPayload: unknown
    if (payloadInput.trim().length > 0) {
      try {
        parsedPayload = JSON.parse(payloadInput)
      } catch {
        return
      }
    }

    // Handle streaming endpoint
    if ((selectedEndpoint as string).includes('STREAMING_PREDICTION')) {
      setIsLoading(false)
      setIsStreaming(true)
      setStreamingText('')
      setResponse(null)
      setIsSuccess(null)

      try {
        const payload = parsedPayload as { data: VorionPredictionRequest }
        const request = payload?.data
        if (!request) throw new Error('Missing data field in payload')

        let fullText = ''
        for await (const chunk of streamVorionPrediction(request)) {
          fullText += chunk.chunk
          flushSync(() => setStreamingText(fullText))

          if (chunk.is_final) {
            setResponse({
              message_id: chunk.message_id,
              conversation_id: chunk.conversation_id,
              full_response: fullText,
              input_tokens: chunk.input_tokens,
              output_tokens: chunk.output_tokens,
              total_tokens: chunk.total_tokens,
              model_name: chunk.model_name,
              model_provider: chunk.model_provider,
            })
            setIsSuccess(true)
          }
        }
      } catch (error) {
        setResponse({ error: String(error) })
        setIsSuccess(false)
      } finally {
        setIsStreaming(false)
      }
      return
    }

    // Normal endpoint
    const key = selectedEndpoint as GenericEndpointKeys
    const action = actions[key]
    if (!action) return

    setIsLoading(true)
    setResponse(null)
    setIsSuccess(null)
    setStreamingText('')

    await (action.start as DynamicActionStart)({
      payload: parsedPayload,
      onAfterHandle: (data) => {
        setResponse(data)
        setIsSuccess(true)
        setIsLoading(false)
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            endpoint: selectedEndpoint,
            payload: parsedPayload,
            response: data,
            isSuccess: true,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ])
      },
      onErrorHandle: (error, code) => {
        const errorResponse = { error, code }
        setResponse(errorResponse)
        setIsSuccess(false)
        setIsLoading(false)
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            endpoint: selectedEndpoint,
            payload: parsedPayload,
            response: errorResponse,
            isSuccess: false,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ])
      },
    })
  }, [payloadInput, selectedEndpoint, actions])

  const handleFillWithFaker = useCallback(() => {
    if (!selectedEndpoint || !selectedMeta) return
    const template = buildPayloadTemplate(selectedMeta)
    setPayloadInput(formatJson(template))
  }, [selectedEndpoint, selectedMeta])

  const handleSelectEndpoint = useCallback(
    (endpoint: GenericEndpointKeys) => {
      setSelectedEndpoint(endpoint)
      setResponse(null)
      setIsSuccess(null)
      const meta = metadata[endpoint]
      if (meta) {
        const template = buildPayloadTemplate(meta)
        setPayloadInput(formatJson(template))
      }
    },
    [metadata]
  )

  // Keyboard shortcut: Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleInvoke()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleInvoke])

  const handleClearHistory = useCallback(() => setHistory([]), [])

  const handleReplayHistory = useCallback((item: HistoryItem) => {
    setSelectedEndpoint(item.endpoint as GenericEndpointKeys)
    setPayloadInput(formatJson(item.payload))
    setResponse(null)
    setIsSuccess(null)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-zinc-900 dark:bg-white flex items-center justify-center">
                <Zap className="h-4 w-4 text-white dark:text-zinc-900" />
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight">
                API Sandbox
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-500 font-mono">Vorion Endpoints</span>
          </div>
          <button
            type="button"
            onClick={() => setShowStringifyTool(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Braces className="h-3.5 w-3.5" />
            Stringify
          </button>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto">
        <div className="grid grid-cols-12">
          {/* Sidebar */}
          <div className="col-span-3 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[calc(100vh-56px)] p-4">
            <EndpointList
              endpoints={endpoints}
              selectedEndpoint={selectedEndpoint}
              onSelect={handleSelectEndpoint}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Main Content */}
          <div className="col-span-9 p-6 space-y-4">
            {/* Selected Endpoint */}
            {selectedEndpoint && (
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      {categoryInfo?.label}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {selectedMeta?.kind || 'custom'}
                    </span>
                  </div>
                  <h2 className="text-lg font-mono font-medium text-zinc-900 dark:text-white">
                    {selectedEndpoint}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleInvoke}
                  disabled={isLoading || !isValidJson(payloadInput)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all"
                  title="⌘+Enter"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isLoading ? 'Running...' : 'Execute'}
                  <span className="text-[10px] opacity-50 ml-1">⌘↵</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <JsonEditor
                value={payloadInput}
                onChange={setPayloadInput}
                onAutoFill={handleFillWithFaker}
              />
              <ResponseViewer
                response={response}
                isSuccess={isSuccess}
                isLoading={isLoading}
                isStreaming={isStreaming}
                streamingText={streamingText}
              />
            </div>

            <ResponseHistory
              history={history}
              onClear={handleClearHistory}
              onReplay={handleReplayHistory}
            />
          </div>
        </div>
      </div>

      <StringifyTool isOpen={showStringifyTool} onClose={() => setShowStringifyTool(false)} />
    </div>
  )
}
