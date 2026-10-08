/**
 * Who was signed in on this device, for opening the audit form offline.
 *
 * The login check asks the server who the user is; with no connection that
 * fails and the screen sent the auditor to /login — which cannot load either.
 * The last answer is kept here and used ONLY when the device is offline. It
 * grants nothing on the server: every request still needs the session cookie,
 * and the offline queue is sent with it once the connection is back.
 * Cleared on logout.
 */
const KEY = 'biltim.offline.me'

export function rememberSignedInUser(user: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user))
  } catch {
    // Private mode or a full quota: offline opening just is not available.
  }
}

export function rememberedSignedInUser(): unknown | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function forgetSignedInUser(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to forget
  }
}

/** No network, as opposed to a refusal from the server. */
export function looksOffline(error?: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = String((error as { message?: unknown })?.message ?? error ?? '')
  return /failed to fetch|load failed|networkerror|network request failed/i.test(message)
}
