import { describe, expect, it } from 'bun:test'
import {
  LEGACY_NO_ANSWERS_NOTE,
  NOT_ATTENDED_NOTE,
  NOT_ATTENDED_NO_ANSWERS_NOTE,
  auditAttendanceNote,
  isNotAttended,
} from './auditAttendanceNote'

describe('isNotAttended', () => {
  it('is the attendance rule only when the plan says no AND the audit was zeroed', () => {
    expect(isNotAttended({ attended: false, total: 0 })).toBe(true)
  })

  it('does not hold the old guess against an audit that kept its score', () => {
    // Before the tick the plan's flag was false for most audits that were never zeroed.
    expect(isNotAttended({ attended: false, total: 82.5 })).toBe(false)
  })

  it('is not decided by a plan that says yes, says nothing, or is not there', () => {
    expect(isNotAttended({ attended: true, total: 0 })).toBe(false)
    expect(isNotAttended({ attended: null, total: 0 })).toBe(false)
  })
})

describe('auditAttendanceNote', () => {
  it('explains an audit saved without attendance and without answers as intended, not as lost data', () => {
    const note = auditAttendanceNote({ attended: false, total: 0, hasAnswers: false })
    expect(note).toBe(NOT_ATTENDED_NO_ANSWERS_NOTE)
    expect(note).toContain('sorular yanıtlanmadı')
    expect(note).not.toContain('eski kayıt')
  })

  it('explains a zeroed audit that still has its answers (saved before the questions went passive)', () => {
    expect(auditAttendanceNote({ attended: false, total: 0, hasAnswers: true })).toBe(NOT_ATTENDED_NOTE)
  })

  it('keeps the old-record note for an audit with no answers and no attendance rule behind it', () => {
    expect(auditAttendanceNote({ attended: null, total: 64, hasAnswers: false })).toBe(LEGACY_NO_ANSWERS_NOTE)
    expect(auditAttendanceNote({ attended: true, total: 0, hasAnswers: false })).toBe(LEGACY_NO_ANSWERS_NOTE)
    expect(auditAttendanceNote({ attended: false, total: 41, hasAnswers: false })).toBe(LEGACY_NO_ANSWERS_NOTE)
  })

  it('says nothing about an ordinary audit', () => {
    expect(auditAttendanceNote({ attended: true, total: 88, hasAnswers: true })).toBeNull()
    expect(auditAttendanceNote({ attended: null, total: 88, hasAnswers: true })).toBeNull()
  })

  it('never repeats the old checkbox wording', () => {
    for (const note of [NOT_ATTENDED_NOTE, NOT_ATTENDED_NO_ANSWERS_NOTE]) {
      expect(note).not.toContain('Bölge sorumlusu denetime katıldı')
    }
  })
})
