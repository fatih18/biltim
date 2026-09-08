import { describe, expect, it } from 'bun:test'
import { withSnakeAliases } from './index'

const al = (v: unknown) => withSnakeAliases(v) as Record<string, unknown>

describe('withSnakeAliases', () => {
  it('camelCase alan adına snake ikizi ekler', () => {
    const r = al({ createdAt: 1, operationType: 'x' })
    expect(r.createdAt).toBe(1)
    expect(r.created_at).toBe(1)
    expect(r.operation_type).toBe('x')
  })

  it('HTTP metodu bir alan adı değildir — ikizlemez', () => {
    // Ölçülen hata: {GET: 251} nesnesine `get: 251` ekleniyordu, izleme
    // ekranında her sayı iki kez görünüyor ve her pay yarıya iniyordu.
    const r = al({ GET: 251, POST: 5 })
    expect(Object.keys(r).sort()).toEqual(['GET', 'POST'])
  })

  it('istek yolunu ikizlemez', () => {
    const r = al({ '/fiveSAuditPlans': 38, '/users': 28 })
    expect(Object.keys(r).sort()).toEqual(['/fiveSAuditPlans', '/users'])
  })

  it('durum kodunu ve tarihi ikizlemez', () => {
    const r = al({ '200': 265, '2026-09-08': 3 })
    expect(Object.keys(r).sort()).toEqual(['200', '2026-09-08'])
  })

  it('zaten snake olan anahtara dokunmaz', () => {
    const r = al({ user_id: 'u1' })
    expect(Object.keys(r)).toEqual(['user_id'])
  })

  it('var olan snake ikizi ezmez', () => {
    const r = al({ userId: 'camel', user_id: 'snake' })
    expect(r.user_id).toBe('snake')
  })

  it('iç içe nesnelerde de çalışır', () => {
    const r = al({ data: { createdAt: 2, byMethod: { GET: 9 } } }) as any
    expect(r.data.created_at).toBe(2)
    expect(Object.keys(r.data.byMethod)).toEqual(['GET'])
  })

  it('diziyi olduğu gibi gezer', () => {
    const r = withSnakeAliases([{ createdAt: 3 }]) as any[]
    expect(r[0].created_at).toBe(3)
  })
})
