/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import type { App } from '@/server'

export function SubscriptionRoute(app: App) {
  return app.group('/subs', (app) => {
    return app.post('/prediction-completed', async ({ body, set, request }) => {
      console.log('🎯 Prediction completed event received')
      console.log('Request headers:', request.headers)

      // Body'yi manuel parse et (Elysia bazen body'yi otomatik parse etmeyebilir)
      let eventData: any

      try {
        if (!body) {
          // Body undefined ise, request'ten manuel oku
          const text = await request.text()
          console.log('Raw body text:', text)
          eventData = JSON.parse(text)
        } else {
          eventData = body
        }

        console.log('Parsed event:', JSON.stringify(eventData, null, 2))

        // Dapr CloudEvent formatı
        const event = eventData as {
          id: string
          source: string
          type: string
          specversion: string
          datacontenttype?: string
          data: any
          topic?: string
          pubsubname?: string
        }

        console.log('Event ID:', event.id)
        console.log('Event source:', event.source)
        console.log('Event data:', event.data)

        // İş mantığın burada
        // await yourBusinessLogic(event.data)

        // ✅ BAŞARILI - Resmi Dapr formatı
        set.status = 200
        return {
          status: 'SUCCESS',
        }
      } catch (error) {
        console.error('❌ Error processing event:', error)
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')

        // 🔄 RETRY - Mesaj tekrar denenecek
        set.status = 200
        return {
          status: 'RETRY',
        }
      }
    })
  })
}
