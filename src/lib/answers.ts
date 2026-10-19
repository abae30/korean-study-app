import type { Vocab } from '../data/types'

/**
 * What counts as the answer when typing a vocabulary word.
 *  - Copy mode: exactly the word on screen.
 *  - Recall mode: the headword or any other form the book lists (안녕하다 / 안녕하세요).
 *  - Entries written with a slash (은/는, 이/가) always need the whole thing, so typing just 이 never finishes 이/가.
 */
export function answersFor(v: Pick<Vocab, 'ko' | 'forms'>, recall: boolean): string[] {
  return recall && !v.ko.includes('/') ? [v.ko, ...(v.forms ?? [])] : [v.ko]
}
