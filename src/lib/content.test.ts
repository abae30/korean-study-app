import { describe, expect, it } from 'vitest'
import sample from '../data/sample/sample-lesson.json'
import type { Lesson } from '../data/types'
import { normalizeLesson, TEMPLATE } from './content'

describe('normalizeLesson', () => {
  it('accepts the downloadable template', () => {
    const r = normalizeLesson(TEMPLATE, 't.json')
    expect(r.errors).toEqual([])
    expect(r.lesson?.lesson).toBe(1)
    expect(r.lesson?.vocab).toHaveLength(3)
    expect(r.lesson?.sentences).toHaveLength(2) // one object, one "ko | en" shorthand
    expect(r.lesson?.exercises).toHaveLength(1)
  })

  it('fills in ids, sources, part of speech and the vocab a sentence uses', () => {
    const r = normalizeLesson({ lesson: 3, title: 'T', vocab: [{ ko: '학교', en: 'school' }, { ko: '가다', en: 'to go', forms: ['가요'] }], sentences: ['학교에 가요. | I go to school.'] })
    const l = r.lesson!
    expect(l.vocab[0]).toMatchObject({ id: 'l3-v-학교', pos: 'noun', source: 'textbook' })
    expect(l.sentences[0].id).toBe('l3-s-001')
    expect(l.sentences[0].vocabIds.sort()).toEqual(['l3-v-가다', 'l3-v-학교'])
  })

  it('keeps a word that appears twice (second meaning) with its own id', () => {
    const r = normalizeLesson({ lesson: 1, title: 'T', vocab: [{ ko: '일', en: 'one' }, { ko: '일', en: 'work' }] })
    expect(r.lesson!.vocab.map((v) => v.id)).toEqual(['l1-v-일', 'l1-v-일-2'])
  })

  it('reports clear errors', () => {
    expect(normalizeLesson('nope').errors[0]).toMatch(/JSON object/)
    expect(normalizeLesson({ lesson: 0, title: 'x', vocab: [{ ko: 'a', en: 'b' }] }).errors.join()).toMatch(/1 to 99/)
    expect(normalizeLesson({ lesson: 1 }).errors.join()).toMatch(/title/)
    expect(normalizeLesson({ lesson: 1, title: 'x' }).errors.join()).toMatch(/no vocab/)
    expect(normalizeLesson({ lesson: 1, title: 'x', vocab: [{ ko: '학교' }] }).errors.join()).toMatch(/"ko" and "en"/)
    expect(normalizeLesson({ lesson: 1, title: 'x', sentences: [{ ko: '가' }] }).errors.join()).toMatch(/"ko" and "en"/)
  })

  it('checks exercises: one blank, and the choices must include the answer', () => {
    const base = { lesson: 1, title: 'x', vocab: [{ ko: '가', en: 'a' }] }
    expect(normalizeLesson({ ...base, exercises: [{ type: 'blank', sentence: '두 ___ 개 ___', answers: ['a'] }] }).errors.join()).toMatch(/exactly one ___/)
    expect(normalizeLesson({ ...base, exercises: [{ type: 'blank', sentence: '저___ 학생', answers: ['는'], choices: ['은'] }] }).errors.join()).toMatch(/must include the first answer/)
    const ok = normalizeLesson({ ...base, exercises: [{ type: 'blank', sentence: '저___ 학생', answers: ['는'], choices: ['은', '는'] }] })
    expect(ok.errors).toEqual([])
    expect(ok.lesson!.grammar).toHaveLength(1) // a placeholder grammar point so the exercise has somewhere to live
    expect(ok.lesson!.exercises[0].grammarId).toBe(ok.lesson!.grammar[0].id)
  })

  it('warns about (but accepts) an unknown part of speech', () => {
    const r = normalizeLesson({ lesson: 1, title: 'x', vocab: [{ ko: '가', en: 'a', pos: 'weird' }] })
    expect(r.errors).toEqual([])
    expect(r.warnings.join()).toMatch(/unknown "pos"/)
  })
})

describe('the bundled sample lesson', () => {
  const l = sample as unknown as Lesson
  it('is flagged as a sample and has content for every mode', () => {
    expect(l.sample).toBe(true)
    expect(l.vocab.length).toBeGreaterThan(10)
    expect(l.sentences.length).toBeGreaterThan(5)
    expect(l.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(l.grammar.length).toBeGreaterThanOrEqual(2)
    expect(l.exercises.length).toBeGreaterThanOrEqual(4)
    expect(l.vocab.some((v) => v.set === 1) && l.vocab.some((v) => v.set === 2) && l.vocab.some((v) => v.fromTable)).toBe(true)
  })
  it('has unique ids and exercises that point at real grammar points', () => {
    const ids = [...l.vocab, ...l.sentences, ...l.paragraphs, ...l.grammar, ...l.exercises].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    const g = new Set(l.grammar.map((x) => x.id))
    for (const x of l.exercises) {
      expect(g.has(x.grammarId)).toBe(true)
      expect(x.choices).toContain(x.answers[0])
    }
  })
})
