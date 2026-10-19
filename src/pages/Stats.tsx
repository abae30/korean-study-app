import { useEffect, useMemo, useState } from 'react'
import { BarChart } from '../components/BarChart'
import { Card, Row } from '../components/Card'
import { lessons, vocabById } from '../data'
import { db, type ReviewLogEntry } from '../lib/db'
import { addDays, studyDay } from '../lib/day'
import { distribution, dueCounts, forecast, retention, reviewsPerDay } from '../lib/srs/stats'
import { useApp } from '../store/app'

const short = (day: string) => {
  const [, m, d] = day.split('-')
  return `${Number(m)}/${Number(d)}`
}

export default function Stats() {
  const srs = useApp((s) => s.srs)
  const [log, setLog] = useState<ReviewLogEntry[]>([])
  useEffect(() => {
    void db().then((d) => d.getAll('reviewlog')).then(setLog)
  }, [])

  const now = Date.now()
  const totalVocab = useMemo(() => lessons.reduce((n, l) => n + l.vocab.length, 0), [])
  const dist = useMemo(() => {
    const d = distribution(srs)
    const started = d.total - d.new
    return { ...d, new: Math.max(0, totalVocab - started), total: Math.max(totalVocab, d.total) } // words never studied count as new
  }, [srs, totalVocab])
  const due = useMemo(() => dueCounts(srs, now), [srs, now])
  const fc = useMemo(() => forecast(srs, now, 30), [srs, now])
  const per = useMemo(() => reviewsPerDay(log, now, 30), [log, now])
  const ret = useMemo(() => retention(log, now, 30), [log, now])
  const today = studyDay(now)
  const trouble = useMemo(
    () => srs.filter((s) => s.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 8),
    [srs],
  )
  const totalReviews = log.length
  const bar = (n: number, color: string) => (
    <div className="h-3 overflow-hidden rounded-full bg-card2">
      <div className={`h-full ${color}`} style={{ width: `${dist.total ? (n / dist.total) * 100 : 0}%` }} />
    </div>
  )

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-6">
      <h1 className="text-3xl font-black tracking-tight">Stats</h1>
      <p className="text-muted">Spaced-repetition progress across every lesson you've studied.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ['Due today', due.today],
          ['Due tomorrow', due.tomorrow],
          ['Cards seen', dist.total - dist.new],
          ['Reviews done', totalReviews],
        ].map(([label, v]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
            <div className="mt-1 text-3xl font-black tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Forecast" right={<span className="pr-4 text-sm text-muted">next 30 days</span>}>
          <div className="px-4 pb-3">
            <BarChart data={fc.map((v, i) => ({ label: i === 0 ? 'today' : short(addDays(today, i)), value: v }))} unit="due" highlightFirst />
          </div>
        </Card>
        <Card title="Reviews" right={<span className="pr-4 text-sm text-muted">past 30 days</span>}>
          <div className="px-4 pb-3">
            <BarChart data={per.map((p) => ({ label: short(p.day), value: p.count }))} unit="answers" />
          </div>
        </Card>
        <Card title="Your cards">
          <Row>
            <div className="space-y-3">
              {(
                [
                  ['New', dist.new, 'bg-accent', 'not studied yet'],
                  ['Learning', dist.learning, 'bg-bad', 'in learning steps'],
                  ['Young', dist.young, 'bg-warn', 'interval under 21 days'],
                  ['Mature', dist.mature, 'bg-good', 'interval 21 days or more'],
                ] as const
              ).map(([label, n, color, hint]) => (
                <div key={label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-bold">
                      {label} <span className="font-normal text-muted">{hint}</span>
                    </span>
                    <span className="font-extrabold tabular-nums">{n}</span>
                  </div>
                  <div className="mt-1">{bar(n, color)}</div>
                </div>
              ))}
            </div>
          </Row>
        </Card>
        <div className="space-y-5">
          <Card title="Retention">
            <Row label="Correct on review cards (30 days)" value={ret.rate === null ? '–' : `${Math.round(ret.rate * 100)}%`} />
            <Row label="Review answers counted" value={ret.n} />
            <Row>
              <p className="text-xs text-muted">Share of answers on cards already past learning that were not "Again". Aim for around 85–90%.</p>
            </Row>
          </Card>
          <Card title="Trouble cards">
            {trouble.length === 0 ? (
              <Row>
                <p className="text-sm text-muted">Cards you forget will be listed here.</p>
              </Row>
            ) : (
              trouble.map((s) => {
                const v = vocabById.get(s.id)
                return v ? (
                  <Row key={s.id} label={<span><span className="ko">{v.ko}</span> <span className="text-sm font-normal text-muted">{v.en}</span></span>} value={<span className="text-bad">{s.lapses} lapse{s.lapses === 1 ? '' : 's'}</span>} />
                ) : null
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
