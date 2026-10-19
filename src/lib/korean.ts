import { finalJamo, hasBatchim } from './hangul'

/** Particle and ending choices that depend on whether the noun ends in a consonant (batchim). */
export const topicParticle = (noun: string) => (hasBatchim(noun) ? '은' : '는')
export const subjectParticle = (noun: string) => (hasBatchim(noun) ? '이' : '가')
export const copulaForm = (noun: string) => (hasBatchim(noun) ? '이에요' : '예요')

/** "마이클 ends in the consonant ㄹ (클), so use 은." / "소피아 ends in a vowel (아), so use 는." */
export function batchimReason(noun: string, ifConsonant: string, ifVowel: string): string {
  const last = [...noun.trim()].pop() ?? ''
  const j = finalJamo(noun)
  return j ? `${noun} ends in a consonant (${last} → ${j}), so use ${ifConsonant}.` : `${noun} ends in a vowel (${last}), so use ${ifVowel}.`
}
