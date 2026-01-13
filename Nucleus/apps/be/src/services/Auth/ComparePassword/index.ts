import argon2 from 'argon2'
import bcrypt from 'bcryptjs'

export async function ComparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  if (!hashedPassword) return false

  if (hashedPassword.startsWith('$argon2')) {
    try {
      return await argon2.verify(hashedPassword, plainPassword)
    } catch (error) {
      console.error('Failed to verify argon2 password', error)
      return false
    }
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    console.error('Failed to verify bcrypt password', error)
    return false
  }
}
