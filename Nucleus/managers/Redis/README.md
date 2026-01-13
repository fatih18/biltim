# Redis Manager

Monorepo için merkezi Redis client manager. TypeScript ile tip güvenli Redis operasyonları.

## Özellikler

- ✅ **Singleton Pattern**: Tek bir client instance
- ✅ **Auto Connect**: İlk kullanımda otomatik bağlanır
- ✅ **Type-Safe**: Generic tip desteği
- ✅ **TTL Support**: Otomatik expiration
- ✅ **JSON Serialization**: Object'leri otomatik serialize/deserialize eder
- ✅ **Environment Based**: .env'den konfigürasyon

## Kurulum

```bash
bun add redis
```

## Konfigürasyon

### Environment Variables

```bash
REDIS_HOST=localhost      # Redis host adresi
REDIS_PORT=6379          # Redis port
REDIS_DB=0               # Database numarası (0-15)
REDIS_PASSWORD=secret    # Şifre (opsiyonel)
```

## API

### set(key, value, options?)

Redis'e veri yazar.

```typescript
import * as RedisManager from '@monorepo/redis-manager'

// String değer
await RedisManager.set('user:123', 'John Doe')

// Object değer (otomatik JSON serialize)
await RedisManager.set('user:123', { name: 'John', age: 30 })

// TTL ile (5 dakika)
await RedisManager.set('session:abc', sessionData, { ttl: 300 })

// NX mode: Key yoksa set et
await RedisManager.set('lock:resource', 'locked', { mode: 'NX', ttl: 60 })

// XX mode: Key varsa set et
await RedisManager.set('counter:views', 100, { mode: 'XX' })
```

**Parameters:**
- `key: string` - Redis key
- `value: unknown` - Değer (string veya serializable object)
- `options?: SetOptions`
  - `ttl?: number` - Expire süresi (saniye)
  - `mode?: 'NX' | 'XX'` - NX: key yoksa set et, XX: key varsa set et

**Returns:** `Promise<'OK' | null>`

### get<T>(key)

Redis'ten veri okur.

```typescript
// String değer
const name = await RedisManager.get<string>('user:123')

// Object değer (otomatik JSON parse)
const user = await RedisManager.get<{ name: string; age: number }>('user:123')

// Null check
if (user) {
  console.log(user.name)
}
```

**Parameters:**
- `key: string` - Redis key

**Returns:** `Promise<T | null>`

### del(key)

Redis'ten veri siler.

```typescript
const deleted = await RedisManager.del('user:123')
console.log(`${deleted} key silindi`)
```

**Parameters:**
- `key: string` - Redis key

**Returns:** `Promise<number>` - Silinen key sayısı

### exists(key)

Key'in var olup olmadığını kontrol eder.

```typescript
const hasUser = await RedisManager.exists('user:123')
if (hasUser) {
  console.log('User exists')
}
```

**Parameters:**
- `key: string` - Redis key

**Returns:** `Promise<boolean>`

### ttl(key)

Key'in kalan TTL süresini döndürür.

```typescript
const remaining = await RedisManager.ttl('session:abc')

if (remaining === -1) {
  console.log('Key has no expiration')
} else if (remaining === -2) {
  console.log('Key does not exist')
} else {
  console.log(`Key expires in ${remaining} seconds`)
}
```

**Parameters:**
- `key: string` - Redis key

**Returns:** `Promise<number>` - TTL (saniye), -1 (süresiz), -2 (key yok)

### keys(pattern)

Pattern'e uyan tüm keyleri getirir.

```typescript
// Tüm user keylerini getir
const userKeys = await RedisManager.keys('user:*')

// Session keylerini getir
const sessions = await RedisManager.keys('session:*')

// Tüm keyleri getir (dikkatli kullanın!)
const allKeys = await RedisManager.keys('*')
```

**Parameters:**
- `pattern: string` - Glob pattern

**Returns:** `Promise<string[]>`

### disconnect()

Redis bağlantısını kapatır.

```typescript
await RedisManager.disconnect()
```

## Kullanım Örnekleri

### Cache Pattern

```typescript
async function getUserById(id: string) {
  const cacheKey = `user:${id}`
  
  // Cache'den oku
  const cached = await RedisManager.get<User>(cacheKey)
  if (cached) {
    return cached
  }
  
  // DB'den oku
  const user = await db.users.findById(id)
  
  // Cache'e yaz (1 saat TTL)
  await RedisManager.set(cacheKey, user, { ttl: 3600 })
  
  return user
}
```

### Distributed Lock

```typescript
async function acquireLock(resource: string, ttl = 10) {
  const lockKey = `lock:${resource}`
  const result = await RedisManager.set(lockKey, 'locked', { 
    mode: 'NX', 
    ttl 
  })
  
  return result === 'OK'
}

async function releaseLock(resource: string) {
  const lockKey = `lock:${resource}`
  await RedisManager.del(lockKey)
}
```

### Session Store

```typescript
async function saveSession(sessionId: string, data: SessionData) {
  const key = `session:${sessionId}`
  await RedisManager.set(key, data, { ttl: 1800 }) // 30 dakika
}

async function getSession(sessionId: string) {
  const key = `session:${sessionId}`
  return await RedisManager.get<SessionData>(key)
}

async function deleteSession(sessionId: string) {
  const key = `session:${sessionId}`
  await RedisManager.del(key)
}
```

### Rate Limiting

```typescript
async function checkRateLimit(userId: string, limit = 10, window = 60) {
  const key = `ratelimit:${userId}`
  
  const current = await RedisManager.get<number>(key)
  
  if (!current) {
    await RedisManager.set(key, 1, { ttl: window })
    return true
  }
  
  if (current >= limit) {
    return false
  }
  
  await RedisManager.set(key, current + 1, { ttl: window })
  return true
}
```

### Leaderboard

```typescript
// Redis sorted sets için genişletilebilir
async function updateScore(userId: string, score: number) {
  const key = `scores:${userId}`
  await RedisManager.set(key, score)
}

async function getTopPlayers(count = 10) {
  const keys = await RedisManager.keys('scores:*')
  const scores = await Promise.all(
    keys.map(async (key) => ({
      userId: key.replace('scores:', ''),
      score: await RedisManager.get<number>(key) || 0
    }))
  )
  
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}
```

## Best Practices

### 1. Key Naming Convention

```typescript
// ✅ İyi: namespace:entity:id
'user:123'
'session:abc123'
'cache:product:456'

// ❌ Kötü: düz string
'user123'
'mydata'
```

### 2. TTL Kullanımı

```typescript
// ✅ Cache için TTL kullan
await RedisManager.set('cache:user:123', user, { ttl: 3600 })

// ✅ Temporary data için TTL kullan
await RedisManager.set('otp:user:123', code, { ttl: 300 })

// ⚠️ Kalıcı veri için TTL kullanma
await RedisManager.set('user:config:123', config) // TTL yok
```

### 3. Error Handling

```typescript
try {
  const user = await RedisManager.get<User>('user:123')
  if (!user) {
    // Key bulunamadı
    return null
  }
  return user
} catch (error) {
  // Redis bağlantı hatası
  console.error('Redis error:', error)
  // Fallback to database
  return await db.users.findById('123')
}
```

### 4. Type Safety

```typescript
// ✅ İyi: Tip belirt
interface User {
  name: string
  email: string
}
const user = await RedisManager.get<User>('user:123')

// ❌ Kötü: any kullan
const user = await RedisManager.get('user:123') // type: unknown
```

## Performance Tips

1. **Batch Operations**: Birden fazla key için loop yerine Promise.all kullanın
2. **Key Pattern**: `keys()` yerine belirli key'leri kullanın (production'da)
3. **Connection Pooling**: Singleton pattern ile tek client instance
4. **Serialization**: Büyük object'ler için compression düşünün

## Monitoring

Redis CLI ile monitoring:

```bash
# Bağlantı kontrolü
redis-cli PING

# Key sayısı
redis-cli DBSIZE

# Memory kullanımı
redis-cli INFO memory

# Slow queries
redis-cli SLOWLOG GET 10

# Real-time monitoring
redis-cli MONITOR
```

## Troubleshooting

### Connection Errors

```typescript
// ✅ Retry logic ekle
async function setWithRetry(key: string, value: unknown, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await RedisManager.set(key, value)
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### Memory Issues

```typescript
// ✅ TTL kullan
await RedisManager.set('temp:data', value, { ttl: 3600 })

// ✅ Eski key'leri temizle
const oldKeys = await RedisManager.keys('cache:old:*')
await Promise.all(oldKeys.map(key => RedisManager.del(key)))
```

## Migration Guide

### From Dapr State Store

```typescript
// Before (Dapr)
await daprManager.state.save([{ key, value }])
const value = await daprManager.state.get(key)

// After (Redis Manager)
await RedisManager.set(key, value)
const value = await RedisManager.get(key)
```

### From node-redis Direct

```typescript
// Before (node-redis)
const client = createClient()
await client.connect()
await client.set(key, JSON.stringify(value))
const raw = await client.get(key)
const value = JSON.parse(raw)

// After (Redis Manager)
await RedisManager.set(key, value)
const value = await RedisManager.get(key)
```
