import { kvGet } from '../lib/db'
import type { Exercise, Grammar, Lesson, Paragraph, Sentence, Vocab } from './types'

/**
 * Where lessons come from:
 *  - `./lessons/lesson-N.json`  your own lessons, bundled at build time (this folder is git-ignored: nothing from a book is published)
 *  - IndexedDB `userLessons`    lessons you import in the app (Import page); they replace a bundled lesson with the same number
 *  - `./sample/*.json`          a small made-up sample lesson, shown only while nothing else exists
 */
const bundled = import.meta.glob<Lesson>('./lessons/lesson-*.json', { eager: true, import: 'default' })
const samples = import.meta.glob<Lesson>('./sample/*.json', { eager: true, import: 'default' })

let userLessons: Lesson[] = []

export let lessons: Lesson[] = []
export let availableLessons: number[] = []
export const vocabById = new Map<string, Vocab>()
export const grammarById = new Map<string, Grammar>()

function rebuild() {
  const own = new Map<number, Lesson>()
  for (const l of Object.values(bundled)) own.set(l.lesson, l)
  for (const l of userLessons) own.set(l.lesson, l)
  const list = own.size ? [...own.values()] : Object.values(samples)
  lessons = list.sort((a, b) => a.lesson - b.lesson)
  availableLessons = lessons.map((l) => l.lesson)
  vocabById.clear()
  grammarById.clear()
  for (const l of lessons) {
    for (const v of l.vocab) vocabById.set(v.id, v)
    for (const g of l.grammar) grammarById.set(g.id, g)
  }
}
rebuild()

/** Loads the lessons imported in the app. Call once before the UI renders (src/main.tsx). */
export async function initContent() {
  try {
    userLessons = (await kvGet<Lesson[]>('userLessons')) ?? []
  } catch {
    userLessons = []
  }
  rebuild()
}
export const importedLessons = () => userLessons
/** True for a lesson that came from `./lessons/` (not imported in the app, not the sample): only those have hand-written practice generators. */
export const isBundled = (n: number) => Object.values(bundled).some((l) => l.lesson === n) && !userLessons.some((l) => l.lesson === n)
export const isSampleOnly = () => lessons.length > 0 && lessons.every((l) => l.sample)

const inScope = (scope: number[]) => lessons.filter((l) => scope.includes(l.lesson))

export const vocabIn = (scope: number[]): Vocab[] => inScope(scope).flatMap((l) => l.vocab)
/** Vocabulary to study: with `newWordsOnly`, only the book's NEW WORDS lists (not words that came from tables, notes or exercises). */
export function studyVocab(scope: number[], newWordsOnly: boolean): Vocab[] {
  const all = vocabIn(scope).filter((v) => !newWordsOnly || !v.fromTable)
  // A word printed in a NEW WORDS list in one lesson and in a table in another is studied once, as the NEW WORDS entry.
  const listed = new Set(all.filter((v) => !v.fromTable).map((v) => v.ko))
  const seen = new Set<string>()
  return all.filter((v) => {
    if (v.fromTable && listed.has(v.ko)) return false
    const key = `${v.ko}|${v.en.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export const sentencesIn = (scope: number[]): Sentence[] => inScope(scope).flatMap((l) => l.sentences)
export const paragraphsIn = (scope: number[]): Paragraph[] => inScope(scope).flatMap((l) => l.paragraphs)
export const grammarIn = (scope: number[]): Grammar[] => inScope(scope).flatMap((l) => l.grammar)
export const exercisesIn = (scope: number[]): Exercise[] => inScope(scope).flatMap((l) => l.exercises)


/**
 * Each lesson's NEW WORDS can come in two lists. A lesson gives `set2StartPage` (words on earlier pages are Set 1), or each word
 * gives its own `set`. Words from tables and notes (`fromTable`) belong to neither set.
 */
const setStart = (lesson: number) => lessons.find((l) => l.lesson === lesson)?.set2StartPage
/** True when the lesson's words are split into two sets. */
export const hasSets = (lesson: number) => setStart(lesson) !== undefined || (lessons.find((l) => l.lesson === lesson)?.vocab.some((v) => v.set) ?? false)
export function vocabSet(v: Vocab): 1 | 2 | null {
  if (v.fromTable) return null
  if (v.set) return v.set
  const lesson = Number(/^l(\d+)-/.exec(v.id)?.[1])
  const start = setStart(lesson)
  return start !== undefined && (v.page ?? 0) >= start ? 2 : 1
}
