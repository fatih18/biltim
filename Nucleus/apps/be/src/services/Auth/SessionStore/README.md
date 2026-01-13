# Session Store

Auth V2 için session yönetim servisi. Hem **Dapr State Store** hem de **direkt Redis** desteği ile çalışır.

## Özellikler

- ✅ **Dual Mode**: Dapr veya direkt Redis kullanımı
- ✅ **Otomatik TTL**: Session'lar otomatik olarak expire olur
- ✅ **Type-Safe**: TypeScript ile tam tip desteği
- ✅ **Environment Based**: Ortama göre otomatik provider seçimi

## Konfigürasyon

### Environment Variables

```bash
# Session Store Ayarları
AUTH_V2_SESSION_STORE=statestore-redis    # Dapr state store adı
AUTH_V2_SESSION_PREFIX=session             # Redis key prefix
AUTH_V2_SESSION_TTL_SECONDS=2592000        # 30 gün

# Provider Seçimi
USE_DAPR_FOR_REDIS=false                   # false = Direkt Redis, true = Dapr

# Redis Ayarları (USE_DAPR_FOR_REDIS=false ise)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## Kullanım

### Session Kaydetme

```typescript
import { SaveSession } from '@/services/Auth/SessionStore'

await SaveSession({
  sessionId: 'sess_123',
  userId: 'user_456',
  refreshTokenHash: 'hash...',
  deviceFingerprint: 'fp_789',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
})
```

### Session Okuma

```typescript
import { GetSession } from '@/services/Auth/SessionStore'

const session = await GetSession('sess_123')
if (session) {
  console.log('User ID:', session.userId)
}
```

### Session Güncelleme

```typescript
import { UpdateSession } from '@/services/Auth/SessionStore'

const updated = await UpdateSession('sess_123', {
  lastActiveAt: new Date().toISOString(),
  ip: '192.168.1.2',
})
```

### Session Silme

```typescript
import { DeleteSession } from '@/services/Auth/SessionStore'

await DeleteSession('sess_123')
```

## Provider Seçimi

### Dapr Mode (Üretim/K8s)

```bash
USE_DAPR_FOR_REDIS=true
```

- Dapr sidecar üzerinden Redis'e bağlanır
- K8s ortamında önerilen mod
- Retry, circuit breaker, observability gibi Dapr özellikleri

### Direct Redis Mode (Development/Standalone)

```bash
USE_DAPR_FOR_REDIS=false
```

- Doğrudan Redis client ile bağlanır
- Local development için ideal
- Daha hızlı, daha basit

## Redis Key Formatı

Session'lar Redis'te şu formatta saklanır:

```
session:sess_123
session:sess_456
session:sess_789
```

Prefix `AUTH_V2_SESSION_PREFIX` environment variable ile özelleştirilebilir.

## TTL (Time To Live)

Session'lar otomatik olarak expire olur:

- **Varsayılan**: 30 gün (2592000 saniye)
- **Özelleştirme**: `AUTH_V2_SESSION_TTL_SECONDS` ile ayarlanabilir
- **Her save işleminde**: TTL yeniden set edilir

## Type Definitions

```typescript
export type AuthSessionRecord = {
  sessionId: string              // Unique session ID
  userId: string                 // User ID
  refreshTokenHash: string       // Hashed refresh token
  deviceFingerprint?: string     // Device fingerprint
  ip?: string                    // IP address
  userAgent?: string            // User agent string
  createdAt: string             // ISO 8601 timestamp
  lastActiveAt: string          // ISO 8601 timestamp
  expiresAt: string             // ISO 8601 timestamp
}
```

## Best Practices

1. **Session ID**: Kriptografik olarak güvenli random string kullanın
2. **Refresh Token**: Hash'lenmiş olarak saklayın, plaintext saklamayın
3. **TTL**: Güvenlik ve UX dengesini kurun (çok uzun = güvensiz, çok kısa = kötü UX)
4. **Update**: Her request'te `lastActiveAt` güncelleyin
5. **Cleanup**: Logout'ta mutlaka session'ı silin

## Örnek Akış

```typescript
// 1. Login - Session oluştur
const sessionId = generateSessionId()
const refreshTokenHash = await hashRefreshToken(refreshToken)

await SaveSession({
  sessionId,
  userId: user.id,
  refreshTokenHash,
  deviceFingerprint,
  ip,
  userAgent,
  createdAt: now,
  lastActiveAt: now,
  expiresAt: later,
})

// 2. Request - Session doğrula
const session = await GetSession(sessionId)
if (!session) {
  throw new Error('Invalid session')
}

// 3. Refresh - Session güncelle
await UpdateSession(sessionId, {
  lastActiveAt: new Date().toISOString(),
})

// 4. Logout - Session sil
await DeleteSession(sessionId)
```

## Monitoring

### Dapr Mode

Dapr dashboard'tan metrics görebilirsiniz:
- State store operations
- Latency
- Error rates

### Direct Redis Mode

Redis CLI ile monitoring:

```bash
# Session sayısı
redis-cli KEYS "session:*" | wc -l

# Belirli bir session'ı görüntüle
redis-cli GET "session:sess_123"

# TTL kontrolü
redis-cli TTL "session:sess_123"
```

## Troubleshooting

### Session bulunamıyor

1. Redis bağlantısını kontrol edin
2. Key prefix'i doğrulayın
3. TTL'in expire olmadığını kontrol edin

### Dapr connection error

1. Dapr sidecar'ın çalıştığından emin olun
2. State store bileşeninin yapılandırıldığını kontrol edin
3. Dapr logs'ları inceleyin

### Redis connection error

1. Redis host/port'u doğrulayın
2. Network connectivity kontrol edin
3. Redis authentication gerekiyorsa env var'ları set edin
