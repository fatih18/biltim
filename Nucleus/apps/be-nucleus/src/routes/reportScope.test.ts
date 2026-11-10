import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { fieldManagerScope, inManagedLocations, scoped } from './reportScope'

type World = {
  user?: Row | null
  roles?: string[]
  /** The location rows the caller field-manages. */
  managed?: Row[]
  locations?: Row[]
  findings?: Row[]
  audits?: Row[]
}

/** A stand-in for the pool: answers by what the SQL reads, and records the questions. */
function pool(world: World) {
  const asked: string[] = []
  const read = async (text: string): Promise<Row[]> => {
    asked.push(text)
    if (text.includes('from main.users')) return world.user === null ? [] : [world.user ?? { is_god: false }]
    if (text.includes('from main.user_roles')) return (world.roles ?? []).map((name) => ({ name }))
    if (text.includes('field_manager_user_ids')) return world.managed ?? []
    if (text.includes('from five_s_locations')) return world.locations ?? []
    if (text.includes('from five_s_findings')) return world.findings ?? []
    if (text.includes('from five_s_audits')) return world.audits ?? []
    throw new Error(`unexpected query: ${text.slice(0, 40)}`)
  }
  return { read, asked }
}

const asUser = (userId?: string) => new Request('http://api/reports/findings.xlsx', { headers: userId ? { 'x-user-id': userId } : {} })

describe('inManagedLocations / scoped', () => {
  it('compares the column with a text[] parameter, never with lower(trim())', () => {
    expect(inManagedLocations('f.location_name', 3)).toBe(' AND f.location_name = ANY($3::text[])')
  })

  it('adds nothing when the caller is not narrowed', () => {
    const s = scoped(null, ['2026-01-01'])
    expect(s.on('f.location_name')).toBe('')
    expect(s.params).toEqual(['2026-01-01'])
  })

  it('numbers the spellings after the parameters already there, for every column that uses them', () => {
    const s = scoped(['Bölge 3', 'BÖLGE  3'], ['2026-01-01', '2026-12-31'])
    expect(s.params).toEqual(['2026-01-01', '2026-12-31', ['Bölge 3', 'BÖLGE  3']])
    expect(s.on('f.location_name')).toBe(' AND f.location_name = ANY($3::text[])')
    expect(s.on('a.department_name')).toBe(' AND a.department_name = ANY($3::text[])')
  })

  it('matches nothing, not everything, for a manager of no place', () => {
    const s = scoped([], [])
    expect(s.params).toEqual([[]])
    expect(s.on('l.name')).toContain('ANY($1::text[])')
  })
})

describe('fieldManagerScope', () => {
  it('finds the spellings a field manager’s places carry in findings and audits, odd ones included', async () => {
    const { read } = pool({
      roles: ['Field Manager'],
      managed: [{ name: 'ISI MERKEZİ' }],
      locations: [{ name: 'ISI MERKEZİ' }, { name: 'Pres' }],
      findings: [{ name: 'Isı\u00A0Merkezi' }, { name: 'ısı merkezi' }, { name: 'Pres' }, { name: null }],
      audits: [{ name: 'Isı  Merkezi' }, { name: 'ISI MERKEZİ' }, { name: 'Bölge 3' }],
    })
    const scope = await fieldManagerScope(asUser('u-1'), read)
    expect(scope?.userId).toBe('u-1')
    // lower(trim()) in SQL kept out the no-break space and the double space; the key does not.
    expect(scope?.spellings).toEqual(['ISI MERKEZİ', 'Isı\u00A0Merkezi', 'ısı merkezi', 'Isı  Merkezi'])
  })

  it('matches a place with the capital İ however it is capitalised', async () => {
    const { read } = pool({
      roles: ['Field Manager'],
      managed: [{ name: 'İdari İşler' }],
      locations: [{ name: 'İdari İşler' }],
      findings: [{ name: 'İDARİ İŞLER' }, { name: 'idari işler' }, { name: 'Idari İşler' }, { name: 'Pres' }],
    })
    expect((await fieldManagerScope(asUser('u-1'), read))?.spellings).toEqual([
      'İdari İşler',
      'İDARİ İŞLER',
      'idari işler',
      'Idari İşler',
    ])
  })

  it('keeps places that only look alike apart', async () => {
    const { read } = pool({
      roles: ['Field Manager'],
      managed: [{ name: 'Bölge 3' }],
      locations: [{ name: 'Bölge 3' }, { name: 'Bölge 31' }],
      findings: [{ name: 'Bölge 31' }, { name: 'Bölge 3 Pres' }, { name: 'BÖLGE 3' }],
    })
    expect((await fieldManagerScope(asUser('u-1'), read))?.spellings).toEqual(['Bölge 3', 'BÖLGE 3'])
  })

  it('is empty, and reads no spellings, for a field manager of no place', async () => {
    const { read, asked } = pool({ roles: ['Field Manager'], managed: [], findings: [{ name: 'Pres' }] })
    expect((await fieldManagerScope(asUser('u-1'), read))?.spellings).toEqual([])
    expect(asked.some((q) => q.includes('five_s_findings'))).toBe(false)
  })

  it('does not narrow Merkez Ekip, Super Admin, Müdür or godmin, even when they are also field managers', async () => {
    for (const roles of [['Content Manager Core Team'], ['Super Admin'], ['Manager', 'Field Manager']]) {
      expect(await fieldManagerScope(asUser('u-1'), pool({ roles }).read)).toBe(null)
    }
    expect(await fieldManagerScope(asUser('u-1'), pool({ user: { is_god: true }, roles: ['Field Manager'] }).read)).toBe(null)
  })

  it('does not narrow someone who is not a field manager, or a caller it cannot name', async () => {
    expect(await fieldManagerScope(asUser('u-1'), pool({ roles: ['Auditor'] }).read)).toBe(null)
    expect(await fieldManagerScope(asUser(), pool({ roles: ['Field Manager'] }).read)).toBe(null)
    expect(await fieldManagerScope(asUser('gone'), pool({ user: null }).read)).toBe(null)
  })
})
