export function unwrapProxy(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (seen.has(value as object)) {
    return '[circular]'
  }
  seen.add(value as object)

  const maybeProxy = value as { get?: () => unknown }
  if (typeof maybeProxy.get === 'function') {
    try {
      const unwrapped = maybeProxy.get()
      return unwrapProxy(unwrapped, seen)
    } catch {
      return '[unavailable]'
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => unwrapProxy(item, seen))
  }

  const result: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    result[key] = unwrapProxy(nested, seen)
  }

  return result
}
