import { describe, expect, it } from 'bun:test'
import { roleIdsNamed, userIdsForRoles } from './index'

describe('roleIdsNamed', () => {
  const roller = [
    { id: 'r1', name: 'Manager', alias: 'Müdür' },
    { id: 'r2', name: 'Auditor', alias: 'Denetçi' },
    { id: 'r3', name: 'Field Manager', alias: 'Saha Sorumlusu' },
  ]

  it('adına göre bulur', () => {
    expect(roleIdsNamed(roller, 'Manager')).toEqual(['r1'])
  })

  it('takma adına göre de bulur', () => {
    expect(roleIdsNamed(roller, 'Müdür')).toEqual(['r1'])
  })

  it('büyük/küçük harf ve boşluk aramaz', () => {
    expect(roleIdsNamed(roller, '  mANAGER ')).toEqual(['r1'])
  })

  it('"Manager" ararken "Field Manager"ı getirmez', () => {
    expect(roleIdsNamed(roller, 'Manager')).not.toContain('r3')
  })

  it('olmayan rol için boş döner — ekran da boş liste gösterir', () => {
    expect(roleIdsNamed(roller, 'Yok Böyle Bir Rol')).toEqual([])
  })
})

describe('userIdsForRoles', () => {
  const atamalar = [
    { user_id: 'u1', role_id: 'r1' },
    { userId: 'u2', roleId: 'r1' },
    { user_id: 'u3', role_id: 'r2' },
    { user_id: 'u1', role_id: 'r2' },
  ]

  it('iki yazımı da okur (camelCase ve snake_case ikizleri)', () => {
    expect(userIdsForRoles(atamalar, ['r1']).sort()).toEqual(['u1', 'u2'])
  })

  it('aynı kullanıcıyı iki kez döndürmez', () => {
    expect(userIdsForRoles(atamalar, ['r1', 'r2'])).toEqual(['u1', 'u2', 'u3'])
  })

  it('eşleşme yoksa boş', () => {
    expect(userIdsForRoles(atamalar, ['r9'])).toEqual([])
  })
})
