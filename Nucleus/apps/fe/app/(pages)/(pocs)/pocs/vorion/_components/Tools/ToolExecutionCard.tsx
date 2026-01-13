'use client'

import {
  LuCircle,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuLoader,
  LuRefreshCw,
  LuX,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { VorionToolExecutionResponse } from '@/lib/api'

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function getExecutionStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        icon: LuCircleCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/20',
        label: 'Completed',
      }
    case 'running':
      return {
        icon: LuLoader,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/20',
        label: 'Running',
        animate: true,
      }
    case 'failed':
      return {
        icon: LuCircleX,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-200 dark:border-red-500/20',
        label: 'Failed',
      }
    case 'cancelled':
      return {
        icon: LuCircleAlert,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/20',
        label: 'Cancelled',
      }
    case 'pending':
      return {
        icon: LuClock,
        color: 'text-zinc-500',
        bg: 'bg-zinc-50 dark:bg-zinc-500/10',
        border: 'border-zinc-200 dark:border-zinc-500/20',
        label: 'Pending',
      }
    default:
      return {
        icon: LuCircle,
        color: 'text-zinc-500',
        bg: 'bg-zinc-50 dark:bg-zinc-500/10',
        border: 'border-zinc-200 dark:border-zinc-500/20',
        label: status,
      }
  }
}

// ============================================================================
// Types
// ============================================================================

interface ToolExecutionCardProps {
  execution: VorionToolExecutionResponse
  onRetry?: () => void
  onCancel?: () => void
  onViewLogs?: () => void
  isRetrying?: boolean
  isCancelling?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ToolExecutionCard({
  execution,
  onRetry,
  onCancel,
  onViewLogs,
  isRetrying,
  isCancelling,
}: ToolExecutionCardProps) {
  const statusConfig = getExecutionStatusConfig(execution.status)
  const StatusIcon = statusConfig.icon

  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border',
        statusConfig.border,
        'transition-all hover:shadow-md'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', statusConfig.bg)}>
            <StatusIcon
              size={16}
              className={cn(statusConfig.color, statusConfig.animate && 'animate-spin')}
            />
          </div>
          <div>
            <p className="font-mono text-sm font-medium text-zinc-900 dark:text-white">
              {execution.execution_id.slice(0, 12)}...
            </p>
            <p className="text-xs text-zinc-400">ID: {execution.id}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            statusConfig.bg,
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Duration</p>
          <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
            {formatDuration(execution.execution_time_ms)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Environment</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {execution.execution_environment}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Started</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {execution.started_at ? formatDate(execution.started_at) : '-'}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Retries</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{execution.retry_count}</p>
        </div>
      </div>

      {/* Error */}
      {execution.error_message && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <LuCircleX size={12} className="text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {execution.error_type || 'Error'}
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 font-mono line-clamp-3">
            {execution.error_message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
        <button
          type="button"
          onClick={onViewLogs}
          className={cn(
            'text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
            'transition-colors'
          )}
        >
          View Logs
        </button>

        <div className="flex items-center gap-2">
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
              {isCancelling ? <LuLoader size={12} className="animate-spin" /> : <LuX size={12} />}
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
        </div>
      </div>
    </div>
  )
}
