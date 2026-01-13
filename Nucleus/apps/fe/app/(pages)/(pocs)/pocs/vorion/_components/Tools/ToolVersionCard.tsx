'use client'

import { LuCheck, LuClock, LuCode, LuGitBranch, LuHistory, LuLoader, LuPlay } from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { VorionToolVersionResponse } from '@/lib/api'

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Types
// ============================================================================

interface ToolVersionCardProps {
  version: VorionToolVersionResponse
  isActive: boolean
  onActivate: () => void
  onRollback?: () => void
  onViewCode?: () => void
  isActivating?: boolean
  isRollingBack?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ToolVersionCard({
  version,
  isActive,
  onActivate,
  onRollback,
  onViewCode,
  isActivating,
  isRollingBack,
}: ToolVersionCardProps) {
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
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Version {version.version_number}
            </h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <LuClock size={10} />
              {formatDate(version.created_at)}
            </p>
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
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          {onViewCode && (
            <button
              type="button"
              onClick={onViewCode}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'text-zinc-600 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-white/5',
                'transition-colors'
              )}
            >
              <LuCode size={12} />
              View Code
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
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
                <LuHistory size={12} />
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
              {isActivating ? (
                <LuLoader size={12} className="animate-spin" />
              ) : (
                <LuCheck size={12} />
              )}
              Activate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
