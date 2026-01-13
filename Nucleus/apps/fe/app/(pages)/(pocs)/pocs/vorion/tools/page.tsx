'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuClock,
  LuCode,
  LuGlobe,
  LuLoader,
  LuLock,
  LuPlay,
  LuPlus,
  LuSearch,
  LuSparkles,
  LuTerminal,
  LuUsers,
  LuZap,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { cn } from '@/app/_utils'
import type { VorionToolResponse } from '@/lib/api'
import { CreateToolModal } from '../_components'

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20

// ============================================================================
// Helpers
// ============================================================================

function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error)
      return parsed.detail || parsed.message || error
    } catch {
      return error
    }
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    return String(e.detail || e.message || 'An error occurred')
  }
  return 'An error occurred'
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return {
        icon: LuCheck,
        label: 'Active',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        dot: 'bg-emerald-500',
      }
    case 'draft':
      return {
        icon: LuCircle,
        label: 'Draft',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        dot: 'bg-amber-500',
      }
    case 'archived':
      return {
        icon: LuClock,
        label: 'Archived',
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-500/10',
        dot: 'bg-zinc-400',
      }
    default:
      return {
        icon: LuCircle,
        label: String(status),
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-500/10',
        dot: 'bg-zinc-400',
      }
  }
}

function getLanguageConfig(language: string) {
  switch (language?.toLowerCase()) {
    case 'python':
      return { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-500/10' }
    case 'javascript':
    case 'typescript':
      return { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' }
    case 'go':
      return { color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10' }
    default:
      return { color: 'text-zinc-600', bg: 'bg-zinc-50 dark:bg-zinc-500/10' }
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatExecutionTime(ms: number | null) {
  if (!ms) return null
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// ============================================================================
// ToolCard Component
// ============================================================================

function ToolCard({ tool, index }: { tool: VorionToolResponse; index: number }) {
  const statusConfig = getStatusConfig(tool.status)
  const langConfig = getLanguageConfig(tool.language)

  return (
    <Link
      href={`/pocs/vorion/tools/${tool.id}`}
      className={cn(
        'group relative block p-5 rounded-2xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10',
        'hover:border-zinc-300 dark:hover:border-white/20',
        'hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/30',
        'transition-all duration-300',
        'animate-in fade-in slide-in-from-bottom-3'
      )}
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
    >
      {/* Gradient Accent */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100',
          'bg-gradient-to-br from-[#c68e76]/5 via-transparent to-violet-500/5',
          'transition-opacity duration-500'
        )}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon with gradient */}
          <div
            className={cn(
              'relative p-3 rounded-xl',
              'bg-gradient-to-br from-zinc-100 to-zinc-200',
              'dark:from-zinc-800 dark:to-zinc-900',
              'group-hover:from-[#c68e76]/20 group-hover:to-violet-500/20',
              'transition-all duration-500'
            )}
          >
            <LuTerminal
              size={22}
              className={cn(
                'text-zinc-500 dark:text-zinc-400',
                'group-hover:text-[#c68e76]',
                'transition-colors duration-300'
              )}
            />
            {/* Pulse effect on hover */}
            <div
              className={cn(
                'absolute inset-0 rounded-xl',
                'bg-[#c68e76]/20 opacity-0 group-hover:opacity-100',
                'animate-pulse group-hover:animate-none',
                'transition-opacity'
              )}
            />
          </div>

          <div>
            <h3
              className={cn(
                'font-semibold text-zinc-900 dark:text-white',
                'group-hover:text-[#c68e76] transition-colors duration-300'
              )}
            >
              {tool.name}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">/{tool.slug}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            statusConfig.bg,
            'border border-current/10'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
          <span className={cn('text-[10px] font-medium', statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {tool.description && (
        <p className="relative text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
          {tool.description}
        </p>
      )}

      {/* Stats Grid */}
      <div className="relative grid grid-cols-3 gap-3 mb-4">
        {/* Language */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            langConfig.bg,
            'border border-current/5'
          )}
        >
          <LuCode size={12} className={langConfig.color} />
          <span className={cn('text-xs font-medium capitalize', langConfig.color)}>
            {tool.language}
          </span>
        </div>

        {/* Version */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-zinc-50 dark:bg-white/5',
            'border border-zinc-200/50 dark:border-white/5'
          )}
        >
          <LuSparkles size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">v{tool.version}</span>
        </div>

        {/* Usage */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-zinc-50 dark:bg-white/5',
            'border border-zinc-200/50 dark:border-white/5'
          )}
        >
          <LuZap size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {tool.usage_count.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Execution Stats */}
      {tool.average_execution_time_ms && (
        <div className="relative flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-500/10">
          <LuPlay size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            Avg: {formatExecutionTime(tool.average_execution_time_ms)}
          </span>
          {tool.last_executed_at && (
            <>
              <span className="text-emerald-400">•</span>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Last: {formatDate(tool.last_executed_at)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          {/* Visibility */}
          <div className="flex items-center gap-1.5">
            {tool.is_public ? (
              <LuGlobe size={12} className="text-emerald-500" />
            ) : tool.is_shared ? (
              <LuUsers size={12} className="text-blue-500" />
            ) : (
              <LuLock size={12} className="text-zinc-400" />
            )}
            <span className="text-xs text-zinc-400">
              {tool.is_public ? 'Public' : tool.is_shared ? 'Shared' : 'Private'}
            </span>
          </div>
          <span className="text-zinc-200 dark:text-zinc-700">•</span>
          <span className="text-xs text-zinc-400">{formatDate(tool.created_at)}</span>
        </div>

        <LuChevronRight
          size={16}
          className={cn(
            'text-zinc-300 dark:text-zinc-600',
            'group-hover:text-[#c68e76] group-hover:translate-x-1',
            'transition-all duration-300'
          )}
        />
      </div>
    </Link>
  )
}

// ============================================================================
// EmptyState Component
// ============================================================================

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20',
        'animate-in fade-in zoom-in-95 duration-500'
      )}
    >
      <div
        className={cn(
          'relative p-6 mb-6 rounded-3xl',
          'bg-gradient-to-br from-zinc-100 to-zinc-200',
          'dark:from-zinc-800 dark:to-zinc-900'
        )}
      >
        <LuTerminal size={48} className="text-zinc-400 dark:text-zinc-500" />
        <div
          className={cn(
            'absolute -top-2 -right-2 p-2 rounded-xl',
            'bg-[#c68e76]/20 animate-bounce'
          )}
        >
          <LuSparkles size={16} className="text-[#c68e76]" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No tools yet</h3>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-center max-w-sm">
        Create your first tool to extend AI capabilities with custom functions
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className={cn(
          'flex items-center gap-2 px-6 py-3 rounded-xl',
          'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
          'hover:from-[#b07d67] hover:to-[#9a6c58]',
          'text-white font-medium',
          'shadow-lg shadow-[#c68e76]/25',
          'transition-all duration-300 hover:scale-105'
        )}
      >
        <LuPlus size={18} />
        Create First Tool
      </button>
    </div>
  )
}

// ============================================================================
// ToolsPageContent Component
// ============================================================================

function ToolsPageContent() {
  const actions = useGenericApiActions()
  const searchParams = useSearchParams()
  const [tools, setTools] = useState<VorionToolResponse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true)
    }
  }, [searchParams])

  // Refresh tools list
  const refreshTools = useCallback(() => {
    actions.VORION_LIST_TOOLS?.start({
      payload: { page: 1, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          setTools(data.items)
          setTotalCount(data.total || 0)
          setHasMore(data.items.length >= PAGE_SIZE && data.page < data.total_pages)
          setCurrentPage(1)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Create tool handler
  const handleCreateTool = useCallback(
    (data: {
      name: string
      description: string
      language: string
      code: string
      tool_type: string
      is_public: boolean
      is_shared: boolean
      auto_version: boolean
    }) => {
      actions.VORION_CREATE_TOOL?.start({
        payload: {
          name: data.name,
          description: data.description || undefined,
          language: data.language,
          code: data.code || undefined,
          tool_type: data.tool_type,
          is_public: data.is_public,
          is_shared: data.is_shared,
          auto_version: data.auto_version,
        },
        onAfterHandle: (result) => {
          toast.success(`Tool "${result?.tool?.name}" created!`)
          setShowCreateModal(false)
          refreshTools()
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [refreshTools]
  )

  // Load tools on mount
  useEffect(() => {
    actions.VORION_LIST_TOOLS?.start({
      payload: { page: 1, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          setTools(data.items)
          setTotalCount(data.total || 0)
          setHasMore(data.items.length >= PAGE_SIZE && data.page < data.total_pages)
          setCurrentPage(1)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Load more
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)

    const nextPage = currentPage + 1
    actions.VORION_LIST_TOOLS?.start({
      payload: { page: nextPage, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          const existingIds = new Set(tools.map((t) => t.id))
          const newItems = data.items.filter((t: VorionToolResponse) => !existingIds.has(t.id))
          setTools((prev) => [...prev, ...newItems])
          setCurrentPage(nextPage)
          setHasMore(data.page < data.total_pages)
        }
        setIsLoadingMore(false)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
        setIsLoadingMore(false)
      },
    })
  }, [currentPage, hasMore, isLoadingMore, tools])

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) observer.observe(currentRef)

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [hasMore, isLoadingMore, loadMore])

  // Filter by search
  const filteredTools = tools.filter((tool) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.slug.toLowerCase().includes(q) ||
      tool.description?.toLowerCase().includes(q)
    )
  })

  const isLoading = actions.VORION_LIST_TOOLS?.state?.isPending ?? false

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-40',
          'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl',
          'border-b border-zinc-200 dark:border-white/10'
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center gap-4">
              <Link
                href="/pocs/vorion"
                className={cn(
                  'p-2 rounded-lg',
                  'text-zinc-400 hover:text-zinc-600 dark:hover:text-white',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                <LuArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Tools</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {totalCount > 0 ? `${totalCount} custom functions` : 'Extend AI with functions'}
                </p>
              </div>
            </div>

            {/* Right */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
                'hover:from-[#b07d67] hover:to-[#9a6c58]',
                'text-white font-medium text-sm',
                'shadow-lg shadow-[#c68e76]/20',
                'transition-all duration-300 hover:scale-105'
              )}
            >
              <LuPlus size={16} />
              <span className="hidden sm:inline">New Tool</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        {tools.length > 0 && (
          <div className="mb-8">
            <div className="relative max-w-md">
              <LuSearch
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className={cn(
                  'w-full pl-11 pr-4 py-3 rounded-xl',
                  'bg-white dark:bg-zinc-900',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50',
                  'transition-all'
                )}
              />
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading && tools.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader size={32} className="animate-spin text-[#c68e76]" />
          </div>
        ) : tools.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 dark:text-zinc-400">No tools found for "{searchQuery}"</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTools.map((tool, index) => (
                <ToolCard key={tool.id} tool={tool} index={index} />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {!searchQuery && hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <LuLoader size={20} className="animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {/* End indicator */}
            {!hasMore && tools.length > PAGE_SIZE && (
              <div className="text-center py-6 text-sm text-zinc-400">
                All {totalCount} tools loaded
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Tool Modal */}
      {showCreateModal && (
        <CreateToolModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTool}
          isLoading={actions.VORION_CREATE_TOOL?.state?.isPending}
        />
      )}
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function ToolsPage() {
  return (
    <Suspense fallback={null}>
      <ToolsPageContent />
    </Suspense>
  )
}
