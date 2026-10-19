import { describe, expect, it } from 'vitest'
import type { Vocab } from '../data/types'
import { matchStatus } from './hangul'
import { accuracy, countKeystrokes, emptyKeyStats, wpm } from './keystrokes'
import { vocabAtError } from './mistakes'

describe('keystroke accuracy', () => {
  it('counts added letters and flags the ones that leave you off track', () => {
    let s = emptyKeyStats
    s = countKeystrokes('', 'ㅎ', true, s) // ㅎ ok
    s = countKeystrokes('ㅎ', '하', true, s) // ㅏ ok
    s = countKeystrokes('하', '핫', false, s) // wrong final consonant
    expect(s).toEqual({ keys: 3, wrong: 1 })
    expect(accuracy(s)).toBeCloseTo(2 / 3)
  })
  it('does not count Backspace, and a fixed letter counts fresh', () => {
    let s = { keys: 3, wrong: 1 }
    s = countKeystrokes('핫', '하', true, s)
    expect(s).toEqual({ keys: 3, wrong: 1 })
    s = countKeystrokes('하', '한', true, s)
    expect(s).toEqual({ keys: 4, wrong: 1 })
  })
  it('regrouping by the IME is not a new keystroke', () => {
    // 한 → 하나: only one letter (ㅏ) was added
    expect(countKeystrokes('한', '하나', true, emptyKeyStats)).toEqual({ keys: 1, wrong: 0 })
  })
  it('is 100% when nothing was typed', () => expect(accuracy(emptyKeyStats)).toBe(1))
})

describe('wpm', () => {
  it('is correct blocks ÷ 5 per minute', () => {
    expect(wpm(50, 60)).toBe(10)
    expect(wpm(25, 30)).toBe(10)
    expect(wpm(10, 0)).toBe(0)
  })
})

const v = (id: string, ko: string, forms?: string[]): Vocab => ({ id, ko, en: '', pos: 'noun', forms, source: 'textbook' })
const byId = new Map([v('student', '학생'), v('korean', '한국'), v('person', '사람'), v('copula', '이다', ['이에요', '예요']), v('particle', '이/가', ['이', '가']), v('topic', '은/는', ['은', '는'])].map((x) => [x.id, x]))

describe('vocabAtError', () => {
  const target = '마이클은 한국 사람이에요.'
  const ids = ['student', 'korean', 'person', 'copula', 'particle', 'topic']
  it('blames the word the slip is in', () => {
    const m = matchStatus(target, '마이클은 한궈')
    expect(vocabAtError(target, m, ids, byId)).toEqual(['korean'])
  })
  it('finds nothing when the text is on track', () => {
    expect(vocabAtError(target, matchStatus(target, '마이클은 한'), ids, byId)).toEqual([])
  })
  it('does not blame a particle for a letter inside another word', () => {
    const m = matchStatus(target, '마이큰')
    expect(vocabAtError(target, m, ids, byId)).toEqual([]) // 마이클은 contains 이 and 은 but they are not whole words
  })
  it('blames only the part of the word the slip is in', () => {
    // slip in 사람 → not the copula 이에요 that follows it in the same word
    expect(vocabAtError(target, matchStatus(target, '마이클은 한국 삽'), ids, byId)).toEqual(['person'])
    // slip in the ending → the copula, not 사람
    expect(vocabAtError(target, matchStatus(target, '마이클은 한국 사람이애'), ids, byId)).toEqual(['copula'])
  })
  it('blames a later word correctly', () => {
    const m = matchStatus(target, '마이클은 한국 사랑')
    expect(vocabAtError(target, m, ids, byId)).toEqual(['person'])
  })
})
