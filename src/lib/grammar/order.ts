import type { Exercise } from '../../data/types'
import type { GrammarStat } from '../db'
import { shuffle } from '../deck'

export function accuracyOf(stats: GrammarStat[], grammarId: string): number | null {
  const s = stats.find((x) => x.id === grammarId)
  return s && s.seen >= 3 ? s.correct / s.seen : null
}

/**
 * Order a pool for a session: shuffled, then dealt out round-robin across grammar points so one pattern doesn't dominate,
 * with the weakest points (under 70% accuracy) dealt two at a time so they come up more.
 */
export function orderPool(pool: Exercise[], stats: GrammarStat[], rand: () => number = Math.random): Exercise[] {
  const groups = new Map<string, Exercise[]>()
  for (const e of shuffle(pool, rand)) groups.set(e.grammarId, [...(groups.get(e.grammarId) ?? []), e])
  const order = [...groups.entries()].sort((a, b) => (accuracyOf(stats, a[0]) ?? 0.6) - (accuracyOf(stats, b[0]) ?? 0.6))
  const out: Exercise[] = []
  while (out.length < pool.length) {
    for (const [id, list] of order) {
      const acc = accuracyOf(stats, id)
      const take = acc !== null && acc < 0.7 ? 2 : 1
      out.push(...list.splice(0, take))
    }
  }
  return out
}
