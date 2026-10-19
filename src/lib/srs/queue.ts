import { studyDay } from '../day'
import { MIN, defaultConfig, isDue, type SrsConfig } from './scheduler'
import type { SrsDeck, SrsState } from './types'

export interface SrsItem {
  id: string
  deck: SrsDeck
}

export type PickKind = 'learning' | 'review' | 'new' | 'ahead'
export interface Pick {
  id: string
  kind: PickKind
}
export interface QueueView {
  /** How many new cards may still be introduced today. */
  newLeft: number
  counts: { new: number; learning: number; review: number }
  next: Pick | null
  /** When the next learning card comes due, if nothing can be shown right now. */
  nextLearningAt: number | null
}

const learningPhase = (s?: SrsState) => s?.phase === 'learning' || s?.phase === 'relearning'

/** Cards first answered today count against the daily new-card limit. */
export function introducedToday(states: Map<string, SrsState>, now: number): number {
  const today = studyDay(now)
  let n = 0
  for (const s of states.values()) if (s.introduced === today) n++
  return n
}

/**
 * Decide what to show next, Anki-style:
 *  1. a learning card whose wait is over
 *  2. a review card that is due (flagged-weak first, then most overdue)
 *  3. a new card (flagged-weak first), up to the daily limit
 *  4. otherwise a learning card due soon ("learn ahead"), so a short session doesn't stall
 */
export function queueView(items: SrsItem[], states: Map<string, SrsState>, now: number, newPerDay: number, cfg: SrsConfig = defaultConfig): QueueView {
  const newLeft = Math.max(0, newPerDay - introducedToday(states, now))
  const learnDue: { id: string; due: number }[] = []
  const learnSoon: { id: string; due: number }[] = []
  const reviews: { id: string; due: number; weak: boolean }[] = []
  const fresh: { id: string; weak: boolean }[] = []

  for (const it of items) {
    const s = states.get(it.id)
    if (!s || s.phase === 'new') fresh.push({ id: it.id, weak: !!s?.weak })
    else if (learningPhase(s)) {
      if (s.due <= now) learnDue.push({ id: it.id, due: s.due })
      else if (s.due <= now + cfg.learnAheadMinutes * MIN) learnSoon.push({ id: it.id, due: s.due })
    } else if (isDue(s, now)) reviews.push({ id: it.id, due: s.due, weak: s.weak })
  }
  learnDue.sort((a, b) => a.due - b.due)
  learnSoon.sort((a, b) => a.due - b.due)
  reviews.sort((a, b) => Number(b.weak) - Number(a.weak) || a.due - b.due)
  const newPool = [...fresh.filter((f) => f.weak), ...fresh.filter((f) => !f.weak)].slice(0, newLeft)

  let next: Pick | null = null
  if (learnDue.length) next = { id: learnDue[0].id, kind: 'learning' }
  else if (reviews.length) next = { id: reviews[0].id, kind: 'review' }
  else if (newPool.length) next = { id: newPool[0].id, kind: 'new' }
  else if (learnSoon.length) next = { id: learnSoon[0].id, kind: 'ahead' }

  let nextLearningAt: number | null = null
  for (const it of items) {
    const s = states.get(it.id)
    if (learningPhase(s) && s!.due > now && (nextLearningAt === null || s!.due < nextLearningAt)) nextLearningAt = s!.due
  }

  return {
    newLeft,
    counts: { new: newPool.length, learning: learnDue.length + learnSoon.length, review: reviews.length },
    next,
    nextLearningAt,
  }
}
