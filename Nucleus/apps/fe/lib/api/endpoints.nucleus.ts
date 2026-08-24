/**
 * Endpoint tanımları — tek kaynak backend'in config.json'u.
 *
 * Eskiden bu liste `@monorepo/db-entities/schemas` taranarak üretiliyordu; artık
 * backend'in kendi config'inden geliyor, yani bir tablo eklemek/çıkarmak için
 * frontend'de değişecek hiçbir şey yok. Anahtar adları eski üreticiyle aynı
 * kaldığı için (GET_FIVE_S_FINDINGS, ADD_BOARD_MEETING_DECISION …) çağrı
 * yerlerine dokunulmadı.
 */
import {
  generateAllEndpoints,
  generateSystemTableEndpoints,
} from 'nucleus-core-ts/client'
import type { BaseErrorResponse, EndpointDefinition } from 'nucleus-core-ts/client'

/**
 * The shape THIS app's screens actually receive, which is not the shape nucleus
 * declares.
 *
 * `UseNucleusApi` translates every response before a screen sees it: the extra
 * `{success, data}` wrapper is unwrapped, `{items, meta}` is republished as
 * `{data, pagination}` with the old field names, `/auth/me` is flattened, and
 * snake_case twins are added to every key. So the success value handed to
 * `onAfterHandle` is a translated record, and typing it as nucleus's own
 * `_success` describes a body no screen ever sees.
 *
 * 0.10 made that visible. `EndpointDefinition`'s success parameter now defaults
 * to a strict type instead of a loose one, and `onAfterHandle` is a function
 * PROPERTY, so under strictFunctionTypes its parameter is contravariant: a
 * screen writing `onAfterHandle: (row: {id?: string} | null) => …` stopped
 * being assignable. That produced 79 errors across 17 screens, none of which
 * was a real defect — every one was the compiler correctly reporting that the
 * declared type and the delivered value are different things.
 *
 * The success type is therefore deliberately open HERE, at the one seam that
 * does the translating, rather than papered over 79 times. The error type stays
 * declared, because that one IS accurate: refusals come through untranslated.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above — the translated body is per-screen
type TranslatedEndpoint = EndpointDefinition<any, any, BaseErrorResponse>
import nucleusConfig from '../../../be-nucleus/config.json'

// biome-ignore lint/suspicious/noExplicitAny: config.json is a plain JSON import
const generated = generateAllEndpoints(nucleusConfig as any) as Record<string, TranslatedEndpoint>
const systemTables = generateSystemTableEndpoints() as Record<string, TranslatedEndpoint>

/**
 * Üreticinin kapsamadığı rotalar. Üçe ayrılıyor:
 *
 * 1. Framework'te VAR ama endpoint üreticisine dahil olmayanlar (`/auth/me`,
 *    bildirim CRUD'u).
 * 2. Bu projeye özel elle yazılmış rotalar (rapor toplamları, Excel).
 * 3. Eski isimleriyle çağrılmaya devam eden takma adlar (`LOGIN_V2`), böylece
 *    26 ekranda çağrı satırı değişmedi.
 *
 * Yollar backend'in canlı /docs çıktısıyla doğrulandı; uydurma yol yok.
 */
const custom = {
  // 1 + 3 — kimlik
  GET_ME: { method: 'GET', path: '/auth/me' },
  GET_ME_V2: { method: 'GET', path: '/auth/me' },
  LOGIN_V2: { method: 'POST', path: '/auth/login' },
  LOGOUT_V2: { method: 'POST', path: '/auth/logout' },
  REGISTER_V2: { method: 'POST', path: '/auth/register' },
  REFRESH_V2: { method: 'POST', path: '/auth/refresh' },

  // 1 — bildirimler
  GET_NOTIFICATIONS: { method: 'GET', path: '/notifications/' },
  UPDATE_NOTIFICATION: { method: 'PATCH', path: '/notifications/:id' },

  // 1 — doğrulama akışı tabloları (nucleus bunları jenerik CRUD olarak sunuyor)
  GET_VERIFICATION_STEPS: { method: 'GET', path: '/verificationSteps/' },
  ADD_VERIFICATION_STEP: { method: 'POST', path: '/verificationSteps/' },
  DELETE_VERIFICATION_STEP: { method: 'DELETE', path: '/verificationSteps/:id' },
  GET_VERIFICATION_REQUIREMENTS: { method: 'GET', path: '/verificationRequirements/' },
  ADD_VERIFICATION_REQUIREMENT: { method: 'POST', path: '/verificationRequirements/' },
  DELETE_VERIFICATION_REQUIREMENT: { method: 'DELETE', path: '/verificationRequirements/:id' },
  GET_VERIFICATION_NOTIFICATION_RULES: { method: 'GET', path: '/verificationNotificationRules/' },
  ADD_VERIFICATION_NOTIFICATION_RULE: { method: 'POST', path: '/verificationNotificationRules/' },
  DELETE_VERIFICATION_NOTIFICATION_RULE: {
    method: 'DELETE',
    path: '/verificationNotificationRules/:id',
  },
  GET_VERIFICATION_NOTIFICATION_RECIPIENTS: {
    method: 'GET',
    path: '/verificationNotificationRecipients/',
  },
  ADD_VERIFICATION_NOTIFICATION_RECIPIENT: {
    method: 'POST',
    path: '/verificationNotificationRecipients/',
  },
  DELETE_VERIFICATION_NOTIFICATION_RECIPIENT: {
    method: 'DELETE',
    path: '/verificationNotificationRecipients/:id',
  },

  // 2 — bu projeye özel
  GET_REPORTS_DASHBOARD: { method: 'GET', path: '/reports/dashboard' },
} as unknown as Record<string, TranslatedEndpoint>

export const NucleusEndpoints = { ...systemTables, ...generated, ...custom }

export type NucleusEndpointKey = keyof typeof NucleusEndpoints & string

/** Eski `Endpoints` sabitiyle aynı şekli koruyan ad→ad haritası. */
export const Endpoints = Object.fromEntries(
  Object.keys(NucleusEndpoints).map((k) => [k, k])
) as Record<NucleusEndpointKey, NucleusEndpointKey>
