'use client'

import { useMemo } from 'react'
import { cn } from '@/app/_utils'

// ============================================================================
// Types
// ============================================================================

type StarSize = 'xs' | 'sm' | 'md' | 'lg'
type StarColor = 'white' | 'blue' | 'amber' | 'rose'
type AnimationType = 'twinkle' | 'twinkle-slow' | 'pulse'

interface StarConfig {
  id: string
  x: number // percentage
  y: number // percentage
  size: StarSize
  color: StarColor
  delay: number // seconds
  animation: AnimationType
}

interface StarryBackgroundProps {
  /** Container size in pixels */
  size?: number
  /** Whether to show the constellation */
  showConstellation?: boolean
  /** Custom class name */
  className?: string
  /** Intensity of stars (affects glow) */
  intensity?: 'low' | 'medium' | 'high'
}

// ============================================================================
// Star Configuration
// ============================================================================

const STAR_SIZES: Record<StarSize, string> = {
  xs: 'w-0.5 h-0.5 sm:w-1 sm:h-1',
  sm: 'w-1 h-1 sm:w-1.5 sm:h-1.5',
  md: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
  lg: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
}

const STAR_COLORS: Record<StarColor, { light: string; dark: string }> = {
  white: { light: 'text-zinc-400', dark: 'text-white' },
  blue: { light: 'text-blue-400', dark: 'text-blue-200' },
  amber: { light: 'text-amber-500', dark: 'text-amber-300' },
  rose: { light: 'text-rose-400', dark: 'text-rose-300' },
}

const INTENSITY_GLOW: Record<string, string> = {
  low: 'drop-shadow-sm',
  medium: 'drop-shadow-md',
  high: 'drop-shadow-lg',
}

// Orion constellation star positions
const ORION_STARS: StarConfig[] = [
  // Belt stars (3 prominent diagonal)
  { id: 'belt-1', x: 35, y: 45, size: 'md', color: 'blue', delay: 0, animation: 'twinkle' },
  { id: 'belt-2', x: 50, y: 50, size: 'lg', color: 'blue', delay: 1, animation: 'twinkle' },
  { id: 'belt-3', x: 65, y: 55, size: 'md', color: 'blue', delay: 2, animation: 'twinkle' },
  // Shoulders
  {
    id: 'shoulder-l',
    x: 25,
    y: 25,
    size: 'sm',
    color: 'rose',
    delay: 0.5,
    animation: 'twinkle-slow',
  },
  {
    id: 'shoulder-r',
    x: 75,
    y: 25,
    size: 'sm',
    color: 'blue',
    delay: 1.5,
    animation: 'twinkle-slow',
  },
  // Feet
  { id: 'foot-l', x: 30, y: 75, size: 'sm', color: 'white', delay: 2.5, animation: 'twinkle' },
  { id: 'foot-r', x: 70, y: 75, size: 'sm', color: 'blue', delay: 3, animation: 'twinkle' },
  // Ambient stars
  {
    id: 'ambient-1',
    x: 15,
    y: 40,
    size: 'xs',
    color: 'white',
    delay: 4,
    animation: 'twinkle-slow',
  },
  { id: 'ambient-2', x: 85, y: 60, size: 'xs', color: 'blue', delay: 3.5, animation: 'pulse' },
  {
    id: 'ambient-3',
    x: 60,
    y: 20,
    size: 'xs',
    color: 'white',
    delay: 1.8,
    animation: 'twinkle-slow',
  },
  { id: 'ambient-4', x: 40, y: 80, size: 'xs', color: 'blue', delay: 2.2, animation: 'pulse' },
  { id: 'ambient-5', x: 20, y: 60, size: 'xs', color: 'amber', delay: 0.8, animation: 'twinkle' },
  {
    id: 'ambient-6',
    x: 80,
    y: 35,
    size: 'xs',
    color: 'white',
    delay: 3.2,
    animation: 'twinkle-slow',
  },
]

// ============================================================================
// Star Component
// ============================================================================

interface StarProps {
  config: StarConfig
  intensity: 'low' | 'medium' | 'high'
}

function Star({ config, intensity }: StarProps) {
  const colorClasses = STAR_COLORS[config.color]

  const animationClass = useMemo(() => {
    switch (config.animation) {
      case 'twinkle':
        return 'animate-pulse'
      case 'twinkle-slow':
        return 'animate-[pulse_3s_ease-in-out_infinite]'
      case 'pulse':
        return 'animate-[pulse_2s_ease-in-out_infinite]'
      default:
        return 'animate-pulse'
    }
  }, [config.animation])

  return (
    <div
      className={cn(
        'absolute transition-opacity duration-500',
        STAR_SIZES[config.size],
        animationClass,
        INTENSITY_GLOW[intensity]
      )}
      style={{
        left: `${config.x}%`,
        top: `${config.y}%`,
        animationDelay: `${config.delay}s`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn(
          'w-full h-full transition-colors duration-300',
          colorClasses.dark,
          `dark:${colorClasses.dark}`
        )}
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function StarryBackground({
  size = 200,
  showConstellation = true,
  className,
  intensity = 'medium',
}: StarryBackgroundProps) {
  const stars = showConstellation
    ? ORION_STARS
    : ORION_STARS.filter((s) => s.id.startsWith('ambient'))

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden',
        'transition-opacity duration-500',
        className
      )}
      style={{
        width: size,
        height: size,
      }}
      role="presentation"
      aria-hidden="true"
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className={cn(
          'absolute inset-0 rounded-full opacity-0',
          'bg-gradient-radial from-blue-500/10 via-transparent to-transparent',
          'dark:from-blue-400/20'
        )}
      />

      {/* Stars */}
      {stars.map((star) => (
        <Star key={star.id} config={star} intensity={intensity} />
      ))}

      {/* Connecting lines for constellation (optional visual) */}
      {showConstellation && (
        <svg
          className="absolute inset-0 w-full h-full opacity-10 dark:opacity-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <title>Orion Constellation</title>
          {/* Belt line */}
          <line
            x1="35"
            y1="45"
            x2="65"
            y2="55"
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-blue-300"
          />
          {/* Shoulder to belt */}
          <line
            x1="25"
            y1="25"
            x2="35"
            y2="45"
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-zinc-400"
          />
          <line
            x1="75"
            y1="25"
            x2="65"
            y2="55"
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-zinc-400"
          />
          {/* Belt to feet */}
          <line
            x1="35"
            y1="45"
            x2="30"
            y2="75"
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-zinc-400"
          />
          <line
            x1="65"
            y1="55"
            x2="70"
            y2="75"
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-zinc-400"
          />
        </svg>
      )}
    </div>
  )
}
