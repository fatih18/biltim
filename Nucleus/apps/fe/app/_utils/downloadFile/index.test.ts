import { describe, expect, it } from 'bun:test'
import { filenameFromDisposition, queryString } from './index'

describe('filenameFromDisposition', () => {
  it('reads a quoted and an unquoted file name', () => {
    expect(filenameFromDisposition('attachment; filename="5S-Denetim-Raporu-Haddehane-2026-11-03.xlsx"', 'x.xlsx')).toBe(
      '5S-Denetim-Raporu-Haddehane-2026-11-03.xlsx'
    )
    expect(filenameFromDisposition('attachment; filename=rapor.xlsx', 'x.xlsx')).toBe('rapor.xlsx')
  })

  it('falls back when the header is missing or names no file', () => {
    expect(filenameFromDisposition(null, 'x.xlsx')).toBe('x.xlsx')
    expect(filenameFromDisposition(undefined, 'x.xlsx')).toBe('x.xlsx')
    expect(filenameFromDisposition('attachment', 'x.xlsx')).toBe('x.xlsx')
  })
})

describe('queryString', () => {
  it('keeps the parameters that have a value', () => {
    expect(queryString({ audit_id: 'a-1', year: '' })).toBe('?audit_id=a-1')
  })

  it('is empty when nothing is set', () => {
    expect(queryString({})).toBe('')
    expect(queryString({ year: '' })).toBe('')
  })
})
