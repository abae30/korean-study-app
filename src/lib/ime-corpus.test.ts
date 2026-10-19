import { describe, expect, it } from 'vitest'
import { lessons } from '../data'
import { flatten, isAnswer, matchStatus } from './hangul'
import { imeStates } from './composer'

/** Every Korean string a learner can be asked to type. */
function corpus(): string[] {
  const out = new Set<string>()
  for (const l of lessons) {
    for (const v of l.vocab) for (const t of [v.ko, ...(v.forms ?? [])]) out.add(t)
    for (const s of l.sentences) out.add(s.ko)
    for (const p of l.paragraphs) for (const ln of p.lines) out.add(ln.ko)
    for (const x of l.exercises) {
      for (const a of x.answers) out.add(a)
      if (x.type === 'blank') out.add(x.sentence.replace('___', x.answers[0]))
    }
  }
  return [...out]
}

describe('IME simulator', () => {
  it('rebuilds known words exactly', () => {
    const last = (s: string) => imeStates(flatten(s)).at(-1)
    expect(last('한국 사람이에요.')).toBe('한국 사람이에요.')
    expect(last('괜찮아요')).toBe('괜찮아요')
    expect(last('읽어요')).toBe('읽어요')
    expect(last('있어요')).toBe('있어요')
    expect(last('와요')).toBe('와요')
  })
  it('regroups the trailing consonant like a real IME', () => {
    expect(imeStates(flatten('하나'))).toEqual(['ㅎ', '하', '한', '하나'])
    expect(imeStates(flatten('읽다'))).toEqual(['ㅇ', '이', '일', '읽', '읽ㄷ', '읽다'])
  })
})

describe('every learnable string types without false errors', () => {
  const all = corpus()
  it('has a meaningful corpus', () => expect(all.length).toBeGreaterThan(30)) // the bundled sample lesson alone has ~40 strings

  it('reproduces the target exactly and stays on track at every keystroke', () => {
    const problems: string[] = []
    for (const target of all) {
      const states = imeStates(flatten(target))
      if (states.at(-1) !== target.normalize('NFC')) problems.push(`sim mismatch: ${target} → ${states.at(-1)}`)
      states.forEach((typed, i) => {
        const m = matchStatus(target, typed)
        const last = i === states.length - 1
        if (!m.onTrack || m.status.includes('incorrect')) problems.push(`false error: "${target}" after "${typed}"`)
        if (m.complete !== last) problems.push(`completion wrong: "${target}" after "${typed}"`)
      })
      if (!isAnswer([target], states.at(-1)!)) problems.push(`not accepted: ${target}`)
    }
    expect(problems).toEqual([])
  })
})
