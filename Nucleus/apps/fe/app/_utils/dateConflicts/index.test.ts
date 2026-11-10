import { describe, expect, it } from 'bun:test'
import { findDateConflicts, toDayKey, type ConflictPlan, type ConflictWorld } from './index'

/*
 * Two teams share one auditor (Ayşe is in both), a third team is led by the
 * first team's leader, and two locations share one field manager.
 */
const NAMES = new Map([
  ['u-lider', 'Leyla Lider'],
  ['u-ayse', 'Ayşe Denetçi'],
  ['u-can', 'Can Denetçi'],
  ['u-bora', 'Bora Denetçi'],
  ['u-saha', 'Sema Saha'],
])

const plan = (id: string, over: Partial<ConflictPlan> = {}): ConflictPlan => ({
  id,
  plannedDate: '2026-11-10',
  locationId: 'loc-a',
  teamId: 'team-1',
  status: 'planned',
  ...over,
})

const world = (plans: ConflictPlan[], over: Partial<ConflictWorld> = {}): ConflictWorld => ({
  plans,
  teams: [
    { id: 'team-1', name: 'Mavi Ekip', leaderUserId: 'u-lider' },
    { id: 'team-2', name: 'Kırmızı Ekip', leaderUserId: 'u-bora' },
    { id: 'team-3', name: 'Yeşil Ekip', leaderUserId: 'u-lider' },
  ],
  locations: [
    { id: 'loc-a', name: 'Haddehane', fieldManagerUserIds: ['u-saha'] },
    { id: 'loc-b', name: 'Çelikhane', fieldManagerUserIds: ['u-saha'] },
    { id: 'loc-c', name: 'Bakım Atölyesi', fieldManagerUserIds: [] },
  ],
  members: [
    { teamId: 'team-1', userId: 'u-ayse' },
    { teamId: 'team-1', userId: 'u-can' },
    { teamId: 'team-2', userId: 'u-ayse' },
  ],
  userNames: NAMES,
  ...over,
})

describe('toDayKey', () => {
  it('keeps a plain day as it is', () => {
    expect(toDayKey('2026-11-10')).toBe('2026-11-10')
  })

  it('reads a local-midnight timestamp as that local day', () => {
    // The zone the test runs in does not matter: the instant is built in it.
    expect(toDayKey(new Date(2026, 10, 10).toISOString())).toBe('2026-11-10')
  })

  it('answers empty for nothing and for nonsense', () => {
    for (const value of [null, undefined, '', 'yarın', '2026-13-45x']) {
      expect(toDayKey(value)).toBe('')
    }
  })
})

describe('findDateConflicts', () => {
  it('says nothing without a day or without a team', () => {
    const w = world([plan('p1')])
    expect(findDateConflicts(w, { date: '', teamId: 'team-1' })).toEqual([])
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: '' })).toEqual([])
    expect(findDateConflicts(w, { date: null, teamId: undefined })).toEqual([])
  })

  it('says nothing when no other plan falls on that day', () => {
    const w = world([plan('p1', { plannedDate: '2026-11-11' })])
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1', locationId: 'loc-c' })).toEqual([])
  })

  it('names the team and where it already is when the same team is booked', () => {
    const w = world([plan('p1')])
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })
    expect(warnings).toEqual(['"Mavi Ekip" ekibi bu tarihte "Haddehane" denetiminde görevli.'])
  })

  it('names the auditor who sits on both teams, and where the other audit is (R28)', () => {
    // Team 2 is on the audit; team 1 is being booked. Ayşe is in both.
    const w = world([plan('p1', { teamId: 'team-2', locationId: 'loc-c' })])
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })
    expect(warnings).toEqual(['Denetçi (Ayşe Denetçi) bu tarihte "Bakım Atölyesi" denetiminde de görevli.'])
  })

  it('needs no location to find the auditor clash', () => {
    const w = world([plan('p1', { teamId: 'team-2' })])
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1', locationId: '' })).toHaveLength(1)
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1', locationId: undefined })).toHaveLength(1)
  })

  it('does not count a member marked inactive', () => {
    const w = world([plan('p1', { teamId: 'team-2', locationId: 'loc-c' })], {
      members: [
        { teamId: 'team-1', userId: 'u-ayse' },
        { teamId: 'team-2', userId: 'u-ayse', isActive: false },
      ],
    })
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })).toEqual([])
  })

  it('names the leader who leads a different team that is booked', () => {
    // Team 3 shares team 1's leader and is on an audit that day.
    const w = world([plan('p1', { teamId: 'team-3', locationId: 'loc-c' })])
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })
    expect(warnings).toEqual(['Ekip lideri (Leyla Lider) bu tarihte "Bakım Atölyesi" denetiminde (Yeşil Ekip) görevli.'])
  })

  it('names a leader who is only a member of the other team', () => {
    // Team 1's leader sits on team 2: no leader warning fires, so the auditor one must.
    const w = world([plan('p1', { teamId: 'team-2', locationId: 'loc-c' })], {
      members: [{ teamId: 'team-2', userId: 'u-lider' }],
    })
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })).toEqual([
      'Denetçi (Leyla Lider) bu tarihte "Bakım Atölyesi" denetiminde de görevli.',
    ])
  })

  it('does not name the shared leader twice', () => {
    const w = world([plan('p1', { teamId: 'team-3', locationId: 'loc-c' })], {
      members: [
        { teamId: 'team-1', userId: 'u-can' },
        { teamId: 'team-3', userId: 'u-can' },
      ],
    })
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })
    expect(warnings.some((text) => text.startsWith('Ekip lideri'))).toBe(true)
    expect(warnings.some((text) => text.includes('Leyla Lider') && text.startsWith('Denetçi'))).toBe(false)
    // The member they share (Can) is still named.
    expect(warnings.some((text) => text.startsWith('Denetçi (Can Denetçi)'))).toBe(true)
  })

  it('names the field manager who is at another location that day', () => {
    // Different team with nobody in common; Sema Saha manages both locations.
    const w = world([plan('p1', { teamId: 'team-3', locationId: 'loc-b' })], {
      teams: [
        { id: 'team-1', name: 'Mavi Ekip', leaderUserId: 'u-lider' },
        { id: 'team-3', name: 'Yeşil Ekip', leaderUserId: 'u-bora' },
      ],
      members: [],
    })
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1', locationId: 'loc-a' })
    expect(warnings).toEqual(['Saha sorumlusu (Sema Saha) bu tarihte "Çelikhane" denetiminde görevli.'])
  })

  it('never clashes a plan with itself, and ignores cancelled plans', () => {
    const w = world([plan('p1'), plan('p2', { status: 'cancelled' })])
    expect(findDateConflicts(w, { planId: 'p1', date: '2026-11-10', teamId: 'team-1' })).toEqual([])
  })

  it('counts a plan that is waiting for approval or already approved', () => {
    for (const status of ['pending_approval', 'completed']) {
      const w = world([plan('p1', { status })])
      expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })).toHaveLength(1)
    }
  })

  it('compares days, not strings: a timestamp plan date still lands on its day', () => {
    const w = world([plan('p1', { plannedDate: new Date(2026, 10, 10).toISOString() })])
    expect(findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })).toHaveLength(1)
  })

  it('lists a sentence that repeats only once', () => {
    const w = world([
      plan('p1', { teamId: 'team-2', locationId: 'loc-b' }),
      plan('p2', { teamId: 'team-2', locationId: 'loc-b' }),
      plan('p3', { teamId: 'team-2', locationId: 'loc-c' }),
    ])
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1', locationId: 'loc-a' })
    expect(warnings.filter((text) => text.includes('"Çelikhane"'))).toHaveLength(2) // auditor + field manager
    expect(warnings.filter((text) => text.includes('"Bakım Atölyesi"'))).toHaveLength(1)
    expect(new Set(warnings).size).toBe(warnings.length)
  })

  it('says who and where in plain words when a name is missing', () => {
    const w = world([plan('p1', { teamId: 'team-2', locationId: 'silinmis' })], { userNames: new Map() })
    const warnings = findDateConflicts(w, { date: '2026-11-10', teamId: 'team-1' })
    expect(warnings).toEqual(['Denetçi (bilinmeyen kullanıcı) bu tarihte "bilinmeyen lokasyon" denetiminde de görevli.'])
  })
})
