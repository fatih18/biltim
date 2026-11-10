import { type Row, query } from '../db'

/**
 * Which rows belong to a location, when the link between them is TEXT.
 *
 * A finding names its place in `location_name`, an audit in `department_name`;
 * neither is a foreign key (domain tables have none). The reports used to
 * compare them in SQL with lower(trim(..)), which Postgres does ASCII-wise:
 * a name pasted from Excel with a non-breaking space, typed with two spaces,
 * or with "ı" where the list has "I" dropped every row of that spelling from
 * the export — "lokasyon yok" on a form that should have had a year of
 * findings. Both sides now fold through `locationKey`.
 *
 * The match is done on the DISTINCT stored spellings, in JS, and the SQL that
 * follows uses the spellings it found with `= any(...)`: one cheap query,
 * and the same fold on every machine whatever the database's collation.
 */

export type Read = typeof query
type Text = string | null | undefined

/** A row's `name` column as text; '' when empty. */
export const nameOf = (row: Row): string => String(row.name ?? '')

/**
 * Turkish lower case, trimmed: İ→i, I→ı. Comparison only, never shown.
 * (The same fold as the screens' `foldTr` in fe/app/_utils/textSearch.)
 */
export function foldTr(value: Text): string {
  return (value ?? '').toLocaleLowerCase('tr').trim()
}

/**
 * One key per place: Unicode composed, zero-width marks dropped, every run of
 * white space (non-breaking included) one space, Turkish-folded, and the
 * dotted and dotless i the same letter — a place is not two places for one dot.
 */
export function locationKey(value: Text): string {
  return foldTr(
    (value ?? '')
      .normalize('NFC')
      .replace(/[​-‍⁠﻿̇]/g, '')
      .replace(/\s+/g, ' ')
  ).replace(/ı/g, 'i')
}

export function sameLocation(a: Text, b: Text): boolean {
  const key = locationKey(a)
  return key !== '' && key === locationKey(b)
}

/** The stored spellings, as written, that name the same place as `wanted`. */
export function spellingsOf(stored: Iterable<Text>, wanted: string): string[] {
  const out: string[] = []
  for (const text of stored) {
    if (text && sameLocation(text, wanted) && !out.includes(text)) out.push(text)
  }
  return out
}

/** A name as the plant would write it: one space between words, none at the ends. */
export const cleanName = (value: Text): string => (value ?? '').replace(/\s+/g, ' ').trim()

/** Finding spellings of `wanted`, over every active finding (the register has no year). */
export async function findingSpellings(wanted: string, read: Read = query): Promise<string[]> {
  const rows = await read('select distinct location_name as name from five_s_findings where is_active = true')
  return spellingsOf(rows.map(nameOf), wanted)
}

export type PlaceInYear = {
  /** The location's name as the list shows it; the asked name when no location carries it. */
  name: string
  /** Every five_s_locations row (active or not) of this place. */
  ids: string[]
  findingNames: string[]
  auditNames: string[]
}

/**
 * The place a location form is about, in one year: its location rows, and the
 * spellings that findings and audits of that year used for it. `ids` also
 * link audits that were planned on the location whatever name they were typed
 * with, and so follow a rename.
 */
export async function placeInYear(
  wanted: string,
  year: { from: string; to: string },
  read: Read = query
): Promise<PlaceInYear> {
  const [locations, findings, audits] = await Promise.all([
    read('select id::text as id, name, is_active from five_s_locations order by is_active desc nulls last, name'),
    read(
      `select distinct location_name as name from five_s_findings
        where is_active = true and detected_date between $1 and $2`,
      [year.from, year.to]
    ),
    read(
      `select distinct department_name as name from five_s_audits
        where is_active = true and audit_date >= $1 and audit_date < ($2::date + 1)`,
      [year.from, year.to]
    ),
  ])
  const own = locations.filter((l) => sameLocation(nameOf(l), wanted))
  return {
    name: cleanName(own[0] ? nameOf(own[0]) : wanted),
    ids: own.map((l) => String(l.id)),
    findingNames: spellingsOf(findings.map(nameOf), wanted),
    auditNames: spellingsOf(audits.map(nameOf), wanted),
  }
}
