import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

/**
 * Whether the `@azure/communication-email` package can be loaded the way nucleus loads it.
 *
 * nucleus builds its Azure service with `require('@azure/communication-email')` inside its own
 * code, lazily, on the first "can mail go out?" question. The package is an OPTIONAL dependency
 * of nucleus-core-ts and is already in bun.lock, so a normal `bun install` brings it: Biltim
 * adds nothing to package.json, and `deploy/update.sh` never needs npm access for mail.
 *
 * The lookup starts from the framework's own folder, not from this file. bun's isolated install
 * keeps an optional dependency of nucleus-core-ts next to nucleus-core-ts and does NOT link it into
 * the backend's node_modules, so `require.resolve` from here fails while nucleus loads it fine
 * (measured). Asking from where nucleus asks gives the answer that matters. A hoisted layout
 * resolves from there too.
 *
 * Without the package nucleus logs one error per question (`Initialization failed`) and every
 * "can mail go out?" answer is no. The status route reports this separately so the line on
 * Ana Veri Yonetimi can say what is missing instead of "Azure not defined".
 */

export const MAIL_PACKAGE = '@azure/communication-email'

/** What nucleus's own `require` is anchored to: its server entry. */
const FRAMEWORK_ENTRY = 'nucleus-core-ts/server'

/** Turns a package name into a path, and throws when the package is not installed (what `require.resolve` does). */
export type ResolvePackage = (name: string) => string

/** The framework entry as a real path, symlinks followed: an isolated install reaches it through a link, and the sibling packages sit next to the real folder. */
const frameworkEntryPath = (): string => realpathSync(fileURLToPath(import.meta.resolve(FRAMEWORK_ENTRY)))

const resolveFromFramework: ResolvePackage = (name) => createRequire(frameworkEntryPath()).resolve(name)

/** True when the package resolves from where nucleus loads it; `resolve` is injectable for tests. */
export function isMailPackageInstalled(resolve: ResolvePackage = resolveFromFramework): boolean {
  try {
    resolve(MAIL_PACKAGE)
    return true
  } catch {
    return false
  }
}
