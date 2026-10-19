import { describe, expect, it } from 'vitest'
import { buildDeck, shuffle } from './deck'

const vocab = ['a', 'b', 'c', 'd'].map((k) => ({ id: `v-${k}`, ko: k, en: k.toUpperCase(), pos: 'noun' as const, source: 'textbook' as const }))
const sentences = [{ id: 's-1', ko: '문장', en: 'sentence', source: 'textbook' as const, lesson: 1, vocabIds: [], grammarIds: [] }]
const base = { vocab, sentences, includeSentences: false, starredOnly: false, stars: [], direction: 'ko-en' as const, shuffle: false }

describe('buildDeck', () => {
  it('builds vocab cards in order with Korean first', () => {
    const d = buildDeck(base)
    expect(d.map((c) => c.id)).toEqual(['v-a', 'v-b', 'v-c', 'v-d'])
    expect(d.every((c) => c.front === 'ko')).toBe(true)
  })
  it('can show English first', () => {
    expect(buildDeck({ ...base, direction: 'en-ko' }).every((c) => c.front === 'en')).toBe(true)
  })
  it('random direction mixes sides', () => {
    const sides = new Set(buildDeck({ ...base, vocab: Array.from({ length: 40 }, (_, i) => ({ ...vocab[0], id: `x${i}` })), direction: 'random' }).map((c) => c.front))
    expect(sides.size).toBe(2)
  })
  it('adds sentences on request', () => {
    expect(buildDeck({ ...base, includeSentences: true }).at(-1)?.kind).toBe('sentence')
  })
  it('filters to starred cards', () => {
    expect(buildDeck({ ...base, starredOnly: true, stars: ['v-b', 'v-d'] }).map((c) => c.id)).toEqual(['v-b', 'v-d'])
    expect(buildDeck({ ...base, starredOnly: true, stars: [] })).toEqual([])
  })
  it('shuffle keeps every card exactly once', () => {
    const d = buildDeck({ ...base, shuffle: true })
    expect(d.map((c) => c.id).sort()).toEqual(['v-a', 'v-b', 'v-c', 'v-d'])
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
})
