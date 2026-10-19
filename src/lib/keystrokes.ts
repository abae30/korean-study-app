import { flatten } from './hangul'

/**
 * Keystroke-level accuracy (Monkeytype style): every keystroke that adds a letter counts, and it is *wrong* if the text
 * is off-track afterwards. Backspace is free. Works on the flattened jamo stream so it is independent of how the IME
 * or the built-in composer groups letters into blocks.
 */
export interface KeyStats {
  keys: number
  wrong: number
}

export const emptyKeyStats: KeyStats = { keys: 0, wrong: 0 }

export function countKeystrokes(prev: string, next: string, onTrack: boolean, stats: KeyStats): KeyStats {
  const added = flatten(next).length - flatten(prev).length
  if (added <= 0) return stats
  return { keys: stats.keys + added, wrong: stats.wrong + (onTrack ? 0 : added) }
}

export const accuracy = (s: KeyStats): number => (s.keys === 0 ? 1 : (s.keys - s.wrong) / s.keys)

/**
 * Words per minute for Korean: correct syllable blocks ÷ 5, per minute. A block carries roughly the information of a
 * letter-and-a-half of English, but dividing by 5 mirrors Monkeytype's "5 characters = 1 word" and keeps the number
 * comparable run to run. Non-Hangul characters (digits, punctuation, spaces) count one block each, like characters.
 */
export function wpm(blocks: number, seconds: number): number {
  if (seconds <= 0) return 0
  return Math.round((blocks / 5 / (seconds / 60)) * 10) / 10
}
