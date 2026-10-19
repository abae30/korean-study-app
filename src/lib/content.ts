// Turning a lesson file you wrote (or exported) into the app's full lesson schema, with helpful error messages.
//
// The accepted format is deliberately forgiving: only `lesson`, `title` and the lists you actually have are needed. Ids, source
// labels, part of speech, which vocab each sentence uses, and so on are filled in. See docs/CONTENT-FORMAT.md.
import type { BlankExercise, ConjugateExercise, Exercise, Grammar, Lesson, Paragraph, Pos, Sentence, Source, Vocab } from '../data/types'

export interface ImportResult {
  lesson?: Lesson
  errors: string[]
  warnings: string[]
}

const POS: Pos[] = ['noun', 'pronoun', 'number', 'verb', 'adjective', 'copula', 'counter', 'particle', 'adverb', 'interjection', 'determiner', 'conjunction', 'suffix', 'expression']
const CATEGORIES: Grammar['category'][] = ['particle', 'ending', 'copula', 'question', 'other']
const FOCUS = ['particle', 'ending', 'question', 'conjugation', 'other'] as const

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
const strList = (x: unknown) => (Array.isArray(x) ? x.map(str).filter(Boolean) : [])

/** Normalises an arbitrary parsed JSON value into a Lesson, or explains what is wrong with it. */
export function normalizeLesson(input: unknown, fileName = 'file'): ImportResult {
  const errors: string[] = []
  const warnings: string[] = []
  const bad = (m: string) => errors.push(m)
  if (!isObj(input)) return { errors: [`${fileName}: the file must contain one JSON object.`], warnings }

  const n = input.lesson
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 99) bad(`"lesson" must be a whole number from 1 to 99 (got ${JSON.stringify(n)}).`)
  const title = str(input.title)
  if (!title) bad('"title" is missing.')
  const N = typeof n === 'number' ? n : 0

  const list = (key: string): unknown[] => {
    const v = input[key]
    if (v === undefined) return []
    if (!Array.isArray(v)) {
      bad(`"${key}" must be a list.`)
      return []
    }
    return v
  }
  const source = (o: Obj): Source => (o.source === 'generated' ? 'generated' : 'textbook')

  // ── vocabulary ──
  const vocab: Vocab[] = []
  const vocabKo = new Set<string>()
  list('vocab').forEach((raw, i) => {
    const w = `vocab #${i + 1}`
    if (!isObj(raw)) return bad(`${w} must be an object like {"ko": "학교", "en": "school"}.`)
    const ko = str(raw.ko)
    const en = str(raw.en)
    if (!ko || !en) return bad(`${w} needs both "ko" and "en".`)
    if (vocabKo.has(ko) && !raw.id) warnings.push(`${w}: "${ko}" appears more than once (kept).`)
    vocabKo.add(ko)
    let pos: Pos = 'noun'
    if (raw.pos !== undefined) {
      if (POS.includes(raw.pos as Pos)) pos = raw.pos as Pos
      else warnings.push(`${w} (${ko}): unknown "pos" ${JSON.stringify(raw.pos)}; using "noun". Allowed: ${POS.join(', ')}.`)
    }
    const set = raw.set === 1 || raw.set === 2 ? raw.set : undefined
    if (raw.set !== undefined && !set) warnings.push(`${w} (${ko}): "set" must be 1 or 2.`)
    const forms = strList(raw.forms)
    vocab.push({
      id: str(raw.id) || `l${N}-v-${ko}${vocab.some((x) => x.ko === ko) ? `-${vocab.filter((x) => x.ko === ko).length + 1}` : ''}`,
      ko,
      en,
      pos,
      ...(forms.length ? { forms } : {}),
      ...(str(raw.note) ? { note: str(raw.note) } : {}),
      ...(typeof raw.page === 'number' ? { page: raw.page } : {}),
      source: source(raw),
      ...(raw.fromTable === true ? { fromTable: true } : {}),
      ...(set ? { set } : {}),
    })
  })

  const vocabIdsFor = (text: string): string[] => {
    const tokens = text.split(/\s+/).map((t) => t.replace(/[.,?!'"“”~:;()[\]]/g, ''))
    const ids = new Set<string>()
    for (const v of vocab)
      for (const k of [v.ko, ...(v.forms ?? [])].flatMap((x) => x.split('/')).filter((x) => x && !x.includes('?')))
        if (k.length >= 2 ? text.includes(k) : tokens.includes(k)) ids.add(v.id)
    return [...ids]
  }

  // ── grammar ──
  const grammar: Grammar[] = []
  list('grammar').forEach((raw, i) => {
    const w = `grammar #${i + 1}`
    if (!isObj(raw)) return bad(`${w} must be an object with a "title".`)
    const t = str(raw.title)
    if (!t) return bad(`${w} needs a "title".`)
    const examples = (Array.isArray(raw.examples) ? raw.examples : [])
      .filter(isObj)
      .map((e) => ({ ko: str(e.ko), en: str(e.en) }))
      .filter((e) => e.ko)
    const cat = CATEGORIES.includes(raw.category as Grammar['category']) ? (raw.category as Grammar['category']) : 'other'
    grammar.push({
      id: str(raw.id) || `l${N}-g-${i + 1}`,
      lesson: N,
      ...(str(raw.code) ? { code: str(raw.code) } : {}),
      title: t,
      pattern: str(raw.pattern),
      category: cat,
      explanation: str(raw.explanation),
      examples,
      ...(typeof raw.page === 'number' ? { page: raw.page } : {}),
    })
  })

  // ── sentences ──
  const sentences: Sentence[] = []
  list('sentences').forEach((raw, i) => {
    const w = `sentence #${i + 1}`
    const o: Obj = typeof raw === 'string' ? {} : isObj(raw) ? raw : {}
    // a sentence may be written as just "한국어 | English"
    let ko = str(o.ko)
    let en = str(o.en)
    if (typeof raw === 'string') [ko, en] = raw.split('|').map((x) => x.trim())
    if (!ko || !en) return bad(`${w} needs both "ko" and "en" (or write it as "한국어 | English").`)
    sentences.push({
      id: str(o.id) || `l${N}-s-${String(i + 1).padStart(3, '0')}`,
      ko,
      en,
      source: source(o),
      lesson: N,
      vocabIds: vocabIdsFor(ko),
      grammarIds: [],
      ...(typeof o.page === 'number' ? { page: o.page } : {}),
    })
  })

  // ── paragraphs (dialogues and narrations) ──
  const paragraphs: Paragraph[] = []
  list('paragraphs').forEach((raw, i) => {
    const w = `paragraph #${i + 1}`
    if (!isObj(raw)) return bad(`${w} must be an object with "title" and "lines".`)
    const lines = (Array.isArray(raw.lines) ? raw.lines : [])
      .map((l) => {
        if (typeof l === 'string') {
          const [ko, en] = l.split('|').map((x) => x.trim())
          return { ko, en }
        }
        return isObj(l) ? { ...(str(l.speaker) ? { speaker: str(l.speaker) } : {}), ko: str(l.ko), en: str(l.en) } : { ko: '', en: '' }
      })
      .filter((l) => l.ko)
    if (!lines.length) return bad(`${w} has no usable "lines" (each needs "ko" and "en").`)
    if (lines.some((l) => !l.en)) warnings.push(`${w}: some lines have no "en" translation.`)
    const hasSpeaker = lines.some((l) => 'speaker' in l)
    paragraphs.push({
      id: str(raw.id) || `l${N}-p-${i + 1}`,
      title: str(raw.title) || `Passage ${i + 1}`,
      titleEn: str(raw.titleEn),
      kind: raw.kind === 'narration' || raw.kind === 'dialogue' ? raw.kind : hasSpeaker ? 'dialogue' : 'narration',
      lines: lines.map((l) => ({ ...l, en: l.en ?? '' })),
      source: source(raw),
      lesson: N,
      ...(typeof raw.page === 'number' ? { page: raw.page } : {}),
    })
  })

  // ── exercises ──
  const exercises: Exercise[] = []
  const rawEx = list('exercises')
  if (rawEx.length && !grammar.length)
    grammar.push({ id: `l${N}-g-exercises`, lesson: N, title: 'Practice exercises', pattern: '', category: 'other', explanation: '', examples: [] })
  rawEx.forEach((raw, i) => {
    const w = `exercise #${i + 1}`
    if (!isObj(raw)) return bad(`${w} must be an object.`)
    const answers = strList(raw.answers).length ? strList(raw.answers) : str(raw.answer) ? [str(raw.answer)] : []
    if (!answers.length) return bad(`${w} needs "answers" (a list) or "answer".`)
    const choices = strList(raw.choices)
    if (choices.length && !choices.includes(answers[0])) return bad(`${w}: "choices" must include the first answer "${answers[0]}".`)
    const gid = str(raw.grammarId)
    const base = {
      id: str(raw.id) || `l${N}-x-${String(i + 1).padStart(3, '0')}`,
      grammarId: gid || grammar[0].id,
      lesson: N,
      focus: (FOCUS as readonly string[]).includes(str(raw.focus)) ? (str(raw.focus) as Exercise['focus']) : raw.type === 'conjugate' ? 'conjugation' : 'other',
      source: source(raw),
      explanation: str(raw.explanation),
      ...(raw.verify === true ? { verify: true } : {}),
    } as const
    const finalChoices = choices.length ? choices : answers
    if (raw.type === 'conjugate') {
      if (!str(raw.base)) return bad(`${w}: a "conjugate" exercise needs "base".`)
      const ex: ConjugateExercise = { ...base, focus: base.focus, type: 'conjugate', base: str(raw.base), baseEn: str(raw.baseEn), target: str(raw.target), answers, choices: finalChoices }
      exercises.push(ex)
    } else {
      const sentence = str(raw.sentence)
      if (sentence.split('___').length !== 2) return bad(`${w}: "sentence" must contain exactly one ___ (three underscores) for the blank.`)
      if (!choices.length) warnings.push(`${w}: no "choices", so multiple-choice mode will show only the answer.`)
      const ex: BlankExercise = { ...base, type: 'blank', sentence, en: str(raw.en), answers, choices: finalChoices }
      exercises.push(ex)
    }
  })

  // ── uniqueness ──
  const seen = new Set<string>()
  for (const id of [...vocab, ...grammar, ...sentences, ...paragraphs, ...exercises].map((x) => x.id)) {
    if (seen.has(id)) bad(`duplicate id "${id}".`)
    seen.add(id)
  }

  const total = vocab.length + sentences.length + paragraphs.length + grammar.length + exercises.length
  if (!errors.length && total === 0) bad('the lesson has no vocab, sentences, paragraphs, grammar or exercises.')
  if (errors.length) return { errors: errors.map((e) => `${fileName}: ${e}`), warnings: warnings.map((e) => `${fileName}: ${e}`) }

  const lesson: Lesson = {
    lesson: N,
    title,
    titleKo: str(input.titleKo),
    names: (Array.isArray(input.names) ? input.names : []).filter(isObj).map((x) => ({ ko: str(x.ko), en: str(x.en) })).filter((x) => x.ko),
    vocab,
    sentences,
    paragraphs,
    grammar,
    exercises,
    ...(typeof input.set2StartPage === 'number' ? { set2StartPage: input.set2StartPage } : {}),
  }
  return { lesson, errors: [], warnings: warnings.map((e) => `${fileName}: ${e}`) }
}

/** A starter file people can download, edit and import. */
export const TEMPLATE: object = {
  lesson: 1,
  title: 'My first lesson',
  titleKo: '첫 번째 과',
  vocab: [
    { ko: '학교', en: 'school', pos: 'noun', set: 1 },
    { ko: '공부하다', en: 'to study', pos: 'verb', forms: ['공부해요'], set: 1 },
    { ko: '친구', en: 'friend', pos: 'noun', set: 2 },
  ],
  sentences: [{ ko: '저는 학교에 가요.', en: 'I go to school.' }, '친구를 만나요. | I meet a friend.'],
  paragraphs: [
    {
      title: '학교에서',
      titleEn: 'At school',
      lines: [
        { speaker: '민수', ko: '안녕하세요?', en: 'Hello.' },
        { speaker: '지은', ko: '안녕하세요, 민수 씨.', en: 'Hello, Minsu.' },
      ],
    },
  ],
  grammar: [{ title: 'Topic particle 은/는', pattern: 'N은/는', explanation: 'Marks the topic of the sentence.', examples: [{ ko: '저는 학생이에요.', en: 'I am a student.' }] }],
  exercises: [{ type: 'blank', sentence: '저___ 학생이에요.', en: 'I am a student.', answers: ['는'], choices: ['은', '는'], explanation: '저 ends in a vowel, so use 는.' }],
}
