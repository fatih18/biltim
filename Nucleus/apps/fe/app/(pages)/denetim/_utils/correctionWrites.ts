/**
 * The order a correction writes one answered question in (R30).
 *
 * A question rated Orta/Kötü that the correction moves down from İyi (or from
 * no answer) needs a NEW finding. The finding is written FIRST and the answer
 * only once it saved. The other way round, a failed finding write left the
 * answer stored as Orta/Kötü: when the team reopened "Düzelt ve Yeniden
 * Gönder", requiresNewFinding saw a stored Orta/Kötü, wrote no finding and the
 * audit went to approval without it. A held answer keeps its earlier rating,
 * so reopening demands the finding again.
 */
import type { FindingWrite } from './resendPlan'

/**
 * What became of the answer row: 'saved', refused ('failed'), or 'held' back
 * because the finding it needs did not save.
 */
export type AnswerWrite = 'saved' | 'failed' | 'held'

export type QuestionWrite = {
  /** The finding's write; null when the question needs no new finding. */
  finding: FindingWrite | null
  answer: AnswerWrite
}

export type QuestionSteps = {
  /** Writes the question's new finding; null when it needs none. */
  writeFinding: (() => Promise<FindingWrite>) | null
  /** Writes the answer row; resolves true when it saved. */
  writeAnswer: () => Promise<boolean>
}

/** The answer follows its finding: written when no finding is due or the finding saved. */
export function mayWriteAnswer(finding: FindingWrite | null): boolean {
  return finding === null || finding.saved
}

/** One question: its finding, then (only if that saved) its answer. Never rejects. */
export async function writeQuestion(steps: QuestionSteps): Promise<QuestionWrite> {
  let finding: FindingWrite | null = null
  if (steps.writeFinding) {
    try {
      finding = await steps.writeFinding()
    } catch {
      finding = { saved: false, failedPhotos: 0 }
    }
  }
  if (!mayWriteAnswer(finding)) return { finding, answer: 'held' }
  try {
    return { finding, answer: (await steps.writeAnswer()) ? 'saved' : 'failed' }
  } catch {
    return { finding, answer: 'failed' }
  }
}

/** The writes as the verdict counts them: refused answers, and the findings' own writes. */
export function tallyQuestionWrites(writes: readonly QuestionWrite[]): {
  failedAnswers: number
  findingWrites: FindingWrite[]
} {
  return {
    failedAnswers: writes.filter((write) => write.answer === 'failed').length,
    findingWrites: writes.flatMap((write) => (write.finding ? [write.finding] : [])),
  }
}
