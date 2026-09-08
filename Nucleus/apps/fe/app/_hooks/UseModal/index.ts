'use client'

import { useEffect, useRef } from 'react'

/**
 * The behaviour every dialog on this app was missing.
 *
 * Measured on the audit-edit modal: Escape did nothing, focus stayed on
 * <body> behind the overlay, and nothing in the markup said a dialog was
 * open. Fourteen modal-like components had the same gap, so the fix belongs
 * in one place rather than fourteen.
 *
 * What it does:
 *   - Escape closes, but only the TOPMOST dialog, so a confirm opened over a
 *     form does not take the form down with it.
 *   - The page behind stops scrolling while it is open.
 *   - Focus moves into the dialog on open and returns to whatever had it when
 *     the dialog closes.
 *
 * Spread the returned props onto the panel element; they carry the ARIA that
 * makes it a dialog to a screen reader, and the ref the focus handling needs.
 */

let acikYigin: symbol[] = []

export function useModal(
  onClose: () => void,
  options?: {
    labelledBy?: string
    /*
     * Whether the dialog is actually on screen.
     *
     * Several of these components are mounted the whole time and return null
     * while closed, so the hook cannot assume that being called means being
     * open — locking the page scroll on mount would freeze the page behind a
     * dialog nobody opened. Hooks may not be called conditionally, so the
     * condition comes in as a flag instead.
     */
    enabled?: boolean
  }
) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const kapatRef = useRef(onClose)
  kapatRef.current = onClose
  const acik = options?.enabled ?? true

  useEffect(() => {
    if (!acik) return
    const kimlik = Symbol('modal')
    acikYigin.push(kimlik)
    const oncekiOdak = document.activeElement as HTMLElement | null

    const onceki = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // İlk odaklanabilir öğe; yoksa panelin kendisi.
    const panel = panelRef.current
    const odaklanabilir = panel?.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
    ;(odaklanabilir ?? panel)?.focus?.()

    const tus = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Yalnız en üstteki kapanır.
      if (acikYigin[acikYigin.length - 1] !== kimlik) return
      e.stopPropagation()
      kapatRef.current()
    }
    document.addEventListener('keydown', tus)

    return () => {
      document.removeEventListener('keydown', tus)
      acikYigin = acikYigin.filter((k) => k !== kimlik)
      if (acikYigin.length === 0) document.body.style.overflow = onceki
      oncekiOdak?.focus?.()
    }
  }, [acik])

  return {
    ref: panelRef,
    role: 'dialog' as const,
    'aria-modal': true,
    tabIndex: -1,
    ...(options?.labelledBy ? { 'aria-labelledby': options.labelledBy } : {}),
  }
}
