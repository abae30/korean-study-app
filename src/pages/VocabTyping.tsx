import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { Field, Seg, Stat } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ImeField, type ImeFieldHandle } from '../components/ImeField'
import { KeyRow, TypedWord } from '../components/TypedWord'
import { studyVocab } from '../data'
import type { Vocab } from '../data/types'
import { answersFor } from '../lib/answers'
import { playItem, stopAudio } from '../lib/audio'
import { db } from '../lib/db'
import { flatten, isAnswer, matchStatus, pickTarget, syllableCount } from '../lib/hangul'
import { logMistake, markWeak } from '../lib/srs/weak'
import { useApp } from '../store/app'

type Phase = 'setup' | 'typing' | 'celebrate' | 'done'
type Source = 'all' | 'starred' | 'weak'
interface Attempt {
  v: Vocab
  /** Typed with no mistakes on the first go. */
  correct: boolean
  /** What was on screen when the first mistake happened. */
  typed: string
  ms: number
}

const CORRECT_DELAY = 450

function shuffled<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export default function VocabTyping() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { scope, srs, stars, settings, setSettings, recordActivity, refreshSrs, toggleStar } = useApp()

  const [phase, setPhase] = useState<Phase>('setup')
  const [source, setSource] = useState<Source>(params.get('weak') ? 'weak' : 'all')
  const [queue, setQueue] = useState<Vocab[]>([])
  const [pos, setPos] = useState(0)
  const [typed, setTyped] = useState('')
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [revealed, setRevealed] = useState(false)
  const [erred, setErred] = useState(false) // this word already had a mistake

  const field = useRef<ImeFieldHandle>(null)
  const timer = useRef<number | undefined>(undefined)
  const startedAt = useRef(0)
  const sessionStart = useRef(0)
  const requeued = useRef(new Set<string>())
  const firstWrong = useRef('')
  const hadError = useRef(false)
  const stateRef = useRef({ phase, queue, pos, attempts, revealed })
  stateRef.current = { phase, queue, pos, attempts, revealed }

  const pools = useMemo(() => {
    const all = studyVocab(scope, settings.newWordsOnly)
    const weakIds = new Set(srs.filter((s) => s.weak).map((s) => s.id))
    return {
      all,
      starred: all.filter((v) => stars.includes(v.id)),
      weak: all.filter((v) => weakIds.has(v.id)),
    }
  }, [scope, srs, stars, settings.newWordsOnly])

  const current = phase === 'typing' || phase === 'celebrate' ? queue[pos] : undefined
  const recall = settings.typingMode === 'recall'

  const speak = useCallback(
    (v: Vocab) => {
      if (settings.sound) void playItem(v.id, v.ko, settings.voiceMode)
    },
    [settings.sound, settings.voiceMode],
  )

  // a new word appears → reset per-word state, autoplay
  useEffect(() => {
    if (phase !== 'typing' || !current) return
    startedAt.current = performance.now()
    hadError.current = false
    firstWrong.current = ''
    setErred(false)
    setRevealed(false)
    if (settings.autoplay) speak(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pos, current?.id])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      stopAudio()
    },
    [],
  )

  function start(from: Vocab[]) {
    const pool = shuffled(from)
    const n = settings.sessionSize
    const q = n > 0 ? pool.slice(0, n) : pool
    if (!q.length) return
    requeued.current = new Set()
    sessionStart.current = performance.now()
    setQueue(q)
    setPos(0)
    setTyped('')
    setAttempts([])
    setPhase('typing')
  }

  async function saveSession(list: Attempt[]) {
    const correct = list.filter((a) => a.correct)
    const seconds = (performance.now() - sessionStart.current) / 1000
    const blocks = correct.reduce((n, a) => n + syllableCount(a.v.ko), 0)
    await (await db()).add('typing', {
      at: Date.now(),
      mode: 'vocab',
      itemId: 'session',
      wpm: seconds > 0 ? Math.round((blocks / 5 / seconds) * 60 * 10) / 10 : 0,
      accuracy: list.length ? Math.round((correct.length / list.length) * 1000) / 10 : 0,
      errors: list.length - correct.length,
      seconds: Math.round(seconds),
      missed: [...new Set(list.filter((a) => !a.correct).map((a) => a.v.ko))],
    })
  }

  function endSession(list = stateRef.current.attempts) {
    window.clearTimeout(timer.current)
    stopAudio()
    if (list.length) void saveSession(list)
    setPhase('done')
  }

  function advance() {
    window.clearTimeout(timer.current)
    const { queue: q, pos: p, attempts: list } = stateRef.current
    setTyped('')
    field.current?.clear()
    if (p + 1 >= q.length) return endSession(list)
    setPos(p + 1)
    setPhase('typing')
  }

  /** First mistake on this word: log it, flag the word weak, and bring it back once more later. */
  function registerError(wrongText: string) {
    if (hadError.current) return
    hadError.current = true
    firstWrong.current = wrongText
    setErred(true)
    const { queue: q, pos: p } = stateRef.current
    const v = q[p]
    void logMistake({ mode: 'vocab', itemId: v.id, prompt: v.en, expected: v.ko, typed: wrongText })
    void markWeak(v.id, 'vocab').then(refreshSrs)
    if (!requeued.current.has(v.id)) {
      requeued.current.add(v.id)
      setQueue((cur) => {
        const next = [...cur]
        next.splice(Math.min(next.length, p + 1 + 4), 0, v)
        return next
      })
    }
  }

  /** The word was typed correctly: the only way to move on. */
  function complete() {
    const { queue: q, pos: p } = stateRef.current
    const a: Attempt = { v: q[p], correct: !hadError.current, typed: firstWrong.current, ms: performance.now() - startedAt.current }
    setAttempts((cur) => [...cur, a])
    stateRef.current.attempts = [...stateRef.current.attempts, a]
    setPhase('celebrate')
    field.current?.clear()
    recordActivity(1)
    timer.current = window.setTimeout(advance, CORRECT_DELAY)
  }

  function onValue(value: string) {
    if (stateRef.current.phase !== 'typing') return
    const { queue: q, pos: p, revealed: rev } = stateRef.current
    const v = q[p]
    setTyped(value)
    const opts = answersFor(v, recall && !rev)
    if (isAnswer(opts, value)) return complete()
    const T = flatten(value)
    if (T && !opts.some((o) => flatten(o).startsWith(T))) registerError(value)
  }

  function reveal() {
    if (!recall || stateRef.current.phase !== 'typing' || stateRef.current.revealed) return
    registerError('(showed answer)')
    setRevealed(true)
    field.current?.clear()
    setTyped('')
  }

  function onFieldKey(e: React.KeyboardEvent) {
    const { queue: q, pos: p } = stateRef.current
    if (e.key === 'Tab') {
      e.preventDefault()
      if (q[p]) speak(q[p])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      endSession()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      reveal()
    } else if (e.key === 'Enter') {
      e.preventDefault() // there is no submit: a word only moves on when it is typed correctly
    }
  }

  // global keys for setup / results screens
  useEffect(() => {
    if (phase !== 'setup' && phase !== 'done') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav('/')
      if (e.key === 'Enter' && phase === 'setup') start(pools[source])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, source, pools, settings.sessionSize])

  /* ───────────── setup ───────────── */
  if (phase === 'setup') {
    const pool = pools[source]
    const sizes = [10, 20, 50, 0]
    return (
      <div className="mx-auto max-w-[620px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Vocabulary typing</h1>
        <p className="mt-1 text-muted">Hear the word, then type it. It moves on when you get it right.</p>
        <Card className="mt-6">
          <div className="space-y-5 p-5">
            <Field label="Mode">
              <Seg
                value={settings.typingMode}
                onChange={(v) => setSettings({ typingMode: v })}
                options={[
                  ['copy', 'Copy the word'],
                  ['recall', 'Recall (hide it)'],
                ]}
              />
              <p className="mt-1.5 text-sm text-muted">
                {settings.typingMode === 'copy'
                  ? 'The Korean is shown; type it as you hear it.'
                  : 'Only the English and audio are shown. Type the Korean from memory (↓ shows the answer).'}
              </p>
            </Field>
            <Field label="Which words">
              <Seg
                value={settings.newWordsOnly ? 'new' : 'all'}
                onChange={(v) => setSettings({ newWordsOnly: v === 'new' })}
                options={[
                  ['all', 'Everything'],
                  ['new', 'New words only'],
                ]}
              />
              <p className="mt-1.5 text-sm text-muted">
                {settings.newWordsOnly ? "Only the book's NEW WORDS lists; words that came from tables and notes are left out." : 'Includes words from tables, notes and exercises too.'}
              </p>
            </Field>
            <Field label="Words">
              <Seg
                value={source}
                onChange={setSource}
                options={[
                  ['all', `All in scope (${pools.all.length})`],
                  ['starred', `Starred (${pools.starred.length})`],
                  ['weak', `Weak (${pools.weak.length})`],
                ]}
              />
            </Field>
            <Field label="Session length">
              <Seg
                value={settings.sessionSize}
                onChange={(n) => setSettings({ sessionSize: n })}
                options={sizes.map((n) => [n, n === 0 ? 'All' : String(n)] as [number, string])}
              />
            </Field>
            <Field label="Keyboard">
              <Seg
                value={settings.builtinKeyboard ? 'builtin' : 'os'}
                onChange={(v) => setSettings({ builtinKeyboard: v === 'builtin' })}
                options={[
                  ['builtin', 'Regular keyboard'],
                  ['os', 'My Korean input source'],
                ]}
              />
              <p className="mt-1.5 text-sm text-muted">
                {settings.builtinKeyboard
                  ? 'Just type: letter keys make Korean letters (G K S → 한). No need to switch input source.'
                  : 'Switch macOS to a Korean input source yourself before typing.'}
              </p>
            </Field>
            <Button variant="primary" className="h-12 w-full text-lg" disabled={!pool.length} onClick={() => start(pool)}>
              <Icon name="play" size={18} /> {pool.length ? 'Start' : 'No words in this set'} <kbd className="ml-1 !bg-transparent !text-inherit">Enter</kbd>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ───────────── results ───────────── */
  if (phase === 'done') {
    const correct = attempts.filter((a) => a.correct).length
    const missed = [...new Map(attempts.filter((a) => !a.correct).map((a) => [a.v.id, a])).values()]
    const seconds = Math.max(1, (performance.now() - sessionStart.current) / 1000)
    return (
      <div className="mx-auto max-w-[620px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Done</h1>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Clean words" value={attempts.length ? `${Math.round((correct / attempts.length) * 100)}%` : '–'} />
          <Stat label="No mistakes" value={`${correct}/${attempts.length}`} />
          <Stat label="Time" value={`${Math.round(seconds)}s`} />
        </div>
        {missed.length > 0 && (
          <Card title="Needed a fix" className="mt-5">
            {missed.map((a) => (
              <div key={a.v.id} className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-2.5">
                <div>
                  <span className="ko text-xl">{a.v.ko}</span> <span className="text-muted">{a.v.en}</span>
                </div>
                <span className="ko text-bad">{a.typed}</span>
              </div>
            ))}
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {missed.length > 0 && (
            <Button variant="primary" onClick={() => start(missed.map((a) => a.v))}>
              Practice the {missed.length} missed
            </Button>
          )}
          <Button onClick={() => setPhase('setup')}>New session</Button>
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home <kbd className="ml-2">Esc</kbd>
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── typing ───────────── */
  const v = current!
  const hidden = recall && !revealed && phase === 'typing' // answer not on screen
  const opts = answersFor(v, recall && !revealed)
  const target = pickTarget(opts, typed)
  const m = matchStatus(target, typed)
  const offTrack = !!flatten(typed) && !opts.some((o) => flatten(o).startsWith(flatten(typed)))
  const done = attempts.filter((a) => a.correct).length
  const missedCount = attempts.length - done
  const starred = stars.includes(v.id)
  const celebrating = phase === 'celebrate'

  return (
    <div className="mx-auto max-w-[860px] px-6 pt-8">
      <div className="mb-10 flex items-center gap-4 text-sm font-bold text-muted">
        <span className="tabular-nums">
          {Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
        <span className="text-good tabular-nums">✓ {done}</span>
        <span className="text-bad tabular-nums">✗ {missedCount}</span>
      </div>

      <div className="relative cursor-text text-center" onClick={() => field.current?.focus()}>
        <div className="ko flex min-h-[7.5rem] items-end justify-center text-[5.5rem] leading-none" aria-live="polite">
          {hidden ? (
            <span className={offTrack ? 'text-bad' : typed ? 'text-ink' : 'text-muted/40'}>
              {typed || Array.from({ length: syllableCount(v.ko) || 2 }, () => '_').join(' ')}
              <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-pulse bg-accent" />
            </span>
          ) : (
            <TypedWord target={celebrating ? v.ko : target} m={celebrating ? matchStatus(v.ko, v.ko) : m} done={celebrating} caret />
          )}
        </div>
        <ImeField
          ref={field}
          builtin={settings.builtinKeyboard}
          disabled={celebrating}
          onValue={onValue}
          onKey={onFieldKey}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>

      <div className="mt-3 h-8 text-center">
        {phase === 'typing' && offTrack && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1 text-sm text-muted">
            <kbd>Backspace</kbd> to fix your mistake
          </span>
        )}
        {phase === 'typing' && !offTrack && erred && revealed && (
          <span className="text-sm text-muted">Now type it to continue. It will come back once more.</span>
        )}
      </div>

      <div className="mt-2 text-center">
        <div className="text-3xl font-extrabold">{v.en}</div>
        <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted">
          <span className="rounded-md border border-line px-1.5 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wide">{v.pos}</span>
          {!hidden && v.forms && (
            <span>
              also written: <span className="ko">{v.forms.join(', ')}</span>
            </span>
          )}
          {v.note && <span className="max-w-md">{v.note}</span>}
        </div>
      </div>

      {!hidden && phase === 'typing' && (
        <div className="mt-6">
          <KeyRow target={target} m={m} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <span>
          <kbd>Tab</kbd> replay audio
        </span>
        {recall && !revealed && (
          <span>
            <kbd>↓</kbd> show answer
          </span>
        )}
        <span>
          <kbd>Esc</kbd> finish
        </span>
        <button onClick={() => speak(v)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card2 px-2.5 py-1 font-bold hover:border-muted">
          <Icon name="volume" size={16} /> Play
        </button>
        {recall && !revealed && (
          <button onClick={reveal} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card2 px-2.5 py-1 font-bold hover:border-muted">
            Show answer
          </button>
        )}
        <button
          onClick={() => toggleStar(v.id)}
          aria-pressed={starred}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold ${starred ? 'border-warn text-warn' : 'border-line bg-card2 hover:border-muted'}`}
        >
          <Icon name="star" size={16} /> {starred ? 'Starred' : 'Star'}
        </button>
      </div>
    </div>
  )
}
