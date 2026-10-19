import { db, putSrs } from '../db'
import { newState, schedule, type Grade } from './scheduler'
import type { SrsDeck, SrsState } from './types'

/** Grade a card and persist the new state plus a review-log entry. Returns what the caller needs to update the UI and to undo. */
export async function answerSrs(
  prev: SrsState | undefined,
  id: string,
  deck: SrsDeck,
  grade: Grade,
  now = Date.now(),
): Promise<{ next: SrsState; logId: number }> {
  const next = schedule(prev ?? newState(id, deck, undefined, now), grade, now)
  await putSrs(next)
  const logId = (await (await db()).add('reviewlog', {
    at: now,
    itemId: id,
    deck,
    grade,
    intervalBefore: prev?.interval ?? 0,
    intervalAfter: next.phase === 'review' ? next.interval : 0,
  })) as number
  return { next, logId }
}
