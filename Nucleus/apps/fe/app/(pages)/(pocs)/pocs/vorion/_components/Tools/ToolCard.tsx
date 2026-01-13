'use client'

import Link from 'next/link'
import {
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuClock,
  LuCode,
  LuGlobe,
  LuLock,
  LuPlay,
  LuSparkles,
  LuTerminal,
  LuUsers,
  LuZap,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { VorionToolResponse } from '@/lib/api'

// ============================================================================
// Helpers
// ============================================================================

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
// Types
// ============================================================================

interface ToolCardProps {
  tool: VorionToolResponse
  index?: number
}

// ============================================================================
// Component
// ============================================================================

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
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

      {/* Tool Type Badge */}
      {tool.tool_type && (
        <div className="relative mb-4">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium',
              'bg-violet-50 dark:bg-violet-500/10',
              'text-violet-600 dark:text-violet-400'
            )}
          >
            {tool.tool_type}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-3">
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
