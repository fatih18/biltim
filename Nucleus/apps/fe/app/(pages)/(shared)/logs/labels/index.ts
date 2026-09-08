/**
 * The audit log records machine identifiers. This turns them into something a
 * person can read.
 *
 * Measured on the local database (927 rows): 640 rows carry the zero UUID as
 * the actor, 53 carry NULL and 10 point at a user that no longer exists — so
 * roughly three rows in four have no human actor at all, and printing a raw id
 * for them was noise standing in for information. `entity_name` arrives in
 * three different conventions plus bare URL segments (RoleClaims, users,
 * five_s_findings, fiveSLocations, auth, reports), because several writers
 * produce it. Both are normalised here rather than in the table markup.
 */

export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

export type ActorLabel = {
  text: string
  /** True when this is a person, so the table can show a person icon. */
  isPerson: boolean
  /** The full id, for the tooltip — never the visible text. */
  title?: string
}

export type ActorLookup = Map<string, { name?: string | null; email?: string | null }>

export function actorLabel(userId: string | null | undefined, users: ActorLookup): ActorLabel {
  if (!userId || userId === SYSTEM_ACTOR_ID) {
    return { text: 'Sistem', isPerson: false }
  }
  const user = users.get(userId)
  if (!user) {
    // The id is a real uuid but no user answers to it any more.
    return { text: 'Silinmiş kullanıcı', isPerson: false, title: userId }
  }
  const name = (user.name ?? '').trim()
  return { text: name || (user.email ?? '').trim() || 'Bilinmeyen kullanıcı', isPerson: true, title: user.email ?? userId }
}

/** Past-tense verbs, so a row reads as a sentence about what happened. */
const OPERATIONS: Record<string, string> = {
  INSERT: 'ekledi',
  CREATE: 'ekledi',
  UPDATE: 'güncelledi',
  PATCH: 'güncelledi',
  DELETE: 'sildi',
  SOFT_DELETE: 'arşivledi',
  GET: 'görüntüledi',
  READ: 'görüntüledi',
  LOGIN: 'giriş yaptı',
  LOGOUT: 'çıkış yaptı',
  LOGIN_FAILED: 'giriş denemesi başarısız',
  REGISTER: 'kayıt oldu',
  VERIFY: 'doğruladı',
  REJECT: 'reddetti',
  APPROVE: 'onayladı',
  ACTIVATE: 'etkinleştirdi',
  DEACTIVATE: 'devre dışı bıraktı',
  ERROR: 'hata aldı',
}

export function operationLabel(operation: string | null | undefined): string {
  const key = (operation ?? '').trim().toUpperCase()
  return OPERATIONS[key] ?? (key ? key.toLowerCase().replace(/_/g, ' ') : 'işlem yaptı')
}

/** Whether the operation changed anything, for colouring and for filtering. */
export function operationTone(operation: string | null | undefined): 'create' | 'update' | 'delete' | 'auth' | 'read' {
  const key = (operation ?? '').trim().toUpperCase()
  if (key === 'INSERT' || key === 'CREATE' || key === 'REGISTER') return 'create'
  if (key === 'UPDATE' || key === 'PATCH' || key === 'ACTIVATE' || key === 'DEACTIVATE' || key === 'APPROVE') return 'update'
  if (key === 'DELETE' || key === 'SOFT_DELETE' || key === 'REJECT') return 'delete'
  if (key.startsWith('LOGIN') || key === 'LOGOUT' || key === 'VERIFY' || key === 'ERROR') return 'auth'
  return 'read'
}

const ENTITIES: Record<string, string> = {
  five_s_findings: 'Bulgu',
  five_s_audits: 'Denetim',
  five_s_audit_plans: 'Denetim planı',
  five_s_audit_answers: 'Denetim yanıtı',
  five_s_audit_drafts: 'Denetim taslağı',
  five_s_audit_teams: 'Denetim ekibi',
  five_s_audit_team_members: 'Ekip üyesi',
  five_s_locations: 'Lokasyon',
  five_s_questions: 'Soru',
  five_s_steps: 'Adım',
  five_s_actions: 'Faaliyet',
  five_s_finding_types: 'Bulgu tipi',
  board_meeting_decisions: 'Kurul kararı',
  users: 'Kullanıcı',
  user_sessions: 'Oturum',
  profiles: 'Profil',
  roles: 'Rol',
  claims: 'Yetki',
  role_claims: 'Rol yetkisi',
  files: 'Dosya',
  notifications: 'Bildirim',
  audit_logs: 'Denetim kaydı',
  // Not tables at all — the auth middleware records the first URL segment.
  auth: 'Kimlik doğrulama',
  reports: 'Rapor',
  cdn: 'Dosya sunumu',
  root: 'Sistem',
}

/**
 * `entity_name` arrives as snake_case, camelCase, PascalCase or a URL segment
 * depending on which writer produced it, so it is folded to one key first.
 */
export function normalizeEntityKey(entityName: string | null | undefined): string {
  const raw = (entityName ?? '').trim()
  if (!raw) return ''
  return raw
    // An acronym boundary: `fiveSLocations` -> five_S_Locations. Without this
    // the S and the L stay glued and the key misses its map entry.
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

export function entityLabel(entityName: string | null | undefined): string {
  const key = normalizeEntityKey(entityName)
  if (!key) return 'Bilinmeyen'
  const known = ENTITIES[key]
  if (known) return known
  // Unknown table: still better read as words than as an identifier.
  return key
    .split('_')
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** "3 dakika önce" — the exact stamp stays in the tooltip. */
export function relativeTime(value: string | Date | null | undefined, now: Date): string {
  if (!value) return '-'
  const then = value instanceof Date ? value : new Date(value)
  const ms = now.getTime() - then.getTime()
  if (!Number.isFinite(ms)) return '-'
  if (ms < 0) return 'az sonra'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return 'az önce'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} dakika önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ay önce`
  return `${Math.floor(months / 12)} yıl önce`
}

/** The one-line sentence the row is really trying to say. */
export function eventSentence(
  actor: ActorLabel,
  operation: string | null | undefined,
  entityName: string | null | undefined
): string {
  return `${actor.text} ${operationLabel(operation)} · ${entityLabel(entityName)}`
}
