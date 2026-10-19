import { describe, expect, it } from 'vitest'
import { addDays, studyDay } from './day'
import { bumpStreak, currentStreak, emptyStreak } from './streak'
import { formatScope, toggleLesson, upTo } from './scope'
import { pickVariant } from './audio'

describe('studyDay', () => {
  it('counts 1am as the previous study day', () => {
    expect(studyDay(new Date(2026, 9, 12, 1, 0))).toBe('2026-10-11')
    expect(studyDay(new Date(2026, 9, 12, 4, 0))).toBe('2026-10-12')
    expect(studyDay(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
  })
  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('streak', () => {
  it('starts, continues, and breaks', () => {
    let s = bumpStreak(emptyStreak, '2026-10-10')
    expect(s.count).toBe(1)
    s = bumpStreak(s, '2026-10-10')
    expect(s.count).toBe(1)
    s = bumpStreak(s, '2026-10-11')
    expect(s.count).toBe(2)
    expect(currentStreak(s, '2026-10-11')).toBe(2)
    expect(currentStreak(s, '2026-10-12')).toBe(2) // can still be saved today
    expect(currentStreak(s, '2026-10-13')).toBe(0)
    s = bumpStreak(s, '2026-10-20')
    expect(s.count).toBe(1)
    expect(s.best).toBe(2)
  })
})

describe('scope', () => {
  it('formats', () => {
    expect(formatScope([1])).toBe('Lesson 1')
    expect(formatScope([1, 2])).toBe('Lessons 1, 2')
    expect(formatScope([1, 2, 3])).toBe('Lessons 1–3')
    expect(formatScope([1, 3])).toBe('Lessons 1, 3')
    expect(formatScope([1, 2, 3, 5])).toBe('Lessons 1–3, 5')
  })
  it('up-to respects what is imported', () => {
    expect(upTo(3, [1, 2, 4])).toEqual([1, 2])
  })
  it('never empties the scope', () => {
    expect(toggleLesson([2], 2)).toEqual([2])
    expect(toggleLesson([1, 2], 1)).toEqual([2])
    expect(toggleLesson([2], 1)).toEqual([1, 2])
  })
})

describe('voice selection', () => {
  const f = { file: 'f.m4a', voice: 'Yuna', gender: 'female' as const }
  const m = { file: 'm.m4a', voice: 'Reed', gender: 'male' as const }
  it('random mode uses both voices, can repeat, but never plays one voice 3 times running', () => {
    const history: string[] = []
    let repeats = 0
    for (let i = 0; i < 400; i++) {
      const v = pickVariant([f, m], 'random', history, Math.random)
      const n = history.length
      if (n >= 1 && history[n - 1] === v.voice) repeats++
      if (n >= 2) expect(!(history[n - 1] === history[n - 2] && history[n - 2] === v.voice)).toBe(true)
      history.push(v.voice)
    }
    expect(new Set(history).size).toBe(2)
    expect(repeats).toBeGreaterThan(40) // not a strict alternation
  })
  it('honours female/male preference', () => {
    expect(pickVariant([f, m], 'male', [], () => 0.1)).toBe(m)
    expect(pickVariant([f, m], 'female', ['Yuna'], () => 0.1)).toBe(f)
  })
  it('a dialogue line has one voice regardless of preference', () => {
    expect(pickVariant([m], 'female')).toBe(m)
  })
  it('falls back when the preferred gender is missing', () => {
    expect(pickVariant([f, f], 'male', [], () => 0)).toBe(f)
  })
})
