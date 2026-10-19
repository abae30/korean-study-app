import { Link } from 'react-router-dom'
import { Bar, Card, Row } from '../components/Card'
import { Toggle } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ScopeSelector } from '../components/ScopeSelector'
import { ThemePicker } from '../components/ThemePicker'
import { BackupCard } from '../components/BackupCard'
import { isSampleOnly, exercisesIn, grammarById, grammarIn, paragraphsIn, sentencesIn, vocabById, studyVocab } from '../data'
import { studyDay } from '../lib/day'
import { formatScope } from '../lib/scope'
import { currentStreak } from '../lib/streak'
import { queueView } from '../lib/srs/queue'
import { useApp } from '../store/app'

export const MODES = [
  { to: '/flashcards', icon: 'cards', title: 'Flashcards', hint: 'Space to flip · ←/→ to sort', built: true },
  { to: '/review', icon: 'repeat', title: 'Spaced review', hint: '1–4 to grade', built: true },
  { to: '/type/vocab', icon: 'type', title: 'Vocabulary typing', hint: 'Hear it, type it', built: true },
  { to: '/type/sentences', icon: 'lines', title: 'Sentence typing', hint: 'Copy or dictation', built: true },
  { to: '/type/paragraphs', icon: 'para', title: 'Paragraph typing', hint: 'WPM · accuracy · history', built: true },
  { to: '/grammar', icon: 'grammar', title: 'Grammar & endings', hint: 'Fill the blank · conjugate', built: true },
] as const

export default function Home() {
  const { scope, srs, settings, streak, activity, grammarStats, clearWeak, clearGrammar, setSettings } = useApp()
  const today = studyDay()
  const vocab = studyVocab(scope, settings.newWordsOnly)
  const ids = new Set(vocab.map((v) => v.id))
  const view = queueView(
    vocab.map((v) => ({ id: v.id, deck: 'vocab' as const })),
    new Map(srs.map((x) => [x.id, x])),
    Date.now(),
    settings.newPerDay,
  )
  const due = view.counts.review + view.counts.learning
  const fresh = view.counts.new
  const doneToday = activity[today] ?? 0
  const streakNow = currentStreak(streak, today)

  const weakAll = srs
    .filter((s) => ids.has(s.id) && (s.weak || s.lapses > 0))
    .sort((a, b) => Number(b.weak) - Number(a.weak) || b.lapses - a.lapses)
  const weak = weakAll.slice(0, 8)

  const weakGrammar = grammarStats
    .filter((g) => g.seen >= 3 && grammarById.has(g.id) && grammarById.get(g.id)!.lesson <= Math.max(...scope))
    .map((g) => ({ ...g, acc: g.correct / g.seen }))
    .filter((g) => g.acc < 0.95)
    .sort((a, b) => a.acc - b.acc)
  const weakGrammarShown = weakGrammar.slice(0, 5)

  return (
    <div className="mx-auto grid max-w-[1180px] gap-5 px-6 py-6 lg:grid-cols-[1fr_340px]">
      <main className="space-y-5">
        {isSampleOnly() && (
          <div className="rounded-2xl border border-accent/40 bg-card px-5 py-4">
            <div className="text-lg font-extrabold">Welcome! You&apos;re looking at a tiny sample lesson.</div>
            <p className="mt-1 text-sm text-muted">
              Every mode works with it. To study your own material, import a lesson file (vocabulary, sentences, dialogues).
            </p>
            <Link to="/import" className="mt-2 inline-block text-sm font-bold text-accent hover:underline">
              Import your own lessons →
            </Link>
          </div>
        )}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-6 p-6">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted">Today · {formatScope(scope)}</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-6xl font-black tabular-nums leading-none">{due + fresh}</span>
                <span className="text-lg font-bold text-muted">cards to study</span>
              </div>
              <p className="mt-2 text-muted">
                <b className="text-ink">{due}</b> due for review · <b className="text-ink">{fresh}</b> new
              </p>
              <div className="mt-3">
                <Toggle on={settings.newWordsOnly} onChange={(v) => setSettings({ newWordsOnly: v })}>
                  New words only
                </Toggle>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link
                to="/review"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-lg font-extrabold text-accentink hover:brightness-110"
              >
                <Icon name="play" size={18} /> Start review
              </Link>
              {weak.length > 0 && (
                <Link to="/review?weak=1" className="text-sm font-bold text-muted underline-offset-4 hover:text-ink hover:underline">
                  Review just my weak items
                </Link>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group rounded-2xl border border-line bg-card p-4 transition hover:border-accent"
            >
              <div className="flex items-center justify-between text-accent">
                <Icon name={m.icon} size={26} />
                {!m.built && <span className="rounded-md bg-card2 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-muted">soon</span>}
              </div>
              <div className="mt-3 text-lg font-extrabold">{m.title}</div>
              <div className="text-sm text-muted">{m.hint}</div>
            </Link>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { to: '/library', icon: 'book', title: 'Lesson library', hint: 'Browse & verify content' },
            { to: '/mistakes', icon: 'flag', title: 'Mistake log', hint: 'Everything you missed' },
            { to: '/stats', icon: 'chart', title: 'Stats', hint: 'Forecast & retention' },
          ].map((m) => (
            <Link key={m.to} to={m.to} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 hover:border-muted">
              <Icon name={m.icon} size={22} className="text-muted" />
              <div>
                <div className="font-extrabold leading-tight">{m.title}</div>
                <div className="text-xs text-muted">{m.hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <aside className="space-y-4">
        <Card title="Lesson scope">
          <Row>
            <ScopeSelector />
          </Row>
          <Row label="In scope" value={`${vocab.length} words`} />
          <Row label="Sentences" value={sentencesIn(scope).length} />
          <Row label="Paragraphs" value={paragraphsIn(scope).length} />
          <Row label="Grammar points" value={grammarIn(scope).length} />
          <Row label="Exercises" value={exercisesIn(scope).length} />
        </Card>

        <Card title="Progress">
          <Row>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Daily goal</span>
              <span className="font-bold tabular-nums">
                {doneToday} / {settings.dailyGoal}
              </span>
            </div>
            <Bar value={doneToday} max={settings.dailyGoal} />
          </Row>
          <Row
            label={
              <span className="inline-flex items-center gap-1.5">
                <Icon name="flame" size={16} className="text-accent" /> Streak
              </span>
            }
            value={`${streakNow} day${streakNow === 1 ? '' : 's'}`}
          />
          <Row label="Best streak" value={`${streak.best} days`} />
        </Card>

        <Card
          title="Weakest words"
          right={
            weakAll.length > 0 ? (
              <button
                onClick={() => window.confirm(`Clear all ${weakAll.length} words from the weakest-words list? Their review schedule is kept.`) && void clearWeak(weakAll.map((x) => x.id))}
                className="text-xs font-bold text-muted hover:text-bad"
              >
                Clear all ({weakAll.length})
              </button>
            ) : undefined
          }
        >
          {weak.length === 0 ? (
            <Row>
              <p className="text-sm text-muted">Words you miss will show up here, and get scheduled sooner.</p>
            </Row>
          ) : (
            weak.map((s) => {
              const v = vocabById.get(s.id)
              return v ? (
                <Row
                  key={s.id}
                  label={<span className="ko">{v.ko}</span>}
                  value={
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted">{v.en}</span>
                      <button onClick={() => void clearWeak([s.id])} title="Remove from this list" aria-label={`Remove ${v.ko} from weakest words`} className="rounded px-1.5 text-lg font-bold leading-none text-muted hover:text-bad">
                        ×
                      </button>
                    </span>
                  }
                />
              ) : null
            })
          )}
        </Card>

        <Card
          title="Weakest grammar"
          right={
            weakGrammar.length > 0 ? (
              <button
                onClick={() => window.confirm(`Clear all ${weakGrammar.length} grammar points from this list? Their accuracy record is reset.`) && void clearGrammar(weakGrammar.map((g) => g.id))}
                className="text-xs font-bold text-muted hover:text-bad"
              >
                Clear all ({weakGrammar.length})
              </button>
            ) : undefined
          }
        >
          {weakGrammar.length === 0 ? (
            <Row>
              <p className="text-sm text-muted">Practise grammar a bit and your weakest patterns show up here.</p>
            </Row>
          ) : (
            weakGrammarShown.map((g) => {
              const gp = grammarById.get(g.id)!
              return (
                <Row
                  key={g.id}
                  label={<span className="text-sm">{gp.code ? `${gp.code} · ` : ''}{gp.title}</span>}
                  value={
                    <span className="flex items-center gap-3">
                      <span className="text-bad">{Math.round(g.acc * 100)}%</span>
                      <button onClick={() => void clearGrammar([g.id])} title="Remove from this list" aria-label={`Remove ${gp.title} from weakest grammar`} className="rounded px-1.5 text-lg font-bold leading-none text-muted hover:text-bad">
                        ×
                      </button>
                    </span>
                  }
                />
              )
            })
          )}
          {weakGrammar.length > 0 && (
            <Row>
              <Link to="/grammar" className="text-sm font-bold text-accent hover:underline">
                Practise grammar →
              </Link>
            </Row>
          )}
        </Card>

        <Card title="Theme">
          <div className="border-t border-line">
            <ThemePicker />
          </div>
        </Card>
        <BackupCard />
      </aside>
    </div>
  )
}
