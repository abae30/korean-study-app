// Practice-exercise generators for Lesson 4 grammar:
//   G4.1 alternative questions · G4.2 numbers (Sino-Korean / native) · G4.3 noun counters
//   G4.4 possession (N1 N2, 내/제/우리/저희, 거) · G4.5 vowel contraction · 계시다 · 하고 · 만
//
// Vocabulary comes from Lessons 1–4 only (the tests check this). The practice sentences the exercises are built from are
// exported as `practiceSentences()` so the authoring script writes exactly the same sentences into lesson-4.json.
import { lessons } from '../../data'
import type { Exercise } from '../../data/types'
import { describePolite, polite, politeClass, politeDistractors, type Irregular } from '../conjugate'
import { batchimReason, copulaForm, subjectParticle, topicParticle } from '../korean'
import { makeBlank, makeConj } from './common'
import { PEOPLE } from './lesson1'
import { objectParticle } from './lesson2'

const L = 4

/* ───────────── numbers ───────────── */
const DIG = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const NAT_ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉']
const NAT_ONES_C = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉']
const NAT_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔']

/** Sino-Korean reading of 1 ≤ n < 100,000,000 (일 is dropped before 십/백/천 and before a lone 만). */
export function sino(n: number): string {
  const below = (m: number) => {
    let out = ''
    const th = Math.floor(m / 1000)
    const h = Math.floor((m % 1000) / 100)
    const t = Math.floor((m % 100) / 10)
    const o = m % 10
    if (th) out += (th > 1 ? DIG[th] : '') + '천'
    if (h) out += (h > 1 ? DIG[h] : '') + '백'
    if (t) out += (t > 1 ? DIG[t] : '') + '십'
    if (o) out += DIG[o]
    return out
  }
  const high = Math.floor(n / 10000)
  const low = n % 10000
  let out = ''
  if (high) out += (high === 1 ? '' : below(high)) + '만'
  if (low) out += below(low)
  return out
}

/** Native Korean reading of 1 ≤ n ≤ 99. `counter` = the form before a counter (한/두/세/네/스무). */
export function native(n: number, counter: boolean): string {
  if (counter && n === 20) return '스무'
  const t = Math.floor(n / 10)
  const o = n % 10
  return NAT_TENS[t] + (o ? (counter ? NAT_ONES_C[o] : NAT_ONES[o]) : '')
}

const EN_SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
export const enNum = (n: number): string => (n < 20 ? EN_SMALL[n] : EN_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + EN_SMALL[n % 10] : ''))
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']
const commas = (n: number) => n.toLocaleString('en-US')

/** Counters used with native Korean numbers / with Sino-Korean numbers. */
export const NATIVE_COUNTERS = [
  { c: '명', en: 'people' },
  { c: '마리', en: 'animals' },
  { c: '개', en: 'items' },
  { c: '권', en: 'volumes' },
  { c: '시간', en: 'hours' },
  { c: '달', en: 'months' },
  { c: '과', en: 'lessons' },
] as const
export const NAT_NUMS = [...Array.from({ length: 20 }, (_, i) => i + 1), 21, 22, 23, 24, 25, 30, 31, 40, 50, 60, 70, 80, 90, 99]

/* ───────────── counting practice ───────────── */
export interface CItem {
  ko: string
  one: string // "a bag"
  many: string // "bags"
  c: '명' | '마리' | '개' | '권'
}
const CI = (ko: string, one: string, many: string, c: CItem['c']): CItem => ({ ko, one, many, c })
export const COUNT_ITEMS: CItem[] = [
  CI('친구', 'friend', 'friends', '명'),
  CI('학생', 'student', 'students', '명'),
  CI('남동생', 'younger brother', 'younger brothers', '명'),
  CI('여동생', 'younger sister', 'younger sisters', '명'),
  CI('형', 'older brother', 'older brothers', '명'),
  CI('누나', 'older sister', 'older sisters', '명'),
  CI('언니', 'older sister', 'older sisters', '명'),
  CI('오빠', 'older brother', 'older brothers', '명'),
  CI('선생님', 'teacher', 'teachers', '명'),
  CI('남자', 'man', 'men', '명'),
  CI('여자', 'woman', 'women', '명'),
  CI('개', 'dog', 'dogs', '마리'),
  CI('가방', 'bag', 'bags', '개'),
  CI('시계', 'clock', 'clocks', '개'),
  CI('우산', 'umbrella', 'umbrellas', '개'),
  CI('의자', 'chair', 'chairs', '개'),
  CI('책상', 'desk', 'desks', '개'),
  CI('컴퓨터', 'computer', 'computers', '개'),
  CI('시험', 'exam', 'exams', '개'),
  CI('질문', 'question', 'questions', '개'),
  CI('방', 'room', 'rooms', '개'),
  CI('아파트', 'apartment', 'apartments', '개'),
  CI('책', 'book', 'books', '권'),
  CI('사전', 'dictionary', 'dictionaries', '권'),
  CI('교과서', 'textbook', 'textbooks', '권'),
]
const COUNT_N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const CTR_WHY: Record<string, string> = { 명: 'people', 마리: 'animals', 개: 'items (things)', 권: 'books / volumes' }
export const countKo = (it: CItem, n: number) => `${it.ko}${subjectParticle(it.ko)} ${native(n, true)} ${it.c} 있어요.`
export const countEn = (it: CItem, n: number) => (n === 1 ? `There is one ${it.one}.` : `There are ${enNum(n)} ${it.many}.`)

/* ───────────── prices, floors ───────────── */
export const PRICE_ITEMS = [
  { ko: '커피', en: 'The coffee' },
  { ko: '주스', en: 'The juice' },
  { ko: '책', en: 'The book' },
  { ko: '사전', en: 'The dictionary' },
  { ko: '우산', en: 'The umbrella' },
  { ko: '가방', en: 'The bag' },
  { ko: '시계', en: 'The clock' },
  { ko: '컴퓨터', en: 'The computer' },
  { ko: '텔레비전', en: 'The television' },
  { ko: '교과서', en: 'The textbook' },
]
const PRICES = [1000, 2000, 2500, 3000, 4500, 5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000, 45000, 50000, 80000, 100000, 120000, 200000, 500000, 1000000, 1900000]
export const PRICE_LIST: { item: (typeof PRICE_ITEMS)[number]; p: number }[] = PRICE_ITEMS.flatMap((item, i) => [0, 1, 2, 3].map((k) => ({ item, p: PRICES[(i * 3 + k * 7) % PRICES.length] })))
export const priceKo = (x: { item: { ko: string }; p: number }) => `${x.item.ko}${topicParticle(x.item.ko)} ${sino(x.p)} 원이에요.`
export const priceEn = (x: { item: { en: string }; p: number }) => `${x.item.en} is ${commas(x.p)} won.`
export const FLOOR_N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/* ───────────── possession ───────────── */
export const OWNERS = ['스티브', '마이클', '유미', '소피아', '리사', '제니', '제임스', '폴']
export const POSS_ITEMS = [
  { ko: '책', en: 'book' },
  { ko: '사전', en: 'dictionary' },
  { ko: '우산', en: 'umbrella' },
  { ko: '가방', en: 'bag' },
  { ko: '시계', en: 'watch' },
  { ko: '컴퓨터', en: 'computer' },
  { ko: '교과서', en: 'textbook' },
  { ko: '방', en: 'room' },
  { ko: '의자', en: 'chair' },
  { ko: '책상', en: 'desk' },
  { ko: '아파트', en: 'apartment' },
  { ko: '집', en: 'house' },
]
const EN_OWNER: Record<string, string> = { 스티브: 'Steve', 마이클: 'Michael', 유미: 'Yumi', 소피아: 'Sophia', 리사: 'Lisa', 제니: 'Jenny', 제임스: 'James', 폴: 'Paul' }
export const ownerEn = (o: string) => EN_OWNER[o]

const CITIES = [
  { ko: '보스턴', en: 'Boston' },
  { ko: '뉴욕', en: 'New York' },
  { ko: '홍콩', en: 'Hong Kong' },
  { ko: '로스앤젤레스', en: 'Los Angeles' },
  { ko: '하와이', en: 'Hawaii' },
  { ko: '시카고', en: 'Chicago' },
  { ko: '도쿄', en: 'Tokyo' },
]
const POSSESSORS = ['소피아', '스티브', '리사', '마이클']
export const ELDERS = [
  { ko: '아버지', en: 'father', plural: false },
  { ko: '어머니', en: 'mother', plural: false },
  { ko: '부모님', en: 'parents', plural: true },
]
export const YOUNGER = [
  { ko: '오빠', en: 'older brother' },
  { ko: '형', en: 'older brother' },
  { ko: '누나', en: 'older sister' },
  { ko: '언니', en: 'older sister' },
  { ko: '동생', en: 'younger sibling' },
  { ko: '남동생', en: 'younger brother' },
  { ko: '여동생', en: 'younger sister' },
]
export const JOBS = [
  { ko: '대학생', en: 'a college student' },
  { ko: '고등학생', en: 'a high school student' },
  { ko: '대학원생', en: 'a graduate student' },
  { ko: '학생', en: 'a student' },
]
const NATS = [
  { ko: '한국', en: 'Korean' },
  { ko: '미국', en: 'American' },
  { ko: '영국', en: 'British' },
  { ko: '일본', en: 'Japanese' },
  { ko: '중국', en: 'Chinese' },
]
export const FAMILY_PAIRS = [
  { a: '아버지', b: '어머니', en: 'father and mother', hon: true },
  { a: '오빠', b: '동생', en: 'older brother and younger sibling', hon: false },
  { a: '언니', b: '동생', en: 'older sister and younger sibling', hon: false },
  { a: '형', b: '동생', en: 'older brother and younger sibling', hon: false },
  { a: '누나', b: '남동생', en: 'older sister and younger brother', hon: false },
]
export const HAVE_ELDER = [
  { ko: '동생', en: 'a younger sibling' },
  { ko: '형', en: 'an older brother' },
  { ko: '누나', en: 'an older sister' },
  { ko: '컴퓨터', en: 'a computer' },
  { ko: '우산', en: 'an umbrella' },
  { ko: '사전', en: 'a dictionary' },
  { ko: '시계', en: 'a watch' },
  { ko: '책', en: 'a book' },
]

/** Predicates with the polite -어요 form, practised in G4.5. */
export const ACTS: { verb: string; irregular?: Irregular; items: { pre: string; en: string }[] }[] = [
  { verb: '마시다', items: [{ pre: '주스를', en: 'I drink juice.' }, { pre: '커피를', en: 'I drink coffee.' }] },
  { verb: '배우다', items: ['한국어', '중국어', '일본어', '영어', '프랑스어', '스페인어', '러시아어', '역사', '경제학', '생물학', '음악'].map((n, i) => ({ pre: `${n}${objectParticle(n)}`, en: `I learn ${['Korean', 'Chinese', 'Japanese', 'English', 'French', 'Spanish', 'Russian', 'history', 'economics', 'biology', 'music'][i]}.` })) },
  { verb: '가다', items: ['학교', '도서관', '집', '서점', '우체국', '기숙사', '학생회관', '교실'].map((n, i) => ({ pre: `${n}에`, en: `I go to the ${['school', 'library', 'home', 'bookstore', 'post office', 'dormitory', 'student center', 'classroom'][i]}.`.replace('the home', 'home') })) },
  { verb: '보다', items: [{ pre: '텔레비전을', en: 'I watch television.' }, { pre: '칠판을', en: 'I look at the blackboard.' }, { pre: '시계를', en: 'I look at the clock.' }] },
  { verb: '오다', items: ['친구가', '형이', '누나가', '언니가', '오빠가', '동생이', '남자 친구가'].map((n, i) => ({ pre: `내일 ${n}`, en: `${['A friend', 'My older brother', 'My older sister', 'My older sister', 'My older brother', 'My younger sibling', 'My boyfriend'][i]} comes tomorrow.` })) },
  { verb: '만나다', items: [{ pre: '친구를', en: 'I meet a friend.' }, { pre: '남자 친구를', en: 'I meet my boyfriend.' }, { pre: '선생님을', en: 'I meet the teacher.' }] },
  { verb: '자다', items: [{ pre: '지금', en: 'I am sleeping now.' }] },
]
export const ADJS: { adj: string; irregular?: Irregular; subjects: { ko: string; en: string }[] }[] = [
  { adj: '크다', subjects: ['방', '집', '가방', '아파트', '컴퓨터', '캠퍼스', '도서관', '학교'].map((ko, i) => ({ ko, en: ['The room', 'The house', 'The bag', 'The apartment', 'The computer', 'The campus', 'The library', 'The school'][i] })) },
  { adj: '작다', subjects: ['방', '집', '가방', '아파트', '시계', '우산', '교실', '식당'].map((ko, i) => ({ ko, en: ['The room', 'The house', 'The bag', 'The apartment', 'The clock', 'The umbrella', 'The classroom', 'The cafeteria'][i] })) },
  { adj: '예쁘다', subjects: ['방', '가방', '시계', '우산', '집', '아파트', '친구', '여동생'].map((ko, i) => ({ ko, en: ['The room', 'The bag', 'The clock', 'The umbrella', 'The house', 'The apartment', 'The friend', 'The younger sister'][i] })) },
  { adj: '나쁘다', subjects: ['시험', '음식', '커피', '컴퓨터', '시계', '숙제'].map((ko, i) => ({ ko, en: ['The exam', 'The food', 'The coffee', 'The computer', 'The clock', 'The homework'][i] })) },
  { adj: '비싸다', subjects: ['컴퓨터', '텔레비전', '시계', '가방', '우산', '사전', '교과서', '아파트'].map((ko, i) => ({ ko, en: ['The computer', 'The television', 'The clock', 'The bag', 'The umbrella', 'The dictionary', 'The textbook', 'The apartment'][i] })) },
]
const ADJ_EN: Record<string, string> = { 크다: 'big', 작다: 'small', 예쁘다: 'pretty', 나쁘다: 'bad', 비싸다: 'expensive' }

/** Every practice sentence of the lesson (exercises are built from these). */
export interface PS {
  ko: string
  en: string
  g: string[]
}

const vocabOf = (ko: string) => lessons.flatMap((l) => l.vocab).find((v) => v.ko === ko)
const irregOf = (ko: string): Irregular | undefined => vocabOf(ko)?.irregular
const politeOf = (ko: string) => polite(ko, irregOf(ko))

const haveEnHon = (e: { en: string; plural: boolean }, thing: string, has: boolean) =>
  `${e.plural ? 'The parents' : `The ${e.en}`} ${has ? (e.plural ? 'have' : 'has') : e.plural ? 'do not have' : 'does not have'} ${thing}.`

export function practiceSentences(): PS[] {
  const out: PS[] = []
  const add = (ko: string, en: string, g: string[]) => out.push({ ko, en, g })
  // counting
  for (const it of COUNT_ITEMS) for (const n of COUNT_N) add(countKo(it, n), countEn(it, n), ['4.3', '4.2'])
  // floors, prices
  for (const n of FLOOR_N) add(`교실은 ${n}층에 있어요.`, `The classroom is on the ${ORD[n]} floor.`, ['4.3', '4.2'])
  for (const x of PRICE_LIST) add(priceKo(x), priceEn(x), ['4.2', '4.3'])
  // alternative questions
  for (const p of PEOPLE)
    for (const a of NATS)
      for (const b of NATS) if (a.ko !== b.ko) add(`${p.ko}${topicParticle(p.ko)} ${a.ko} 사람이에요, ${b.ko} 사람이에요?`, `Is ${p.en} ${a.en} or ${b.en}?`, ['4.1'])
  for (const t of HAVE_ELDER) add(`${t.ko}${subjectParticle(t.ko)} 있어요, 없어요?`, `Do you have ${t.en}, or not?`, ['4.1'])
  // possession
  for (const o of OWNERS)
    for (const it of POSS_ITEMS) add(`이거 ${o} ${it.ko}${copulaForm(it.ko)}?`, `Is this ${ownerEn(o)}'s ${it.en}?`, ['4.4'])
  for (const o of OWNERS) add(`네, ${o} 거예요.`, `Yes, it is ${ownerEn(o)}'s.`, ['4.4'])
  for (const it of POSS_ITEMS) {
    add(`이거 누구 ${it.ko}${copulaForm(it.ko)}?`, `Whose ${it.en} is this?`, ['4.4'])
    add(`제 ${it.ko}${copulaForm(it.ko)}.`, `It is my ${it.en}.`, ['4.4'])
    add(`내 ${it.ko}${copulaForm(it.ko)}.`, `It is my ${it.en}.`, ['4.4'])
    add(`우리 ${it.ko}${copulaForm(it.ko)}.`, `It is our ${it.en}.`, ['4.4'])
    add(`저희 ${it.ko}${copulaForm(it.ko)}.`, `It is our ${it.en}.`, ['4.4'])
  }
  for (const o of POSSESSORS) {
    YOUNGER.forEach((y, yi) =>
      JOBS.forEach((j, ji) => {
        if ((yi + ji) % 2 === 0) add(`${o} ${y.ko}${topicParticle(y.ko)} ${j.ko}${copulaForm(j.ko)}.`, `${ownerEn(o)}'s ${y.en} is ${j.en}.`, ['4.4'])
      }),
    )
  }
  // 계시다 (honorific existence) and 있어요
  for (const o of POSSESSORS) {
    for (const e of ELDERS)
      for (const c of CITIES) add(`${o} ${e.ko}${topicParticle(e.ko)} ${c.ko}에 계세요.`, `${ownerEn(o)}'s ${e.en} ${e.plural ? 'are' : 'is'} in ${c.en}.`, ['gyesida'])
    YOUNGER.forEach((y, yi) => {
      for (let k = 0; k < 3; k++) {
        const c = CITIES[(yi + k * 2) % CITIES.length]
        add(`${o} ${y.ko}${topicParticle(y.ko)} ${c.ko}에 있어요.`, `${ownerEn(o)}'s ${y.en} is in ${c.en}.`, ['gyesida'])
      }
    })
  }
  for (const e of ELDERS) for (const t of HAVE_ELDER) for (const has of [true, false]) add(`${e.ko}${topicParticle(e.ko)} ${t.ko}${subjectParticle(t.ko)} ${has ? '있으세요' : '없으세요'}.`, haveEnHon(e, t.en, has), ['gyesida', '3:3.3'])
  // 하고 / 만 / 도
  for (const o of POSSESSORS.slice(0, 2))
    for (const f of FAMILY_PAIRS)
      CITIES.forEach((c, ci) => {
        if (ci % 2 === (o === '소피아' ? 0 : 1)) add(`${o} ${f.a}하고 ${f.b}${subjectParticle(f.b)} ${c.ko}에 ${f.hon ? '계세요' : '있어요'}.`, `${ownerEn(o)}'s ${f.en} ${f.hon ? 'are' : 'are'} in ${c.en}.`, ['hago', 'gyesida'])
      })
  for (const p of PEOPLE)
    for (const c of CITIES.slice(0, 5)) {
      add(`${p.ko}만 ${c.ko}에 있어요.`, `Only ${p.en} is in ${c.en}.`, ['man'])
      add(`${p.ko}도 ${c.ko}에 있어요.`, `${p.en} is in ${c.en}, too.`, ['man'])
    }
  // polite forms with objects
  for (const a of ACTS) {
    const pf = politeOf(a.verb)
    for (const it of a.items) add(`${it.pre} ${pf}.`, it.en, ['4.5'])
  }
  for (const [i, x] of [['책', '사전'], ['교과서', '사전'], ['우산', '가방'], ['주스', '커피'], ['시계', '책']].entries()) add(`${x[0]}하고 ${x[1]}${objectParticle(x[1])} ${polite('주다')}.`, `I give ${['a book and a dictionary', 'a textbook and a dictionary', 'an umbrella and a bag', 'juice and coffee', 'a clock and a book'][i]}.`, ['4.5', 'hago'])
  for (const a of ADJS) for (const s of a.subjects) add(`${s.ko}${subjectParticle(s.ko)} 참 ${politeOf(a.adj)}.`, `${s.en} is really ${ADJ_EN[a.adj]}.`, ['4.5'])
  return out
}

export function lesson4Exercises(): Exercise[] {
  const out: Exercise[] = []
  const NUMLESS = ['명', '마리', '개', '권']
  const lessonData = lessons.find((l) => l.lesson === L)

  /* ── G4.3 counting with native numbers: noun + number + counter ── */
  COUNT_ITEMS.forEach((it, i) => {
    COUNT_N.forEach((n) => {
      const key = `${it.ko}:${n}`
      const num = native(n, true)
      const en = countEn(it, n)
      const sp = subjectParticle(it.ko)
      const wrong = [native(n === 10 ? 9 : n + 1, true), native(n === 1 ? 2 : n - 1, true), sino(n), n <= 10 ? native(n, false) : native(n, true)]
      out.push(makeBlank(L, `cnt-num:${key}`, '4.3', 'other', `${it.ko}${sp} ___ ${it.c} 있어요.`, en, [num], [num, ...wrong], `Counting ${CTR_WHY[it.c]} uses native Korean numbers, and 하나/둘/셋/넷 shorten before a counter (${native(n, false)} → ${num}).`))
      out.push(makeBlank(L, `cnt-ctr:${key}`, '4.3', 'other', `${it.ko}${sp} ${num} ___ 있어요.`, en, [it.c], [it.c, ...NUMLESS.filter((c) => c !== it.c)], `${it.ko} is counted with ${it.c} (${CTR_WHY[it.c]}).`))
      if ((i + n) % 2 === 0) out.push(makeBlank(L, `cnt-sp:${key}`, '4.3', 'particle', `${it.ko}___ ${num} ${it.c} 있어요.`, en, [sp], ['이', '가'], batchimReason(it.ko, '이', '가')))
      if (n % 3 === 1) out.push(makeBlank(L, `cnt-ans:${key}`, '4.3', 'other', `A: ${it.ko}${sp} 몇 ${it.c} 있어요? B: ___ 있어요.`, en, [`${num} ${it.c}`], [`${num} ${it.c}`, `${native(n === 10 ? 9 : n + 1, true)} ${it.c}`, `${sino(n)} ${it.c}`, `${num} ${NUMLESS.find((c) => c !== it.c)}`], `Number first, then the counter: ${num} ${it.c}. 몇 (how many) is followed by the counter.`))
    })
    if (i % 2 === 0) out.push(makeBlank(L, `cnt-qw:${it.ko}`, '4.3', 'question', `A: ${it.ko}${subjectParticle(it.ko)} ___ ${it.c} 있어요? B: ${native(3, true)} ${it.c} 있어요.`, `A: How many ${it.many} are there? B: There are three.`, ['몇'], ['몇', '뭐', '누구', '어디'], '몇 means "how many / what number" and goes right before the counter.'))
  })

  /* ── G4.2 reading numbers: native with a counter, Sino-Korean with its counters ── */
  for (const k of NATIVE_COUNTERS)
    for (const n of NAT_NUMS) {
      const right = `${native(n, true)} ${k.c}`
      const choices = [right, `${sino(n)} ${k.c}`, `${native(n === 99 ? 98 : n + 1, true)} ${k.c}`, `${native(n, false)} ${k.c}`, `${native(n === 1 ? 3 : n - 1, true)} ${k.c}`]
      out.push(makeConj(L, `nat:${n}${k.c}`, '4.2', `${n}${k.c}`, `${n} (${k.en})`, 'native Korean + counter', [right, right.replace(' ', '')], choices, `${k.c} (${k.en}) is counted with native numbers. ${native(n, false)} becomes ${native(n, true)} before a counter.`))
    }
  const SINO_COUNTERS: { c: string; en: string; nums: number[]; sep: boolean }[] = [
    { c: '층', en: 'floors', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20], sep: true },
    { c: '과', en: 'lesson number', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], sep: true },
    { c: '원', en: 'won', nums: [100, 500, 1000, 1500, 2000, 2500, 3000, 4500, 5000, 8000, 10000, 15000, 20000, 30000, 50000, 100000, 120000, 1000000, 1900000], sep: true },
    { c: '학년', en: 'school year', nums: [1, 2, 3, 4, 5, 6], sep: false },
    { c: '월', en: 'month (date)', nums: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12], sep: false },
    { c: '년', en: 'year', nums: [1, 2, 3, 4, 5, 10, 20, 30, 50, 100], sep: true },
    { c: '달러', en: 'dollars', nums: [5, 10, 20, 28, 34, 48, 100], sep: true },
  ]
  for (const k of SINO_COUNTERS)
    for (const n of k.nums) {
      const sep = k.sep ? ' ' : ''
      const right = `${sino(n)}${sep}${k.c}`
      const answers = k.sep ? [right, `${sino(n)}${k.c}`] : [right]
      if (k.c === '달러') answers.push(`${sino(n)} 불`)
      const choices = [right, `${native(Math.min(n, 99), true)} ${k.c}`, `${sino(n + 1)}${sep}${k.c}`, `${sino(n === 1 ? 3 : n - 1)}${sep}${k.c}`]
      out.push(makeConj(L, `sino:${n}${k.c}`, '4.2', `${n}${k.c}`, `${commas(n)} (${k.en})`, 'Sino-Korean + counter', answers, choices, `${k.c} (${k.en}) is counted with Sino-Korean numbers: ${sino(n)}.`))
    }
  // bare numbers, both systems
  const SINO_BARE = [...Array.from({ length: 30 }, (_, i) => i + 1), 35, 40, 47, 50, 58, 60, 66, 70, 79, 80, 90, 99, 100, 200, 365, 1000, 5000, 10000, 20000, 100000, 1000000]
  for (const n of SINO_BARE)
    out.push(makeConj(L, `sino-bare:${n}`, '4.2', `${n}`, commas(n), 'Sino-Korean number', [sino(n)], [sino(n), sino(n + 1), sino(n === 1 ? 4 : n - 1), n < 100 ? native(n, false) : sino(n * 10)], `${n} = ${sino(n)} (Sino-Korean).`))
  for (let n = 1; n < 100; n++)
    out.push(makeConj(L, `nat-bare:${n}`, '4.2', `${n}`, `${n}`, 'native Korean number (on its own)', [native(n, false)], [native(n, false), native(n === 99 ? 98 : n + 1, false), native(n === 1 ? 3 : n - 1, false), sino(n)], `${n} = ${native(n, false)} (native Korean, not followed by a counter).`))
  PRICE_LIST.forEach((x, i) => {
    out.push(makeBlank(L, `price:${x.item.ko}:${x.p}`, '4.2', 'other', `${x.item.ko}${topicParticle(x.item.ko)} ___ 원이에요.`, priceEn(x), [sino(x.p)], [sino(x.p), sino(x.p * 10 < 1e8 ? x.p * 10 : x.p / 10), sino(Math.max(1, x.p / 10)), sino(x.p === 1000 ? 2000 : x.p + (x.p >= 10000 ? 10000 : 500))], `Prices use Sino-Korean numbers: ${commas(x.p)} = ${sino(x.p)}.`))
    if (i % 2 === 0) out.push(makeBlank(L, `price-ctr:${x.item.ko}:${x.p}`, '4.2', 'other', `${x.item.ko}${topicParticle(x.item.ko)} ${sino(x.p)} ___이에요.`, priceEn(x), ['원'], ['원', '개', '명', '권'], '원 (won) is the counter for Korean money.'))
  })
  for (const n of FLOOR_N)
    out.push(makeBlank(L, `floor:${n}`, '4.2', 'other', `교실은 ${n}___ 있어요.`, `The classroom is on the ${ORD[n]} floor.`, ['층에'], ['층에', '명에', '권에', '개에'], `${n}층 = floor ${n}: 층 is counted with Sino-Korean numbers (${sino(n)} 층).`))

  /* ── G4.1 alternative questions ── */
  for (const p of PEOPLE)
    for (const a of NATS)
      for (const b of NATS)
        if (a.ko !== b.ko) out.push(makeBlank(L, `alt-nat:${p.ko}:${a.ko}:${b.ko}`, '4.1', 'question', `${p.ko}${topicParticle(p.ko)} ${a.ko} 사람이에요, ___ 사람이에요?`, `Is ${p.en} ${a.en} or ${b.en}?`, [b.ko], [b.ko, ...NATS.filter((n) => n.ko !== b.ko && n.ko !== a.ko).map((n) => n.ko)], 'An alternative question lists the choices one after another: A이에요, B이에요? The second choice here is the one the English names last.'))
  HAVE_ELDER.forEach((t) => out.push(makeBlank(L, `alt-have:${t.ko}`, '4.1', 'question', `${t.ko}${subjectParticle(t.ko)} 있어요, ___?`, `Do you have ${t.en}, or not?`, ['없어요'], ['없어요', '있어요', '계세요', '아니에요'], 'The two choices of an alternative question are both given: 있어요, 없어요?')))

  /* ── G4.4 possession ── */
  for (const o of OWNERS)
    for (const it of POSS_ITEMS)
      out.push(makeBlank(L, `poss-ge:${o}:${it.ko}`, '4.4', 'other', `A: 이거 누구 ${it.ko}${copulaForm(it.ko)}? B: ${o} ___${copulaForm('거')}.`, `A: Whose ${it.en} is this? B: It is ${ownerEn(o)}'s.`, ['거'], ['거', '것', '의', '도'], '거 (the contraction of 것 "thing") stands in for an object the listener already knows: 스티브 거예요 = "It is Steve\'s."'))
  POSS_ITEMS.forEach((it) => {
    out.push(makeBlank(L, `poss-my:${it.ko}`, '4.4', 'other', `A: 이거 누구 ${it.ko}${copulaForm(it.ko)}? B: ___ ${it.ko}${copulaForm(it.ko)}.`, `A: Whose ${it.en} is this? B: It is my ${it.en}.`, ['제', '내'], ['제', '내', '저', '나'], '"My" is 제 (humble) or 내 (plain): they are 저 + 의 and 나 + 의. 저 and 나 alone mean "I".'))
    out.push(makeBlank(L, `poss-our:${it.ko}`, '4.4', 'other', `A: 이거 누구 ${it.ko}${copulaForm(it.ko)}? B: ___ ${it.ko}${copulaForm(it.ko)}.`, `A: Whose ${it.en} is this? B: It is our ${it.en}.`, ['저희', '우리'], ['저희', '우리', '제', '내'], '"Our" is 저희 (humble) or 우리 (plain).'))
    out.push(makeBlank(L, `poss-q:${it.ko}`, '4.4', 'question', `A: 이거 ___ ${it.ko}${copulaForm(it.ko)}? B: 소피아 ${it.ko}${copulaForm(it.ko)}.`, `A: Whose ${it.en} is this? B: It is Sophia's ${it.en}.`, ['누구'], ['누구', '뭐', '어디', '몇'], '누구 "who" + the possessed noun = "whose": 누구 책이에요?'))
  })
  POSSESSORS.forEach((o) => {
    YOUNGER.forEach((y, yi) =>
      JOBS.forEach((j, ji) => {
        if ((yi + ji) % 2 === 0)
          out.push(makeBlank(L, `poss-fam:${o}:${y.ko}:${j.ko}`, '4.4', 'particle', `${o} ${y.ko}___ ${j.ko}${copulaForm(j.ko)}.`, `${ownerEn(o)}'s ${y.en} is ${j.en}.`, [topicParticle(y.ko)], ['은', '는'], batchimReason(y.ko, '은', '는')))
      }),
    )
  })

  /* ── 계시다: honorific existence ── */
  for (const o of POSSESSORS) {
    for (const e of ELDERS)
      CITIES.forEach((c) =>
        out.push(makeBlank(L, `gye:${o}:${e.ko}:${c.ko}`, 'gyesida', 'ending', `${o} ${e.ko}${topicParticle(e.ko)} ${c.ko}에 ___.`, `${ownerEn(o)}'s ${e.en} ${e.plural ? 'are' : 'is'} in ${c.en}.`, ['계세요'], ['계세요', '있어요', '있으세요', '없어요'], `Parents are respected people, so "to be (somewhere)" is the honorific 계세요, not 있어요.`)),
      )
    YOUNGER.forEach((y, yi) => {
      for (let k = 0; k < 3; k++) {
        const c = CITIES[(yi + k * 2) % CITIES.length]
        out.push(makeBlank(L, `ite:${o}:${y.ko}:${c.ko}`, 'gyesida', 'ending', `${o} ${y.ko}${topicParticle(y.ko)} ${c.ko}에 ___.`, `${ownerEn(o)}'s ${y.en} is in ${c.en}.`, ['있어요'], ['있어요', '계세요', '있으세요', '없어요'], 'A sibling is not someone you show this respect to, so use plain 있어요.'))
      }
    })
  }
  for (const e of ELDERS)
    for (const t of HAVE_ELDER)
      for (const has of [true, false])
        out.push(makeBlank(L, `hon-have:${e.ko}:${t.ko}:${has ? 'y' : 'n'}`, 'gyesida', 'ending', `${e.ko}${topicParticle(e.ko)} ${t.ko}${subjectParticle(t.ko)} ___.`, haveEnHon(e, t.en, has), [has ? '있으세요' : '없으세요'], ['있으세요', '없으세요', '계세요', '있어요'], 'Possession by a respected person is 있으세요 / 없으세요; 계세요 is only for existence (being somewhere).'))
  out.push(makeConj(L, 'gye:계시다', 'gyesida', '계시다', 'to be (honorific)', 'honorific polite', ['계세요'], ['계세요', '계셔요', '계시어요', '계시아요'], '계시다 + 어요 → 계세요: 시 + 어 contracts to 세 in the honorific (not 셔).'))

  /* ── 하고 and 만 / 도 ── */
  for (const o of POSSESSORS.slice(0, 2))
    for (const f of FAMILY_PAIRS)
      CITIES.forEach((c, ci) => {
        if (ci % 2 === (o === '소피아' ? 0 : 1))
          out.push(makeBlank(L, `hago:${o}:${f.a}:${f.b}:${c.ko}`, 'hago', 'particle', `${o} ${f.a}___ ${f.b}${subjectParticle(f.b)} ${c.ko}에 ${f.hon ? '계세요' : '있어요'}.`, `${ownerEn(o)}'s ${f.en} are in ${c.en}.`, ['하고'], ['하고', '도', '만', '의'], '하고 "and" joins two nouns, and it never changes (no batchim rule).'))
      })
  for (const p of PEOPLE)
    for (const c of CITIES.slice(0, 5)) {
      out.push(makeBlank(L, `man:${p.ko}:${c.ko}`, 'man', 'particle', `${p.ko}___ ${c.ko}에 있어요.`, `Only ${p.en} is in ${c.en}.`, ['만'], ['만', '도', '은', '하고'], '만 means "only".'))
      out.push(makeBlank(L, `do:${p.ko}:${c.ko}`, 'man', 'particle', `${p.ko}___ ${c.ko}에 있어요.`, `${p.en} is in ${c.en}, too.`, ['도'], ['도', '만', '은', '하고'], '도 means "also, too".'))
    }

  /* ── G4.5 polite forms with vowel contraction ── */
  for (const a of ACTS) {
    const right = politeOf(a.verb)
    a.items.forEach((it, i) => {
      const ko = `${it.pre} ___ (${a.verb}).`
      out.push(makeBlank(L, `act:${a.verb}:${i}`, '4.5', 'ending', ko, it.en, [right], [right, ...politeDistractors(a.verb, a.irregular)], describePolite(a.verb, a.irregular)))
    })
  }
  ADJS.forEach((a) => {
    const right = politeOf(a.adj)
    a.subjects.forEach((s) => out.push(makeBlank(L, `adj:${a.adj}:${s.ko}`, '4.5', 'ending', `${s.ko}${subjectParticle(s.ko)} 참 ___ (${a.adj}).`, `${s.en} is really ${ADJ_EN[a.adj]}.`, [right], [right, ...politeDistractors(a.adj, a.irregular)], describePolite(a.adj, a.irregular))))
  })
  const pool = (lessonData?.vocab ?? []).filter((v) => (v.pos === 'verb' || v.pos === 'adjective') && v.ko.endsWith('다') && v.forms?.includes(politeOf(v.ko)))
  pool.forEach((v, i) => {
    const right = politeOf(v.ko)
    const code = politeClass(v.ko, v.irregular) === 'plain' ? '2:2.2' : '4.5'
    out.push(makeConj(L, `conj:${v.ko}`, code, v.ko, v.en, 'polite form (-어요/아요)', [right], [right, ...politeDistractors(v.ko, v.irregular)], describePolite(v.ko, v.irregular), v.irregular ? `${v.irregular}-irregular` : undefined))
    const others = [1, 2, 3].map((k) => pool[(i + k * 2) % pool.length].ko).filter((x) => x !== v.ko)
    out.push(makeConj(L, `rev:${v.ko}`, code, right, v.en, 'dictionary form', [v.ko], [v.ko, ...others.slice(0, 3)], `${right} comes from ${v.ko}. ${describePolite(v.ko, v.irregular)}`))
  })

  return out
}
