import { describe, expect, it } from 'vitest'
import { analyze, blocksOf, missedChars, tokenize } from './paragraph'

const tokens = tokenize('저는 한국 사람이에요.')

describe('analyze', () => {
  it('starts with everything pending', () => {
    const s = analyze(tokens, '')
    expect(s.current).toBe(0)
    expect(s.finished).toBe(false)
    expect(s.words.every((w) => !w.committed)).toBe(true)
  })

  it('lights up letters in the current word only', () => {
    const s = analyze(tokens, '저는 한')
    expect(s.current).toBe(1)
    expect(s.words[0].committed && s.words[0].correct).toBe(true)
    expect(s.words[1].m.lit[0]).toBe(3) // 한 fully typed in 한국
    expect(s.words[1].m.status[1]).toBe('pending')
    expect(s.words[2].m.status.every((x) => x === 'pending')).toBe(true)
  })

  it('a wrong word stays wrong and the next word starts clean (no cascade)', () => {
    const s = analyze(tokens, '저는 한궁 사람이에요.')
    expect(s.words[1]).toMatchObject({ committed: true, correct: false })
    expect(s.words[1].m.status).toEqual(['correct', 'incorrect'])
    expect(s.words[2].m.complete).toBe(true) // typed correctly despite the earlier slip
    expect(s.finished).toBe(true)
    expect(s.wrongWords).toEqual([['한국', '한궁']])
  })

  it('letters skipped in a committed word count as wrong', () => {
    const s = analyze(tokens, '저는 한 ')
    expect(s.words[1].committed).toBe(true)
    expect(s.words[1].m.status).toEqual(['correct', 'incorrect'])
  })

  it('finishes automatically when the last word is typed correctly', () => {
    expect(analyze(tokens, '저는 한국 사람이에요.').finished).toBe(true)
    expect(analyze(tokens, '저는 한국 사람이에요').finished).toBe(false)
  })

  it('finishes when you space past the end', () => {
    const s = analyze(tokens, '저는 한국 사랑이에요. ')
    expect(s.finished).toBe(true)
    expect(s.wrongWords.map((w) => w[0])).toEqual(['사람이에요.'])
  })

  it('counts correct blocks for WPM (spaces after correct words count, the last has none)', () => {
    const full = analyze(tokens, '저는 한국 사람이에요.')
    expect(full.correctBlocks).toBe(blocksOf('저는') + 1 + blocksOf('한국') + 1 + blocksOf('사람이에요.'))
    const oneWrong = analyze(tokens, '저는 한궁 사람이에요.')
    expect(oneWrong.correctBlocks).toBe(blocksOf('저는') + 1 + blocksOf('사람이에요.'))
  })

  it('counts jamo keystrokes in correct words for 타수', () => {
    expect(analyze(['한국'], '한국').correctKeys).toBe(6)
  })

  it('works mid-composition (the block being typed is active, not wrong)', () => {
    const s = analyze(tokens, '저는 하')
    expect(s.words[1].m.status).toEqual(['active', 'pending'])
    const s2 = analyze(tokens, '저는 한ㄱ')
    expect(s2.words[1].m.status[0]).toBe('correct')
    expect(s2.words[1].m.status[1]).toBe('active')
  })
})

describe('missedChars', () => {
  it('counts the syllables that were typed wrong', () => {
    const wrong: [string, string][] = [['한국', '한궁'], ['한국어', '한국머'], ['사람', '사랑']]
    const m = missedChars(wrong)
    expect(m.get('국')).toBe(1)
    expect(m.get('어')).toBe(1)
    expect(m.get('람')).toBe(1)
    expect(m.has('한')).toBe(false)
  })
  it('counts a syllable you skipped entirely', () => {
    expect(missedChars([['저는', '저']]).get('는')).toBe(1)
    expect(missedChars([['저는', '저']]).has('저')).toBe(false)
  })
})
