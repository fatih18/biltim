# Identity Middleware

Multi-version authentication middleware supporting both PASETO (v1) and JWT-based AuthV2 (v2) systems.

## Features

- ✅ **Version-based auth**: Switch between PASETO and AuthV2 via environment variable
- ✅ **Multi-tenant support**: Handles tenant schema resolution
- ✅ **Public path bypass**: Auth-free routes for login, register, etc.
- ✅ **Dev bypass**: Skip auth with `x-dev-bypass: true` header

## Configuration

### Environment Variables

```bash
# Auth System Version
AUTH_VERSION=2              # 1 = PASETO (legacy), 2 = JWT AuthV2 (default)

# AuthV2 (version 2) Settings
AUTH_V2_ACCESS_COOKIE_NAME=nucleus_access_token
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30m

# PASETO (version 1) Settings
PASETO_COOKIE_NAME=auth_token
PASETO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
PASETO_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## Auth Versions

### Version 1: PASETO (Legacy)

**Use when:**
- Migrating from old system
- Need PASETO-specific features
- Running legacy clients

**Cookie:** `auth_token` (or custom via `PASETO_COOKIE_NAME`)

**Flow:**
1. Client sends PASETO token in cookie
2. Middleware verifies with public key
3. Sets `profile` header with user info

**Enable:**
```bash
AUTH_VERSION=1
```

### Version 2: JWT AuthV2 (Current) ⭐

**Use when:**
- New projects
- Need session management
- Want Redis/Dapr caching
- Modern JWT standard

**Cookies:**
- Access: `nucleus_access_token`
- Refresh: `nucleus_refresh_token`

**Flow:**
1. Client sends JWT access token in cookie
2. Middleware validates JWT signature
3. Checks session in Redis/Dapr
4. Sets `profile` header with user info

**Enable:**
```bash
AUTH_VERSION=2  # Default
```

## Public Paths

These paths bypass authentication:

```typescript
[
  '/auth/login',           // PASETO login
  '/auth/register',        // PASETO register
  '/auth/forgot-password',
  '/auth/reset-password',
  '/v2/auth/login',        // AuthV2 login
  '/v2/auth/register',     // AuthV2 register
  '/v2/auth/refresh',      // AuthV2 refresh
  '/v2/auth/logout',       // AuthV2 logout
  '/files/*',              // Static files
]
```

## Profile Header

After successful authentication, the middleware sets a `profile` header:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["user"],
  "session_id": "sess_123",
  "device_fingerprint": "fp_abc",
  "iat": 1234567890,
  "exp": 1234567890
}
```

This header can be accessed in controllers:

```typescript
const profile = JSON.parse(req.headers.get('profile') || '{}')
const userId = profile.sub
```

## Multi-Tenant Support

The middleware automatically resolves tenant schema based on subdomain:

```typescript
// Request: https://acme.yourapp.com/api/...
// → schema_name: "acme"

// Request: https://admin.yourapp.com/api/...
// → schema_name: "main"
```

**Disable multi-tenancy:**
```bash
IS_MULTI_TENANT=false  # Always use 'main' schema
```

## Dev Bypass

For development/testing, bypass auth with a header:

```bash
curl -H "x-dev-bypass: true" http://localhost:1001/protected-route
```

⚠️ **Never use in production!**

## Migration Guide

### From PASETO (v1) to AuthV2 (v2)

**Step 1: Update environment**
```bash
# .env
AUTH_VERSION=2

# Add AuthV2 configs
JWT_SECRET=your-secret-key
AUTH_V2_ACCESS_COOKIE_NAME=nucleus_access_token
AUTH_V2_REFRESH_COOKIE_NAME=nucleus_refresh_token
```

**Step 2: Update frontend**
```typescript
// Old (PASETO)
await fetch('/auth/login', { ... })

// New (AuthV2)
await fetch('/v2/auth/login', { ... })
```

**Step 3: Clear old cookies**
```typescript
// Frontend: Clear PASETO cookie
document.cookie = 'auth_token=; Max-Age=0'
```

**Step 4: Re-authenticate users**
- Users will need to login again
- Old PASETO tokens won't work with AuthV2

### Dual Support (Transition Period)

Not supported. Choose one version:
- `AUTH_VERSION=1` → Only PASETO
- `AUTH_VERSION=2` → Only AuthV2

## Error Handling

### No Token
```typescript
// Returns undefined (no error)
// Controller should handle 401 if needed
```

### Invalid Token
```typescript
// Returns Error
return new Error('Invalid or expired access token')
```

### Company Not Found (Multi-tenant)
```typescript
// Returns 404 Error
set.status = 404
return new Error('Company not found')
```

## Examples

### Version 2 (AuthV2) - Recommended

```bash
# .env
AUTH_VERSION=2
JWT_SECRET=my-super-secret-key-change-this
JWT_EXPIRES_IN=30m
AUTH_V2_ACCESS_COOKIE_NAME=nucleus_access_token

# Login
curl -X POST http://localhost:1001/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Test1234!"}'

# Access protected route (cookie sent automatically)
curl http://localhost:1001/auth/me \
  -H "Cookie: nucleus_access_token=eyJ..."
```

### Version 1 (PASETO) - Legacy

```bash
# .env
AUTH_VERSION=1
PASETO_COOKIE_NAME=auth_token
PASETO_PRIVATE_KEY="..."
PASETO_PUBLIC_KEY="..."

# Login
curl -X POST http://localhost:1001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Access protected route
curl http://localhost:1001/auth/me \
  -H "Cookie: auth_token=v2.local..."
```

## Troubleshooting

### "Invalid or expired access token"

**AuthV2 (v2):**
- Check JWT_SECRET matches
- Verify token hasn't expired
- Check session exists in Redis/Dapr
- Ensure skipPasswordHashing=true in register

**PASETO (v1):**
- Verify PASETO keys are correct
- Check token format (should start with `v2.local.`)
- Ensure token hasn't expired

### "No token found" (empty response)

- Check cookie name matches env config
- Verify cookie is being sent
- Ensure path isn't in publicPaths

### "Company not found" (multi-tenant)

- Check subdomain is correct
- Verify tenant exists in database
- Ensure tenant is active
- Check IS_MULTI_TENANT=true

## Performance Tips

1. **Cookie parsing**: Done once per request
2. **Token validation**: Cached in-memory (JWT)
3. **Schema resolution**: Cached per-tenant
4. **Public paths**: Skip auth completely

## Security Notes

1. ✅ HttpOnly cookies prevent XSS
2. ✅ Secure flag for HTTPS only
3. ✅ SameSite prevents CSRF
4. ✅ JWT signature validation
5. ✅ Session tracking in Redis
6. ⚠️ Disable dev bypass in production
7. ⚠️ Use strong JWT_SECRET (32+ chars)
8. ⚠️ Rotate secrets regularly
