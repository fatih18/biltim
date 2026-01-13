'use client'

import { useCallback, useEffect } from 'react'
import { LuTriangleAlert, LuX } from 'react-icons/lu'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    },
    [onClose, isLoading]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default',
          'animate-in fade-in duration-200'
        )}
        onClick={!isLoading ? onClose : undefined}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-sm',
          'bg-white dark:bg-zinc-900',
          'rounded-2xl shadow-2xl',
          'border border-zinc-200 dark:border-white/10',
          'animate-in zoom-in-95 fade-in duration-200'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className={cn(
            'absolute top-3 right-3 p-1.5 rounded-lg',
            'text-zinc-400 hover:text-zinc-600',
            'dark:text-white/40 dark:hover:text-white/60',
            'hover:bg-zinc-100 dark:hover:bg-white/5',
            'transition-colors duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Close"
        >
          <LuX size={18} />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div
            className={cn(
              'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4',
              styles.icon
            )}
          >
            <LuTriangleAlert size={28} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>

          {/* Description */}
          <p className="text-sm text-zinc-500 dark:text-white/60 mb-6">{description}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl font-medium text-sm',
                'bg-zinc-100 dark:bg-white/5',
                'text-zinc-700 dark:text-white/70',
                'hover:bg-zinc-200 dark:hover:bg-white/10',
                'border border-zinc-200 dark:border-white/10',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl font-medium text-sm',
                styles.button,
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
