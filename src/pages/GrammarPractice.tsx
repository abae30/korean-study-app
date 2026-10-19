import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { Field, Seg, Stat } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ImeField, type ImeFieldHandle } from '../components/ImeField'
import { grammarById, grammarIn } from '../data'
import type { Exercise, Focus } from '../data/types'
import type { SrsState } from '../lib/srs/types'
import { exercisePool } from '../lib/grammar'
import { orderPool } from '../lib/grammar/order'
import { flatten, isAnswer } from '../lib/hangul'
import { queueView } from '../lib/srs/queue'
import { answerSrs } from '../lib/srs/apply'
import { logMistake } from '../lib/srs/weak'
import { shuffle } from '../lib/deck'
import { useApp } from '../store/app'

type Phase = 'setup' | 'practice' | 'results'
type Kind = 'both' | 'blank' | 'conjugate'
type InputMode = 'type' | 'choice'
interface Answer {
  ex: Exercise
  correct: boolean
  typed: string
}

const FOCUS_LABEL: Record<Focus, string> = { particle: 'Particles', ending: 'Endings', question: 'Questions', conjugation: 'Conjugation', other: 'Other' }
const CORRECT_DELAY = 1100

/** The sentence with the blank filled in and the answer highlighted. */
function Filled({ ex }: { ex: Exercise }) {
  if (ex.type === 'conjugate')
    return (
      <span className="ko">
        {ex.base} <span className="text-muted">→</span> <mark className="rounded bg-transparent px-1 text-good">{ex.answers[0]}</mark>
      </span>
    )
  const [pre, post] = ex.sentence.split('___')
  return (
    <span className="ko">
      {pre}
      <mark className="rounded bg-transparent px-1 text-good underline decoration-2 underline-offset-4">{ex.answers[0]}</mark>
      {post}
    </span>
  )
}

export default function GrammarPractice() {
  const nav = useNavigate()
  const { scope, srs, grammarStats, settings, setSettings, recordGrammar, recordActivity, upsertSrs } = useApp()

  const [phase, setPhase] = useState<Phase>('setup')
  const [kind, setKind] = useState<Kind>('both')
  const [input, setInput] = useState<InputMode>('type')
  const [focuses, setFocuses] = useState<Focus[]>([])
  const [points, setPoints] = useState<string[]>([])
  const [length, setLength] = useState(20)

  const [items, setItems] = useState<Exercise[]>([])
  const [states, setStates] = useState(() => new Map(srs.map((s) => [s.id, s])))
  const [answers, setAnswers] = useState<Answer[]>([])
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<{ correct: boolean; typed: string } | null>(null)
  const [order, setOrder] = useState<string[]>([])

  const field = useRef<ImeFieldHandle>(null)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<Promise<void>>(Promise.resolve()) // the schedule update for the last answer
  const stateRef = useRef({ phase, result, answers, length })
  stateRef.current = { phase, result, answers, length }

  const all = useMemo(() => exercisePool(scope), [scope])
  const pool = useMemo(
    () =>
      all.filter(
        (e) =>
          (kind === 'both' || e.type === kind) &&
          (focuses.length === 0 || focuses.includes(e.focus)) &&
          (points.length === 0 || points.includes(e.grammarId)),
      ),
    [all, kind, focuses, points],
  )
  const presentFocuses = useMemo(() => [...new Set(all.map((e) => e.focus))], [all])
  const hasConj = useMemo(() => all.some((e) => e.type === 'conjugate'), [all])
  const grammar = useMemo(() => grammarIn(scope), [scope])

  // The exercise on screen is pinned: answering updates the schedule, which would otherwise instantly change "what's next"
  // and swap the exercise (and its feedback) out from under you. The next one is picked only when you advance.
  const [curId, setCurId] = useState<string | null>(null)
  const itemsRef = useRef<Exercise[]>([])
  const statesRef = useRef(states)
  statesRef.current = states
  const pickNext = useCallback((list: Exercise[], map: Map<string, SrsState>) => {
    return queueView(list.map((e) => ({ id: e.id, deck: 'grammar' as const })), map, Date.now(), 100_000).next?.id ?? null
  }, [])
  const byId = useMemo(() => new Map(items.map((e) => [e.id, e])), [items])
  const ex = curId ? byId.get(curId) : undefined

  // a new exercise: reset the input, shuffle the multiple-choice options
  useEffect(() => {
    setTyped('')
    setResult(null)
    if (ex) setOrder(shuffle(ex.choices))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex?.id])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function start() {
    if (!pool.length) return
    const list = orderPool(pool, grammarStats)
    const map = new Map(srs.map((s) => [s.id, s]))
    itemsRef.current = list
    setItems(list)
    setStates(map)
    setAnswers([])
    stateRef.current.answers = []
    stateRef.current.result = null
    setCurId(pickNext(list, map))
    setPhase('practice')
  }

  const advance = useCallback(async () => {
    window.clearTimeout(timer.current)
    await pending.current // the schedule must be updated before we ask what comes next
    const { answers: a, length: n } = stateRef.current
    setTyped('')
    setResult(null)
    stateRef.current.result = null
    field.current?.clear()
    const next = pickNext(itemsRef.current, statesRef.current)
    if ((n > 0 && a.length >= n) || next === null) return setPhase('results')
    setCurId(next)
  }, [pickNext])

  function judge(correct: boolean, value: string) {
    if (!ex || stateRef.current.result) return
    setResult({ correct, typed: value })
    stateRef.current.result = { correct, typed: value }
    const a: Answer = { ex, correct, typed: value }
    setAnswers((cur) => [...cur, a])
    stateRef.current.answers = [...stateRef.current.answers, a]
    recordGrammar(ex.grammarId, correct)
    recordActivity(1)
    // spaced repetition: a miss comes back soon, a hit is pushed out
    const prev = statesRef.current.get(ex.id)
    pending.current = (async () => {
      const { next } = await answerSrs(prev, ex.id, 'grammar', correct ? 3 : 1)
      upsertSrs(next)
      const map = new Map(statesRef.current).set(next.id, next)
      statesRef.current = map
      setStates(map)
    })()
    if (!correct) {
      void logMistake({
        mode: 'grammar',
        itemId: ex.id,
        prompt: ex.type === 'blank' ? `${ex.sentence}  (${ex.en})` : `${ex.base} → ${ex.target}`,
        expected: ex.answers[0],
        typed: value,
      })
    } else timer.current = window.setTimeout(advance, CORRECT_DELAY)
  }

  function onValue(value: string) {
    if (!ex || stateRef.current.result) return
    setTyped(value)
    if (isAnswer(ex.answers, value)) return judge(true, value)
    const longest = Math.max(...ex.answers.map((a) => flatten(a).length))
    if (flatten(value).length > longest) judge(false, value) // clearly too long to be right
  }

  function onFieldKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setPhase(answers.length ? 'results' : 'setup')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (stateRef.current.result) advance()
      else if (typed.trim()) judge(false, typed)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!stateRef.current.result) judge(false, '')
    }
  }

  // multiple choice + continue keys
  useEffect(() => {
    if (phase !== 'practice' || !ex) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return // the field handles its own keys
      if (e.key === 'Escape') return void setPhase(stateRef.current.answers.length ? 'results' : 'setup')
      if (stateRef.current.result) {
        if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), advance())
        return
      }
      if (input !== 'choice') return
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) judge(isAnswer(ex.answers, order[n - 1]), order[n - 1])
      else if (e.key === 'ArrowDown') judge(false, '')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ex, input, order, advance])

  useEffect(() => {
    if (phase !== 'setup' && phase !== 'results') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav('/')
      if (e.key === 'Enter' && phase === 'setup') start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  /* ───────────── setup ───────────── */
  if (phase === 'setup') {
    const countFor = (id: string) => all.filter((e) => e.grammarId === id).length
    return (
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Grammar & endings</h1>
        <p className="mt-1 text-muted">Fill in the blank with the particle or ending, or conjugate a word. Only patterns from your selected lessons.</p>
        <Card className="mt-6">
          <div className="space-y-5 p-5">
            {hasConj && (
              <Field label="Exercise type">
                <Seg
                  value={kind}
                  onChange={setKind}
                  options={[
                    ['both', 'Both'],
                    ['blank', 'Fill the blank'],
                    ['conjugate', 'Conjugate'],
                  ]}
                />
              </Field>
            )}
            <Field label="Answer by">
              <Seg
                value={input}
                onChange={setInput}
                options={[
                  ['type', 'Typing'],
                  ['choice', 'Multiple choice'],
                ]}
              />
            </Field>
            <Field label="Focus (empty = everything)">
              <div className="flex flex-wrap gap-1.5">
                {presentFocuses.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFocuses((cur) => toggle(cur, f))}
                    aria-pressed={focuses.includes(f)}
                    className={`h-9 rounded-lg border px-3 text-sm font-extrabold ${focuses.includes(f) ? 'border-accent bg-accent text-accentink' : 'border-line bg-card2 hover:border-muted'}`}
                  >
                    {FOCUS_LABEL[f]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Grammar points (empty = all)">
              <div className="flex flex-col gap-1.5">
                {grammar.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setPoints((cur) => toggle(cur, g.id))}
                    aria-pressed={points.includes(g.id)}
                    disabled={countFor(g.id) === 0}
                    className={`flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left disabled:opacity-40 ${points.includes(g.id) ? 'border-accent bg-card2' : 'border-line bg-card hover:border-muted'}`}
                  >
                    <span>
                      <span className="font-extrabold">{g.code ? `${g.code} · ` : ''}{g.title}</span>
                      <span className="ko ml-2 text-sm text-muted">{g.pattern}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-muted">{countFor(g.id)}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Session length">
              <Seg value={length} onChange={setLength} options={[10, 20, 50, 0].map((n) => [n, n === 0 ? 'Endless' : String(n)] as [number, string])} />
            </Field>
            {input === 'type' && (
              <Field label="Keyboard">
                <Seg
                  value={settings.builtinKeyboard ? 'builtin' : 'os'}
                  onChange={(v) => setSettings({ builtinKeyboard: v === 'builtin' })}
                  options={[
                    ['builtin', 'Regular keyboard'],
                    ['os', 'My Korean input source'],
                  ]}
                />
              </Field>
            )}
            <Button variant="primary" className="h-12 w-full text-lg" disabled={!pool.length} onClick={start}>
              <Icon name="play" size={18} /> {pool.length ? `Start · ${pool.length} exercises available` : 'No exercises match'} <kbd className="ml-1 !bg-transparent !text-inherit">Enter</kbd>
            </Button>
            <p className="text-xs text-muted">Exercises you miss come back soon (the same scheduler as spaced review); your weakest grammar points come up more often.</p>
          </div>
        </Card>
      </div>
    )
  }

  /* ───────────── results ───────────── */
  if (phase === 'results') {
    const right = answers.filter((a) => a.correct).length
    const by = new Map<string, { seen: number; ok: number }>()
    for (const a of answers) {
      const c = by.get(a.ex.grammarId) ?? { seen: 0, ok: 0 }
      by.set(a.ex.grammarId, { seen: c.seen + 1, ok: c.ok + (a.correct ? 1 : 0) })
    }
    const missed = answers.filter((a) => !a.correct)
    return (
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Session complete</h1>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Correct" value={`${right}/${answers.length}`} />
          <Stat label="Accuracy" value={answers.length ? `${Math.round((right / answers.length) * 100)}%` : '–'} />
          <Stat label="Missed" value={String(missed.length)} />
        </div>
        <Card title="By grammar point" className="mt-5">
          {[...by.entries()].sort((a, b) => a[1].ok / a[1].seen - b[1].ok / b[1].seen).map(([id, c]) => {
            const g = grammarById.get(id)
            return (
              <div key={id} className="border-t border-line px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{g ? `${g.code ? g.code + ' · ' : ''}${g.title}` : id}</span>
                  <span className="font-extrabold tabular-nums">
                    {c.ok}/{c.seen}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card2">
                  <div className="h-full rounded-full bg-good" style={{ width: `${(c.ok / c.seen) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </Card>
        {missed.length > 0 && (
          <Card title="Review these" className="mt-5">
            {missed.map((a, i) => (
              <div key={i} className="border-t border-line px-4 py-3">
                <div className="text-xl">
                  <Filled ex={a.ex} />
                </div>
                {a.ex.type === 'blank' && <div className="text-sm text-muted">{a.ex.en}</div>}
                {a.typed && <div className="ko mt-0.5 text-sm text-bad">you: {a.typed}</div>}
                <div className="mt-1 text-sm">{a.ex.explanation}</div>
              </div>
            ))}
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={start}>
            Practice again <kbd className="ml-1 !bg-transparent !text-inherit">Enter</kbd>
          </Button>
          <Button onClick={() => setPhase('setup')}>Change options</Button>
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home <kbd className="ml-2">Esc</kbd>
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── practice ───────────── */
  if (!ex) return null
  const g = grammarById.get(ex.grammarId)
  const done = answers.filter((a) => a.correct).length
  const slotText = result ? (result.typed || '') : typed
  const slotTone = result ? (result.correct ? 'text-good border-good' : 'text-bad border-bad') : 'text-ink border-accent'
  const slot = (
    <span className={`mx-1 inline-block min-w-[2.6em] border-b-4 px-1 text-center align-baseline ${slotTone}`}>
      {slotText || ' '}
      {!result && input === 'type' && <span className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] animate-pulse bg-accent" />}
    </span>
  )
  const parts = ex.type === 'blank' ? ex.sentence.split('___') : null

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-8">
      <div className="mb-8 flex items-center gap-4 text-sm font-bold text-muted">
        <span className="tabular-nums">{answers.length + 1}{length > 0 ? ` / ${length}` : ''}</span>
        {length > 0 && (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card2">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(answers.length / length) * 100}%` }} />
          </div>
        )}
        {length === 0 && <div className="flex-1" />}
        <span className="text-good tabular-nums">✓ {done}</span>
        <span className="text-bad tabular-nums">✗ {answers.length - done}</span>
      </div>

      <div className="relative cursor-text text-center" onClick={() => field.current?.focus()}>
        {g && (
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
            {g.code ? `${g.code} · ` : ''}
            {g.title}
          </div>
        )}
        {ex.type === 'blank' ? (
          <>
            <div className="mb-4 text-xl font-bold text-muted">{ex.en}</div>
            <div className="ko text-[2.6rem] leading-[1.5]">
              {parts![0]}
              {slot}
              {parts![1]}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 text-xl font-bold text-muted">
              {ex.baseEn} · {ex.target}
            </div>
            <div className="ko text-[3.2rem] leading-[1.4]">
              {ex.base} <span className="text-muted">→</span> {slot}
            </div>
          </>
        )}
        {input === 'type' && (
          <ImeField
            ref={field}
            builtin={settings.builtinKeyboard}
            disabled={!!result?.correct}
            onValue={onValue}
            onKey={onFieldKey}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
          />
        )}
      </div>

      {input === 'choice' && (
        <div className="mx-auto mt-8 grid max-w-[560px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(order.length, 3)}, minmax(0, 1fr))` }}>
          {order.map((c, i) => {
            const isRight = isAnswer(ex.answers, c)
            const picked = result?.typed === c
            const tone = !result ? 'border-line bg-card hover:border-accent' : isRight ? 'border-good bg-card text-good' : picked ? 'border-bad bg-card text-bad' : 'border-line bg-card opacity-50'
            return (
              <button key={c} disabled={!!result} onClick={() => judge(isRight, c)} className={`ko flex h-16 items-center justify-center gap-3 rounded-xl border-2 text-2xl transition ${tone}`}>
                <kbd>{i + 1}</kbd>
                {c}
              </button>
            )
          })}
        </div>
      )}

      <div className="mx-auto mt-8 min-h-[150px] max-w-[640px]">
        {result ? (
          <div className={`rounded-2xl border bg-card p-4 ${result.correct ? 'border-good/50' : 'border-bad/50'}`}>
            <div className={`text-lg font-extrabold ${result.correct ? 'text-good' : 'text-bad'}`}>
              {result.correct ? '✓ Correct' : '✗ Not quite'}
              {!result.correct && result.typed && <span className="ko ml-3 text-base font-bold text-bad line-through decoration-2">{result.typed}</span>}
            </div>
            <div className="mt-1 text-2xl">
              <Filled ex={ex} />
            </div>
            <p className="mt-2 text-[0.95rem]">{ex.explanation}</p>
            {ex.type === 'conjugate' && ex.irregular && <p className="mt-1 text-sm text-warn">Irregular: {ex.irregular}</p>}
            {g && (
              <p className="mt-2 text-sm text-muted">
                {g.code ? `${g.code} · ` : ''}
                {g.title}: <span className="ko">{g.pattern}</span>
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              {result.correct ? 'Continuing…' : <>Press <kbd>Enter</kbd> to continue. This one will come back soon.</>}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
            {input === 'type' ? (
              <>
                <span>Type the answer. It checks as you type.</span>
                <span>
                  <kbd>Enter</kbd> check
                </span>
              </>
            ) : (
              <span>
                Pick an answer (<kbd>1</kbd>–<kbd>{order.length}</kbd>)
              </span>
            )}
            <span>
              <kbd>↓</kbd> show answer
            </span>
            <span>
              <kbd>Esc</kbd> finish
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
