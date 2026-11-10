import { dayTr } from '../routes/auditReport'
import type { TeamPerson } from './recipients'
import type { MailContent } from './types'

/**
 * The words of the two plan mails, in Turkish, as plain text and as a simple
 * HTML part. A value that is missing leaves its line out; nothing here ever
 * prints "undefined", "null" or "NaN". Everything a person typed (location,
 * team and people's names, the plan's title) is escaped in the HTML part.
 */

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * The app's address for the link, from `APP_BASE_URL` (the install's own
 * setting; nothing in config.json holds it). Only http and https addresses are
 * taken, without credentials, query or fragment, and without a trailing slash;
 * anything else means no link in the mail.
 */
export function appBaseUrl(raw: string | undefined = process.env.APP_BASE_URL): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return null
  }
}

/** A score the way the plant writes it: decimal comma, at most two decimals (82,5). */
export function formatScore(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

type Fact = [label: string, value: string]

type Layout = {
  subject: string
  intro: string
  facts: Fact[]
  notes: string[]
  appUrl: string | null
}

const FOOTER = 'Bu e-posta 5S denetim uygulaması tarafından otomatik gönderilmiştir; lütfen yanıtlamayın.'

function compose(layout: Layout): MailContent {
  const facts = layout.facts.filter(([, value]) => value !== '')
  const link = layout.appUrl ? `${layout.appUrl}/` : null
  const where = link ? `Uygulamayı açmak için: ${link}` : 'Uygulamaya giriş yaparak ana sayfadan görebilirsiniz.'

  const text = [
    'Merhaba,',
    '',
    layout.intro,
    '',
    ...facts.map(([label, value]) => `${label}: ${value}`),
    '',
    ...layout.notes,
    where,
    '',
    FOOTER,
  ].join('\n')

  const rows = facts
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 16px 4px 0;font-weight:600;vertical-align:top">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`
    )
    .join('')
  const anchor = link ? `<p>Uygulamayı açmak için: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : `<p>${escapeHtml(where)}</p>`
  const html = [
    '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827">',
    '<p>Merhaba,</p>',
    `<p>${escapeHtml(layout.intro)}</p>`,
    `<table role="presentation" style="border-collapse:collapse;margin:8px 0">${rows}</table>`,
    ...layout.notes.map((note) => `<p>${escapeHtml(note)}</p>`),
    anchor,
    `<p style="color:#6b7280;font-size:12px">${escapeHtml(FOOTER)}</p>`,
    '</div>',
  ].join('')

  // A name typed into the plan could carry a line break; a subject is one line.
  return { subject: layout.subject.replace(/\s+/g, ' ').trim(), text, html }
}

/** "Haddehane 2 - 12.11.2026", or whichever of the two is known. */
function headline(location: string, day: string): string {
  return [location, day ? dayTr(day) : ''].filter(Boolean).join(' - ')
}

export type InvitationInfo = {
  /** The plan's own title, if it has one. */
  title: string
  /** The period (quarter) the plan is filed under, if any. */
  period: string
  location: string
  /** `YYYY-MM-DD`, or ''. */
  day: string
  team: TeamPerson[]
  appUrl: string | null
}

/** R70: a plan was created. */
export function buildInvitation(info: InvitationInfo): MailContent {
  const title = headline(info.location, info.day)
  return compose({
    subject: title ? `Yeni 5S denetim planı: ${title}` : 'Yeni 5S denetim planı',
    intro:
      'Yeni bir 5S denetimi planlandı. Bu e-posta denetim ekibine ve denetlenecek lokasyonun saha sorumlusuna bilgi için gönderildi.',
    facts: [
      ['Plan', info.title],
      ['Dönem', info.period],
      ['Lokasyon', info.location],
      ['Planlanan tarih', info.day ? dayTr(info.day) : ''],
      ['Denetim ekibi', info.team.map((p) => (p.leader ? `${p.name} (ekip lideri)` : p.name)).join(', ')],
    ],
    notes: ['Planın güncel tarihi ve durumu uygulamada ana sayfadaki Plan / Yaklaşan sekmesinde görünür.'],
    appUrl: info.appUrl,
  })
}

export type CompletionInfo = {
  location: string
  /** The audit's day, `YYYY-MM-DD`, or ''. */
  day: string
  score: number | null
  target: number | null
  /** Findings this audit opened; null when it could not be counted. */
  findings: number | null
  appUrl: string | null
}

function scoreLine(score: number | null, target: number | null): string {
  if (score === null) return ''
  if (target === null) return formatScore(score)
  const verdict = score >= target ? 'hedefe ulaşıldı' : 'hedefin altında'
  return `${formatScore(score)} (hedef puan: ${formatScore(target)}, ${verdict})`
}

/** R63: an audit was approved. */
export function buildCompletion(info: CompletionInfo): MailContent {
  const title = headline(info.location, info.day)
  const what = [info.location ? `${info.location} lokasyonunun` : '', info.day ? `${dayTr(info.day)} tarihli` : '']
    .filter(Boolean)
    .join(' ')
  const notes = ['Denetimin raporunu uygulamada ana sayfadaki Tamamlanan sekmesinden açabilirsiniz; rapor bu e-postaya eklenmedi.']
  if (info.findings !== null && info.findings > 0) {
    notes.push('Açılan bulguları Bulgular sayfasında görebilir, düzelttiğinizde bulguyu "sonrası" fotoğrafıyla kapatabilirsiniz.')
  }
  return compose({
    subject: title ? `5S denetimi tamamlandı: ${title}` : '5S denetimi tamamlandı',
    intro: `${what ? `${what} 5S denetimi` : 'Bir 5S denetimi'} tamamlandı ve Merkez Ekip tarafından onaylandı.`,
    facts: [
      ['Lokasyon', info.location],
      ['Denetim tarihi', info.day ? dayTr(info.day) : ''],
      ['Denetim puanı', scoreLine(info.score, info.target)],
      ['Açılan bulgu sayısı', info.findings === null ? '' : String(info.findings)],
    ],
    notes,
    appUrl: info.appUrl,
  })
}
