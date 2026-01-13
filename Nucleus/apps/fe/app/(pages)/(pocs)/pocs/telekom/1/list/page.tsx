/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  type MailProcessedData,
  useMailProcessedStore,
} from '@/app/(pages)/(pocs)/pocs/telekom/_store/mailProcessedStore'
import { HeaderTelekom } from '../../_components'
import { type Mail, useMailListener, useMsalAuth } from '../../_hooks'

export default function MailPage() {
  const router = useRouter()
  const { setProcessedData } = useMailProcessedStore()
  const { isAuthenticated, userProfile, login } = useMsalAuth()
  const { mails, setMails } = useMailListener({
    userProfile:
      isAuthenticated && userProfile?.accessToken ? { accessToken: userProfile.accessToken } : null,
  })

  const [processingIds, setProcessingIds] = useState<string[]>([])

  const handleProcess = async (mail: Mail) => {
    try {
      setProcessingIds((prev) => [...prev, mail.id])

      // Excel eklerini parse et - sadece Fizibilite sayfası
      let fizibiliteData: any[] | null = null
      let excelFileName = ''

      for (const att of mail.attachments) {
        // Sadece Excel dosyalarını işle
        if (!att.name.match(/\.(xlsx?|xls)$/i)) continue

        const buffer = Buffer.from(att.contentBytes, 'base64')
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        // Fizibilite sayfasını bul
        if (workbook.SheetNames.includes('Fizibilite')) {
          const sheet = workbook.Sheets.Fizibilite
          if (!sheet) {
            continue
          }
          fizibiliteData = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: false,
          })
          excelFileName = att.name
          console.log(`✅ ${att.name} - Fizibilite: ${fizibiliteData.length} satır`)
          break // İlk Fizibilite sayfasını bulduk, dur
        }
      }

      if (!fizibiliteData) {
        toast.error('Excel dosyasında Fizibilite sayfası bulunamadı')
        return
      }

      // OpenAI'ya sadece Fizibilite sayfasını gönder
      console.log(`🚀 OpenAI'ya gönderiliyor: ${fizibiliteData.length} satır`)

      const openaiRes = await fetch('/api/openaiProcessMail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { Fizibilite: fizibiliteData }, // Sadece Fizibilite sayfası
          mailSubject: mail.subject,
          mailBody: mail.bodyText,
        }),
      })

      if (!openaiRes.ok) {
        const errorText = await openaiRes.text()
        console.error('❌ API Hatası:', errorText)
        throw new Error(`API hatası: ${openaiRes.status}`)
      }

      const { parsedJson } = await openaiRes.json()
      const jsonData: MailProcessedData = JSON.parse(parsedJson)

      console.log('✅ İşlenen veri:', jsonData)

      setProcessedData(jsonData)
      setMails((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, processed: true, parsedJson } : m))
      )

      toast.success(`${excelFileName} başarıyla işlendi!`)
    } catch (err) {
      toast.error('Mail işlenirken hata oluştu')
      console.error(err)
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== mail.id))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <button
          type="button"
          onClick={login}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Microsoft ile Giriş Yap
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <HeaderTelekom />
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <h1 className="text-2xl font-semibold mb-4">Mail Listesi</h1>

        {mails.length === 0 ? (
          <p className="text-gray-500">Henüz mail bulunamadı.</p>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y">
            {mails.map((mail) => (
              <div
                key={mail.id}
                className={`flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors ${
                  mail.processed ? 'opacity-70 bg-gray-50' : 'bg-white border-l-4 border-blue-500'
                }`}
              >
                <div className="flex flex-col max-w-[70%]">
                  <p
                    className={`font-medium ${mail.processed ? 'text-gray-600' : 'text-gray-900'}`}
                  >
                    {mail.subject}
                  </p>
                  <p className="text-sm text-gray-500">{mail.from}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{mail.bodyText}</p>

                  {mail.attachments.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {mail.attachments.map((att) => (
                        <span key={att.name} className="px-2 py-1 text-xs bg-gray-200 rounded">
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-xs text-gray-400">
                    {new Date(mail.date).toLocaleString('tr-TR')}
                  </p>

                  {mail.processed ? (
                    <button
                      type="button"
                      onClick={() => router.push('/pocs/telekom/1')}
                      className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      Detayları Gör
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleProcess(mail)}
                      disabled={processingIds.includes(mail.id)}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingIds.includes(mail.id) ? (
                        <span className="loader h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        'İşle'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
