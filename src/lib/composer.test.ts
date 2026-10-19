import { describe, expect, it } from 'vitest'
import { HangulBuffer, jamoForKey } from './composer'

/** Type a string of QWERTY letters through the key map (as the keyboard would). */
function typeKeys(qwerty: string): string {
  const b = new HangulBuffer()
  for (const ch of qwerty) {
    const shift = ch !== ch.toLowerCase()
    const code = 'Key' + ch.toUpperCase()
    const j = jamoForKey(code, shift)
    b.push(j ?? ch)
  }
  return b.text()
}

describe('regular keyboard → Hangul', () => {
  it('maps keys to the standard 2-set layout', () => {
    expect(jamoForKey('KeyG', false)).toBe('ㅎ')
    expect(jamoForKey('KeyK', false)).toBe('ㅏ')
    expect(jamoForKey('KeyR', true)).toBe('ㄲ')
    expect(jamoForKey('KeyO', true)).toBe('ㅒ')
    expect(jamoForKey('KeyA', true)).toBe('ㅁ') // Shift does nothing on keys without a shifted jamo
    expect(jamoForKey('Digit1', false)).toBeNull()
  })
  it('types words', () => {
    expect(typeKeys('gks')).toBe('한')
    expect(typeKeys('gksrnr')).toBe('한국')
    expect(typeKeys('tkfka')).toBe('사람')
    expect(typeKeys('dl')).toBe('이')
    expect(typeKeys('rk')).toBe('가')
    expect(typeKeys('ghk')).toBe('화')
    expect(typeKeys('dhk')).toBe('와')
    expect(typeKeys('rhoss')).toBe('괜ㄴ') // ㅙ + ㄴ stays as final, second ㄴ starts a new block
    expect(typeKeys('rhosckdk')).toBe('괜차아') // ㅊ cannot join the final ㄴ, so it starts a new block
    expect(typeKeys('rhoswk')).toBe('괜자') // ㄴ moves to the next block when a vowel follows: 괜 + ㅈㅏ... (ㄴ stays; ㅈ+ㅏ = 자)
  })
  it('uses Shift for tense consonants', () => {
    expect(typeKeys('Rk')).toBe('까')
    expect(typeKeys('dlTe')).toBe('있ㄷ')
  })
  it('recomposes the trailing consonant onto the next block', () => {
    expect(typeKeys('gks')).toBe('한')
    expect(typeKeys('gksk')).toBe('하나')
    expect(typeKeys('dlfrk')).toBe('일가')
    expect(typeKeys('dlfr')).toBe('읽')
  })
  it('keeps digits, spaces and punctuation as they are', () => {
    expect(typeKeys('1gkr')).toBe('1학')
    const b = new HangulBuffer()
    for (const k of 'gks') b.push(k === 'g' ? 'ㅎ' : k === 'k' ? 'ㅏ' : 'ㄴ')
    b.push(' ')
    b.push('?')
    expect(b.text()).toBe('한 ?')
  })
})

describe('backspace removes one keystroke at a time', () => {
  it('walks 한 → 하 → ㅎ → empty', () => {
    const b = new HangulBuffer()
    for (const k of ['ㅎ', 'ㅏ', 'ㄴ']) b.push(k)
    expect(b.text()).toBe('한')
    b.pop()
    expect(b.text()).toBe('하')
    b.pop()
    expect(b.text()).toBe('ㅎ')
    b.pop()
    expect(b.text()).toBe('')
  })
  it('splits a compound final consonant back apart', () => {
    const b = new HangulBuffer()
    for (const k of 'ㅇㅣㄹㄱ') b.push(k)
    expect(b.text()).toBe('읽')
    b.pop()
    expect(b.text()).toBe('일')
  })
  it('undoes a regrouped consonant', () => {
    const b = new HangulBuffer()
    for (const k of 'ㅎㅏㄴㅏ') b.push(k)
    expect(b.text()).toBe('하나')
    b.pop()
    expect(b.text()).toBe('한')
  })
})
