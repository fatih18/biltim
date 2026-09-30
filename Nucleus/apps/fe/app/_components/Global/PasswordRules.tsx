import { CheckCircle2, Circle } from 'lucide-react'
import nucleusConfig from '../../../../be-nucleus/config.json'

/*
 * Şifre kuralının ekrandaki hâli ve sunucu cevabının Türkçesi.
 *
 * İki şifre ekranı da kuralı söylemiyordu; "sunucu reddederse sebebini
 * söyler" deniyordu. Söylemiyordu: kendi şifresini değiştiren kişi yalnızca
 * "Password too weak" görüyordu (asıl sebep cevabın `errors` dizisindeydi ve
 * okunmuyordu), yönetici ise İngilizce bir cümleyle baş başa kalıyordu.
 *
 * Kuralın iki ayrı kaynağı var ve ikisi AYNI DEĞİL:
 *
 *  - `POST /auth/password-change` (kişinin kendisi) kurulumun
 *    `authentication.passwordPolicy` ayarını uyguluyor. Ayar buradan, sunucunun
 *    okuduğu config.json'dan okunuyor — ikinci bir kopya yok, kayamaz.
 *  - `POST /auth/admin/set-user-password` (yönetici) kurulu sürümde (0.10.115)
 *    kurulumun ayarını HİÇ okumuyor, kütüphanenin varsayılanını uyguluyor: en
 *    az 8 karakter, büyük harf, küçük harf, rakam. Yönetici için ikisinin
 *    SIKI olanı alınıyor; böylece sunucu ileride ayarı okumaya başlasa da
 *    burada "geçerli" denen şifre orada reddedilmiyor.
 */

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecialChar: boolean
  specialChars?: string
}

type DeclaredConfig = {
  authentication?: { passwordPolicy?: Partial<PasswordPolicy> }
}

/** nucleus'un politika verilmediğinde uyguladığı kural (passwordPolicy.ts). */
const LIBRARY_DEFAULT: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
}

const declared = (nucleusConfig as unknown as DeclaredConfig).authentication?.passwordPolicy ?? {}

/**
 * Kişinin kendi şifresini değiştirirken uyduğu kural.
 *
 * Alt sınır 8'in altına inmiyor: uç, gövde şemasında `newPassword` için 8
 * karakteri kural çalışmadan önce istiyor.
 */
export const SELF_SERVICE_PASSWORD_POLICY: PasswordPolicy = {
  minLength: Math.max(8, declared.minLength ?? LIBRARY_DEFAULT.minLength),
  maxLength: declared.maxLength ?? LIBRARY_DEFAULT.maxLength,
  requireUppercase: declared.requireUppercase ?? LIBRARY_DEFAULT.requireUppercase,
  requireLowercase: declared.requireLowercase ?? LIBRARY_DEFAULT.requireLowercase,
  requireNumber: declared.requireNumber ?? LIBRARY_DEFAULT.requireNumber,
  requireSpecialChar: declared.requireSpecialChar ?? LIBRARY_DEFAULT.requireSpecialChar,
  specialChars: declared.specialChars,
}

/** Yöneticinin başkası için koyduğu şifrenin kuralı — yukarıdaki notun ikinci maddesi. */
export const ADMIN_SET_PASSWORD_POLICY: PasswordPolicy = {
  minLength: Math.max(LIBRARY_DEFAULT.minLength, SELF_SERVICE_PASSWORD_POLICY.minLength),
  maxLength: Math.min(LIBRARY_DEFAULT.maxLength, SELF_SERVICE_PASSWORD_POLICY.maxLength),
  requireUppercase:
    LIBRARY_DEFAULT.requireUppercase || SELF_SERVICE_PASSWORD_POLICY.requireUppercase,
  requireLowercase:
    LIBRARY_DEFAULT.requireLowercase || SELF_SERVICE_PASSWORD_POLICY.requireLowercase,
  requireNumber: LIBRARY_DEFAULT.requireNumber || SELF_SERVICE_PASSWORD_POLICY.requireNumber,
  requireSpecialChar: SELF_SERVICE_PASSWORD_POLICY.requireSpecialChar,
  specialChars: SELF_SERVICE_PASSWORD_POLICY.specialChars,
}

// Sunucunun özel karakter saydığı küme, `specialChars` verilmediğinde.
const DEFAULT_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

interface PasswordRule {
  id: string
  /** Listede görünen hâli. */
  label: string
  /** Uyulmadığında söylenen cümle. */
  problem: string
  isMet: (password: string) => boolean
}

/*
 * Harf kontrolleri sunucudakiyle birebir: `[A-Z]` ve `[a-z]`. Yani Ç, Ğ, İ,
 * Ö, Ş, Ü (ve küçükleri, ı dahil) büyük/küçük harf SAYILMIYOR — "Şifre2024"
 * yazan kişinin neden reddedildiğini anlayabilmesi için bu listede yazıyor.
 */
function rulesFor(policy: PasswordPolicy): PasswordRule[] {
  const rules: PasswordRule[] = [
    {
      id: 'min',
      label: `En az ${policy.minLength} karakter`,
      problem: `Şifre en az ${policy.minLength} karakter olmalı.`,
      isMet: (password) => password.length >= policy.minLength,
    },
  ]
  if (policy.requireUppercase) {
    rules.push({
      id: 'upper',
      label: 'En az bir büyük harf (A–Z; Türkçe harfler sayılmıyor)',
      problem: 'Şifrede en az bir büyük harf (A–Z) olmalı.',
      isMet: (password) => /[A-Z]/.test(password),
    })
  }
  if (policy.requireLowercase) {
    rules.push({
      id: 'lower',
      label: 'En az bir küçük harf (a–z; Türkçe harfler sayılmıyor)',
      problem: 'Şifrede en az bir küçük harf (a–z) olmalı.',
      isMet: (password) => /[a-z]/.test(password),
    })
  }
  if (policy.requireNumber) {
    rules.push({
      id: 'number',
      label: 'En az bir rakam (0–9)',
      problem: 'Şifrede en az bir rakam olmalı.',
      isMet: (password) => /[0-9]/.test(password),
    })
  }
  if (policy.requireSpecialChar) {
    const allowed = policy.specialChars?.trim()
    rules.push({
      id: 'special',
      label: allowed ? `Şu karakterlerden en az biri: ${allowed}` : 'En az bir özel karakter (!, @, # …)',
      problem: allowed
        ? `Şifrede şu karakterlerden en az biri olmalı: ${allowed}`
        : 'Şifrede en az bir özel karakter olmalı.',
      isMet: (password) =>
        allowed ? [...password].some((ch) => allowed.includes(ch)) : DEFAULT_SPECIAL.test(password),
    })
  }
  return rules
}

/** Şifrenin bu kurala uymayan yanları, Türkçe cümle olarak; uyuyorsa boş. */
export function passwordProblems(policy: PasswordPolicy, password: string): string[] {
  const problems = rulesFor(policy)
    .filter((rule) => !rule.isMet(password))
    .map((rule) => rule.problem)
  if (password.length > policy.maxLength) {
    problems.push(`Şifre en fazla ${policy.maxLength} karakter olabilir.`)
  }
  return problems
}

/** Kuralın kendisi, yazılan şifreye göre işaretlenmiş hâliyle. */
export function PasswordRuleList({
  policy,
  password,
}: {
  policy: PasswordPolicy
  password: string
}) {
  return (
    <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-4 py-3">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Şifre kuralı</p>
      <ul className="mt-2 space-y-1">
        {rulesFor(policy).map((rule) => {
          const met = password.length > 0 && rule.isMet(password)
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-xs ${
                met
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {met ? (
                <CheckCircle2 size={14} aria-hidden="true" />
              ) : (
                <Circle size={14} aria-hidden="true" />
              )}
              {rule.label}
              <span className="sr-only">{met ? ' (sağlandı)' : ' (sağlanmadı)'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/*
 * Sunucunun cümleleri → Türkçe.
 *
 * Tanınmayan cümle olduğu gibi kalıyor: çevirisi yok diye bir sebebi yutmak,
 * kişiyi yine neyi düzelteceğini bilmeden bırakmak olurdu.
 */
const SERVER_REASONS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Password must be at least (\d+) characters?$/i, (m) => `Şifre en az ${m[1]} karakter olmalı.`],
  [/^Password must be at most (\d+) characters?$/i, (m) => `Şifre en fazla ${m[1]} karakter olabilir.`],
  [/^Password must contain (an )?uppercase letter$/i, () => 'Şifrede en az bir büyük harf (A–Z) olmalı.'],
  [/^Password must contain (a )?lowercase letter$/i, () => 'Şifrede en az bir küçük harf (a–z) olmalı.'],
  [/^Password must contain a number$/i, () => 'Şifrede en az bir rakam olmalı.'],
  [/^Password must contain a special character$/i, () => 'Şifrede en az bir özel karakter olmalı.'],
  [
    /^Password must contain one of these characters: (.+)$/i,
    (m) => `Şifrede şu karakterlerden en az biri olmalı: ${m[1]}`,
  ],
  [/^Password is too common$/i, () => 'Bu şifre çok yaygın, kolayca tahmin edilir.'],
  [
    /^Password must not contain your email or username$/i,
    () => 'Şifre e-posta adresini ya da kullanıcı adını içeremez.',
  ],
  [/^Password (is )?too weak$/i, () => 'Şifre kurala uymuyor.'],
  [/^New passwords do not match$/i, () => 'Yeni şifreler birbirini tutmuyor.'],
  [/^Current password is incorrect$/i, () => 'Mevcut şifre yanlış.'],
  [/^Current password is required$/i, () => 'Mevcut şifrenizi girmeniz gerekiyor.'],
  [/^User not found$/i, () => 'Kullanıcı bulunamadı.'],
  [
    /^Forbidden: godmin privileges required$/i,
    () => 'Bu işlem yalnızca godmin yetkisiyle yapılabilir.',
  ],
  [
    /^Forbidden\s*[—-]\s*only godmin can hard-delete users$/i,
    () => 'Kullanıcı silmek yalnızca godmin yetkisiyle yapılabilir.',
  ],
  [/^Cannot hard-delete yourself$/i, () => 'Kendi hesabınızı silemezsiniz.'],
  [/^Cannot hard-delete a godmin user$/i, () => 'Godmin hesabı silinemez.'],
  [
    /^Hard delete failed and was rolled back/i,
    () =>
      'Kullanıcı silinemedi, hiçbir şey değişmedi: bu kişiye bağlı kayıtlar var (denetim, onay akışı vb.). Silmek yerine hesabı pasif yapın.',
  ],
  [/^Email already registered$/i, () => 'Aynı mail adresiyle iki kere kayıt yapılamaz.'],
  [/^Failed to create user$/i, () => 'Kullanıcı oluşturulamadı.'],
  [/^Forbidden$/i, () => 'Bu işlem için yetkiniz yok.'],
  [/^Account is locked$/i, () => 'Hesabınız kilitli olduğu için bu işlem yapılamıyor.'],
  [/^Account is not active$/i, () => 'Hesabınız etkin olmadığı için bu işlem yapılamıyor.'],
  [/^(Unauthorized|Authentication required)$/i, () => 'Oturumunuz kapanmış; yeniden giriş yapın.'],
]

function translateReason(text: string): string {
  const trimmed = text.trim()
  for (const [pattern, render] of SERVER_REASONS) {
    const match = trimmed.match(pattern)
    if (match) return render(match)
  }
  return trimmed
}

/*
 * Yöneticinin ucu sebepleri tek cümlede birleştiriyor
 * ("Password must contain uppercase letter Password must contain a number");
 * her biri ayrı çevrilebilsin diye "Password" başlangıçlarından bölünüyor.
 */
function splitJoined(text: string): string[] {
  return text.split(/\s+(?=Password\b)/).filter((part) => part.trim().length > 0)
}

function listMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      const message = (item as { message?: unknown } | null)?.message
      return typeof message === 'string' ? message : ''
    })
    .filter((message) => message.length > 0)
}

function rawMessages(error: unknown, depth = 0): string[] {
  if (!error || depth > 3) return []
  if (typeof error === 'string') return [error]
  if (typeof error !== 'object') return []

  const candidate = error as Record<string, unknown>

  // Ayrıntı varsa asıl sebep orada; üstteki `message` yalnız başlık
  // ("Password too weak") ve tek başına hiçbir şey söylemiyor.
  const detail = listMessages(candidate.errors)
  if (detail.length > 0) return detail
  if (candidate.errors && typeof candidate.errors === 'object') {
    const nested = rawMessages(candidate.errors, depth + 1)
    if (nested.length > 0) return nested
  }

  if (typeof candidate.message === 'string' && candidate.message) return [candidate.message]
  if (typeof candidate.error === 'string' && candidate.error) return [candidate.error]

  const response = candidate.response as { data?: unknown } | undefined
  return rawMessages(response?.data, depth + 1)
}

/**
 * Bir ret cevabındaki sebeplerin hepsi, tanınanlar Türkçeye çevrilmiş olarak.
 * Hiçbir şey okunamazsa boş dizi — çağıran kendi genel cümlesini koyar.
 */
export function readServerReasons(error: unknown): string[] {
  const reasons = rawMessages(error).flatMap(splitJoined).map(translateReason)
  return [...new Set(reasons.filter((reason) => reason.length > 0))]
}
