// Content schema. Lesson files in ./lessons/lesson-N.json must satisfy `Lesson`.
// IDs are stable: never renumber or reuse them, because SRS state and stats key on them.

import type { Irregular } from '../lib/conjugate'

export type Source = 'textbook' | 'generated'

export type Pos =
  | 'noun'
  | 'pronoun'
  | 'number'
  | 'verb'
  | 'adjective'
  | 'copula'
  | 'counter'
  | 'particle'
  | 'adverb'
  | 'interjection'
  | 'determiner'
  | 'conjunction'
  | 'suffix'
  | 'expression'

export interface Vocab {
  id: string // e.g. "l1-v-학생"
  ko: string // headword exactly as printed in the book's NEW WORDS table
  en: string
  pos: Pos
  forms?: string[] // alternate / inflected forms the book prints in parentheses (and the polite form of verbs/adjectives)
  /** Irregular conjugation class, for verbs/adjectives the dictionary form alone doesn't reveal (그렇다 is ㅎ-irregular). */
  irregular?: Irregular
  note?: string
  page?: number
  source: Source
  /** true when the item came from a table/note rather than the NEW WORDS list */
  fromTable?: boolean
  /** Which of the lesson's two NEW WORDS lists it belongs to (1 or 2). Optional; imported lessons can set it directly. */
  set?: 1 | 2
}

export interface Sentence {
  id: string // "l1-s-001" (textbook) or "l1-gs-001" (generated)
  ko: string
  en: string
  source: Source
  lesson: number
  vocabIds: string[]
  grammarIds: string[]
  page?: number
  /** Claude filled in / adjusted this; please verify against the book. */
  verify?: boolean
}

export interface DialogueLine {
  speaker?: string
  ko: string
  en: string
}

export interface Paragraph {
  id: string // "l1-p-conv1"
  title: string
  titleEn: string
  kind: 'dialogue' | 'narration'
  lines: DialogueLine[]
  source: Source
  lesson: number
  page?: number
}

export interface GrammarExample {
  ko: string
  en: string
}

export interface Grammar {
  id: string // "l1-g-1.1"
  lesson: number
  code?: string // the book's own tag, e.g. "G1.1"
  title: string
  pattern: string
  category: 'particle' | 'ending' | 'copula' | 'question' | 'other'
  explanation: string // in the book's own terms
  examples: GrammarExample[]
  page?: number
}

export type Focus = 'particle' | 'ending' | 'question' | 'conjugation' | 'other'

interface ExerciseBase {
  id: string // "l1-x-001"
  grammarId: string
  lesson: number
  /** What kind of skill this drills; used by the "only particles / only endings" filter. */
  focus: Focus
  source: Source
  explanation: string
  /** answer was left blank in the book and filled in by Claude → please verify */
  verify?: boolean
}

export interface BlankExercise extends ExerciseBase {
  type: 'blank'
  /** Sentence with `___` marking the blank. */
  sentence: string
  en: string
  /** Every accepted answer (contracted + uncontracted forms, etc.). First one is canonical. */
  answers: string[]
  /** Options for multiple-choice mode. Must include every accepted answer's canonical form. */
  choices: string[]
}

export interface ConjugateExercise extends ExerciseBase {
  type: 'conjugate'
  base: string // dictionary form
  baseEn: string
  target: string // what is being asked, e.g. "polite (-아요/어요)"
  answers: string[]
  irregular?: string // e.g. "ㅎ irregular"
  choices: string[]
}

export type Exercise = BlankExercise | ConjugateExercise

export interface NameEntry {
  ko: string
  en: string
}

export interface Lesson {
  lesson: number
  title: string
  titleKo: string
  /** Proper names used in the lesson (not studied as vocab, but allowed in generated content). */
  names: NameEntry[]
  vocab: Vocab[]
  sentences: Sentence[]
  paragraphs: Paragraph[]
  grammar: Grammar[]
  exercises: Exercise[]
  /** Page where the second NEW WORDS list starts (words on earlier pages are Set 1). Optional. */
  set2StartPage?: number
  /** true for the bundled sample lesson (shown only when nothing else is imported) */
  sample?: boolean
}
