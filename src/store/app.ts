import { create } from 'zustand'
import type { VoiceMode } from '../lib/audio'
import { allSrs, db, kvGet, kvSet, requestPersistence, type GrammarStat } from '../lib/db'
import type { SrsState } from '../lib/srs/types'
import { studyDay } from '../lib/day'
import { bumpStreak, emptyStreak, type Streak } from '../lib/streak'
import { toggleLesson as toggle, upTo } from '../lib/scope'
import { availableLessons } from '../data'

export type ThemeId = 'blue' | 'orange' | 'pink' | 'lime'
export interface Settings {
  theme: ThemeId
  sound: boolean
  autoplay: boolean
  voiceMode: VoiceMode
  newPerDay: number
  dailyGoal: number
  flipDirection: 'ko-en' | 'en-ko' | 'random'
  shuffle: boolean
  typingMode: 'copy' | 'recall'
  builtinKeyboard: boolean
  flashSentences: boolean
  sessionSize: number // 0 = every word
  /** Vocab modes use only the NEW WORDS lists, not words that came from tables and notes. */
  newWordsOnly: boolean
}
const defaultSettings: Settings = {
  theme: 'blue',
  sound: true,
  autoplay: true,
  voiceMode: 'random',
  newPerDay: 10,
  dailyGoal: 30,
  flipDirection: 'ko-en',
  shuffle: true,
  typingMode: 'copy',
  builtinKeyboard: true,
  flashSentences: false,
  sessionSize: 20,
  newWordsOnly: false,
}

interface AppState {
  ready: boolean
  settings: Settings
  scope: number[]
  stars: string[]
  streak: Streak
  activity: Record<string, number> // study day → items practised
  lastBackup: number | null
  srs: SrsState[]
  grammarStats: GrammarStat[]

  init: () => Promise<void>
  reloadAll: () => Promise<void>
  setSettings: (patch: Partial<Settings>) => void
  setScope: (lessons: number[]) => void
  toggleLesson: (lesson: number) => void
  setUpTo: (n: number) => void
  toggleStar: (id: string) => void
  /** Stars (or unstars) many items at once. */
  setStars: (ids: string[], on: boolean) => void
  recordActivity: (n?: number) => void
  setLastBackup: (t: number) => void
  refreshSrs: () => Promise<void>
  recordGrammar: (grammarId: string, correct: boolean) => void
  upsertSrs: (s: SrsState) => void
  removeSrs: (id: string) => void
  /** Takes words off the weakest-words list (all of them when no ids are given). */
  clearWeak: (ids?: string[]) => Promise<void>
  /** Resets the accuracy record of the given grammar points (they leave the weakest-grammar list). */
  clearGrammar: (ids: string[]) => Promise<void>
}

const applyTheme = (t: ThemeId) => document.documentElement.setAttribute('data-theme', t)

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  scope: availableLessons.slice(0, 1),
  stars: [],
  streak: emptyStreak,
  activity: {},
  lastBackup: null,
  srs: [],
  grammarStats: [],

  async init() {
    await get().reloadAll()
    void requestPersistence()
  },

  async reloadAll() {
    const [settings, scope, stars, streak, activity, lastBackup, srs, grammarStats] = await Promise.all([
      kvGet<Settings>('settings'),
      kvGet<number[]>('scope'),
      kvGet<string[]>('stars'),
      kvGet<Streak>('streak'),
      kvGet<Record<string, number>>('activity'),
      kvGet<number>('lastBackup'),
      allSrs(),
      db().then((d) => d.getAll('grammarstats')),
    ])
    const merged = { ...defaultSettings, ...(settings ?? {}) }
    // Drop scope entries for lessons that are not imported (e.g. after restoring a newer backup).
    const validScope = (scope ?? []).filter((l) => availableLessons.includes(l))
    applyTheme(merged.theme)
    set({
      ready: true,
      settings: merged,
      scope: validScope.length ? validScope : availableLessons.slice(0, 1),
      stars: stars ?? [],
      streak: streak ?? emptyStreak,
      activity: activity ?? {},
      lastBackup: lastBackup ?? null,
      srs,
      grammarStats,
    })
  },

  setSettings(patch) {
    const settings = { ...get().settings, ...patch }
    if (patch.theme) applyTheme(patch.theme)
    set({ settings })
    void kvSet('settings', settings)
  },
  setScope(lessons) {
    set({ scope: lessons })
    void kvSet('scope', lessons)
  },
  toggleLesson(lesson) {
    get().setScope(toggle(get().scope, lesson))
  },
  setUpTo(n) {
    const s = upTo(n, availableLessons)
    if (s.length) get().setScope(s)
  },
  toggleStar(id) {
    const cur = get().stars
    const stars = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    set({ stars })
    void kvSet('stars', stars)
  },
  setStars(ids, on) {
    const cur = get().stars
    const want = new Set(ids)
    const stars = on ? [...cur, ...ids.filter((id) => !cur.includes(id))] : cur.filter((id) => !want.has(id))
    set({ stars })
    void kvSet('stars', stars)
  },
  recordActivity(n = 1) {
    const today = studyDay()
    const activity = { ...get().activity, [today]: (get().activity[today] ?? 0) + n }
    const streak = bumpStreak(get().streak, today)
    set({ activity, streak })
    void kvSet('activity', activity)
    void kvSet('streak', streak)
  },
  setLastBackup(t) {
    set({ lastBackup: t })
    void kvSet('lastBackup', t)
  },
  async refreshSrs() {
    set({ srs: await allSrs() })
  },
  recordGrammar(grammarId, correct) {
    const cur = get().grammarStats.find((g) => g.id === grammarId) ?? { id: grammarId, seen: 0, correct: 0 }
    const next = { id: grammarId, seen: cur.seen + 1, correct: cur.correct + (correct ? 1 : 0) }
    set((st) => ({ grammarStats: st.grammarStats.some((g) => g.id === grammarId) ? st.grammarStats.map((g) => (g.id === grammarId ? next : g)) : [...st.grammarStats, next] }))
    void db().then((d) => d.put('grammarstats', next))
  },
  upsertSrs(s) {
    set((st) => ({ srs: st.srs.some((x) => x.id === s.id) ? st.srs.map((x) => (x.id === s.id ? s : x)) : [...st.srs, s] }))
  },
  async clearGrammar(ids) {
    const gone = new Set(ids)
    const d = await db()
    const tx = d.transaction('grammarstats', 'readwrite')
    for (const id of gone) tx.store.delete(id)
    await tx.done
    set((st) => ({ grammarStats: st.grammarStats.filter((g) => !gone.has(g.id)) }))
  },
  async clearWeak(ids) {
    const want = ids ? new Set(ids) : null
    const hit = get().srs.filter((x) => (x.weak || x.lapses > 0) && (!want || want.has(x.id)))
    if (!hit.length) return
    const cleared = hit.map((x) => ({ ...x, weak: false, lapses: 0 }))
    const d = await db()
    const tx = d.transaction('srs', 'readwrite')
    for (const c of cleared) tx.store.put(c)
    await tx.done
    const byId = new Map(cleared.map((c) => [c.id, c]))
    set((st) => ({ srs: st.srs.map((x) => byId.get(x.id) ?? x) }))
  },
  removeSrs(id) {
    set((st) => ({ srs: st.srs.filter((x) => x.id !== id) }))
  },
}))
