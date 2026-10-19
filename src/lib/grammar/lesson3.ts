// Practice-exercise generators for Lesson 3 grammar:
//   G3.1 location (position + 에 있어요) · G3.2 changing the topic (은/는요?) · G3.3 possession (있어요/없어요)
//   G3.4 honorific -(으)세요 · 그래서 / 그런데 · question words · requests
//
// Vocabulary comes from Lessons 1–3 only (the tests check this).
import { lessons } from '../../data'
import type { Exercise } from '../../data/types'
import { honorific, honorificCopula, honorificDistractors, polite, politeClass, politeDistractors, describePolite, type Irregular } from '../conjugate'
import { batchimReason, subjectParticle, topicParticle } from '../korean'
import { makeBlank, makeConj } from './common'
import { PEOPLE } from './lesson1'

const L = 3

export const POSITIONS = [
  { ko: '위', en: 'on top of' },
  { ko: '밑', en: 'under' },
  { ko: '옆', en: 'next to' },
  { ko: '앞', en: 'in front of' },
  { ko: '뒤', en: 'behind' },
  { ko: '안', en: 'inside' },
] as const
type Pos = (typeof POSITIONS)[number]['ko']
const POS_EN = Object.fromEntries(POSITIONS.map((p) => [p.ko, p.en])) as Record<Pos, string>

interface Thing {
  ko: string
  en: string // "the bag"
}
const T = (ko: string, en: string): Thing => ({ ko, en })

const SMALL = [T('책', 'the book'), T('사전', 'the dictionary'), T('교과서', 'the textbook'), T('우산', 'the umbrella'), T('가방', 'the bag'), T('컴퓨터', 'the computer'), T('시계', 'the clock')]
const FURNITURE = [T('책상', 'the desk'), T('의자', 'the chair')]
const BUILDINGS = [T('도서관', 'the library'), T('기숙사', 'the dormitory'), T('우체국', 'the post office'), T('학생회관', 'the student center'), T('유니온 빌딩', 'the Union Building'), T('로이스 홀', 'Royce Hall')]
const INSIDE_A = [T('서점', 'the bookstore'), T('학교 식당', 'the school cafeteria'), T('한국어 교실', 'the Korean classroom'), T('교실', 'the classroom')]
const INSIDE_B = [T('유니온 빌딩', 'the Union Building'), T('학생회관', 'the student center'), T('도서관', 'the library'), T('로이스 홀', 'Royce Hall')]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export interface Loc {
  a: Thing
  b: Thing
  pos: Pos
  /** Optional floor: 유니온 빌딩 2층에 */
  floor?: number
}

/** Every location sentence the exercises and practice sentences are built from. */
export const LOCATIONS: Loc[] = (() => {
  const out: Loc[] = []
  for (const a of SMALL) for (const b of FURNITURE) for (const pos of ['위', '밑', '옆', '앞', '뒤'] as Pos[]) if (a.ko !== b.ko) out.push({ a, b, pos })
  for (const a of ['책', '사전', '교과서', '우산']) out.push({ a: SMALL.find((x) => x.ko === a)!, b: T('가방', 'the bag'), pos: '안' })
  for (const a of BUILDINGS) for (const b of BUILDINGS) if (a.ko !== b.ko) for (const pos of ['앞', '뒤', '옆'] as Pos[]) out.push({ a, b, pos })
  for (const a of INSIDE_A) for (const b of INSIDE_B) if ((a.ko.includes('교실') ? ['로이스 홀', '학생회관', '도서관'] : ['유니온 빌딩', '학생회관', '도서관']).includes(b.ko)) out.push({ a, b, pos: '안' })
  return out
})()

export const FLOORS: Loc[] = (() => {
  const out: Loc[] = []
  for (const a of [T('서점', 'the bookstore'), T('학교 식당', 'the school cafeteria'), T('우체국', 'the post office')]) for (const b of [T('유니온 빌딩', 'the Union Building'), T('학생회관', 'the student center')]) for (const floor of [1, 2, 3]) out.push({ a, b, pos: '안', floor })
  for (const a of [T('한국어 교실', 'the Korean classroom'), T('교실', 'the classroom')]) for (const floor of [1, 2, 3]) out.push({ a, b: T('로이스 홀', 'Royce Hall'), pos: '안', floor })
  return out
})()
const ORD = ['', '1st', '2nd', '3rd']

export const locationEn = (l: Loc) =>
  l.floor ? `${cap(l.a.en)} is on the ${ORD[l.floor]} floor of ${l.b.en}.` : `${cap(l.a.en)} is ${POS_EN[l.pos]} ${l.b.en}.`
export const locationKo = (l: Loc) => (l.floor ? `${l.a.ko}${topicParticle(l.a.ko)} ${l.b.ko} ${l.floor}층에 있어요.` : `${l.a.ko}${topicParticle(l.a.ko)} ${l.b.ko} ${l.pos}에 있어요.`)

/** Things a person can have, and whether the sentence says "today". */
export const HAVE: { ko: string; en: string; today?: boolean }[] = [
  { ko: '가방', en: 'a bag' },
  { ko: '시계', en: 'a watch' },
  { ko: '우산', en: 'an umbrella' },
  { ko: '사전', en: 'a dictionary' },
  { ko: '교과서', en: 'a textbook' },
  { ko: '컴퓨터', en: 'a computer' },
  { ko: '질문', en: 'a question' },
  { ko: '숙제', en: 'homework', today: true },
  { ko: '시험', en: 'an exam', today: true },
  { ko: '수업', en: 'class', today: true },
]
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
export const hasIt = (person: string, item: string) => hash(person + item) % 2 === 0
export const haveEn = (person: { en: string }, it: (typeof HAVE)[number], has: boolean) =>
  `${person.en} ${has ? 'has' : 'does not have'} ${it.en}${it.today ? ' today' : ''}.`

/** Connectors: same cause/contrast/addition, with English. */
export const CONNECT: { s1: string; s2: string; c: '그래서' | '그런데' | '그리고'; en1: string; en2: string }[] = [
  { c: '그래서', s1: '오늘은 수업이 없어요', s2: '친구를 만나요', en1: 'I have no class today.', en2: 'I meet a friend.' },
  { c: '그래서', s1: '내일 시험이 있어요', s2: '공부해요', en1: 'I have an exam tomorrow.', en2: 'I study.' },
  { c: '그래서', s1: '한국어 수업이 재미있어요', s2: '열심히 공부해요', en1: 'The Korean class is interesting.', en2: 'I study hard.' },
  { c: '그래서', s1: '숙제가 많아요', s2: '바빠요', en1: 'There is a lot of homework.', en2: 'I am busy.' },
  { c: '그래서', s1: '학생들이 많아요', s2: '도서관이 커요', en1: 'There are many students.', en2: 'The library is big.' },
  { c: '그래서', s1: '오늘은 숙제가 없어요', s2: '텔레비전을 봐요', en1: 'I have no homework today.', en2: 'I watch television.' },
  { c: '그래서', s1: '선생님이 좋으세요', s2: '한국어 수업이 재미있어요', en1: 'The teacher is nice.', en2: 'The Korean class is interesting.' },
  { c: '그래서', s1: '내일 한국어 시험이 있어요', s2: '매일 열심히 공부해요', en1: 'I have a Korean exam tomorrow.', en2: 'I study hard every day.' },
  { c: '그런데', s1: '기숙사가 넓어요', s2: '아주 싸요', en1: 'The dormitory is spacious.', en2: 'It is very cheap.' },
  { c: '그런데', s1: '오늘은 수업이 없어요', s2: '내일은 수업이 많아요', en1: 'I have no class today.', en2: 'I have a lot of classes tomorrow.' },
  { c: '그런데', s1: '한국어 수업이 재미있어요', s2: '숙제가 많아요', en1: 'The Korean class is interesting.', en2: 'There is a lot of homework.' },
  { c: '그런데', s1: '학교 식당 음식이 싸요', s2: '맛없어요', en1: 'The cafeteria food is cheap.', en2: 'It is not delicious.' },
  { c: '그런데', s1: '저는 한국어를 공부해요', s2: '친구는 중국어를 공부해요', en1: 'I study Korean.', en2: 'My friend studies Chinese.' },
  { c: '그런데', s1: '오늘은 시험이 없어요', s2: '내일은 시험이 있어요', en1: 'There is no exam today.', en2: 'There is an exam tomorrow.' },
  { c: '그런데', s1: '서점이 학교 안에 있어요', s2: '우체국은 학교 밖에 있어요', en1: 'The bookstore is inside the school.', en2: 'The post office is outside the school.' },
  { c: '그리고', s1: '한국어 수업이 재미있어요', s2: '선생님도 좋으세요', en1: 'The Korean class is interesting.', en2: 'The teacher is nice too.' },
  { c: '그리고', s1: '학교 식당은 유니온 빌딩 안에 있어요', s2: '서점도 있어요', en1: 'The school cafeteria is inside the Union Building.', en2: 'There is a bookstore too.' },
  { c: '그리고', s1: '음식이 싸요', s2: '커피가 맛있어요', en1: 'The food is cheap.', en2: 'The coffee is delicious.' },
  { c: '그리고', s1: '도서관이 커요', s2: '넓어요', en1: 'The library is big.', en2: 'It is spacious.' },
  { c: '그리고', s1: '기숙사가 아주 커요', s2: '학생들이 많아요', en1: 'The dormitory is very big.', en2: 'There are many students.' },
]

/** Verbs and adjectives that take -(으)세요 for a respected person or a request, with the English of a request. */
export const HONORIFIC_SET: { ko: string; en: string; irregular?: Irregular; ask?: string }[] = [
  { ko: '가다', en: 'to go', ask: 'Please go.' },
  { ko: '앉다', en: 'to sit', ask: 'Please sit.' },
  { ko: '읽다', en: 'to read', ask: 'Please read.' },
  { ko: '쓰다', en: 'to write', ask: 'Please write.' },
  { ko: '보다', en: 'to see, look, watch', ask: 'Please look.' },
  { ko: '인사하다', en: 'to greet', ask: 'Please greet.' },
  { ko: '따라하다', en: 'to repeat after', ask: 'Please repeat after me.' },
  { ko: '듣다', en: 'to listen', irregular: 'ㄷ', ask: 'Please listen.' },
  { ko: '펴다', en: 'to open (a book)', ask: 'Please open it.' },
  { ko: '덮다', en: 'to close (a book)', ask: 'Please close it.' },
  { ko: '공부하다', en: 'to study', ask: 'Please study.' },
  { ko: '만나다', en: 'to meet', ask: 'Please meet.' },
  { ko: '하다', en: 'to do', ask: 'Please do it.' },
  { ko: '지내다', en: 'to get along' },
  { ko: '알다', en: 'to know' },
  { ko: '좋다', en: 'to be good' },
  { ko: '바쁘다', en: 'to be busy' },
  { ko: '많다', en: 'to be many' },
  { ko: '있다', en: 'to have' },
  { ko: '없다', en: 'to not have' },
  { ko: '어떻다', en: 'to be how', irregular: 'ㅎ' },
]

const HON_NOUNS = [
  { ko: '한국 사람', en: 'Korean' }, { ko: '중국 사람', en: 'Chinese' }, { ko: '일본 사람', en: 'Japanese' }, { ko: '미국 사람', en: 'American' },
  { ko: '영국 사람', en: 'British' }, { ko: '한국어 선생님', en: 'a Korean teacher' }, { ko: '영어 선생님', en: 'an English teacher' }, { ko: '교수', en: 'a professor' },
]

const vocabOf = (ko: string) => lessons.flatMap((l) => l.vocab).find((v) => v.ko === ko)
const irregOf = (ko: string): Irregular | undefined => HONORIFIC_SET.find((h) => h.ko === ko)?.irregular ?? vocabOf(ko)?.irregular
const politeOf = (ko: string) => polite(ko, irregOf(ko))
const gCodeFor = (ko: string) => (politeClass(ko, irregOf(ko)) === 'plain' ? '2:2.2' : '2:2.3')

export function lesson3Exercises(): Exercise[] {
  const out: Exercise[] = []
  const posChoices = POSITIONS.map((p) => p.ko as string)

  /* ── G3.1 location ── */
  LOCATIONS.forEach((l, i) => {
    const key = `${l.a.ko}:${l.b.ko}:${l.pos}`
    const en = locationEn(l)
    const sp = subjectParticle(l.a.ko)
    out.push(makeBlank(L, `loc-pos:${key}`, '3.1', 'other', `${l.a.ko}${topicParticle(l.a.ko)} ${l.b.ko} ___에 있어요.`, en, [l.pos], posChoices, `${l.pos} means "${POS_EN[l.pos]}": ${l.b.ko} ${l.pos}에 = ${POS_EN[l.pos]} ${l.b.en.replace(/^the /, 'the ')}.`))
    out.push(makeBlank(L, `loc-subj:${key}`, '3.1', 'particle', `A: ${l.a.ko}___ 어디 있어요? B: ${l.b.ko} ${l.pos}에 있어요.`, en, [sp], ['이', '가'], batchimReason(l.a.ko, '이', '가')))
    out.push(makeBlank(L, `loc-where:${key}`, '3.1', 'question', `A: ${l.a.ko}${sp} ___ 있어요? B: ${l.b.ko} ${l.pos}에 있어요.`, en, ['어디'], ['어디', '뭐', '누구', '어떻게'], '어디 means "where". It goes right before 있어요, not at the start of the sentence.'))
    const wrongs = posChoices.filter((p) => p !== l.pos)
    out.push(makeBlank(L, `loc-typed:${key}`, '3.1', 'other', `A: ${l.a.ko}${sp} 어디 있어요? B: ___ 있어요.`, en, [`${l.b.ko} ${l.pos}에`], [`${l.b.ko} ${l.pos}에`, ...wrongs.slice(i % 2, (i % 2) + 3).map((p) => `${l.b.ko} ${p}에`)], `Place + position + 에: ${l.b.ko} ${l.pos}에 = ${POS_EN[l.pos]} ${l.b.en}.`))
    if (i % 3 === 0)
      out.push(makeBlank(L, `loc-part:${key}`, '3.1', 'particle', `${l.a.ko}${topicParticle(l.a.ko)} ${l.b.ko} ${l.pos}___ 있어요.`, en, ['에'], ['에', '이', '가', '를'], '에 marks a fixed location ("in, at, on"). Use 에 + 있어요 to say where something is; 이에요/예요 cannot say where.'))
  })
  FLOORS.forEach((l) => {
    const key = `${l.a.ko}:${l.b.ko}:${l.floor}`
    out.push(makeBlank(L, `floor-part:${key}`, '3.1', 'particle', `${l.a.ko}${topicParticle(l.a.ko)} ${l.b.ko} ${l.floor}층___ 있어요.`, locationEn(l), ['에'], ['에', '이', '가', '를'], '에 marks a fixed location, including a floor: 1층에 있어요 = "it is on the 1st floor".'))
  })

  /* ── G3.3 possession ── */
  for (const p of PEOPLE) {
    for (const it of HAVE) {
      const has = hasIt(p.ko, it.ko)
      const verb = has ? '있어요' : '없어요'
      const today = it.today ? ' 오늘' : ''
      const sp = subjectParticle(it.ko)
      const en = haveEn(p, it, has)
      out.push(makeBlank(L, `poss:${p.ko}:${it.ko}`, '3.3', 'ending', `${p.ko}${topicParticle(p.ko)}${today} ${it.ko}${sp} ___.`, en, [verb], ['있어요', '없어요'], has ? '있어요 = "has / there is". Possession is N이/가 있어요.' : '없어요 = "does not have / there is not". It is the opposite of 있어요.'))
      out.push(makeBlank(L, `poss-part:${p.ko}:${it.ko}`, '3.3', 'particle', `${p.ko}${topicParticle(p.ko)}${today} ${it.ko}___ ${verb}.`, en, [sp], ['이', '가'], batchimReason(it.ko, '이', '가')))
    }
  }
  for (const it of HAVE) {
    const today = it.today ? '오늘 ' : ''
    out.push(makeBlank(L, `hon-poss:${it.ko}`, '3.4', 'ending', `선생님, ${today}${it.ko}${subjectParticle(it.ko)} ___?`, `Teacher, do you have ${it.en}${it.today ? ' today' : ''}?`, ['있으세요'], ['있으세요', '있어요', '있이세요', '계세요'], 'Asking a teacher, a respected person: use the honorific 있으세요 (있다 + (으)세요).'))
  }

  /* ── G3.4 honorific copula: 이세요 / 세요 ── */
  for (const subj of [{ ko: '이 선생님', en: 'This teacher' }, { ko: '아버지', en: 'My father' }])
    for (const n of HON_NOUNS)
      out.push(makeBlank(L, `hon-cop:${subj.ko}:${n.ko}`, '3.4', 'ending', `${subj.ko}${topicParticle(subj.ko)} ${n.ko}___.`, `${subj.en} is ${n.en}.`, [honorificCopula(n.ko)], ['이세요', '세요', '이에요', '예요'], `For a respected person use the honorific copula: 이세요 after a consonant, 세요 after a vowel. ${batchimReason(n.ko, '이세요', '세요')}`))

  /* ── G3.4 honorific conjugation and requests ── */
  for (const h of HONORIFIC_SET) {
    const right = honorific(h.ko, h.irregular)
    out.push(makeConj(L, `hconj:${h.ko}`, '3.4', h.ko, h.en, 'honorific -(으)세요', [right], [right, ...honorificDistractors(h.ko, h.irregular)], `${right}: ${h.ko} + (으)세요. After a consonant use 으세요, after a vowel 세요.${h.irregular ? ` (${h.irregular}-irregular)` : ''}`, h.irregular ? `${h.irregular}-irregular` : undefined))
    const at = HONORIFIC_SET.indexOf(h)
    const others = [4, 8, 12].map((k) => HONORIFIC_SET[(at + k) % HONORIFIC_SET.length].ko)
    out.push(makeConj(L, `hrev:${h.ko}`, '3.4', right, h.en, 'dictionary form', [h.ko], [h.ko, ...others], `${right} is the honorific of ${h.ko}.`))
    if (h.ask) out.push(makeBlank(L, `req:${h.ko}`, 'request', 'ending', '___.', h.ask, [right], [right, ...honorificDistractors(h.ko, h.irregular)], `A polite request takes -(으)세요: ${right}.`))
  }

  /* ── 그래서 / 그런데 / 그리고 ── */
  for (const c of CONNECT) {
    const g = c.c === '그래서' ? 'geuraeseo' : c.c === '그런데' ? 'geureonde' : '2:geurigo'
    const why = c.c === '그래서' ? '그래서 means "so, therefore": the second sentence is a result of the first.' : c.c === '그런데' ? '그런데 means "but, however": the two sentences contrast.' : '그리고 means "and": it adds a second sentence.'
    out.push(makeBlank(L, `conn:${c.c}:${c.s1}`, g, 'other', `${c.s1}. ___ ${c.s2}.`, `${c.en1} ${c.c === '그래서' ? 'So' : c.c === '그런데' ? 'But' : 'And'} ${c.en2.charAt(0).toLowerCase()}${c.en2.slice(1)}`, [c.c], ['그래서', '그런데', '그리고'], why))
  }

  /* ── question words ── */
  const QW: [string, string, string, string][] = [
    ['A: 이름이 ___예요?', '뭐', 'What is your name?', '뭐 "what" is used for things.'],
    ['A: 서점이 ___ 있어요?', '어디', 'Where is the bookstore?', '어디 "where" asks about a place.'],
    ['A: 요즘 ___ 지내요?', '어떻게', 'How are you these days?', '어떻게 "how" asks in what way.'],
    ['A: 리사가 ___예요?', '누구', 'Who is Lisa?', '누구 "who" asks about a person.'],
    ['A: 한국어 선생님이 ___세요?', '누구', 'Who is the Korean teacher?', '누구 "who" asks about a person.'],
    ['A: 사전이 ___ 있어요?', '어디', 'Where is the dictionary?', '어디 "where" asks about a place.'],
    ['A: 지금 ___ 해요?', '뭐', 'What are you doing now?', '뭐 "what" asks what someone is doing.'],
    ['A: 한국어 교실이 ___ 있어요?', '어디', 'Where is the Korean classroom?', '어디 "where" asks about a place.'],
    ['A: 전화 번호가 ___예요?', '뭐', 'What is your phone number?', '뭐 "what" asks for a thing.'],
    ['A: ___ 학교에 있어요? B: 유미가 학교에 있어요.', '누가', 'Who is at the school?', '누구 + 가 becomes 누가 ("who" as the subject).'],
    ['A: 마이클 씨, 한국어 수업이 ___? B: 아주 재미있어요.', '어때요', 'Michael, how is the Korean class?', '어때요? asks for an opinion.'],
    ['A: 도서관이 ___ 있어요? B: 기숙사 뒤에 있어요.', '어디', 'Where is the library?', '어디 "where" asks about a place.'],
  ]
  const QW_WORDS = ['뭐', '누구', '어디', '어떻게']
  for (const [i, [sentence, ans, en, expl]] of QW.entries()) {
    const choices = ans === '누가' ? ['누가', '누구가', '뭐가', '어디가'] : ans === '어때요' ? ['어때요', '어떻게요', '어때서', '어떠요'] : [ans, ...QW_WORDS.filter((w) => w !== ans)]
    out.push(makeBlank(L, `qw:${i}`, 'nugu', 'question', sentence, en, [ans], choices, expl))
  }

  /* ── ~은/는요? "What about…?" ── */
  const places = [...BUILDINGS, ...INSIDE_A.slice(0, 2)]
  places.forEach((z, i) => {
    const x = places[(i + 2) % places.length]
    if (x.ko === z.ko) return
    out.push(makeBlank(L, `andyou:${x.ko}:${z.ko}`, '3.2', 'particle', `A: ${x.ko}${subjectParticle(x.ko)} 어디 있어요? B: 우체국 앞에 있어요. A: ${z.ko}___요?`, `A: Where is ${x.en}? B: In front of the post office. A: What about ${z.en}?`, [topicParticle(z.ko)], ['은', '는'], `~은요/는요? means "What about …?" and shifts the topic. ${batchimReason(z.ko, '은', '는')}`))
  })

  /* ── polite conjugation for this lesson's own words, both directions ── */
  const l3 = lessons.find((l) => l.lesson === L)
  const pool = (l3?.vocab ?? []).filter((v, i, all) => (v.pos === 'verb' || v.pos === 'adjective') && v.ko.endsWith('다') && v.forms?.includes(politeOf(v.ko)) && all.findIndex((x) => x.ko === v.ko) === i)
  pool.forEach((v, i) => {
    const right = politeOf(v.ko)
    const code = gCodeFor(v.ko)
    out.push(makeConj(L, `conj:${v.ko}`, code, v.ko, v.en, 'polite form (-어요/아요)', [right], [right, ...politeDistractors(v.ko, v.irregular)], describePolite(v.ko, v.irregular), v.irregular ? `${v.irregular}-irregular` : undefined))
    const others = [1, 2, 3].map((k) => pool[(i + k * 2) % pool.length].ko).filter((x) => x !== v.ko)
    out.push(makeConj(L, `rev:${v.ko}`, code, right, v.en, 'dictionary form', [v.ko], [v.ko, ...others.slice(0, 3)], `${right} comes from ${v.ko}. ${describePolite(v.ko, v.irregular)}`))
  })

  return out
}
