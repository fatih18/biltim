import type { AnyRoute } from 'nucleus-core-ts/server'
import type { MailRuntime } from './types'

/**
 * Getting nucleus's mail service to a background worker.
 *
 * nucleus 0.10.115 lends its services (`sendEmail`, `isEmailAvailable`,
 * `emailProvider`, `emailSenderAddress`) to a host only as `ctx.nucleus` of a
 * route handler. `createNucleusServer` returns no handle to it, and the
 * accessor behind it (`getMountedRuntime`) is not exported from
 * `nucleus-core-ts/server` nor reachable through the package's `exports` map.
 * A worker that runs outside a request therefore has no way to ask for it.
 *
 * The smallest supported way is the one the framework offers: a host route
 * keeps the object it was handed. The runtime is made of live accessors (a
 * credential rotation in the admin panel applies to the next call), so one
 * copy stays valid for the life of the process. `/biltim/me/scope` does it, and
 * the home page of every signed-in person calls that; so does the mail status
 * route. Until the first such request after a start the worker has nothing to
 * send with and does nothing, which is exactly what "mail not configured" does.
 */

/** What the framework types `ctx.nucleus` as. Read off the handler, so it follows the framework. */
export type NucleusSlot = Parameters<AnyRoute['handler']>[0]['nucleus']

const METHODS: readonly string[] = ['sendEmail', 'isEmailAvailable', 'emailProvider', 'emailSenderAddress']

// The framework declares ctx.nucleus as unknown, so NucleusSlot narrows to the mail service only through this guard.
export function isMailRuntime(slot: NucleusSlot): slot is MailRuntime {
  if (typeof slot !== 'object' || slot === null) return false
  return METHODS.every((name) => name in slot && typeof Reflect.get(slot, name) === 'function')
}

let latched: MailRuntime | null = null
let onFirstLatch: (() => void) | null = null

/**
 * Keeps the mail service of a handler's context for the worker; anything that is
 * not one is ignored. The first time it is kept the worker is told, so the
 * provider is reported and due mails go out at once rather than a minute later.
 */
export function latchMailRuntime(slot: NucleusSlot): void {
  if (!isMailRuntime(slot)) return
  const first = latched === null
  latched = slot
  if (first) onFirstLatch?.()
}

/** The worker's wake-up for the first latch (null to remove it). */
export function onMailRuntimeLatched(listener: (() => void) | null): void {
  onFirstLatch = listener
}

export function latchedMailRuntime(): MailRuntime | null {
  return latched
}

/** For tests: forget the latched service. */
export function forgetMailRuntime(): void {
  latched = null
  onFirstLatch = null
}
