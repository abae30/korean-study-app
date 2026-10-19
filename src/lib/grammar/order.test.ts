import { describe, expect, it } from 'vitest'
import type { Exercise } from '../../data/types'
import { accuracyOf, orderPool } from './order'

const ex = (id: string, g: string): Exercise => ({
  id, grammarId: g, lesson: 1, focus: 'particle', source: 'generated', explanation: '', type: 'blank', sentence: '___', en: '', answers: ['a'], choices: ['a', 'b'],
})
const pool = [...['a1', 'a2', 'a3', 'a4'].map((i) => ex(i, 'A')), ...['b1', 'b2', 'b3', 'b4'].map((i) => ex(i, 'B'))]

describe('orderPool', () => {
  it('keeps every exercise exactly once', () => {
    expect(orderPool(pool, []).map((e) => e.id).sort()).toEqual(pool.map((e) => e.id).sort())
  })
  it('alternates grammar points', () => {
    const g = orderPool(pool, []).map((e) => e.grammarId)
    expect(g.slice(0, 4).filter((x) => x === 'A')).toHaveLength(2)
  })
  it('deals weak points two at a time and starts with them', () => {
    const stats = [{ id: 'B', seen: 10, correct: 3 }, { id: 'A', seen: 10, correct: 10 }]
    const g = orderPool(pool, stats).map((e) => e.grammarId)
    expect(g.slice(0, 3)).toEqual(['B', 'B', 'A'])
  })
  it('only trusts accuracy after a few attempts', () => {
    expect(accuracyOf([{ id: 'A', seen: 2, correct: 0 }], 'A')).toBeNull()
    expect(accuracyOf([{ id: 'A', seen: 4, correct: 3 }], 'A')).toBe(0.75)
  })
})
