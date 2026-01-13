'use client'

import { LuBug, LuCode, LuLayoutGrid, LuLightbulb } from 'react-icons/lu'
import { cn } from '@/app/_utils'
import type { FeatureItem, WelcomeSectionProps } from '../types'

// ============================================================================
// Feature Data
// ============================================================================

const FEATURES: FeatureItem[] = [
  {
    icon: <LuCode size={20} />,
    label: 'Write Code',
    description: 'Generate clean, efficient code',
  },
  {
    icon: <LuLightbulb size={20} />,
    label: 'Explain Concepts',
    description: 'Break down complex ideas',
  },
  {
    icon: <LuBug size={20} />,
    label: 'Debug Issues',
    description: 'Find and fix bugs fast',
  },
  {
    icon: <LuLayoutGrid size={20} />,
    label: 'Design Systems',
    description: 'Architecture & patterns',
  },
]

// ============================================================================
// Feature Card Component
// ============================================================================

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  return (
    <div
      className={cn(
        'group relative p-3 sm:p-4 rounded-xl',
        'bg-white dark:bg-zinc-900/80',
        'border border-zinc-200/80 dark:border-zinc-800',
        'transition-all duration-500 cursor-default',
        // Hover glow effect
        'hover:border-zinc-300 dark:hover:border-zinc-700',
        'hover:shadow-[0_0_30px_-5px_rgba(198,142,118,0.15)]',
        'dark:hover:shadow-[0_0_30px_-5px_rgba(198,142,118,0.2)]'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#c68e76]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center text-center gap-1.5 sm:gap-2">
        <div
          className={cn(
            'p-2 rounded-lg',
            'bg-zinc-100 dark:bg-zinc-800',
            'text-zinc-500 dark:text-zinc-400',
            'group-hover:bg-[#c68e76]/10 dark:group-hover:bg-[#c68e76]/20',
            'group-hover:text-[#c68e76]',
            'transition-all duration-300'
          )}
        >
          {feature.icon}
        </div>
        <div className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {feature.label}
        </div>
        <div className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 leading-tight hidden sm:block">
          {feature.description}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function WelcomeSection(_props: WelcomeSectionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-4 sm:py-8 pb-16 min-h-0">
      {/* Tagline */}
      <p
        className={cn(
          'font-light tracking-wide leading-relaxed max-w-md sm:max-w-xl',
          'text-xs sm:text-sm md:text-base',
          'text-zinc-500 dark:text-zinc-400',
          'mb-4 sm:mb-6'
        )}
      >
        Your AI-powered coding companion. Ask anything.
      </p>

      {/* Feature Grid - 2x2 on mobile, 4 columns on larger screens */}
      <div className="w-full max-w-xl mb-4 sm:mb-6 px-4 sm:px-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.label} feature={feature} index={i} />
          ))}
        </div>
      </div>

      {/* Hint - hide on very small heights */}
      <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 items-center gap-1 hidden sm:flex">
        <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[9px] sm:text-[10px] font-mono">
          Enter
        </kbd>
        <span>to send</span>
        <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
        <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[9px] sm:text-[10px] font-mono">
          Shift+Enter
        </kbd>
        <span>for new line</span>
      </p>
    </div>
  )
}
