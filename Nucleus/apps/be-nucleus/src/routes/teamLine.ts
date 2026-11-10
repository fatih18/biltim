import type { Row } from '../db'
import { locationKey } from './locationMatch'

/**
 * Single findings saved before R19 (customer notes, row 19) carry a line
 * "Ekip: Content Manager Core Team" inside their stored description: the form
 * wrote the internal name of the person's ROLE as if it were a team, and the
 * customer read it as one. The screens hide that line where they show a
 * description (fe `withoutRoleAsTeam`); the Excel register and the dashboard
 * workbook print it here without it. Nothing is written back to the database.
 */

/**
 * The names and the Turkish aliases of the roles, as `roles.name` and
 * `roles.alias` hold them, plus `basic`, the role `/auth/register` gives
 * everyone. None of them is ever a team. Keep it level with the screens'
 * `withoutRoleAsTeam` (fe denetim/_utils/userTeams.ts).
 */
const ROLE_NAMES: readonly string[] = [
  'Content Manager Core Team',
  'Merkez Ekip',
  'Manager',
  'Müdür',
  'Auditor',
  'Denetçi',
  'Field Manager',
  'Saha Sorumlusu',
  'Super Admin',
  'godmin',
  'basic',
]

/** Compared the way places are: Turkish lower case, dotted and dotless i alike (`SUPER ADMIN`, `MERKEZ EKİP`). */
const ROLE_KEYS: ReadonlySet<string> = new Set(ROLE_NAMES.map((name) => locationKey(name)))

const TEAM_LINE = /^Ekip:\s*(.*)$/

/**
 * A description without its "Ekip: <role name>" lines. A line that names a real
 * team ("Ekip: Haddehane Ekibi"), and every other line, is left as it is.
 */
export function withoutRoleAsTeam(description: string | null | undefined): string {
  const text = description ?? ''
  if (!text.includes('Ekip:')) return text
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const named = TEAM_LINE.exec(line.trim())?.[1]
      return named === undefined || !ROLE_KEYS.has(locationKey(named))
    })
    .join(eol)
}

/** A finding row for a workbook: the same row, its description without the role-as-team line. */
export function describedWithoutRoleAsTeam(row: Row): Row {
  return typeof row.description === 'string' ? { ...row, description: withoutRoleAsTeam(row.description) } : row
}
