'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuCircleX,
  LuClock,
  LuCode,
  LuGlobe,
  LuLoader,
  LuLock,
  LuPlus,
  LuSearch,
  LuServer,
  LuSparkles,
  LuUsers,
  LuZap,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { cn } from '@/app/_utils'

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
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An error occurred'
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
    case 'inactive':
      return {
        icon: LuClock,
        label: 'Inactive',
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-500/10',
        dot: 'bg-zinc-400',
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

// ============================================================================
// Types
// ============================================================================

interface MCPServer {
  id: number
  user_id: string
  name: string
  slug: string
  description: string | null
  url: string | null
  config: string | null
  version: string
  is_public: boolean
  is_shared: boolean
  server_type: string
  status: string
  generated_code: string | null
  deployment_name: string | null
  k8s_yaml: string | null
  usage_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// ServerCard Component
// ============================================================================

function ServerCard({ server, index }: { server: MCPServer; index: number }) {
  const statusConfig = getStatusConfig(server.status)

  return (
    <Link
      href={`/pocs/vorion/mcp-servers/${server.id}`}
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
          'bg-gradient-to-br from-violet-500/5 via-transparent to-[#c68e76]/5',
          'transition-opacity duration-500'
        )}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'relative p-3 rounded-xl',
              'bg-gradient-to-br from-zinc-100 to-zinc-200',
              'dark:from-zinc-800 dark:to-zinc-900',
              'group-hover:from-violet-500/20 group-hover:to-[#c68e76]/20',
              'transition-all duration-500'
            )}
          >
            <LuServer
              size={22}
              className={cn(
                'text-zinc-500 dark:text-zinc-400',
                'group-hover:text-violet-500',
                'transition-colors duration-300'
              )}
            />
          </div>

          <div>
            <h3
              className={cn(
                'font-semibold text-zinc-900 dark:text-white',
                'group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300'
              )}
            >
              {server.name}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">/{server.slug}</p>
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
      {server.description && (
        <p className="relative text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
          {server.description}
        </p>
      )}

      {/* Stats Grid */}
      <div className="relative grid grid-cols-3 gap-3 mb-4">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-zinc-50 dark:bg-white/5',
            'border border-zinc-200/50 dark:border-white/5'
          )}
        >
          <LuSparkles size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">v{server.version}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-zinc-50 dark:bg-white/5',
            'border border-zinc-200/50 dark:border-white/5'
          )}
        >
          <LuZap size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {server.usage_count.toLocaleString()}
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-zinc-50 dark:bg-white/5',
            'border border-zinc-200/50 dark:border-white/5'
          )}
        >
          <LuCode size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">
            {server.server_type.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Deployment Status */}
      {server.deployment_name && (
        <div className="relative flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-500/10">
          <LuCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            Deployed: {server.deployment_name}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {server.is_public ? (
              <LuGlobe size={12} className="text-emerald-500" />
            ) : server.is_shared ? (
              <LuUsers size={12} className="text-blue-500" />
            ) : (
              <LuLock size={12} className="text-zinc-400" />
            )}
            <span className="text-xs text-zinc-400">
              {server.is_public ? 'Public' : server.is_shared ? 'Shared' : 'Private'}
            </span>
          </div>
          <span className="text-zinc-200 dark:text-zinc-700">•</span>
          <span className="text-xs text-zinc-400">{formatDate(server.created_at)}</span>
        </div>

        <LuChevronRight
          size={16}
          className={cn(
            'text-zinc-300 dark:text-zinc-600',
            'group-hover:text-violet-500 group-hover:translate-x-1',
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
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-500/20 dark:to-violet-600/20 mb-6">
        <LuServer size={32} className="text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No MCP Servers</h3>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
        Create your first MCP server to start deploying tools
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
          'bg-gradient-to-r from-violet-500 to-violet-600',
          'hover:from-violet-600 hover:to-violet-700',
          'text-white font-medium',
          'shadow-lg shadow-violet-500/25',
          'transition-all duration-300 hover:scale-105'
        )}
      >
        <LuPlus size={18} />
        Create MCP Server
      </button>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function MCPServersPage() {
  const actions = useGenericApiActions()
  const [servers, setServers] = useState<MCPServer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Create Server Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerDescription, setNewServerDescription] = useState('')
  const [newServerType, setNewServerType] = useState('fastmcp')
  const [newServerIsPublic, setNewServerIsPublic] = useState(false)

  // Load servers on mount
  useEffect(() => {
    actions.VORION_LIST_MCP_SERVERS?.start({
      payload: { page: 1, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          setServers(data.items)
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
    actions.VORION_LIST_MCP_SERVERS?.start({
      payload: { page: nextPage, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          const existingIds = new Set(servers.map((s) => s.id))
          const newItems = data.items.filter((s: MCPServer) => !existingIds.has(s.id))
          setServers((prev) => [...prev, ...newItems])
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
  }, [currentPage, hasMore, isLoadingMore, servers])

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
  const filteredServers = servers.filter((server) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      server.name.toLowerCase().includes(q) ||
      server.slug.toLowerCase().includes(q) ||
      server.description?.toLowerCase().includes(q)
    )
  })

  const isLoading = actions.VORION_LIST_MCP_SERVERS?.state?.isPending ?? false

  // Refresh servers list
  const refreshServers = useCallback(() => {
    actions.VORION_LIST_MCP_SERVERS?.start({
      payload: { page: 1, page_size: PAGE_SIZE },
      onAfterHandle: (data) => {
        if (data?.items) {
          setServers(data.items)
          setTotalCount(data.total || 0)
          setHasMore(data.items.length >= PAGE_SIZE && data.page < data.total_pages)
          setCurrentPage(1)
        }
      },
    })
  }, [])

  // Create server
  const handleCreateServer = useCallback(() => {
    if (!newServerName.trim()) {
      toast.error('Server name is required')
      return
    }

    actions.VORION_CREATE_MCP_SERVER?.start({
      payload: {
        name: newServerName,
        description: newServerDescription || undefined,
        server_type: newServerType,
        is_public: newServerIsPublic,
      },
      onAfterHandle: (result) => {
        if (result) {
          toast.success(`Server "${result.name}" created!`)
          setShowCreateModal(false)
          setNewServerName('')
          setNewServerDescription('')
          setNewServerType('fastmcp')
          setNewServerIsPublic(false)
          refreshServers()
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [newServerName, newServerDescription, newServerType, newServerIsPublic, refreshServers])

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
                <LuChevronRight size={20} className="rotate-180" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-[#c68e76]/20">
                  <LuServer size={20} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">MCP Servers</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {totalCount > 0 ? `${totalCount} servers` : 'Deploy and manage servers'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-gradient-to-r from-violet-500 to-violet-600',
                'hover:from-violet-600 hover:to-violet-700',
                'text-white font-medium text-sm',
                'shadow-lg shadow-violet-500/20',
                'transition-all duration-300 hover:scale-105'
              )}
            >
              <LuPlus size={16} />
              <span className="hidden sm:inline">New Server</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        {servers.length > 0 && (
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
                placeholder="Search servers..."
                className={cn(
                  'w-full pl-11 pr-4 py-3 rounded-xl',
                  'bg-white dark:bg-zinc-900',
                  'border border-zinc-200 dark:border-white/10',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500/50',
                  'transition-all'
                )}
              />
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading && servers.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader size={32} className="animate-spin text-violet-500" />
          </div>
        ) : servers.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : filteredServers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 dark:text-zinc-400">No servers found for "{searchQuery}"</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServers.map((server, index) => (
                <ServerCard key={server.id} server={server} index={index} />
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
            {!hasMore && servers.length > PAGE_SIZE && (
              <div className="text-center py-6 text-sm text-zinc-400">
                All {totalCount} servers loaded
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={() => setShowCreateModal(false)}
            aria-label="Close modal"
          />

          <div
            className={cn(
              'relative w-full max-w-lg max-h-[90vh] overflow-hidden',
              'bg-white dark:bg-zinc-900',
              'rounded-2xl shadow-2xl',
              'border border-zinc-200 dark:border-white/10',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <LuServer size={20} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Create MCP Server
                  </h2>
                  <p className="text-sm text-zinc-500">Deploy a new MCP server</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <LuCircleX size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="server-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Name *
                </label>
                <input
                  id="server-name"
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="My MCP Server"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="server-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="server-description"
                  value={newServerDescription}
                  onChange={(e) => setNewServerDescription(e.target.value)}
                  placeholder="Describe your server..."
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="server-type"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Server Type
                </label>
                <select
                  id="server-type"
                  value={newServerType}
                  onChange={(e) => setNewServerType(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
                  )}
                >
                  <option value="fastmcp">FastMCP</option>
                  <option value="standard">Standard</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="server-public"
                  type="checkbox"
                  checked={newServerIsPublic}
                  onChange={(e) => setNewServerIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-500 focus:ring-violet-500"
                />
                <label htmlFor="server-public" className="text-sm text-zinc-700 dark:text-zinc-300">
                  Make this server public
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium',
                  'text-zinc-600 dark:text-zinc-400',
                  'hover:bg-zinc-100 dark:hover:bg-white/5',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateServer}
                disabled={
                  actions.VORION_CREATE_MCP_SERVER?.state?.isPending || !newServerName.trim()
                }
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-violet-500 to-violet-600',
                  'hover:from-violet-600 hover:to-violet-700',
                  'text-white',
                  'transition-all',
                  (actions.VORION_CREATE_MCP_SERVER?.state?.isPending || !newServerName.trim()) &&
                    'opacity-50'
                )}
              >
                {actions.VORION_CREATE_MCP_SERVER?.state?.isPending ? (
                  <LuLoader size={14} className="animate-spin" />
                ) : (
                  <LuPlus size={14} />
                )}
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
