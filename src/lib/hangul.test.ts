import { describe, expect, it } from 'vitest'
import { flatten, hasBatchim, isAnswer, matchStatus, pickTarget, syllableCount } from './hangul'

describe('flatten', () => {
  it('breaks syllables into keystrokes', () => {
    expect(flatten('한')).toBe('ㅎㅏㄴ')
    expect(flatten('읽')).toBe('ㅇㅣㄹㄱ') // compound batchim ㄺ
    expect(flatten('와')).toBe('ㅇㅗㅏ') // compound vowel ㅘ
    expect(flatten('괜찮다')).toBe('ㄱㅗㅐㄴㅊㅏㄴㅎㄷㅏ')
    expect(flatten('있어요')).toBe('ㅇㅣㅆㅇㅓㅇㅛ')
  })
  it('treats compatibility jamo (mid-composition) like keystrokes', () => {
    expect(flatten('ㅎ')).toBe('ㅎ')
    expect(flatten('ㅘ')).toBe('ㅗㅏ')
    expect(flatten('읽ㄷ')).toBe('ㅇㅣㄹㄱㄷ')
  })
  it('treats conjoining jamo like compatibility jamo', () => {
    expect(flatten('한')).toBe('ㅎㅏㄴ')
  })
  it('passes through digits, spaces and punctuation', () => {
    expect(flatten('1학년 ?')).toBe('1ㅎㅏㄱㄴㅕㄴ ?')
  })
  it('counts syllables', () => {
    expect(syllableCount('한국 사람이에요.')).toBe(7)
  })
})

/** The text an IME exposes after each keystroke of a word. */
const sequences: Record<string, string[]> = {
  하나: ['ㅎ', '하', '한', '하나'], // the ㄴ moves to the next block
  읽다: ['ㅇ', '이', '일', '읽', '읽ㄷ', '읽다'], // compound batchim ㄺ
  와요: ['ㅇ', '오', '와', '와ㅇ', '와요'], // ㅗ then ㅏ merges into ㅘ
  학생: ['ㅎ', '하', '학', '학ㅅ', '학새', '학생'],
  '1학년': ['1', '1ㅎ', '1하', '1학', '1학ㄴ', '1학녀', '1학년'],
  괜찮아요: ['ㄱ', '고', '괘', '괜', '괜ㅊ', '괜차', '괜찬', '괜찮', '괜찮ㅇ', '괜찮아', '괜찮아ㅇ', '괜찮아요'], // ㄶ = ㄴ then ㅎ
}

describe('matchStatus during composition', () => {
  for (const [target, steps] of Object.entries(sequences)) {
    it(`never reports a false error while typing ${target}`, () => {
      steps.forEach((typed, i) => {
        const m = matchStatus(target, typed)
        expect(m.onTrack, `"${typed}" (step ${i}) should be on track`).toBe(true)
        expect(m.status).not.toContain('incorrect')
        expect(m.complete).toBe(i === steps.length - 1)
      })
    })
  }

  it('marks the block being composed as active, not incorrect', () => {
    const m = matchStatus('하나', '한')
    expect(m.status).toEqual(['correct', 'active']) // the pending ㄴ belongs to 나
    expect(m.cursor).toBe(1)
  })

  it('gives the caret the next block once the previous is finished', () => {
    expect(matchStatus('학생', '학').cursor).toBe(1)
    expect(matchStatus('학생', '').status).toEqual(['pending', 'pending'])
  })
})

describe('matchStatus errors', () => {
  it('flags a wrong keystroke at its block', () => {
    const m = matchStatus('학생', '하ㅈ')
    expect(m.onTrack).toBe(false)
    expect(m.status[0]).toBe('incorrect')
  })
  it('flags a wrong final consonant', () => {
    expect(matchStatus('하', '한').overflow).toBe(1)
    expect(matchStatus('하', '한').onTrack).toBe(false)
  })
  it('flags a wrong later block but keeps earlier blocks correct', () => {
    const m = matchStatus('학생', '학샌')
    expect(m.status).toEqual(['correct', 'incorrect'])
    expect(m.complete).toBe(false)
  })
  it('flags overflow past the end', () => {
    const m = matchStatus('사람', '사람이')
    expect(m.overflow).toBe(2)
    expect(m.complete).toBe(false)
  })
})

describe('answers', () => {
  it('picks the accepted answer being typed', () => {
    expect(pickTarget(['안녕하다', '안녕하세요'], '안녕하세')).toBe('안녕하세요')
    expect(pickTarget(['안녕하다', '안녕하세요'], '안녕하')).toBe('안녕하다')
    expect(pickTarget(['은/는', '은', '는'], 'ㄴ')).toBe('는')
    expect(pickTarget(['은/는', '은', '는'], '')).toBe('은/는')
  })
  it('flags a slip that real typing would not produce', () => {
    // typing 괜찬 then ㅏ gives 괜차나, which is NOT 괜찮아요
    expect(matchStatus('괜찮아요', '괜차나').onTrack).toBe(false)
  })
  it('accepts any listed form', () => {
    expect(isAnswer(['영', '공'], '공')).toBe(true)
    expect(isAnswer(['영', '공'], '일')).toBe(false)
  })
  it('detects batchim', () => {
    expect(hasBatchim('마이클')).toBe(true)
    expect(hasBatchim('소피아')).toBe(false)
    expect(hasBatchim('1학년')).toBe(true)
  })
})
