/**
 * Who reads findings through nucleus's generic route, and by which claim (R61).
 *
 * `previous_finding_no`, the number a renumbered finding had before, is shown by
 * the Bulgular register ("eski no") and travels in the same `GET /fiveSFindings`
 * rows as `finding_no`. Nucleus cuts a read's columns only for a role that holds
 * COLUMN claims alone: a role with the table claim `get.five_s_findings` gets
 * every column, the new one included, and the godmin bypasses claims. So the
 * table claim is the one thing a role needs to read the old number.
 *
 * roles-nucleus-claims.sql gives it to all five roles, but nothing runs SQL at
 * deploy: boot grants it again, idempotently, to every role that reads findings.
 * It is a read claim only. The old number is written by the system alone: no
 * grant here names a write claim for it, and the business-rule guard refuses it
 * in a request body (guards/businessRules.ts).
 */

/** The role names that read findings (DB names, as `main.roles.name` holds them). */
export const FINDING_READER_ROLES = [
  'Auditor',
  'Field Manager',
  'Manager',
  'Content Manager Core Team',
  'Super Admin',
] as const

/** The table-level read claim of the findings table: it covers every column. */
export const FINDING_READ_CLAIM = 'get.five_s_findings'

/** `[role, claim]` pairs for boot.ts's grant statement. */
export const FINDING_READ_GRANTS: Array<[role: string, action: string]> = FINDING_READER_ROLES.map(
  (role): [string, string] => [role, FINDING_READ_CLAIM]
)

/**
 * Whether a stored claim covers `method.table.column`, by nucleus's own rule
 * (`claimMatches`): the claim's dot-separated parts are a prefix of the wanted
 * claim's parts, so `get.five_s_findings` covers `get.five_s_findings.<column>`.
 */
export function claimCovers(claim: string, wanted: string): boolean {
  const have = claim.split('.')
  const need = wanted.split('.')
  return have.length <= need.length && have.every((part, index) => part === need[index])
}
