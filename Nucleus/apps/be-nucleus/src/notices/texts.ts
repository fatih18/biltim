import type { MailContent } from '../mail/types'
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX } from './types'

/**
 * The bell's words are the mail's words. The mail builders (`mail/texts.ts`)
 * write the subject and a plain-text body; the bell takes the subject as its
 * title and, from the body, what is worth reading in a bell: the facts and the
 * notes. Left out are what only makes sense in a mail: the greeting, the
 * introduction (the title already says it), the sentences that talk about the
 * e-mail itself, the way to open the app (the reader is in it) and the
 * automatic-mail footer. The HTML part is never used.
 *
 * Both texts are cut to the `notifications` column widths.
 */

/** Lines of the mail body that are about the mail or the way into the app. */
const OPENING_THE_APP = /^(Uygulamaya giriş yaparak|Uygulamayı açmak için:)/

/** A sentence or clause of the mail's own wording; the e-mail's footer and "this mail was sent to" belong to the mail. */
const ABOUT_THE_MAIL = /e-posta/i

/** "Sentence one. Sentence two; clause" -> its parts. A dot inside a date or a number is not followed by a space, so it does not split. */
const BOUNDARY = /(?<=[.;!?])\s+/

/** Cut to a column's width, saying so with an ellipsis; never in the middle of an emoji. */
export function clip(value: string, max: number): string {
  if (value.length <= max) return value
  const cut = value.slice(0, max - 1)
  const last = cut.charCodeAt(cut.length - 1)
  const safe = last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut
  return `${safe}…`
}

function asSentence(part: string): string {
  const bare = part.replace(/[;,]+$/, '').trim()
  return /[.!?]$/.test(bare) ? bare : `${bare}.`
}

/**
 * The mail body is greeting, introduction, facts, notes and footer, each a paragraph.
 * The first two and the last go; the rest is read line by line.
 */
export function bellBody(text: string): string {
  const paragraphs = text.split(/\n{2,}/).slice(2, -1)
  return paragraphs
    .flatMap((paragraph) => paragraph.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line !== '' && !OPENING_THE_APP.test(line))
    .flatMap((line) => line.split(BOUNDARY))
    .map((part) => part.trim())
    .filter((part) => part !== '' && !ABOUT_THE_MAIL.test(part))
    .map(asSentence)
    .join(' ')
}

/** Title and body of the notification a mail would have been sent for. */
export function bellNotice(content: MailContent): { title: string; body: string } {
  return {
    title: clip(content.subject, NOTICE_TITLE_MAX),
    body: clip(bellBody(content.text) || content.subject, NOTICE_BODY_MAX),
  }
}
