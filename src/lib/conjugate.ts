// Korean verb / adjective conjugation: the polite ending (-아요/어요, "해요체").
//
// Regular stems take 아요 after ㅏ or ㅗ and 어요 after anything else, then contract (가+아요 → 가요, 보+아요 → 봐요,
// 마시+어요 → 마셔요, ㅡ drops: 쓰+어요 → 써요). 하다 → 해요. Irregular classes are named explicitly because the dictionary
// form alone doesn't reveal them (좋다 is regular but 그렇다 is a ㅎ-irregular).
import { composeSyllable, decomposeSyllable } from './hangul'

export type Irregular = 'ㅎ' | 'ㅂ' | 'ㄷ' | 'ㅅ' | '르'

/** Vowels that make the ending 아요 (everything else takes 어요). */
const BRIGHT = new Set(['ㅏ', 'ㅗ'])
const SPECIAL: Record<string, string> = { 이다: '이에요', 아니다: '아니에요' }

const dec = (ch: string) => {
  const d = decomposeSyllable(ch)
  if (!d) throw new Error(`not a Hangul syllable: ${ch}`)
  return d
}

/** Dictionary form (ending in 다) → polite form. */
export function polite(dict: string, irregular?: Irregular): string {
  if (!dict.endsWith('다')) throw new Error(`expected a dictionary form ending in 다: ${dict}`)
  if (SPECIAL[dict]) return SPECIAL[dict]
  const stem = [...dict.slice(0, -1)]
  const last = stem[stem.length - 1]
  const head = stem.slice(0, -1).join('')
  const [cho, jung, jong] = dec(last)
  const prev = stem.length > 1 ? dec(stem[stem.length - 2]) : null
  const harmony = (v: string) => (BRIGHT.has(v) ? '아요' : '어요')

  if (last === '하' && !jong) return `${head}해요`

  if (irregular === 'ㅎ') {
    // 그렇다 → 그래요, 어떻다 → 어때요, 하얗다 → 하얘요: drop ㅎ, ㅏ/ㅓ → ㅐ, ㅑ → ㅒ
    return `${head}${composeSyllable(cho, jung === 'ㅑ' ? 'ㅒ' : 'ㅐ')}요`
  }
  if (irregular === 'ㅂ') {
    const base = `${head}${composeSyllable(cho, jung)}`
    return last === '돕' || last === '곱' ? `${base}와요` : `${base}워요`
  }
  if (irregular === 'ㄷ') return `${head}${composeSyllable(cho, jung, 'ㄹ')}${harmony(jung)}`
  if (irregular === 'ㅅ') return `${head}${composeSyllable(cho, jung)}${harmony(jung)}`
  if (irregular === '르' && prev) {
    return `${stem.slice(0, -2).join('')}${composeSyllable(prev[0], prev[1], 'ㄹ')}${BRIGHT.has(prev[1]) ? '라요' : '러요'}`
  }

  if (jong) return `${head}${last}${harmony(jung)}` // closed syllable: plain harmony, no contraction

  switch (jung) {
    case 'ㅏ':
    case 'ㅓ':
    case 'ㅕ':
    case 'ㅐ':
    case 'ㅔ':
      return `${head}${last}요` // 가+아요 → 가요, 서+어요 → 서요, 펴+어요 → 펴요, 지내+어요 → 지내요
    case 'ㅗ':
      return `${head}${composeSyllable(cho, 'ㅘ')}요` // 보+아요 → 봐요
    case 'ㅜ':
      return `${head}${composeSyllable(cho, 'ㅝ')}요` // 주+어요 → 줘요
    case 'ㅣ':
      return `${head}${composeSyllable(cho, 'ㅕ')}요` // 마시+어요 → 마셔요
    case 'ㅚ':
      return `${head}${composeSyllable(cho, 'ㅙ')}요` // 되+어요 → 돼요
    case 'ㅡ': {
      // ㅡ drops and the vowel before it decides the harmony: 쓰 → 써, 크 → 커, 바쁘 → 바빠, 예쁘 → 예뻐
      const v = prev && BRIGHT.has(prev[1]) ? 'ㅏ' : 'ㅓ'
      return `${head}${composeSyllable(cho, v)}요`
    }
    default:
      return `${head}${last}어요` // 쉬+어요, 띄+어요 …
  }
}

/** The tempting-but-wrong forms for multiple choice: naive attachment, flipped harmony, bare stem + 요, 해요. */
export function politeDistractors(dict: string, irregular?: Irregular, count = 3): string[] {
  const right = polite(dict, irregular)
  const stem = dict.slice(0, -1)
  const lastJung = dec([...stem].pop()!)[1]
  const naiveVowel = BRIGHT.has(lastJung) ? '아요' : '어요'
  const flipped = BRIGHT.has(lastJung) ? '어요' : '아요'
  const cands = [`${stem}${naiveVowel}`, `${stem}${flipped}`, `${stem}요`, `${stem}해요`, `${stem}여요`, `${stem}에요`]
  const out: string[] = []
  for (const c of cands) if (c !== right && !out.includes(c)) out.push(c)
  return out.slice(0, count)
}

/** Which book section a conjugation belongs to: plain stems (G2.2) vs contractions, 하다 and irregulars (G2.3). */
export function politeClass(dict: string, irregular?: Irregular): 'plain' | 'contracted' {
  if (SPECIAL[dict]) return 'plain' // 이다 / 아니다 are introduced with the plain ending
  if (irregular || dict.endsWith('하다')) return 'contracted'
  const [, , jong] = dec([...dict.slice(0, -1)].pop()!)
  return jong ? 'plain' : 'contracted' // an open last syllable merges with the ending (싸+아요 → 싸요, 보 → 봐, 쓰 → 써)
}

/** A one-line reason for the polite form, for feedback after an exercise. */
export function describePolite(dict: string, irregular?: Irregular): string {
  const right = polite(dict, irregular)
  if (dict === '이다') return '이다 takes 이에요 after a consonant and 예요 after a vowel (it is special: no 아요/어요).'
  if (dict === '아니다') return '아니다 is special: 아니에요 (no 아요/어요).'
  const stem = dict.slice(0, -1)
  const [cho, jung, jong] = dec([...stem].pop()!)
  if (dict.endsWith('하다')) return `Verbs and adjectives with 하다 become 해요: ${dict} → ${right}.`
  if (irregular === 'ㅎ') return `ㅎ-irregular: the ㅎ drops and the vowel becomes ㅐ: ${dict} → ${right}.`
  if (irregular === 'ㅂ') return `ㅂ-irregular: the ㅂ becomes 우/오 before the ending: ${dict} → ${right}.`
  if (irregular === 'ㄷ') return `ㄷ-irregular: the ㄷ becomes ㄹ before a vowel: ${dict} → ${right}.`
  if (irregular === 'ㅅ') return `ㅅ-irregular: the ㅅ drops before a vowel: ${dict} → ${right}.`
  if (irregular === '르') return `르-irregular: 르 becomes ㄹ + 라/러: ${dict} → ${right}.`
  if (jong) return `${stem} ends in ${jung}${BRIGHT.has(jung) ? ' (ㅏ/ㅗ), so it takes 아요' : ', so it takes 어요'}: ${right}.`
  if (jung === 'ㅡ') return `The ㅡ drops before the ending and the vowel before it decides the harmony: ${dict} → ${right}.`
  if (jung === 'ㅗ') return `${stem}+아요 contracts (ㅗ+ㅏ → ㅘ): ${dict} → ${right}.`
  if (jung === 'ㅜ') return `${stem}+어요 contracts (ㅜ+ㅓ → ㅝ): ${dict} → ${right}.`
  if (jung === 'ㅣ') return `${stem}+어요 contracts (ㅣ+ㅓ → ㅕ): ${dict} → ${right}.`
  if (cho && ['ㅏ', 'ㅓ', 'ㅐ', 'ㅔ'].includes(jung)) return `${stem}+${BRIGHT.has(jung) ? '아요' : '어요'}: the two vowels merge into one: ${dict} → ${right}.`
  return `${dict} → ${right}.`
}

/**
 * The honorific polite form -(으)세요: used for a listener or a person you respect, and for polite requests
 * (앉으세요 "please sit"). After a consonant it is 으세요, after a vowel 세요. 알다 drops its ㄹ (아세요); ㄷ-irregular
 * stems change ㄷ → ㄹ (들으세요); ㅂ-irregular stems take 우 (추우세요); ㅎ-irregular stems drop ㅎ (어떠세요).
 * Verbs with their own honorific word (먹다 → 드세요, 자다 → 주무세요) are not handled: the caller should leave them out.
 */
export function honorific(dict: string, irregular?: Irregular): string {
  if (!dict.endsWith('다')) throw new Error(`expected a dictionary form ending in 다: ${dict}`)
  if (dict === '이다') return '이세요/세요'
  const stem = [...dict.slice(0, -1)]
  const last = stem[stem.length - 1]
  const head = stem.slice(0, -1).join('')
  const [cho, jung, jong] = dec(last)
  if (irregular === 'ㅎ') return `${head}${composeSyllable(cho, jung === 'ㅏ' || jung === 'ㅓ' ? 'ㅓ' : jung)}세요` // 어떻다 → 어떠세요
  if (irregular === 'ㅂ') return `${head}${composeSyllable(cho, jung)}우세요` // 춥다 → 추우세요
  if (irregular === 'ㄷ') return `${head}${composeSyllable(cho, jung, 'ㄹ')}으세요` // 듣다 → 들으세요
  if (jong === 'ㄹ') return `${head}${composeSyllable(cho, jung)}세요` // 알다 → 아세요, 살다 → 사세요
  return jong ? `${head}${last}으세요` : `${head}${last}세요`
}

/** N + honorific copula: 선생님이세요 (after a consonant), 교수세요 (after a vowel). */
export function honorificCopula(noun: string): string {
  const last = [...noun.trim()].pop()
  const [, , jong] = last ? dec(last) : ['', '', '']
  return jong ? '이세요' : '세요'
}

/** Tempting-but-wrong honorific forms: the polite form, the wrong 으 choice, and the un-adjusted irregular stem. */
export function honorificDistractors(dict: string, irregular?: Irregular, count = 3): string[] {
  const right = honorific(dict, irregular)
  const stem = dict.slice(0, -1)
  const cands = [
    polite(dict, irregular), // 앉아요 (not honorific)
    right.endsWith('으세요') ? `${right.slice(0, -3)}세요` : `${right.slice(0, -2)}으세요`, // flipped 으
    `${stem}으세요`,
    `${stem}세요`,
    `${stem}시어요`,
    `${stem}습니다`,
  ]
  const out: string[] = []
  for (const c of cands) if (c !== right && !out.includes(c)) out.push(c)
  return out.slice(0, count)
}
