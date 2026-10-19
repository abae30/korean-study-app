import type { FlashCard } from '../lib/deck'

/** One face of a flashcard: the Korean side or the English side. */
export function CardFace({ card, side }: { card: Pick<FlashCard, 'ko' | 'en' | 'kind' | 'pos' | 'note' | 'forms'>; side: 'ko' | 'en' }) {
  const sentence = card.kind === 'sentence'
  if (side === 'ko')
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className={`ko leading-snug ${sentence ? 'text-4xl' : card.ko.length > 6 ? 'text-6xl' : 'text-7xl'}`}>{card.ko}</div>
        {card.forms && <div className="ko mt-3 text-xl text-muted">{card.forms.join(' · ')}</div>}
      </div>
    )
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className={`font-extrabold ${sentence || card.en.length > 28 ? 'text-3xl' : 'text-4xl'}`}>{card.en}</div>
      {card.pos && <span className="mt-3 rounded-md border border-line px-1.5 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">{card.pos}</span>}
      {card.note && <div className="mt-2 max-w-md text-sm text-muted">{card.note}</div>}
    </div>
  )
}
