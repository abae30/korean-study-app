import { describe, expect, it } from 'vitest'
import { startOfStudyDay } from '../day'
import { MIN, defaultConfig, newState, schedule } from './scheduler'
import { introducedToday, queueView, type SrsItem } from './queue'
import { distribution, dueCounts, forecast, retention, reviewsPerDay } from './stats'
import type { SrsState } from './types'

const NOW = new Date(2026, 9, 12, 14, 0).getTime()
const items: SrsItem[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, deck: 'vocab' }))
const map = (...s: SrsState[]) => new Map(s.map((x) => [x.id, x]))
const rev = (id: string, interval: number, due: number, over: Partial<SrsState> = {}): SrsState => ({
  ...newState(id, 'vocab', defaultConfig, NOW), phase: 'review', interval, due, introduced: '2026-10-01', reps: 4, ...over,
})

describe('queueView', () => {
  it('introduces new cards up to the daily limit, in order', () => {
    const v = queueView(items, new Map(), NOW, 3)
    expect(v.counts).toEqual({ new: 3, learning: 0, review: 0 })
    expect(v.next).toEqual({ id: 'a', kind: 'new' })
  })
  it('counts cards introduced today against the limit', () => {
    const st = map({ ...schedule(newState('a', 'vocab', defaultConfig, NOW), 3, NOW) }, { ...schedule(newState('b', 'vocab', defaultConfig, NOW), 3, NOW) })
    expect(introducedToday(st, NOW)).toBe(2)
    expect(queueView(items, st, NOW, 3).newLeft).toBe(1)
    expect(queueView(items, st, NOW, 2).newLeft).toBe(0)
  })
  it('shows due reviews before new cards, most overdue first', () => {
    const st = map(rev('a', 5, startOfStudyDay(NOW, 0)), rev('b', 5, startOfStudyDay(NOW, -3)))
    expect(queueView(items, st, NOW, 5).next).toEqual({ id: 'b', kind: 'review' })
  })
  it('puts a flagged-weak review card first', () => {
    const st = map(rev('a', 5, startOfStudyDay(NOW, -3)), rev('b', 9, NOW, { weak: true }))
    expect(queueView(items, st, NOW, 5).next?.id).toBe('b')
  })
  it('puts flagged-weak new cards before ordinary new cards', () => {
    const st = map({ ...newState('d', 'vocab', defaultConfig, NOW), weak: true })
    expect(queueView(items, st, NOW, 2).next).toEqual({ id: 'd', kind: 'new' })
  })
  it('shows a learning card as soon as its wait is over, ahead of reviews', () => {
    const learning = schedule(newState('c', 'vocab', defaultConfig, NOW), 1, NOW) // due in 1 min
    const st = map(learning, rev('a', 5, NOW))
    expect(queueView(items, st, NOW, 5).next?.id).toBe('a')
    expect(queueView(items, st, NOW + 2 * MIN, 5).next).toEqual({ id: 'c', kind: 'learning' })
  })
  it('learns ahead when nothing else is waiting', () => {
    const st = map(schedule(newState('c', 'vocab', defaultConfig, NOW), 3, NOW)) // due in 10 min
    const v = queueView(items.slice(2, 3), st, NOW, 0)
    expect(v.next).toEqual({ id: 'c', kind: 'ahead' })
    expect(v.nextLearningAt).toBe(NOW + 10 * MIN)
  })
  it('is empty when everything is done', () => {
    const st = map(rev('a', 5, startOfStudyDay(NOW, 3)))
    expect(queueView(items.slice(0, 1), st, NOW, 5).next).toBeNull()
  })
  it('only considers the items in scope', () => {
    const st = map(rev('z', 5, NOW))
    expect(queueView(items, st, NOW, 0).counts.review).toBe(0)
  })
})

describe('stats', () => {
  const states = [
    newState('n', 'vocab', defaultConfig, NOW),
    schedule(newState('l', 'vocab', defaultConfig, NOW), 1, NOW),
    rev('y', 5, startOfStudyDay(NOW, 0)),
    rev('m', 40, startOfStudyDay(NOW, 1)),
    rev('o', 30, startOfStudyDay(NOW, -2)),
    rev('f', 60, startOfStudyDay(NOW, 5)),
  ]
  it('buckets cards', () => {
    expect(distribution(states)).toEqual({ new: 1, learning: 1, young: 1, mature: 3, total: 6 })
  })
  it('counts due today and tomorrow (overdue and learning count as today)', () => {
    expect(dueCounts(states, NOW)).toEqual({ today: 3, tomorrow: 1 })
  })
  it('forecasts per day', () => {
    const f = forecast(states, NOW, 7)
    expect(f[0]).toBe(3)
    expect(f[1]).toBe(1)
    expect(f[5]).toBe(1)
    expect(f.reduce((a, b) => a + b)).toBe(5)
  })
  const log = (at: number, grade: 1 | 2 | 3 | 4, intervalBefore: number) => ({ at, itemId: 'x', deck: 'vocab' as const, grade, intervalBefore, intervalAfter: 1 })
  it('counts reviews per day', () => {
    const r = reviewsPerDay([log(NOW, 3, 0), log(NOW, 3, 0), log(NOW - 24 * 3600_000, 3, 0)], NOW, 3)
    expect(r.map((x) => x.count)).toEqual([0, 1, 2])
  })
  it('measures retention on review answers only', () => {
    const entries = [log(NOW, 3, 5), log(NOW, 1, 5), log(NOW, 4, 8), log(NOW, 3, 6), log(NOW, 1, 0)]
    expect(retention(entries, NOW)).toEqual({ rate: 0.75, n: 4 })
    expect(retention([], NOW)).toEqual({ rate: null, n: 0 })
  })
})
