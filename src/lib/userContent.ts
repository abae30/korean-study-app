import type { Lesson } from '../data/types'
import { kvGet, kvSet } from './db'

/** Lessons imported in the app are stored in this browser (IndexedDB `kv` → `userLessons`). They are part of the progress backup. */
export async function loadUserLessons(): Promise<Lesson[]> {
  return (await kvGet<Lesson[]>('userLessons')) ?? []
}

/** Adds or replaces (by lesson number) imported lessons. */
export async function saveUserLessons(add: Lesson[]) {
  const cur = await loadUserLessons()
  const byNo = new Map(cur.map((l) => [l.lesson, l]))
  for (const l of add) byNo.set(l.lesson, l)
  await kvSet('userLessons', [...byNo.values()].sort((a, b) => a.lesson - b.lesson))
}

export async function removeUserLesson(n: number) {
  await kvSet('userLessons', (await loadUserLessons()).filter((l) => l.lesson !== n))
}
