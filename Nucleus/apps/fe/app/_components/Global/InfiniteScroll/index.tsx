'use client'

import { useEffect, useRef } from 'react'

type Props = {
  /** Called when the sentinel scrolls into view. */
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
  /** Shown while a page is in flight. */
  loadingLabel?: string
  /** Shown once, when everything has been loaded. */
  endLabel?: string
  /** How far ahead of the sentinel to start loading. */
  rootMargin?: string
}

/**
 * The bottom of a server-driven list.
 *
 * An IntersectionObserver rather than a scroll handler: a scroll handler fires
 * on every frame and has to be told which element scrolls, which differs
 * between a page-level list and one inside a panel. The observer answers the
 * only question that matters — is the end of the list on screen — and costs
 * nothing while it is not.
 */
export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoadingMore,
  loadingLabel = 'Yükleniyor…',
  endLabel,
  rootMargin = '400px',
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Kept in a ref so a new callback identity on every render does not tear the
  // observer down and rebuild it mid-scroll.
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  useEffect(() => {
    const node = ref.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current()
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, rootMargin])

  return (
    <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
      {hasMore ? (
        <div ref={ref} aria-live="polite">
          {isLoadingMore ? loadingLabel : ' '}
        </div>
      ) : endLabel ? (
        <span>{endLabel}</span>
      ) : null}
    </div>
  )
}
