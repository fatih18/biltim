import { describe, expect, it } from 'bun:test'
import { mayRaiseSingleFinding, mayStartOwnLocation, seesEveryPlan } from './planAccess'

const GODMIN_ROLE = ['godmin']
const MERKEZ = ['Content Manager Core Team']
const SUPER_ADMIN = ['Super Admin']
const MUDUR = ['Manager']
const AUDITOR = ['Auditor']
const FIELD_MANAGER = ['Field Manager']

describe('the godmin is accepted wherever Merkez Ekip is (R27)', () => {
  it('through the is_god flag alone, with no role at all', () => {
    expect(mayRaiseSingleFinding([], true)).toBe(true)
    expect(seesEveryPlan([], true)).toBe(true)
    expect(mayStartOwnLocation([], true)).toBe(true)
  })

  it('through the godmin role alone, without the flag', () => {
    expect(mayRaiseSingleFinding(GODMIN_ROLE, false)).toBe(true)
    expect(seesEveryPlan(GODMIN_ROLE, false)).toBe(true)
    expect(mayStartOwnLocation(GODMIN_ROLE, false)).toBe(true)
  })

  it('through the flag on an account whose only listed role is something else', () => {
    expect(mayRaiseSingleFinding(FIELD_MANAGER, true)).toBe(true)
    expect(mayStartOwnLocation(AUDITOR, true)).toBe(true)
  })

  it('does the same for the godmin as for Merkez Ekip, rule by rule', () => {
    for (const rule of [mayRaiseSingleFinding, seesEveryPlan, mayStartOwnLocation]) {
      expect(rule(GODMIN_ROLE, true)).toBe(rule(MERKEZ, false))
    }
  })
})

describe('everyone else keeps their own limits', () => {
  it('Super Admin and Merkez Ekip may do all three', () => {
    for (const roles of [MERKEZ, SUPER_ADMIN]) {
      expect(mayRaiseSingleFinding(roles, false)).toBe(true)
      expect(seesEveryPlan(roles, false)).toBe(true)
      expect(mayStartOwnLocation(roles, false)).toBe(true)
    }
  })

  it('Müdür raises findings and sees every plan, but is held to #27', () => {
    expect(mayRaiseSingleFinding(MUDUR, false)).toBe(true)
    expect(seesEveryPlan(MUDUR, false)).toBe(true)
    expect(mayStartOwnLocation(MUDUR, false)).toBe(false)
  })

  it('an auditor raises findings but sees only their own team and is held to #27', () => {
    expect(mayRaiseSingleFinding(AUDITOR, false)).toBe(true)
    expect(seesEveryPlan(AUDITOR, false)).toBe(false)
    expect(mayStartOwnLocation(AUDITOR, false)).toBe(false)
  })

  it('a field manager alone raises nothing here and sees nothing extra', () => {
    expect(mayRaiseSingleFinding(FIELD_MANAGER, false)).toBe(false)
    expect(seesEveryPlan(FIELD_MANAGER, false)).toBe(false)
    expect(mayStartOwnLocation(FIELD_MANAGER, false)).toBe(false)
  })

  it('reads role names with the spelling the database uses', () => {
    expect(seesEveryPlan(['  content   manager core team '], false)).toBe(true)
    expect(seesEveryPlan([''], false)).toBe(false)
  })
})
