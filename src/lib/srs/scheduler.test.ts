import { describe, expect, it } from 'vitest'
import { startOfStudyDay } from '../day'
import { DAY, MIN, defaultConfig, formatInterval, isDue, newState, previewLabels, schedule } from './scheduler'
import type { SrsState } from './types'

const NOW = new Date(2026, 9, 12, 14, 0).getTime() // Mon 12 Oct 2026, 2pm
const tomorrow4am = startOfStudyDay(NOW, 1)
const card = (over: Partial<SrsState> = {}): SrsState => ({ ...newState('c', 'vocab', defaultConfig, NOW), ...over })
const review = (interval: number, over: Partial<SrsState> = {}) =>
  card({ phase: 'review', interval, ease: 2.5, reps: 5, due: startOfStudyDay(NOW, 0), introduced: '2026-10-01', ...over })

describe('new cards and learning steps', () => {
  it('Again on a new card → step 0, 1 minute', () => {
    const s = schedule(card(), 1, NOW)
    expect(s).toMatchObject({ phase: 'learning', step: 0, due: NOW + MIN })
  })
  it('Good walks to the 10 minute step, then graduates to 1 day', () => {
    const a = schedule(card(), 3, NOW)
    expect(a).toMatchObject({ phase: 'learning', step: 1, due: NOW + 10 * MIN })
    const b = schedule(a, 3, NOW + 10 * MIN)
    expect(b).toMatchObject({ phase: 'review', interval: 1, ease: 2.5 })
    expect(b.due).toBe(startOfStudyDay(NOW + 10 * MIN, 1))
  })
  it('Easy graduates immediately with the easy interval (4 days)', () => {
    const s = schedule(card(), 4, NOW)
    expect(s).toMatchObject({ phase: 'review', interval: 4 })
    expect(s.due).toBe(startOfStudyDay(NOW, 4))
  })
  it('Hard on the first step waits the average of the first two steps', () => {
    expect(schedule(card(), 2, NOW).due).toBe(NOW + 5.5 * MIN)
  })
  it('Again on a later step goes back to the first step', () => {
    const a = schedule(card(), 3, NOW)
    expect(schedule(a, 1, NOW + 10 * MIN)).toMatchObject({ phase: 'learning', step: 0 })
  })
  it('records the study day a card was first answered, once', () => {
    const a = schedule(card(), 3, NOW)
    expect(a.introduced).toBe('2026-10-12')
    expect(schedule(a, 3, NOW + 2 * DAY).introduced).toBe('2026-10-12')
  })
})

describe('review cards (SM-2)', () => {
  it('Hard / Good / Easy grow the interval and move the ease', () => {
    const c = review(10)
    expect(schedule(c, 2, NOW)).toMatchObject({ interval: 12, ease: 2.35 })
    expect(schedule(c, 3, NOW)).toMatchObject({ interval: 25, ease: 2.5 })
    expect(schedule(c, 4, NOW)).toMatchObject({ interval: 33, ease: 2.65 })
  })
  it('always orders Hard < Good < Easy, even for tiny intervals', () => {
    const c = review(1)
    const [h, g, e] = [2, 3, 4].map((x) => schedule(c, x as 2 | 3 | 4, NOW).interval)
    expect(h).toBeLessThan(g)
    expect(g).toBeLessThan(e)
  })
  it('Again is a lapse: relearning, ease −0.2, interval resets, flagged weak', () => {
    const s = schedule(review(10, { lapses: 1 }), 1, NOW)
    expect(s).toMatchObject({ phase: 'relearning', step: 0, lapses: 2, ease: 2.3, interval: 1, weak: true, due: NOW + 10 * MIN })
  })
  it('ease never drops below 1.3', () => {
    let s = review(10, { ease: 1.4 })
    for (let i = 0; i < 4; i++) s = schedule({ ...s, phase: 'review' }, 1, NOW)
    expect(s.ease).toBe(1.3)
  })
  it('relearning Good returns to review at the lapse interval, due tomorrow', () => {
    const lapsed = schedule(review(10), 1, NOW)
    const back = schedule(lapsed, 3, NOW + 10 * MIN)
    expect(back).toMatchObject({ phase: 'review', interval: 1, weak: false })
    expect(back.due).toBe(startOfStudyDay(NOW + 10 * MIN, 1))
  })
  it('gives credit for being overdue', () => {
    const late = review(10, { due: startOfStudyDay(NOW, -4) })
    expect(schedule(late, 3, NOW).interval).toBe(30) // (10 + 4/2) × 2.5
  })
  it('caps the interval', () => {
    const cfg = { ...defaultConfig, maxInterval: 30 }
    expect(schedule(review(25), 4, NOW, cfg).interval).toBe(30)
  })
  it('Good/Easy clear the weak flag, Again sets it, Hard keeps it', () => {
    expect(schedule(review(5, { weak: true }), 3, NOW).weak).toBe(false)
    expect(schedule(review(5, { weak: true }), 4, NOW).weak).toBe(false)
    expect(schedule(review(5, { weak: true }), 2, NOW).weak).toBe(true)
    expect(schedule(review(5), 1, NOW).weak).toBe(true)
  })
  it('does not mutate its input', () => {
    const c = review(10)
    const copy = { ...c }
    schedule(c, 3, NOW)
    expect(c).toEqual(copy)
  })
})

describe('isDue', () => {
  it('review cards are due any time before 4am tomorrow', () => {
    expect(isDue(review(3, { due: tomorrow4am - 1 }), NOW)).toBe(true)
    expect(isDue(review(3, { due: tomorrow4am }), NOW)).toBe(false)
  })
  it('learning cards are due by the minute', () => {
    expect(isDue(card({ phase: 'learning', due: NOW - 1 }), NOW)).toBe(true)
    expect(isDue(card({ phase: 'learning', due: NOW + MIN }), NOW)).toBe(false)
  })
  it('new cards are never "due"', () => expect(isDue(card(), NOW)).toBe(false))
  it('a weak mistake pulls a far-off card to now', () => {
    expect(isDue(review(30, { due: startOfStudyDay(NOW, 30) }), NOW)).toBe(false)
    expect(isDue(review(30, { due: NOW }), NOW)).toBe(true)
  })
})

describe('button labels', () => {
  it('new card', () => {
    expect(previewLabels(card(), NOW)).toEqual({ 1: '1 min', 2: '6 min', 3: '10 min', 4: '4 days' })
  })
  it('review card', () => {
    expect(previewLabels(review(10), NOW)).toEqual({ 1: '10 min', 2: '12 days', 3: '25 days', 4: '1.1 mo' })
  })
  it('formats intervals', () => {
    expect(formatInterval(30_000)).toBe('<1 min')
    expect(formatInterval(10 * MIN)).toBe('10 min')
    expect(formatInterval(3 * 60 * MIN)).toBe('3 h')
    expect(formatInterval(DAY)).toBe('1 day')
    expect(formatInterval(4 * DAY)).toBe('4 days')
    expect(formatInterval(69 * DAY)).toBe('2.3 mo')
    expect(formatInterval(400 * DAY)).toBe('1.1 yr')
  })
})
