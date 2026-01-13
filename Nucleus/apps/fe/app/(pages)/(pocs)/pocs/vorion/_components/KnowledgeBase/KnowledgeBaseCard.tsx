'use client'

import Link from 'next/link'
import {
  LuArchive,
  LuBookOpen,
  LuChevronRight,
  LuDatabase,
  LuFileText,
  LuGlobe,
  LuHash,
  LuLock,
  LuPause,
  LuTag,
  LuUsers,
} from 'react-icons/lu'
import type { KnowledgeBase } from '@/app/_store/knowledgeBaseStore'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase
  index?: number
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusConfig(status: KnowledgeBase['status']) {
  switch (status) {
    case 'active':
      return {
        icon: LuBookOpen,
        label: 'Active',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/20',
        dot: 'bg-emerald-500',
      }
    case 'paused':
      return {
        icon: LuPause,
        label: 'Paused',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/20',
        dot: 'bg-amber-500',
      }
    case 'archived':
      return {
        icon: LuArchive,
        label: 'Archived',
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-500/10',
        border: 'border-zinc-200 dark:border-zinc-500/20',
        dot: 'bg-zinc-400',
      }
    default:
      return {
        icon: LuBookOpen,
        label: String(status),
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-500/10',
        border: 'border-zinc-200 dark:border-zinc-500/20',
        dot: 'bg-zinc-400',
      }
  }
}

function getVisibilityIcon(visibility: KnowledgeBase['visibility']) {
  switch (visibility) {
    case 'private':
      return LuLock
    case 'app':
      return LuUsers
    case 'public':
      return LuGlobe
    default:
      return LuLock
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

// ============================================================================
// Component
// ============================================================================

export function KnowledgeBaseCard({ knowledgeBase, index = 0 }: KnowledgeBaseCardProps) {
  const statusConfig = getStatusConfig(knowledgeBase.status)
  const VisibilityIcon = getVisibilityIcon(knowledgeBase.visibility)

  return (
    <Link
      href={`/pocs/vorion/knowledgebases/${knowledgeBase.id}`}
      className={cn(
        'group relative block p-5 rounded-2xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10',
        'hover:border-zinc-300 dark:hover:border-white/20',
        'hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20',
        'transition-all duration-300',
        'animate-in fade-in slide-in-from-bottom-2'
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              'p-2.5 rounded-xl',
              'bg-gradient-to-br from-zinc-100 to-zinc-200',
              'dark:from-zinc-800 dark:to-zinc-900',
              'group-hover:from-[#c68e76]/10 group-hover:to-[#c68e76]/20',
              'transition-all duration-300'
            )}
          >
            <LuBookOpen
              size={20}
              className={cn(
                'text-zinc-500 dark:text-zinc-400',
                'group-hover:text-[#c68e76]',
                'transition-colors duration-300'
              )}
            />
          </div>

          {/* Title & Slug */}
          <div>
            <h3
              className={cn(
                'font-semibold text-zinc-900 dark:text-white',
                'group-hover:text-[#c68e76] transition-colors duration-200'
              )}
            >
              {knowledgeBase.name}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              /{knowledgeBase.slug}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full',
            statusConfig.bg,
            statusConfig.border,
            'border'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
          <span className={cn('text-[10px] font-medium', statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {knowledgeBase.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
          {knowledgeBase.description}
        </p>
      )}

      {/* Tags */}
      {knowledgeBase.tags && knowledgeBase.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {knowledgeBase.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
                'text-[10px] font-medium',
                'bg-zinc-100 dark:bg-white/5',
                'text-zinc-600 dark:text-zinc-400'
              )}
            >
              <LuTag size={10} />
              {tag}
            </span>
          ))}
          {knowledgeBase.tags.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{knowledgeBase.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <LuFileText size={13} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {knowledgeBase.document_count} docs
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <LuHash size={13} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {(knowledgeBase.chunk_count || 0).toLocaleString()} chunks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <LuDatabase size={13} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {formatBytes(knowledgeBase.total_size_bytes || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400">Chunk:</span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {knowledgeBase.default_chunk_size}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <VisibilityIcon size={12} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
            {knowledgeBase.visibility}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatDate(knowledgeBase.created_at)}
          </span>
        </div>

        <LuChevronRight
          size={16}
          className={cn(
            'text-zinc-300 dark:text-zinc-600',
            'group-hover:text-[#c68e76] group-hover:translate-x-0.5',
            'transition-all duration-200'
          )}
        />
      </div>
    </Link>
  )
}
