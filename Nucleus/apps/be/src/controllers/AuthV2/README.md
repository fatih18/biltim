# AuthV2 Controllers

Modern JWT + Dapr Session Store tabanlı authentication akışı. Mevcut PASETO akışıyla birlikte çalışır.

## Özellikler

- ✅ JWT Access + Refresh Token (env-configured)
- ✅ Dapr State Store (Redis) ile session yönetimi
- ✅ Device fingerprinting (IP + User-Agent)
- ✅ Refresh token rotation
- ✅ HttpOnly, Secure cookie'ler
- ✅ Bcrypt + Argon2 password hashing desteği
- ✅ Detaylı validasyon error response'ları
- ✅ Identity middleware ile dual flow (JWT öncelikli, PASETO fallback)

## API Endpoints

### POST /v2/auth/register
Yeni kullanıcı kaydı. Email/password doğrulama, hash, session oluşturma ve cookie set.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "isSuccess": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJ...",
    "sessionId": "uuid"
  }
}
```

**Cookies Set:**
- `nucleus_access_token` (30m expiry)
- `nucleus_refresh_token` (30d expiry)

---

### POST /v2/auth/login
Kullanıcı girişi. Password doğrulama, failed attempt tracking, account lock logic.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "isSuccess": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJ...",
    "sessionId": "uuid"
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Account locked (5 failed attempts, 30 min lock)
- `404`: User not found

---

### POST /v2/auth/refresh
Access token yenileme. Refresh token + device fingerprint doğrulama.

**Request:** (cookie'den otomatik okunur)

**Response (200):**
```json
{
  "isSuccess": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJ...",
    "sessionId": "uuid"
  }
}
```

**Error Responses:**
- `401`: Invalid/expired refresh token, session not found
- `403`: Device fingerprint mismatch

---

### POST /v2/auth/logout
Session silme ve cookie temizleme.

**Request:** (cookie'den otomatik okunur)

**Response (200):**
```json
{
  "isSuccess": true,
  "message": "Logout successful",
  "data": { "message": "Session cleared successfully" }
}
```

---

### GET /v2/auth/me
Mevcut kullanıcı bilgilerini getir (profile, address, phone, files, claims relations dahil).

**Request:** (access token cookie'den otomatik okunur)

**Response (200):**
```json
{
  "isSuccess": true,
  "message": "User found",
  "data": {
    "id": "...",
    "email": "...",
    "profile": { "first_name": "...", "last_name": "..." },
    "address": [...],
    "phone": [...],
    "files": [...],
    "claims": [...]
  }
}
```

**Error Responses:**
- `401`: Invalid/missing access token
- `404`: User data not found

---

## Environment Variables

```env
# JWT Configuration (REQUIRED)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30m
JWT_ISSUER=nucleus-auth
JWT_AUDIENCE=
JWT_ALGORITHM=HS256

# Refresh Token Configuration
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_ISSUER=nucleus-auth
JWT_REFRESH_AUDIENCE=
JWT_REFRESH_ALGORITHM=HS256

# Cookie Configuration
AUTH_V2_ACCESS_COOKIE_NAME=nucleus_access_token
AUTH_V2_REFRESH_COOKIE_NAME=nucleus_refresh_token
AUTH_V2_COOKIE_SAME_SITE=strict

# Session Store (Dapr Redis)
AUTH_V2_SESSION_STORE=statestore-redis
AUTH_V2_SESSION_PREFIX=session
AUTH_V2_SESSION_TTL_SECONDS=2592000

# Password Hashing
BCRYPT_SALT_ROUNDS=12
```

## Identity Middleware Behavior

Middleware öncelik sırası:
1. **AuthV2 JWT Cookie** (`nucleus_access_token`) varsa doğrula ve profile header set et
2. JWT yoksa veya geçersizse → **PASETO cookie** (`PASETO_COOKIE_NAME`) varsa doğrula
3. İkisi de yoksa → public path değilse unauthorized

Bu sayede her iki akış da aynı anda desteklenir; kullanıcı hangi cookie'si varsa o akış çalışır.

## Controller Yapısı

Tüm controller'lar `withChecks` wrapper'ı kullanır (try/catch yok, error handling utils'de):

```typescript
export async function LoginV2(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'AuthV2 Login',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      // Business logic
      // DB operations
      // issueSessionTokens helper call
      // return generateResponse
    }
  })
}
```

**Helpers:**
- `getCompanyInfoFromHeaders(req)` - company_info header'dan tenant bilgisi
- `getProfileFromHeaders(req)` - profile header'dan user bilgisi (middleware set eder)
- `issueSessionTokens({ req, user, session? })` - Token + session oluşturma ve cookie set

## Session Store (Dapr State)

Session kayıtları Redis'te şu yapıda saklanır:

```typescript
{
  sessionId: string
  userId: string
  refreshTokenHash: string  // SHA256 hash
  deviceFingerprint?: string // IP+UA hash
  ip?: string
  userAgent?: string
  createdAt: string
  lastActiveAt: string
  expiresAt: string
}
```

**Key Format:** `session:{sessionId}`  
**TTL:** `AUTH_V2_SESSION_TTL_SECONDS` (default: 30 days)

## Servis Katmanı

Tüm auth business logic `@/services/Auth` altında:

- **Password:** `HashPassword`, `ComparePassword` (argon2 + bcrypt support)
- **Token Gen:** `GenerateAccessToken`, `GenerateRefreshToken`
- **Token Val:** `ValidateAccessToken`, `ValidateRefreshToken`
- **Token Payload:** `BuildTokenPayload`, `ExtractTokenPayload`
- **Session:** `SaveSession`, `GetSession`, `UpdateSession`, `DeleteSession`
- **Cookie:** `setAuthCookies`, `clearAuthCookies`, `getAuthCookies`
- **Device:** `GenerateDeviceFingerprint`, `ValidateDeviceFingerprint`
- **Refresh:** `HashRefreshToken`, `CompareRefreshToken`

Detaylı kullanım için: `apps/be/src/services/Auth/README.md`

## Migration Path

Mevcut PASETO akışından AuthV2'ye geçiş:

1. **Env değişkenlerini ekle** (en azından `JWT_SECRET` required)
2. **Identity middleware otomatik olarak her iki akışı destekler** (değişiklik gerekmez)
3. **Frontend'de yeni endpoint'leri kullan:** `/v2/auth/login`, `/v2/auth/register` vs.
4. **Cookie isimleri farklı** olduğu için iki akış충돌 충돌하지 않습니다 충돌하지 않습니다
5. İsteğe bağlı: Eski kullanıcıları migrate et veya paralel çalıştır

## Security Features

- ✅ HttpOnly + Secure + SameSite cookies
- ✅ Refresh token rotation (her refresh'te yeni token)
- ✅ Refresh token hash storage (plain text yok)
- ✅ Device fingerprinting ile multi-device isolation
- ✅ Failed login attempt tracking + account lockout
- ✅ JWT expiry validation
- ✅ Session TTL yönetimi (Dapr TTL metadata)
- ✅ Bcrypt/Argon2 password hashing (backward compatible)

## Testing

```bash
# Register
curl -X POST http://localhost:4000/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Login
curl -X POST http://localhost:4000/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' \
  -c cookies.txt

# Get Me
curl -X GET http://localhost:4000/v2/auth/me \
  -b cookies.txt

# Refresh
curl -X POST http://localhost:4000/v2/auth/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:4000/v2/auth/logout \
  -b cookies.txt
```

## Troubleshooting

**Problem:** JWT_SECRET eksik hatası  
**Solution:** `.env` dosyasına `JWT_SECRET` ekle

**Problem:** Session bulunamıyor  
**Solution:** Dapr sidecar çalışıyor mu kontrol et, `statestore-redis` component tanımlı mı?

**Problem:** Device fingerprint mismatch  
**Solution:** IP/User-Agent değişti mi? Test için `deviceFingerprint` undefined gönder

**Problem:** Cookie set edilmiyor  
**Solution:** `secure: true` kullanıyorsan HTTPS gerekli, local test için env'de `secure: false` yap

---

Bu akış dokümandaki auth flow'a uygun olarak tasarlandı ve mevcut PASETO akışını bozmadan eklenmiştir.
