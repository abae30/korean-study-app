// Practice-exercise generators for Lesson 1 grammar (G1.1 – G1.5).
//
// Each generator enumerates every combination of people × predicates, so the pool is large (over a thousand exercises)
// and every exercise has a stable id the spaced-repetition scheduler can track. Answers come from the batchim rule, not
// from hand-typing, and the test suite checks that every word used is Lesson 1 vocabulary or a Lesson 1 name.
import type { BlankExercise, Exercise } from '../../data/types'
import { batchimReason, copulaForm, subjectParticle, topicParticle } from '../korean'

const L = 1
type Nat = '한국' | '미국' | '영국' | '일본' | '중국'
interface Person {
  ko: string
  en: string
  year: 1 | 2 | 3 | 4
  nat: Nat
}

// Fictional classmates. The facts only need to be consistent within an exercise; no sentence has to be "true".
export const PEOPLE: Person[] = [
  { ko: '스티브', en: 'Steve', year: 3, nat: '미국' },
  { ko: '마이클', en: 'Michael', year: 1, nat: '한국' },
  { ko: '유미', en: 'Yumi', year: 1, nat: '한국' },
  { ko: '소피아', en: 'Sophia', year: 2, nat: '중국' },
  { ko: '제임스', en: 'James', year: 4, nat: '미국' },
  { ko: '미치코', en: 'Michiko', year: 4, nat: '일본' },
  { ko: '에드워드', en: 'Edward', year: 2, nat: '영국' },
  { ko: '폴', en: 'Paul', year: 3, nat: '미국' },
  { ko: '리사', en: 'Lisa', year: 3, nat: '영국' },
  { ko: '수잔', en: 'Susan', year: 4, nat: '미국' },
  { ko: '수지', en: 'Susie', year: 2, nat: '미국' },
  { ko: '제시카', en: 'Jessica', year: 1, nat: '미국' },
  { ko: '제니', en: 'Jenny', year: 2, nat: '한국' },
  { ko: '린다', en: 'Linda', year: 1, nat: '영국' },
]

/** Other subjects (the book's full names, plus "I" and "the teacher"). */
const EXTRA_SUBJECTS: { ko: string; en: string; i?: boolean }[] = [
  { ko: '저', en: 'I', i: true },
  { ko: '선생님', en: 'The teacher' },
  { ko: '이민수 선생님', en: 'Professor Lee' },
  { ko: '소피아 왕', en: 'Sophia Wang' },
  { ko: '스티브 윌슨', en: 'Steve Wilson' },
  { ko: '김유미', en: 'Yumi Kim' },
  { ko: '마이클 정', en: 'Michael Jung' },
]
const SUBJECTS = [...PEOPLE.map((p) => ({ ko: p.ko, en: p.en })), ...EXTRA_SUBJECTS]

const NAT_EN: Record<Nat, string> = { 한국: 'Korean', 미국: 'American', 영국: 'British', 일본: 'Japanese', 중국: 'Chinese' }
const YEAR_EN = { 1: 'a freshman', 2: 'a sophomore', 3: 'a junior', 4: 'a senior' } as const

/** Predicate nouns: Korean, and how the English reads after "is" / "is not". */
const PREDICATES: { ko: string; en: string }[] = [
  { ko: '학생', en: 'a student' },
  { ko: '대학생', en: 'a college student' },
  { ko: '선생님', en: 'a teacher' },
  { ko: '한국어 선생님', en: 'a Korean teacher' },
  { ko: '영어 선생님', en: 'an English teacher' },
  { ko: '1학년', en: 'a freshman' },
  { ko: '2학년', en: 'a sophomore' },
  { ko: '3학년', en: 'a junior' },
  { ko: '4학년', en: 'a senior' },
  ...(['한국', '미국', '영국', '일본', '중국'] as Nat[]).map((n) => ({ ko: `${n} 사람`, en: NAT_EN[n] })),
  { ko: '프랑스 사람', en: 'French' },
  { ko: '스페인 사람', en: 'Spanish' },
  { ko: '러시아 사람', en: 'Russian' },
]
const NAME_PREDICATES = [...PEOPLE.map((p) => ({ ko: p.ko, en: p.en })), { ko: '리사', en: 'Lisa' }].filter((v, i, a) => a.findIndex((x) => x.ko === v.ko) === i)

const be = (subjEn: string) => (subjEn === 'I' ? 'am' : 'is')

const blank = (
  id: string,
  grammarId: string,
  focus: BlankExercise['focus'],
  sentence: string,
  en: string,
  answers: string[],
  choices: string[],
  explanation: string,
): BlankExercise => ({
  id: `g${L}:${id}`,
  grammarId: `l${L}-g-${grammarId}`,
  lesson: L,
  focus,
  source: 'generated',
  explanation,
  type: 'blank',
  sentence,
  en,
  answers,
  choices,
})

export function lesson1Exercises(): Exercise[] {
  const out: Exercise[] = []

  for (const s of SUBJECTS) {
    const topic = topicParticle(s.ko)
    const isI = s.ko === '저'
    for (const p of PREDICATES) {
      const cop = copulaForm(p.ko)
      const en = `${s.en} ${be(s.en)} ${p.en}.`
      // G1.1 topic particle on the subject
      out.push(blank(`topic:${s.ko}:${p.ko}`, '1.1', 'particle', `${s.ko}___ ${p.ko}${cop}.`, en, [topic], ['은', '는'], batchimReason(s.ko, '은', '는')))
      // G1.1 copula on the predicate
      out.push(blank(`cop:${s.ko}:${p.ko}`, '1.1', 'ending', `${s.ko}${topic} ${p.ko}___.`, en, [cop], ['이에요', '예요'], batchimReason(p.ko, '이에요', '예요')))
      // G1.5 negative: 이/가 before 아니에요
      out.push(
        blank(
          `neg:${s.ko}:${p.ko}`,
          '1.5',
          'particle',
          `${s.ko}${topic} ${p.ko}___ 아니에요.`,
          `${s.en} ${isI ? 'am' : 'is'} not ${p.en}.`,
          [subjectParticle(p.ko)],
          ['이', '가'],
          batchimReason(p.ko, '이', '가') + ' It goes before 아니에요.',
        ),
      )
    }
  }

  // Names as the predicate: both the 예요 / 가 branches get practised ("저는 소피아예요", "저는 소피아가 아니에요")
  for (const n of NAME_PREDICATES) {
    out.push(blank(`copname:${n.ko}`, '1.1', 'ending', `저는 ${n.ko}___.`, `I am ${n.en}.`, [copulaForm(n.ko)], ['이에요', '예요'], batchimReason(n.ko, '이에요', '예요')))
    out.push(blank(`negname:${n.ko}`, '1.5', 'particle', `저는 ${n.ko}___ 아니에요.`, `I am not ${n.en}.`, [subjectParticle(n.ko)], ['이', '가'], batchimReason(n.ko, '이', '가') + ' It goes before 아니에요.'))
  }

  // G1.3: 도 ("also") when the two statements match, 은/는 when they contrast
  for (const a of PEOPLE) {
    for (const b of PEOPLE) {
      if (a.ko === b.ko) continue
      const yearSame = a.year === b.year
      out.push(
        blank(
          `also-year:${a.ko}:${b.ko}`,
          '1.3',
          'particle',
          `${a.ko}${topicParticle(a.ko)} ${a.year}학년이에요. → ${b.ko}___ ${yearSame ? a.year : b.year}학년이에요.`,
          yearSame ? `${a.en} is ${YEAR_EN[a.year]}. → ${b.en} is ${YEAR_EN[a.year]} too.` : `${a.en} is ${YEAR_EN[a.year]}. → ${b.en} is ${YEAR_EN[b.year]}.`,
          yearSame ? ['도'] : [topicParticle(b.ko)],
          ['도', '은', '는'],
          yearSame ? 'The two are parallel ("also"), so use 도.' : `The two contrast, so use the contrast particle 은/는. ${batchimReason(b.ko, '은', '는')}`,
        ),
      )
      const natSame = a.nat === b.nat
      out.push(
        blank(
          `also-nat:${a.ko}:${b.ko}`,
          '1.3',
          'particle',
          `${a.ko}${topicParticle(a.ko)} ${a.nat} 사람이에요. → ${b.ko}___ ${natSame ? a.nat : b.nat} 사람이에요.`,
          natSame ? `${a.en} is ${NAT_EN[a.nat]}. → ${b.en} is ${NAT_EN[a.nat]} too.` : `${a.en} is ${NAT_EN[a.nat]}. → ${b.en} is ${NAT_EN[b.nat]}.`,
          natSame ? ['도'] : [topicParticle(b.ko)],
          ['도', '은', '는'],
          natSame ? 'The two are parallel ("also"), so use 도.' : `The two contrast, so use the contrast particle 은/는. ${batchimReason(b.ko, '은', '는')}`,
        ),
      )
    }
  }

  // G1.4: answering a yes/no question with 네 / 아니요
  const years = [1, 2, 3, 4] as const
  const nats: Nat[] = ['한국', '미국', '영국', '일본', '중국']
  for (const p of PEOPLE) {
    const wrongYear = years.filter((y) => y !== p.year)[p.ko.length % 3]
    const wrongNat = nats.filter((n) => n !== p.nat)[p.ko.length % 4]
    const q = (id: string, ask: string, actual: string, yes: boolean, enAsk: string, enActual: string) =>
      out.push(
        blank(
          `yn:${p.ko}:${id}`,
          '1.4',
          'question',
          `A: ${p.ko} 씨, ${ask}이에요? B: ___, ${actual}이에요.`,
          `A: ${p.en}, are you ${enAsk}? B: ${yes ? 'Yes' : 'No'}, I am ${enActual}.`,
          yes ? ['네', '예'] : ['아니요'],
          ['네', '아니요'],
          yes ? 'The content of the question is true → 네.' : 'The content of the question is false → 아니요.',
        ),
      )
    q('year-yes', `${p.year}학년`, `${p.year}학년`, true, YEAR_EN[p.year], YEAR_EN[p.year])
    q('year-no', `${wrongYear}학년`, `${p.year}학년`, false, YEAR_EN[wrongYear], YEAR_EN[p.year])
    q('nat-yes', `${p.nat} 사람`, `${p.nat} 사람`, true, NAT_EN[p.nat], NAT_EN[p.nat])
    q('nat-no', `${wrongNat} 사람`, `${p.nat} 사람`, false, NAT_EN[wrongNat], NAT_EN[p.nat])
  }

  return out
}
