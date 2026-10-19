// Practice-exercise generators for Lesson 5 grammar:
//   G5.1 locative particles 에 / 에서 · G5.2 basic sentence pattern (flexible word order)
//   G5.3 ~(으)러 [place]에 가요 · G5.4 ㄷ-irregular verbs · times (시/분), weekdays, 에 with time
//
// Vocabulary comes from Lessons 1–5 only (the tests check this). The practice sentences the exercises are built from are
// exported as `practiceSentences()` so the authoring script writes exactly the same sentences into lesson-5.json.
import { lessons } from '../../data'
import type { Exercise } from '../../data/types'
import { describePolite, honorific, honorificDistractors, polite, politeClass, politeDistractors, type Irregular } from '../conjugate'
import { hasBatchim } from '../hangul'
import { batchimReason, subjectParticle, topicParticle } from '../korean'
import { makeBlank, makeConj } from './common'
import { PEOPLE } from './lesson1'
import { objectParticle } from './lesson2'
import { native, sino } from './lesson4'

const L = 5

/** Purpose form: stem + (으)러 — 러 after a vowel, 으러 after a consonant; ㄷ-irregular stems change ㄷ → ㄹ (듣다 → 들으러). */
export function purpose(dict: string, irregular?: Irregular): string {
  if (irregular === 'ㄷ') return polite(dict, 'ㄷ').slice(0, -2) + '으러'
  const stem = dict.slice(0, -1)
  return stem + (hasBatchim(stem) ? '으러' : '러')
}

/* ───────────── places and activities ───────────── */
const PL: Record<string, string> = {
  도서관: 'the library',
  커피숍: 'the coffee shop',
  식당: 'the restaurant',
  '학교 식당': 'the school cafeteria',
  서점: 'the bookstore',
  백화점: 'the department store',
  옷가게: 'the clothing store',
  공원: 'the park',
  '컴퓨터 랩': 'the computer lab',
  교실: 'the classroom',
  학교: 'school',
  집: 'home',
  기숙사: 'the dormitory',
  학생회관: 'the student center',
  우체국: 'the post office',
  대학교: 'the university',
}
export const placeEn = (ko: string) => PL[ko]

interface Act {
  v: string // dictionary form
  irregular?: Irregular
  o?: string // object noun (without particle)
  en: (who: string, where: string) => string
  places: string[]
}
const eatEn = (food: string) => (who: string, where: string) => `${who} eats ${food} at ${where}.`
export const ACTS: Act[] = [
  { v: '먹다', o: '점심', en: eatEn('lunch'), places: ['식당', '학교 식당', '집'] },
  { v: '먹다', o: '저녁', en: eatEn('dinner'), places: ['집', '식당'] },
  { v: '먹다', o: '아침', en: eatEn('breakfast'), places: ['집', '식당'] },
  { v: '먹다', o: '햄버거', en: eatEn('a hamburger'), places: ['식당', '백화점'] },
  { v: '공부하다', en: (w, p) => `${w} studies at ${p}.`, places: ['도서관', '집', '교실', '기숙사', '컴퓨터 랩'] },
  { v: '운동하다', en: (w, p) => `${w} exercises at ${p}.`, places: ['공원', '학생회관'] },
  { v: '일하다', en: (w, p) => `${w} works at ${p}.`, places: ['서점', '백화점', '식당', '커피숍', '우체국', '도서관'] },
  { v: '사다', o: '선물', en: (w, p) => `${w} buys a present at ${p}.`, places: ['백화점', '서점'] },
  { v: '사다', o: '옷', en: (w, p) => `${w} buys clothes at ${p}.`, places: ['백화점', '옷가게'] },
  { v: '사다', o: '책', en: (w, p) => `${w} buys a book at ${p}.`, places: ['서점', '백화점'] },
  { v: '사다', o: '커피', en: (w, p) => `${w} buys coffee at ${p}.`, places: ['커피숍', '백화점'] },
  { v: '치다', o: '테니스', en: (w, p) => `${w} plays tennis at ${p}.`, places: ['공원'] },
  { v: '만나다', o: '친구', en: (w, p) => `${w} meets a friend at ${p}.`, places: ['커피숍', '도서관', '식당', '학교 식당', '공원', '서점', '학생회관'] },
  { v: '마시다', o: '커피', en: (w, p) => `${w} drinks coffee at ${p}.`, places: ['커피숍', '집', '식당'] },
  { v: '읽다', o: '책', en: (w, p) => `${w} reads a book at ${p}.`, places: ['도서관', '집', '기숙사', '커피숍'] },
  { v: '연습하다', o: '한국어', en: (w, p) => `${w} practices Korean at ${p}.`, places: ['컴퓨터 랩', '도서관', '교실', '집'] },
  { v: '쇼핑하다', en: (w, p) => `${w} goes shopping at ${p}.`, places: ['백화점', '옷가게'] },
  { v: '전화하다', en: (w, p) => `${w} makes a phone call at ${p}.`, places: ['집', '기숙사', '학교'] },
  { v: '듣다', irregular: 'ㄷ', o: '수업', en: (w, p) => `${w} takes a class at ${p}.`, places: ['학교', '학생회관'] },
  { v: '듣다', irregular: 'ㄷ', o: '음악', en: (w, p) => `${w} listens to music at ${p}.`, places: ['집', '기숙사'] },
  { v: '걷다', irregular: 'ㄷ', en: (w, p) => `${w} walks at ${p}.`, places: ['공원', '학교'] },
  { v: '보다', o: '텔레비전', en: (w, p) => `${w} watches television at ${p}.`, places: ['집', '기숙사'] },
]
/** People used as subjects (the persons rotate through the activities so that every activity has several). */
const subjectOf = (i: number, k: number) => PEOPLE[(i * 3 + k * 5) % PEOPLE.length]

export interface ActSentence {
  key: string
  who: { ko: string; en: string }
  act: Act
  place: string
  ko: string
  en: string
  verbForm: string
}
export const ACT_SENTENCES: ActSentence[] = (() => {
  const out: ActSentence[] = []
  ACTS.forEach((act, i) =>
    act.places.forEach((place, pi) => {
      for (let k = 0; k < 2; k++) {
        const who = subjectOf(i + pi, k)
        const vf = polite(act.v, act.irregular)
        const obj = act.o ? `${act.o}${objectParticle(act.o)} ` : ''
        out.push({
          key: `${act.v}:${act.o ?? ''}:${place}:${who.ko}`,
          who,
          act,
          place,
          ko: `${who.ko}${topicParticle(who.ko)} ${place}에서 ${obj}${vf}.`,
          en: act.en(who.en, placeEn(place)),
          verbForm: vf,
        })
      }
    }),
  )
  return out
})()

/** Where people go ("[place]에 가요"). */
export const GO_PLACES = ['도서관', '커피숍', '식당', '학교 식당', '서점', '백화점', '옷가게', '공원', '컴퓨터 랩', '교실', '학교', '집', '기숙사', '학생회관', '우체국']
export const GO_SENTENCES = GO_PLACES.flatMap((place, i) =>
  [0, 1, 2].map((k) => {
    const who = PEOPLE[(i * 2 + k * 5) % PEOPLE.length]
    const verb = k === 2 ? '와요' : '가요'
    const en = placeEn(place)
    const dest = place === '집' ? 'home' : en
    return { key: `${who.ko}:${place}:${verb}`, who, place, verb, ko: `${who.ko}${topicParticle(who.ko)} ${place}에 ${verb}.`, en: `${who.en} ${verb === '가요' ? 'goes' : 'comes'} to ${dest}.` }
  }),
)

/* ───────────── purpose: ~(으)러 가요 ───────────── */
export interface Purp {
  obj?: string // 점심
  v: string
  irregular?: Irregular
  place: string
  en: string
}
export const PURPOSES: Purp[] = [
  { obj: '점심', v: '먹다', place: '식당', en: 'to eat lunch' },
  { obj: '점심', v: '먹다', place: '학교 식당', en: 'to eat lunch' },
  { obj: '저녁', v: '먹다', place: '식당', en: 'to eat dinner' },
  { obj: '햄버거', v: '먹다', place: '식당', en: 'to eat a hamburger' },
  { obj: '친구', v: '만나다', place: '커피숍', en: 'to meet a friend' },
  { obj: '친구', v: '만나다', place: '도서관', en: 'to meet a friend' },
  { obj: '선물', v: '사다', place: '백화점', en: 'to buy a present' },
  { obj: '옷', v: '사다', place: '옷가게', en: 'to buy clothes' },
  { obj: '옷', v: '사다', place: '백화점', en: 'to buy clothes' },
  { obj: '책', v: '사다', place: '서점', en: 'to buy a book' },
  { obj: '커피', v: '마시다', place: '커피숍', en: 'to drink coffee' },
  { obj: '책', v: '읽다', place: '도서관', en: 'to read a book' },
  { obj: '테니스', v: '치다', place: '공원', en: 'to play tennis' },
  { obj: '한국어', v: '연습하다', place: '컴퓨터 랩', en: 'to practice Korean' },
  { obj: '수업', v: '듣다', irregular: 'ㄷ', place: '학교', en: 'to take a class' },
  { obj: '음악', v: '듣다', irregular: 'ㄷ', place: '기숙사', en: 'to listen to music' },
  { v: '공부하다', place: '도서관', en: 'to study' },
  { v: '공부하다', place: '교실', en: 'to study' },
  { v: '운동하다', place: '공원', en: 'to exercise' },
  { v: '쇼핑하다', place: '백화점', en: 'to go shopping' },
  { v: '걷다', irregular: 'ㄷ', place: '공원', en: 'to walk' },
  { v: '일하다', place: '서점', en: 'to work' },
  { v: '전화하다', place: '기숙사', en: 'to make a phone call' },
]
export const purposeKo = (p: Purp, verb = '가요') => `${p.obj ? p.obj + ' ' : ''}${purpose(p.v, p.irregular)} ${p.place}에 ${verb}.`
export const purposeEn = (p: Purp, who = 'I') => `${who === 'I' ? "I'm" : who + ' is'} going to ${placeEn(p.place).replace(/^home$/, 'home')} ${p.en}.`

/* ───────────── time ───────────── */
export const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
export const MINUTES = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50]
export const clockKo = (h: number, m: number) => (m ? `${native(h, true)} 시 ${sino(m)} 분` : `${native(h, true)} 시`)
const clockDigits = (h: number, m: number) => (m ? `${h}시 ${m}분` : `${h}시`)
export const EVENTS = [
  { ko: '수업', en: 'class' },
  { ko: '시험', en: 'the exam' },
  { ko: '파티', en: 'the party' },
  { ko: '한국어 수업', en: 'Korean class' },
  { ko: '경제학 수업', en: 'economics class' },
  { ko: '역사 수업', en: 'history class' },
]
const TIME_PAIRS: [number, number][] = HOURS.flatMap((h) => [0, 30, 15, 45].filter((_, i) => (h + i) % 2 === 0).map((m) => [h, m] as [number, number]))
export const timeSentences = () =>
  EVENTS.flatMap((e, ei) =>
    TIME_PAIRS.filter((_, i) => (i + ei) % 3 === 0).map(([h, m]) => ({
      key: `${e.ko}:${h}:${m}`,
      e,
      h,
      m,
      ko: `${e.ko}${subjectParticle(e.ko)} ${clockDigits(h, m)}에 있어요.`,
      en: `${e.en === 'class' ? 'There is class' : `There is ${e.en}`} at ${h}${m ? ':' + String(m).padStart(2, '0') : ':00'}.`.replace('There is the exam', 'There is an exam').replace('There is the party', 'There is a party'),
    })),
  )

export const DAYS = [
  { ko: '월요일', en: 'Monday' },
  { ko: '화요일', en: 'Tuesday' },
  { ko: '수요일', en: 'Wednesday' },
  { ko: '목요일', en: 'Thursday' },
  { ko: '금요일', en: 'Friday' },
  { ko: '토요일', en: 'Saturday' },
  { ko: '일요일', en: 'Sunday' },
]
export const CLASSES = [
  { ko: '한국어', en: 'Korean' },
  { ko: '경제학', en: 'economics' },
  { ko: '역사', en: 'history' },
  { ko: '정치학', en: 'political science' },
  { ko: '생물학', en: 'biology' },
  { ko: '음악', en: 'music' },
]
export const dayClass = DAYS.flatMap((d, di) =>
  CLASSES.filter((_, ci) => (di + ci) % 2 === 0).map((c) => ({ key: `${d.ko}:${c.ko}`, d, c, ko: `${d.ko}에 ${c.ko} 수업이 있어요.`, en: `There is ${c.en} class on ${d.en}.` })),
)

/* ───────────── word-order variants (G5.2) ───────────── */
const perms = <T,>(a: T[]): T[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])))
export const ORDER_BASES = [
  { s: '유미가', p: '교실에서', o: '한국어를', v: '공부해요', d: '공부하다', en: 'Yumi studies Korean in the classroom.' },
  { s: '리사가', p: '식당에서', o: '햄버거를', v: '먹어요', d: '먹다', en: 'Lisa eats a hamburger at the restaurant.' },
  { s: '오빠가', p: '방에서', o: '텔레비전을', v: '봐요', d: '보다', en: 'My older brother watches television in his room.' },
  { s: '제니가', p: '도서관에서', o: '책을', v: '읽어요', d: '읽다', en: 'Jenny reads a book at the library.' },
  { s: '스티브가', p: '공원에서', o: '테니스를', v: '쳐요', d: '치다', en: 'Steve plays tennis at the park.' },
  { s: '마이클이', p: '커피숍에서', o: '친구를', v: '만나요', d: '만나다', en: 'Michael meets a friend at the coffee shop.' },
  { s: '소피아가', p: '백화점에서', o: '선물을', v: '사요', d: '사다', en: 'Sophia buys a present at the department store.' },
  { s: '수지가', p: '커피숍에서', o: '커피를', v: '마셔요', d: '마시다', en: 'Susie drinks coffee at the coffee shop.' },
]
export const ORDER_SENTENCES = ORDER_BASES.flatMap((b, bi) =>
  perms([b.s, b.p, b.o]).map((p, pi) => ({ key: `${bi}:${pi}`, ko: `${p.join(' ')} ${b.v}.`, en: b.en, base: b })),
)

const WEEK_ORDER = DAYS.map((d) => d.ko)

/** Every practice sentence of the lesson (exercises are built from these). */
export interface PS {
  ko: string
  en: string
  g: string[]
}
const vocabOf = (ko: string) => lessons.flatMap((l) => l.vocab).find((v) => v.ko === ko)
const irregOf = (ko: string): Irregular | undefined => ACTS.find((a) => a.v === ko)?.irregular ?? vocabOf(ko)?.irregular
const politeOf = (ko: string) => polite(ko, irregOf(ko))

export function practiceSentences(): PS[] {
  const out: PS[] = []
  const add = (ko: string, en: string, g: string[]) => out.push({ ko, en, g })
  for (const a of ACT_SENTENCES) add(a.ko, a.en, ['5.1', '5.2'])
  for (const g of GO_SENTENCES) add(g.ko, g.en, ['5.1'])
  for (const o of ORDER_SENTENCES) add(o.ko, o.en, ['5.2'])
  for (const p of PURPOSES) {
    add(purposeKo(p), purposeEn(p), ['5.3'])
    add(purposeKo(p, '와요'), purposeEn(p).replace("I'm going to", "I'm coming to"), ['5.3'])
  }
  for (const t of timeSentences()) add(t.ko, t.en, ['time'])
  for (const d of dayClass) add(d.ko, d.en, ['5.1', 'time'])
  DAYS.forEach((d, i) => {
    const n = DAYS[(i + 1) % 7]
    add(`오늘은 ${d.ko}이에요. 내일은 ${n.ko}이에요.`, `Today is ${d.en}. Tomorrow is ${n.en}.`, ['time'])
  })
  for (const l of ['한국어', '영어', '중국어', '일본어']) add(`이민수 선생님이 대학교에서 ${l}를 ${honorific('가르치다')}.`.replace(`${l}를`, `${l}${objectParticle(l)}`), `Professor Lee teaches ${{ 한국어: 'Korean', 영어: 'English', 중국어: 'Chinese', 일본어: 'Japanese' }[l]} at the university.`, ['5.2'])
  for (const d of ['듣다', '걷다', '받다']) {
    add(`${{ 듣다: '수업을', 걷다: '공원에서', 받다: '선물을' }[d]} ${politeOf(d)}.`, { 듣다: 'I take a class.', 걷다: 'I walk in the park.', 받다: 'I receive a present.' }[d]!, ['5.4'])
  }
  return out
}

export function lesson5Exercises(): Exercise[] {
  const out: Exercise[] = []
  const lessonData = lessons.find((l) => l.lesson === L)

  /* ── G5.1 에 / 에서 ── */
  for (const a of ACT_SENTENCES) {
    const obj = a.act.o ? `${a.act.o}${objectParticle(a.act.o)} ` : ''
    out.push(makeBlank(L, `se:${a.key}`, '5.1', 'particle', `${a.who.ko}${topicParticle(a.who.ko)} ${a.place}___ ${obj}${a.verbForm}.`, a.en, ['에서'], ['에서', '에', '도', '만'], `${a.verbForm} is an action that takes place at the location, so use 에서 ("in/at", dynamic location), not 에.`))
    out.push(makeBlank(L, `act:${a.key}`, '5.1', 'ending', `${a.who.ko}${topicParticle(a.who.ko)} ${a.place}에서 ${obj}___ (${a.act.v}).`, a.en, [a.verbForm], [a.verbForm, ...politeDistractors(a.act.v, a.act.irregular)], describePolite(a.act.v, a.act.irregular)))
    if (a.act.o) out.push(makeBlank(L, `obj:${a.key}`, '5.2', 'particle', `${a.who.ko}${topicParticle(a.who.ko)} ${a.place}에서 ${a.act.o}___ ${a.verbForm}.`, a.en, [objectParticle(a.act.o)], ['을', '를'], batchimReason(a.act.o, '을', '를')))
  }
  for (const g of GO_SENTENCES)
    out.push(makeBlank(L, `go:${g.key}`, '5.1', 'particle', `${g.who.ko}${topicParticle(g.who.ko)} ${g.place}___ ${g.verb}.`, g.en, ['에'], ['에', '에서', '도', '만'], `${g.verb === '가요' ? '가다 (go)' : '오다 (come)'} is a directional verb: the destination takes 에, not 에서.`))
  for (const g of GO_SENTENCES.filter((_, i) => i % 2 === 0)) {
    const ac = ACT_SENTENCES[(GO_SENTENCES.indexOf(g) * 7) % ACT_SENTENCES.length]
    out.push(makeBlank(L, `se-or-e:${g.key}`, '5.1', 'particle', `A: ${ac.who.ko}${topicParticle(ac.who.ko)} 어디 ___? B: ${g.place}에 ${g.verb}.`, `A: Where does ${ac.who.en} go? B: To ${placeEn(g.place)}.`, ['가요'], ['가요', '와요', '있어요', '해요'], 'The question asks where someone goes, so the verb is 가요 (the answer has a destination with 에).'))
  }
  for (const [i, p] of ['도서관', '식당', '집', '학교', '서점', '기숙사', '교실'].entries()) {
    const who = PEOPLE[(i * 3) % PEOPLE.length]
    out.push(makeBlank(L, `static:${p}:${who.ko}`, '5.1', 'particle', `${who.ko}${topicParticle(who.ko)} ${p}___ 있어요.`, `${who.en} is at ${placeEn(p)}.`, ['에'], ['에', '에서', '도', '만'], '있어요 (existence) marks a static location with 에.'))
    out.push(makeBlank(L, `static-vs:${p}:${who.ko}`, '5.1', 'other', `A: ${who.ko}${topicParticle(who.ko)} 어디 있어요? B: ${p}___ 있어요.`, `A: Where is ${who.en}? B: At ${placeEn(p)}.`, ['에'], ['에', '에서', '이', '가'], '에 + 있어요 for where someone is; 에서 is for where an activity happens.'))
  }

  /* ── G5.3 ~(으)러 ── */
  PURPOSES.forEach((p, i) => {
    const right = purpose(p.v, p.irregular)
    const stem = p.v.slice(0, -1)
    const wrongs = p.irregular ? [stem + '러', polite(p.v, 'ㄷ'), p.v.slice(0, -1) + '으러', stem + '고'] : [hasBatchim(stem) ? stem + '러' : stem + '으러', polite(p.v), stem + '고', stem + '는']
    const key = `${p.obj ?? ''}:${p.v}:${p.place}`
    out.push(makeBlank(L, `pur:${key}`, '5.3', 'ending', `${p.obj ? p.obj + ' ' : ''}___ ${p.place}에 가요.`, purposeEn(p), [right], [right, ...wrongs], `Purpose of going: stem + ${hasBatchim(stem) && !p.irregular ? '으러 after a consonant' : p.irregular ? '으러 (ㄷ → ㄹ before a vowel)' : '러 after a vowel'}: ${right}.`))
    out.push(makeBlank(L, `pur-ru:${key}`, '5.3', 'ending', `${p.obj ? p.obj + ' ' : ''}${p.irregular ? right.slice(0, -2) : stem}___ ${p.place}에 가요.`, purposeEn(p), [p.irregular ? '으러' : hasBatchim(stem) ? '으러' : '러'], ['으러', '러', '어러', '고'], p.irregular ? 'The stem (ㄷ → ㄹ) ends in a consonant, so 으러.' : hasBatchim(stem) ? `${stem} ends in a consonant: 으러.` : `${stem} ends in a vowel: 러.`))
    out.push(makeBlank(L, `pur-place:${key}`, '5.3', 'particle', `${p.obj ? p.obj + ' ' : ''}${right} ${p.place}___ 가요.`, purposeEn(p), ['에'], ['에', '에서', '이', '가'], 'The destination of 가요 takes 에.'))
    if (i % 2 === 0) out.push(makeBlank(L, `pur-verb:${key}`, '5.3', 'ending', `${p.obj ? p.obj + ' ' : ''}${right} ${p.place}에 ___.`, purposeEn(p), ['가요', '와요'], ['가요', '와요', '있어요', '해요'], '~(으)러 is used with the directional verbs 가다 / 오다.'))
  })

  /* ── time: reading clock times ── */
  for (const h of HOURS)
    for (const m of MINUTES) {
      const right = clockKo(h, m)
      const answers = [right]
      if (m === 30) answers.push(`${native(h, true)} 시 반`)
      const wrongs = [m ? `${sino(h)} 시 ${sino(m)} 분` : `${sino(h)} 시`, m ? `${native(h, true)} 시 ${native(m / 5 + 1, true)} 분` : `${native(h === 12 ? 11 : h + 1, true)} 시`, m ? `${native(h === 12 ? 1 : h + 1, true)} 시 ${sino(m)} 분` : `${native(h, false)} 시`]
      out.push(makeConj(L, `clock:${h}:${m}`, 'time', clockDigits(h, m), `${h}:${String(m).padStart(2, '0')}`, 'read the time (native hour + Sino-Korean minutes)', answers, [right, ...wrongs], `Hours use native numbers (${native(h, true)} 시) and minutes use Sino-Korean numbers${m ? ` (${sino(m)} 분)` : ''}.${m === 30 ? ' 30분 can also be 반 "half".' : ''}`))
    }
  for (const t of timeSentences())
    out.push(makeBlank(L, `ev-e:${t.key}`, 'time', 'particle', `${t.e.ko}${subjectParticle(t.e.ko)} ${clockDigits(t.h, t.m)}___ 있어요.`, t.en, ['에'], ['에', '에서', '은', '도'], '에 marks a point in time: 3시에 "at 3 o\'clock".'))
  for (const d of dayClass) {
    out.push(makeBlank(L, `day-e:${d.key}`, 'time', 'particle', `${d.d.ko}___ ${d.c.ko} 수업이 있어요.`, d.en, ['에'], ['에', '에서', '은', '도'], '에 marks a day: 월요일에 "on Monday".'))
    out.push(makeBlank(L, `day-w:${d.key}`, 'time', 'other', `${d.d.ko}에 ___ 수업이 있어요.`, d.en, [d.c.ko], [d.c.ko, ...CLASSES.filter((c) => c.ko !== d.c.ko).slice(0, 3).map((c) => c.ko)], `The English names the subject: ${d.c.en} = ${d.c.ko}.`))
  }
  DAYS.forEach((d, i) => {
    const n = DAYS[(i + 1) % 7]
    const prev = DAYS[(i + 6) % 7]
    out.push(makeBlank(L, `next-day:${d.ko}`, 'time', 'other', `오늘은 ${d.ko}이에요. 내일은 ___이에요.`, `Today is ${d.en}. Tomorrow is ${n.en}.`, [n.ko], [n.ko, ...WEEK_ORDER.filter((x) => x !== n.ko && x !== d.ko).slice(0, 3)], `${d.ko} → ${n.ko}: Monday to Sunday = ${WEEK_ORDER.join(', ')}.`))
    out.push(makeBlank(L, `prev-day:${d.ko}`, 'time', 'other', `오늘은 ${d.ko}이에요. 어제는 ___이에요.`, `Today is ${d.en}. Yesterday was ${prev.en}.`, [prev.ko], [prev.ko, ...WEEK_ORDER.filter((x) => x !== prev.ko && x !== d.ko).slice(0, 3)], `${prev.ko} comes right before ${d.ko}.`))
  })

  /* ── G5.2 word order ── */
  for (const b of ORDER_BASES)
    out.push(makeBlank(L, `order-v:${b.s}`, '5.2', 'ending', `${b.s} ${b.p} ${b.o} ___.`, b.en, [b.v], [b.v, ...politeDistractors(b.d)], 'The predicate comes last; the other parts can change places.'))

  /* ── G5.4 ㄷ-irregular verbs ── */
  const D = [
    { v: '듣다', en: 'to listen; to take (a course)', irr: 'ㄷ' as Irregular | undefined },
    { v: '걷다', en: 'to walk', irr: 'ㄷ' as Irregular | undefined },
    { v: '받다', en: 'to receive (regular!)', irr: undefined },
  ]
  for (const d of D) {
    const p = polite(d.v, d.irr)
    const h = honorific(d.v, d.irr)
    const r = purpose(d.v, d.irr)
    const tag = d.irr ? 'ㄷ-irregular' : undefined
    out.push(makeConj(L, `d-polite:${d.v}`, '5.4', d.v, d.en, 'polite form (-어요/아요)', [p], [p, ...politeDistractors(d.v, d.irr)], describePolite(d.v, d.irr), tag))
    out.push(makeConj(L, `d-hon:${d.v}`, '5.4', d.v, d.en, 'honorific -(으)세요', [h], [h, ...honorificDistractors(d.v, d.irr)], `${h}: ${d.irr ? 'ㄷ changes to ㄹ before a vowel' : '받다 is regular, so ㄷ stays'}.`, tag))
    out.push(makeConj(L, `d-pur:${d.v}`, '5.4', d.v, d.en, 'purpose -(으)러', [r], [r, d.irr ? d.v.slice(0, -1) + '으러' : p.slice(0, -2) + '으러', d.v.slice(0, -1) + '러', d.v.slice(0, -1) + '고'], `${r}: ${d.irr ? 'ㄷ → ㄹ, then 으러' : 'regular: 받 + 으러'}.`, tag))
    out.push(makeConj(L, `d-rev:${d.v}`, '5.4', p, d.en, 'dictionary form', [d.v], [d.v, ...D.filter((x) => x.v !== d.v).map((x) => x.v), '닫다'], `${p} comes from ${d.v}.`))
  }

  /* ── polite forms of this lesson's own verbs ── */
  const pool = (lessonData?.vocab ?? []).filter((v) => (v.pos === 'verb' || v.pos === 'adjective') && v.ko.endsWith('다') && v.forms?.includes(politeOf(v.ko)))
  pool.forEach((v, i) => {
    const right = politeOf(v.ko)
    const code = politeClass(v.ko, v.irregular) === 'plain' ? '2:2.2' : '4:4.5'
    out.push(makeConj(L, `conj:${v.ko}:${i}`, code, v.ko, v.en, 'polite form (-어요/아요)', [right], [right, ...politeDistractors(v.ko, v.irregular)], describePolite(v.ko, v.irregular), v.irregular ? `${v.irregular}-irregular` : undefined))
    const others = [1, 2, 3].map((k) => pool[(i + k * 2) % pool.length].ko).filter((x) => x !== v.ko)
    out.push(makeConj(L, `rev:${v.ko}:${i}`, code, right, v.en, 'dictionary form', [v.ko], [v.ko, ...others.slice(0, 3)], `${right} comes from ${v.ko}. ${describePolite(v.ko, v.irregular)}`))
  })
  return out
}
