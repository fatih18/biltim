/**
 * Tarihe dayalı günlük şifre oluşturucu
 * Her gün için benzersiz, deterministik bir şifre üretir
 */

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const DEFAULT_LENGTH = 256
const MIN_PER_TYPE = 4

/**
 * Belirli bir gün için deterministik şifre oluşturur
 * @param date - Şifrenin oluşturulacağı tarih (opsiyonel, varsayılan: bugün)
 * @param length - Şifre uzunluğu (varsayılan: 16)
 * @returns Oluşturulan şifre
 */
function generateDailyPassword(date: Date = new Date(), length: number = DEFAULT_LENGTH): string {
  // Tarihi YYYY-MM-DD formatına çevir (saat bilgisini yok say)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`

  // Tarihi seed olarak kullan
  const seed = hashString(dateString)
  const rng = seededRandom(seed)

  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL_CHARS
  let password = ''

  // En az MIN_PER_TYPE karakter türünden garanti et
  password += pickCharacters(UPPERCASE, MIN_PER_TYPE, rng)
  password += pickCharacters(LOWERCASE, MIN_PER_TYPE, rng)
  password += pickCharacters(NUMBERS, MIN_PER_TYPE, rng)
  password += pickCharacters(SPECIAL_CHARS, MIN_PER_TYPE, rng)

  // Geri kalan karakterleri rastgele ekle
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(rng() * allChars.length)]
  }

  // Karakterleri karıştır
  password = shuffleString(password, rng)

  return password
}

/**
 * Verilen şifrenin bugün için geçerli olup olmadığını kontrol eder
 * @param password - Kontrol edilecek şifre
 * @param date - Kontrol edilecek tarih (opsiyonel, varsayılan: bugün)
 * @returns Şifre geçerli ise true
 */
function checkDailyPassword(password: string, date: Date = new Date()): boolean {
  const expectedPassword = generateDailyPassword(date, password.length)
  if (password !== expectedPassword)
    console.log('Password is not valid', password, expectedPassword)
  return password === expectedPassword
}

/**
 * String'i basit bir hash'e çevirir (seed için)
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // 32-bit integer'a çevir
  }
  return Math.abs(hash)
}

/**
 * Seed'e dayalı deterministik rastgele sayı üreteci
 */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

/**
 * String'i deterministik olarak karıştırır
 */
function shuffleString(str: string, rng: () => number): string {
  const arr = str.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const current = arr[i]
    const target = arr[j]
    if (current === undefined || target === undefined) {
      continue
    }
    arr[i] = target
    arr[j] = current
  }
  return arr.join('')
}

/**
 * Belirli karakter setinden deterministik olarak karakter seçer
 */
function pickCharacters(charset: string, count: number, rng: () => number): string {
  let selection = ''
  for (let i = 0; i < count; i++) {
    selection += charset[Math.floor(rng() * charset.length)]
  }
  return selection
}

// Export fonksiyonlar (TypeScript modül kullanıyorsanız)
export { generateDailyPassword, checkDailyPassword }
