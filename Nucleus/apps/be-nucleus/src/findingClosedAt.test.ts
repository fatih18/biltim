import { describe, expect, it } from 'bun:test'
import type { Row } from './db'
import {
  FINDING_CLOSED_AT_BACKFILL_SQL,
  FINDING_CLOSED_AT_STATEMENTS,
  backfillFindingClosedAt,
  installFindingClosedAt,
} from './findingClosedAt'

/** The constant the boot installs, checked as text: no database is available here. */

/** A statement with its dollar-quoted body removed, so a `;` inside a function body is not counted. */
const outsideDollarQuotes = (statement: string) => statement.replace(/\$\$[\s\S]*?\$\$/g, '')

describe('the closing-date trigger installed at boot', () => {
  const [createFunction = '', dropTrigger = '', createTrigger = ''] = FINDING_CLOSED_AT_STATEMENTS

  it('is the function, then the dropped trigger, then the trigger: three statements, in that order', () => {
    expect(FINDING_CLOSED_AT_STATEMENTS).toHaveLength(3)
    expect(createFunction).toStartWith('create or replace function main.five_s_stamp_closed_at()')
    expect(dropTrigger).toBe('drop trigger if exists five_s_findings_closed_at on main.five_s_findings')
    expect(createTrigger).toStartWith('create trigger five_s_findings_closed_at')
  })

  it('can be repeated on every start: replace, drop-if-exists, create', () => {
    expect(createFunction).toContain('create or replace function')
    expect(dropTrigger).toContain('drop trigger if exists')
    expect(createTrigger).not.toContain('if not exists')
  })

  it('holds one statement per entry, so a helper that sends one statement per call can run it', () => {
    for (const statement of FINDING_CLOSED_AT_STATEMENTS) {
      expect(outsideDollarQuotes(statement)).not.toContain(';')
      expect(statement.trim()).toBe(statement)
    }
  })

  it('fires before an insert or an update of status or completed_at, for each row', () => {
    expect(createTrigger).toContain('before insert or update of status, completed_at on main.five_s_findings')
    expect(createTrigger).toContain('for each row')
    expect(createTrigger).toContain('execute function main.five_s_stamp_closed_at()')
  })

  it('stamps only a closed finding that has no date, on the plant calendar, and clears the date of one that is not closed', () => {
    expect(createFunction).toContain("if new.status = 'closed' then")
    expect(createFunction).toContain('if new.completed_at is null then')
    expect(createFunction).toContain('(now() at time zone tz)::date')
    expect(createFunction).toContain("current_setting('biltim.local_tz', true), 'Europe/Istanbul'")
    expect(createFunction).toContain('new.completed_at := null')
    expect(createFunction).not.toContain('now()::date')
  })

  it('is sent through the transaction helper one statement at a time, in order', async () => {
    const sent: string[] = []
    await installFindingClosedAt(async (text) => {
      sent.push(text)
      return []
    })
    expect(sent).toEqual([...FINDING_CLOSED_AT_STATEMENTS])
  })

  it('stops at the first failing statement and lets the caller roll back', async () => {
    const sent: string[] = []
    await expect(
      installFindingClosedAt(async (text) => {
        sent.push(text)
        if (text.startsWith('drop trigger')) throw new Error('lock timeout')
        return []
      })
    ).rejects.toThrow('lock timeout')
    expect(sent).toHaveLength(2)
  })
})

describe('the back-fill of findings closed before the trigger', () => {
  it('touches only closed findings that still have no date, and only with the audit log as evidence', () => {
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain("a.new_values->>'status' = 'closed'")
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain("f.status = 'closed'")
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain('f.completed_at is null')
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain('f.id = sub.entity_id')
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain('returning f.id')
  })

  it('reads the audit log only for the findings still waiting, never in full', () => {
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain(
      "a.entity_id in (select w.id from main.five_s_findings w where w.status = 'closed' and w.completed_at is null)"
    )
  })

  it('reads the log time as UTC before moving it to the plant calendar', () => {
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain("(a.created_at at time zone 'UTC')")
    expect(FINDING_CLOSED_AT_BACKFILL_SQL).toContain("coalesce(current_setting('biltim.local_tz', true), 'Europe/Istanbul')")
  })

  it('reports how many findings it stamped', async () => {
    const rows: Row[] = [{ id: 'f1' }, { id: 'f2' }]
    expect(await backfillFindingClosedAt(async () => rows)).toBe(2)
    expect(await backfillFindingClosedAt(async () => [])).toBe(0)
  })
})
