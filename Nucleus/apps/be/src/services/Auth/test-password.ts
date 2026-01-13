/**
 * Password Hash Test Script
 *
 * Bu script HashPassword ve ComparePassword fonksiyonlarını test eder.
 *
 * Kullanım:
 *   bun run src/services/Auth/test-password.ts
 */

import { ComparePassword } from './ComparePassword'
import { HashPassword } from './HashPassword'

async function testPasswordFunctions() {
  console.log('\n🧪 Password Functions Test')
  console.log('===========================\n')

  const testPassword = 'Test1234!'
  console.log('📝 Test Password:', testPassword)
  console.log('📏 Length:', testPassword.length)

  try {
    // 1. Hash Password
    console.log('\n1️⃣  Hashing password...')
    const hashed = await HashPassword(testPassword)
    console.log('   ✅ Hash created')
    console.log('   📋 Hash:', hashed)
    console.log('   📏 Hash Length:', hashed.length)
    console.log('   🔖 Prefix:', hashed.substring(0, 7))

    // 2. Compare with correct password
    console.log('\n2️⃣  Testing with CORRECT password...')
    const correctMatch = await ComparePassword(testPassword, hashed)
    console.log('   Result:', correctMatch ? '✅ Match!' : '❌ No match')

    // 3. Compare with wrong password
    console.log('\n3️⃣  Testing with WRONG password...')
    const wrongMatch = await ComparePassword('WrongPassword123!', hashed)
    console.log('   Result:', wrongMatch ? '❌ Should not match!' : '✅ Correctly rejected')

    // 4. Test with trimmed vs untrimmed
    console.log('\n4️⃣  Testing trim behavior...')
    const passwordWithSpace = 'Test1234! '
    const trimmedPassword = passwordWithSpace.trim()

    console.log('   Password with space:', `"${passwordWithSpace}"`)
    console.log('   Trimmed password:', `"${trimmedPassword}"`)
    console.log(
      '   Are they equal?',
      passwordWithSpace === trimmedPassword ? '❌ No' : '✅ Yes (different)'
    )

    const hashedWithSpace = await HashPassword(passwordWithSpace)
    const matchWithSpace = await ComparePassword(trimmedPassword, hashedWithSpace)
    console.log(
      '   Hash with space vs trimmed:',
      matchWithSpace ? '❌ Matches (BUG!)' : '✅ Does not match (expected)'
    )

    // 5. Test the exact scenario from your register/login
    console.log('\n5️⃣  Simulating Register → Login flow...')

    // Simulate register (with trim)
    const registerPassword = ' Test1234! '.trim()
    const registerHash = await HashPassword(registerPassword)
    console.log('   📝 Register password (trimmed):', `"${registerPassword}"`)
    console.log('   🔐 Register hash:', `${registerHash.substring(0, 20)}...`)

    // Simulate login WITHOUT trim (old bug)
    const loginPasswordOld = ' Test1234! '
    const matchOld = await ComparePassword(loginPasswordOld, registerHash)
    console.log(
      '   ❌ Login WITHOUT trim:',
      `"${loginPasswordOld}"`,
      '→',
      matchOld ? '✅ Match' : '❌ No match (BUG!)'
    )

    // Simulate login WITH trim (fixed)
    const loginPasswordNew = ' Test1234! '.trim()
    const matchNew = await ComparePassword(loginPasswordNew, registerHash)
    console.log(
      '   ✅ Login WITH trim:',
      `"${loginPasswordNew}"`,
      '→',
      matchNew ? '✅ Match' : '❌ No match'
    )

    console.log('\n✅ All tests completed!\n')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testPasswordFunctions()
