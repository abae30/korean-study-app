// Practice-exercise generators for Lesson 2 grammar:
//   G2.1 subject particle 이/가 · G2.2/G2.3 polite ending -아요/어요 (and contractions) · G2.4 object particle 을/를
//   plus 들 (plural), 어때요? questions, and conjugation in both directions.
//
// Words come only from Lessons 1–2 (the tests check this). Particles and endings are computed from the batchim rule and the
// conjugation engine, never typed by hand.
import { lessons } from '../../data'
import type { Exercise } from '../../data/types'
import { describePolite, polite, politeClass, politeDistractors, type Irregular } from '../conjugate'
import { hasBatchim } from '../hangul'
import { batchimReason, subjectParticle } from '../korean'
import { makeBlank, makeConj } from './common'
import { PEOPLE } from './lesson1'

const L = 2

/** Adjective + a plain-English rendering of the whole sentence. */
type AdjSentence = [adj: string, en: string]

/** Nouns that can sensibly take each adjective, with the English for every pairing. */
export const ADJ_NOUNS: { n: string; nEn: string; adjs: AdjSentence[] }[] = [
  { n: '도서관', nEn: 'the library', adjs: [['넓다', 'The library is spacious.'], ['크다', 'The library is big.'], ['좋다', 'The library is nice.'], ['괜찮다', 'The library is okay.']] },
  { n: '학교', nEn: 'school', adjs: [['넓다', 'The school is spacious.'], ['크다', 'The school is big.'], ['좋다', 'The school is nice.'], ['괜찮다', 'The school is okay.']] },
  { n: '학교 식당', nEn: 'the school cafeteria', adjs: [['넓다', 'The school cafeteria is spacious.'], ['크다', 'The school cafeteria is big.'], ['좋다', 'The school cafeteria is nice.'], ['괜찮다', 'The school cafeteria is okay.']] },
  { n: '커피', nEn: 'the coffee', adjs: [['맛있다', 'The coffee is delicious.'], ['맛없다', 'The coffee is not delicious.'], ['싸다', 'The coffee is cheap.'], ['좋다', 'The coffee is good.'], ['괜찮다', 'The coffee is okay.']] },
  { n: '주스', nEn: 'the juice', adjs: [['맛있다', 'The juice is delicious.'], ['맛없다', 'The juice is not delicious.'], ['싸다', 'The juice is cheap.'], ['좋다', 'The juice is good.'], ['괜찮다', 'The juice is okay.']] },
  { n: '음식', nEn: 'the food', adjs: [['맛있다', 'The food is delicious.'], ['맛없다', 'The food is not delicious.'], ['싸다', 'The food is cheap.'], ['좋다', 'The food is good.'], ['괜찮다', 'The food is okay.']] },
  { n: '학교 식당 음식', nEn: 'the school cafeteria food', adjs: [['맛있다', 'The school cafeteria food is delicious.'], ['맛없다', 'The school cafeteria food is not delicious.'], ['싸다', 'The school cafeteria food is cheap.'], ['괜찮다', 'The school cafeteria food is okay.']] },
  { n: '수업', nEn: 'the class', adjs: [['재미있다', 'The class is interesting.'], ['재미없다', 'The class is uninteresting.'], ['좋다', 'The class is good.'], ['괜찮다', 'The class is okay.']] },
  { n: '한국어 수업', nEn: 'the Korean class', adjs: [['재미있다', 'The Korean class is interesting.'], ['재미없다', 'The Korean class is uninteresting.'], ['좋다', 'The Korean class is good.'], ['괜찮다', 'The Korean class is okay.']] },
  { n: '역사 수업', nEn: 'the history class', adjs: [['재미있다', 'The history class is interesting.'], ['재미없다', 'The history class is uninteresting.'], ['괜찮다', 'The history class is okay.']] },
  { n: '친구들', nEn: 'your friends', adjs: [['많다', 'There are many friends.'], ['좋다', 'The friends are nice.']] },
  { n: '학생들', nEn: 'the students', adjs: [['많다', 'There are many students.']] },
  { n: '숙제', nEn: 'the homework', adjs: [['많다', 'There is a lot of homework.'], ['재미있다', 'The homework is interesting.'], ['재미없다', 'The homework is uninteresting.'], ['괜찮다', 'The homework is okay.']] },
  { n: '텔레비전', nEn: 'the television', adjs: [['크다', 'The television is big.'], ['싸다', 'The television is cheap.'], ['좋다', 'The television is good.']] },
]

/** What each noun can answer to "…이/가 어때요?" (several answers are fine). */
const OTTAE = new Map(ADJ_NOUNS.filter((x) => !['친구들', '학생들'].includes(x.n)).map((x) => [x.n, x.adjs.map(([a]) => a)]))
const ALL_ADJ = [...new Set(ADJ_NOUNS.flatMap((x) => x.adjs.map(([a]) => a)))]

/** Object + verb pairs, with the English for 'I …' and '<name> …'. */
export const ACTIVITIES: { obj: string; verb: string; base: string; third: string }[] = [
  { obj: '아침', verb: '먹다', base: 'eat breakfast', third: 'eats breakfast' },
  { obj: '음식', verb: '먹다', base: 'eat food', third: 'eats food' },
  { obj: '텔레비전', verb: '보다', base: 'watch television', third: 'watches television' },
  { obj: '시험', verb: '보다', base: 'take an exam', third: 'takes an exam' },
  { obj: '한국어 시험', verb: '보다', base: 'take a Korean exam', third: 'takes a Korean exam' },
  { obj: '숙제', verb: '하다', base: 'do homework', third: 'does homework' },
  { obj: '역사 숙제', verb: '하다', base: 'do history homework', third: 'does history homework' },
  { obj: '한국어 숙제', verb: '하다', base: 'do Korean homework', third: 'does Korean homework' },
  { obj: '친구', verb: '만나다', base: 'meet a friend', third: 'meets a friend' },
  { obj: '친구들', verb: '만나다', base: 'meet friends', third: 'meets friends' },
  { obj: '남자 친구', verb: '만나다', base: 'meet a boyfriend', third: 'meets a boyfriend' },
  { obj: '한국어', verb: '공부하다', base: 'study Korean', third: 'studies Korean' },
  { obj: '역사', verb: '공부하다', base: 'study history', third: 'studies history' },
  { obj: '중국어', verb: '공부하다', base: 'study Chinese', third: 'studies Chinese' },
  { obj: '일본어', verb: '공부하다', base: 'study Japanese', third: 'studies Japanese' },
  { obj: '영어', verb: '공부하다', base: 'study English', third: 'studies English' },
]

/** Subjects for activity sentences: the classmates, plus "I" (which becomes 제 before 가). */
export const SUBJECTS2 = [...PEOPLE.map((p) => ({ ko: p.ko, en: p.en })), { ko: '저', en: 'I' }]
/** Subject as written before 이/가: 저 → 제 (G2.1 note 3). */
export const withSubjectParticle = (ko: string) => (ko === '저' ? '제가' : `${ko}${subjectParticle(ko)}`)

export const objectParticle = (noun: string) => (hasBatchim(noun) ? '을' : '를')

const sentenceEn = (s: { en: string }, a: { base: string; third: string }) => (s.en === 'I' ? `I ${a.base}.` : `${s.en} ${a.third}.`)

const vocabOf = (ko: string) => lessons.flatMap((l) => l.vocab).find((v) => v.ko === ko)
const irregularOf = (ko: string): Irregular | undefined => vocabOf(ko)?.irregular

const politeOf = (dict: string) => polite(dict, irregularOf(dict))
const choicesFor = (dict: string) => [politeOf(dict), ...politeDistractors(dict, irregularOf(dict))]
const gCodeFor = (dict: string) => (politeClass(dict, irregularOf(dict)) === 'plain' ? '2.2' : '2.3')

export function lesson2Exercises(): Exercise[] {
  const out: Exercise[] = []

  /* ── adjective sentences ── */
  for (const { n, nEn, adjs } of ADJ_NOUNS) {
    const sp = subjectParticle(n)
    for (const [adj, en] of adjs) {
      const right = politeOf(adj)
      // G2.1: 이/가 on the subject
      out.push(makeBlank(L, `subj-adj:${n}:${adj}`, '2.1', 'particle', `${n}___ ${right}.`, en, [sp], ['이', '가'], batchimReason(n, '이', '가')))
      // G2.2: type the whole polite form from the dictionary form
      out.push(makeBlank(L, `full-adj:${n}:${adj}`, gCodeFor(adj), 'ending', `${n}${sp} ___ (${adj}).`, en, [right], choicesFor(adj), describePolite(adj, irregularOf(adj))))
      // G2.2: just the ending, for plain closed stems (넓 → 어요, 많 → 아요)
      const stemEnd = right.endsWith('아요') ? '아요' : right.endsWith('어요') ? '어요' : null
      if (stemEnd && right.startsWith(adj.slice(0, -1)) && politeClass(adj) === 'plain')
        out.push(makeBlank(L, `end-adj:${n}:${adj}`, '2.2', 'ending', `${n}${sp} ${adj.slice(0, -1)}___.`, en, [stemEnd], ['아요', '어요'], describePolite(adj)))
    }
    // 어때요? questions: several answers are fine
    const good = OTTAE.get(n)
    if (good) {
      const goodForms = good.map(politeOf)
      const bad = ALL_ADJ.filter((a) => !good.includes(a)).map(politeOf)
      out.push(
        makeBlank(L, `ottae:${n}`, 'ottae', 'question', `A: ${n}${sp} 어때요? B: ___.`, `A: How is ${nEn}? B: (give a sensible answer)`, goodForms, [goodForms[0], ...bad.slice(0, 3)], `${n} can be described with: ${goodForms.join(', ')}.`),
      )
    }
  }

  /* ── object sentences ── */
  for (const s of SUBJECTS2) {
    const subjWritten = withSubjectParticle(s.ko)
    for (const a of ACTIVITIES) {
      const op = objectParticle(a.obj)
      const verb = politeOf(a.verb)
      const key = `${s.ko}:${a.obj}`
      const en = sentenceEn(s, a)
      // G2.4: 을/를 on the object
      out.push(makeBlank(L, `obj:${key}`, '2.4', 'particle', `${subjWritten} ${a.obj}___ ${verb}.`, en, [op], ['을', '를'], batchimReason(a.obj, '을', '를')))
      // G2.1: 이/가 on the subject (저 → 제가)
      const spExpl = s.ko === '저' ? '저 becomes 제 before 가 (제가).' : batchimReason(s.ko, '이', '가')
      const stem = s.ko === '저' ? '제' : s.ko
      out.push(makeBlank(L, `subj-act:${key}`, '2.1', 'particle', `${stem}___ ${a.obj}${op} ${verb}.`, en, [s.ko === '저' ? '가' : subjectParticle(s.ko)], ['이', '가'], spExpl))
      // G2.2/2.3: the polite verb
      out.push(makeBlank(L, `full-act:${key}`, gCodeFor(a.verb), 'ending', `${subjWritten} ${a.obj}${op} ___ (${a.verb}).`, en, [verb], choicesFor(a.verb), describePolite(a.verb, irregularOf(a.verb))))
    }
  }

  /* ── 들 (plural) ── */
  for (const [n, en] of [['학생', 'There are many students.'], ['친구', 'There are many friends.'], ['선생님', 'There are many teachers.'], ['남자', 'There are many men.']] as const) {
    out.push(makeBlank(L, `deul:${n}`, 'deul', 'particle', `${n}___이 많아요.`, en, ['들'], ['들', '도', '은'], '들 is the plural particle: it goes straight after the noun, and other particles (이/가, 은/는) follow it.'))
  }

  /* ── conjugation, both directions: every verb/adjective whose polite form we can compute ── */
  const pool = lessons
    .filter((l) => l.lesson <= L)
    .flatMap((l) => l.vocab)
    .filter((v) => (v.pos === 'verb' || v.pos === 'adjective' || v.pos === 'copula') && v.ko.endsWith('다') && v.forms?.includes(politeOf(v.ko)))
  pool.forEach((v, i) => {
    const right = politeOf(v.ko)
    const copula = v.ko === '이다'
    const answers = copula ? ['이에요', '예요'] : [right]
    const code = gCodeFor(v.ko)
    out.push(makeConj(L, `conj:${v.ko}`, code, v.ko, v.en, 'polite form', answers, [right, ...politeDistractors(v.ko, v.irregular)], describePolite(v.ko, v.irregular), v.irregular ? `${v.irregular}-irregular` : undefined))
    const others = [1, 2, 3].map((k) => pool[(i + k * 5) % pool.length].ko).filter((x) => x !== v.ko)
    out.push(makeConj(L, `rev:${v.ko}`, code, copula ? '이에요/예요' : right, v.en, 'dictionary form', [v.ko], [v.ko, ...others.slice(0, 3)], `${right} comes from ${v.ko}. ${describePolite(v.ko, v.irregular)}`))
  })

  return out
}
