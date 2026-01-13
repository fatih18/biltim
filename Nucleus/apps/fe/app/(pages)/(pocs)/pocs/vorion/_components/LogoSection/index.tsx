'use client'

import Image from 'next/image'
import { cn } from '@/app/_utils'
import { StarryBackground } from '../StarryBackground'

// ============================================================================
// Types
// ============================================================================

interface LogoSectionProps {
  isCompact: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function LogoSection({ isCompact }: LogoSectionProps) {
  const logoSize = isCompact ? 48 : 80

  return (
    <div
      className={cn(
        'flex flex-col items-center transition-all duration-700 ease-out',
        isCompact ? 'gap-1 flex-row' : 'gap-2 sm:gap-3'
      )}
    >
      <div className="relative">
        <StarryBackground size={logoSize} intensity={isCompact ? 'low' : 'medium'} />
        <Image
          src="/vorion.png"
          alt="Vorion AI Platform"
          width={logoSize}
          height={logoSize}
          className="relative z-10"
          priority
        />
      </div>

      {!isCompact && (
        <div className="text-center">
          <h1
            className={cn(
              'font-black tracking-tight leading-none',
              'text-zinc-900 dark:text-white',
              'text-2xl sm:text-3xl md:text-4xl'
            )}
          >
            VORION
          </h1>
          <div className="flex items-center justify-center my-1">
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-600 to-transparent w-12 sm:w-16" />
          </div>
          <span className="block text-zinc-400 dark:text-zinc-500 tracking-[0.25em] text-sm sm:text-base md:text-lg font-light uppercase">
            Portal
          </span>
        </div>
      )}
    </div>
  )
}
