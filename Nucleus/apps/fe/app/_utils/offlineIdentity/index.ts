/**
 * Who was signed in on this device, for opening the audit form offline.
 *
 * The login check asks the server who the user is; with no connection that
 * fails and the screen sent the auditor to /login — which cannot load either.
 * The last answer is kept here and used ONLY when the device is offline. It
 * grants nothing on the server: every request still needs the session cookie,
 * and the offline queue is sent with it once the connection is back.
 * Cleared on logout, and when the server says the session is gone.
 */
const KEY = 'biltim.offline.me'

/*
 * The audit form's offline store (denetim/page.tsx, Dexie). Its `snapshots`
 * table holds the plans, teams, locations and open findings last read online
 * — the signed-in person's view of them. Signing out has to take those too:
 * otherwise the next person to use the tablet offline is shown the previous
 * user's plans.
 */
const OFFLINE_DB = 'fiveS_offline_db_v1'
const SNAPSHOTS = 'snapshots'

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

/**
 * Forget the remembered user and the offline snapshots read under them.
 * Resolves once the snapshots are gone; callers that do not wait lose nothing
 * but the guarantee of ordering.
 */
export function forgetSignedInUser(): Promise<void> {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to forget
  }
  return clearOfflineSnapshots()
}

/*
 * Plain IndexedDB, not Dexie: this module is loaded by the login check on
 * every page, and pulling the whole Dexie library into every page to clear one
 * table is not worth it. Dexie keeps each table as an object store of the same
 * name, so this reaches the same rows.
 *
 * Only an existing database is touched. `indexedDB.open(name)` without a
 * version CREATES the database when it is missing; the upgrade is aborted and
 * the empty database removed, the same way Dexie's own existence check does.
 */
function clearOfflineSnapshots(): Promise<void> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      if (typeof indexedDB === 'undefined') return resolve()
      request = indexedDB.open(OFFLINE_DB)
    } catch {
      return resolve()
    }

    let created = false
    request.onupgradeneeded = () => {
      created = true
      request.transaction?.abort()
    }
    request.onerror = (event) => {
      event.preventDefault()
      if (created) {
        try {
          indexedDB.deleteDatabase(OFFLINE_DB)
        } catch {
          // an empty database left behind is harmless
        }
      }
      resolve()
    }
    request.onsuccess = () => {
      const idb = request.result
      const done = () => {
        idb.close()
        resolve()
      }
      try {
        if (!idb.objectStoreNames.contains(SNAPSHOTS)) return done()
        const tx = idb.transaction(SNAPSHOTS, 'readwrite')
        tx.objectStore(SNAPSHOTS).clear()
        tx.oncomplete = done
        tx.onerror = done
        tx.onabort = done
      } catch {
        done()
      }
    }
  })
}

/** No network, as opposed to a refusal from the server. */
export function looksOffline(error?: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = String((error as { message?: unknown })?.message ?? error ?? '')
  return /failed to fetch|load failed|networkerror|network request failed/i.test(message)
}
