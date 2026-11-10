import { describe, expect, it } from 'bun:test'
import { appBaseUrl, buildCompletion, buildInvitation, escapeHtml, formatScore } from './texts'

const BASE = { appUrl: 'http://172.26.16.27:3000' }

const invitation = {
  title: 'Haddehane 5S denetimi',
  period: '2026 Q4',
  location: 'Haddehane 2',
  day: '2026-11-12',
  team: [
    { name: 'Mehmet Demir', leader: true },
    { name: 'Ayşe Kaya', leader: false },
  ],
  ...BASE,
}

const completion = { location: 'Haddehane 2', day: '2026-11-12', score: 82.5, target: 75, findings: 3, ...BASE }

/** Words that mean a value leaked into the copy unformatted. */
const LEAKS = ['undefined', 'null', 'NaN', '[object', '${']

function expectNoLeaks(...parts: string[]): void {
  for (const part of parts) for (const word of LEAKS) expect(part).not.toContain(word)
}

describe('the invitation mail (R70)', () => {
  const mail = buildInvitation(invitation)

  it('says in Turkish what was planned, where, when, by whom and who is on the team', () => {
    expect(mail.subject).toBe('Yeni 5S denetim planı: Haddehane 2 - 12.11.2026')
    for (const line of [
      'Yeni bir 5S denetimi planlandı.',
      'Plan: Haddehane 5S denetimi',
      'Dönem: 2026 Q4',
      'Lokasyon: Haddehane 2',
      'Planlanan tarih: 12.11.2026',
      'Denetim ekibi: Mehmet Demir (ekip lideri), Ayşe Kaya',
    ]) {
      expect(mail.text).toContain(line)
    }
  })

  it('links to the app when it has an address, and says where to look when it has none', () => {
    expect(mail.text).toContain('Uygulamayı açmak için: http://172.26.16.27:3000/')
    expect(mail.html).toContain('<a href="http://172.26.16.27:3000/">')
    const without = buildInvitation({ ...invitation, appUrl: null })
    expect(without.text).not.toContain('http')
    expect(without.html).not.toContain('<a ')
    expect(without.text).toContain('Uygulamaya giriş yaparak ana sayfadan görebilirsiniz.')
  })

  it('leaves a line out instead of printing a missing value', () => {
    const bare = buildInvitation({ title: '', period: '', location: '', day: '', team: [], appUrl: null })
    expectNoLeaks(bare.subject, bare.text, bare.html)
    expect(bare.subject).toBe('Yeni 5S denetim planı')
    for (const label of ['Plan:', 'Dönem:', 'Lokasyon:', 'Planlanan tarih:', 'Denetim ekibi:']) {
      expect(bare.text).not.toContain(label)
    }
  })

  it('has no leak in the full mail either, and carries both a text and an html part', () => {
    expectNoLeaks(mail.subject, mail.text, mail.html)
    expect(mail.html.startsWith('<div')).toBe(true)
  })

  it('escapes everything a person typed in the html part, and keeps the subject on one line', () => {
    const hostile = buildInvitation({
      ...invitation,
      title: '<script>alert(1)</script>',
      location: 'Tel & "Çelik"\r\nBcc: x@y.com',
      team: [{ name: "O'Neil <b>", leader: true }],
    })
    expect(hostile.html).not.toContain('<script>')
    expect(hostile.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(hostile.html).toContain('Tel &amp; &quot;Çelik&quot;')
    expect(hostile.html).toContain('O&#39;Neil &lt;b&gt;')
    expect(hostile.subject).not.toMatch(/[\r\n]/)
  })
})

describe('the completion mail (R63)', () => {
  const mail = buildCompletion(completion)

  it('says where, when, the score against the target and how many findings the audit opened', () => {
    expect(mail.subject).toBe('5S denetimi tamamlandı: Haddehane 2 - 12.11.2026')
    expect(mail.text).toContain('Haddehane 2 lokasyonunun 12.11.2026 tarihli 5S denetimi tamamlandı ve Merkez Ekip tarafından onaylandı.')
    expect(mail.text).toContain('Denetim puanı: 82,5 (hedef puan: 75, hedefe ulaşıldı)')
    expect(mail.text).toContain('Açılan bulgu sayısı: 3')
  })

  it('does not attach the report and says where to open it', () => {
    expect(mail.text).toContain('Tamamlanan sekmesinden açabilirsiniz; rapor bu e-postaya eklenmedi.')
    expect(mail.text).toContain('Uygulamayı açmak için: http://172.26.16.27:3000/')
  })

  it('says "below the target" under it, and "reached" on it', () => {
    expect(buildCompletion({ ...completion, score: 61.25 }).text).toContain('Denetim puanı: 61,25 (hedef puan: 75, hedefin altında)')
    expect(buildCompletion({ ...completion, score: 75 }).text).toContain('hedefe ulaşıldı')
  })

  it('points to the findings page only when the audit opened findings', () => {
    expect(mail.text).toContain('Bulgular sayfasında')
    for (const findings of [0, null]) {
      expect(buildCompletion({ ...completion, findings }).text).not.toContain('Bulgular sayfasında')
    }
    expect(buildCompletion({ ...completion, findings: 0 }).text).toContain('Açılan bulgu sayısı: 0')
    expect(buildCompletion({ ...completion, findings: null }).text).not.toContain('Açılan bulgu sayısı')
  })

  it('has no leak with every optional value missing', () => {
    const bare = buildCompletion({ location: '', day: '', score: null, target: null, findings: null, appUrl: null })
    expectNoLeaks(bare.subject, bare.text, bare.html)
    expect(bare.subject).toBe('5S denetimi tamamlandı')
    expect(bare.text).toContain('Bir 5S denetimi tamamlandı ve Merkez Ekip tarafından onaylandı.')
    expect(bare.text).not.toContain('Denetim puanı')
    expect(buildCompletion({ ...completion, target: null }).text).toContain('Denetim puanı: 82,5\n')
    expectNoLeaks(mail.subject, mail.text, mail.html)
  })

  it('escapes the location in the html part', () => {
    expect(buildCompletion({ ...completion, location: 'A<B>' }).html).toContain('A&lt;B&gt;')
  })
})

describe('small helpers', () => {
  it('writes scores with a decimal comma and at most two decimals', () => {
    expect(formatScore(82.5)).toBe('82,5')
    expect(formatScore(75)).toBe('75')
    expect(formatScore(61.254)).toBe('61,25')
    expect(formatScore(0)).toBe('0')
  })

  it('escapes the five html characters', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
  })

  it('reads the app address only when it is an http(s) address, trimmed of everything but origin and path', () => {
    expect(appBaseUrl('http://172.26.16.27:3000/')).toBe('http://172.26.16.27:3000')
    expect(appBaseUrl(' https://5s.firma.example/app/ ')).toBe('https://5s.firma.example/app')
    expect(appBaseUrl('https://user:secret@5s.firma.example/?x=1#y')).toBe('https://5s.firma.example')
    for (const bad of ['', '   ', 'javascript:alert(1)', 'ftp://x.example', '5s.firma.example', 'http://']) {
      expect(appBaseUrl(bad)).toBeNull()
    }
  })
})
