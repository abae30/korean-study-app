import { addDays } from './day'

export interface Streak {
  count: number
  best: number
  lastDay: string | null
}

export const emptyStreak: Streak = { count: 0, best: 0, lastDay: null }

/** Streak as it should be *displayed* on `today`: it only survives if you studied today or yesterday. */
export function currentStreak(s: Streak, today: string): number {
  if (!s.lastDay) return 0
  return s.lastDay === today || s.lastDay === addDays(today, -1) ? s.count : 0
}

/** Register that some study happened on `today`. */
export function bumpStreak(s: Streak, today: string): Streak {
  if (s.lastDay === today) return s
  const count = s.lastDay === addDays(today, -1) ? s.count + 1 : 1
  return { count, best: Math.max(s.best, count), lastDay: today }
}
