import { db } from './db'

const STORES = ['kv', 'srs', 'typing', 'mistakes', 'reviewlog', 'grammarstats'] as const
export const BACKUP_FORMAT = 'korean-study-backup'

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: 1
  exportedAt: string
  kv: Record<string, unknown>
  srs: unknown[]
  typing: unknown[]
  mistakes: unknown[]
  reviewlog: unknown[]
  grammarstats: unknown[]
}

export async function buildBackup(): Promise<BackupFile> {
  const d = await db()
  const kv: Record<string, unknown> = {}
  const keys = await d.getAllKeys('kv')
  for (const k of keys) kv[String(k)] = await d.get('kv', k)
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    kv,
    srs: await d.getAll('srs'),
    typing: await d.getAll('typing'),
    mistakes: await d.getAll('mistakes'),
    reviewlog: await d.getAll('reviewlog'),
    grammarstats: await d.getAll('grammarstats'),
  }
}

export function validateBackup(x: unknown): BackupFile {
  const b = x as Partial<BackupFile> | null
  if (!b || typeof b !== 'object' || b.format !== BACKUP_FORMAT) throw new Error('This is not a progress backup from this app.')
  if (b.version !== 1) throw new Error(`Unsupported backup version: ${String(b.version)}`)
  for (const k of ['srs', 'typing', 'mistakes', 'reviewlog', 'grammarstats'] as const)
    if (!Array.isArray(b[k])) throw new Error(`Backup is missing "${k}".`)
  if (!b.kv || typeof b.kv !== 'object') throw new Error('Backup is missing "kv".')
  return b as BackupFile
}

/** Replaces ALL local progress with the backup's contents, atomically. */
export async function restoreBackup(b: BackupFile) {
  const d = await db()
  const tx = d.transaction([...STORES], 'readwrite')
  await Promise.all(STORES.map((s) => tx.objectStore(s).clear()))
  for (const [k, v] of Object.entries(b.kv)) tx.objectStore('kv').put(v, k)
  for (const r of b.srs) tx.objectStore('srs').put(r as never)
  for (const r of b.typing) tx.objectStore('typing').put(r as never)
  for (const r of b.mistakes) tx.objectStore('mistakes').put(r as never)
  for (const r of b.reviewlog) tx.objectStore('reviewlog').put(r as never)
  for (const r of b.grammarstats) tx.objectStore('grammarstats').put(r as never)
  await tx.done
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Deletes all study progress (cards, typing history, mistakes, review log, grammar stats, stars, streak, activity). Settings and scope are kept. */
export async function resetProgress() {
  const d = await db()
  const tx = d.transaction([...STORES], 'readwrite')
  for (const s of STORES) if (s !== 'kv') tx.objectStore(s).clear()
  for (const k of ['stars', 'streak', 'activity', 'lastBackup']) tx.objectStore('kv').delete(k)
  await tx.done
}
