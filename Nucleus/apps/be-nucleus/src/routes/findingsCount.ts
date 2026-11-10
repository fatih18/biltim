import { query, type Row } from '../db'
import type { QueryParam } from '../guards/caller'

/**
 * The rows of the findings register: the findings that are on, with the audit
 * each came out of. The findings workbook and its count read through this one
 * fragment, so "N bulgu indirilecek" is the number of rows the file will hold
 * (R48), never a neighbouring query's idea of the same set.
 *
 * `findingsFilter`'s clauses name `f` and `a`, so they are appended to this.
 */
export const FINDINGS_FROM_WHERE = `FROM five_s_findings f
     LEFT JOIN five_s_audits a ON a.id = f.audit_id
     WHERE f.is_active = true`

/** The count of the findings a filter names (`findingsFilter`'s `sql`). */
export function findingsCountSql(where: string): string {
  return `SELECT count(*)::int AS total ${FINDINGS_FROM_WHERE}${where}`
}

/** What the count needs of the database; the real `query` fits, so a test can hand in a stand-in. */
export type FindingsCountRead = (text: string, params: QueryParam[]) => Promise<Row[]>

/** How many findings the filter names; 0 when the database answers with no row. */
export async function countFindings(
  where: string,
  params: QueryParam[],
  read: FindingsCountRead = query
): Promise<number> {
  const rows = await read(findingsCountSql(where), params)
  const total = Number(rows[0]?.total ?? 0)
  return Number.isFinite(total) ? total : 0
}
