import { describe, expect, it } from 'bun:test'
import {
  SYSTEM_ACTOR_ID,
  actorLabel,
  entityLabel,
  eventSentence,
  normalizeEntityKey,
  operationLabel,
  operationTone,
  relativeTime,
} from './index'

const users = new Map([
  ['u1', { name: 'Ayşe Yılmaz', email: 'ayse@ornek.com' }],
  ['u2', { name: '', email: 'sadece-eposta@ornek.com' }],
])

describe('actorLabel', () => {
  it('says Sistem for the zero uuid, which is most rows', () => {
    // 640 of 927 rows in the local database carry this id.
    expect(actorLabel(SYSTEM_ACTOR_ID, users)).toEqual({ text: 'Sistem', isPerson: false })
  })

  it('says Sistem for a missing actor too', () => {
    expect(actorLabel(null, users).text).toBe('Sistem')
    expect(actorLabel(undefined, users).text).toBe('Sistem')
  })

  it('prefers the name, falls back to the email', () => {
    expect(actorLabel('u1', users).text).toBe('Ayşe Yılmaz')
    expect(actorLabel('u2', users).text).toBe('sadece-eposta@ornek.com')
  })

  it('names a deleted user instead of printing its id', () => {
    // 10 rows point at a user that no longer exists.
    const label = actorLabel('yok-artik', users)
    expect(label.text).toBe('Silinmiş kullanıcı')
    expect(label.isPerson).toBe(false)
    expect(label.title).toBe('yok-artik')
  })

  it('never puts a raw id in the visible text', () => {
    for (const id of [SYSTEM_ACTOR_ID, 'yok-artik', 'u1', null]) {
      expect(actorLabel(id, users).text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/)
    }
  })
})

describe('operationLabel', () => {
  it('covers every operation the database actually holds', () => {
    // From: select distinct operation_type from main.audit_logs
    for (const op of ['INSERT', 'GET', 'LOGIN', 'LOGIN_FAILED', 'UPDATE', 'CREATE', 'DELETE', 'LOGOUT']) {
      const label = operationLabel(op)
      expect(label).not.toBe(op)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('reads INSERT and CREATE the same way, because two writers mean the same thing', () => {
    expect(operationLabel('INSERT')).toBe(operationLabel('CREATE'))
  })

  it('degrades an unknown operation to words rather than showing nothing', () => {
    expect(operationLabel('SOME_NEW_THING')).toBe('some new thing')
    expect(operationLabel('')).toBe('işlem yaptı')
  })

  it('groups operations by what they did', () => {
    expect(operationTone('INSERT')).toBe('create')
    expect(operationTone('UPDATE')).toBe('update')
    expect(operationTone('DELETE')).toBe('delete')
    expect(operationTone('LOGIN_FAILED')).toBe('auth')
    expect(operationTone('GET')).toBe('read')
  })
})

describe('entityLabel', () => {
  it('folds all four naming conventions the writers produce', () => {
    // Live values: RoleClaims, users, Claims, five_s_findings, fiveSLocations, auth
    expect(normalizeEntityKey('RoleClaims')).toBe('role_claims')
    expect(normalizeEntityKey('fiveSLocations')).toBe('five_s_locations')
    expect(normalizeEntityKey('five_s_findings')).toBe('five_s_findings')
    expect(normalizeEntityKey('auth')).toBe('auth')
  })

  it('gives the same label whichever convention arrived', () => {
    expect(entityLabel('fiveSLocations')).toBe('Lokasyon')
    expect(entityLabel('five_s_locations')).toBe('Lokasyon')
    expect(entityLabel('RoleClaims')).toBe('Rol yetkisi')
  })

  it('labels the URL segments the auth middleware writes, which are not tables', () => {
    expect(entityLabel('auth')).toBe('Kimlik doğrulama')
    expect(entityLabel('reports')).toBe('Rapor')
  })

  it('turns an unmapped table into words instead of an identifier', () => {
    expect(entityLabel('some_new_table')).toBe('Some new table')
    expect(entityLabel('')).toBe('Bilinmeyen')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-09-08T16:00:00Z')
  it('reads as elapsed time', () => {
    expect(relativeTime('2026-09-08T15:59:30Z', now)).toBe('az önce')
    expect(relativeTime('2026-09-08T15:45:00Z', now)).toBe('15 dakika önce')
    expect(relativeTime('2026-09-08T13:00:00Z', now)).toBe('3 saat önce')
    expect(relativeTime('2026-09-05T16:00:00Z', now)).toBe('3 gün önce')
  })

  it('does not print a negative age for a clock that is ahead', () => {
    expect(relativeTime('2026-09-08T16:05:00Z', now)).toBe('az sonra')
  })

  it('survives a missing or unparseable stamp', () => {
    expect(relativeTime(null, now)).toBe('-')
    expect(relativeTime('bozuk', now)).toBe('-')
  })
})

describe('eventSentence', () => {
  it('says who did what to which thing', () => {
    expect(eventSentence(actorLabel('u1', users), 'UPDATE', 'five_s_audit_plans')).toBe(
      'Ayşe Yılmaz güncelledi · Denetim planı'
    )
    expect(eventSentence(actorLabel(SYSTEM_ACTOR_ID, users), 'INSERT', 'RoleClaims')).toBe(
      'Sistem ekledi · Rol yetkisi'
    )
  })
})
