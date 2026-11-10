import { type Row, query } from './db'
import type { QueryParam } from './guards/caller'

type Run = (text: string, params?: QueryParam[]) => Promise<Row[]>

/** Where the boot log lines go; `console` fits. */
export type NumberLog = { log: (line: string) => void; error: (line: string) => void }

/**
 * Finding numbers that repeat (R61), repaired at boot.
 *
 * `finding_no` comes from an identity sequence, and identity adds no unique
 * index. When the sequence was dropped and re-created (25.08 / 08.09, see the
 * note in boot.ts) numbers 1 and 2 were handed out a second time: the 21 Aug
 * "SSH Bakım" audit and two single findings of Bölge 3 carried the same pair.
 * Boot now moves the sequence past the stored maximum, so no number repeats
 * from here on; this step repairs what was already stored, and the unique
 * index after it makes the database refuse a repeat.
 *
 * It does not renumber to a fixed number. The customer was told #12 and #13,
 * but those are taken by newer findings by now, so any fixed target would
 * create new duplicates. Instead, among the rows that share a number (active
 * or not: a unique index has to hold for every row) the OLDEST keeps it, by
 * `created_at` and then `id`, and every other row takes the next number of the
 * sequence. The number it had is kept in `previous_finding_no`, an audit trail
 * that is never overwritten once set.
 *
 * Re-runnable at any time: with no shared number the first query returns
 * nothing and no update is issued. Each update is one atomic statement and is
 * guarded by the number the row had when it was read, so two runs at once
 * cannot renumber a row twice. It is deliberately not one transaction: a
 * failed statement aborts a Postgres transaction, and one row that cannot be
 * renumbered must not stop the others (it stays a duplicate, and the unique
 * index step then says so).
 */

/** Rows whose number another row also carries, oldest first. */
export const SHARED_FINDING_NUMBERS_SQL = `select id, finding_no
  from main.five_s_findings
 where finding_no in (
         select finding_no from main.five_s_findings group by finding_no having count(*) > 1)
 order by created_at, id`

/** Gives one row the next number of the identity sequence and remembers the old one. */
export const RENUMBER_FINDING_SQL = `update main.five_s_findings
   set finding_no = nextval(pg_get_serial_sequence('main.five_s_findings', 'finding_no')::regclass),
       previous_finding_no = coalesce(previous_finding_no, finding_no)
 where id = $1 and finding_no = $2
returning finding_no`

/** Same name config.json declares, so the schema push and boot agree on one index. */
export const FINDING_NO_UNIQUE_INDEX = 'five_s_findings_finding_no_uq'

export const FINDING_NO_UNIQUE_INDEX_SQL = `create unique index if not exists ${FINDING_NO_UNIQUE_INDEX}
  on main.five_s_findings (finding_no)`

export type RenumberedFinding = { id: string; from: number; to: number }
export type RenumberResult = { renumbered: RenumberedFinding[]; failed: number }

function toInteger(value: Row[string]): number | undefined {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof parsed === 'number' && Number.isInteger(parsed) ? parsed : undefined
}

/**
 * Renumbers every finding that shares its number with an older one. Throws only
 * when the first query fails; a row that cannot be renumbered is logged,
 * counted in `failed` and skipped.
 */
export async function renumberDuplicateFindings(
  run: Run = query,
  log: NumberLog = console
): Promise<RenumberResult> {
  const result: RenumberResult = { renumbered: [], failed: 0 }
  const kept = new Set<number>()
  for (const row of await run(SHARED_FINDING_NUMBERS_SQL)) {
    const id = typeof row.id === 'string' ? row.id : undefined
    const from = toInteger(row.finding_no)
    if (id === undefined || from === undefined) {
      result.failed += 1
      log.error('[boot] bulgu numarası okunamadı, satır atlandı')
      continue
    }
    if (!kept.has(from)) {
      kept.add(from)
      continue
    }
    try {
      const updated = await run(RENUMBER_FINDING_SQL, [id, from])
      const to = toInteger(updated[0]?.finding_no)
      if (to === undefined) continue
      result.renumbered.push({ id, from, to })
      log.log(`[boot] bulgu #${from} → #${to} olarak yeniden numaralandı (${id})`)
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error)
      result.failed += 1
      log.error(`[boot] bulgu #${from} yeniden numaralanamadı (${id}): ${why}`)
    }
  }
  return result
}

/**
 * Makes the database refuse a repeated finding number. Returns false, with a
 * clear log line, when the index cannot be built (a duplicate is still stored);
 * the API starts as before.
 */
export async function ensureUniqueFindingNumbers(run: Run = query, log: NumberLog = console): Promise<boolean> {
  try {
    await run(FINDING_NO_UNIQUE_INDEX_SQL)
    return true
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    log.error(
      `[boot] five_s_findings.finding_no tekillik indeksi kurulamadı: ${why}. ` +
        'Aynı numarayı taşıyan bir bulgu kalmış olabilir; düzelene kadar veritabanı tekrar eden numarayı engellemez.'
    )
    return false
  }
}
