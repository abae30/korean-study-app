import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { hasSets, lessons, vocabSet } from '../data'
import { formatScope } from '../lib/scope'
import { Icon } from '../components/Icon'
import { useApp } from '../store/app'

const TABS = ['Vocabulary', 'Sentences', 'Paragraphs', 'Grammar', 'Exercises'] as const
type Tab = (typeof TABS)[number]

function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warn' | 'accent' }) {
  const c = tone === 'warn' ? 'text-warn border-warn/40' : tone === 'accent' ? 'text-accent border-accent/40' : 'text-muted border-line'
  return <span className={`rounded-md border px-1.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide ${c}`}>{children}</span>
}

function StarButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${on ? 'Unstar' : 'Star'} ${label}`}
      title={on ? 'Starred (click to remove)' : 'Star this'}
      className={`grid size-8 place-items-center rounded-lg transition-colors ${on ? 'text-warn' : 'text-muted/50 hover:text-warn'}`}
    >
      <Icon name="star" size={18} className={on ? '[&_path]:fill-current' : ''} />
    </button>
  )
}

export default function Library() {
  const scope = useApp((s) => s.scope)
  const stars = useApp((s) => s.stars)
  const toggleStar = useApp((s) => s.toggleStar)
  const setStars = useApp((s) => s.setStars)
  const [setShow, setSetShow] = useState<'all' | '1' | '2'>('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const isStar = (id: string) => stars.includes(id)
  const [tab, setTab] = useState<Tab>('Vocabulary')
  const [source, setSource] = useState<'all' | 'textbook' | 'generated'>('all')
  const [verifyOnly, setVerifyOnly] = useState(false)

  const [vocabShow, setVocabShow] = useState<'all' | 'new' | 'table'>('all')

  // One group per selected lesson, in lesson order, so each lesson gets its own heading.
  const groups = lessons
    .filter((l) => scope.includes(l.lesson))
    .map((l) => ({
      l,
      vocab: l.vocab.filter((v) => (vocabShow === 'all' || (vocabShow === 'table') === !!v.fromTable) && (!starredOnly || isStar(v.id)) && (setShow === 'all' || String(vocabSet(v)) === setShow)),
      sentences: l.sentences.filter((x) => (source === 'all' || x.source === source) && (!verifyOnly || x.verify) && (!starredOnly || isStar(x.id))),
      paragraphs: l.paragraphs.filter((p) => source === 'all' || p.source === source),
      grammar: l.grammar,
      exercises: l.exercises.filter((x) => (source === 'all' || x.source === source) && (!verifyOnly || x.verify)),
    }))
  const sum = (f: (g: (typeof groups)[number]) => number) => groups.reduce((n, g) => n + f(g), 0)
  const counts: Record<Tab, number> = {
    Vocabulary: sum((g) => g.vocab.length),
    Sentences: sum((g) => g.sentences.length),
    Paragraphs: sum((g) => g.paragraphs.length),
    Grammar: sum((g) => g.grammar.length),
    Exercises: sum((g) => g.exercises.length),
  }
  // Quick links to each lesson that has something on the current tab (the bar stays at the top while scrolling).
  const visible = groups.filter((g) => (tab === 'Vocabulary' ? g.vocab : tab === 'Sentences' ? g.sentences : tab === 'Paragraphs' ? g.paragraphs : tab === 'Grammar' ? g.grammar : g.exercises).length > 0)
  const JumpBar = () =>
    visible.length < 2 ? null : (
      <div className="sticky top-0 z-20 -mx-2 mb-2 flex flex-wrap items-center gap-2 bg-bg px-2 py-2.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Jump to</span>
        {visible.map((g) => (
          <button
            key={g.l.lesson}
            onClick={() => document.getElementById(`lesson-${g.l.lesson}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="h-8 rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold text-muted hover:border-accent hover:text-accent"
          >
            Lesson {g.l.lesson}
          </button>
        ))}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="ml-auto h-8 rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold text-muted hover:text-ink"
        >
          ↑ Top
        </button>
      </div>
    )
  const Heading = ({ l, n }: { l: (typeof groups)[number]['l']; n: number }) => (
    <h2 className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-accent/50 pb-3">
      <span className="text-4xl font-black tracking-tight">Lesson {l.lesson}</span>
      <span className="text-xl font-bold text-muted">
        {l.title} <span className="ko">· {l.titleKo}</span>
      </span>
      <span className="ml-auto rounded-full border border-line bg-card2 px-3 py-0.5 text-sm font-extrabold text-muted">{n} items</span>
    </h2>
  )


  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Lesson library</h1>
          <p className="text-muted">{formatScope(scope)} · everything the app was built from, for checking against your book.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to="/import" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-card2 px-3 font-extrabold hover:border-muted">
            + Import lessons
          </Link>
          {(tab === 'Vocabulary' || tab === 'Sentences') && (
            <label className="flex cursor-pointer items-center gap-2 font-bold">
              <input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} className="accent-[var(--accent)]" />
              Starred only ({stars.length})
            </label>
          )}
          {tab === 'Vocabulary' && (
            <select value={setShow} onChange={(e) => setSetShow(e.target.value as typeof setShow)} className="h-9 rounded-lg border border-line bg-card2 px-2 font-bold">
              <option value="all">Both sets</option>
              <option value="1">Set 1 only</option>
              <option value="2">Set 2 only</option>
            </select>
          )}
          {tab === 'Vocabulary' && (
            <select value={vocabShow} onChange={(e) => setVocabShow(e.target.value as typeof vocabShow)} className="h-9 rounded-lg border border-line bg-card2 px-2 font-bold">
              <option value="all">All words</option>
              <option value="new">New words only</option>
              <option value="table">From tables and notes only</option>
            </select>
          )}
          {(tab === 'Sentences' || tab === 'Paragraphs' || tab === 'Exercises') && (
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="h-9 rounded-lg border border-line bg-card2 px-2 font-bold"
            >
              <option value="all">All sources</option>
              <option value="textbook">Textbook</option>
              <option value="generated">Generated</option>
            </select>
          )}
          {(tab === 'Sentences' || tab === 'Exercises') && (
            <label className="flex cursor-pointer items-center gap-2 font-bold">
              <input type="checkbox" checked={verifyOnly} onChange={(e) => setVerifyOnly(e.target.checked)} className="accent-[var(--accent)]" />
              Only items to verify
            </label>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 font-extrabold ${tab === t ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t} <span className="text-xs font-bold text-muted">{counts[t]}</span>
          </button>
        ))}
      </div>

      <JumpBar />

      {tab === 'Vocabulary' &&
        groups.map(
          (g) =>
            g.vocab.length > 0 && (
              <section key={g.l.lesson} id={`lesson-${g.l.lesson}`} className="mt-20 scroll-mt-16 first-of-type:mt-4">
                <Heading l={g.l} n={g.vocab.length} />
                {hasSets(g.l.lesson) && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Star a whole set</span>
                    {([1, 2] as const).map((n) => {
                      const ids = g.l.vocab.filter((v) => vocabSet(v) === n).map((v) => v.id)
                      const all = ids.length > 0 && ids.every(isStar)
                      return (
                        <button
                          key={n}
                          onClick={() => setStars(ids, !all)}
                          className={`h-8 rounded-lg border px-3 text-sm font-extrabold ${all ? 'border-warn text-warn' : 'border-line bg-card2 text-muted hover:border-warn hover:text-warn'}`}
                        >
                          {all ? '★' : '☆'} Set {n} ({ids.length}){all ? ' · starred, click to remove' : ''}
                        </button>
                      )
                    })}
                  </div>
                )}
                <Card>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-muted">
                        <th className="w-10 pl-3 py-2"></th>
                        <th className="px-2 py-2">Korean</th>
                        <th className="py-2">Other forms</th>
                        <th className="py-2">English</th>
                        <th className="py-2">Set</th>
                        <th className="py-2">Type</th>
                        <th className="px-4 py-2 text-right">Page</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.vocab.map((v) => (
                        <tr key={v.id} className="border-t border-line align-top">
                          <td className="pl-3 py-1.5">
                            <StarButton on={isStar(v.id)} onClick={() => toggleStar(v.id)} label={v.ko} />
                          </td>
                          <td className="ko px-2 py-2 text-lg">{v.ko}</td>
                          <td className="ko py-2 text-muted">{v.forms?.join(', ')}</td>
                          <td className="py-2">
                            {v.en}
                            {v.note && <div className="text-xs text-muted">{v.note}</div>}
                          </td>
                          <td className="py-2">{hasSets(g.l.lesson) && vocabSet(v) !== null && <Badge tone={vocabSet(v) === 1 ? 'accent' : 'muted'}>Set {vocabSet(v)}</Badge>}</td>
                          <td className="py-2">
                            <span className="text-sm text-muted">{v.pos}</span> {v.fromTable && <Badge tone="accent">table</Badge>}
                          </td>
                          <td className="px-4 py-2 text-right text-sm tabular-nums text-muted">{v.page}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            ),
        )}

      {tab === 'Sentences' &&
        groups.map(
          (g) =>
            g.sentences.length > 0 && (
              <section key={g.l.lesson} id={`lesson-${g.l.lesson}`} className="mt-20 scroll-mt-16 first-of-type:mt-4">
                <Heading l={g.l} n={g.sentences.length} />
                <Card>
                  {g.sentences.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-4 border-t border-line px-4 py-2.5 first:border-t-0">
                      <StarButton on={isStar(s.id)} onClick={() => toggleStar(s.id)} label={s.ko} />
                      <div className="mr-auto">
                        <div className="ko text-lg">{s.ko}</div>
                        <div className="text-sm text-muted">{s.en}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {s.verify && <Badge tone="warn">verify</Badge>}
                        <Badge tone={s.source === 'textbook' ? 'accent' : 'muted'}>{s.source}</Badge>
                        {s.page && <span className="w-9 text-right text-xs tabular-nums text-muted">p.{s.page}</span>}
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            ),
        )}

      {tab === 'Paragraphs' &&
        groups.map(
          (g) =>
            g.paragraphs.length > 0 && (
              <section key={g.l.lesson} id={`lesson-${g.l.lesson}`} className="mt-20 scroll-mt-16 first-of-type:mt-4">
                <Heading l={g.l} n={g.paragraphs.length} />
                <div className="space-y-4">
                  {g.paragraphs.map((p) => (
                    <Card key={p.id} title={p.title} right={<Badge tone={p.source === 'textbook' ? 'accent' : 'muted'}>{p.source}</Badge>}>
                      <div className="px-4 pb-1 text-sm text-muted">
                        {p.titleEn} · {p.kind}
                        {p.page ? ` · p.${p.page}` : ''}
                      </div>
                      {p.lines.map((ln, i) => (
                        <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-line px-4 py-2 first:mt-2">
                          <span className="ko text-sm text-muted">{ln.speaker}</span>
                          <div>
                            <div className="ko text-lg">{ln.ko}</div>
                            <div className="text-sm text-muted">{ln.en}</div>
                          </div>
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
              </section>
            ),
        )}

      {tab === 'Grammar' &&
        groups.map(
          (g) =>
            g.grammar.length > 0 && (
              <section key={g.l.lesson} id={`lesson-${g.l.lesson}`} className="mt-20 scroll-mt-16 first-of-type:mt-4">
                <Heading l={g.l} n={g.grammar.length} />
                <div className="space-y-4">
                  {g.grammar.map((gr) => (
                    <Card key={gr.id} title={`${gr.code ? gr.code + ' · ' : ''}${gr.title}`} right={<Badge>{gr.category}</Badge>}>
                      <div className="ko px-4 pb-2 text-lg text-accent">{gr.pattern}</div>
                      <p className="border-t border-line px-4 py-3 text-[0.95rem] leading-relaxed">{gr.explanation}</p>
                      {gr.examples.map((e, i) => (
                        <div key={i} className="border-t border-line px-4 py-2">
                          <div className="ko text-lg">{e.ko}</div>
                          <div className="text-sm text-muted">{e.en}</div>
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
              </section>
            ),
        )}

      {tab === 'Exercises' &&
        groups.map(
          (g) =>
            g.exercises.length > 0 && (
              <section key={g.l.lesson} id={`lesson-${g.l.lesson}`} className="mt-20 scroll-mt-16 first-of-type:mt-4">
                <Heading l={g.l} n={g.exercises.length} />
                <Card>
                  {g.exercises.map((x) => (
                    <div key={x.id} className="flex items-start justify-between gap-4 border-t border-line px-4 py-2.5 first:border-t-0">
                      <div>
                        {x.type === 'blank' ? (
                          <div className="ko text-lg">{x.sentence}</div>
                        ) : (
                          <div className="ko text-lg">
                            {x.base} <span className="text-muted">→ ?</span> <span className="text-sm font-normal text-muted">({x.target})</span>
                          </div>
                        )}
                        <div className="text-sm text-muted">{x.type === 'blank' ? x.en : x.baseEn}</div>
                        <div className="mt-0.5 text-sm">
                          <span className="text-muted">Answer: </span>
                          <span className="ko text-good">{x.answers.join(' / ')}</span>
                          {x.type === 'conjugate' && x.irregular && <span className="ml-2 text-warn">{x.irregular}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {x.verify && <Badge tone="warn">verify</Badge>}
                        <Badge>{x.focus}</Badge>
                        <Badge tone={x.source === 'textbook' ? 'accent' : 'muted'}>{x.source}</Badge>
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            ),
        )}
    </div>
  )
}
