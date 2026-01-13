type ConvertibleRecord = Record<string, unknown>

export function convertDates<T extends ConvertibleRecord>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }

  const converted: ConvertibleRecord = { ...data }
  for (const [key, value] of Object.entries(converted)) {
    if (typeof value === 'string') {
      // Remove empty strings (they cause UUID validation errors)
      if (value === '') {
        delete converted[key]
        continue
      }
      // Check if it's an ISO date string
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
      if (isoDateRegex.test(value)) {
        converted[key] = new Date(value)
      }
    }
  }

  return converted as T
}
