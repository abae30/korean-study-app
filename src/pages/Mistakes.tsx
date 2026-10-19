import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { db, type MistakeEntry } from '../lib/db'
import { useApp } from '../store/app'

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function Mistakes() {
  const [rows, setRows] = useState<MistakeEntry[] | null>(null)
  const weakCount = useApp((s) => s.srs.filter((x) => x.weak).length)

  const load = async () => setRows((await (await db()).getAll('mistakes')).sort((a, b) => b.at - a.at))
  useEffect(() => {
    void load()
  }, [])

  const top = useMemo(() => {
    const by = new Map<string, { entry: MistakeEntry; count: number }>()
    for (const r of rows ?? []) {
      const cur = by.get(r.itemId)
      by.set(r.itemId, { entry: cur?.entry ?? r, count: (cur?.count ?? 0) + 1 })
    }
    return [...by.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  }, [rows])

  async function clearAll() {
    if (!window.confirm('Delete the whole mistake log? (Weak-word flags are kept.)')) return
    await (await db()).clear('mistakes')
    await load()
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Mistake log</h1>
          <p className="text-muted">Everything you've missed, across typing and grammar modes.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/type/vocab?weak=1"
            className={`inline-flex items-center rounded-lg bg-accent px-4 py-2 font-extrabold text-accentink ${weakCount ? '' : 'pointer-events-none opacity-40'}`}
          >
            Practice {weakCount} weak word{weakCount === 1 ? '' : 's'}
          </Link>
          <Button onClick={clearAll} disabled={!rows?.length}>
            Clear log
          </Button>
        </div>
      </div>

      {rows === null ? null : rows.length === 0 ? (
        <Card>
          <p className="p-6 text-muted">Nothing here yet. Misses from typing sessions will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card title="Most missed">
            {top.map(({ entry, count }) => (
              <div key={entry.itemId} className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-2.5">
                <div>
                  <span className="ko text-xl">{entry.expected}</span> <span className="text-muted">{entry.prompt}</span>
                </div>
                <span className="font-extrabold tabular-nums text-bad">×{count}</span>
              </div>
            ))}
          </Card>
          <Card title="Recent">
            {rows.slice(0, 100).map((r) => (
              <div key={r.id} className="grid grid-cols-[8.5rem_1fr_auto] items-baseline gap-4 border-t border-line px-4 py-2 text-[0.95rem]">
                <span className="text-sm text-muted">{when(r.at)}</span>
                <div>
                  <span className="ko text-lg text-good">{r.expected}</span>
                  <span className="mx-2 text-muted">←</span>
                  <span className="ko text-lg text-bad">{r.typed || '(skipped)'}</span>
                </div>
                <span className="rounded-md border border-line px-1.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-muted">{r.mode}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
