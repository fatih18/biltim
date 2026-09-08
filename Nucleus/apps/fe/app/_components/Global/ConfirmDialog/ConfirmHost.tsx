'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveConfirm, subscribeToConfirm } from './confirm'
import type { ConfirmRequest } from './types'

/**
 * Renders whatever `confirmDialog()` has raised. Mounted once, in the root
 * layout, next to <Toaster />.
 *
 * Portalled to <body>: a dialog rendered in place is clipped by any
 * `overflow-hidden` ancestor, and several of these are raised from inside cards
 * and table rows.
 */
export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [mounted, setMounted] = useState(false)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => subscribeToConfirm(setRequest), [])

  const cancel = useCallback(() => resolveConfirm(false), [])
  const accept = useCallback(() => resolveConfirm(true), [])

  useEffect(() => {
    if (!request) return
    confirmRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        resolveConfirm(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    // The page behind must not scroll while a decision is pending.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [request])

  if (!mounted || !request) return null

  const isDanger = request.tone === 'danger'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={request.message ? 'confirm-message' : undefined}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={
              isDanger
                ? 'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                : 'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-600 dark:bg-sky-950 dark:text-sky-300'
            }
          >
            {isDanger ? '!' : '?'}
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {request.title}
            </h2>

            {request.message ? (
              <p
                id="confirm-message"
                className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              >
                {request.message}
              </p>
            ) : null}

            {request.items && request.items.length > 0 ? (
              <ul className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                {request.items.map((item) => (
                  <li key={item} className="truncate">
                    • {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {request.cancelLabel ?? 'Vazgeç'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={accept}
            className={
              isDanger
                ? 'rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600'
                : 'rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600'
            }
          >
            {request.confirmLabel ?? 'Devam Et'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
