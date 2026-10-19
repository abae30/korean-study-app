import { flatten, isAnswer, matchStatus, syllableCount, type CharStatus, type MatchResult } from './hangul'

/**
 * Monkeytype-style paragraph typing. The passage is split into space-separated words. A word is *committed* when you type
 * the space after it; a wrong word stays wrong (red) and you keep going, so one slip never throws the rest out of
 * alignment. Within the word you are on, letters light up one by one.
 */
export interface WordView {
  /** Per-character status for this word, shaped like a MatchResult so the word renderer can draw it. */
  m: MatchResult
  committed: boolean
  correct: boolean
}

export interface ParagraphState {
  words: WordView[]
  /** Index of the word being typed (tokens.length once everything is committed). */
  current: number
  finished: boolean
  /** Correct syllable blocks (plus the spaces after correct words): the numerator of WPM. */
  correctBlocks: number
  /** Everything typed, correct or not. */
  typedBlocks: number
  /** Keystrokes (jamo) inside correct words: the numerator of 타수. */
  correctKeys: number
  /** Committed words that don't match, as [target, typed]. */
  wrongWords: [string, string][]
}

export const tokenize = (text: string): string[] => text.split(' ').filter(Boolean)

/** Blocks a word counts for: one per syllable, one per other character (digit, punctuation). */
export const blocksOf = (word: string): number => [...word].length

const blank = (token: string): MatchResult => matchStatus(token, '')
const remap = (m: MatchResult, from: CharStatus[], to: CharStatus): MatchResult => ({
  ...m,
  status: m.status.map((s) => (from.includes(s) ? to : s)),
})

export function analyze(tokens: string[], typed: string): ParagraphState {
  const typedWords = typed.split(' ')
  const cur = Math.min(typedWords.length - 1, tokens.length)
  const lastIdx = tokens.length - 1
  const overshoot = typedWords.length > tokens.length // spaced past the final word
  const lastDone = typedWords.length - 1 === lastIdx && isAnswer([tokens[lastIdx]], typedWords[lastIdx])
  const finished = overshoot || lastDone

  const words: WordView[] = []
  let correctBlocks = 0
  let correctKeys = 0
  const wrongWords: [string, string][] = []

  tokens.forEach((tok, i) => {
    const w = typedWords[i] ?? ''
    const committed = i < typedWords.length - 1 || (finished && i === lastIdx)
    if (committed) {
      const m = matchStatus(tok, w)
      const correct = m.complete
      if (correct) {
        correctBlocks += blocksOf(tok) + (i < lastIdx ? 1 : 0)
        correctKeys += flatten(tok).length
      } else wrongWords.push([tok, w])
      // letters you skipped are wrong too, not merely "not yet typed"
      words.push({ m: correct ? m : remap(m, ['pending', 'active'], 'incorrect'), committed: true, correct })
    } else if (i === cur) {
      words.push({ m: matchStatus(tok, w), committed: false, correct: false })
    } else {
      words.push({ m: blank(tok), committed: false, correct: false })
    }
  })

  return {
    words,
    current: Math.min(cur, tokens.length),
    finished,
    correctBlocks,
    typedBlocks: typed.length,
    correctKeys,
    wrongWords,
  }
}

/** Characters that were missed, by target syllable: counts of the first wrong letter's block in each wrong word. */
export function missedChars(wrongWords: [string, string][]): Map<string, number> {
  const out = new Map<string, number>()
  for (const [target, typed] of wrongWords) {
    const m = matchStatus(target, typed)
    ;[...target].forEach((c, i) => {
      // the word was committed wrong, so a syllable that was wrong *or skipped* counts as missed
      if (m.status[i] !== 'correct' && syllableCount(c) > 0) out.set(c, (out.get(c) ?? 0) + 1)
    })
  }
  return out
}
