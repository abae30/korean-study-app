import { startOfStudyDay, studyDay, addDays } from '../day'
import type { ReviewLogEntry } from '../db'
import { DAY, defaultConfig, type SrsConfig } from './scheduler'
import type { SrsState } from './types'

export interface Distribution {
  new: number
  learning: number
  young: number
  mature: number
  total: number
}

/** New / learning / young (review, interval < 21 days) / mature (≥ 21 days). */
export function distribution(states: SrsState[], cfg: SrsConfig = defaultConfig): Distribution {
  const d: Distribution = { new: 0, learning: 0, young: 0, mature: 0, total: states.length }
  for (const s of states) {
    if (s.phase === 'new') d.new++
    else if (s.phase === 'learning' || s.phase === 'relearning') d.learning++
    else if (s.interval >= cfg.matureDays) d.mature++
    else d.young++
  }
  return d
}

/** Cards due today (learning cards that are due, plus reviews due before 4am tomorrow) and tomorrow. */
export function dueCounts(states: SrsState[], now: number): { today: number; tomorrow: number } {
  const f = forecast(states, now, 2)
  return { today: f[0], tomorrow: f[1] }
}

/**
 * Reviews coming due per study day, starting today. Overdue reviews and learning cards that are due count as today;
 * learning cards due later today count as today too.
 */
export function forecast(states: SrsState[], now: number, days = 30): number[] {
  const out = Array.from({ length: days }, () => 0)
  const today = startOfStudyDay(now, 0)
  for (const s of states) {
    if (s.phase === 'new') continue
    const offset = Math.max(0, Math.round((startOfStudyDay(s.due, 0) - today) / DAY))
    if (offset < days) out[offset]++
  }
  return out
}

/** Answers per study day for the last `days` days, oldest first. */
export function reviewsPerDay(log: ReviewLogEntry[], now: number, days = 30): { day: string; count: number }[] {
  const today = studyDay(now)
  const counts = new Map<string, number>()
  for (const e of log) counts.set(studyDay(e.at), (counts.get(studyDay(e.at)) ?? 0) + 1)
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1))
    return { day, count: counts.get(day) ?? 0 }
  })
}

/** True retention: share of *review* answers (cards already past learning) that were not "Again", over the last `days`. */
export function retention(log: ReviewLogEntry[], now: number, days = 30): { rate: number | null; n: number } {
  const since = startOfStudyDay(now, -(days - 1))
  const rev = log.filter((e) => e.at >= since && e.intervalBefore >= 1)
  if (!rev.length) return { rate: null, n: 0 }
  return { rate: rev.filter((e) => e.grade > 1).length / rev.length, n: rev.length }
}
