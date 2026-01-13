'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  LuArrowLeft,
  LuCheck,
  LuCircle,
  LuCircleX,
  LuClock,
  LuCode,
  LuCopy,
  LuGitBranch,
  LuGlobe,
  LuLoader,
  LuLock,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuRocket,
  LuServer,
  LuSettings,
  LuSparkles,
  LuTerminal,
  LuTrash2,
  LuUsers,
  LuZap,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { cn } from '@/app/_utils'

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

interface Tool {
  id: number
  name: string
  slug: string
  description: string | null
  language: string
  status: string
  version: string
  usage_count: number
  average_execution_time_ms: number | null
  is_public: boolean
  is_shared: boolean
  tool_type: string
}

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
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { icon: LuCheck, label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-500' }
    case 'draft':
      return { icon: LuCircle, label: 'Draft', color: 'text-amber-600', bg: 'bg-amber-500' }
    case 'inactive':
      return { icon: LuClock, label: 'Inactive', color: 'text-zinc-600', bg: 'bg-zinc-400' }
    default:
      return { icon: LuCircle, label: status, color: 'text-zinc-600', bg: 'bg-zinc-400' }
  }
}

// ============================================================================
// StatCard Component
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}

// ============================================================================
// ToolCard Component
// ============================================================================

function ToolCard({
  tool,
  onRemove,
  isRemoving,
}: {
  tool: Tool
  onRemove: () => void
  isRemoving?: boolean
}) {
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500',
    draft: 'bg-amber-500',
    deprecated: 'bg-red-500',
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10',
        'transition-all hover:shadow-md'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5">
            <LuTerminal size={16} className="text-zinc-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-zinc-900 dark:text-white">{tool.name}</p>
              <span
                className={cn('w-2 h-2 rounded-full', statusColors[tool.status] || 'bg-zinc-400')}
              />
            </div>
            <p className="text-xs text-zinc-400 font-mono">/{tool.slug}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          className={cn(
            'p-2 rounded-lg',
            'text-zinc-400 hover:text-red-500',
            'hover:bg-red-50 dark:hover:bg-red-500/10',
            'transition-colors',
            isRemoving && 'opacity-50'
          )}
        >
          {isRemoving ? <LuLoader size={16} className="animate-spin" /> : <LuTrash2 size={16} />}
        </button>
      </div>

      {tool.description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">
          {tool.description}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-white/5">
          <LuCode size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{tool.language}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-white/5">
          <LuSparkles size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">v{tool.version}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-white/5">
          <LuZap size={12} className="text-zinc-400" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{tool.usage_count} calls</span>
        </div>
        {tool.average_execution_time_ms && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-white/5">
            <LuClock size={12} className="text-zinc-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {tool.average_execution_time_ms < 1000
                ? `${tool.average_execution_time_ms}ms`
                : `${(tool.average_execution_time_ms / 1000).toFixed(1)}s`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-white/5">
          {tool.is_public ? (
            <LuGlobe size={12} className="text-emerald-500" />
          ) : tool.is_shared ? (
            <LuUsers size={12} className="text-blue-500" />
          ) : (
            <LuLock size={12} className="text-zinc-400" />
          )}
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {tool.is_public ? 'Public' : tool.is_shared ? 'Shared' : 'Private'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CodePreview Component
// ============================================================================

function CodePreview({ code, title }: { code: string | null; title: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  if (!code) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <LuCode size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No {title.toLowerCase()} available</p>
      </div>
    )
  }

  const lines = code.split('\n')

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-sm">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
            'bg-zinc-100 dark:bg-white/5',
            'hover:bg-zinc-200 dark:hover:bg-white/10',
            'transition-colors'
          )}
        >
          {copied ? (
            <LuCheck size={12} className="text-emerald-500" />
          ) : (
            <LuCopy size={12} className="text-zinc-400" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="max-h-96 overflow-auto">
        <div className="flex">
          <div className="sticky left-0 flex-shrink-0 bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-200 dark:border-white/10 select-none">
            {lines.map((_, i) => (
              <div
                key={i}
                className="px-3 py-0 text-right text-xs font-mono text-zinc-400 leading-6"
              >
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="flex-1 p-4 text-sm font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
            {lines.map((line, i) => (
              <div
                key={i}
                className="leading-6 hover:bg-zinc-100/50 dark:hover:bg-white/5 -mx-4 px-4"
              >
                {line || ' '}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function MCPServerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serverId = Number(params.id)

  const actions = useGenericApiActions()
  const [server, setServer] = useState<MCPServer | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'code' | 'k8s'>('overview')

  // Edit Server Modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)

  // Add Tool Modal state
  const [showAddToolModal, setShowAddToolModal] = useState(false)
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null)

  // Load server
  useEffect(() => {
    actions.VORION_GET_MCP_SERVER?.start({
      payload: { _server_id: serverId },
      onAfterHandle: (data) => {
        if (data) setServer(data)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId])

  // Load server tools
  useEffect(() => {
    actions.VORION_GET_SERVER_TOOLS?.start({
      payload: { _server_id: serverId },
      onAfterHandle: (data) => {
        if (data) setTools(data)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId])

  // Generate code
  const handleGenerateCode = useCallback(() => {
    actions.VORION_GENERATE_SERVER_CODE?.start({
      payload: { _server_id: serverId },
      onAfterHandle: (result) => {
        if (result) {
          setServer(result)
          toast.success('Server code generated!')
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId])

  // Publish server
  const handlePublish = useCallback(() => {
    actions.VORION_PUBLISH_MCP_SERVER?.start({
      payload: { _server_id: serverId },
      onAfterHandle: (result) => {
        if (result) {
          setServer(result)
          toast.success('Server published and deployed!')
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId])

  // Undeploy server
  const handleUndeploy = useCallback(() => {
    if (!confirm('Are you sure you want to undeploy this server?')) return

    actions.VORION_UNDEPLOY_MCP_SERVER?.start({
      payload: { _server_id: serverId },
      onAfterHandle: () => {
        toast.success('Server undeployed')
        // Refresh server
        actions.VORION_GET_MCP_SERVER?.start({
          payload: { _server_id: serverId },
          onAfterHandle: (data) => {
            if (data) setServer(data)
          },
        })
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId])

  // Delete server
  const handleDelete = useCallback(() => {
    if (!confirm('Are you sure you want to delete this server?')) return

    actions.VORION_DELETE_MCP_SERVER?.start({
      payload: { _server_id: serverId },
      onAfterHandle: () => {
        toast.success('Server deleted!')
        router.push('/pocs/vorion/mcp-servers')
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId, router])

  // Remove tool from server
  const handleRemoveTool = useCallback(
    (toolId: number) => {
      actions.VORION_REMOVE_TOOL_FROM_SERVER?.start({
        payload: { _server_id: serverId, _tool_id: toolId },
        onAfterHandle: () => {
          toast.success('Tool removed from server')
          setTools((prev) => prev.filter((t) => t.id !== toolId))
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [serverId]
  )

  // Update server
  const handleUpdateServer = useCallback(() => {
    if (!editName.trim()) {
      toast.error('Server name is required')
      return
    }

    actions.VORION_UPDATE_MCP_SERVER?.start({
      payload: {
        _server_id: serverId,
        name: editName,
        description: editDescription || undefined,
        is_public: editIsPublic,
      },
      onAfterHandle: () => {
        setShowEditModal(false)
        toast.success('Server updated!')
        // Refresh server
        actions.VORION_GET_MCP_SERVER?.start({
          payload: { _server_id: serverId },
          onAfterHandle: (data) => {
            if (data) setServer(data)
          },
        })
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId, editName, editDescription, editIsPublic])

  // Load available tools for adding
  const loadAvailableTools = useCallback(() => {
    actions.VORION_LIST_TOOLS?.start({
      payload: { page: 1, page_size: 100 },
      onAfterHandle: (data) => {
        if (data?.items) {
          // Filter out tools already added
          const existingIds = new Set(tools.map((t) => t.id))
          setAvailableTools(data.items.filter((t: Tool) => !existingIds.has(t.id)))
        }
      },
    })
  }, [tools])

  // Add tool to server
  const handleAddTool = useCallback(() => {
    if (!selectedToolId) {
      toast.error('Please select a tool')
      return
    }

    actions.VORION_ADD_TOOL_TO_SERVER?.start({
      payload: { _server_id: serverId, _tool_id: selectedToolId },
      onAfterHandle: () => {
        toast.success('Tool added to server!')
        setShowAddToolModal(false)
        setSelectedToolId(null)
        // Refresh tools
        actions.VORION_GET_SERVER_TOOLS?.start({
          payload: { _server_id: serverId },
          onAfterHandle: (data) => {
            if (data) setTools(data)
          },
        })
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [serverId, selectedToolId])

  const isLoading = actions.VORION_GET_MCP_SERVER?.state?.isPending ?? false
  const isDeleting = actions.VORION_DELETE_MCP_SERVER?.state?.isPending ?? false
  const isGenerating = actions.VORION_GENERATE_SERVER_CODE?.state?.isPending ?? false
  const isPublishing = actions.VORION_PUBLISH_MCP_SERVER?.state?.isPending ?? false

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <LuLoader size={32} className="animate-spin text-violet-500" />
      </div>
    )
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <LuServer size={48} className="text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Server Not Found
        </h2>
        <Link href="/pocs/vorion/mcp-servers" className="text-violet-500 hover:underline">
          Back to Servers
        </Link>
      </div>
    )
  }

  const statusConfig = getStatusConfig(server.status)
  const StatusIcon = statusConfig.icon

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
            <div className="flex items-center gap-4">
              <Link
                href="/pocs/vorion/mcp-servers"
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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{server.name}</h1>
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full',
                      `${statusConfig.bg}/20`
                    )}
                  >
                    <StatusIcon size={10} className={statusConfig.color} />
                    <span className={cn('text-[10px] font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">/{server.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit */}
              <button
                type="button"
                onClick={() => {
                  setEditName(server.name)
                  setEditDescription(server.description || '')
                  setEditIsPublic(server.is_public)
                  setShowEditModal(true)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                  'bg-zinc-100 dark:bg-white/5',
                  'text-zinc-600 dark:text-zinc-400',
                  'hover:bg-zinc-200 dark:hover:bg-white/10',
                  'transition-colors'
                )}
              >
                <LuPencil size={14} />
                Edit
              </button>

              {/* Generate Code */}
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGenerating || tools.length === 0}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                  'bg-zinc-100 dark:bg-white/5',
                  'hover:bg-zinc-200 dark:hover:bg-white/10',
                  'transition-colors',
                  (isGenerating || tools.length === 0) && 'opacity-50'
                )}
              >
                {isGenerating ? (
                  <LuLoader size={14} className="animate-spin" />
                ) : (
                  <LuCode size={14} />
                )}
                Generate
              </button>

              {/* Publish/Deploy */}
              {server.generated_code && !server.deployment_name && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl',
                    'bg-gradient-to-r from-violet-500 to-violet-600',
                    'hover:from-violet-600 hover:to-violet-700',
                    'text-white font-medium text-sm',
                    'shadow-lg shadow-violet-500/20',
                    'transition-all',
                    isPublishing && 'opacity-50'
                  )}
                >
                  {isPublishing ? (
                    <LuLoader size={14} className="animate-spin" />
                  ) : (
                    <LuRocket size={14} />
                  )}
                  Deploy
                </button>
              )}

              {/* Undeploy */}
              {server.deployment_name && (
                <button
                  type="button"
                  onClick={handleUndeploy}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                    'text-amber-600 dark:text-amber-400',
                    'hover:bg-amber-50 dark:hover:bg-amber-500/10',
                    'transition-colors'
                  )}
                >
                  <LuRefreshCw size={14} />
                  Undeploy
                </button>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  'p-2 rounded-lg',
                  'text-zinc-400 hover:text-red-500',
                  'hover:bg-red-50 dark:hover:bg-red-500/10',
                  'transition-colors',
                  isDeleting && 'opacity-50'
                )}
              >
                {isDeleting ? (
                  <LuLoader size={18} className="animate-spin" />
                ) : (
                  <LuTrash2 size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={LuSparkles} label="Version" value={`v${server.version}`} />
          <StatCard icon={LuZap} label="Usage" value={server.usage_count.toLocaleString()} />
          <StatCard icon={LuTerminal} label="Tools" value={tools.length} />
          <StatCard
            icon={server.is_public ? LuGlobe : server.is_shared ? LuUsers : LuLock}
            label="Visibility"
            value={server.is_public ? 'Public' : server.is_shared ? 'Shared' : 'Private'}
          />
          <StatCard icon={LuSettings} label="Type" value={server.server_type.replace('_', ' ')} />
          <StatCard
            icon={LuRocket}
            label="Deployed"
            value={server.deployment_name ? 'Yes' : 'No'}
          />
        </div>

        {/* Deployment Info */}
        {server.deployment_name && (
          <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <LuCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  Deployed: {server.deployment_name}
                </p>
                {server.url && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    {server.url}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {server.description && (
          <div className="mb-8 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{server.description}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-white/5 w-fit">
            {[
              { id: 'overview', icon: LuServer, label: 'Overview' },
              { id: 'tools', icon: LuTerminal, label: 'Tools' },
              { id: 'code', icon: LuCode, label: 'Generated Code' },
              { id: 'k8s', icon: LuGitBranch, label: 'K8s YAML' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                  'transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Server Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuServer size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Server Type</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                  {server.server_type.replace('_', ' ')}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuSparkles size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Version</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  v{server.version}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuZap size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Usage Count</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {server.usage_count.toLocaleString()} calls
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  {server.is_public ? (
                    <LuGlobe size={14} className="text-emerald-500" />
                  ) : server.is_shared ? (
                    <LuUsers size={14} className="text-blue-500" />
                  ) : (
                    <LuLock size={14} className="text-zinc-400" />
                  )}
                  <span className="text-xs font-medium text-zinc-400 uppercase">Visibility</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {server.is_public ? 'Public' : server.is_shared ? 'Shared' : 'Private'}
                </p>
              </div>

              {server.deployment_name && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <LuRocket size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                      Deployment
                    </span>
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 font-mono">
                    {server.deployment_name}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuTerminal size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Tools</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {tools.length} attached
                </p>
              </div>
            </div>

            {/* Server URL */}
            {server.url && (
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <LuGlobe size={14} className="text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase">
                    Server URL
                  </span>
                </div>
                <p className="text-sm font-mono text-violet-700 dark:text-violet-300 break-all">
                  {server.url}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuClock size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Created</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {formatDate(server.created_at)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuRefreshCw size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Updated</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {formatDate(server.updated_at)}
                </p>
              </div>
              {server.published_at && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <LuRocket size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-400 uppercase">Published</span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {formatDate(server.published_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Config */}
            {server.config && (
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-200/70 dark:border-white/10 bg-amber-50 dark:bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <LuSettings size={14} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                      Configuration
                    </span>
                  </div>
                </div>
                <pre className="p-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-48">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(server.config), null, 2)
                    } catch {
                      return server.config
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-500">{tools.length} tools attached</p>
              <button
                type="button"
                onClick={() => {
                  loadAvailableTools()
                  setShowAddToolModal(true)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                  'bg-zinc-100 dark:bg-white/5',
                  'hover:bg-zinc-200 dark:hover:bg-white/10',
                  'transition-colors'
                )}
              >
                <LuPlus size={14} />
                Add Tool
              </button>
            </div>

            {tools.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <LuTerminal size={32} className="mx-auto mb-2 opacity-50" />
                <p>No tools attached to this server</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onRemove={() => handleRemoveTool(tool.id)}
                    isRemoving={actions.VORION_REMOVE_TOOL_FROM_SERVER?.state?.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
            <CodePreview code={server.generated_code} title="Generated FastMCP Code" />
          </div>
        )}

        {activeTab === 'k8s' && (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
            <CodePreview code={server.k8s_yaml} title="Kubernetes Deployment YAML" />
          </div>
        )}
      </main>

      {/* Edit Server Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={() => setShowEditModal(false)}
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
                  <LuPencil size={20} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Edit Server
                  </h2>
                  <p className="text-sm text-zinc-500">Update server details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <LuCircleX size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="edit-server-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Name *
                </label>
                <input
                  id="edit-server-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-server-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="edit-server-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
                  )}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="edit-server-public"
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-500 focus:ring-violet-500"
                />
                <label
                  htmlFor="edit-server-public"
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Make this server public
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
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
                onClick={handleUpdateServer}
                disabled={actions.VORION_UPDATE_MCP_SERVER?.state?.isPending || !editName.trim()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-violet-500 to-violet-600',
                  'hover:from-violet-600 hover:to-violet-700',
                  'text-white',
                  'transition-all',
                  (actions.VORION_UPDATE_MCP_SERVER?.state?.isPending || !editName.trim()) &&
                    'opacity-50'
                )}
              >
                {actions.VORION_UPDATE_MCP_SERVER?.state?.isPending ? (
                  <LuLoader size={14} className="animate-spin" />
                ) : (
                  <LuCheck size={14} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={() => setShowAddToolModal(false)}
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
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <LuTerminal size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Add Tool</h2>
                  <p className="text-sm text-zinc-500">Select a tool to add to this server</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddToolModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <LuCircleX size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-6">
              {actions.VORION_LIST_TOOLS?.state?.isPending ? (
                <div className="flex items-center justify-center py-12">
                  <LuLoader size={24} className="animate-spin text-violet-500" />
                </div>
              ) : availableTools.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <LuTerminal size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No available tools to add</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setSelectedToolId(tool.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                        'transition-colors',
                        selectedToolId === tool.id
                          ? 'bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-500'
                          : 'bg-zinc-50 dark:bg-white/5 border-2 border-transparent hover:border-zinc-200 dark:hover:border-white/10'
                      )}
                    >
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5">
                        <LuTerminal size={16} className="text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {tool.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          v{tool.version} • {tool.language}
                        </p>
                      </div>
                      {selectedToolId === tool.id && (
                        <LuCheck size={18} className="text-violet-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setShowAddToolModal(false)}
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
                onClick={handleAddTool}
                disabled={actions.VORION_ADD_TOOL_TO_SERVER?.state?.isPending || !selectedToolId}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-emerald-500 to-emerald-600',
                  'hover:from-emerald-600 hover:to-emerald-700',
                  'text-white',
                  'transition-all',
                  (actions.VORION_ADD_TOOL_TO_SERVER?.state?.isPending || !selectedToolId) &&
                    'opacity-50'
                )}
              >
                {actions.VORION_ADD_TOOL_TO_SERVER?.state?.isPending ? (
                  <LuLoader size={14} className="animate-spin" />
                ) : (
                  <LuPlus size={14} />
                )}
                Add Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
