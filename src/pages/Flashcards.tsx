import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/Card'
import { Seg, Stat, Toggle } from '../components/Controls'
import { CardFace } from '../components/CardFaces'
import { Icon } from '../components/Icon'
import { LEAVE_MS, SwipeCard } from '../components/SwipeCard'
import { sentencesIn, studyVocab } from '../data'
import { playItem, stopAudio } from '../lib/audio'
import { buildDeck, type FlashCard } from '../lib/deck'
import { useApp } from '../store/app'

type Verdict = 'know' | 'learning'

export default function Flashcards() {
  const nav = useNavigate()
  const { scope, stars, settings, setSettings, toggleStar, recordActivity } = useApp()
  const [starredOnly, setStarredOnly] = useState(false)

  const vocab = useMemo(() => studyVocab(scope, settings.newWordsOnly), [scope, settings.newWordsOnly])
  const sentences = useMemo(() => sentencesIn(scope), [scope])

  const [deck, setDeck] = useState<FlashCard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<string[]>([])
  const [learning, setLearning] = useState<string[]>([])
  const [history, setHistory] = useState<{ id: string; v: Verdict }[]>([])
  const [leaving, setLeaving] = useState<Verdict | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const rebuild = useCallback(
    (cards?: FlashCard[]) => {
      window.clearTimeout(timer.current)
      const next =
        cards ??
        buildDeck({
          vocab,
          sentences,
          includeSentences: settings.flashSentences,
          starredOnly,
          stars,
          direction: settings.flipDirection,
          shuffle: settings.shuffle,
        })
      setDeck(next)
      setIdx(0)
      setFlipped(false)
      setKnown([])
      setLearning([])
      setHistory([])
      setLeaving(null)
    },
    // `stars` is deliberately not a dependency: starring a card mid-round must not reshuffle the deck
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocab, sentences, settings.flashSentences, settings.flipDirection, settings.shuffle, starredOnly],
  )

  // (re)build whenever the deck-defining options change
  useEffect(() => {
    rebuild()
  }, [rebuild])
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      stopAudio()
    },
    [],
  )

  const finished = deck.length > 0 && idx >= deck.length
  const card = deck[idx]
  const koUp = card ? (card.front === 'ko') !== flipped : false // is the Korean side facing up?

  const speak = useCallback(
    (c: FlashCard) => {
      if (settings.sound) void playItem(c.id, c.ko, settings.voiceMode)
    },
    [settings.sound, settings.voiceMode],
  )

  // autoplay whenever the Korean side becomes visible
  useEffect(() => {
    if (card && koUp && settings.autoplay) speak(card)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, koUp])

  const decide = useCallback(
    (v: Verdict) => {
      if (!card || leaving) return
      setLeaving(v)
      timer.current = window.setTimeout(() => {
        if (v === 'know') setKnown((k) => [...k, card.id])
        else setLearning((l) => [...l, card.id])
        setHistory((h) => [...h, { id: card.id, v }])
        recordActivity(1)
        setLeaving(null)
        setFlipped(false)
        setIdx((i) => i + 1)
      }, LEAVE_MS)
    },
    [card, leaving, recordActivity],
  )

  const undo = useCallback(() => {
    if (leaving) return
    const last = history.at(-1)
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    if (last.v === 'know') setKnown((k) => k.slice(0, -1))
    else setLearning((l) => l.slice(0, -1))
    setIdx((i) => Math.max(0, i - 1))
    setFlipped(false)
  }, [history, leaving])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'Escape') nav('/')
      else if (finished || !card) return
      else if (k === ' ') (e.preventDefault(), !leaving && setFlipped((f) => !f))
      else if (k === 'ArrowRight') (e.preventDefault(), decide('know'))
      else if (k === 'ArrowLeft') (e.preventDefault(), decide('learning'))
      else if (k === 'ArrowUp' || k === 'ArrowDown') (e.preventDefault(), !leaving && setFlipped((f) => !f))
      else if (k === 's' || k === 'S') toggleStar(card.id)
      else if (k === 'p' || k === 'P') speak(card)
      else if (k === 'Backspace' || k === 'z' || k === 'Z') (e.preventDefault(), undo())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, finished, leaving, decide, undo, toggleStar, speak, nav])

  /* ───────────── no cards ───────────── */
  if (deck.length === 0) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
        <h1 className="text-3xl font-black tracking-tight">Flashcards</h1>
        <p className="mt-3 text-muted">{starredOnly ? 'No starred cards in this scope yet. Star cards while studying (S).' : 'No cards in this scope.'}</p>
        <div className="mt-5 flex justify-center gap-3">
          {starredOnly && <Button onClick={() => setStarredOnly(false)}>Show all cards</Button>}
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── end of round ───────────── */
  if (finished) {
    const learningCards = deck.filter((c) => learning.includes(c.id))
    return (
      <div className="mx-auto max-w-[620px] px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Round complete</h1>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Know" value={String(known.length)} />
          <Stat label="Still learning" value={String(learning.length)} />
          <Stat label="Cards" value={String(deck.length)} />
        </div>
        {learningCards.length > 0 && (
          <Card title="Still learning" className="mt-5">
            {learningCards.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-2.5">
                <span className="ko text-lg">{c.ko}</span>
                <span className="text-right text-muted">{c.en}</span>
              </div>
            ))}
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {learningCards.length > 0 && (
            <Button variant="primary" onClick={() => rebuild(learningCards.map((c) => ({ ...c })))}>
              Review the {learningCards.length} I missed
            </Button>
          )}
          <Button onClick={() => rebuild()}>Restart all</Button>
          <Link to="/" className="inline-flex items-center rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
            Home <kbd className="ml-2">Esc</kbd>
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────── studying ───────────── */
  const starred = stars.includes(card.id)

  const front = <CardFace card={card} side={card.front} />
  const back = <CardFace card={card} side={card.front === 'ko' ? 'en' : 'ko'} />

  return (
    <div className="mx-auto max-w-[820px] px-6 pt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Seg
          small
          value={settings.flipDirection}
          onChange={(v) => setSettings({ flipDirection: v })}
          options={[
            ['ko-en', 'Korean first'],
            ['en-ko', 'English first'],
            ['random', 'Random'],
          ]}
        />
        <Toggle on={settings.shuffle} onChange={(v) => setSettings({ shuffle: v })}>
          Shuffle
        </Toggle>
        <Toggle on={settings.autoplay} onChange={(v) => setSettings({ autoplay: v })}>
          Auto-play audio
        </Toggle>
        <Toggle on={settings.newWordsOnly} onChange={(v) => setSettings({ newWordsOnly: v })}>
          New words only
        </Toggle>
        <Toggle on={settings.flashSentences} onChange={(v) => setSettings({ flashSentences: v })}>
          + Sentences
        </Toggle>
        <Toggle on={starredOnly} onChange={setStarredOnly}>
          ★ Starred only
        </Toggle>
        <button
          onClick={() => rebuild()}
          className="ml-auto inline-flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold hover:border-muted"
        >
          Restart
        </button>
      </div>

      <div className="mb-8 flex items-center gap-4 text-sm font-bold text-muted">
        <span className="tabular-nums">
          {idx + 1} / {deck.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(idx / deck.length) * 100}%` }} />
        </div>
        <span className="text-good tabular-nums">✓ {known.length}</span>
        <span className="text-warn tabular-nums">↺ {learning.length}</span>
      </div>

      <SwipeCard
        cardKey={card.id}
        front={front}
        back={back}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onSwipe={(side) => decide(side === 'right' ? 'know' : 'learning')}
        leaving={leaving === 'know' ? 'right' : leaving === 'learning' ? 'left' : null}
        hints={{ left: { text: 'Still learning', tone: 'warn' }, right: { text: 'Know', tone: 'good' } }}
        overlay={
          <>
            <div className="absolute left-4 top-4 flex gap-2">
              <button
                onClick={() => speak(card)}
                aria-label="Play audio"
                className="grid size-10 place-items-center rounded-full border border-line bg-card2 text-muted hover:text-ink"
              >
                <Icon name="volume" size={18} />
              </button>
            </div>
            <button
              onClick={() => toggleStar(card.id)}
              aria-pressed={starred}
              aria-label="Star card"
              className={`absolute right-4 top-4 grid size-10 place-items-center rounded-full border bg-card2 ${starred ? 'border-warn text-warn' : 'border-line text-muted hover:text-ink'}`}
            >
              <Icon name="star" size={18} />
            </button>
          </>
        }
      />

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={() => decide('learning')}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-warn/50 bg-card px-5 font-extrabold text-warn hover:bg-card2"
        >
          ← Still learning
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-card2 px-5 font-extrabold hover:border-muted"
        >
          Flip <kbd>Space</kbd>
        </button>
        <button
          onClick={() => decide('know')}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-good/50 bg-card px-5 font-extrabold text-good hover:bg-card2"
        >
          I know this →
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted">
        <span>
          <kbd>←</kbd> <kbd>→</kbd> sort
        </span>
        <span>
          <kbd>P</kbd> audio
        </span>
        <span>
          <kbd>S</kbd> star
        </span>
        <span>
          <kbd>Backspace</kbd> undo
        </span>
        <span>
          <kbd>Esc</kbd> home
        </span>
      </div>
    </div>
  )
}
