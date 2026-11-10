import { describe, expect, it } from 'bun:test'
import { FINDING_STATUSES, parseStatuses } from './findingStatuses'

describe('parseStatuses', () => {
  it('reads one status, as the export always took it', () => {
    for (const status of FINDING_STATUSES) expect(parseStatuses(status)).toEqual([status])
  })

  it('reads a comma list in the order given, each status once', () => {
    expect(parseStatuses('open,in_progress')).toEqual(['open', 'in_progress'])
    expect(parseStatuses('closed,open,closed')).toEqual(['closed', 'open'])
  })

  it('trims what surrounds a status', () => {
    expect(parseStatuses(' open , in_progress ')).toEqual(['open', 'in_progress'])
  })

  it('drops what is not a status, and names nothing for an empty or unknown value', () => {
    expect(parseStatuses('open,archived')).toEqual(['open'])
    expect(parseStatuses('')).toEqual([])
    expect(parseStatuses(',')).toEqual([])
    expect(parseStatuses('OPEN')).toEqual([])
  })
})
