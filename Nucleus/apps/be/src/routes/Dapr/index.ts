import { daprManager } from '@monorepo/dapr-manager'
import type { App } from '@/server'

export function DaprRoute(app: App) {
  return app.group('/dapr', (app) => {
    return (
      app
        // Dapr subscription discovery endpoint
        // BURALARDA HEP TEST EDİYORUZ
        .get('/subscribe', () => {
          console.log('📋 Dapr subscription discovery request received')

          // Dapr bu endpoint'ten hangi topic'lere subscribe olduğunuzu öğrenir
          // Eğer PubSub kullanıyorsanız, burada subscription'larınızı tanımlamalısınız
          return [
            // {
            //   pubsubname: "pubsub-rabbitmq", // veya kullandığınız pubsub component adı
            //   topic: "orders", // dinlemek istediğiniz topic
            //   route: "/dapr/orders", // gelen mesajların yönlendirileceği endpoint
            //   metadata: {
            //     rawPayload: "true",
            //   },
            // },
            // Daha fazla subscription ekleyebilirsiniz
            // {
            //   pubsubname: "pubsub-rabbitmq",
            //   topic: "notifications",
            //   route: "/dapr/notifications",
            //   metadata: {
            //     rawPayload: "true"
            //   }
            // }
          ]
        })

        // Health check endpoint - Dapr bu endpoint'i kontrol eder
        .get('/healthz', () => {
          console.log('❤️ Dapr health check request received')
          return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
          }
        })

        // Metadata endpoint - Dapr bu endpoint'ten uygulama bilgilerini alır
        .get('/metadata', () => {
          console.log('📊 Dapr metadata request received')
          return {
            id: process.env.APP_ID || 'my-app',
            actors: [
              // Eğer actor kullanıyorsanız burada tanımlayın
              // {
              //   type: "MyActorType",
              //   count: 1
              // }
            ],
            components: [
              {
                name: 'statestore-redis',
                type: 'state.redis',
                version: 'v1',
              },
              {
                name: 'pubsub-rabbitmq',
                type: 'pubsub.rabbitmq',
                version: 'v1',
              },
            ],
            httpEndpoints: [
              // {
              //   name: 'orders',
              //   path: '/api/orders',
              // },
            ],
          }
        })

        // Configuration endpoint - Dapr configuration değişikliklerini bildirir
        .get('/config', (_req) => {
          console.log('⚙️ Dapr config request received')
          return {
            status: 'ok',
            message: 'Configuration endpoint ready',
          }
        })
        .get('/invoke-test', async ({ query }) => {
          const { app, endpoint } = query

          // Validation
          if (!app || !endpoint) {
            return {
              status: 'error',
              message: 'Missing required query parameters',
              required: {
                app: 'Target Dapr app-id (e.g., wizmo-api)',
                endpoint: 'Target endpoint path (e.g., health)',
              },
              example: '/dapr/invoke-test?app=wizmo-api&endpoint=health',
            }
          }

          try {
            console.log(`🔌 Invoking ${app}/${endpoint}...`)

            const response = await daprManager.invoke.get(app, endpoint)

            console.log(`✅ Invoke successful: ${app}/${endpoint}`)

            return {
              status: 'ok',
              message: 'Invoke successful',
              target: {
                app,
                endpoint,
              },
              response,
            }
          } catch (error) {
            console.error(`❌ Invoke failed: ${app}/${endpoint}`, error)

            return {
              status: 'error',
              message: 'Invoke failed',
              target: {
                app,
                endpoint,
              },
              error: error instanceof Error ? error.message : String(error),
            }
          }
        })
        .get('/state-test', async () => {
          const storeName = 'statestore-redis'
          const testKey = 'test-key'
          const testValue = { message: 'Hello Dapr State!', timestamp: Date.now() }

          try {
            // 1. Save state
            console.log('💾 Saving state...', { key: testKey, value: testValue })
            await daprManager.state.save(
              [
                {
                  key: testKey,
                  value: testValue,
                },
              ],
              undefined, // options
              storeName
            )
            console.log('✅ State saved successfully')

            // 2. Get state (await yeterli, setTimeout gereksiz)
            console.log('🔍 Retrieving state...', { key: testKey })
            const retrieved = await daprManager.state.get<typeof testValue>(testKey, storeName)
            console.log('✅ State retrieved:', retrieved)

            // 3. Validate
            const match =
              retrieved !== undefined &&
              retrieved.message === testValue.message &&
              retrieved.timestamp === testValue.timestamp

            return {
              status: match ? 'ok' : 'failed',
              test: 'Dapr State Store',
              storeName,
              operations: {
                set: testValue,
                get: retrieved,
                match,
              },
            }
          } catch (error) {
            console.error('❌ State test failed:', error)
            return {
              status: 'error',
              test: 'Dapr State Store',
              error: error instanceof Error ? error.message : String(error),
            }
          }
        })
        .get('/pub-test', async () => {
          try {
            const testData = {
              id: 'test-123',
              source: 'manual-test',
              type: 'com.dapr.event.sent',
              specversion: '1.0',
              datacontenttype: 'application/json',
              data: {
                message: 'Hello friend...',
                timestamp: Date.now(),
              },
            }

            console.log('📤 Publishing to prediction_completed:', testData)

            const response = await daprManager.pubsub.publish('prediction_completed', testData)

            console.log('✅ Published successfully')

            return {
              status: 'ok',
              message: 'Publish successful',
              data: testData,
              response,
            }
          } catch (error) {
            console.error('❌ Publish failed:', error)
            return {
              status: 'error',
              message: 'Publish failed',
              error: error instanceof Error ? error.message : String(error),
            }
          }
        })
    )
  })
}
