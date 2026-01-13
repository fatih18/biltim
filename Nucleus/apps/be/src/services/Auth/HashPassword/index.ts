import bcrypt from 'bcryptjs'

export async function HashPassword(password: string) {
  const defaultRounds = 12
  const roundsFromEnv = Number(process.env.BCRYPT_SALT_ROUNDS ?? defaultRounds)
  const saltRounds =
    Number.isFinite(roundsFromEnv) && roundsFromEnv > 0 ? roundsFromEnv : defaultRounds

  return await bcrypt.hash(password, saltRounds)
}
