'use client'

import {
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Pin,
  PinOff,
  Search,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { GenericActionMeta } from '@/app/_hooks/UseGenericApiStore'
import type { GenericEndpointKeys } from '@/lib/api'

const PINNED_STORAGE_KEY = 'api-sandbox-pinned-endpoints'
const COLLAPSED_STORAGE_KEY = 'api-sandbox-collapsed-categories'

export type EndpointCategory =
  | 'all'
  | 'generic'
  | 'custom'
  | 'vorion-llm'
  | 'vorion-rag'
  | 'vorion-mcp'

export const CATEGORIES: {
  id: EndpointCategory
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    id: 'all',
    label: 'Tümü',
    icon: <Zap className="h-4 w-4" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    id: 'generic',
    label: 'Generic',
    icon: <Database className="h-4 w-4" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: <Code2 className="h-4 w-4" />,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'vorion-llm',
    label: 'Vorion LLM',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'vorion-rag',
    label: 'Vorion RAG',
    icon: <Database className="h-4 w-4" />,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'vorion-mcp',
    label: 'Vorion MCP',
    icon: <Wand2 className="h-4 w-4" />,
    color: 'from-pink-500 to-rose-500',
  },
]

export function getEndpointCategory(
  key: string,
  meta: GenericActionMeta | undefined
): EndpointCategory {
  if (key.startsWith('VORION_')) {
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
  if (meta?.kind === 'generic') return 'generic'
  return 'custom'
}

interface EndpointListProps {
  endpoints: GenericEndpointKeys[]
  metadata: Partial<Record<string, GenericActionMeta>>
  selectedEndpoint: string
  onSelect: (endpoint: GenericEndpointKeys) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: EndpointCategory
  onCategoryChange: (category: EndpointCategory) => void
}

export function EndpointList({
  endpoints,
  metadata,
  selectedEndpoint,
  onSelect,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: EndpointListProps) {
  // Pinned endpoints state
  const [pinnedEndpoints, setPinnedEndpoints] = useState<Set<string>>(new Set())
  // Collapsed categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPinned = localStorage.getItem(PINNED_STORAGE_KEY)
      if (savedPinned) {
        setPinnedEndpoints(new Set(JSON.parse(savedPinned)))
      }
      const savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (savedCollapsed) {
        setCollapsedCategories(new Set(JSON.parse(savedCollapsed)))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Toggle pin
  const togglePin = useCallback((endpoint: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedEndpoints((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(endpoint)) {
        newSet.delete(endpoint)
      } else {
        newSet.add(endpoint)
      }
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  // Toggle category collapse
  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  const filteredEndpoints = endpoints.filter((key) => {
    const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase())
    const category = getEndpointCategory(key, metadata[key])
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Separate pinned endpoints
  const pinnedFiltered = filteredEndpoints.filter((key) => pinnedEndpoints.has(key))
  const unpinnedFiltered = filteredEndpoints.filter((key) => !pinnedEndpoints.has(key))

  const groupedEndpoints: Record<string, GenericEndpointKeys[]> = {}
  for (const key of unpinnedFiltered) {
    const category = getEndpointCategory(key, metadata[key])
    if (!groupedEndpoints[category]) groupedEndpoints[category] = []
    groupedEndpoints[category].push(key)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Endpoint ara..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? `bg-gradient-to-r ${cat.color} text-white shadow-md`
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Endpoint List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-h-[calc(100vh-320px)] overflow-y-auto shadow-sm">
        {/* Pinned Endpoints */}
        {pinnedFiltered.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 sticky top-0 backdrop-blur-sm flex items-center gap-2">
              <Pin className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Pinned ({pinnedFiltered.length})
              </span>
            </div>
            {pinnedFiltered.map((endpoint) => {
              const isSelected = selectedEndpoint === endpoint
              const cat = getEndpointCategory(endpoint, metadata[endpoint])
              const catInfo = CATEGORIES.find((c) => c.id === cat)
              return (
                <div
                  key={endpoint}
                  className={`w-full px-4 py-3 text-sm transition-all flex items-center gap-2 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-l-4 border-violet-500 text-violet-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700 border-l-4 border-amber-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(endpoint)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <div
                      className={`h-2 w-2 rounded-full bg-gradient-to-r ${catInfo?.color || 'from-gray-400 to-gray-500'}`}
                    />
                    <span className="truncate flex-1">{endpoint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => togglePin(endpoint, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-100 rounded transition-all"
                    title="Unpin"
                  >
                    <PinOff className="h-3.5 w-3.5 text-amber-600" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Grouped Endpoints */}
        {Object.entries(groupedEndpoints).map(([category, items]) => {
          const isCollapsed = collapsedCategories.has(category)
          const catInfo = CATEGORIES.find((c) => c.id === category)
          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 sticky top-0 backdrop-blur-sm flex items-center justify-between hover:from-gray-100 hover:to-slate-100 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {catInfo?.label || category} ({items.length})
                </span>
              </button>
              {!isCollapsed &&
                items.map((endpoint) => {
                  const isSelected = selectedEndpoint === endpoint
                  const isPinned = pinnedEndpoints.has(endpoint)
                  return (
                    <div
                      key={endpoint}
                      className={`w-full px-4 py-3 text-sm transition-all flex items-center gap-2 group ${
                        isSelected
                          ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-l-4 border-violet-500 text-violet-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700 border-l-4 border-transparent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(endpoint)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <div
                          className={`h-2 w-2 rounded-full bg-gradient-to-r ${catInfo?.color || 'from-gray-400 to-gray-500'}`}
                        />
                        <span className="truncate flex-1">{endpoint}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => togglePin(endpoint, e)}
                        className={`p-1 rounded transition-all ${
                          isPinned
                            ? 'text-amber-600 bg-amber-50'
                            : 'opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400'
                        }`}
                        title={isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
            </div>
          )
        })}
        {filteredEndpoints.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Endpoint bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
