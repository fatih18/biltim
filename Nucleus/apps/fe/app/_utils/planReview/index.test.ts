import { describe, expect, it } from 'bun:test'
import { auditStatusLabelTr } from '../StatusLabels'
import {
  canCorrectRejectedPlan,
  canRejectPlan,
  checkRejectReason,
  correctionBannerText,
  formatRejectedAt,
  isCarriedOutPlan,
  isOnPlanTeam,
  isPlanRejected,
  REJECT_REASON_MAX,
  REJECT_REASON_MIN,
  reasonLength,
  serverMessageOf,
  shouldResendAfterCorrection,
} from './index'

describe('status label', () => {
  it('shows a rejected plan as "Düzeltme Bekliyor"', () => {
    expect(auditStatusLabelTr('rejected')).toBe('Düzeltme Bekliyor')
    expect(auditStatusLabelTr(' Rejected ')).toBe('Düzeltme Bekliyor')
  })

  it('keeps the other labels', () => {
    expect(auditStatusLabelTr('pending_approval')).toBe('Onay Bekliyor')
    expect(auditStatusLabelTr('completed')).toBe('Tamamlandı')
  })
})

describe('canRejectPlan', () => {
  it('is an admin on a sent audit', () => {
    expect(canRejectPlan({ status: 'pending_approval', isAdmin: true })).toBe(true)
  })

  it('is not offered to anyone who is not an admin (Müdür, auditor, field manager)', () => {
    expect(canRejectPlan({ status: 'pending_approval', isAdmin: false })).toBe(false)
  })

  it('is not offered on any other status', () => {
    for (const status of ['planned', 'rejected', 'completed', 'cancelled', '']) {
      expect(canRejectPlan({ status, isAdmin: true })).toBe(false)
    }
  })
})

describe('canCorrectRejectedPlan', () => {
  const rejected = { status: 'rejected', auditId: 'audit-1' }

  it('is the plan team and admins', () => {
    expect(canCorrectRejectedPlan({ ...rejected, isAdmin: false, isTeamMember: true })).toBe(true)
    expect(canCorrectRejectedPlan({ ...rejected, isAdmin: true, isTeamMember: false })).toBe(true)
  })

  it('is nobody else', () => {
    expect(canCorrectRejectedPlan({ ...rejected, isAdmin: false, isTeamMember: false })).toBe(false)
  })

  it('needs a rejected plan with its audit', () => {
    for (const status of ['planned', 'pending_approval', 'completed', 'cancelled']) {
      expect(canCorrectRejectedPlan({ status, auditId: 'audit-1', isAdmin: true, isTeamMember: true })).toBe(false)
    }
    expect(canCorrectRejectedPlan({ status: 'rejected', auditId: null, isAdmin: true, isTeamMember: true })).toBe(false)
    expect(canCorrectRejectedPlan({ status: 'rejected', auditId: '', isAdmin: true, isTeamMember: true })).toBe(false)
  })
})

describe('isOnPlanTeam', () => {
  it('finds the team among the person teams, folding case', () => {
    expect(isOnPlanTeam('AB-12', ['x', 'ab-12'])).toBe(true)
  })

  it('is false for another team, an empty id or no teams', () => {
    expect(isOnPlanTeam('t1', ['t2'])).toBe(false)
    expect(isOnPlanTeam('', [''])).toBe(false)
    expect(isOnPlanTeam(null, ['t1'])).toBe(false)
    expect(isOnPlanTeam('t1', [])).toBe(false)
  })
})

describe('plan state helpers', () => {
  it('knows a rejected plan', () => {
    expect(isPlanRejected('rejected')).toBe(true)
    for (const status of ['planned', 'pending_approval', 'completed', 'cancelled', '', null, undefined]) {
      expect(isPlanRejected(status)).toBe(false)
    }
  })

  it('treats a rejected plan as carried out, like a sent or approved one', () => {
    for (const status of ['rejected', 'pending_approval', 'completed']) expect(isCarriedOutPlan(status)).toBe(true)
    for (const status of ['planned', 'cancelled', '', null]) expect(isCarriedOutPlan(status)).toBe(false)
  })

  it('resends after a correction only on a rejected plan', () => {
    expect(shouldResendAfterCorrection('rejected')).toBe(true)
    for (const status of ['pending_approval', 'completed', 'planned', undefined]) {
      expect(shouldResendAfterCorrection(status)).toBe(false)
    }
  })
})

describe('checkRejectReason', () => {
  it('accepts the limits, trimmed', () => {
    expect(checkRejectReason('  abcde  ')).toEqual({ ok: true, reason: 'abcde' })
    const longest = 'a'.repeat(REJECT_REASON_MAX)
    expect(checkRejectReason(longest)).toEqual({ ok: true, reason: longest })
  })

  it('refuses nothing and too little, and says how much is there', () => {
    const empty = checkRejectReason('   ')
    expect(empty.ok).toBe(false)
    const short = checkRejectReason('a'.repeat(REJECT_REASON_MIN - 1))
    expect(short.ok).toBe(false)
    if (!short.ok) expect(short.message).toContain(`en az ${REJECT_REASON_MIN}`)
  })

  it('refuses too much', () => {
    const long = checkRejectReason('a'.repeat(REJECT_REASON_MAX + 1))
    expect(long.ok).toBe(false)
    if (!long.ok) expect(long.message).toContain(`en fazla ${REJECT_REASON_MAX}`)
  })

  it('counts what the server counts: the trimmed text', () => {
    expect(reasonLength('  abc  ')).toBe(3)
    expect(reasonLength('')).toBe(0)
  })
})

describe('serverMessageOf', () => {
  it('reads an object and the first of a list', () => {
    expect(serverMessageOf({ message: ' Denetim zaten onaylandı. ' })).toBe('Denetim zaten onaylandı.')
    expect(serverMessageOf([{ message: 'Sebep çok kısa.' }, { message: 'öteki' }])).toBe('Sebep çok kısa.')
  })

  it('is null when there is nothing to say', () => {
    expect(serverMessageOf(null)).toBeNull()
    expect(serverMessageOf(undefined)).toBeNull()
    expect(serverMessageOf([])).toBeNull()
    expect(serverMessageOf({ message: '   ' })).toBeNull()
  })
})

describe('formatRejectedAt', () => {
  it('reads a zoneless stamp as UTC and shows the plant clock', () => {
    expect(formatRejectedAt('2026-11-10T09:30:00.000')).toBe('10.11.2026 12:30')
    expect(formatRejectedAt('2026-11-10 09:30:00')).toBe('10.11.2026 12:30')
  })

  it('leaves a stamp that names its zone alone', () => {
    expect(formatRejectedAt('2026-11-10T09:30:00.000Z')).toBe('10.11.2026 12:30')
    expect(formatRejectedAt('2026-11-10T12:30:00+03:00')).toBe('10.11.2026 12:30')
  })

  it('carries the day over midnight', () => {
    expect(formatRejectedAt('2026-11-10T22:15:00')).toBe('11.11.2026 01:15')
  })

  it('is null for nothing or nonsense', () => {
    expect(formatRejectedAt(null)).toBeNull()
    expect(formatRejectedAt('')).toBeNull()
    expect(formatRejectedAt('dün')).toBeNull()
    expect(formatRejectedAt('2026-11-10')).toBeNull()
  })
})

describe('correctionBannerText', () => {
  it('says the audit was sent back and will be sent again when it is rejected', () => {
    const text = correctionBannerText(true)
    expect(text).toContain('geri gönderdi')
    expect(text).toContain('yeniden gönderilir')
  })

  it('keeps the completed-audit wording otherwise', () => {
    expect(correctionBannerText(false)).toStartWith('Tamamlanmış bir denetimi düzenliyorsunuz.')
  })
})
