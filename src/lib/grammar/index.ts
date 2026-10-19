import { exercisesIn, isBundled, lessons } from '../../data'
import type { Exercise } from '../../data/types'
import { lesson1Exercises } from './lesson1'
import { lesson2Exercises } from './lesson2'
import { lesson3Exercises } from './lesson3'
import { lesson4Exercises } from './lesson4'
import { lesson5Exercises } from './lesson5'

/** Generators by the lesson whose grammar they practise. Add one per lesson when importing it. */
const generators: Record<number, () => Exercise[]> = {
  1: lesson1Exercises,
  2: lesson2Exercises,
  3: lesson3Exercises,
  4: lesson4Exercises,
  5: lesson5Exercises,
}

const cache = new Map<number, Exercise[]>()
export function generatedFor(lesson: number): Exercise[] {
  if (!cache.has(lesson)) cache.set(lesson, generators[lesson]?.() ?? [])
  return cache.get(lesson)!
}

/**
 * Every exercise available for the selected lessons: the book's own exercises plus the generated ones.
 * A generator belongs to the lesson that teaches its grammar and only uses vocabulary from that lesson and earlier ones.
 */
export function exercisePool(scope: number[]): Exercise[] {
  const seen = new Set<string>()
  const out: Exercise[] = []
  const add = (e: Exercise) => {
    if (!seen.has(e.id)) (seen.add(e.id), out.push(e))
  }
  exercisesIn(scope).forEach(add)
  for (const l of lessons) if (scope.includes(l.lesson) && isBundled(l.lesson)) generatedFor(l.lesson).forEach(add)
  return out
}
