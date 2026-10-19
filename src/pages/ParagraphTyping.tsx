import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { Stat, Toggle } from '../components/Controls'
import { Icon } from '../components/Icon'
import { ImeField, type ImeFieldHandle } from '../components/ImeField'
import { LineChart } from '../components/LineChart'
import { TypedWord, WordGap } from '../components/TypedWord'
import { paragraphsIn } from '../data'
import type { Paragraph } from '../data/types'
import { playItem, playSequence, stopAudio } from '../lib/audio'
import { db, type TypingResult } from '../lib/db'
import { flatten } from '../lib/hangul'
import { accuracy, countKeystrokes, emptyKeyStats, wpm, type KeyStats } from '../lib/keystrokes'
import { analyze, missedChars, tokenize } from '../lib/paragraph'
import { useApp } from '../store/app'

type Phase = 'pick' | 'typing' | 'results'

interface Run {
  wpm: number
  rawWpm: number
  keysPerMin: number
  accuracy: number
  errors: number
  seconds: number
  chars: [string, number][]
  words: [string, string][]
}

const textOf = (p: Paragraph) => p.lines.map((l) => l.ko).join(' ')
const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function ParagraphTyping() {
  const nav = useNavigate()
  const { scope, settings, setSettings, recordActivity } = useApp()
  const paragraphs = useMemo(() => paragraphsIn(scope), [scope])

  const [phase, setPhase] = useState<Phase>('pick')
  const [para, setPara] = useState<Paragraph | null>(null)
  const [typed, setTyped] = useState('')
  const [showEnglish, setShowEnglish] = useState(true)
  const [tick, setTick] = useState(0)
  const [run, setRun] = useState<Run | null>(null)
  const [history, setHistory] = useState<TypingResult[]>([])

  const field = useRef<ImeFieldHandle>(null)
  const startedAt = useRef<number | null>(null)
  const keyStats = useRef<KeyStats>(emptyKeyStats)
  const prev = useRef('')
  const stateRef = useRef({ phase, para, typed })
  stateRef.current = { phase, para, typed }

  const tokens = useMemo(() => (para ? tokenize(textOf(para)) : []), [para])
  const st = useMemo(() => analyze(tokens, typed), [tokens, typed])

  const loadHistory = useCallback(async () => {
    const all = await (await db()).getAll('typing')
    setHistory(all.filter((r) => r.mode === 'paragraph').sort((a, b) => a.at - b.at))
  }, [])
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // live stats ticker
  useEffect(() => {
    if (phase !== 'typing') return
    const t = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(t)
  }, [phase])
  useEffect(() => () => stopAudio(), [])

  const playPassage = useCallback(
    (p: Paragraph) => {
      if (!settings.sound) return
      if (p.kind === 'narration') void playItem(p.id, textOf(p), settings.voiceMode)
      else void playSequence(p.lines.map((l, i) => ({ id: `${p.id}#${i}`, text: l.ko })), settings.voiceMode)
    },
    [settings.sound, settings.voiceMode],
  )

  function begin(p: Paragraph) {
    stopAudio()
    setPara(p)
    setTyped('')
    setRun(null)
    prev.current = ''
    startedAt.current = null
    keyStats.current = emptyKeyStats
    setPhase('typing')
    if (settings.autoplay) playPassage(p)
  }

  function finish(value: string) {
    const { para: p } = stateRef.current
    if (!p) return
    stopAudio()
    const final = analyze(tokenize(textOf(p)), value)
    const seconds = startedAt.current ? (performance.now() - startedAt.current) / 1000 : 0
    const minutes = Math.max(seconds, 1) / 60
    const chars = [...missedChars(final.wrongWords).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    const r: Run = {
      wpm: wpm(final.correctBlocks, Math.max(seconds, 1)),
      rawWpm: wpm(final.typedBlocks, Math.max(seconds, 1)),
      keysPerMin: Math.round(final.correctKeys / minutes),
      accuracy: Math.round(accuracy(keyStats.current) * 1000) / 10,
      errors: keyStats.current.wrong,
      seconds: Math.round(seconds),
      chars,
      words: final.wrongWords,
    }
    setRun(r)
    setPhase('results')
    if (value.length > 0) {
      recordActivity(final.words.filter((w) => w.committed).length || 1)
      void db()
        .then((d) =>
          d.add('typing', {
            at: Date.now(),
            mode: 'paragraph',
            itemId: p.id,
            wpm: r.wpm,
            accuracy: r.accuracy,
            errors: r.errors,
            seconds: r.seconds,
            missed: [...new Set(final.wrongWords.map((w) => w[0]))],
          }),
        )
        .then(loadHistory)
    }
  }

  function onValue(value: string) {
    const { phase: ph, para: p } = stateRef.current
    if (ph !== 'typing' || !p) return
    if (startedAt.current === null && value) startedAt.current = performance.now()
    // a keystroke is wrong if it leaves the word you are on off track, or commits a wrong word
    const toks = tokenize(textOf(p))
    const words = value.split(' ')
    const cur = words.length - 1
    let ok = true
    if (value.endsWith(' ') && words.length >= 2) ok = flatten(words[cur - 1]) === flatten(toks[cur - 1] ?? '')
    else ok = flatten(toks[cur] ?? '').startsWith(flatten(words[cur]))
    keyStats.current = countKeystrokes(prev.current, value, ok, keyStats.current)
    prev.current = value
    setTyped(value)
    if (analyze(toks, value).finished) finish(value)
  }

  function onFieldKey(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (para) playPassage(para)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (typed.length > 0) finish(typed)
      else setPhase('pick')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (typed.trim().length > 0) finish(typed) // finish early, keeping what you typed
    }
  }

  useEffect(() => {
    if (phase === 'typing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav(phase === 'results' ? '/' : '/')
      if (e.key === 'Enter' && phase === 'results' && para) begin(para)
      if (e.key === 'Enter' && phase === 'pick' && paragraphs[0]) begin(paragraphs[0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, para, paragraphs])

  const best = (id: string) => history.filter((h) => h.itemId === id).reduce((m, h) => Math.max(m, h.wpm), 0)

  /* ───────────── pick a passage ───────────── */
  if (phase === 'pick') {
    const recent = history.slice(-20)
    const bestOverall = history.reduce((m, h) => Math.max(m, h.wpm), 0)
    return (
      <div className="mx-auto grid max-w-[1000px] gap-5 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Paragraph typing</h1>
          <p className="mt-1 text-muted">Type a whole passage straight through. Press Space after each word. A slip never throws the rest off.</p>
          <div className="mt-4 flex gap-2">
            <Toggle on={showEnglish} onChange={setShowEnglish}>
              Show translation
            </Toggle>
            <Toggle on={settings.autoplay} onChange={(v) => setSettings({ autoplay: v })}>
              Play audio first
            </Toggle>
          </div>
          <div className="mt-4 space-y-3">
            {paragraphs.map((p) => {
              const b = best(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => begin(p)}
                  className="block w-full rounded-2xl border border-line bg-card p-4 text-left transition hover:border-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="ko text-xl">{p.title}</span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted">
                      {p.kind} · {p.source === 'textbook' ? 'textbook' : 'practice'}
                    </span>
                  </div>
                  <div className="text-sm text-muted">{p.titleEn}</div>
                  <div className="mt-2 flex gap-4 text-sm text-muted">
                    <span>{tokenize(textOf(p)).length} words</span>
                    <span>{textOf(p).replace(/ /g, '').length} characters</span>
                    <span>{b ? `best ${b} WPM` : 'not tried yet'}</span>
                  </div>
                </button>
              )
            })}
            {paragraphs.length === 0 && <p className="text-muted">There are no passages in this lesson scope.</p>}
          </div>
        </div>
        <aside className="space-y-4">
          <Card title="Your progress">
            <div className="px-4 pb-3">
              <LineChart points={recent.map((r) => ({ label: when(r.at), value: r.wpm }))} unit="WPM" />
            </div>
            <div className="grid grid-cols-2 border-t border-line text-center">
              <div className="p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">Best</div>
                <div className="text-2xl font-black tabular-nums">{bestOverall || '–'}</div>
              </div>
              <div className="border-l border-line p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">Runs</div>
                <div className="text-2xl font-black tabular-nums">{history.length}</div>
              </div>
            </div>
          </Card>
          {history.length > 0 && (
            <Card title="Recent runs">
              {[...history].reverse().slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-2 text-sm">
                  <span className="text-muted">{when(r.at)}</span>
                  <span className="font-extrabold tabular-nums">{r.wpm} WPM</span>
                  <span className="tabular-nums text-muted">{r.accuracy}%</span>
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    )
  }

  /* ───────────── results ───────────── */
  if (phase === 'results' && run && para) {
    const recent = history.slice(-20)
    return (
      <div className="mx-auto max-w-[860px] px-6 py-8">
        <h1 className="text-3xl font-black tracking-tight">{para.title}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-7">
          <div className="col-span-2 rounded-2xl border border-line bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">WPM</div>
            <div className="text-5xl font-black tabular-nums text-accent">{run.wpm}</div>
          </div>
          <Stat label="Accuracy" value={`${run.accuracy}%`} />
          <Stat label="Raw" value={String(run.rawWpm)} />
          <Stat label="타수 /min" value={String(run.keysPerMin)} />
          <Stat label="Errors" value={String(run.errors)} />
          <Stat label="Time" value={`${run.seconds}s`} />
        </div>
        <p className="mt-2 text-xs text-muted">
          WPM = correct syllable blocks ÷ 5, per minute (spaces after correct words count). Raw counts everything you typed. 타수 is jamo keystrokes in
          correct words per minute, the usual Korean measure. Accuracy counts every keystroke.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card title="Most-missed letters">
            {run.chars.length === 0 ? (
              <p className="px-4 pb-4 text-muted">No wrong syllables. Clean run.</p>
            ) : (
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {run.chars.map(([c, n]) => (
                  <span key={c} className="rounded-lg border border-line bg-card2 px-3 py-1.5">
                    <span className="ko text-2xl text-bad">{c}</span> <span className="text-sm font-bold text-muted">×{n}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>
          <Card title="Missed words">
            {run.words.length === 0 ? (
              <p className="px-4 pb-4 text-muted">Every word was right.</p>
            ) : (
              run.words.map(([target, typedWord], i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-2">
                  <span className="ko text-lg text-good">{target}</span>
                  <span className="ko text-bad line-through decoration-2">{typedWord || '(skipped)'}</span>
                </div>
              ))
            )}
          </Card>
        </div>

        <Card title="WPM over time" className="mt-5">
          <div className="px-4 pb-3">
            <LineChart points={recent.map((r) => ({ label: when(r.at), value: r.wpm }))} unit="WPM" />
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => begin(para)}>
            Try again <kbd className="ml-1 !bg-transparent !text-inherit">Enter</kbd>
          </Button>
          <Button onClick={() => setPhase('pick')}>Pick another passage</Button>
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home <kbd className="ml-2">Esc</kbd>
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── typing ───────────── */
  if (!para) return null
  void tick
  const elapsed = startedAt.current ? (performance.now() - startedAt.current) / 1000 : 0
  const curWord = typed.split(' ').at(-1) ?? ''
  const curOk = st.words[st.current] ? !st.words[st.current].m.status.includes('incorrect') && st.words[st.current].m.overflow === 0 : true
  const liveWpm = elapsed >= 1 ? wpm(st.correctBlocks + (curOk ? curWord.length : 0), elapsed) : 0
  const liveAcc = Math.round(accuracy(keyStats.current) * 100)
  const done = st.words.filter((w) => w.committed).length

  return (
    <div className="mx-auto max-w-[1000px] px-6 pt-6">
      <div className="mb-8 flex items-end gap-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted">WPM</div>
          <div className="text-5xl font-black tabular-nums text-accent">{Math.round(liveWpm)}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Accuracy</div>
          <div className="text-3xl font-black tabular-nums">{liveAcc}%</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Time</div>
          <div className="text-3xl font-black tabular-nums">{Math.floor(elapsed)}s</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Words</div>
          <div className="text-3xl font-black tabular-nums">
            {done}/{tokens.length}
          </div>
        </div>
      </div>

      <div className="relative cursor-text" onClick={() => field.current?.focus()}>
        <div className="ko flex flex-wrap items-end text-[2.3rem] leading-[1.3]" aria-live="polite">
          {tokens.map((tok, i) => (
            <span key={i} className="mb-1 inline-block whitespace-nowrap">
              <TypedWord
                target={tok}
                m={st.words[i].m}
                done={false}
                caret={i === st.current}
                caretEnd={i === st.current && !st.words[i].committed && st.words[i].m.complete && i < tokens.length - 1}
              />
              {i < tokens.length - 1 && <WordGap />}
            </span>
          ))}
        </div>
        <ImeField
          ref={field}
          builtin={settings.builtinKeyboard}
          onValue={onValue}
          onKey={onFieldKey}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>

      {showEnglish && (
        <div className="mt-8 space-y-1 rounded-2xl border border-line bg-card px-5 py-4 text-muted">
          {para.lines.map((l, i) => (
            <div key={i} className="text-[0.95rem]">
              {l.speaker && <span className="ko mr-2 font-bold text-ink">{l.speaker}</span>}
              {l.en}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <span>
          <kbd>Space</kbd> next word
        </span>
        <span>
          <kbd>Backspace</kbd> fix
        </span>
        <span>
          <kbd>Tab</kbd> replay audio
        </span>
        <span>
          <kbd>Enter</kbd> / <kbd>Esc</kbd> finish
        </span>
        <button onClick={() => playPassage(para)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card2 px-2.5 py-1 font-bold hover:border-muted">
          <Icon name="volume" size={16} /> Play
        </button>
        <Toggle on={showEnglish} onChange={setShowEnglish}>
          Translation
        </Toggle>
      </div>
    </div>
  )
}
