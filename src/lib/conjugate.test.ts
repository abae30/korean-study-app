import { describe, expect, it } from 'vitest'
import { describePolite, honorific, honorificCopula, honorificDistractors, polite, politeClass, politeDistractors } from './conjugate'

describe('polite ending: forms printed in the book (Lesson 2)', () => {
  const book: [string, string][] = [
    ['괜찮다', '괜찮아요'], ['재미있다', '재미있어요'], ['먹다', '먹어요'], ['맛있다', '맛있어요'], ['좋다', '좋아요'], ['많다', '많아요'],
    ['알다', '알아요'], ['넓다', '넓어요'], ['앉다', '앉아요'], ['공부하다', '공부해요'], ['숙제하다', '숙제해요'], ['보다', '봐요'],
    ['크다', '커요'], ['싸다', '싸요'], ['만나다', '만나요'], ['하다', '해요'], ['쓰다', '써요'], ['지내다', '지내요'],
    ['이다', '이에요'], ['아니다', '아니에요'],
  ]
  for (const [d, p] of book) it(`${d} → ${p}`, () => expect(polite(d)).toBe(p))

  it('어떻다 → 어때요 (ㅎ-irregular, printed in the book)', () => expect(polite('어떻다', 'ㅎ')).toBe('어때요'))
  it('그렇다 → 그래요 (Lesson 1)', () => expect(polite('그렇다', 'ㅎ')).toBe('그래요'))
  it('맛없다 / 재미없다 are regular', () => {
    expect(polite('맛없다')).toBe('맛없어요')
    expect(polite('재미없다')).toBe('재미없어요')
  })
})

describe('contractions', () => {
  it('ㅏ ㅓ ㅐ ㅔ stems just add 요', () => {
    for (const [d, p] of [['가다', '가요'], ['사다', '사요'], ['서다', '서요'], ['내다', '내요'], ['세다', '세요']]) expect(polite(d)).toBe(p)
  })
  it('ㅗ → ㅘ, ㅜ → ㅝ, ㅣ → ㅕ, ㅚ → ㅙ', () => {
    for (const [d, p] of [['오다', '와요'], ['보다', '봐요'], ['주다', '줘요'], ['배우다', '배워요'], ['마시다', '마셔요'], ['기다리다', '기다려요'], ['되다', '돼요']]) expect(polite(d)).toBe(p)
  })
  it('ㅡ drops, and the vowel before it decides', () => {
    for (const [d, p] of [['쓰다', '써요'], ['크다', '커요'], ['바쁘다', '바빠요'], ['예쁘다', '예뻐요'], ['아프다', '아파요'], ['나쁘다', '나빠요']]) expect(polite(d)).toBe(p)
  })
  it('stems ending in ㅟ / ㅢ keep 어요', () => expect(polite('쉬다')).toBe('쉬어요'))
})

describe('irregular classes', () => {
  it('ㅂ', () => {
    for (const [d, p] of [['춥다', '추워요'], ['덥다', '더워요'], ['맵다', '매워요'], ['어렵다', '어려워요'], ['쉽다', '쉬워요'], ['돕다', '도와요']]) expect(polite(d, 'ㅂ')).toBe(p)
  })
  it('ㄷ', () => {
    for (const [d, p] of [['듣다', '들어요'], ['걷다', '걸어요'], ['묻다', '물어요']]) expect(polite(d, 'ㄷ')).toBe(p)
  })
  it('ㅅ', () => {
    for (const [d, p] of [['낫다', '나아요'], ['짓다', '지어요']]) expect(polite(d, 'ㅅ')).toBe(p)
  })
  it('르', () => {
    for (const [d, p] of [['모르다', '몰라요'], ['다르다', '달라요'], ['빠르다', '빨라요'], ['누르다', '눌러요']]) expect(polite(d, '르')).toBe(p)
  })
  it('ㅎ', () => {
    for (const [d, p] of [['이렇다', '이래요'], ['저렇다', '저래요'], ['빨갛다', '빨개요'], ['하얗다', '하얘요']]) expect(polite(d, 'ㅎ')).toBe(p)
  })
  it('좋다 and 많다 (ㅎ-final but regular) stay regular', () => {
    expect(polite('좋다')).toBe('좋아요')
    expect(polite('많다')).toBe('많아요')
  })
})

describe('politeDistractors', () => {
  it('are wrong, distinct, and tempting', () => {
    const d = politeDistractors('먹다')
    expect(d).toHaveLength(3)
    expect(d).not.toContain('먹어요')
    expect(new Set(d).size).toBe(3)
    expect(d).toContain('먹아요') // wrong harmony
  })
  it('include the uncontracted form for contracting stems', () => {
    expect(politeDistractors('보다')).toContain('보아요')
    expect(politeDistractors('쓰다')).toContain('쓰어요')
  })
  it('never include the right answer', () => {
    for (const d of ['하다', '크다', '싸다', '좋다', '이다', '아니다']) expect(politeDistractors(d)).not.toContain(polite(d))
  })
})

describe('politeClass / describePolite', () => {
  it('plain stems vs contractions', () => {
    expect(politeClass('먹다')).toBe('plain')
    expect(politeClass('좋다')).toBe('plain')
    expect(politeClass('이다')).toBe('plain')
    expect(politeClass('보다')).toBe('contracted')
    expect(politeClass('싸다')).toBe('contracted')
    expect(politeClass('쓰다')).toBe('contracted')
    expect(politeClass('공부하다')).toBe('contracted')
    expect(politeClass('어떻다', 'ㅎ')).toBe('contracted')
  })
  it('explains the form', () => {
    expect(describePolite('먹다')).toContain('먹어요')
    expect(describePolite('먹다')).toContain('어요')
    expect(describePolite('좋다')).toContain('아요')
    expect(describePolite('하다')).toContain('해요')
    expect(describePolite('보다')).toContain('봐요')
    expect(describePolite('크다')).toContain('커요')
    expect(describePolite('어떻다', 'ㅎ')).toContain('어때요')
  })
})

describe('ㅕ stems (펴다)', () => {
  it('펴다 → 펴요, 켜다 → 켜요', () => {
    expect(polite('펴다')).toBe('펴요')
    expect(polite('켜다')).toBe('켜요')
  })
})

describe('honorific -(으)세요', () => {
  it('forms printed in the book (Lesson 3)', () => {
    for (const [d, h] of [['가다', '가세요'], ['앉다', '앉으세요'], ['인사하다', '인사하세요'], ['읽다', '읽으세요'], ['쓰다', '쓰세요'], ['보다', '보세요'], ['좋다', '좋으세요'], ['크다', '크세요'], ['있다', '있으세요'], ['없다', '없으세요'], ['많다', '많으세요'], ['따라하다', '따라하세요'], ['펴다', '펴세요'], ['덮다', '덮으세요']])
      expect(honorific(d)).toBe(h)
  })
  it('어떻다 → 어떠세요 (ㅎ), 듣다 → 들으세요 (ㄷ), 알다 → 아세요 (ㄹ drops)', () => {
    expect(honorific('어떻다', 'ㅎ')).toBe('어떠세요')
    expect(honorific('듣다', 'ㄷ')).toBe('들으세요')
    expect(honorific('알다')).toBe('아세요')
    expect(honorific('살다')).toBe('사세요')
  })
  it('ㅂ-irregular takes 우', () => expect(honorific('춥다', 'ㅂ')).toBe('추우세요'))
  it('copula: 이세요 after a consonant, 세요 after a vowel', () => {
    expect(honorificCopula('선생님')).toBe('이세요')
    expect(honorificCopula('한국 사람')).toBe('이세요')
    expect(honorificCopula('교수')).toBe('세요')
    expect(honorificCopula('아버지')).toBe('세요')
  })
})

describe('honorificDistractors', () => {
  it('are wrong, distinct, and include the plain polite form', () => {
    const d = honorificDistractors('앉다')
    expect(d).toHaveLength(3)
    expect(d).not.toContain('앉으세요')
    expect(d).toContain('앉아요')
    expect(new Set(d).size).toBe(3)
  })
  it('never include the right answer', () => {
    for (const d of ['가다', '읽다', '알다', '좋다']) expect(honorificDistractors(d)).not.toContain(honorific(d))
    expect(honorificDistractors('듣다', 'ㄷ')).not.toContain('들으세요')
  })
})
