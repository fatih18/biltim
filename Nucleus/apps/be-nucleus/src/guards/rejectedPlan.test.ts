import { describe, expect, it } from 'bun:test'
import type { Caller } from './caller'
import { isClosureOnlyWrite, mayCloseFindings, rejectionColumnsIn } from './rejectedPlan'

const caller = (userId: string, roles: string[], isGod = false): Caller => ({ userId, isGod, roles })

describe('rejectionColumnsIn', () => {
  it('finds the three columns in any spelling', () => {
    const body = { rejectionReason: 1, rejected_at: 2, 'Rejected-By': 3, REJECTION_REASON: 4, status: 'x' }
    expect(rejectionColumnsIn(body)).toEqual(['rejectionReason', 'rejected_at', 'Rejected-By', 'REJECTION_REASON'])
  })

  it('finds nothing in a body that merely mentions rejection', () => {
    expect(rejectionColumnsIn({ status: 'rejected', reason: 'x', rejection: 1, planned_date: 'y' })).toEqual([])
    expect(rejectionColumnsIn({})).toEqual([])
  })
})

describe('isClosureOnlyWrite', () => {
  it('wants at least one key: an empty body closes nothing', () => {
    expect(isClosureOnlyWrite({})).toBe(false)
  })

  it('accepts the closing keys in both spellings, and nothing else', () => {
    expect(isClosureOnlyWrite({ status: 'closed', photo_after_url: 'x', closed_at: 'd' })).toBe(true)
    expect(isClosureOnlyWrite({ status: 'closed', photo_after_files: [], photo_after_file_id: 'x', completed_at: 'd' })).toBe(true)
    expect(isClosureOnlyWrite({ status: 'closed', photoAfterFiles: [], photoAfterFileId: 'x', completedAt: 'd' })).toBe(true)
    expect(isClosureOnlyWrite({ photoAfterUrl: 'x', closedAt: 'd' })).toBe(true)
  })

  it('refuses one key beside them: the before photo, a move, a switch-off, the description', () => {
    for (const extra of ['photo_before_url', 'audit_id', 'is_active', 'description', 'due_date', 'finding_no']) {
      expect(isClosureOnlyWrite({ status: 'closed', photo_after_url: 'x', [extra]: 'y' })).toBe(false)
    }
  })
})

describe('mayCloseFindings', () => {
  it('is the Saha Sorumlusu and the central roles, the godmin included', () => {
    for (const roles of [['field manager'], ['manager'], ['content manager core team'], ['super admin'], ['auditor', 'field manager']]) {
      expect(mayCloseFindings(caller('u-1', roles))).toBe(true)
    }
    expect(mayCloseFindings(caller('u-god', [], true))).toBe(true)
  })

  it('is nobody else: an auditor who only audits, a basic account, an unknown caller', () => {
    expect(mayCloseFindings(caller('u-1', ['auditor']))).toBe(false)
    expect(mayCloseFindings(caller('u-1', ['basic']))).toBe(false)
    expect(mayCloseFindings(caller('u-1', []))).toBe(false)
    expect(mayCloseFindings(null)).toBe(false)
  })
})
