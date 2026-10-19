import { db } from '../db'
import type { SrsDeck, SrsState } from './types'

/**
 * A mistake in any mode flags the item as weak and makes it due now, so the next review session picks it up first.
 * (The SM-2 scheduler, added in step f, clears the flag when you answer Good/Easy.)
 */
export async function markWeak(id: string, deck: SrsDeck, now = Date.now()): Promise<SrsState> {
  const d = await db()
  const cur = await d.get('srs', id)
  const next: SrsState = cur
    ? { ...cur, weak: true, due: Math.min(cur.due, now) }
    : { id, deck, phase: 'new', ease: 2.5, interval: 0, due: now, step: 0, lapses: 0, reps: 0, weak: true, lastReview: null, introduced: null }
  await d.put('srs', next)
  return next
}

export async function logMistake(entry: { mode: string; itemId: string; prompt: string; expected: string; typed: string }) {
  await (await db()).add('mistakes', { ...entry, at: Date.now() })
}
