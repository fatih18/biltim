export type ValidationResult = {
  isValid: boolean
  errors?: {
    email?: string
    password?: string
  }
}

export function ValidateFormat(email: string, password: string): ValidationResult {
  const errors: { email?: string; password?: string } = {}

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !email.trim()) {
    errors.email = 'Email is required'
  } else if (!emailRegex.test(email)) {
    errors.email = 'Invalid email format'
  }

  // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  // Special characters allowed but not required
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/
  if (!password || !password.trim()) {
    errors.password = 'Password is required'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long'
  } else if (!passwordRegex.test(password)) {
    errors.password = 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number'
  }

  const hasErrors = Object.keys(errors).length > 0

  return {
    isValid: !hasErrors,
    errors: hasErrors ? errors : undefined,
  }
}
