import type { Sentence, Vocab } from '../data/types'

export interface FlashCard {
  id: string
  kind: 'vocab' | 'sentence'
  ko: string
  en: string
  pos?: string
  note?: string
  forms?: string[]
  /** Which side faces up first. */
  front: 'ko' | 'en'
}

export type Direction = 'ko-en' | 'en-ko' | 'random'

export function shuffle<T>(a: T[], rand = Math.random): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export interface DeckOptions {
  vocab: Vocab[]
  sentences: Sentence[]
  includeSentences: boolean
  starredOnly: boolean
  stars: string[]
  direction: Direction
  shuffle: boolean
  rand?: () => number
}

/** Build a flashcard deck from the selected content. */
export function buildDeck(o: DeckOptions): FlashCard[] {
  const rand = o.rand ?? Math.random
  const cards: FlashCard[] = o.vocab.map((v) => ({ id: v.id, kind: 'vocab', ko: v.ko, en: v.en, pos: v.pos, note: v.note, forms: v.forms, front: 'ko' }))
  if (o.includeSentences) for (const s of o.sentences) cards.push({ id: s.id, kind: 'sentence', ko: s.ko, en: s.en, front: 'ko' })
  let deck = o.starredOnly ? cards.filter((c) => o.stars.includes(c.id)) : cards
  if (o.shuffle) deck = shuffle(deck, rand)
  return deck.map((c) => ({ ...c, front: o.direction === 'random' ? (rand() < 0.5 ? 'ko' : 'en') : o.direction === 'en-ko' ? 'en' : 'ko' }))
}
