// Hangul helpers for IME-safe typing comparison.
//
// Core idea: never compare *syllable blocks* while the user is typing. A Korean IME regroups jamo as keys arrive
// (ㅎㅏㄴ → 한, then ㅏ turns it into 하나), so a half-typed block can look "wrong" even though the keystrokes are right.
// Instead we flatten both the typed text and the target into the stream of 2-set keyboard keystrokes
// (ㅘ → ㅗㅏ, ㄳ → ㄱㅅ, …) and compare those streams. Regrouping never changes the stream, so there are no false errors
// mid-composition and no flicker.

export const CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
export const JUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
export const JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const CHO = CHO_LIST
const JUNG = JUNG_LIST
const JONG = JONG_LIST

/** Compound jamo → the keystrokes that produce them. */
const SPLIT: Record<string, string> = {
  ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
}
const split = (j: string) => SPLIT[j] ?? j

const S_BASE = 0xac00
const S_END = 0xd7a3

export const isSyllable = (ch: string) => {
  const c = ch.charCodeAt(0)
  return c >= S_BASE && c <= S_END
}

/** Keystroke jamo for one character (precomposed syllable, compatibility jamo, or conjoining jamo). */
export function flattenChar(ch: string): string {
  const c = ch.charCodeAt(0)
  if (c >= S_BASE && c <= S_END) {
    const n = c - S_BASE
    const cho = CHO[Math.floor(n / 588)]
    const jung = JUNG[Math.floor((n % 588) / 28)]
    const jong = JONG[n % 28]
    return split(cho) + split(jung) + split(jong)
  }
  if (c >= 0x3131 && c <= 0x3163) return split(ch) // compatibility jamo (what IMEs show mid-composition)
  if (c >= 0x1100 && c <= 0x1112) return split(CHO[c - 0x1100]) // conjoining choseong
  if (c >= 0x1161 && c <= 0x1175) return split(JUNG[c - 0x1161]) // conjoining jungseong
  if (c >= 0x11a8 && c <= 0x11c2) return split(JONG[c - 0x11a8 + 1]) // conjoining jongseong
  return ch
}

/** The whole string as a stream of keystroke jamo (other characters pass through unchanged). */
export function flatten(s: string): string {
  let out = ''
  for (const ch of s) out += flattenChar(ch)
  return out
}

export const syllableCount = (s: string) => [...s].filter(isSyllable).length

export interface SyllableParts {
  cho: string
  jung: string[] // 1 key, or 2 for compound vowels (ㅘ → ㅗ, ㅏ)
  jong: string[] // 0, 1, or 2 keys (compound final consonants)
}

/** The keystrokes of one syllable block, grouped by role. null for non-syllables. */
export function syllableParts(ch: string): SyllableParts | null {
  if (!isSyllable(ch)) return null
  const n = ch.charCodeAt(0) - S_BASE
  return {
    cho: CHO[Math.floor(n / 588)],
    jung: [...split(JUNG[Math.floor((n % 588) / 28)])],
    jong: [...split(JONG[n % 28])],
  }
}

export type CharStatus = 'correct' | 'incorrect' | 'active' | 'pending'

export interface MatchResult {
  /** One status per character of the target. `active` = being typed and correct so far. */
  status: CharStatus[]
  /** Typed keystrokes beyond the end of the target. */
  overflow: number
  /** Typed keystroke stream is exactly the target's. */
  complete: boolean
  /** Nothing typed so far contradicts the target (safe to show as "fine" while composing). */
  onTrack: boolean
  /** Index of the target character the caret is on (target.length when finished). */
  cursor: number
  /** Per target character: how many of its keystrokes have been typed correctly so far. */
  lit: number[]
}

export function matchStatus(target: string, typed: string): MatchResult {
  const T = flatten(typed)
  const chars = [...target]
  const status: CharStatus[] = []
  const lit: number[] = []
  let offset = 0
  let cursor = chars.length
  let onTrack = true
  for (let k = 0; k < chars.length; k++) {
    const slice = flattenChar(chars[k])
    let st: CharStatus
    let n = 0
    if (T.length >= offset + slice.length) {
      st = T.slice(offset, offset + slice.length) === slice ? 'correct' : 'incorrect'
      n = st === 'correct' ? slice.length : 0
    } else if (T.length > offset) {
      st = slice.startsWith(T.slice(offset)) ? 'active' : 'incorrect'
      n = st === 'active' ? T.length - offset : 0
    } else {
      st = 'pending'
    }
    lit.push(n)
    if (st === 'incorrect') onTrack = false
    if ((st === 'pending' || st === 'active') && cursor === chars.length) cursor = k
    status.push(st)
    offset += slice.length
  }
  const overflow = Math.max(0, T.length - offset)
  if (overflow > 0) onTrack = false
  return { status, overflow, complete: T === flatten(target), onTrack, cursor, lit }
}

/** Of several accepted answers, pick the one the user seems to be typing (first on-track one, else the primary). */
export function pickTarget(options: string[], typed: string): string {
  if (typed) {
    const T = flatten(typed)
    for (const o of options) if (flatten(o).startsWith(T)) return o
  }
  return options[0]
}

/** True if `typed` equals any accepted answer, ignoring IME state. */
export function isAnswer(options: string[], typed: string): boolean {
  const T = flatten(typed.trim())
  return options.some((o) => flatten(o) === T)
}

/** The final consonant (batchim) of the last syllable of `word`, or '' if it ends in a vowel (or isn't Hangul). */
export function finalJamo(word: string): string {
  const ch = [...word.trim()].pop()
  if (!ch || !isSyllable(ch)) return ''
  return JONG[(ch.charCodeAt(0) - S_BASE) % 28]
}

export function hasBatchim(word: string): boolean {
  return finalJamo(word) !== ''
}

/** Split a syllable into [initial, vowel, final] compatibility jamo (compound letters kept whole). null if not a syllable. */
export function decomposeSyllable(ch: string): [string, string, string] | null {
  if (!isSyllable(ch)) return null
  const n = ch.charCodeAt(0) - S_BASE
  return [CHO[Math.floor(n / 588)], JUNG[Math.floor((n % 588) / 28)], JONG[n % 28]]
}

/** Build a syllable from [initial, vowel, final] jamo. Throws if the combination is not a valid block. */
export function composeSyllable(cho: string, jung: string, jong = ''): string {
  const c = CHO.indexOf(cho)
  const v = JUNG.indexOf(jung)
  const f = JONG.indexOf(jong)
  if (c < 0 || v < 0 || f < 0) throw new Error(`cannot compose ${cho}${jung}${jong}`)
  return String.fromCharCode(S_BASE + (c * 21 + v) * 28 + f)
}
