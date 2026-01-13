import { HashPassword } from '../HashPassword'
import { ValidateFormat } from '../ValidateFormat'

export async function ValidatedUser(email: string, password: string) {
  const validation = ValidateFormat(email, password)

  if (!validation.isValid) {
    const errorMessages = Object.values(validation.errors || {}).join(', ')
    throw new Error(errorMessages || 'Invalid email or password format')
  }

  const hashedPassword = await HashPassword(password)

  return {
    email,
    password: hashedPassword,
  }
}
