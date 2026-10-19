// Spaced-repetition scheduler: SM-2 (the classic Anki algorithm) with learning steps.
//
// Pure functions only: no storage, no clock (callers pass `now`). To move to FSRS later, replace `schedule`,
// `previewLabels` and `isDue` and keep the SrsState shape.
import { startOfStudyDay } from '../day'
import type { SrsDeck, SrsState } from './types'

export type Grade = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy
export const GRADE_NAMES: Record<Grade, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }

export interface SrsConfig {
  learningSteps: number[] // minutes; new cards walk through these
  relearnSteps: number[] // minutes; lapsed cards walk through these
  graduatingInterval: number // days, after the last learning step
  easyInterval: number // days, when a new card is answered Easy
  startingEase: number
  minEase: number
  hardMultiplier: number
  easyBonus: number
  intervalModifier: number
  maxInterval: number // days
  lapseMultiplier: number // fraction of the old interval kept after a lapse (Anki default 0 → back to minimum)
  minLapseInterval: number // days
  learnAheadMinutes: number // show learning cards this early if nothing else is waiting
  matureDays: number
}

export const defaultConfig: SrsConfig = {
  learningSteps: [1, 10],
  relearnSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2.5,
  minEase: 1.3,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  intervalModifier: 1,
  maxInterval: 36500,
  lapseMultiplier: 0,
  minLapseInterval: 1,
  learnAheadMinutes: 20,
  matureDays: 21,
}

export const MIN = 60_000
export const DAY = 86_400_000

export function newState(id: string, deck: SrsDeck, cfg: SrsConfig = defaultConfig, now = Date.now()): SrsState {
  return { id, deck, phase: 'new', ease: cfg.startingEase, interval: 0, due: now, step: 0, lapses: 0, reps: 0, weak: false, lastReview: null, introduced: null }
}

const isLearning = (s: SrsState) => s.phase === 'new' || s.phase === 'learning' || s.phase === 'relearning'

/** Is this card ready to be shown? Learning cards by the minute; review cards by study day (due any time before 4am tomorrow). */
export function isDue(s: SrsState, now: number): boolean {
  if (s.phase === 'new') return false // new cards are introduced by the daily limit, not "due"
  return isLearning(s) ? s.due <= now : s.due < startOfStudyDay(now, 1)
}

const clampEase = (e: number, cfg: SrsConfig) => Math.max(cfg.minEase, Math.round(e * 100) / 100)
const capDays = (d: number, cfg: SrsConfig) => Math.min(cfg.maxInterval, Math.max(1, Math.round(d)))
const reviewDue = (now: number, days: number) => startOfStudyDay(now, days) // 4am, `days` study-days from today

/** Whole study days a review card is overdue (0 if on time). */
function daysLate(s: SrsState, now: number): number {
  const dueDay = startOfStudyDay(s.due, 0)
  const today = startOfStudyDay(now, 0)
  return Math.max(0, Math.round((today - dueDay) / DAY))
}

/** Delay in minutes before a learning card at `step` is shown again, for a given grade. */
function stepDelay(steps: number[], step: number, grade: 1 | 2 | 3): number {
  if (grade === 1) return steps[0]
  if (grade === 2) return step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[Math.min(step, steps.length - 1)]
  return steps[step + 1]
}

/** Answer a card. Returns the card's new state (the input is not modified). */
export function schedule(s: SrsState, grade: Grade, now: number, cfg: SrsConfig = defaultConfig): SrsState {
  const base: SrsState = {
    ...s,
    reps: s.reps + 1,
    lastReview: now,
    introduced: s.introduced ?? startOfStudyDayKey(now),
  }

  /* ── new / learning / relearning: walk through the steps ── */
  if (isLearning(s)) {
    const relearn = s.phase === 'relearning'
    const steps = relearn ? cfg.relearnSteps : cfg.learningSteps
    const step = s.phase === 'new' ? 0 : s.step
    const phase = relearn ? 'relearning' : 'learning'

    if (grade === 4) return graduate(base, relearn ? Math.max(s.interval, cfg.minLapseInterval) + 1 : cfg.easyInterval, now, cfg)
    if (grade === 3 && step + 1 >= steps.length) return graduate(base, relearn ? Math.max(s.interval, cfg.minLapseInterval) : cfg.graduatingInterval, now, cfg)

    const nextStep = grade === 3 ? step + 1 : grade === 1 ? 0 : step
    const delay = stepDelay(steps, step, grade as 1 | 2 | 3)
    return { ...base, phase, step: nextStep, due: now + delay * MIN, weak: grade === 1 ? true : grade === 3 ? false : s.weak }
  }

  /* ── review ── */
  if (grade === 1) {
    return {
      ...base,
      phase: 'relearning',
      step: 0,
      lapses: s.lapses + 1,
      ease: clampEase(s.ease - 0.2, cfg),
      interval: capDays(Math.max(cfg.minLapseInterval, s.interval * cfg.lapseMultiplier), cfg),
      due: now + cfg.relearnSteps[0] * MIN,
      weak: true,
    }
  }
  const late = daysLate(s, now)
  const mod = cfg.intervalModifier
  const hard = Math.max(s.interval + 1, Math.round((s.interval + late / 4) * cfg.hardMultiplier * mod))
  const good = Math.max(hard + 1, Math.round((s.interval + late / 2) * s.ease * mod))
  const easy = Math.max(good + 1, Math.round((s.interval + late) * s.ease * cfg.easyBonus * mod))
  const ivl = grade === 2 ? hard : grade === 3 ? good : easy
  const ease = grade === 2 ? s.ease - 0.15 : grade === 4 ? s.ease + 0.15 : s.ease
  const interval = capDays(ivl, cfg)
  return { ...base, phase: 'review', step: 0, ease: clampEase(ease, cfg), interval, due: reviewDue(now, interval), weak: grade >= 3 ? false : s.weak }
}

function graduate(s: SrsState, days: number, now: number, cfg: SrsConfig): SrsState {
  const interval = capDays(days, cfg)
  return { ...s, phase: 'review', step: 0, interval, due: reviewDue(now, interval), weak: false }
}

function startOfStudyDayKey(now: number): string {
  const d = new Date(startOfStudyDay(now, 0))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "10 min", "1 day", "4 days", "2.3 mo": the text shown on a grade button. */
export function formatInterval(ms: number): string {
  if (ms < MIN) return '<1 min'
  const min = ms / MIN
  if (min < 60) return `${Math.round(min)} min`
  const h = min / 60
  if (h < 24) return `${Math.round(h)} h`
  const d = ms / DAY
  if (d < 30) return `${Math.round(d)} ${Math.round(d) === 1 ? 'day' : 'days'}`
  if (d < 365) return `${(Math.round((d / 30) * 10) / 10).toString().replace(/\.0$/, '')} mo`
  return `${(Math.round((d / 365) * 10) / 10).toString().replace(/\.0$/, '')} yr`
}

/** What each button would schedule, for display on the buttons. */
export function previewLabels(s: SrsState, now: number, cfg: SrsConfig = defaultConfig): Record<Grade, string> {
  const out = {} as Record<Grade, string>
  for (const g of [1, 2, 3, 4] as Grade[]) {
    const n = schedule(s, g, now, cfg)
    out[g] = isLearning(n) ? formatInterval(n.due - now) : formatInterval(n.interval * DAY)
  }
  return out
}
