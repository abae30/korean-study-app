import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { Field, Seg, Stat, Toggle } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ImeField, type ImeFieldHandle } from '../components/ImeField'
import { TypedText } from '../components/TypedWord'
import { sentencesIn, vocabById } from '../data'
import type { Sentence } from '../data/types'
import { playItem, stopAudio } from '../lib/audio'
import { db } from '../lib/db'
import { flatten, isAnswer, matchStatus, syllableCount } from '../lib/hangul'
import { accuracy, countKeystrokes, emptyKeyStats, wpm, type KeyStats } from '../lib/keystrokes'
import { vocabAtError } from '../lib/mistakes'
import { logMistake, markWeak } from '../lib/srs/weak'
import { useApp } from '../store/app'

type Phase = 'setup' | 'typing' | 'celebrate' | 'done'
type Source = 'both' | 'textbook' | 'generated'
type Mode = 'copy' | 'dictation'
interface Attempt {
  s: Sentence
  correct: boolean // no mistakes on the first go
  typed: string
  activeMs: number
}

const CORRECT_DELAY = 550

function shuffled<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export default function SentenceTyping() {
  const nav = useNavigate()
  const { scope, settings, setSettings, recordActivity, refreshSrs } = useApp()

  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('copy')
  const [showEnglish, setShowEnglish] = useState(true)
  const [source, setSource] = useState<Source>('both')
  const [queue, setQueue] = useState<Sentence[]>([])
  const [pos, setPos] = useState(0)
  const [typed, setTyped] = useState('')
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [revealed, setRevealed] = useState(false)
  const [erred, setErred] = useState(false)

  const field = useRef<ImeFieldHandle>(null)
  const timer = useRef<number | undefined>(undefined)
  const sessionStart = useRef(0)
  const firstKeyAt = useRef<number | null>(null)
  const requeued = useRef(new Set<string>())
  const firstWrong = useRef('')
  const hadError = useRef(false)
  const prevTyped = useRef('')
  const keyStats = useRef<KeyStats>(emptyKeyStats)
  const stateRef = useRef({ phase, queue, pos, attempts, revealed, mode })
  stateRef.current = { phase, queue, pos, attempts, revealed, mode }

  const pool = useMemo(() => sentencesIn(scope).filter((s) => source === 'both' || s.source === source), [scope, source])
  const current = phase === 'typing' || phase === 'celebrate' ? queue[pos] : undefined

  const speak = useCallback(
    (s: Sentence) => {
      if (settings.sound) void playItem(s.id, s.ko, settings.voiceMode)
    },
    [settings.sound, settings.voiceMode],
  )

  // a new sentence appears
  useEffect(() => {
    if (phase !== 'typing' || !current) return
    hadError.current = false
    firstWrong.current = ''
    firstKeyAt.current = null
    prevTyped.current = ''
    setErred(false)
    setRevealed(false)
    if (settings.autoplay || mode === 'dictation') speak(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pos, current?.id])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      stopAudio()
    },
    [],
  )

  function start(from: Sentence[]) {
    const n = settings.sessionSize
    const list = shuffled(from)
    const q = n > 0 ? list.slice(0, n) : list
    if (!q.length) return
    requeued.current = new Set()
    keyStats.current = emptyKeyStats
    sessionStart.current = performance.now()
    setQueue(q)
    setPos(0)
    setTyped('')
    setAttempts([])
    setPhase('typing')
  }

  const sessionNumbers = (list: Attempt[]) => {
    const activeSec = list.reduce((n, a) => n + a.activeMs, 0) / 1000
    const blocks = list.reduce((n, a) => n + syllableCount(a.s.ko) + [...a.s.ko].filter((c) => !/[가-힣]/.test(c)).length, 0)
    return { wpm: wpm(blocks, activeSec), accuracy: Math.round(accuracy(keyStats.current) * 1000) / 10, seconds: Math.round((performance.now() - sessionStart.current) / 1000) }
  }

  async function saveSession(list: Attempt[]) {
    const n = sessionNumbers(list)
    await (await db()).add('typing', {
      at: Date.now(),
      mode: 'sentence',
      itemId: 'session',
      wpm: n.wpm,
      accuracy: n.accuracy,
      errors: keyStats.current.wrong,
      seconds: n.seconds,
      missed: [...new Set(list.filter((a) => !a.correct).map((a) => a.s.ko))],
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
    prevTyped.current = ''
    field.current?.clear()
    if (p + 1 >= q.length) return endSession(list)
    setPos(p + 1)
    setPhase('typing')
  }

  function registerError(wrongText: string) {
    if (hadError.current) return
    hadError.current = true
    firstWrong.current = wrongText
    setErred(true)
    const { queue: q, pos: p } = stateRef.current
    const s = q[p]
    void logMistake({ mode: 'sentence', itemId: s.id, prompt: s.en, expected: s.ko, typed: wrongText })
    const hits = vocabAtError(s.ko, matchStatus(s.ko, wrongText), s.vocabIds, vocabById)
    void Promise.all(hits.map((id) => markWeak(id, 'vocab'))).then(refreshSrs)
    if (!requeued.current.has(s.id)) {
      requeued.current.add(s.id)
      setQueue((cur) => {
        const next = [...cur]
        next.splice(Math.min(next.length, p + 1 + 3), 0, s)
        return next
      })
    }
  }

  function complete() {
    const { queue: q, pos: p } = stateRef.current
    const started = firstKeyAt.current ?? performance.now()
    const a: Attempt = { s: q[p], correct: !hadError.current, typed: firstWrong.current, activeMs: performance.now() - started }
    stateRef.current.attempts = [...stateRef.current.attempts, a]
    setAttempts(stateRef.current.attempts)
    setPhase('celebrate')
    field.current?.clear()
    recordActivity(1)
    timer.current = window.setTimeout(advance, CORRECT_DELAY)
  }

  function onValue(value: string) {
    if (stateRef.current.phase !== 'typing') return
    const { queue: q, pos: p } = stateRef.current
    const s = q[p]
    setTyped(value)
    if (firstKeyAt.current === null && value) firstKeyAt.current = performance.now()
    const T = flatten(value)
    const onTrack = flatten(s.ko).startsWith(T)
    keyStats.current = countKeystrokes(prevTyped.current, value, onTrack, keyStats.current)
    prevTyped.current = value
    if (isAnswer([s.ko], value)) return complete()
    if (T && !onTrack) registerError(value)
  }

  function reveal() {
    if (stateRef.current.mode !== 'dictation' || stateRef.current.phase !== 'typing' || stateRef.current.revealed) return
    registerError('(showed answer)')
    setRevealed(true)
    field.current?.clear()
    setTyped('')
    prevTyped.current = ''
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
      e.preventDefault() // no submit: a sentence moves on only when it is typed correctly
    }
  }

  useEffect(() => {
    if (phase !== 'setup' && phase !== 'done') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav('/')
      if (e.key === 'Enter' && phase === 'setup') start(pool)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool, settings.sessionSize])

  /* ───────────── setup ───────────── */
  if (phase === 'setup') {
    const counts = { both: sentencesIn(scope).length, textbook: sentencesIn(scope).filter((s) => s.source === 'textbook').length, generated: sentencesIn(scope).filter((s) => s.source === 'generated').length }
    return (
      <div className="mx-auto max-w-[620px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Sentence typing</h1>
        <p className="mt-1 text-muted">One sentence at a time, drawn only from the lessons you've selected.</p>
        <Card className="mt-6">
          <div className="space-y-5 p-5">
            <Field label="Mode">
              <Seg
                value={mode}
                onChange={setMode}
                options={[
                  ['copy', 'Copy the sentence'],
                  ['dictation', 'Dictation (listen & type)'],
                ]}
              />
              <p className="mt-1.5 text-sm text-muted">
                {mode === 'copy' ? 'The Korean is shown; hear it and type it.' : 'The Korean is hidden. Listen (Tab replays) and type what you hear. ↓ shows the answer.'}
              </p>
              {mode === 'dictation' && (
                <div className="mt-2">
                  <Toggle on={showEnglish} onChange={setShowEnglish}>
                    Show English hint
                  </Toggle>
                </div>
              )}
            </Field>
            <Field label="Sentences">
              <Seg
                value={source}
                onChange={setSource}
                options={[
                  ['both', `All (${counts.both})`],
                  ['textbook', `Textbook (${counts.textbook})`],
                  ['generated', `Practice (${counts.generated})`],
                ]}
              />
            </Field>
            <Field label="Session length">
              <Seg value={settings.sessionSize} onChange={(n) => setSettings({ sessionSize: n })} options={[10, 20, 50, 0].map((n) => [n, n === 0 ? 'All' : String(n)] as [number, string])} />
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
            </Field>
            <Button variant="primary" className="h-12 w-full text-lg" disabled={!pool.length} onClick={() => start(pool)}>
              <Icon name="play" size={18} /> {pool.length ? 'Start' : 'No sentences in this set'} <kbd className="ml-1 !bg-transparent !text-inherit">Enter</kbd>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ───────────── results ───────────── */
  if (phase === 'done') {
    const n = sessionNumbers(attempts)
    const clean = attempts.filter((a) => a.correct).length
    const missed = [...new Map(attempts.filter((a) => !a.correct).map((a) => [a.s.id, a])).values()]
    return (
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Done</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="WPM" value={String(n.wpm)} />
          <Stat label="Accuracy" value={`${n.accuracy}%`} />
          <Stat label="Clean" value={`${clean}/${attempts.length}`} />
          <Stat label="Time" value={`${n.seconds}s`} />
        </div>
        <p className="mt-2 text-xs text-muted">WPM = correct syllable blocks ÷ 5, per minute of typing. Accuracy counts every keystroke.</p>
        {missed.length > 0 && (
          <Card title="Needed a fix" className="mt-5">
            {missed.map((a) => (
              <div key={a.s.id} className="border-t border-line px-4 py-2.5">
                <div className="ko text-lg">{a.s.ko}</div>
                <div className="text-sm text-muted">{a.s.en}</div>
                {a.typed && <div className="ko mt-0.5 text-sm text-bad">{a.typed}</div>}
              </div>
            ))}
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {missed.length > 0 && (
            <Button variant="primary" onClick={() => start(missed.map((a) => a.s))}>
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
  const s = current!
  const hidden = mode === 'dictation' && !revealed && phase === 'typing'
  const m = matchStatus(s.ko, typed)
  const offTrack = !!flatten(typed) && !flatten(s.ko).startsWith(flatten(typed))
  const celebrating = phase === 'celebrate'
  const done = attempts.filter((a) => a.correct).length
  const size = s.ko.length <= 10 ? 'text-[4.4rem]' : s.ko.length <= 22 ? 'text-[3.2rem]' : 'text-[2.5rem]'

  return (
    <div className="mx-auto max-w-[980px] px-6 pt-8">
      <div className="mb-10 flex items-center gap-4 text-sm font-bold text-muted">
        <span className="tabular-nums">
          {Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
        <span className="text-good tabular-nums">✓ {done}</span>
        <span className="text-bad tabular-nums">✗ {attempts.length - done}</span>
      </div>

      <div className="relative cursor-text text-center" onClick={() => field.current?.focus()}>
        <div className={`ko flex min-h-[9rem] flex-wrap items-end justify-center leading-[1.15] ${size}`} aria-live="polite">
          {hidden ? (
            <span className={offTrack ? 'text-bad' : typed ? 'text-ink' : 'text-muted/40'}>
              {typed || '…'}
              <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-pulse bg-accent" />
            </span>
          ) : (
            <TypedText target={s.ko} m={celebrating ? matchStatus(s.ko, s.ko) : m} done={celebrating} />
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
        {phase === 'typing' && !offTrack && erred && revealed && <span className="text-sm text-muted">Now type it to continue. It will come back once more.</span>}
      </div>

      <div className="mt-2 text-center">
        {(mode === 'copy' || showEnglish || revealed) && <div className="text-2xl font-extrabold">{s.en}</div>}
        {mode === 'dictation' && !showEnglish && !revealed && <div className="text-lg text-muted">Listen, then type what you hear.</div>}
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{s.source === 'textbook' ? 'from the textbook' : 'practice sentence'}</div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <span>
          <kbd>Tab</kbd> replay audio
        </span>
        {mode === 'dictation' && !revealed && (
          <span>
            <kbd>↓</kbd> show answer
          </span>
        )}
        <span>
          <kbd>Esc</kbd> finish
        </span>
        <button onClick={() => speak(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card2 px-2.5 py-1 font-bold hover:border-muted">
          <Icon name="volume" size={16} /> Play
        </button>
        {mode === 'dictation' && !revealed && (
          <button onClick={reveal} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card2 px-2.5 py-1 font-bold hover:border-muted">
            Show answer
          </button>
        )}
      </div>
    </div>
  )
}
