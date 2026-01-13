'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

// ============================================================================
// Main Component
// ============================================================================

export function MobileModal({ isOpen, onClose, title, children }: MobileModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Use portal to render at document body
  return createPortal(
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Content - Full screen slide up */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 top-12',
          'bg-white dark:bg-zinc-900',
          'rounded-t-2xl shadow-2xl',
          'flex flex-col',
          'animate-in slide-in-from-bottom duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg',
              'text-zinc-500 dark:text-white/50',
              'hover:bg-zinc-100 dark:hover:bg-white/10',
              'transition-colors'
            )}
            aria-label="Close"
          >
            <LuX size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
