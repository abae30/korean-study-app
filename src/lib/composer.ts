// A 2-set (두벌식) Hangul composer. Feed it keystroke jamo and it returns the text a Korean IME would produce,
// including how it regroups a trailing consonant onto the next syllable (ㅎㅏㄴ → 한, then ㅏ → 하나).
// Used two ways: by the typing screens so a regular (English) keyboard types Korean directly, and by the tests as a
// model of a real IME.

/** Physical key → [jamo, jamo with Shift]. Keyed by KeyboardEvent.code so it works on any OS keyboard layout. */
export const KEY_JAMO: Record<string, [string, string?]> = {
  KeyQ: ['ㅂ', 'ㅃ'], KeyW: ['ㅈ', 'ㅉ'], KeyE: ['ㄷ', 'ㄸ'], KeyR: ['ㄱ', 'ㄲ'], KeyT: ['ㅅ', 'ㅆ'],
  KeyY: ['ㅛ'], KeyU: ['ㅕ'], KeyI: ['ㅑ'], KeyO: ['ㅐ', 'ㅒ'], KeyP: ['ㅔ', 'ㅖ'],
  KeyA: ['ㅁ'], KeyS: ['ㄴ'], KeyD: ['ㅇ'], KeyF: ['ㄹ'], KeyG: ['ㅎ'],
  KeyH: ['ㅗ'], KeyJ: ['ㅓ'], KeyK: ['ㅏ'], KeyL: ['ㅣ'],
  KeyZ: ['ㅋ'], KeyX: ['ㅌ'], KeyC: ['ㅊ'], KeyV: ['ㅍ'], KeyB: ['ㅠ'], KeyN: ['ㅜ'], KeyM: ['ㅡ'],
}

export function jamoForKey(code: string, shift: boolean): string | null {
  const e = KEY_JAMO[code]
  return e ? (shift && e[1] ? e[1] : e[0]) : null
}
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const V2: Record<string, string> = { ㅗㅏ: 'ㅘ', ㅗㅐ: 'ㅙ', ㅗㅣ: 'ㅚ', ㅜㅓ: 'ㅝ', ㅜㅔ: 'ㅞ', ㅜㅣ: 'ㅟ', ㅡㅣ: 'ㅢ' }
const J2: Record<string, string> = {
  ㄱㅅ: 'ㄳ', ㄴㅈ: 'ㄵ', ㄴㅎ: 'ㄶ', ㄹㄱ: 'ㄺ', ㄹㅁ: 'ㄻ', ㄹㅂ: 'ㄼ', ㄹㅅ: 'ㄽ', ㄹㅌ: 'ㄾ', ㄹㅍ: 'ㄿ', ㄹㅎ: 'ㅀ', ㅂㅅ: 'ㅄ',
}
const J2_SPLIT = Object.fromEntries(Object.entries(J2).map(([k, v]) => [v, k]))
const isVowel = (c: string) => JUNG.includes(c)
const isCons = (c: string) => CHO.includes(c)

interface Comp {
  cho?: string
  jung?: string
  jong?: string
}

function render(c: Comp): string {
  if (c.cho && c.jung) {
    const code = 0xac00 + (CHO.indexOf(c.cho) * 21 + JUNG.indexOf(c.jung)) * 28 + JONG.indexOf(c.jong ?? '')
    return String.fromCharCode(code)
  }
  return c.cho ?? c.jung ?? ''
}

export function imeStates(keys: string): string[] {
  let committed = ''
  let c: Comp = {}
  const out: string[] = []
  const commit = () => {
    committed += render(c)
    c = {}
  }
  for (const k of keys) {
    if (!isVowel(k) && !isCons(k)) {
      commit()
      committed += k
    } else if (isCons(k)) {
      if (!c.cho && !c.jung) c = { cho: k }
      else if (!c.jung) {
        commit()
        c = { cho: k }
      } else if (!c.jong) {
        if (JONG.includes(k)) c.jong = k
        else {
          commit()
          c = { cho: k }
        }
      } else if (J2[c.jong + k]) c.jong = J2[c.jong + k]
      else {
        commit()
        c = { cho: k }
      }
    } else {
      // vowel
      if (!c.cho && !c.jung) c = { jung: k }
      else if (c.cho && !c.jung) c.jung = k
      else if (c.jung && !c.jong) {
        if (c.cho && V2[c.jung + k]) c.jung = V2[c.jung + k]
        else {
          commit()
          c = { jung: k }
        }
      } else if (c.cho && c.jung && c.jong) {
        // the trailing consonant moves onto the new syllable
        const split = J2_SPLIT[c.jong]
        let moved: string
        if (split) {
          moved = split[1]
          c.jong = split[0]
        } else {
          moved = c.jong
          c.jong = undefined
        }
        commit()
        c = { cho: moved, jung: k }
      } else {
        commit()
        c = { jung: k }
      }
    }
    out.push(committed + render(c))
  }
  return out
}

/** The text a Korean IME would show after typing all of `keys`. */
export function compose(keys: string): string {
  return imeStates(keys).at(-1) ?? ''
}

/**
 * Keystroke buffer behind a text field. Backspace removes one keystroke at a time (like a real Korean IME:
 * 한 → 하 → ㅎ → empty), then the text is recomposed from what is left.
 */
export class HangulBuffer {
  private keys: string[] = []
  push(k: string) {
    this.keys.push(k)
  }
  pop() {
    this.keys.pop()
  }
  clear() {
    this.keys = []
  }
  /** Resync after text arrived some other way (e.g. a native IME). */
  setText(flatKeys: string) {
    this.keys = [...flatKeys]
  }
  get length() {
    return this.keys.length
  }
  text() {
    return compose(this.keys.join(''))
  }
}
