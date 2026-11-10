import { describe, expect, it } from 'bun:test'
import { mayWriteAnswer, tallyQuestionWrites, writeQuestion, type QuestionWrite } from './correctionWrites'
import { correctionVerdict, tallyFindingWrites, type FindingWrite } from './resendPlan'
import { requiresNewFinding, type Rating } from './scoring'

const saved: FindingWrite = { saved: true, failedPhotos: 0 }
const failed: FindingWrite = { saved: false, failedPhotos: 0 }

describe('mayWriteAnswer', () => {
  it('writes the answer when no finding is due or the finding saved', () => {
    expect(mayWriteAnswer(null)).toBe(true)
    expect(mayWriteAnswer(saved)).toBe(true)
    expect(mayWriteAnswer({ saved: true, failedPhotos: 2 })).toBe(true)
  })

  it('holds the answer back when its finding did not save, whatever the photos did', () => {
    expect(mayWriteAnswer(failed)).toBe(false)
    expect(mayWriteAnswer({ saved: false, failedPhotos: 1 })).toBe(false)
  })
})

describe('writeQuestion', () => {
  it('writes the finding BEFORE the answer', async () => {
    const calls: string[] = []
    const result = await writeQuestion({
      writeFinding: async () => {
        calls.push('finding:start')
        await Promise.resolve()
        calls.push('finding:done')
        return saved
      },
      writeAnswer: async () => {
        calls.push('answer')
        return true
      },
    })
    expect(calls).toEqual(['finding:start', 'finding:done', 'answer'])
    expect(result).toEqual({ finding: saved, answer: 'saved' })
  })

  it('does not write the answer when its finding failed: the answer is held', async () => {
    const calls: string[] = []
    const result = await writeQuestion({
      writeFinding: async () => {
        calls.push('finding')
        return { saved: false, failedPhotos: 1 }
      },
      writeAnswer: async () => {
        calls.push('answer')
        return true
      },
    })
    expect(calls).toEqual(['finding'])
    expect(result).toEqual({ finding: { saved: false, failedPhotos: 1 }, answer: 'held' })
  })

  it('writes only the answer when the question needs no new finding', async () => {
    const calls: string[] = []
    const result = await writeQuestion({
      writeFinding: null,
      writeAnswer: async () => {
        calls.push('answer')
        return true
      },
    })
    expect(calls).toEqual(['answer'])
    expect(result).toEqual({ finding: null, answer: 'saved' })
  })

  it('says the answer failed when its own write was refused, with the finding already saved', async () => {
    const result = await writeQuestion({ writeFinding: async () => saved, writeAnswer: async () => false })
    expect(result).toEqual({ finding: saved, answer: 'failed' })
  })

  it('never rejects: a finding write that throws is a failed finding, an answer write that throws a failed answer', async () => {
    const calls: string[] = []
    const noFinding = await writeQuestion({
      writeFinding: () => Promise.reject(new Error('boom')),
      writeAnswer: async () => {
        calls.push('answer')
        return true
      },
    })
    expect(noFinding).toEqual({ finding: failed, answer: 'held' })
    expect(calls).toEqual([])
    const noAnswer = await writeQuestion({ writeFinding: null, writeAnswer: () => Promise.reject(new Error('boom')) })
    expect(noAnswer).toEqual({ finding: null, answer: 'failed' })
  })
})

describe('the second pass: reopening still demands the finding', () => {
  const QUESTION = 'S1-1'

  /** The audit's stored answer for the question, as a correction leaves it. */
  async function correct(options: { storedBefore: Rating | null; findingSaves: boolean }): Promise<Rating | null> {
    let stored: Rating | null = options.storedBefore
    await writeQuestion({
      writeFinding: async () => (options.findingSaves ? saved : failed),
      writeAnswer: async () => {
        stored = 'medium'
        return true
      },
    })
    return stored
  }

  /** What the form asks of the reopened audit for that question (nothing else open there). */
  const demandsFinding = (storedRating: Rating | null) =>
    requiresNewFinding('medium', { hasOpenFinding: false, storedRating })

  it('a failed finding leaves the answer at its earlier rating, so the finding is asked for again', async () => {
    const earlier: Array<Rating | null> = ['good', null]
    for (const before of earlier) {
      const stored = await correct({ storedBefore: before, findingSaves: false })
      expect(stored).toBe(before)
      expect(demandsFinding(stored)).toBe(true)
    }
  })

  it('a saved finding lets the answer through, and then no second finding is asked for', async () => {
    const stored = await correct({ storedBefore: 'good', findingSaves: true })
    expect(stored).toBe('medium')
    // The saved finding is the question's open finding when the audit is reopened.
    expect(requiresNewFinding('medium', { hasOpenFinding: true, storedRating: stored })).toBe(false)
  })

  it('the old order is the hole: the answer stored first hides the finding that failed', () => {
    // answer first (stored as Orta), then the finding failed:
    expect(demandsFinding('medium')).toBe(false)
  })
})

describe('tallyQuestionWrites', () => {
  const writes: QuestionWrite[] = [
    { finding: null, answer: 'saved' },
    { finding: saved, answer: 'saved' },
    { finding: { saved: false, failedPhotos: 1 }, answer: 'held' },
    { finding: { saved: true, failedPhotos: 2 }, answer: 'failed' },
  ]

  it('counts refused answers and hands the findings on for the verdict', () => {
    const tally = tallyQuestionWrites(writes)
    expect(tally.failedAnswers).toBe(1)
    expect(tally.findingWrites).toHaveLength(3)
    expect(tallyFindingWrites(tally.findingWrites)).toEqual({ failedFindings: 1, failedPhotos: 3 })
  })

  it('does not count a held answer as a failed answer: its finding is what failed', () => {
    const held: QuestionWrite[] = [{ finding: failed, answer: 'held' }]
    const tally = tallyQuestionWrites(held)
    expect(tally.failedAnswers).toBe(0)
    const verdict = correctionVerdict({ status: 'rejected', ...tally, ...tallyFindingWrites(tally.findingWrites) })
    expect(verdict.resend).toBe(false)
    expect(verdict.failureText).toContain('1 bulgu')
    expect(verdict.failureText).not.toContain('soru yanıtı')
  })

  it('counts nothing for no questions', () => {
    expect(tallyQuestionWrites([])).toEqual({ failedAnswers: 0, findingWrites: [] })
  })
})
