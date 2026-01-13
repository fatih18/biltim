'use client'

import { cn } from '@/app/_utils'
import type { SizeVariant } from '../types'

// ============================================================================
// Types
// ============================================================================

interface MiniSwitchProps {
  /** Whether the switch is on */
  isOn: boolean
  /** Optional click handler */
  onToggle?: () => void
  /** Size variant */
  size?: SizeVariant
  /** Disabled state */
  disabled?: boolean
  /** Accessible label */
  label?: string
  /** Custom class name */
  className?: string
}

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_CONFIG = {
  xs: { track: 'w-5 h-2.5', thumb: 'w-1.5 h-1.5', translate: 'translate-x-2.5' },
  sm: { track: 'w-6 h-3', thumb: 'w-2 h-2', translate: 'translate-x-3' },
  md: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
  lg: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
  xl: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
} as const

// ============================================================================
// Component
// ============================================================================

export function MiniSwitch({
  isOn,
  onToggle,
  size = 'sm',
  disabled = false,
  label,
  className,
}: MiniSwitchProps) {
  const config = SIZE_CONFIG[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex items-center rounded-full transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-blue-500 dark:focus-visible:ring-offset-zinc-900',
        config.track,
        {
          // On state - theme aware
          'bg-blue-500 shadow-lg shadow-blue-500/30 dark:bg-blue-400 dark:shadow-blue-400/30': isOn,
          // Off state - theme aware
          'bg-zinc-300 dark:bg-zinc-600': !isOn,
          // Disabled state
          'opacity-50 cursor-not-allowed': disabled,
          'cursor-pointer': !disabled,
        },
        className
      )}
    >
      {/* Thumb */}
      <span
        className={cn(
          'absolute left-0.5 rounded-full bg-white shadow-md',
          'transition-all duration-300 ease-out',
          config.thumb,
          {
            [config.translate]: isOn,
            'translate-x-0': !isOn,
            'scale-110': isOn,
            'scale-100': !isOn,
          }
        )}
      />

      {/* Glow effect when on */}
      {isOn && (
        <span
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-blue-400/20 dark:bg-blue-300/20',
            'animate-pulse'
          )}
        />
      )}
    </button>
  )
}
