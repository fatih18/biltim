/**
 * SessionStore Test Script
 *
 * Bu script hem Dapr hem de Redis mode'larını test eder.
 *
 * Kullanım:
 *   bun run src/services/Auth/SessionStore/test.ts
 *
 * Test etmek için .env dosyasında USE_DAPR_FOR_REDIS değerini değiştirin:
 *   USE_DAPR_FOR_REDIS=false  # Redis mode
 *   USE_DAPR_FOR_REDIS=true   # Dapr mode
 */

import type { AuthSessionRecord } from './index'
import { DeleteSession, GetSession, SaveSession, UpdateSession } from './index'

async function testSessionStore() {
  const USE_DAPR = process.env.USE_DAPR_FOR_REDIS === 'true'

  console.log('\n🧪 SessionStore Test')
  console.log('=====================')
  console.log(`📦 Mode: ${USE_DAPR ? 'Dapr State Store' : 'Direct Redis'}`)
  console.log('=====================\n')

  const sessionId = `test_session_${Date.now()}`
  const userId = 'test_user_123'

  try {
    // 1. Create Session
    console.log('1️⃣  Creating session...')
    const testSession: AuthSessionRecord = {
      sessionId,
      userId,
      refreshTokenHash: `test_hash_${Math.random()}`,
      deviceFingerprint: 'test_fp_123',
      ip: '127.0.0.1',
      userAgent: 'Test Agent',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    await SaveSession(testSession)
    console.log('   ✅ Session created:', sessionId)

    // 2. Get Session
    console.log('\n2️⃣  Getting session...')
    const retrieved = await GetSession(sessionId)
    if (retrieved) {
      console.log('   ✅ Session retrieved')
      console.log('   📋 User ID:', retrieved.userId)
      console.log('   📋 IP:', retrieved.ip)
      console.log('   📋 Device:', retrieved.deviceFingerprint)
    } else {
      console.log('   ❌ Session not found!')
    }

    // 3. Update Session
    console.log('\n3️⃣  Updating session...')
    const updated = await UpdateSession(sessionId, {
      ip: '192.168.1.100',
      userAgent: 'Updated Agent',
    })
    if (updated) {
      console.log('   ✅ Session updated')
      console.log('   📋 New IP:', updated.ip)
      console.log('   📋 New User Agent:', updated.userAgent)
      console.log('   📋 Last Active:', updated.lastActiveAt)
    } else {
      console.log('   ❌ Session update failed!')
    }

    // 4. Verify Update
    console.log('\n4️⃣  Verifying update...')
    const verified = await GetSession(sessionId)
    if (verified) {
      const ipMatches = verified.ip === '192.168.1.100'
      const uaMatches = verified.userAgent === 'Updated Agent'
      console.log('   IP matches:', ipMatches ? '✅' : '❌')
      console.log('   User Agent matches:', uaMatches ? '✅' : '❌')
    }

    // 5. Delete Session
    console.log('\n5️⃣  Deleting session...')
    await DeleteSession(sessionId)
    console.log('   ✅ Session deleted')

    // 6. Verify Deletion
    console.log('\n6️⃣  Verifying deletion...')
    const deleted = await GetSession(sessionId)
    if (deleted === null) {
      console.log('   ✅ Session successfully removed')
    } else {
      console.log('   ❌ Session still exists!')
    }

    console.log('\n✅ All tests passed!\n')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('\n💡 Tips:')
    if (!USE_DAPR) {
      console.error('   - Ensure Redis is running: redis-cli ping')
      console.error('   - Check REDIS_HOST and REDIS_PORT in .env')
    } else {
      console.error('   - Ensure Dapr sidecar is running')
      console.error('   - Check Dapr state store configuration')
      console.error('   - Verify AUTH_V2_SESSION_STORE in .env')
    }
    process.exit(1)
  }
}

// Run tests
testSessionStore()
