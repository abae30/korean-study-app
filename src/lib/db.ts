import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SrsState } from './srs/types'

export interface TypingResult {
  id?: number
  at: number
  mode: 'vocab' | 'sentence' | 'paragraph'
  itemId: string
  wpm: number
  accuracy: number
  errors: number
  seconds: number
  missed?: string[]
}
export interface MistakeEntry {
  id?: number
  at: number
  mode: string
  itemId: string
  prompt: string
  expected: string
  typed: string
}
export interface ReviewLogEntry {
  id?: number
  at: number
  itemId: string
  deck: 'vocab' | 'grammar'
  grade: 1 | 2 | 3 | 4
  intervalBefore: number
  intervalAfter: number
}
export interface GrammarStat {
  id: string // grammar point id
  seen: number
  correct: number
}

interface Schema extends DBSchema {
  kv: { key: string; value: unknown }
  srs: { key: string; value: SrsState; indexes: { due: number; deck: string } }
  typing: { key: number; value: TypingResult }
  mistakes: { key: number; value: MistakeEntry }
  reviewlog: { key: number; value: ReviewLogEntry }
  grammarstats: { key: string; value: GrammarStat }
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null
export function db() {
  dbp ??= openDB<Schema>('korean-study', 1, {
    upgrade(d) {
      d.createObjectStore('kv')
      const srs = d.createObjectStore('srs', { keyPath: 'id' })
      srs.createIndex('due', 'due')
      srs.createIndex('deck', 'deck')
      d.createObjectStore('typing', { keyPath: 'id', autoIncrement: true })
      d.createObjectStore('mistakes', { keyPath: 'id', autoIncrement: true })
      d.createObjectStore('reviewlog', { keyPath: 'id', autoIncrement: true })
      d.createObjectStore('grammarstats', { keyPath: 'id' })
    },
  })
  return dbp
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined
}
export async function kvSet(key: string, value: unknown) {
  await (await db()).put('kv', value, key)
}
export async function allSrs(): Promise<SrsState[]> {
  return (await db()).getAll('srs')
}
export async function putSrs(s: SrsState) {
  await (await db()).put('srs', s)
}

/** Best effort: ask the browser not to evict our data under storage pressure. */
export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* ignore */
  }
}
