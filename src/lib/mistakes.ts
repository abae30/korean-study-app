import type { Vocab } from '../data/types'
import type { MatchResult } from './hangul'

/**
 * Which vocabulary word did the learner slip on? Finds the first wrong character, takes the space-separated word it
 * sits in, and returns the sentence's vocab entries whose letters cover that spot. So a slip in 사람 of 사람이에요 blames
 * 사람 but not the copula 이에요 that follows it. Particles and other one-letter entries only
 * match a whole word, so 이 inside 마이클 never blames the particle 이/가.
 */
export function vocabAtError(target: string, m: MatchResult, vocabIds: string[], byId: Map<string, Vocab>): string[] {
  const bad = m.status.findIndex((s) => s === 'incorrect')
  const at = bad >= 0 ? bad : m.overflow > 0 ? [...target].length - 1 : -1
  if (at < 0) return []
  let offset = 0
  let token = ''
  let ci = 0 // index of the wrong character inside its word
  for (const t of target.split(' ')) {
    const len = [...t].length
    if (at < offset + len) {
      token = t
      ci = at - offset
      break
    }
    offset += len + 1
  }
  if (!token) return []
  const chars = [...token]
  const hits: string[] = []
  for (const id of vocabIds) {
    const v = byId.get(id)
    if (!v) continue
    const keys = [v.ko, ...(v.forms ?? [])].flatMap((k) => k.split('/')).filter((k) => !k.includes('?'))
    const covers = keys.some((k) => {
      const kc = [...k]
      if (kc.length < 2) return token === k // particles and other one-letter entries must be a whole word
      for (let i = 0; i + kc.length <= chars.length; i++) {
        if (kc.every((c, j) => chars[i + j] === c) && ci >= i && ci < i + kc.length) return true
      }
      return false
    })
    if (covers) hits.push(id)
  }
  return hits
}
