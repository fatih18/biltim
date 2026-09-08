import { describe, expect, it } from 'bun:test'
import { checkTone, formatBytes, formatUptime, percent, usageTone } from './useSystemStatus'

describe('formatBytes', () => {
  it('scales to the unit a person reads', () => {
    // Live snapshot values from this machine.
    expect(formatBytes(17179869184)).toBe('16 GB')
    expect(formatBytes(1631376)).toBe('1.6 MB')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('shows a dash rather than NaN when the metric is absent', () => {
    for (const v of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatBytes(v as number)).toBe('—')
    }
  })
})

describe('formatUptime', () => {
  it('reads as elapsed time at every scale', () => {
    expect(formatUptime(45)).toBe('45 saniye')
    expect(formatUptime(125)).toBe('2 dakika')
    expect(formatUptime(7200)).toBe('2 saat 0 dakika')
    expect(formatUptime(90000)).toBe('1 gün 1 saat')
  })

  it('refuses a negative or missing uptime instead of printing one', () => {
    expect(formatUptime(-5)).toBe('—')
    expect(formatUptime(undefined)).toBe('—')
  })
})

describe('usageTone', () => {
  it('turns amber at 80 and red at 90', () => {
    // Measured on this host while building the screen: memory 97.6, disk 90.4.
    expect(usageTone(31.2)).toBe('ok')
    expect(usageTone(79.9)).toBe('ok')
    expect(usageTone(80)).toBe('warn')
    expect(usageTone(89.9)).toBe('warn')
    expect(usageTone(90.4)).toBe('bad')
    expect(usageTone(97.6)).toBe('bad')
  })

  it('stays neutral when there is no reading, rather than reporting healthy', () => {
    expect(usageTone(undefined)).toBe('neutral')
    expect(usageTone(Number.NaN)).toBe('neutral')
  })
})

describe('checkTone', () => {
  it('reads the readiness probe', () => {
    // {"status":"ready","checks":{"database":"ok","redis":"ok"}}
    expect(checkTone('ok')).toBe('ok')
    expect(checkTone('error')).toBe('bad')
    expect(checkTone('down')).toBe('bad')
  })

  it('does not claim health for a missing check', () => {
    expect(checkTone(undefined)).toBe('neutral')
  })
})

describe('percent', () => {
  it('formats one decimal', () => {
    expect(percent(69.113)).toBe('%69.1')
    expect(percent(0)).toBe('%0.0')
  })
  it('shows a dash for a missing value', () => {
    expect(percent(undefined)).toBe('—')
  })
})
