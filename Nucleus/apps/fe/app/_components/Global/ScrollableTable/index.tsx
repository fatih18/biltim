'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  children: React.ReactNode
  className?: string
  /** Shown once, above the table, only while there is content off-screen. */
  hint?: string
}

/**
 * A horizontally scrollable table that says so.
 *
 * `overflow-x-auto` alone makes a wide table usable but not discoverable: the
 * findings table runs 278px past its container, so the last column is simply
 * absent as far as the reader is concerned. This adds the two things that were
 * missing — an edge fade on whichever side has more content, and a one-line
 * hint — and removes them the moment the table fits.
 */
export function ScrollableTable({ children, className, hint = 'Tabloyu yana kaydırın' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ left: el.scrollLeft > 4, right: max > 4 && el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    measure()
    const el = ref.current
    if (!el) return
    // Column widths settle after data arrives, and the container follows the
    // viewport, so neither one measurement nor a scroll listener is enough.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const scrollable = edges.left || edges.right

  return (
    <div className={className}>
      {scrollable && hint ? (
        <p className="mb-1 text-right text-[11px] text-slate-500 dark:text-slate-400">{hint} →</p>
      ) : null}

      <div className="relative">
        <div ref={ref} onScroll={measure} className="overflow-x-auto">
          {children}
        </div>

        {edges.left ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-gradient-to-r from-white to-transparent dark:from-slate-950"
          />
        ) : null}
        {edges.right ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-white to-transparent dark:from-slate-950"
          />
        ) : null}
      </div>
    </div>
  )
}
