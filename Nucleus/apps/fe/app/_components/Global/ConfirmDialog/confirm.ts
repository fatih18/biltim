'use client'

import type { ConfirmOptions, ConfirmRequest } from './types'

/*
 * Imperative confirm, shaped like `toast` from sonner so call sites read the
 * same way the rest of the app already does.
 *
 * `window.confirm` was doing this job in nine places. It is unstyled, it
 * ignores the theme, it cannot show a list, and — the reason this became
 * urgent — an environment that suppresses native dialogs makes it return
 * `false` silently, so a 5S audit could not be submitted at all and nothing
 * said why.
 */

type Listener = (request: ConfirmRequest | null) => void

let listener: Listener | null = null
let pending: ConfirmRequest | null = null
let nextId = 1

/** Called by the host component when it mounts. */
export function subscribeToConfirm(next: Listener): () => void {
  listener = next
  // A request raised before the host mounted must still be delivered.
  if (pending) next(pending)
  return () => {
    if (listener === next) listener = null
  }
}

export function resolveConfirm(value: boolean): void {
  const request = pending
  pending = null
  listener?.(null)
  request?.resolve(value)
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // A second request while one is open would orphan the first promise.
  if (pending) resolveConfirm(false)

  return new Promise<boolean>((resolve) => {
    pending = { ...options, id: nextId++, resolve }
    listener?.(pending)
  })
}
