/**
 * Turning an hour of snapshots into something you can read at a glance.
 *
 * /monitoring/history answers 360 snapshots for the last 60 minutes — one every
 * ten seconds — each carrying the whole metric tree. A number on its own says
 * what is true now; the shape of the last hour says whether it is getting
 * worse, which is the question someone opens this screen to answer.
 *
 * Everything here is pure so it can be checked without a browser.
 */

export type Snapshot = Record<string, unknown>

/** Reads `system.cpu.usage` out of a snapshot, or null if it is not there. */
export function valueAt(snapshot: Snapshot, path: string): number | null {
  let node: unknown = snapshot
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object') return null
    node = (node as Record<string, unknown>)[key]
  }
  return typeof node === 'number' && Number.isFinite(node) ? node : null
}

/** The series for one metric, oldest first, with gaps dropped. */
export function series(snapshots: Snapshot[], path: string): number[] {
  return snapshots.map((s) => valueAt(s, path)).filter((v): v is number => v !== null)
}

export type Stats = { min: number; max: number; avg: number; last: number } | null

export function statsOf(values: number[]): Stats {
  if (values.length === 0) return null
  let min = values[0] as number
  let max = values[0] as number
  let sum = 0
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / values.length, last: values[values.length - 1] as number }
}

/**
 * An SVG polyline for a sparkline.
 *
 * The baseline is zero, not the series minimum: a CPU line that never drops
 * below 30% should not be drawn as if it touches the floor, or a flat-but-high
 * metric reads as calm. A series with one point draws a flat line rather than
 * dividing by zero.
 */
export function sparkPoints(values: number[], width: number, height: number, max?: number): string {
  if (values.length === 0) return ''
  const ceiling = Math.max(max ?? 0, ...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step : width / 2
      const y = height - (v / ceiling) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/**
 * The busiest minute this install has actually carried, with the numbers from
 * that moment attached.
 *
 * Deliberately the recorded peak and not a projection. Extrapolating capacity
 * from an idle system — "40 requests a minute at 12 ms, so it will do 40.000
 * at 12 ms" — has never been true of any server. What can be said honestly is
 * a floor: it served this much, and here is what CPU and errors looked like
 * while it did.
 */
export type Peak = {
  requestsPerMinute: number
  at: number | null
  cpu: number | null
  responseTime: number | null
  errorRate: number | null
} | null

export function peakOf(snapshots: Snapshot[]): Peak {
  let best: Snapshot | null = null
  let bestValue = -1
  for (const s of snapshots) {
    const rpm = valueAt(s, 'application.requests.perMinute')
    if (rpm !== null && rpm > bestValue) {
      bestValue = rpm
      best = s
    }
  }
  if (!best || bestValue <= 0) return null
  return {
    requestsPerMinute: bestValue,
    at: valueAt(best, 'timestamp'),
    cpu: valueAt(best, 'system.cpu.usage'),
    responseTime: valueAt(best, 'application.responseTime.p95'),
    errorRate: valueAt(best, 'application.errors.rate'),
  }
}

/** How long the history actually covers, which is not always what was asked for. */
export function spanMinutes(snapshots: Snapshot[]): number | null {
  if (snapshots.length < 2) return null
  const first = valueAt(snapshots[0] as Snapshot, 'timestamp')
  const last = valueAt(snapshots[snapshots.length - 1] as Snapshot, 'timestamp')
  if (first === null || last === null) return null
  return Math.max(0, Math.round((last - first) / 60000))
}
