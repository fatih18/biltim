# Auth Services

Pure business logic layer for authentication. Contains no database operations - those belong in controllers.

## Structure

### Password Management
- `HashPassword(password)` - Bcrypt hash with env-configured rounds
- `ComparePassword(plain, hashed)` - Verify password against hash

### Token Generation
- `GenerateAccessToken(payload)` - Create short-lived JWT (default 30m)
- `GenerateRefreshToken(payload)` - Create long-lived JWT (default 30d)

### Token Validation
- `ValidateAccessToken(token)` - Verify and decode access token
- `ValidateRefreshToken(token)` - Verify and decode refresh token

### Token Payload Utilities
- `BuildTokenPayload(input)` - Construct standardized JWT claims
- `ExtractTokenPayload(decoded)` - Parse validated token into typed structure

### Refresh Token Security
- `HashRefreshToken(token)` - SHA256 hash for storage
- `CompareRefreshToken(plain, hashed)` - Verify refresh token hash

### Session Management
- `GenerateSessionId()` - Create unique UUID for session tracking
- `GenerateRandomToken(length?)` - Create cryptographically secure random token (for email verification, password reset, etc.)
- `SessionStore` (`SaveSession`, `GetSession`, `UpdateSession`, `DeleteSession`) - Dapr-backed session persistence
- `getSessionTtlSeconds()` - Resolve TTL from env/fallback

### Device Fingerprinting
- `GenerateDeviceFingerprint({ ip, userAgent })` - Create device hash
- `ValidateDeviceFingerprint(stored, current)` - Verify device match

### Input Validation
- `ValidateFormat(email, password)` - Check email/password requirements, returns detailed validation result
- `ValidatedUser(email, password)` - Validate + hash in one step (throws on validation error)

### Cookie Helpers
- `setAuthCookies(req, accessToken, refreshToken, overrides?)` - Write access/refresh cookies with env-configured names
- `clearAuthCookies(req)` - Clear cookies (logout/revocation)
- `getAuthCookies(req)` - Read cookie header for tokens

## Usage Examples

### Register Flow
```typescript
import { ValidatedUser, GenerateSessionId, GenerateDeviceFingerprint, BuildTokenPayload, GenerateAccessToken, GenerateRefreshToken } from '@/services/Auth'

// In controller:
const { email, password: hashedPassword } = await ValidatedUser(email, rawPassword)
const sessionId = GenerateSessionId()
const deviceFingerprint = GenerateDeviceFingerprint({ ip, userAgent })

// Save user to DB (controller responsibility)
const user = await db.insert(...)

// Build tokens
const payload = BuildTokenPayload({
  userId: user.id,
  email: user.email,
  sessionId,
  deviceFingerprint,
})

const accessToken = GenerateAccessToken(payload)
const refreshToken = GenerateRefreshToken(payload)
const refreshTokenHash = HashRefreshToken(refreshToken)

// Save session to DB/Redis (controller responsibility)
await saveSession({ sessionId, userId, refreshTokenHash, deviceFingerprint })
```

### Login Flow
```typescript
import { ComparePassword, GenerateSessionId, BuildTokenPayload, GenerateAccessToken, GenerateRefreshToken, HashRefreshToken } from '@/services/Auth'

// In controller:
const user = await db.findByEmail(email)
const isValid = await ComparePassword(rawPassword, user.password)

if (!isValid) throw new Error('Invalid credentials')

// Generate new session
const sessionId = GenerateSessionId()
const payload = BuildTokenPayload({ userId: user.id, email: user.email, sessionId })

const accessToken = GenerateAccessToken(payload)
const refreshToken = GenerateRefreshToken(payload)

// Save session (controller)
await saveSession({ sessionId, userId: user.id, refreshTokenHash: HashRefreshToken(refreshToken) })
```

### Token Refresh Flow
```typescript
import { ValidateRefreshToken, ExtractTokenPayload, ValidateDeviceFingerprint, GenerateAccessToken } from '@/services/Auth'

// In controller:
const result = ValidateRefreshToken(refreshToken)
if (!result.isValid) throw new Error('Invalid refresh token')

const { sessionId, deviceFingerprint } = ExtractTokenPayload(result.payload)

// Fetch session from DB (controller)
const session = await db.findSession(sessionId)

// Verify device
if (deviceFingerprint && !ValidateDeviceFingerprint(session.deviceFingerprint, currentDevice)) {
  throw new Error('Device mismatch')
}

// Generate new access token
const newPayload = BuildTokenPayload({ userId: session.userId, sessionId })
const newAccessToken = GenerateAccessToken(newPayload)
```

### Protected Route Validation
```typescript
import { ValidateAccessToken, ExtractTokenPayload } from '@/services/Auth'

// In middleware:
const result = ValidateAccessToken(token)
if (!result.isValid) return unauthorized()

const { userId, sessionId, roles } = ExtractTokenPayload(result.payload)

// Attach to request context
req.user = { userId, sessionId, roles }
```

## Environment Variables

```env
# Required
JWT_SECRET=your-secret-key

# Optional (with defaults)
JWT_EXPIRES_IN=30m
JWT_ISSUER=nucleus-auth
JWT_ALGORITHM=HS256
JWT_AUDIENCE=

# Refresh token (falls back to access token config)
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_ALGORITHM=HS256
JWT_REFRESH_AUDIENCE=

# Password hashing
BCRYPT_SALT_ROUNDS=12
```

## Design Principles

1. **Pure Functions** - No side effects, no DB calls
2. **Single Responsibility** - Each function does one thing
3. **Composability** - Functions can be combined in controllers
4. **Type Safety** - Full TypeScript support with explicit types
5. **Environment-Driven** - All config from env vars with sensible defaults
