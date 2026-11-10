import { describe, expect, it } from 'bun:test'
import {
  PHOTO_QUESTION_FINDINGS_SQL,
  auditPhotoRefusal,
  entersSentState,
  hasBeforePhoto,
  missingPhotoMessage,
  questionsMissingPhoto,
} from './photoRequired'

const AUDIT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const FILE = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'

describe('entersSentState', () => {
  it('is true when a plan not yet sent becomes sent', () => {
    expect(entersSentState('planned', 'pending_approval')).toBe(true)
    expect(entersSentState('', 'pending_approval')).toBe(true)
    expect(entersSentState('rejected', 'pending_approval')).toBe(true)
    expect(entersSentState('planned', 'completed')).toBe(true)
  })

  it('is false for a plan already sent or approved, and for approving a returned audit as it is', () => {
    expect(entersSentState('pending_approval', 'pending_approval')).toBe(false)
    expect(entersSentState('pending_approval', 'completed')).toBe(false)
    expect(entersSentState('completed', 'completed')).toBe(false)
    expect(entersSentState('rejected', 'completed')).toBe(false)
  })

  it('is false when the write names no sent status', () => {
    expect(entersSentState('planned', undefined)).toBe(false)
    expect(entersSentState('planned', 'cancelled')).toBe(false)
    expect(entersSentState('pending_approval', 'planned')).toBe(false)
  })
})

describe('hasBeforePhoto', () => {
  it('accepts a url, a file id or a photo list that names a file', () => {
    expect(hasBeforePhoto({ photo_before_url: '/cdn/x' })).toBe(true)
    expect(hasBeforePhoto({ photo_before_file_id: FILE })).toBe(true)
    expect(hasBeforePhoto({ photo_before_files: [{ file_id: FILE }] })).toBe(true)
    expect(hasBeforePhoto({ photo_before_files: [{ url: '/cdn/x' }] })).toBe(true)
    expect(hasBeforePhoto({ photo_before_files: `[{"id":"${FILE}"}]` })).toBe(true)
    expect(hasBeforePhoto({ photo_before_files: ['/cdn/x'] })).toBe(true)
  })

  it('rejects the shapes that look like a photo but name none', () => {
    for (const row of [
      {},
      { photo_before_url: null },
      { photo_before_url: '   ' },
      { photo_before_file_id: '' },
      { photo_before_files: [] },
      { photo_before_files: '[]' },
      { photo_before_files: 'not json' },
      { photo_before_files: [{}] },
      { photo_before_files: [{ file_id: null }] },
      { photo_before_files: [null, 3, []] },
    ]) {
      expect(hasBeforePhoto(row)).toBe(false)
    }
  })

  it('does not take the after side for the before side', () => {
    expect(hasBeforePhoto({ photo_after_url: '/cdn/x', photo_after_files: [{ id: FILE }] })).toBe(false)
  })
})

describe('questionsMissingPhoto', () => {
  it('lists each question without a photo once, in finding order', () => {
    const rows = [
      { question_id: 'S2-Q1', photo_before_files: [] },
      { question_id: 'S1-Q3', photo_before_url: '/cdn/x' },
      { question_id: 'S1-Q2', photo_before_files: [{}] },
      { question_id: 'S2-Q1', photo_before_url: null },
    ]
    expect(questionsMissingPhoto(rows)).toEqual(['S2-Q1', 'S1-Q2'])
  })

  it('judges each finding on its own: a second finding with a photo does not cover the first', () => {
    const rows = [
      { question_id: 'S1-Q1', photo_before_url: null },
      { question_id: 'S1-Q1', photo_before_url: '/cdn/x' },
    ]
    expect(questionsMissingPhoto(rows)).toEqual(['S1-Q1'])
  })

  it('ignores a row that is not a finding of a question', () => {
    expect(questionsMissingPhoto([{ status: 'planned' }, { question_id: null }, { question_id: '  ' }])).toEqual([])
    expect(questionsMissingPhoto([])).toEqual([])
  })
})

describe('missingPhotoMessage', () => {
  it('says what is wrong, what it means and what to do, naming the questions', () => {
    const text = missingPhotoMessage(['S1-Q2', 'S3-Q1'])
    expect(text).toContain('S1-Q2, S3-Q1')
    expect(text).toContain('Denetim gönderilemedi')
    expect(text).toContain('fotoğrafsız bulgu kabul edilmez')
    expect(text).toContain('Bulguya fotoğraf ekleyin')
  })
})

describe('auditPhotoRefusal', () => {
  it('asks only for the audit’s findings on photo-demanding questions', async () => {
    const asked: { text: string; params: unknown[] }[] = []
    const refusal = await auditPhotoRefusal(async (text, params) => {
      asked.push({ text, params })
      return []
    }, AUDIT)
    expect(refusal).toBeUndefined()
    expect(asked).toHaveLength(1)
    expect(asked[0]?.text).toBe(PHOTO_QUESTION_FINDINGS_SQL)
    expect(asked[0]?.params).toEqual([AUDIT])
    expect(PHOTO_QUESTION_FINDINGS_SQL).toContain('q.require_photo is true')
    expect(PHOTO_QUESTION_FINDINGS_SQL).toContain('f.audit_id::text = $1')
  })

  it('refuses with the question ids when a finding has no photo', async () => {
    const refusal = await auditPhotoRefusal(async () => [{ question_id: 'S4-Q2', photo_before_files: [] }], AUDIT)
    expect(refusal).toBe(missingPhotoMessage(['S4-Q2']))
  })

  it('lets an audit through when every such finding has a photo, or the audit has no id', async () => {
    expect(await auditPhotoRefusal(async () => [{ question_id: 'S4-Q2', photo_before_file_id: FILE }], AUDIT)).toBeUndefined()
    let asked = false
    expect(
      await auditPhotoRefusal(async () => {
        asked = true
        return []
      }, '')
    ).toBeUndefined()
    expect(asked).toBe(false)
  })
})
