'use client'

import {
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuExternalLink,
  LuFile,
  LuFileJson,
  LuFileSpreadsheet,
  LuFileText,
  LuFileType,
  LuGlobe,
  LuLoader,
  LuTrash2,
  LuYoutube,
} from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { VorionDocumentListItem } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

interface DocumentCardProps {
  document: VorionDocumentListItem
  onDelete?: (docId: string) => void
  isDeleting?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

function getDocumentIcon(type: string) {
  switch (type) {
    case 'pdf':
      return { icon: LuFileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' }
    case 'txt':
    case 'markdown':
      return { icon: LuFileType, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' }
    case 'csv':
      return {
        icon: LuFileSpreadsheet,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      }
    case 'json':
      return { icon: LuFileJson, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
    case 'docx':
      return { icon: LuFileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' }
    case 'html':
    case 'url':
      return { icon: LuGlobe, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' }
    case 'youtube':
      return { icon: LuYoutube, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' }
    default:
      return { icon: LuFile, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-500/10' }
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        icon: LuCheck,
        label: 'Completed',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      }
    case 'processing':
      return {
        icon: LuLoader,
        label: 'Processing',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        animate: true,
      }
    case 'pending':
      return {
        icon: LuClock,
        label: 'Pending',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
      }
    case 'failed':
      return {
        icon: LuCircleAlert,
        label: 'Failed',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
      }
    case 'partial':
      return {
        icon: LuCircleAlert,
        label: 'Partial',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-500/10',
      }
    default:
      return {
        icon: LuClock,
        label: String(status),
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-50 dark:bg-zinc-500/10',
      }
  }
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================================
// Component
// ============================================================================

export function DocumentCard({ document, onDelete, isDeleting }: DocumentCardProps) {
  const docType = getDocumentIcon(document.document_type)
  const statusConfig = getStatusConfig(document.status)
  const DocIcon = docType.icon
  const StatusIcon = statusConfig.icon

  return (
    <div
      className={cn(
        'group relative flex items-start gap-4 p-4 rounded-xl',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200/70 dark:border-white/10',
        'hover:border-zinc-300 dark:hover:border-white/20',
        'transition-all duration-200'
      )}
    >
      {/* Document Icon */}
      <div className={cn('flex-shrink-0 p-2.5 rounded-xl', docType.bg)}>
        <DocIcon size={20} className={docType.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-zinc-900 dark:text-white truncate">{document.title}</h4>
            {document.storage_uri && (
              <a
                href={String(document.storage_uri)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 mt-0.5',
                  'text-xs text-zinc-400 hover:text-[#c68e76]',
                  'transition-colors'
                )}
              >
                <LuExternalLink size={10} />
                <span className="truncate max-w-[200px]">{String(document.storage_uri)}</span>
              </a>
            )}
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full',
              statusConfig.bg
            )}
          >
            <StatusIcon
              size={12}
              className={cn(statusConfig.color, statusConfig.animate && 'animate-spin')}
            />
            <span className={cn('text-[10px] font-medium', statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="uppercase font-medium">{document.document_type}</span>
          {formatFileSize(document.size_bytes) && (
            <>
              <span>•</span>
              <span>{formatFileSize(document.size_bytes)}</span>
            </>
          )}
        </div>

        {/* Error Message */}
        {document.error_message && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 line-clamp-2">
            {document.error_message}
          </p>
        )}
      </div>

      {/* Delete Button */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          disabled={isDeleting}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            'opacity-0 group-hover:opacity-100',
            'text-zinc-400 hover:text-red-500',
            'hover:bg-red-50 dark:hover:bg-red-500/10',
            'transition-all duration-200',
            isDeleting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isDeleting ? <LuLoader size={16} className="animate-spin" /> : <LuTrash2 size={16} />}
        </button>
      )}
    </div>
  )
}
