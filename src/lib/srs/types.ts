// SRS state shared by every mode. The scheduler itself (SM-2) lands in step (f) behind this interface.
export type SrsDeck = 'vocab' | 'grammar'
export type SrsPhase = 'new' | 'learning' | 'review' | 'relearning'

export interface SrsState {
  id: string // item id: a Vocab.id or an Exercise.id
  deck: SrsDeck
  phase: SrsPhase
  ease: number // SM-2 ease factor, e.g. 2.5
  interval: number // days (0 while in learning steps)
  due: number // epoch ms
  step: number // index into learning steps while learning/relearning
  lapses: number
  reps: number
  /** Flagged by typing/grammar mistakes; pushes the item to review sooner. */
  weak: boolean
  lastReview: number | null
  /** Study day (YYYY-MM-DD) the card was first answered; counts against the daily new-card limit. */
  introduced: string | null
}
