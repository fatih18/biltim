import { describe, expect, it } from 'bun:test'
import { buildCompletion, buildInvitation } from '../mail/texts'
import { bellBody, bellNotice, clip } from './texts'
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX } from './types'

const invitation = (over: Partial<Parameters<typeof buildInvitation>[0]> = {}) =>
  buildInvitation({
    title: 'Haddehane 5S denetimi',
    period: '2026 Q4',
    location: 'Haddehane 2',
    day: '2026-11-12',
    team: [
      { name: 'Mehmet Demir', leader: true },
      { name: 'Ayşe Kaya', leader: false },
    ],
    appUrl: null,
    ...over,
  })

const completion = (over: Partial<Parameters<typeof buildCompletion>[0]> = {}) =>
  buildCompletion({ location: 'Haddehane 2', day: '2026-11-12', score: 82.5, target: 75, findings: 3, appUrl: null, ...over })

describe('the bell takes the mail’s words', () => {
  it('uses the mail subject as the title', () => {
    expect(bellNotice(invitation()).title).toBe('Yeni 5S denetim planı: Haddehane 2 - 12.11.2026')
    expect(bellNotice(completion()).title).toBe('5S denetimi tamamlandı: Haddehane 2 - 12.11.2026')
  })

  it('keeps the facts and the notes of the created plan, and nothing that talks about the mail', () => {
    expect(bellNotice(invitation()).body).toBe(
      'Plan: Haddehane 5S denetimi. Dönem: 2026 Q4. Lokasyon: Haddehane 2. Planlanan tarih: 12.11.2026. Denetim ekibi: Mehmet Demir (ekip lideri), Ayşe Kaya. Planın güncel tarihi ve durumu uygulamada ana sayfadaki Plan / Yaklaşan sekmesinde görünür.'
    )
  })

  it('keeps what a completed audit’s reader needs, and the half of a sentence that is about the report', () => {
    expect(bellNotice(completion()).body).toBe(
      'Lokasyon: Haddehane 2. Denetim tarihi: 12.11.2026. Denetim puanı: 82,5 (hedef puan: 75, hedefe ulaşıldı). Açılan bulgu sayısı: 3. Denetimin raporunu uygulamada ana sayfadaki Tamamlanan sekmesinden açabilirsiniz. Açılan bulguları Bulgular sayfasında görebilir, düzelttiğinizde bulguyu "sonrası" fotoğrafıyla kapatabilirsiniz.'
    )
  })

  it('leaves out a fact that is not known, and the finding hint when no finding was opened', () => {
    const body = bellNotice(completion({ score: null, findings: 0, day: '' })).body
    expect(body).toBe('Lokasyon: Haddehane 2. Açılan bulgu sayısı: 0. Denetimin raporunu uygulamada ana sayfadaki Tamamlanan sekmesinden açabilirsiniz.')
  })

  it('is plain text: no greeting, footer, link line, markup or "undefined"', () => {
    for (const content of [invitation(), completion(), invitation({ appUrl: 'http://172.26.16.27:3000' })]) {
      const { title, body } = bellNotice(content)
      for (const text of [title, body]) {
        expect(text).not.toMatch(/Merhaba|e-posta|lütfen yanıtlamayın|<|>|undefined|null|NaN|http/)
      }
    }
  })

  it('keeps what a person typed as it is: the bell shows plain text, so nothing is escaped into HTML', () => {
    const { body } = bellNotice(invitation({ location: 'A<b>B' }))
    expect(body).toContain('Lokasyon: A<b>B.')
  })

  it('falls back to the subject when a body has nothing to keep', () => {
    expect(bellBody('Merhaba,')).toBe('')
    expect(bellNotice({ subject: 'Konu', text: 'Merhaba,', html: '' }).body).toBe('Konu')
  })
})

describe('the column widths', () => {
  it('cuts a long title and body to 255 and 1000 characters, with an ellipsis', () => {
    const long = 'Çok uzun lokasyon adı '.repeat(80)
    const { title, body } = bellNotice(invitation({ location: long, title: long, team: [{ name: long, leader: true }] }))
    expect(title.length).toBe(NOTICE_TITLE_MAX)
    expect(title.endsWith('…')).toBe(true)
    expect(body.length).toBe(NOTICE_BODY_MAX)
    expect(body.endsWith('…')).toBe(true)
  })

  it('never splits an emoji when it cuts', () => {
    const cut = clip(`${'a'.repeat(9)}😀tail`, 11)
    expect(cut).toBe(`${'a'.repeat(9)}…`)
    expect(clip('kısa', 10)).toBe('kısa')
    expect(clip('abc', 3)).toBe('abc')
    expect(clip('abcd', 3)).toBe('ab…')
  })
})
