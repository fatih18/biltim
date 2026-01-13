import { createHash } from 'node:crypto'
import { T_RemoteComputers } from '@monorepo/db-entities/schemas/default/remote_computer'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq, isNotNull } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function RegisterRemoteComputer(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'Register remote computer',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const headers = req.request.headers
      const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo
      const schemaName = companyInfo.schema_name || 'main'

      const body = (req.body ?? {}) as Partial<{
        agentId: string
        hostname: string
        platform?: string
        arch?: string
      }>

      const agentId = body.agentId?.trim()
      const hostname = body.hostname?.trim()

      if (!agentId || !hostname) {
        return generateResponse({
          isSuccess: false,
          message: 'agentId and hostname are required',
          errors: 'Missing agentId or hostname',
          status: 400,
          request: req,
        })
      }

      const apiKeyHeader = headers.get('x-agent-api-key')?.trim()

      if (!apiKeyHeader) {
        return generateResponse({
          isSuccess: false,
          message: 'API key is required',
          errors: 'Missing x-agent-api-key header',
          status: 401,
          request: req,
        })
      }

      // Hash the provided API key
      const providedKeyHash = createHash('sha256').update(apiKeyHeader).digest('hex')

      let id: string
      const tenantDB = await getTenantDB(schemaName)

      // 1) Öncelik: FE wizard'ı üzerinden oluşturulmuş bilgisayarı bul (owner_user_id dolu)
      // API key hash'i ile eşleştirip, bu kaydı agentId ile bağlarız.
      const existingByHashOwned = await tenantDB
        .select({
          id: T_RemoteComputers.id,
          computer_identifier: T_RemoteComputers.computer_identifier,
          api_key_hash: T_RemoteComputers.api_key_hash,
        })
        .from(T_RemoteComputers)
        .where(
          and(
            eq(T_RemoteComputers.api_key_hash, providedKeyHash),
            isNotNull(T_RemoteComputers.owner_user_id)
          )
        )
        .limit(1)

      // 2) Eski davranış: agentId ile zaten kayıtlı bir bilgisayar var mı?
      const existingById = await tenantDB
        .select({
          id: T_RemoteComputers.id,
          computer_identifier: T_RemoteComputers.computer_identifier,
          api_key_hash: T_RemoteComputers.api_key_hash,
        })
        .from(T_RemoteComputers)
        .where(eq(T_RemoteComputers.computer_identifier, agentId))
        .limit(1)

      if (existingByHashOwned[0]) {
        const owned = existingByHashOwned[0]

        // Eğer aynı agentId ile daha önce otomatik oluşturulmuş bir kayıt varsa,
        // onu pasif hale getir ve identifier'ını değiştir ki unique constraint patlamasın.
        if (existingById[0] && existingById[0].id !== owned.id) {
          await tenantDB
            .update(T_RemoteComputers)
            .set({
              computer_identifier: `${existingById[0].computer_identifier}-orphan`,
              is_online: false,
              updated_at: new Date(),
            })
            .where(eq(T_RemoteComputers.id, existingById[0].id as string))
        }

        // FE'den oluşturulan kaydı bu makineye bağla
        // NOT: name alanını hostname ile override etmiyoruz - FE'den girilen isim korunuyor
        await tenantDB
          .update(T_RemoteComputers)
          .set({
            computer_identifier: agentId,
            platform: body.platform ?? null,
            last_seen: new Date(),
            is_online: true,
            updated_at: new Date(),
          })
          .where(eq(T_RemoteComputers.id, owned.id as string))

        id = owned.id as string
      } else if (existingById[0]) {
        // FE üzerinden oluşturulmamış ama bu agentId ile zaten bir kayıt varsa,
        // eski davranışı koru ve sadece API key'i doğrula + güncelle.
        if (existingById[0].api_key_hash && existingById[0].api_key_hash !== providedKeyHash) {
          return generateResponse({
            isSuccess: false,
            message: 'Invalid agent API key',
            errors: 'API key does not match',
            status: 401,
            request: req,
          })
        }

        id = existingById[0].id as string

        // NOT: Mevcut kaydın name'ini hostname ile override etmiyoruz
        await tenantDB
          .update(T_RemoteComputers)
          .set({
            platform: body.platform ?? null,
            last_seen: new Date(),
            is_online: true,
            updated_at: new Date(),
          })
          .where(eq(T_RemoteComputers.computer_identifier, agentId))
      } else {
        // Hiç eşleşen kayıt yok - bu API key ile FE'den oluşturulmuş bilgisayar bulunamadı.
        // Artık otomatik kayıt açmıyoruz; kullanıcı önce FE'den bilgisayar oluşturmalı.
        console.log('❌ RegisterRemoteComputer: No matching computer found for API key hash', {
          agentId,
          providedKeyHashPrefix: `${providedKeyHash.substring(0, 16)}...`,
        })
        return generateResponse({
          isSuccess: false,
          message:
            "Bu API key ile eşleşen bir bilgisayar bulunamadı. Lütfen önce web arayüzünden bilgisayar oluşturun ve size verilen API key'i kullanın.",
          errors: 'No computer found for this API key. Create a computer from the web UI first.',
          status: 404,
          request: req,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: 'Remote computer registered',
        data: {
          id,
          agentId,
          hostname,
          platform: body.platform,
          arch: body.arch,
          schema_name: schemaName,
        },
        request: req,
      })
    },
  })
}
