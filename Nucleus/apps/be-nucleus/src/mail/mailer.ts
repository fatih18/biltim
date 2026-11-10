import { createRequire } from 'node:module'

/**
 * Whether the `nodemailer` package can be loaded on this server.
 *
 * nucleus builds its SMTP service with `createRequire(import.meta.url)('nodemailer')` and
 * never lists the package as its own dependency, so an app has to bring it. Biltim does not
 * list it in package.json on purpose: a changed package file makes `deploy/update.sh` run
 * `bun install --frozen-lockfile`, which needs npm access that customer servers usually
 * lack, and the update stops there. The package is installed by hand once, on the server
 * (`bun add nodemailer` in the be-nucleus folder, then a restart of the backend).
 *
 * Without it nucleus logs one line (`is nodemailer installed in this app?`) and every
 * "can mail go out?" answer is no. The status route reports this separately so the line
 * on Ana Veri Yonetimi can say what is missing instead of "SMTP not defined".
 */

export const MAILER_PACKAGE = 'nodemailer'

/** Turns a package name into a path, and throws when the package is not installed (what `require.resolve` does). */
export type ResolvePackage = (name: string) => string

const resolveFromBackend: ResolvePackage = (name) => createRequire(import.meta.url).resolve(name)

/** True when the package resolves from the backend; `resolve` is injectable for tests. */
export function isMailerInstalled(resolve: ResolvePackage = resolveFromBackend): boolean {
  try {
    resolve(MAILER_PACKAGE)
    return true
  } catch {
    return false
  }
}
