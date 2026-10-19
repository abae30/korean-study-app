import { describe, expect, it } from 'vitest'
import glyphData from '../data/glyphs.json'
import { lessons } from '../data'
import { answersFor } from './answers'
import { flattenChar, isAnswer, matchStatus } from './hangul'

const GLYPHS = glyphData as unknown as Record<string, { a: number; k: string[] }>

function typedChars(): Set<string> {
  const out = new Set<string>()
  const add = (s?: string) => s && [...s].forEach((c) => out.add(c))
  for (const l of lessons) {
    for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].forEach(add)
    for (const s of l.sentences) add(s.ko)
    for (const p of l.paragraphs) p.lines.forEach((ln) => add(ln.ko))
    for (const x of l.exercises) {
      x.answers.forEach(add)
      if (x.type === 'blank') add(x.sentence.replace('___', x.answers[0]))
    }
  }
  return out
}

describe('glyph data (run `npm run build-glyphs` after importing a lesson)', () => {
  it('has an outline for every character that can be typed', () => {
    const missing = [...typedChars()].filter((c) => !GLYPHS[c])
    expect(missing).toEqual([])
  })
  it('has one shape per keystroke for every Hangul syllable', () => {
    const bad = [...typedChars()]
      .filter((c) => c >= '가' && c <= '힣')
      .filter((c) => (GLYPHS[c]?.k.length ?? 0) !== [...flattenChar(c)].length || GLYPHS[c].k.some((d) => !d))
    expect(bad).toEqual([])
  })
})

describe('what counts as a correct answer', () => {
  const particle = { ko: '이/가', forms: ['이', '가'] }
  const greet = { ko: '안녕하다', forms: ['안녕하세요'] }
  it('never finishes a slash entry on its first half', () => {
    for (const recall of [false, true]) {
      expect(isAnswer(answersFor(particle, recall), '이')).toBe(false)
      expect(isAnswer(answersFor(particle, recall), '이/가')).toBe(true)
    }
    // …and partway through, the display is still on track rather than complete
    expect(matchStatus('이/가', '이').complete).toBe(false)
  })
  it('copy mode wants the word shown; recall mode also takes other listed forms', () => {
    expect(isAnswer(answersFor(greet, false), '안녕하세요')).toBe(false)
    expect(isAnswer(answersFor(greet, true), '안녕하세요')).toBe(true)
    expect(isAnswer(answersFor(greet, false), '안녕하다')).toBe(true)
  })
})
