'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuActivity,
  LuArrowLeft,
  LuCheck,
  LuChevronDown,
  LuCircle,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCode,
  LuCopy,
  LuGitBranch,
  LuGlobe,
  LuHistory,
  LuLoader,
  LuLock,
  LuPause,
  LuPencil,
  LuPlay,
  LuPlus,
  LuRefreshCw,
  LuSparkles,
  LuTerminal,
  LuTrash2,
  LuUsers,
  LuZap,
} from 'react-icons/lu'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { cn } from '@/app/_utils'
import type {
  VorionToolExecutionDetailResponse,
  VorionToolExecutionResponse,
  VorionToolResponse,
  VorionToolVersionResponse,
} from '@/lib/api'
import { ExecuteToolModal } from '../../_components'

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { icon: LuCheck, label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-500' }
    case 'draft':
      return { icon: LuCircle, label: 'Draft', color: 'text-amber-600', bg: 'bg-amber-500' }
    case 'archived':
      return { icon: LuPause, label: 'Archived', color: 'text-zinc-600', bg: 'bg-zinc-400' }
    default:
      return { icon: LuCircle, label: status, color: 'text-zinc-600', bg: 'bg-zinc-400' }
  }
}

function getExecutionStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        icon: LuCircleCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      }
    case 'running':
      return {
        icon: LuLoader,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        animate: true,
      }
    case 'failed':
      return { icon: LuCircleX, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' }
    case 'cancelled':
      return {
        icon: LuCircleAlert,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
      }
    default:
      return { icon: LuCircle, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-500/10' }
  }
}

function getLanguageConfig(language: string) {
  switch (language?.toLowerCase()) {
    case 'python':
      return { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', label: 'Python' }
    case 'javascript':
      return {
        color: 'text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-500/10',
        label: 'JavaScript',
      }
    case 'typescript':
      return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'TypeScript' }
    case 'go':
      return { color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', label: 'Go' }
    default:
      return { color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-500/10', label: language }
  }
}

// ============================================================================
// StatCard Component
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  gradient,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
  subValue?: string
  gradient?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-4 rounded-2xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10'
      )}
    >
      {gradient && <div className={cn('absolute inset-0 opacity-50', gradient)} />}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className="text-zinc-400" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
        <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
        {subValue && <p className="text-xs text-zinc-400 mt-1">{subValue}</p>}
      </div>
    </div>
  )
}

// ============================================================================
// VersionCard Component
// ============================================================================

function VersionCard({
  version,
  isActive,
  onActivate,
  onRollback,
  isActivating,
  isRollingBack,
}: {
  version: VorionToolVersionResponse
  isActive: boolean
  onActivate: () => void
  onRollback?: () => void
  isActivating?: boolean
  isRollingBack?: boolean
}) {
  return (
    <div
      className={cn(
        'relative p-5 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border-2',
        isActive
          ? 'border-emerald-500/50 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/10'
          : 'border-zinc-200/70 dark:border-white/10',
        'transition-all duration-300 hover:shadow-md'
      )}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute -top-3 left-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
              'text-xs font-medium',
              'bg-emerald-100 dark:bg-emerald-500/20',
              'text-emerald-700 dark:text-emerald-400',
              'border border-emerald-200 dark:border-emerald-500/30'
            )}
          >
            <LuCheck size={12} />
            Active Version
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 mt-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl',
              isActive ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-zinc-100 dark:bg-white/5'
            )}
          >
            <LuGitBranch
              size={18}
              className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}
            />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">
              Version {version.version_number}
            </p>
            <p className="text-xs text-zinc-400">{formatDate(version.created_at)}</p>
          </div>
        </div>

        {/* Code Hash */}
        <div className="text-right">
          <p className="text-[10px] text-zinc-400 mb-1">Hash</p>
          <code className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">
            {version.code_hash.slice(0, 8)}
          </code>
        </div>
      </div>

      {/* Change Notes */}
      {version.change_notes && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{version.change_notes}</p>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <LuCode size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {formatBytes(version.code_size_bytes)}
          </span>
        </div>
        {version.baseline_execution_time_ms && (
          <div className="flex items-center gap-1.5">
            <LuPlay size={14} className="text-zinc-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatDuration(version.baseline_execution_time_ms)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="text-xs">by</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
            {version.created_by.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-white/5">
        {!isActive && onRollback && (
          <button
            type="button"
            onClick={onRollback}
            disabled={isRollingBack}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'text-amber-600 dark:text-amber-400',
              'hover:bg-amber-50 dark:hover:bg-amber-500/10',
              'transition-colors',
              isRollingBack && 'opacity-50'
            )}
          >
            {isRollingBack ? (
              <LuLoader size={12} className="animate-spin" />
            ) : (
              <LuRefreshCw size={12} />
            )}
            Rollback
          </button>
        )}

        {!isActive && (
          <button
            type="button"
            onClick={onActivate}
            disabled={isActivating}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium',
              'bg-emerald-50 dark:bg-emerald-500/10',
              'text-emerald-600 dark:text-emerald-400',
              'hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
              'border border-emerald-200 dark:border-emerald-500/20',
              'transition-colors',
              isActivating && 'opacity-50'
            )}
          >
            {isActivating ? <LuLoader size={12} className="animate-spin" /> : <LuCheck size={12} />}
            Activate
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ExecutionCard Component
// ============================================================================

function ExecutionCard({
  execution,
  onRetry,
  onCancel,
  onViewLogs,
  isRetrying,
  isCancelling,
}: {
  execution: VorionToolExecutionResponse
  onRetry?: () => void
  onCancel?: () => void
  onViewLogs?: () => void
  isRetrying?: boolean
  isCancelling?: boolean
}) {
  const statusConfig = getExecutionStatusConfig(execution.status)
  const StatusIcon = statusConfig.icon

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
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', statusConfig.bg)}>
            <StatusIcon
              size={14}
              className={cn(statusConfig.color, statusConfig.animate && 'animate-spin')}
            />
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            {execution.execution_id.slice(0, 8)}...
          </span>
        </div>
        <span className={cn('text-xs font-medium capitalize', statusConfig.color)}>
          {execution.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mb-3">
        <div>
          <p className="text-zinc-400 mb-1">Duration</p>
          <p className="text-zinc-700 dark:text-zinc-300 font-mono">
            {formatDuration(execution.execution_time_ms)}
          </p>
        </div>
        <div>
          <p className="text-zinc-400 mb-1">Environment</p>
          <p className="text-zinc-700 dark:text-zinc-300">{execution.execution_environment}</p>
        </div>
        <div>
          <p className="text-zinc-400 mb-1">Retries</p>
          <p className="text-zinc-700 dark:text-zinc-300">{execution.retry_count}</p>
        </div>
        {execution.started_at && (
          <div>
            <p className="text-zinc-400 mb-1">Started</p>
            <p className="text-zinc-700 dark:text-zinc-300">{formatDate(execution.started_at)}</p>
          </div>
        )}
      </div>

      {execution.error_message && (
        <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <LuCircleX size={12} className="text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {execution.error_type || 'Error'}
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 font-mono line-clamp-2">
            {execution.error_message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-white/5">
        {execution.status === 'running' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'text-red-600 dark:text-red-400',
              'hover:bg-red-50 dark:hover:bg-red-500/10',
              'transition-colors',
              isCancelling && 'opacity-50'
            )}
          >
            {isCancelling ? (
              <LuLoader size={12} className="animate-spin" />
            ) : (
              <LuCircleX size={12} />
            )}
            Cancel
          </button>
        )}

        {(execution.status === 'failed' || execution.status === 'cancelled') && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-zinc-100 dark:bg-white/5',
              'hover:bg-zinc-200 dark:hover:bg-white/10',
              'transition-colors',
              isRetrying && 'opacity-50'
            )}
          >
            {isRetrying ? (
              <LuLoader size={12} className="animate-spin" />
            ) : (
              <LuRefreshCw size={12} />
            )}
            Retry
          </button>
        )}

        {/* View Logs */}
        {onViewLogs && (
          <button
            type="button"
            onClick={onViewLogs}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'text-blue-600 dark:text-blue-400',
              'hover:bg-blue-50 dark:hover:bg-blue-500/10',
              'transition-colors'
            )}
          >
            <LuCode size={12} />
            Logs
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CodeEditor Component
// ============================================================================

function CodeEditor({ code, language }: { code: string | null; language: string }) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const langConfig = getLanguageConfig(language)

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
        <p className="text-sm">No code available</p>
      </div>
    )
  }

  const lines = code.split('\n')
  const lineCount = lines.length
  const maxHeight = isExpanded ? 'max-h-[80vh]' : 'max-h-96'

  return (
    <div className="relative">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              langConfig.bg,
              'border border-current/10'
            )}
          >
            <LuCode size={12} className={langConfig.color} />
            <span className={cn('text-xs font-medium', langConfig.color)}>{langConfig.label}</span>
          </div>
          <span className="text-xs text-zinc-400">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs',
              'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
              'hover:bg-zinc-100 dark:hover:bg-white/5',
              'transition-colors'
            )}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
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
      </div>

      {/* Code with Line Numbers */}
      <div className={cn('relative overflow-auto', maxHeight)}>
        <div className="flex">
          {/* Line Numbers */}
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
          {/* Code */}
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

        {/* Gradient fade at bottom */}
        {!isExpanded && lineCount > 15 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = Number(params.id)

  const actions = useGenericApiActions()
  const [tool, setTool] = useState<VorionToolResponse | null>(null)
  const [versions, setVersions] = useState<VorionToolVersionResponse[]>([])
  const [executions, setExecutions] = useState<VorionToolExecutionResponse[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'executions'>('overview')
  const loadMoreExecRef = useRef<HTMLDivElement>(null)
  const [hasMoreExec, setHasMoreExec] = useState(true)
  const [isLoadingMoreExec, setIsLoadingMoreExec] = useState(false)
  const [execOffset, setExecOffset] = useState(0)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [executionResult, setExecutionResult] = useState<VorionToolExecutionDetailResponse | null>(
    null
  )
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false)
  const [newVersionCode, setNewVersionCode] = useState('')
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<
    Array<{ id: number; log_level: string; message: string; timestamp: string }>
  >([])
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCode, setEditCode] = useState('')

  // Load tool
  useEffect(() => {
    actions.VORION_GET_TOOL?.start({
      payload: { _tool_id: toolId },
      onAfterHandle: (data) => {
        if (data) setTool(data)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [toolId])

  // Load versions
  useEffect(() => {
    actions.VORION_LIST_TOOL_VERSIONS?.start({
      payload: { _tool_id: toolId, limit: 10 },
      onAfterHandle: (data) => {
        if (data) setVersions(data)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [toolId])

  // Load executions
  useEffect(() => {
    actions.VORION_LIST_EXECUTIONS?.start({
      payload: { limit: 10, offset: 0 },
      onAfterHandle: (data) => {
        if (data) {
          setExecutions(data)
          setHasMoreExec(data.length >= 10)
          setExecOffset(data.length)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Load more executions
  const loadMoreExec = useCallback(() => {
    if (isLoadingMoreExec || !hasMoreExec) return
    setIsLoadingMoreExec(true)

    actions.VORION_LIST_EXECUTIONS?.start({
      payload: { limit: 10, offset: execOffset },
      onAfterHandle: (data) => {
        if (data) {
          setExecutions((prev) => [...prev, ...data])
          setHasMoreExec(data.length >= 10)
          setExecOffset((prev) => prev + data.length)
        }
        setIsLoadingMoreExec(false)
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
        setIsLoadingMoreExec(false)
      },
    })
  }, [execOffset, hasMoreExec, isLoadingMoreExec])

  // Activate version
  const handleActivateVersion = useCallback(
    (versionNumber: string) => {
      actions.VORION_ACTIVATE_TOOL_VERSION?.start({
        payload: { _tool_id: toolId, _version_number: versionNumber },
        onAfterHandle: () => {
          toast.success(`Version ${versionNumber} activated!`)
          // Refresh versions
          actions.VORION_LIST_TOOL_VERSIONS?.start({
            payload: { _tool_id: toolId, limit: 10 },
            onAfterHandle: (data) => {
              if (data) setVersions(data)
            },
          })
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [toolId]
  )

  // Delete tool
  const handleDelete = useCallback(() => {
    if (!confirm('Are you sure you want to delete this tool?')) return

    actions.VORION_DELETE_TOOL?.start({
      payload: { _tool_id: toolId },
      onAfterHandle: () => {
        toast.success('Tool deleted!')
        router.push('/pocs/vorion/tools')
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [toolId, router])

  // Execute tool sync
  const handleExecuteSync = useCallback(
    (params: Record<string, unknown>) => {
      const activeVersion = versions.find((v) => v.is_active)
      if (!activeVersion) {
        toast.error('No active version found')
        return
      }

      actions.VORION_EXECUTE_TOOL_SYNC?.start({
        payload: {
          tool_version_id: activeVersion.id,
          input_params: params,
          execution_environment: 'sync',
        },
        onAfterHandle: (result) => {
          if (result) {
            setExecutionResult(result)
            toast.success('Tool executed successfully!')
          }
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [versions]
  )

  // Execute tool async
  const handleExecuteAsync = useCallback(
    (params: Record<string, unknown>) => {
      const activeVersion = versions.find((v) => v.is_active)
      if (!activeVersion) {
        toast.error('No active version found')
        return
      }

      actions.VORION_EXECUTE_TOOL_ASYNC?.start({
        payload: {
          tool_version_id: activeVersion.id,
          input_params: params,
          execution_environment: 'async',
        },
        onAfterHandle: (result) => {
          if (result) {
            toast.success(`Execution started: ${result.execution_id}`)
            setShowExecuteModal(false)
            // Refresh executions
            actions.VORION_LIST_EXECUTIONS?.start({
              payload: { limit: 10, offset: 0 },
              onAfterHandle: (data) => {
                if (data) {
                  setExecutions(data)
                  setHasMoreExec(data.length >= 10)
                  setExecOffset(data.length)
                }
              },
            })
          }
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [versions]
  )

  // Rollback version
  const handleRollbackVersion = useCallback(
    (versionNumber: string) => {
      actions.VORION_ROLLBACK_TOOL_VERSION?.start({
        payload: { _tool_id: toolId, _version_number: versionNumber },
        onAfterHandle: () => {
          toast.success(`Rolled back to version ${versionNumber}`)
          // Refresh versions
          actions.VORION_LIST_TOOL_VERSIONS?.start({
            payload: { _tool_id: toolId, limit: 10 },
            onAfterHandle: (data) => {
              if (data) setVersions(data)
            },
          })
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [toolId]
  )

  // Publish tool
  const handlePublish = useCallback(() => {
    actions.VORION_PUBLISH_TOOL?.start({
      payload: { _tool_id: toolId, is_public: !tool?.is_public },
      onAfterHandle: (result) => {
        if (result) {
          setTool(result)
          toast.success(result.is_public ? 'Tool published!' : 'Tool unpublished')
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [toolId, tool?.is_public])

  // Create new version
  const handleCreateVersion = useCallback(
    (code: string, changeNotes?: string) => {
      actions.VORION_CREATE_TOOL_VERSION?.start({
        payload: {
          _tool_id: toolId,
          code,
          change_notes: changeNotes,
        },
        onAfterHandle: (result) => {
          if (result) {
            toast.success(`Version ${result.version_number} created!`)
            // Refresh versions
            actions.VORION_LIST_TOOL_VERSIONS?.start({
              payload: { _tool_id: toolId, limit: 10 },
              onAfterHandle: (data) => {
                if (data) setVersions(data)
              },
            })
            // Refresh tool
            actions.VORION_GET_TOOL?.start({
              payload: { _tool_id: toolId },
              onAfterHandle: (data) => {
                if (data) setTool(data)
              },
            })
          }
        },
        onErrorHandle: (error) => {
          toast.error(parseErrorMessage(error))
        },
      })
    },
    [toolId]
  )

  // Retry execution
  const handleRetryExecution = useCallback((executionId: string) => {
    actions.VORION_RETRY_EXECUTION?.start({
      payload: { execution_id: executionId },
      onAfterHandle: (result) => {
        if (result) {
          toast.success('Execution retried!')
          // Refresh executions
          actions.VORION_LIST_EXECUTIONS?.start({
            payload: { limit: 10, offset: 0 },
            onAfterHandle: (data) => {
              if (data) {
                setExecutions(data)
                setHasMoreExec(data.length >= 10)
                setExecOffset(data.length)
              }
            },
          })
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Cancel execution
  const handleCancelExecution = useCallback((executionId: string) => {
    actions.VORION_CANCEL_EXECUTION?.start({
      payload: { _execution_id: executionId },
      onAfterHandle: () => {
        toast.success('Execution cancelled')
        // Refresh executions
        actions.VORION_LIST_EXECUTIONS?.start({
          payload: { limit: 10, offset: 0 },
          onAfterHandle: (data) => {
            if (data) {
              setExecutions(data)
              setHasMoreExec(data.length >= 10)
              setExecOffset(data.length)
            }
          },
        })
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // View execution logs
  const handleViewLogs = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId)
    actions.VORION_GET_EXECUTION_LOGS?.start({
      payload: { _execution_id: executionId },
      onAfterHandle: (logs) => {
        if (logs) {
          setExecutionLogs(logs)
          setShowLogsModal(true)
        }
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [])

  // Update tool
  const handleUpdateTool = useCallback(() => {
    if (!editName.trim()) {
      toast.error('Name is required')
      return
    }

    actions.VORION_UPDATE_TOOL?.start({
      payload: {
        _tool_id: toolId,
        name: editName,
        description: editDescription || undefined,
        code: editCode || undefined,
      },
      onAfterHandle: () => {
        setShowEditModal(false)
        toast.success('Tool updated!')
        // Refresh tool
        actions.VORION_GET_TOOL?.start({
          payload: { _tool_id: toolId },
          onAfterHandle: (data) => {
            if (data) setTool(data)
          },
        })
      },
      onErrorHandle: (error) => {
        toast.error(parseErrorMessage(error))
      },
    })
  }, [toolId, editName, editDescription, editCode])

  const isLoading = actions.VORION_GET_TOOL?.state?.isPending ?? false
  const isDeleting = actions.VORION_DELETE_TOOL?.state?.isPending ?? false
  const isExecuting = actions.VORION_EXECUTE_TOOL_SYNC?.state?.isPending ?? false

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <LuLoader size={32} className="animate-spin text-[#c68e76]" />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <LuTerminal size={48} className="text-zinc-300 dark:text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Tool Not Found</h2>
        <Link href="/pocs/vorion/tools" className="text-[#c68e76] hover:underline">
          Back to Tools
        </Link>
      </div>
    )
  }

  const statusConfig = getStatusConfig(tool.status)
  const langConfig = getLanguageConfig(tool.language)
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
                href="/pocs/vorion/tools"
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
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{tool.name}</h1>
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">/{tool.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit */}
              <button
                type="button"
                onClick={() => {
                  setEditName(tool.name)
                  setEditDescription(tool.description || '')
                  setEditCode(tool.code || '')
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
                <span className="hidden sm:inline">Edit</span>
              </button>

              {/* Publish */}
              <button
                type="button"
                onClick={handlePublish}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                  tool.is_public
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10',
                  'transition-colors'
                )}
              >
                <LuGlobe size={14} />
                <span className="hidden sm:inline">{tool.is_public ? 'Published' : 'Publish'}</span>
              </button>

              {/* Execute */}
              <button
                type="button"
                onClick={() => setShowExecuteModal(true)}
                disabled={isExecuting}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-gradient-to-r from-emerald-500 to-emerald-600',
                  'hover:from-emerald-600 hover:to-emerald-700',
                  'text-white font-medium text-sm',
                  'shadow-lg shadow-emerald-500/20',
                  'transition-all duration-300 hover:scale-105',
                  isExecuting && 'opacity-50'
                )}
              >
                {isExecuting ? (
                  <LuLoader size={16} className="animate-spin" />
                ) : (
                  <LuPlay size={16} />
                )}
                <span className="hidden sm:inline">Execute</span>
              </button>

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
          <StatCard icon={LuCode} label="Language" value={langConfig.label} />
          <StatCard icon={LuSparkles} label="Version" value={`v${tool.version}`} />
          <StatCard icon={LuZap} label="Usage" value={tool.usage_count.toLocaleString()} />
          <StatCard
            icon={LuActivity}
            label="Avg Time"
            value={formatDuration(tool.average_execution_time_ms)}
          />
          <StatCard
            icon={tool.is_public ? LuGlobe : tool.is_shared ? LuUsers : LuLock}
            label="Visibility"
            value={tool.is_public ? 'Public' : tool.is_shared ? 'Shared' : 'Private'}
          />
          <StatCard icon={LuGitBranch} label="Versions" value={versions.length} />
        </div>

        {/* Description */}
        {tool.description && (
          <div className="mb-8 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-white/5 w-fit">
            {[
              { id: 'overview', icon: LuCode, label: 'Code' },
              { id: 'versions', icon: LuGitBranch, label: 'Versions' },
              { id: 'executions', icon: LuHistory, label: 'Executions' },
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
            {/* Tool Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuTerminal size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Tool Type</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                  {tool.tool_type || 'Standard'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuClock size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Last Executed</span>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {tool.last_executed_at ? formatDate(tool.last_executed_at) : 'Never'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <LuSparkles size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase">Function Name</span>
                </div>
                <p className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  {tool.function_name || tool.slug || '-'}
                </p>
              </div>
            </div>

            {/* Function Schema */}
            {tool.function_schema && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200/70 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <LuSparkles size={16} className="text-violet-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Function Schema (LLM)
                    </span>
                  </div>
                </div>
                <pre className="p-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-48">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(tool.function_schema), null, 2)
                    } catch {
                      return tool.function_schema
                    }
                  })()}
                </pre>
              </div>
            )}

            {/* Input/Output Schemas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tool.input_schema && (
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
                  <div className="px-4 py-2 border-b border-zinc-200/70 dark:border-white/10 bg-emerald-50 dark:bg-emerald-500/10">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                      Input Schema
                    </span>
                  </div>
                  <pre className="p-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-32">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(tool.input_schema), null, 2)
                      } catch {
                        return tool.input_schema
                      }
                    })()}
                  </pre>
                </div>
              )}

              {tool.output_schema && (
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
                  <div className="px-4 py-2 border-b border-zinc-200/70 dark:border-white/10 bg-blue-50 dark:bg-blue-500/10">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                      Output Schema
                    </span>
                  </div>
                  <pre className="p-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-32">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(tool.output_schema), null, 2)
                      } catch {
                        return tool.output_schema
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            {/* Config */}
            {tool.config && (
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-200/70 dark:border-white/10 bg-amber-50 dark:bg-amber-500/10">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                    Configuration
                  </span>
                </div>
                <pre className="p-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-32">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(tool.config), null, 2)
                    } catch {
                      return tool.config
                    }
                  })()}
                </pre>
              </div>
            )}

            {/* Code */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 overflow-hidden">
              <CodeEditor code={tool.code} language={tool.language} />
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-4">
            {/* Create Version Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setNewVersionCode(tool.code || '')
                  setNewVersionNotes('')
                  setShowCreateVersionModal(true)
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
                  'hover:from-[#b07d67] hover:to-[#9a6c58]',
                  'text-white',
                  'shadow-lg shadow-[#c68e76]/20',
                  'transition-all duration-300 hover:scale-105'
                )}
              >
                <LuPlus size={14} />
                Create Version
              </button>
            </div>

            {versions.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <LuGitBranch size={32} className="mx-auto mb-2 opacity-50" />
                <p>No versions yet</p>
              </div>
            ) : (
              versions.map((version) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isActive={version.is_active}
                  onActivate={() => handleActivateVersion(version.version_number)}
                  onRollback={() => handleRollbackVersion(version.version_number)}
                  isActivating={actions.VORION_ACTIVATE_TOOL_VERSION?.state?.isPending}
                  isRollingBack={actions.VORION_ROLLBACK_TOOL_VERSION?.state?.isPending}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'executions' && (
          <div className="space-y-4">
            {executions.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <LuHistory size={32} className="mx-auto mb-2 opacity-50" />
                <p>No executions yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executions.map((exec) => (
                    <ExecutionCard
                      key={exec.id}
                      execution={exec}
                      onRetry={() => handleRetryExecution(exec.execution_id)}
                      onCancel={() => handleCancelExecution(exec.execution_id)}
                      onViewLogs={() => handleViewLogs(exec.execution_id)}
                      isRetrying={actions.VORION_RETRY_EXECUTION?.state?.isPending}
                      isCancelling={actions.VORION_CANCEL_EXECUTION?.state?.isPending}
                    />
                  ))}
                </div>

                {hasMoreExec && (
                  <div ref={loadMoreExecRef} className="flex justify-center py-4">
                    <button
                      type="button"
                      onClick={loadMoreExec}
                      disabled={isLoadingMoreExec}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                        'bg-zinc-100 dark:bg-white/5',
                        'hover:bg-zinc-200 dark:hover:bg-white/10',
                        'transition-colors'
                      )}
                    >
                      {isLoadingMoreExec ? (
                        <LuLoader size={16} className="animate-spin" />
                      ) : (
                        <LuChevronDown size={16} />
                      )}
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Execute Modal */}
      {showExecuteModal && tool && (
        <ExecuteToolModal
          isOpen={showExecuteModal}
          onClose={() => {
            setShowExecuteModal(false)
            setExecutionResult(null)
          }}
          tool={tool}
          onExecuteSync={handleExecuteSync}
          onExecuteAsync={handleExecuteAsync}
          isExecuting={isExecuting}
          executionResult={executionResult}
        />
      )}

      {/* Create Version Modal */}
      {showCreateVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={() => setShowCreateVersionModal(false)}
            aria-label="Close modal"
          />

          {/* Modal */}
          <div
            className={cn(
              'relative w-full max-w-4xl max-h-[90vh] overflow-hidden',
              'bg-white dark:bg-zinc-900',
              'rounded-2xl shadow-2xl',
              'border border-zinc-200 dark:border-white/10',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#c68e76]/10">
                  <LuGitBranch size={20} className="text-[#c68e76]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Create New Version
                  </h2>
                  <p className="text-sm text-zinc-500">Create a new version with updated code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateVersionModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <LuCircleX size={20} className="text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Change Notes */}
              <div>
                <label
                  htmlFor="version-notes"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Change Notes
                </label>
                <input
                  id="version-notes"
                  type="text"
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                />
              </div>

              {/* Code Editor */}
              <div>
                <label
                  htmlFor="version-code"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Code
                </label>
                <div className="relative rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                  <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-white/10">
                    <span className="text-xs text-zinc-500">{tool?.language || 'python'}</span>
                    <span className="text-xs text-zinc-400">
                      {newVersionCode.split('\n').length} lines
                    </span>
                  </div>
                  <textarea
                    id="version-code"
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(e.target.value)}
                    className={cn(
                      'w-full h-64 p-4',
                      'bg-zinc-50 dark:bg-zinc-950',
                      'text-sm font-mono text-zinc-900 dark:text-white',
                      'resize-none',
                      'focus:outline-none'
                    )}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setShowCreateVersionModal(false)}
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
                onClick={() => {
                  if (!newVersionCode.trim()) {
                    toast.error('Code is required')
                    return
                  }
                  handleCreateVersion(newVersionCode, newVersionNotes || undefined)
                  setShowCreateVersionModal(false)
                }}
                disabled={
                  actions.VORION_CREATE_TOOL_VERSION?.state?.isPending || !newVersionCode.trim()
                }
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
                  'hover:from-[#b07d67] hover:to-[#9a6c58]',
                  'text-white',
                  'shadow-lg shadow-[#c68e76]/20',
                  'transition-all',
                  (actions.VORION_CREATE_TOOL_VERSION?.state?.isPending ||
                    !newVersionCode.trim()) &&
                    'opacity-50'
                )}
              >
                {actions.VORION_CREATE_TOOL_VERSION?.state?.isPending ? (
                  <LuLoader size={14} className="animate-spin" />
                ) : (
                  <LuPlus size={14} />
                )}
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tool Modal */}
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
              'relative w-full max-w-2xl max-h-[90vh] overflow-hidden',
              'bg-white dark:bg-zinc-900',
              'rounded-2xl shadow-2xl',
              'border border-zinc-200 dark:border-white/10',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#c68e76]/10">
                  <LuPencil size={20} className="text-[#c68e76]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit Tool</h2>
                  <p className="text-sm text-zinc-500">Update tool details</p>
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

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label
                  htmlFor="edit-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none',
                    'bg-zinc-50 dark:bg-white/5',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-code"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Code
                </label>
                <textarea
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  rows={8}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none font-mono text-sm',
                    'bg-zinc-50 dark:bg-zinc-950',
                    'border border-zinc-200 dark:border-white/10',
                    'text-zinc-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#c68e76]/50'
                  )}
                  spellCheck={false}
                />
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
                onClick={handleUpdateTool}
                disabled={actions.VORION_UPDATE_TOOL?.state?.isPending || !editName.trim()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
                  'hover:from-[#b07d67] hover:to-[#9a6c58]',
                  'text-white',
                  'transition-all',
                  (actions.VORION_UPDATE_TOOL?.state?.isPending || !editName.trim()) && 'opacity-50'
                )}
              >
                {actions.VORION_UPDATE_TOOL?.state?.isPending ? (
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

      {/* Execution Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onClick={() => setShowLogsModal(false)}
            aria-label="Close modal"
          />

          <div
            className={cn(
              'relative w-full max-w-4xl max-h-[90vh] overflow-hidden',
              'bg-white dark:bg-zinc-900',
              'rounded-2xl shadow-2xl',
              'border border-zinc-200 dark:border-white/10',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <LuCode size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Execution Logs
                  </h2>
                  <p className="text-sm text-zinc-500 font-mono">
                    {selectedExecutionId?.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <LuCircleX size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {executionLogs.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <LuCode size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No logs available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg',
                        'bg-zinc-50 dark:bg-white/5',
                        'border border-zinc-200/50 dark:border-white/5'
                      )}
                    >
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium uppercase',
                          log.log_level === 'error'
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                            : log.log_level === 'warning'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        )}
                      >
                        {log.log_level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                          {log.message}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
