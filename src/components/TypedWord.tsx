import glyphData from '../data/glyphs.json'
import { flattenChar, type MatchResult } from '../lib/hangul'

/**
 * The word being typed, drawn from real glyph outlines (see scripts/build-glyphs.mjs).
 *
 * Every Hangul syllable is split into its letters, one vector shape per keystroke, so a letter turns white the moment it
 * is typed and the rest of the block stays dim: no clipping, no bleed into the next letter. Syllables sit at the font's
 * natural advance width, so words look the way they do in normal text.
 */
interface Glyph {
  a: number // advance width, em/1000
  k: string[] // one SVG path per keystroke (a single path for non-Hangul characters)
}
const GLYPHS = glyphData as unknown as Record<string, Glyph>

const TOP = -860 // viewBox top (y is negative above the baseline)
const HEIGHT = 980

export function hasGlyphs(text: string): boolean {
  return [...text].every((c) => GLYPHS[c] !== undefined)
}

function advanceOf(ch: string): number {
  return GLYPHS[ch]?.a ?? 940
}

/** Where the text cursor goes inside a word: before the first letter of the next block, or after the last block. */
function caretIndex(m: MatchResult, len: number, caret: boolean, caretEnd: boolean): number | null {
  if (caretEnd) return len
  if (!caret || m.overflow > 0 || m.status.includes('active')) return null
  const i = m.status.findIndex((x) => x === 'pending')
  return i >= 0 ? i : null
}

export function TypedWord({ target, m, done, caret = false, caretEnd = false }: { target: string; m: MatchResult; done: boolean; caret?: boolean; caretEnd?: boolean }) {
  const chars = [...target]
  let x = 0
  const placed = chars.map((ch) => {
    const at = x
    x += advanceOf(ch)
    return at
  })
  const width = x
  const ci = done ? null : caretIndex(m, chars.length, caret, caretEnd)
  const caretX = ci === null ? 0 : ci >= chars.length ? width : placed[ci]
  return (
    <>
      <svg
        viewBox={`0 ${TOP} ${width} ${HEIGHT}`}
        style={{ width: `${width / 1000}em`, height: `${HEIGHT / 1000}em` }}
        className="inline-block overflow-visible align-bottom"
        role="img"
        aria-label={target}
      >
        {chars.map((ch, i) => {
          const g = GLYPHS[ch]
          const status = m.status[i]
          const active = status === 'active'
          const lit = m.lit[i]
          const isLit = (j: number) => status === 'incorrect' || done || status === 'correct' || j < lit
          const color = status === 'incorrect' ? 'fill-bad' : done ? 'fill-good' : 'fill-ink'
          return (
            <g key={i} transform={`translate(${placed[i]} 0)`}>
              {active && <rect x={-12} y={TOP + 10} width={advanceOf(ch) + 24} height={HEIGHT - 20} rx={70} className="fill-card2" />}
              {g ? (
                <>
                  {/* Neighbouring letters can overlap slightly in the font. Fills are opaque and typed letters are
                      drawn last, so an overlap is never visible. */}
                  {g.k.map((d, j) => !isLit(j) && <path key={`d${j}`} d={d} className="fill-dim" />)}
                  {g.k.map((d, j) => isLit(j) && <path key={`l${j}`} d={d} className={`${color} transition-colors duration-100`} />)}
                </>
              ) : (
                <text y={0} fontSize={1000} className={isLit(0) ? color : 'fill-dim'}>
                  {ch}
                </text>
              )}
            </g>
          )
        })}
        {ci !== null && (
          <rect
            x={caretX - 18}
            y={TOP + 40}
            width={36}
            height={HEIGHT - 80}
            rx={18}
            className="fill-accent"
            style={{ animation: 'caret-blink 1.1s step-end infinite' }}
          />
        )}
      </svg>
      {m.overflow > 0 && <span className="text-bad">{'·'.repeat(m.overflow)}</span>}
    </>
  )
}

/** Row of the keystrokes the word needs; typed ones turn white, the next one is outlined. */
export function KeyRow({ target, m }: { target: string; m: MatchResult }) {
  const chars = [...target]
  let next = -1 // global index of the next key to press
  let g = 0
  const groups = chars.map((ch, i) => {
    const keys = [...flattenChar(ch)]
    const lit = m.lit[i]
    const items = keys.map((k, j) => {
      const idx = g++
      if (next < 0 && (m.status[i] === 'pending' || m.status[i] === 'active') && j === lit) next = idx
      return { k, state: j < lit ? 'typed' : idx === next ? 'next' : 'pending' }
    })
    return { ch, items, bad: m.status[i] === 'incorrect' }
  })
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-2" aria-hidden>
      {groups.map((grp, i) =>
        grp.ch === ' ' ? (
          <span key={i} className="w-3" />
        ) : (
          <span key={i} className="inline-flex gap-1">
            {grp.items.map((it, j) => (
              <span
                key={j}
                className={`ko inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-1 text-lg transition-colors ${
                  grp.bad
                    ? 'border-bad/50 text-bad'
                    : it.state === 'typed'
                      ? 'border-line bg-card2 text-ink'
                      : it.state === 'next'
                        ? 'border-accent text-accent'
                        : 'border-line text-muted/60'
                }`}
              >
                {it.k}
              </span>
            ))}
          </span>
        ),
      )}
    </div>
  )
}

/** The normal gap between two words (the text cursor shows where a space is due, so the gap itself stays empty). */
export const WordGap = () => <span aria-hidden className="inline-block w-[0.32em]" />

/**
 * A whole sentence: each space-separated word is drawn as its own unit so long lines wrap like normal text,
 * while letters still light up one by one.
 */
export function TypedText({ target, m, done }: { target: string; m: MatchResult; done: boolean }) {
  let offset = 0
  const toks = target.split(' ')
  return (
    <>
      {toks.map((tok, i) => {
        const len = [...tok].length
        const start = offset
        const sub: MatchResult = { ...m, status: m.status.slice(offset, offset + len), lit: m.lit.slice(offset, offset + len), overflow: 0 }
        const spaceAt = start + len // index of the space after this word
        offset += len + 1 // the space between words
        const inWord = m.cursor >= start && m.cursor < spaceAt
        const atEnd = m.cursor === spaceAt && i < toks.length - 1 && m.overflow === 0
        return (
          <span key={i} className="inline-block whitespace-nowrap">
            <TypedWord target={tok} m={sub} done={done} caret={inWord} caretEnd={atEnd} />
            {i < toks.length - 1 && <WordGap />}
          </span>
        )
      })}
      {m.overflow > 0 && <span className="text-bad">{'·'.repeat(m.overflow)}</span>}
    </>
  )
}
