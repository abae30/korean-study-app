import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Card'
import { CardFace } from '../components/CardFaces'
import { Icon } from '../components/Icon'
import { LEAVE_MS, SwipeCard } from '../components/SwipeCard'
import { studyVocab, vocabById } from '../data'
import { playItem, stopAudio } from '../lib/audio'
import { db } from '../lib/db'
import { startOfStudyDay } from '../lib/day'
import { queueView, type SrsItem } from '../lib/srs/queue'
import { DAY, GRADE_NAMES, formatInterval, newState, previewLabels, schedule, type Grade } from '../lib/srs/scheduler'
import type { SrsState } from '../lib/srs/types'
import { putSrs } from '../lib/db'
import { useApp } from '../store/app'

interface Undo {
  prev: SrsState | undefined
  next: SrsState
  logId: number
}

const GRADE_STYLE: Record<Grade, string> = {
  1: 'border-bad/50 text-bad',
  2: 'border-warn/50 text-warn',
  3: 'border-good/50 text-good',
  4: 'border-accent/60 text-accent',
}

export default function Review() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const weakOnly = !!params.get('weak')
  const { scope, srs, stars, settings, toggleStar, recordActivity, upsertSrs, removeSrs } = useApp()

  const [states, setStates] = useState(() => new Map(srs.map((s) => [s.id, s])))
  const [now, setNow] = useState(() => Date.now())
  const [extraNew, setExtraNew] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [front, setFront] = useState<'ko' | 'en'>('ko')
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [undoStack, setUndoStack] = useState<Undo[]>([])
  const [answered, setAnswered] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  const items: SrsItem[] = useMemo(() => {
    let v = studyVocab(scope, settings.newWordsOnly)
    if (weakOnly) v = v.filter((x) => states.get(x.id)?.weak)
    return v.map((x) => ({ id: x.id, deck: 'vocab' as const }))
    // weak-only keeps the set it started with; recomputing as cards are fixed would make the queue vanish mid-session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, weakOnly, settings.newWordsOnly])

  const view = useMemo(
    () => queueView(items, states, now, weakOnly ? 10_000 : settings.newPerDay + extraNew),
    [items, states, now, settings.newPerDay, extraNew, weakOnly],
  )
  const pick = view.next
  const vocab = pick ? vocabById.get(pick.id) : undefined
  const card = vocab && { kind: 'vocab' as const, ko: vocab.ko, en: vocab.en, pos: vocab.pos, note: vocab.note, forms: vocab.forms }

  // choose which side faces up when a new card appears
  useEffect(() => {
    setFlipped(false)
    const d = settings.flipDirection
    setFront(d === 'ko-en' ? 'ko' : d === 'en-ko' ? 'en' : Math.random() < 0.5 ? 'ko' : 'en')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick?.id])

  // when nothing is showable yet (a learning card is waiting), poll for it
  useEffect(() => {
    if (pick) return
    const t = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(t)
  }, [pick])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      stopAudio()
    },
    [],
  )

  const koUp = card ? (front === 'ko') !== flipped : false
  const speak = useCallback(() => {
    if (vocab && settings.sound) void playItem(vocab.id, vocab.ko, settings.voiceMode)
  }, [vocab, settings.sound, settings.voiceMode])
  useEffect(() => {
    if (vocab && koUp && settings.autoplay) speak()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab?.id, koUp])

  const grade = useCallback(
    (g: Grade) => {
      if (!vocab || !flipped || leaving) return
      setLeaving(g === 1 ? 'left' : 'right')
      timer.current = window.setTimeout(async () => {
        const t = Date.now()
        const prev = states.get(vocab.id)
        const next = schedule(prev ?? newState(vocab.id, 'vocab', undefined, t), g, t)
        await putSrs(next)
        const logId = (await (await db()).add('reviewlog', {
          at: t,
          itemId: vocab.id,
          deck: 'vocab',
          grade: g,
          intervalBefore: prev?.interval ?? 0,
          intervalAfter: next.phase === 'review' ? next.interval : 0,
        })) as number
        upsertSrs(next)
        recordActivity(1)
        setStates((m) => new Map(m).set(next.id, next))
        setUndoStack((u) => [...u, { prev, next, logId }])
        setAnswered((n) => n + 1)
        setNow(t)
        setFlipped(false)
        setLeaving(null)
      }, LEAVE_MS)
    },
    [vocab, flipped, leaving, states, upsertSrs, recordActivity],
  )

  const undo = useCallback(async () => {
    const last = undoStack.at(-1)
    if (!last || leaving) return
    const d = await db()
    await d.delete('reviewlog', last.logId)
    if (last.prev) {
      await putSrs(last.prev)
      upsertSrs(last.prev)
    } else {
      await d.delete('srs', last.next.id)
      removeSrs(last.next.id)
    }
    setStates((m) => {
      const n = new Map(m)
      if (last.prev) n.set(last.prev.id, last.prev)
      else n.delete(last.next.id)
      return n
    })
    setUndoStack((u) => u.slice(0, -1))
    setAnswered((n) => Math.max(0, n - 1))
    setNow(Date.now())
    setFlipped(false)
  }, [undoStack, leaving, upsertSrs, removeSrs])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'Escape') return nav('/')
      if (k === 'z' || k === 'Z' || k === 'Backspace') return void (e.preventDefault(), undo())
      if (!vocab) return
      if (k === 'p' || k === 'P') return speak()
      if (k === 's' || k === 'S') return toggleStar(vocab.id)
      if (!flipped) {
        if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'ArrowDown') (e.preventDefault(), !leaving && setFlipped(true))
        return
      }
      if (k === '1') grade(1)
      else if (k === '2') grade(2)
      else if (k === '3' || k === ' ' || k === 'Enter') (e.preventDefault(), grade(3))
      else if (k === '4') grade(4)
      else if (k === 'ArrowLeft') (e.preventDefault(), grade(1))
      else if (k === 'ArrowRight') (e.preventDefault(), grade(3))
      else if (k === 'ArrowUp' || k === 'ArrowDown') (e.preventDefault(), setFlipped(false))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [vocab, flipped, leaving, grade, undo, speak, toggleStar, nav])

  /* ───────────── nothing to show ───────────── */
  if (!pick || !card || !vocab) {
    const mine = items.map((i) => states.get(i.id)).filter((s): s is SrsState => !!s)
    const nextReview = mine.filter((s) => s.phase === 'review').reduce<number | null>((m, s) => (m === null || s.due < m ? s.due : m), null)
    const fresh = items.filter((i) => !states.get(i.id) || states.get(i.id)!.phase === 'new').length
    const nextDay = nextReview !== null ? Math.max(1, Math.round((startOfStudyDay(nextReview, 0) - startOfStudyDay(now, 0)) / DAY)) : null
    return (
      <div className="mx-auto max-w-[620px] px-6 py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-good/50 text-good">
          <Icon name="check" size={30} />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight">{items.length === 0 ? 'No cards here' : answered > 0 ? 'All done for now' : 'Nothing due right now'}</h1>
        <p className="mt-2 text-muted">
          {items.length === 0
            ? weakOnly
              ? 'You have no weak words in this scope. Mistakes in typing and review land here.'
              : 'There is nothing in this lesson scope.'
            : view.nextLearningAt
              ? `The next card comes back in ${formatInterval(view.nextLearningAt - now)}. This page picks it up automatically.`
              : nextDay !== null
                ? `Your next review is in ${nextDay} ${nextDay === 1 ? 'day' : 'days'}.`
                : 'You have worked through everything for today.'}
        </p>
        {answered > 0 && <p className="mt-1 text-sm text-muted">{answered} answered this session.</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!weakOnly && fresh > 0 && <Button onClick={() => setExtraNew((n) => n + 5)}>Learn {Math.min(5, fresh)} more new cards</Button>}
          {undoStack.length > 0 && <Button onClick={undo}>Undo last answer</Button>}
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home <kbd className="ml-2">Esc</kbd>
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── a card ───────────── */
  const labels = previewLabels(states.get(vocab.id) ?? newState(vocab.id, 'vocab', undefined, now), Date.now())
  const starred = stars.includes(vocab.id)
  const kind = pick.kind === 'ahead' ? 'learning' : pick.kind
  const cnt = (k: 'new' | 'learning' | 'review', label: string, tone: string) => (
    <span className={`font-extrabold tabular-nums ${tone} ${kind === k ? 'underline decoration-2 underline-offset-4' : 'opacity-70'}`}>
      {view.counts[k]} <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    </span>
  )

  return (
    <div className="mx-auto max-w-[820px] px-6 pt-6">
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
        {cnt('new', 'new', 'text-accent')}
        {cnt('learning', 'learning', 'text-bad')}
        {cnt('review', 'due', 'text-good')}
        {weakOnly && <span className="rounded-md border border-warn/50 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-warn">weak items only</span>}
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!undoStack.length}
            className="inline-flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold hover:border-muted disabled:opacity-40"
          >
            Undo <kbd className="ml-2">Z</kbd>
          </button>
        </span>
      </div>

      <SwipeCard
        cardKey={`${vocab.id}-${states.get(vocab.id)?.reps ?? 0}`}
        front={<CardFace card={card} side={front} />}
        back={<CardFace card={card} side={front === 'ko' ? 'en' : 'ko'} />}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onSwipe={flipped ? (side) => grade(side === 'right' ? 3 : 1) : undefined}
        leaving={leaving}
        hints={{ left: { text: 'Again', tone: 'bad' }, right: { text: 'Good', tone: 'good' } }}
        overlay={
          <>
            <div className="absolute left-4 top-4 flex gap-2">
              <button onClick={speak} aria-label="Play audio" className="grid size-10 place-items-center rounded-full border border-line bg-card2 text-muted hover:text-ink">
                <Icon name="volume" size={18} />
              </button>
            </div>
            <button
              onClick={() => toggleStar(vocab.id)}
              aria-pressed={starred}
              aria-label="Star card"
              className={`absolute right-4 top-4 grid size-10 place-items-center rounded-full border bg-card2 ${starred ? 'border-warn text-warn' : 'border-line text-muted hover:text-ink'}`}
            >
              <Icon name="star" size={18} />
            </button>
          </>
        }
      />

      <div className="mt-8 flex min-h-[84px] items-start justify-center">
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="inline-flex h-14 min-w-[260px] items-center justify-center gap-3 rounded-xl border border-line bg-card2 px-8 text-lg font-extrabold hover:border-muted"
          >
            Show answer <kbd>Space</kbd>
          </button>
        ) : (
          <div className="grid w-full max-w-[640px] grid-cols-4 gap-3">
            {([1, 2, 3, 4] as Grade[]).map((g) => (
              <button
                key={g}
                onClick={() => grade(g)}
                className={`flex h-[72px] flex-col items-center justify-center rounded-xl border bg-card transition hover:bg-card2 ${GRADE_STYLE[g]}`}
              >
                <span className="text-xs font-bold text-muted">{labels[g]}</span>
                <span className="text-lg font-extrabold">{GRADE_NAMES[g]}</span>
                <kbd className="mt-0.5 !px-1.5 !py-0">{g}</kbd>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted">
        <span>
          <kbd>←</kbd> again · <kbd>→</kbd> good
        </span>
        <span>
          <kbd>P</kbd> audio
        </span>
        <span>
          <kbd>S</kbd> star
        </span>
        <span>
          <kbd>Esc</kbd> home
        </span>
      </div>
    </div>
  )
}
