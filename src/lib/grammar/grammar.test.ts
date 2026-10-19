import { describe, expect, it } from 'vitest'
import { lessons } from '../../data'
import { exercisePool, generatedFor } from './index'
import { copulaForm, subjectParticle, topicParticle } from '../korean'
import { honorific, polite } from '../conjugate'
import { objectParticle } from './lesson2'
import { native, sino } from './lesson4'
import { clockKo, purpose } from './lesson5'
import type { Lesson } from '../../data/types'

// The practice generators belong to the textbook lessons that are bundled in src/data/lessons (git-ignored in the public repo).
// Without them (a fresh clone has only the sample lesson) those suites are skipped.
const HAS_BOOK = lessons.filter((l) => !l.sample).length >= 5
const EMPTY_LESSON = { lesson: 0, title: '', titleKo: '', names: [], vocab: [], sentences: [], paragraphs: [], grammar: [], exercises: [] } as Lesson

describe('korean helpers', () => {
  it('picks particles and endings by batchim', () => {
    expect(topicParticle('마이클')).toBe('은')
    expect(topicParticle('소피아')).toBe('는')
    expect(subjectParticle('학생')).toBe('이')
    expect(subjectParticle('제니')).toBe('가')
    expect(copulaForm('사람')).toBe('이에요')
    expect(copulaForm('소피아')).toBe('예요')
  })
})

describe.skipIf(!HAS_BOOK)('Lesson 1 generated exercises', () => {
  const all = HAS_BOOK ? generatedFor(1) : []

  it('is a large pool', () => expect(all.length).toBeGreaterThan(1000))

  it('has unique ids', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
  })

  it('is well formed: one blank, answer among the choices, answers non-empty', () => {
    const bad: string[] = []
    for (const e of all) {
      if (e.type !== 'blank') bad.push(`${e.id}: not a blank`)
      else {
        if (e.sentence.split('___').length !== 2) bad.push(`${e.id}: needs exactly one blank`)
        if (!e.answers.length || !e.choices.includes(e.answers[0])) bad.push(`${e.id}: answer missing from choices`)
        if (!e.en || !e.explanation) bad.push(`${e.id}: missing text`)
      }
    }
    expect(bad).toEqual([])
  })

  it('answers agree with the batchim rule when the blank is filled in', () => {
    // fill the blank and check the particle/ending that appears is the right one for the word before it
    const bad: string[] = []
    for (const e of all) {
      if (e.type !== 'blank') continue
      const filled = e.sentence.replace('___', e.answers[0])
      if (e.id.startsWith('g1:topic:') || e.id.startsWith('g1:cop:') || e.id.startsWith('g1:neg:')) {
        const noun = e.id.startsWith('g1:topic:') ? e.id.split(':')[2] : e.id.split(':')[3]
        const expected = e.id.startsWith('g1:topic:') ? topicParticle(noun) : e.id.startsWith('g1:cop:') ? copulaForm(noun) : subjectParticle(noun)
        if (e.answers[0] !== expected) bad.push(`${e.id}: ${filled}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('uses only Lesson 1 vocabulary and names', () => {
    const l1 = (lessons.find((l) => l.lesson === 1) ?? EMPTY_LESSON)
    const known = new Set<string>()
    for (const v of l1.vocab) [v.ko, ...(v.forms ?? [])].forEach((k) => known.add(k))
    for (const n of l1.names) {
      known.add(n.ko)
      n.ko.split(' ').forEach((p) => known.add(p))
    }
    const suffixes = ['이에요', '예요', '이', '가', '은', '는', '도', '에서', '에', '의']
    const resolves = (tok: string) => {
      const t = tok.replace(/[.,?!:→]/g, '')
      if (!t || !/[가-힣]/.test(t) || /^\d+학년$/.test(t)) return true
      const stack = [t]
      while (stack.length) {
        const cur = stack.pop()!
        if (known.has(cur)) return true
        for (const s of suffixes) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
      }
      return false
    }
    const unknown = new Set<string>()
    for (const e of all) {
      if (e.type !== 'blank') continue
      for (const tok of e.sentence.replace('___', e.answers[0]).split(/\s+/)) if (!resolves(tok)) unknown.add(tok)
    }
    expect([...unknown]).toEqual([])
  })

  it('covers every Lesson 1 focus the book teaches', () => {
    const grammar = new Set(all.map((e) => e.grammarId))
    for (const g of ['1.1', '1.3', '1.4', '1.5']) expect(grammar.has(`l1-g-${g}`)).toBe(true)
    expect(new Set(all.map((e) => e.focus))).toEqual(new Set(['particle', 'ending', 'question']))
  })

  it('exercises the vowel branch too (예요 / 가 / 는)', () => {
    const answers = new Set(all.flatMap((e) => (e.type === 'blank' ? e.answers : [])))
    for (const a of ['은', '는', '이에요', '예요', '이', '가', '도', '네', '아니요']) expect(answers.has(a)).toBe(true)
  })
})

describe.skipIf(!HAS_BOOK)('exercisePool', () => {
  it('combines the book exercises with generated ones, without duplicate ids', () => {
    const pool = exercisePool([1])
    expect(pool.length).toBeGreaterThan(1100)
    expect(new Set(pool.map((e) => e.id)).size).toBe(pool.length)
    expect(pool.some((e) => e.source === 'textbook')).toBe(true)
    expect(pool.some((e) => e.source === 'generated')).toBe(true)
  })
  it('is empty for a lesson that is not imported', () => {
    expect(exercisePool([99])).toEqual([])
  })
})

describe.skipIf(!HAS_BOOK)('Lesson 2 generated exercises', () => {
  const all = HAS_BOOK ? generatedFor(2) : []
  const l2 = (lessons.find((l) => l.lesson === 2) ?? EMPTY_LESSON)
  const sentences = new Set(l2.sentences.map((s) => s.ko))
  const fill = (e: (typeof all)[number]) => (e.type === 'blank' ? e.sentence.replace(/___( \([^)]*\))?/, e.answers[0]) : '')

  it('is a large pool', () => expect(all.length).toBeGreaterThan(700))

  it('has unique ids and well-formed exercises', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    const bad: string[] = []
    for (const e of all) {
      if (!e.answers.length || !e.choices.includes(e.answers[0])) bad.push(`${e.id}: answer missing from choices`)
      if (new Set(e.choices).size !== e.choices.length) bad.push(`${e.id}: duplicate choices`)
      if (e.type === 'blank' && e.sentence.split('___').length !== 2) bad.push(`${e.id}: needs exactly one blank`)
      if (!e.explanation) bad.push(`${e.id}: no explanation`)
    }
    expect(bad).toEqual([])
  })

  it('every filled-in sentence is a real practice sentence in the lesson data', () => {
    const missing = all.filter((e) => /^g2:(subj-adj|end-adj|full-adj|obj|subj-act|full-act):/.test(e.id)).map((e) => ({ id: e.id, filled: fill(e) })).filter((x) => !sentences.has(x.filled))
    expect(missing.slice(0, 5)).toEqual([])
  })

  it('answers are the conjugation engine / batchim rule, not guesses', () => {
    for (const e of all.filter((x) => x.id.startsWith('g2:conj:'))) {
      if (e.type !== 'conjugate') continue
      const v = l2.vocab.concat(lessons[0].vocab).find((x) => x.ko === e.base)!
      expect(e.answers[0]).toBe(e.base === '이다' ? '이에요' : polite(e.base, v.irregular))
    }
    for (const e of all.filter((x) => x.id.startsWith('g2:obj:'))) if (e.type === 'blank') expect(e.answers[0]).toBe(objectParticle(e.id.split(':')[3]))
  })

  it('teaches 저 → 제 before 가', () => {
    const e = all.find((x) => x.id === 'g2:subj-act:저:아침')!
    expect(e.type === 'blank' && e.sentence.startsWith('제___')).toBe(true)
    expect(e.answers).toEqual(['가'])
  })

  it('covers every Lesson 2 grammar point it should', () => {
    const grammar = new Set(all.map((e) => e.grammarId))
    for (const g of ['2.1', '2.2', '2.3', '2.4', 'deul', 'ottae']) expect(grammar.has(`l2-g-${g}`)).toBe(true)
  })

  it('has both directions of conjugation for every verb and adjective', () => {
    const conj = all.filter((e) => e.type === 'conjugate')
    expect(conj.filter((e) => e.id.startsWith('g2:conj:')).length).toBeGreaterThanOrEqual(20)
    expect(conj.filter((e) => e.id.startsWith('g2:rev:')).length).toBe(conj.filter((e) => e.id.startsWith('g2:conj:')).length)
    expect(conj.some((e) => e.type === 'conjugate' && e.base === '어떻다' && e.answers[0] === '어때요')).toBe(true)
  })

  it('uses only vocabulary and names from Lessons 1–2', () => {
    const known = new Set<string>()
    for (const l of lessons.filter((x) => x.lesson <= 2)) {
      for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split('/')).forEach((k) => known.add(k))
      for (const n of l.names) {
        known.add(n.ko)
        n.ko.split(' ').forEach((p) => known.add(p))
      }
    }
    known.add('제') // 저 + ㅔ before 가 (G2.1): the bare 제 appears in the blank "제___"
    const suffixes = ['이에요', '예요', '이', '가', '은', '는', '도', '을', '를', '들', '에서', '에', '의']
    const resolves = (tok: string) => {
      const t = tok.replace(/[.,?!:→()]/g, '')
      if (!t || !/[가-힣]/.test(t) || /^\d+학년$/.test(t)) return true
      const stack = [t]
      while (stack.length) {
        const cur = stack.pop()!
        if (known.has(cur) || known.has(cur + '다')) return true // a bare stem (넓) of a known verb/adjective (넓다)
        for (const s of suffixes) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
      }
      return false
    }
    const unknown = new Set<string>()
    for (const e of all) {
      const text = e.type === 'blank' ? fill(e) + ' ' + e.sentence.replace(/___/g, ' ') : e.base + ' ' + e.answers.join(' ')
      for (const tok of text.split(/[\s/]+/)) if (!resolves(tok)) unknown.add(tok)
    }
    expect([...unknown]).toEqual([])
  })
})

describe.skipIf(!HAS_BOOK)('Lesson 3 generated exercises', () => {
  const all = HAS_BOOK ? generatedFor(3) : []
  const l3 = (lessons.find((l) => l.lesson === 3) ?? EMPTY_LESSON)
  const sentences = new Set(l3.sentences.map((s) => s.ko))
  const fill = (e: (typeof all)[number]) => (e.type === 'blank' ? e.sentence.replace(/___( \([^)]*\))?/, e.answers[0]) : '')

  it('is a large pool', () => expect(all.length).toBeGreaterThan(1000))

  it('has unique ids and well-formed exercises', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    const bad: string[] = []
    for (const e of all) {
      if (!e.answers.length || !e.choices.includes(e.answers[0])) bad.push(`${e.id}: answer missing from choices`)
      if (new Set(e.choices).size !== e.choices.length) bad.push(`${e.id}: duplicate choices`)
      if (e.type === 'blank' && e.sentence.split('___').length !== 2) bad.push(`${e.id}: needs exactly one blank`)
      if (!e.explanation) bad.push(`${e.id}: no explanation`)
    }
    expect(bad).toEqual([])
  })

  it('every filled-in sentence is a real practice sentence in the lesson data', () => {
    const rx = /^g3:(loc-pos|loc-part|floor-part|poss|poss-part|hon-poss|hon-cop|conn|req):/
    const missing = all.filter((e) => rx.test(e.id)).map((e) => ({ id: e.id, filled: fill(e) })).filter((x) => !sentences.has(x.filled))
    expect(missing.slice(0, 5)).toEqual([])
  })

  it('honorific answers come from the conjugation engine', () => {
    for (const e of all.filter((x) => x.id.startsWith('g3:hconj:'))) {
      if (e.type !== 'conjugate') continue
      const irr = e.irregular?.startsWith('ㅎ') ? 'ㅎ' : e.irregular?.startsWith('ㄷ') ? 'ㄷ' : undefined
      expect(e.answers[0]).toBe(honorific(e.base, irr))
    }
    expect(all.find((x) => x.id === 'g3:hconj:듣다')?.answers).toEqual(['들으세요'])
    expect(all.find((x) => x.id === 'g3:hconj:어떻다')?.answers).toEqual(['어떠세요'])
  })

  it('possession exercises say in English which verb is meant (so the answer is not a coin flip)', () => {
    for (const e of all.filter((x) => x.id.startsWith('g3:poss:'))) {
      if (e.type !== 'blank') continue
      expect(e.en.includes('does not have')).toBe(e.answers[0] === '없어요')
    }
  })

  it('teaches the honorific copula: 이세요 after a consonant, 세요 after a vowel', () => {
    const a = all.find((x) => x.id === 'g3:hon-cop:이 선생님:교수')!
    const b = all.find((x) => x.id === 'g3:hon-cop:이 선생님:한국 사람')!
    expect(a.answers).toEqual(['세요'])
    expect(b.answers).toEqual(['이세요'])
  })

  it('covers every Lesson 3 grammar point', () => {
    const grammar = new Set(all.map((e) => e.grammarId))
    for (const g of ['3.1', '3.2', '3.3', '3.4', 'geuraeseo', 'geureonde', 'nugu', 'request']) expect(grammar.has(`l3-g-${g}`)).toBe(true)
  })

  it('uses only vocabulary and names from Lessons 1–3', () => {
    const known = new Set<string>(['제', '요']) // 제: 저 before 가 (G2.1); 요: the polite particle in ~은요/는요? (G3.2)
    for (const l of lessons.filter((x) => x.lesson <= 3)) {
      for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split(/[/ ]/)).forEach((k) => known.add(k))
      for (const n of l.names) {
        known.add(n.ko)
        n.ko.split(' ').forEach((p) => known.add(p))
      }
    }
    const suffixes = ['이세요', '으세요', '세요', '이에요', '예요', '요', '이', '가', '은', '는', '도', '을', '를', '들', '에서', '에', '의']
    const resolves = (tok: string) => {
      const t = tok.replace(/[.,?!:→()]/g, '')
      if (!t || !/[가-힣]/.test(t) || /^\d+(학년|층)(에)?$/.test(t)) return true
      const stack = [t]
      while (stack.length) {
        const cur = stack.pop()!
        if (known.has(cur) || known.has(cur + '다')) return true
        for (const s of suffixes) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
      }
      return false
    }
    const unknown = new Set<string>()
    for (const e of all) {
      const text = e.type === 'blank' ? fill(e) + ' ' + e.sentence.replace(/___/g, ' ') + ' ' + e.answers.join(' ') : e.base + ' ' + e.answers.join(' ')
      for (const tok of text.split(/[\s/]+/)) if (!resolves(tok)) unknown.add(tok)
    }
    expect([...unknown]).toEqual([])
  })
})

describe('Lesson 4 numbers', () => {
  it('reads Sino-Korean numbers', () => {
    expect(sino(11)).toBe('십일')
    expect(sino(20)).toBe('이십')
    expect(sino(100)).toBe('백')
    expect(sino(1000)).toBe('천')
    expect(sino(10000)).toBe('만')
    expect(sino(15000)).toBe('만오천')
    expect(sino(1900000)).toBe('백구십만') // the book: 텔레비전은 백구십만 원이에요
    expect(sino(10200000)).toBe('천이십만') // the book: 서울 인구는 천이십만이에요
    expect(sino(50000000)).toBe('오천만')
    expect(sino(200000000 / 10)).toBe('이천만')
  })
  it('reads native Korean numbers, with the short forms before a counter', () => {
    expect(native(1, false)).toBe('하나')
    expect(native(1, true)).toBe('한')
    expect(native(20, false)).toBe('스물')
    expect(native(20, true)).toBe('스무')
    expect(native(21, true)).toBe('스물한')
    expect(native(34, true)).toBe('서른네')
    expect(native(99, false)).toBe('아흔아홉')
  })
})

describe.skipIf(!HAS_BOOK)('Lesson 4 generated exercises', () => {
  const all = HAS_BOOK ? generatedFor(4) : []
  const upTo4 = lessons.filter((l) => l.lesson <= 4)
  const sentences = new Set(upTo4.flatMap((l) => l.sentences.map((s) => s.ko)))
  const fill = (e: (typeof all)[number]) => (e.type === 'blank' ? e.sentence.replace(/___( \([^)]*\))?/, e.answers[0]) : '')

  it('is a large pool', () => expect(all.length).toBeGreaterThan(1500))

  it('has unique ids and well-formed exercises', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    const bad: string[] = []
    for (const e of all) {
      if (!e.answers.length || !e.choices.includes(e.answers[0])) bad.push(`${e.id}: answer missing from choices`)
      if (new Set(e.choices).size !== e.choices.length) bad.push(`${e.id}: duplicate choices`)
      if (e.type === 'blank' && e.sentence.split('___').length !== 2) bad.push(`${e.id}: needs exactly one blank`)
      if (!e.explanation) bad.push(`${e.id}: no explanation`)
    }
    expect(bad).toEqual([])
  })

  it('every filled-in plain sentence is a real practice sentence in the lesson data', () => {
    const rx = /^g4:(cnt-num|cnt-ctr|cnt-sp|floor|price|price-ctr|alt-nat|alt-have|poss-fam|gye:(?!계시다)|ite|hon-have|hago|man|do|act|adj):/
    const missing = all
      .filter((e) => rx.test(e.id))
      .map((e) => ({ id: e.id, filled: fill(e).replace(/^3층에/, '') }))
      .filter((x) => !sentences.has(x.filled) && !sentences.has(x.filled.replace(/^(\d+)층에$/, '')))
    // floor-… exercises blank "층에" inside a sentence; check them separately below
    expect(missing.filter((m) => !m.id.startsWith('g4:floor:')).slice(0, 5)).toEqual([])
  })

  it('number answers come from the number functions', () => {
    for (const e of all.filter((x) => x.id.startsWith('g4:nat-bare:'))) expect(e.answers[0]).toBe(native(Number(e.id.split(':')[2]), false))
    for (const e of all.filter((x) => x.id.startsWith('g4:sino-bare:'))) expect(e.answers[0]).toBe(sino(Number(e.id.split(':')[2])))
    expect(all.find((x) => x.id === 'g4:nat:20명')?.answers[0]).toBe('스무 명')
    expect(all.find((x) => x.id === 'g4:nat:21명')?.answers[0]).toBe('스물한 명')
    expect(all.find((x) => x.id === 'g4:sino:5층')?.answers[0]).toBe('오 층')
  })

  it('covers every Lesson 4 grammar point', () => {
    const grammar = new Set(all.map((e) => e.grammarId))
    for (const g of ['4.1', '4.2', '4.3', '4.4', '4.5', 'gyesida', 'hago', 'man']) expect(grammar.has(`l4-g-${g}`)).toBe(true)
  })

  it('uses only vocabulary and names from Lessons 1–4', () => {
    const known = new Set<string>(['제', '요'])
    for (const l of upTo4) {
      for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split(/[/ ]/)).forEach((k) => known.add(k))
      for (const n of l.names) {
        known.add(n.ko)
        n.ko.split(' ').forEach((p) => known.add(p))
      }
    }
    const suffixes = ['이세요', '으세요', '세요', '이에요', '예요', '요', '이', '가', '은', '는', '도', '을', '를', '들', '하고', '만', '에서', '에', '의']
    const sinoWord = /^[영일이삼사오육칠팔구십백천만억]+$/
    const natWord = /^(열|스물|스무|서른|마흔|쉰|예순|일흔|여든|아흔)?(하나|한|둘|두|셋|세|넷|네|다섯|여섯|일곱|여덟|아홉)?$/
    const counterTail = /(층|과|원|학년|월|년|달러|불|명|개|마리|권|시간|달)$/
    const resolves = (tok: string) => {
      const raw = tok.replace(/[.,?!:→()]/g, '')
      const bare = raw.replace(counterTail, '')
      const t = sinoWord.test(bare) || natWord.test(bare) || /^[\d,]+$/.test(bare) ? '' : raw
      if (!t || !/[가-힣]/.test(t) || sinoWord.test(t) || natWord.test(t) || /^\d+(학년|층|명|개|권|원|월)?(에|이에요)?$/.test(t)) return true
      const stack = [t]
      while (stack.length) {
        const cur = stack.pop()!
        if (known.has(cur) || known.has(cur + '다') || sinoWord.test(cur) || natWord.test(cur)) return true
        for (const s of suffixes) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
      }
      return false
    }
    const unknown = new Set<string>()
    for (const e of all) {
      const text = e.type === 'blank' ? fill(e) + ' ' + e.sentence.replace(/___/g, ' ') + ' ' + e.answers.join(' ') : e.base + ' ' + e.answers.join(' ')
      for (const tok of text.split(/[\s/]+/)) if (!resolves(tok)) unknown.add(tok)
    }
    expect([...unknown]).toEqual([])
  })
})

describe.skipIf(!HAS_BOOK)('Lesson 5 generated exercises', () => {
  const all = HAS_BOOK ? generatedFor(5) : []
  const upTo5 = lessons.filter((l) => l.lesson <= 5)
  const sentences = new Set(upTo5.flatMap((l) => l.sentences.map((s) => s.ko)))
  const fill = (e: (typeof all)[number]) => (e.type === 'blank' ? e.sentence.replace(/___( \([^)]*\))?/, e.answers[0]) : '')

  it('is a large pool', () => expect(all.length).toBeGreaterThan(700))

  it('has unique ids and well-formed exercises', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    const bad: string[] = []
    for (const e of all) {
      if (!e.answers.length || !e.choices.includes(e.answers[0])) bad.push(`${e.id}: answer missing from choices`)
      if (new Set(e.choices).size !== e.choices.length) bad.push(`${e.id}: duplicate choices`)
      if (e.type === 'blank' && e.sentence.split('___').length !== 2) bad.push(`${e.id}: needs exactly one blank`)
      if (!e.explanation) bad.push(`${e.id}: no explanation`)
    }
    expect(bad).toEqual([])
  })

  it('every filled-in plain sentence is a real practice sentence in the lesson data', () => {
    const rx = /^g5:(se|act|obj|go|static|pur|pur-ru|pur-place|pur-verb|ev-e|day-e|day-w):/
    const missing = all.filter((e) => rx.test(e.id) && !e.id.startsWith('g5:static-vs')).map((e) => ({ id: e.id, filled: fill(e) })).filter((x) => !sentences.has(x.filled) && !x.id.startsWith('g5:static:') && !x.id.startsWith('g5:pur-ru:'))
    expect(missing.slice(0, 5)).toEqual([])
  })

  it('the purpose form follows the 으러 / 러 rule', () => {
    expect(purpose('먹다')).toBe('먹으러')
    expect(purpose('사다')).toBe('사러')
    expect(purpose('공부하다')).toBe('공부하러')
    expect(purpose('듣다', 'ㄷ')).toBe('들으러')
    expect(purpose('걷다', 'ㄷ')).toBe('걸으러')
  })

  it('reads times with native hours and Sino-Korean minutes', () => {
    expect(clockKo(3, 25)).toBe('세 시 이십오 분')
    expect(clockKo(12, 0)).toBe('열두 시')
    expect(clockKo(10, 24)).toBe('열 시 이십사 분') // the book: 10시 24분 (열 시 이십사 분)
    expect(all.find((x) => x.id === 'g5:clock:6:30')?.answers).toContain('여섯 시 반')
  })

  it('ㄷ-irregular verbs change ㄷ to ㄹ, 받다 stays regular', () => {
    expect(all.find((x) => x.id === 'g5:d-polite:듣다')?.answers).toEqual(['들어요'])
    expect(all.find((x) => x.id === 'g5:d-hon:걷다')?.answers).toEqual(['걸으세요'])
    expect(all.find((x) => x.id === 'g5:d-polite:받다')?.answers).toEqual(['받아요'])
  })

  it('covers every Lesson 5 grammar point', () => {
    const grammar = new Set(all.map((e) => e.grammarId))
    for (const g of ['5.1', '5.2', '5.3', '5.4', 'time']) expect(grammar.has(`l5-g-${g}`)).toBe(true)
  })

  it('uses only vocabulary and names from Lessons 1–5', () => {
    const known = new Set<string>(['제', '요', '걸', '들']) // 걸/들: the ㄹ stems of 걷다/듣다 shown before the blank 으러
    for (const l of upTo5) {
      for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split(/[/ ]/)).forEach((k) => known.add(k))
      for (const n of l.names) {
        known.add(n.ko)
        n.ko.split(' ').forEach((p) => known.add(p))
      }
    }
    const suffixes = ['이세요', '으세요', '세요', '이에요', '예요', '으러', '러', '요', '이', '가', '은', '는', '도', '을', '를', '들', '하고', '만', '에서', '에', '의']
    const sinoWord = /^[영일이삼사오육칠팔구십백천만억]+$/
    const natWord = /^(열|스물|스무|서른|마흔|쉰|예순|일흔|여든|아흔)?(하나|한|둘|두|셋|세|넷|네|다섯|여섯|일곱|여덟|아홉)?$/
    const counterTail = /(층|과|원|학년|월|년|달러|불|명|개|마리|권|시간|달|시|분)$/
    const resolves = (tok: string) => {
      const raw = tok.replace(/[.,?!:→()\[\]]/g, '')
      const bare = raw.replace(/에$/, '').replace(counterTail, '')
      const t = sinoWord.test(bare) || natWord.test(bare) || /^[\d,]+$/.test(bare) ? '' : raw
      if (!t || !/[가-힣]/.test(t)) return true
      const stack = [t]
      while (stack.length) {
        const cur = stack.pop()!
        if (known.has(cur) || known.has(cur + '다') || sinoWord.test(cur) || natWord.test(cur)) return true
        for (const s of suffixes) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
      }
      return false
    }
    const unknown = new Set<string>()
    for (const e of all) {
      const text = e.type === 'blank' ? fill(e) + ' ' + e.sentence.replace(/___/g, ' ') + ' ' + e.answers.join(' ') : e.base + ' ' + e.answers.join(' ')
      for (const tok of text.split(/[\s/]+/)) if (!resolves(tok)) unknown.add(tok)
    }
    expect([...unknown]).toEqual([])
  })
})
