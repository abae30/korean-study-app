import { useRef, useState, type ReactNode } from 'react'

const SWIPE_AT = 110 // px of drag that counts as a decision
export const LEAVE_MS = 190

export type Side = 'left' | 'right'
export interface Hint {
  text: string
  tone: 'good' | 'warn' | 'bad'
}

interface Props {
  cardKey: string
  front: ReactNode
  back: ReactNode
  flipped: boolean
  onFlip: () => void
  /** Called when the card is dragged far enough. Omit to disable swiping (clicking still flips). */
  onSwipe?: (side: Side) => void
  /** Set by the parent while the card is flying off after a decision. */
  leaving: Side | null
  hints: { left: Hint; right: Hint }
  /** Buttons that stay put while the card turns. */
  overlay?: ReactNode
}

const toneClass = { good: 'border-good text-good', warn: 'border-warn text-warn', bad: 'border-bad text-bad' }

/** A flip card you can click to turn and drag left/right to decide. */
export function SwipeCard({ cardKey, front, back, flipped, onFlip, onSwipe, leaving, hints, overlay }: Props) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)

  const out = leaving === 'right' ? 700 : leaving === 'left' ? -700 : dx
  const side: Side | null = onSwipe ? (out > 30 ? 'right' : out < -30 ? 'left' : null) : null

  function down(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { x: e.clientX, moved: false }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d || !onSwipe) return
    const delta = e.clientX - d.x
    if (Math.abs(delta) > 6) d.moved = true
    setDx(delta)
  }
  function up(e: React.PointerEvent) {
    const d = drag.current
    drag.current = null
    setDragging(false)
    if (!d) return
    const delta = e.clientX - d.x
    if (!d.moved || !onSwipe) {
      setDx(0)
      if (!leaving && (!d.moved || Math.abs(delta) < 6)) onFlip()
    } else if (delta > SWIPE_AT) (setDx(0), onSwipe('right'))
    else if (delta < -SWIPE_AT) (setDx(0), onSwipe('left'))
    else setDx(0)
  }

  return (
    <div
      className="relative mx-auto h-[360px] w-full max-w-[640px] touch-none select-none"
      style={{ perspective: '1400px' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        key={cardKey}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${out}px) rotate(${out / 28}deg)`,
          opacity: leaving ? 0 : 1,
          transition: dragging ? 'none' : `transform ${LEAVE_MS}ms ease-out, opacity ${LEAVE_MS}ms ease-out`,
        }}
      >
        <div
          className="relative h-full w-full motion-reduce:!transition-none"
          style={{ transformStyle: 'preserve-3d', transition: 'transform 450ms cubic-bezier(.4,.2,.2,1)', transform: `rotateY(${flipped ? 180 : 0}deg)` }}
        >
          <div className="absolute inset-0 rounded-3xl border border-line bg-card" style={{ backfaceVisibility: 'hidden' }}>
            {front}
          </div>
          <div className="absolute inset-0 rounded-3xl border border-line bg-card" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            {back}
          </div>
        </div>
        {overlay}
        {side && (
          <div
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-xl border-2 px-4 py-2 text-xl font-black uppercase tracking-wide ${toneClass[hints[side].tone]} ${
              side === 'right' ? 'right-6 -rotate-6' : 'left-6 rotate-6'
            }`}
            style={{ opacity: Math.min(1, Math.abs(out) / SWIPE_AT) }}
          >
            {hints[side].text}
          </div>
        )}
      </div>
    </div>
  )
}
