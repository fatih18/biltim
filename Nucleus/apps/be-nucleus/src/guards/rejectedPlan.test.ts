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
  const ID = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'

  it('wants at least one key: an empty body closes nothing', () => {
    expect(isClosureOnlyWrite({}, ID)).toBe(false)
  })

  it('accepts the closing keys in both spellings, and nothing else', () => {
    expect(isClosureOnlyWrite({ status: 'closed', photo_after_url: 'x', closed_at: 'd' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ status: 'closed', photo_after_files: [], photo_after_file_id: 'x', completed_at: 'd' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ status: 'closed', photoAfterFiles: [], photoAfterFileId: 'x', completedAt: 'd' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ photoAfterUrl: 'x', closedAt: 'd' }, ID)).toBe(true)
  })

  it('refuses one key beside them: the before photo, a move, a switch-off, the description', () => {
    for (const extra of ['photo_before_url', 'audit_id', 'is_active', 'description', 'due_date', 'finding_no']) {
      expect(isClosureOnlyWrite({ status: 'closed', photo_after_url: 'x', [extra]: 'y' }, ID)).toBe(false)
    }
  })

  it('treats the target id the client repeats in the body as neutral (bulgular page bodies)', () => {
    const after = { photo_after_files: [], photo_after_file_id: 'f1', photo_after_url: '/cdn/f1' }
    expect(isClosureOnlyWrite({ _id: ID, ...after, status: 'closed' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ _id: ID, photoAfterFiles: [], photoAfterFileId: 'f1', photoAfterUrl: '/cdn/f1' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ _id: ID, status: 'in_progress' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ _id: ID.toUpperCase(), status: 'closed' }, ID)).toBe(true)
    expect(isClosureOnlyWrite({ id: ID, status: 'closed' }, ID)).toBe(true)
  })

  it('still needs a closing key, and refuses an id of another finding or anything beside it', () => {
    expect(isClosureOnlyWrite({ _id: ID }, ID)).toBe(false)
    expect(isClosureOnlyWrite({ _id: ID, description: 'x' }, ID)).toBe(false)
    expect(isClosureOnlyWrite({ _id: ID, status: 'closed', description: 'x' }, ID)).toBe(false)
    expect(isClosureOnlyWrite({ _id: 'another', status: 'closed' }, ID)).toBe(false)
    expect(isClosureOnlyWrite({ id: 'another', status: 'closed' }, ID)).toBe(false)
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
