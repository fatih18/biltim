import { describe, expect, it } from 'bun:test'
import { containsTr, foldTr } from './index'

describe('foldTr', () => {
  it('noktalı büyük İ küçük i olur', () => {
    // toLowerCase() burada 'i̇' (i + birleştirici nokta) üretir ve eşleşme kaçar.
    expect(foldTr('İSMAİL')).toBe('ismail')
  })

  it('noktasız büyük I küçük ı olur', () => {
    expect(foldTr('IŞIK')).toBe('ışık')
  })

  it('boşlukları kırpar', () => {
    expect(foldTr('  Müdür  ')).toBe('müdür')
  })

  it('null ve undefined boş dizedir', () => {
    expect(foldTr(null)).toBe('')
    expect(foldTr(undefined)).toBe('')
  })
})

describe('containsTr', () => {
  it('İ ile yazılmış adı i ile arayınca bulur', () => {
    expect(containsTr('İdari İşler', 'idari')).toBe(true)
  })

  it('ı ile yazılmış adı I ile arayınca bulur', () => {
    expect(containsTr('Işıkçı', 'IŞIK')).toBe(true)
  })

  it('boş arama her şeyi geçirir', () => {
    expect(containsTr('herhangi', '   ')).toBe(true)
  })

  it('eşleşmeyeni bulmaz', () => {
    expect(containsTr('Denetçi', 'müdür')).toBe(false)
  })
})
