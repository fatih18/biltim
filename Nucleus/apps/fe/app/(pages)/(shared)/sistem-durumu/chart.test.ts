import { describe, expect, it } from 'bun:test'
import { peakOf, series, sparkPoints, spanMinutes, statsOf, valueAt } from './chart'

const snap = (ts: number, cpu: number, rpm: number, p95 = 10, err = 0) => ({
  timestamp: ts,
  system: { cpu: { usage: cpu } },
  application: { requests: { perMinute: rpm }, responseTime: { p95 }, errors: { rate: err } },
})

describe('valueAt', () => {
  it('reads a nested metric', () => {
    expect(valueAt(snap(1, 31.2, 40), 'system.cpu.usage')).toBe(31.2)
  })

  it('answers null for a path that is not there, rather than NaN', () => {
    for (const path of ['system.gpu.usage', 'nope', 'system.cpu', 'system.cpu.usage.deeper']) {
      expect(valueAt(snap(1, 1, 1), path)).toBeNull()
    }
  })

  it('refuses a non-finite reading', () => {
    expect(valueAt({ a: { b: Number.NaN } }, 'a.b')).toBeNull()
    expect(valueAt({ a: { b: 'yüksek' } }, 'a.b')).toBeNull()
  })
})

describe('series', () => {
  it('keeps the order and drops the gaps', () => {
    const snaps = [snap(1, 10, 1), { timestamp: 2 }, snap(3, 30, 1)]
    expect(series(snaps, 'system.cpu.usage')).toEqual([10, 30])
  })
})

describe('statsOf', () => {
  it('reports the range, the mean and where it ended', () => {
    expect(statsOf([10, 50, 30])).toEqual({ min: 10, max: 50, avg: 30, last: 30 })
  })

  it('answers null for nothing, so a caller cannot print a zero it never measured', () => {
    expect(statsOf([])).toBeNull()
  })
})

describe('sparkPoints', () => {
  it('measures from zero, not from the series minimum', () => {
    /*
     * A line that never drops below 30 must not be drawn as if it touches the
     * floor, or a metric that is flat-but-high reads as calm. Against a fixed
     * ceiling of 100, a 30..40 series stays in the lower third; scaling to the
     * series minimum instead would stretch it across the whole box.
     */
    const pts = sparkPoints([30, 40], 100, 20, 100).split(' ')
    const ys = pts.map((p) => Number(p.split(',')[1]))
    expect(ys[0]).toBeCloseTo(14, 1)
    expect(ys[1]).toBeCloseTo(12, 1)
  })

  it('puts a zero reading on the floor', () => {
    const pts = sparkPoints([0, 10], 100, 20).split(' ')
    expect(pts[0]).toBe('0.0,20.0')
  })

  it('puts the highest value at the top edge', () => {
    const pts = sparkPoints([0, 100], 100, 20).split(' ')
    expect(pts[1]).toBe('100.0,0.0')
  })

  it('draws a single reading without dividing by zero', () => {
    expect(sparkPoints([42], 100, 20)).toBe('50.0,0.0')
  })

  it('draws nothing for nothing', () => {
    expect(sparkPoints([], 100, 20)).toBe('')
  })

  it('honours a fixed ceiling so a percentage chart is not self-scaling', () => {
    // Against a 100 ceiling, 50 sits halfway — not at the top.
    const pts = sparkPoints([50], 100, 20, 100).split(',')
    expect(Number(pts[1])).toBeCloseTo(10, 1)
  })
})

describe('peakOf', () => {
  it('reports the busiest minute with the numbers from that moment', () => {
    const peak = peakOf([snap(1, 20, 40, 12, 0), snap(2, 74, 900, 210, 1.5), snap(3, 22, 60, 14, 0)])
    expect(peak?.requestsPerMinute).toBe(900)
    expect(peak?.cpu).toBe(74)
    expect(peak?.responseTime).toBe(210)
    expect(peak?.errorRate).toBe(1.5)
    expect(peak?.at).toBe(2)
  })

  it('answers null for an install that has served nothing', () => {
    // Better to say "not measured yet" than to project capacity from idle.
    expect(peakOf([])).toBeNull()
    expect(peakOf([snap(1, 5, 0)])).toBeNull()
  })
})

describe('spanMinutes', () => {
  it('reports what the history actually covers, not what was asked for', () => {
    expect(spanMinutes([snap(0, 1, 1), snap(600_000, 1, 1)])).toBe(10)
  })

  it('answers null when there is not enough to span', () => {
    expect(spanMinutes([])).toBeNull()
    expect(spanMinutes([snap(1, 1, 1)])).toBeNull()
  })
})
