'use client'

import { LuBookOpen, LuPlus, LuSparkles } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface EmptyStateProps {
  onCreateClick: () => void
}

// ============================================================================
// Component
// ============================================================================

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-6',
        'animate-in fade-in duration-500'
      )}
    >
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div
          className={cn(
            'w-24 h-24 rounded-3xl',
            'bg-gradient-to-br from-zinc-100 to-zinc-200',
            'dark:from-zinc-800 dark:to-zinc-900',
            'flex items-center justify-center',
            'shadow-lg shadow-zinc-200/50 dark:shadow-black/20'
          )}
        >
          <LuBookOpen size={40} className="text-zinc-400 dark:text-zinc-500" />
        </div>

        {/* Sparkle decorations */}
        <div className="absolute -top-2 -right-2">
          <LuSparkles size={20} className="text-[#c68e76] animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -left-3">
          <LuSparkles size={14} className="text-[#c68e76]/60 animate-pulse animation-delay-500" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        No Knowledge Bases Yet
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-6">
        Create your first knowledge base to start organizing and searching your documents with AI.
      </p>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onCreateClick}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-xl',
          'bg-gradient-to-r from-[#c68e76] to-[#b07d67]',
          'hover:from-[#b07d67] hover:to-[#9a6d5a]',
          'text-white font-medium text-sm',
          'shadow-lg shadow-[#c68e76]/20',
          'hover:shadow-xl hover:shadow-[#c68e76]/30',
          'transition-all duration-300',
          'hover:scale-105'
        )}
      >
        <LuPlus size={16} />
        Create Knowledge Base
      </button>

      {/* Tip */}
      <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-xs">
        💡 Tip: Upload PDFs, documents, or web pages to create a searchable knowledge base.
      </p>
    </div>
  )
}
