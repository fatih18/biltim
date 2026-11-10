import { describe, expect, it } from 'bun:test'
import { doneDayNote, REPEATS_UNAVAILABLE_NOTE } from './doneDayNote'

describe('doneDayNote', () => {
  it('says nothing for an ordinary list', () => {
    expect(doneDayNote(12, 0, 0)).toBeNull()
  })

  it('says which audits are listed twice and that the counts take each once', () => {
    const text = doneDayNote(12, 2, 0) ?? ''
    expect(text).toContain('Listede 12 denetim var.')
    expect(text).toContain('2 tanesi planlandığından farklı bir günde yapıldığı için yapıldığı günde de görünür.')
    expect(text).toContain('her denetimi bir kez sayar')
    expect(text).not.toContain('sayfanın dışında')
  })

  it('says that an audit whose plan lies outside the page appears only under its done day', () => {
    const text = doneDayNote(50, 1, 1) ?? ''
    expect(text).toContain('1 denetimin planı bu sayfanın dışında kaldığı için yalnız yapıldığı günde görünür.')
    expect(text).not.toContain('tanesi')
  })

  it('names both kinds when a list has both', () => {
    const text = doneDayNote(50, 3, 1) ?? ''
    expect(text).toContain('2 tanesi planlandığından')
    expect(text).toContain('1 denetimin planı bu sayfanın dışında')
  })
})

describe('REPEATS_UNAVAILABLE_NOTE', () => {
  it('says what failed, what it means and what to do', () => {
    expect(REPEATS_UNAVAILABLE_NOTE).toContain('okunamadı')
    expect(REPEATS_UNAVAILABLE_NOTE).toContain('listelenmemiş olabilir')
    expect(REPEATS_UNAVAILABLE_NOTE).toContain('Sayfayı yenileyin')
  })
})
