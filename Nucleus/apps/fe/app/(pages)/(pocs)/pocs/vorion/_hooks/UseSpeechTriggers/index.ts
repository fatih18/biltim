export type SpeechToken = {
  raw: string
  normalized: string
}

type TriggerProcessResult = {
  updatedText: string
  remainingTokens: SpeechToken[]
}

type TriggerProcessor = (params: {
  tokens: SpeechToken[]
  currentText: string
}) => TriggerProcessResult | null

function tokenize(input: string): SpeechToken[] {
  return input
    .split(/\s+/)
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => {
      const normalized = raw.toLowerCase().replace(/[.,!?;:]+$/g, '')

      return { raw, normalized }
    })
}

function appendTokens(currentText: string, tokens: SpeechToken[]): string {
  if (tokens.length === 0) return currentText

  const newSegment = tokens.map((t) => t.raw).join(' ')
  if (!currentText.trim()) return newSegment

  const needsSpace = !currentText.endsWith(' ')
  return needsSpace ? `${currentText} ${newSegment}` : `${currentText}${newSegment}`
}

// Trigger: repeated "back" commands delete words from the end of the text.
// Example: "back back" => delete last word, "back back back back" => delete last two words.
const backspaceTrigger: TriggerProcessor = ({ tokens, currentText }) => {
  if (tokens.length === 0) return null

  let triggerCount = 0
  let index = tokens.length - 1

  while (index >= 0) {
    const token = tokens[index]
    if (!token || token.normalized !== 'back') {
      break
    }
    triggerCount += 1
    index -= 1
  }

  if (triggerCount === 0) {
    return null
  }

  const remaining = tokens.slice(0, tokens.length - triggerCount)
  const textWithNormalTokens = appendTokens(currentText, remaining)

  const words = textWithNormalTokens.split(/\s+/).filter((w) => w.length > 0)
  const wordsToRemove = Math.floor(triggerCount / 2)

  if (wordsToRemove <= 0 || words.length === 0) {
    return {
      updatedText: textWithNormalTokens,
      remainingTokens: [],
    }
  }

  const newWords = words.slice(0, Math.max(0, words.length - wordsToRemove))

  return {
    updatedText: newWords.join(' '),
    remainingTokens: [],
  }
}

const TRIGGERS: TriggerProcessor[] = [backspaceTrigger]

export function applySpeechTriggers(input: string, currentText: string): string {
  const tokens = tokenize(input)
  if (tokens.length === 0) return currentText

  let workingTokens = tokens
  let text = currentText

  for (const trigger of TRIGGERS) {
    const result = trigger({ tokens: workingTokens, currentText: text })
    if (!result) continue

    text = result.updatedText
    workingTokens = result.remainingTokens
  }

  if (workingTokens.length > 0) {
    text = appendTokens(text, workingTokens)
  }

  return text
}
