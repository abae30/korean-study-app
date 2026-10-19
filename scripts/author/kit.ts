// Authoring kit: build a lesson JSON from typed definitions.
//
//   node scripts/author/run.mjs scripts/author/lesson-2.ts
//
// Vocabulary verbs/adjectives get their polite form added automatically (via the app's own conjugation engine), sentence
// vocabulary ids are matched against this lesson's and earlier lessons' words, and everything is written to
// src/data/lessons/lesson-N.json. The same rules the validator and tests enforce are applied while building.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  BlankExercise,
  ConjugateExercise,
  Exercise,
  Focus,
  Grammar,
  Lesson,
  NameEntry,
  Paragraph,
  Pos,
  Sentence,
  Source,
  Vocab,
} from '../../src/data/types'
import { honorific, polite, type Irregular } from '../../src/lib/conjugate'

const ROOT = process.cwd()
const DIR = join(ROOT, 'src', 'data', 'lessons')

export function loadPrior(lessonNo: number): Lesson[] {
  return readdirSync(DIR)
    .filter((f) => /^lesson-\d+\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Lesson)
    .filter((l) => l.lesson < lessonNo)
    .sort((a, b) => a.lesson - b.lesson)
}

interface VOpts {
  page?: number
  forms?: string[]
  note?: string
  table?: boolean
  irregular?: Irregular
  /** Don't add the computed polite form (for entries like 반갑다 where the book pairs another form). */
  noPolite?: boolean
  /** Don't add the honorific -(으)세요 form (lesson 3 onward it is added to every verb/adjective). */
  noHonorific?: boolean
  /** The same spelling as an earlier word with a different meaning (저 "uh" vs 저 "I"). */
  homonym?: boolean
}

interface SOpts {
  page?: number
  g?: string[]
  /** Extra vocab headwords to attach (short words the matcher can't safely find itself). */
  v?: string[]
  gen?: boolean
  verify?: boolean
}

export function createKit(lessonNo: number, title: string, titleKo: string, opts: { set2StartPage?: number } = {}) {
  const prior = loadPrior(lessonNo)
  const vocab: Vocab[] = []
  const names: NameEntry[] = []
  const sentences: Sentence[] = []
  const paragraphs: Paragraph[] = []
  const grammar: Grammar[] = []
  const exercises: Exercise[] = []
  let sNo = 0
  let gsNo = 0
  let xNo = 0
  const seenSentence = new Set<string>(prior.flatMap((l) => l.sentences.map((s) => s.ko)))
  const knownVocab = new Map<string, Vocab>(prior.flatMap((l) => l.vocab).map((v) => [v.ko, v]))

  /** Every key by which a sentence can refer to a vocab entry. */
  const keysOf = (v: Vocab) => [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split('/')).filter((k) => !k.includes('?'))

  const v = (ko: string, en: string, pos: Pos, o: VOpts = {}) => {
    // Words from tables and notes are skipped when an earlier lesson already has them. A word printed in a NEW WORDS list
    // (no `table` flag) is always added to its own lesson, even if it appeared earlier, so each lesson's list is complete.
    const dupInLesson = vocab.some((x) => x.ko === ko)
    if ((o.table && knownVocab.has(ko) && !o.homonym) || (dupInLesson && !o.homonym)) {
      console.warn(`  (skipping ${ko}: already ${dupInLesson ? 'in this lesson' : 'in an earlier lesson'})`)
      return
    }
    if (knownVocab.has(ko) && !o.homonym && !o.table) console.warn(`  (note: ${ko} was in an earlier lesson; also listed here as a NEW WORD)`)
    const forms = [...(o.forms ?? [])]
    if ((pos === 'verb' || pos === 'adjective') && ko.endsWith('다') && !o.noPolite) {
      try {
        const p = polite(ko, o.irregular)
        if (!forms.includes(p)) forms.push(p)
      } catch {
        /* leave as is */
      }
    }
    if (lessonNo >= 3 && (pos === 'verb' || pos === 'adjective') && ko.endsWith('다') && !o.noHonorific) {
      try {
        const h = honorific(ko, o.irregular)
        if (!forms.includes(h)) forms.push(h)
      } catch {
        /* leave as is */
      }
    }
    const entry: Vocab = {
      id: `l${lessonNo}-v-${ko}${dupInLesson ? `-${vocab.filter((x) => x.ko === ko).length + 1}` : ''}`, // a second meaning of a word gets a numbered id
      ko,
      en,
      pos,
      ...(forms.length ? { forms } : {}),
      ...(o.irregular ? { irregular: o.irregular } : {}),
      ...(o.note ? { note: o.note } : {}),
      ...(o.page ? { page: o.page } : {}),
      source: 'textbook',
      ...(o.table ? { fromTable: true } : {}),
    }
    vocab.push(entry)
    knownVocab.set(ko, entry)
  }

  const name = (ko: string, en: string) => {
    if (!names.some((n) => n.ko === ko) && !prior.some((l) => l.names.some((n) => n.ko === ko))) names.push({ ko, en })
  }

  const vidsFor = (text: string, extra: string[] = []): string[] => {
    const ids = new Set<string>()
    for (const k of extra) {
      const e = knownVocab.get(k)
      if (!e) throw new Error(`unknown vocab "${k}" in extra list`)
      ids.add(e.id)
    }
    const tokens = text.split(/\s+/).map((t) => t.replace(/[.,?!'"“”~:;()[\]]/g, ''))
    for (const e of knownVocab.values()) {
      const keys = keysOf(e)
      // long keys match anywhere in the sentence; one-letter keys (particles, 네, 아…) only as a whole word
      if (keys.some((k) => (k.length >= 2 ? text.includes(k) : tokens.includes(k)))) ids.add(e.id)
    }
    return [...ids]
  }

  /** "2.1" means this lesson's G2.1; "1:1.3" means lesson 1's G1.3. */
  const gid = (code: string) => {
    const [gl, gc] = code.includes(':') ? code.split(':') : [String(lessonNo), code]
    return `l${gl}-g-${gc}`
  }

  const s = (ko: string, en: string, o: SOpts = {}) => {
    if (seenSentence.has(ko)) return
    seenSentence.add(ko)
    const gen = !!o.gen
    const id = gen ? `l${lessonNo}-gs-${String(++gsNo).padStart(3, '0')}` : `l${lessonNo}-s-${String(++sNo).padStart(3, '0')}`
    sentences.push({
      id,
      ko,
      en,
      source: gen ? 'generated' : 'textbook',
      lesson: lessonNo,
      vocabIds: vidsFor(ko, o.v),
      grammarIds: (o.g ?? []).map((c) => gid(c)),
      ...(o.page ? { page: o.page } : {}),
      ...(o.verify ? { verify: true } : {}),
    })
  }

  const para = (
    id: string,
    titleKoP: string,
    titleEn: string,
    kind: 'dialogue' | 'narration',
    source: Source,
    page: number | undefined,
    lines: [string | null, string, string][],
  ) => {
    paragraphs.push({
      id: `l${lessonNo}-p-${id}`,
      title: titleKoP,
      titleEn,
      kind,
      source,
      lesson: lessonNo,
      ...(page ? { page } : {}),
      lines: lines.map(([speaker, ko, en]) => ({ ...(speaker ? { speaker } : {}), ko, en })),
    })
  }

  const g = (
    code: string,
    titleG: string,
    pattern: string,
    category: Grammar['category'],
    explanation: string,
    examples: [string, string][],
    page?: number,
  ) => {
    grammar.push({
      id: `l${lessonNo}-g-${code}`,
      lesson: lessonNo,
      ...(/^\d/.test(code) ? { code: 'G' + code } : {}),
      title: titleG,
      pattern,
      category,
      explanation,
      examples: examples.map(([ko, en]) => ({ ko, en })),
      ...(page ? { page } : {}),
    })
  }

  const xid = () => `l${lessonNo}-x-${String(++xNo).padStart(3, '0')}`

  const blank = (
    gCode: string,
    focus: Focus,
    sentence: string,
    en: string,
    answers: string[],
    choices: string[],
    explanation: string,
    o: { source?: Source; verify?: boolean } = {},
  ) => {
    if (sentence.split('___').length !== 2) throw new Error(`blank needs exactly one ___: ${sentence}`)
    if (!choices.includes(answers[0])) throw new Error(`choices must include the answer: ${sentence} → ${answers[0]}`)
    const ex: BlankExercise = {
      id: xid(),
      grammarId: gid(gCode),
      lesson: lessonNo,
      focus,
      source: o.source ?? 'textbook',
      explanation,
      ...(o.verify ? { verify: true } : {}),
      type: 'blank',
      sentence,
      en,
      answers,
      choices,
    }
    exercises.push(ex)
  }

  const conj = (
    gCode: string,
    base: string,
    baseEn: string,
    target: string,
    answers: string[],
    choices: string[],
    explanation: string,
    o: { source?: Source; verify?: boolean; irregular?: string } = {},
  ) => {
    if (!choices.includes(answers[0])) throw new Error(`choices must include the answer: ${base} → ${answers[0]}`)
    const ex: ConjugateExercise = {
      id: xid(),
      grammarId: gid(gCode),
      lesson: lessonNo,
      focus: 'conjugation',
      source: o.source ?? 'textbook',
      explanation,
      ...(o.verify ? { verify: true } : {}),
      type: 'conjugate',
      base,
      baseEn,
      target,
      answers,
      choices,
      ...(o.irregular ? { irregular: o.irregular } : {}),
    }
    exercises.push(ex)
  }

  const write = () => {
    const lesson: Lesson = { lesson: lessonNo, title, titleKo, names, vocab, sentences, paragraphs, grammar, exercises, ...(opts.set2StartPage ? { set2StartPage: opts.set2StartPage } : {}) }
    writeFileSync(join(DIR, `lesson-${lessonNo}.json`), JSON.stringify(lesson, null, 2) + '\n')
    const tb = sentences.filter((x) => x.source === 'textbook').length
    console.log(
      `lesson-${lessonNo}.json: vocab ${vocab.length}, sentences ${sentences.length} (textbook ${tb}), paragraphs ${paragraphs.length}, grammar ${grammar.length}, exercises ${exercises.length}`,
    )
  }

  return { v, name, s, para, g, blank, conj, write, knownVocab, vidsFor, prior }
}
