import { describe, expect, it } from 'bun:test'
import { atUtcMidnight, auditDateFor } from './index'

describe('auditDateFor', () => {
  const bugun = '2026-09-08'

  it('ileri tarihli planı bugüne çeker', () => {
    expect(auditDateFor('2026-12-05', bugun, bugun)).toBe(bugun)
  })

  it('geçmiş plan tarihini korur — geciken denetim o güne yazılır', () => {
    expect(auditDateFor('2026-08-01', bugun, bugun)).toBe('2026-08-01')
  })

  it('bugüne planlanmışı olduğu gibi bırakır', () => {
    expect(auditDateFor(bugun, bugun, bugun)).toBe(bugun)
  })

  it('planın tarihi yoksa formdakini kullanır', () => {
    expect(auditDateFor(undefined, bugun, bugun)).toBe(bugun)
    expect(auditDateFor('', bugun, bugun)).toBe(bugun)
    expect(auditDateFor(null, bugun, bugun)).toBe(bugun)
  })

  it('tarih-saat taşıyan planı da güne indirger', () => {
    expect(auditDateFor('2026-08-01T10:30:00Z', bugun, bugun)).toBe('2026-08-01')
  })
})

describe('atUtcMidnight', () => {
  it('günü kaydırmadan yazar', () => {
    expect(atUtcMidnight('2026-09-08').toISOString()).toBe('2026-09-08T00:00:00.000Z')
  })

  it('çevrimdışı kuyruğun bir gün geri kaymasını tekrarlamaz', () => {
    // Ölçülen hata: new Date('2026-09-08T00:00:00') tarayıcının kendi
    // diliminde okunuyordu; Türkiye UTC+3 olduğu için 7 Eylül 21:00'e düşüyor
    // ve denetim bir önceki güne yazılıyordu.
    const hatali = new Date('2026-09-08T00:00:00')
    const dogru = atUtcMidnight('2026-09-08')
    expect(dogru.getTime()).toBeGreaterThanOrEqual(hatali.getTime())
    expect(dogru.toISOString().slice(0, 10)).toBe('2026-09-08')
  })

  it('gün taşıyan bir damgayı da o güne sabitler', () => {
    expect(atUtcMidnight('2026-09-08T23:45:00Z').toISOString()).toBe('2026-09-08T00:00:00.000Z')
  })
})
