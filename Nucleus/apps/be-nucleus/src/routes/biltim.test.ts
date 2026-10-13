import { describe, expect, it } from 'bun:test'
import type { Caller } from '../guards/caller'
import { canonicalUserId, highestRank, isSameUser, mayAssignRole, mayTarget, roleRank } from './biltim'

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const GOD_FLAG_ONLY: Caller = { userId: 'u-god2', isGod: true, roles: [] }
const SUPER: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const MANAGER: Caller = { userId: 'u-m', isGod: false, roles: ['manager'] }
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }

describe('roleRank', () => {
  it('ranks godmin > Super Admin > Merkez Ekip > the plant roles', () => {
    expect(roleRank('godmin')).toBeGreaterThan(roleRank('super admin'))
    expect(roleRank('super admin')).toBeGreaterThan(roleRank('content manager core team'))
    for (const plant of ['manager', 'field manager', 'auditor', 'something new']) {
      expect(roleRank(plant)).toBeLessThan(roleRank('content manager core team'))
    }
  })

  it('reads role names the way the roles table spells them', () => {
    // main.roles holds "Super Admin"; Caller.roles holds "super admin".
    expect(roleRank('Super Admin')).toBe(roleRank('super admin'))
    expect(roleRank('  Content Manager Core Team ')).toBe(roleRank('content manager core team'))
  })

  it('takes the highest of several roles, and the godmin flag alone', () => {
    expect(highestRank({ isGod: false, roles: ['auditor', 'super admin'] })).toBe(roleRank('super admin'))
    expect(highestRank(GOD_FLAG_ONLY)).toBe(roleRank('godmin'))
    expect(highestRank({ isGod: false, roles: [] })).toBe(0)
  })
})

describe('mayAssignRole', () => {
  it('lets Merkez Ekip hand out their own role and the ones below, nothing above', () => {
    expect(mayAssignRole(CENTRAL, 'Content Manager Core Team')).toBe(true)
    expect(mayAssignRole(CENTRAL, 'Auditor')).toBe(true)
    expect(mayAssignRole(CENTRAL, 'Field Manager')).toBe(true)
    expect(mayAssignRole(CENTRAL, 'Manager')).toBe(true)
    // The escalation this exists for: a new account WITH the Super Admin role.
    expect(mayAssignRole(CENTRAL, 'Super Admin')).toBe(false)
    expect(mayAssignRole(CENTRAL, 'godmin')).toBe(false)
  })

  it('lets a Super Admin hand out Super Admin but never godmin', () => {
    expect(mayAssignRole(SUPER, 'Super Admin')).toBe(true)
    expect(mayAssignRole(SUPER, 'Content Manager Core Team')).toBe(true)
    expect(mayAssignRole(SUPER, 'godmin')).toBe(false)
  })

  it('lets the godmin hand out anything', () => {
    expect(mayAssignRole(GOD, 'godmin')).toBe(true)
    expect(mayAssignRole(GOD_FLAG_ONLY, 'Super Admin')).toBe(true)
  })

  it('lets a plant role hand out only what it holds or what ranks below it', () => {
    expect(mayAssignRole(MANAGER, 'Manager')).toBe(true)
    expect(mayAssignRole(MANAGER, 'Auditor')).toBe(false)
    expect(mayAssignRole(MANAGER, 'Content Manager Core Team')).toBe(false)
  })
})

describe('mayTarget', () => {
  const account = (roles: string[], isGod = false) => ({ isGod, roles })

  it('keeps Merkez Ekip off Super Admin and godmin accounts', () => {
    expect(mayTarget(CENTRAL, account(['super admin']))).toBe(false)
    expect(mayTarget(CENTRAL, account(['auditor', 'super admin']))).toBe(false)
    expect(mayTarget(CENTRAL, account(['godmin'], true))).toBe(false)
    expect(mayTarget(CENTRAL, account([], true))).toBe(false)
  })

  it('lets Merkez Ekip manage peers and the plant roles', () => {
    expect(mayTarget(CENTRAL, account(['content manager core team']))).toBe(true)
    expect(mayTarget(CENTRAL, account(['auditor']))).toBe(true)
    expect(mayTarget(CENTRAL, account(['field manager', 'manager']))).toBe(true)
    expect(mayTarget(CENTRAL, account([]))).toBe(true)
  })

  it('lets a Super Admin manage Super Admins but not the godmin', () => {
    expect(mayTarget(SUPER, account(['super admin']))).toBe(true)
    expect(mayTarget(SUPER, account(['content manager core team']))).toBe(true)
    expect(mayTarget(SUPER, account(['godmin', 'super admin'], true))).toBe(false)
  })

  it('lets the godmin manage anyone', () => {
    expect(mayTarget(GOD, account(['godmin'], true))).toBe(true)
    expect(mayTarget(GOD, account(['super admin']))).toBe(true)
  })

  it('never lets a plant role reach Merkez Ekip', () => {
    expect(mayTarget(AUDITOR, account(['content manager core team']))).toBe(false)
    expect(mayTarget(FIELD_MANAGER, account(['super admin']))).toBe(false)
  })
})

describe('isSameUser', () => {
  const OWN = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'

  it('sees the caller behind padding, capitals, braces or missing hyphens', () => {
    // The bypass: " <own id>" passed a raw === and targetOf then trimmed it.
    expect(isSameUser(` ${OWN}`, OWN)).toBe(true)
    expect(isSameUser(`${OWN}\n`, OWN)).toBe(true)
    expect(isSameUser(OWN.toUpperCase(), OWN)).toBe(true)
    expect(isSameUser(`{${OWN}}`, OWN)).toBe(true)
    expect(isSameUser(OWN.replace(/-/g, ''), OWN)).toBe(true)
  })

  it('keeps two different accounts apart', () => {
    expect(isSameUser('6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c7', OWN)).toBe(false)
    expect(isSameUser('', OWN)).toBe(false)
    expect(isSameUser(undefined, undefined)).toBe(false)
    expect(isSameUser('   ', '')).toBe(false)
  })

  it('prints a uuid the way Postgres does, and leaves anything else trimmed', () => {
    expect(canonicalUserId(`  {${OWN.toUpperCase().replace(/-/g, '')}} `)).toBe(OWN)
    expect(canonicalUserId(' U-1 ')).toBe('u-1')
  })
})
