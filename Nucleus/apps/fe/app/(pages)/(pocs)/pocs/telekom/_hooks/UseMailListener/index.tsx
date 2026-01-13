/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
'use client'

import { useEffect, useState } from 'react'

function htmlToText(html: string): string {
  return html
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

type UserProfile = { accessToken: string } | null

export type MailAttachment = {
  name: string
  contentBytes: string
  contentType: string
}

export type Mail = {
  id: string
  subject: string
  from: string
  date: string
  bodyText: string
  processed: boolean
  attachments: MailAttachment[]
  parsedJson?: any
}

type MailProcessorOptions = {
  userProfile: UserProfile
  intervalMs?: number
}

export function useMailListener({ userProfile, intervalMs = 3000 }: MailProcessorOptions) {
  const [mails, setMails] = useState<Mail[]>([])

  useEffect(() => {
    if (!userProfile?.accessToken) return

    let active = true

    const fetchMails = async () => {
      if (!active) return
      try {
        const res = await fetch(
          "https://graph.microsoft.com/v1.0/me/messages?$top=10&$filter=contains(subject,'TELEKOM_POC_14112025')",
          { headers: { Authorization: `Bearer ${userProfile.accessToken}` } }
        )
        if (!res.ok) {
          console.error('Graph API hata:', res.status, await res.text())
          return
        }

        const data = await res.json()
        if (!data.value) return

        const mailsWithAttachments: Mail[] = await Promise.all(
          data.value.map(async (m: any) => {
            // XLSX eklerini al
            const attRes = await fetch(
              `https://graph.microsoft.com/v1.0/me/messages/${m.id}/attachments`,
              {
                headers: { Authorization: `Bearer ${userProfile.accessToken}` },
              }
            )

            let attachments: MailAttachment[] = []
            if (attRes.ok) {
              const attData = await attRes.json()
              attachments = attData.value
                .filter(
                  (a: any) =>
                    a['@odata.type'] === '#microsoft.graph.fileAttachment' &&
                    a.name.endsWith('.xlsx')
                )
                .map((a: any) => ({
                  name: a.name,
                  contentBytes: a.contentBytes,
                  contentType: a.contentType,
                }))
            }

            return {
              id: m.id,
              subject: m.subject,
              from: m.from?.emailAddress?.address || 'Bilinmiyor',
              date: m.receivedDateTime,
              bodyText: htmlToText(m.body?.content || ''),
              processed: false,
              attachments,
            }
          })
        )

        setMails((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const merged = [...mailsWithAttachments.filter((m) => !existingIds.has(m.id)), ...prev]
          return merged
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
        })
      } catch (err) {
        console.error('Mail fetch error:', err)
      }
    }

    fetchMails()
    const interval = setInterval(fetchMails, intervalMs)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [userProfile?.accessToken, intervalMs])

  return { mails, setMails }
}
