'use client'

import { useId } from 'react'
import { sparkPoints } from './chart'

export type SparkTone = 'ok' | 'warn' | 'bad' | 'info'

const STROKE: Record<SparkTone, string> = {
  ok: 'rgb(16 185 129)',
  warn: 'rgb(245 158 11)',
  bad: 'rgb(244 63 94)',
  info: 'rgb(56 189 248)',
}

/**
 * The shape of the last hour, under the number that says what is true now.
 *
 * Drawn as inline SVG rather than pulled from a chart library: one line and a
 * gradient wash is all this needs, and a library would ship a few hundred
 * kilobytes to a screen whose whole point is that the system is under strain.
 *
 * The gradient id is per-instance — a fixed id makes every sparkline on the
 * page use the first one's colour, which is invisible until two tones sit next
 * to each other.
 */
export function Spark({
  values,
  tone = 'info',
  max,
  width = 220,
  height = 44,
  label,
}: {
  values: number[]
  tone?: SparkTone
  /** Fixes the ceiling, so a percentage chart is not self-scaling. */
  max?: number
  width?: number
  height?: number
  label?: string
}) {
  const gradientId = useId()
  if (values.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-slate-100 text-[11px] text-slate-400 dark:bg-slate-800/60 dark:text-slate-500"
        style={{ height }}
      >
        henüz ölçüm yok
      </div>
    )
  }

  const pad = 3
  const points = sparkPoints(values, width - pad * 2, height - pad * 2, max)
  const stroke = STROKE[tone]
  // The fill closes the line down to the baseline on both ends.
  const area = `${pad},${height - pad} ${points
    .split(' ')
    .map((p) => {
      const [x, y] = p.split(',')
      return `${Number(x) + pad},${Number(y) + pad}`
    })
    .join(' ')} ${width - pad},${height - pad}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? 'son bir saatin seyri'}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={points
          .split(' ')
          .map((p) => {
            const [x, y] = p.split(',')
            return `${Number(x) + pad},${Number(y) + pad}`
          })
          .join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
