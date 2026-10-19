// Builds src/data/glyphs.json: vector outlines of every character used in the lessons, with each Hangul syllable split
// into its individual letters (one SVG path per keystroke). The typing screens draw words from these paths so each letter
// can light up on its own, and syllables sit at the font's natural width.   `npm run build-glyphs`
//
// Font: Gothic A1 Bold (SIL OFL), chosen because its letters inside a syllable are separate shapes (they don't touch).
// Re-run after importing a lesson; `npm run validate-content` fails if a character has no glyph.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as opentype from 'opentype.js/dist/opentype.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = 'gothic-a1'
const WEIGHT = 700
const FD = join(ROOT, 'node_modules', '@fontsource', PKG)
const css = readFileSync(join(FD, `${WEIGHT}.css`), 'utf8')
const slices = [...css.matchAll(new RegExp(`${PKG}-([\\w-]+)-${WEIGHT}-normal\\.woff\\) format\\('woff'\\);\\s*unicode-range: ([^;]+);`, 'g'))].map(
  ([, id, r]) => ({ id, ranges: r.split(',').map((x) => x.trim().slice(2).split('-').map((h) => parseInt(h, 16))) }),
)
const fonts = new Map()
function fontFor(cp) {
  for (const s of slices)
    if (s.ranges.some(([a, z]) => cp >= a && cp <= (z ?? a))) {
      if (!fonts.has(s.id)) {
        const buf = readFileSync(join(FD, 'files', `${PKG}-${s.id}-${WEIGHT}-normal.woff`))
        fonts.set(s.id, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)))
      }
      return fonts.get(s.id)
    }
}

// ───────── Hangul structure ─────────
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const SPLIT = { ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ', ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ' }
SPLIT['ㅄ'] = 'ㅂㅅ'
const VERTICAL = new Set('ㅏㅐㅑㅒㅓㅔㅕㅖㅣ')

function structure(ch) {
  const n = ch.charCodeAt(0) - 0xac00
  const jung = [...(SPLIT[JUNG[Math.floor((n % 588) / 28)]] ?? JUNG[Math.floor((n % 588) / 28)])]
  const jongRaw = JONG[n % 28]
  const jong = jongRaw ? [...(SPLIT[jongRaw] ?? jongRaw)] : []
  const kind = jung.length === 2 ? 'mixed' : VERTICAL.has(jung[0]) ? 'vertical' : 'horizontal'
  return { nKeys: 1 + jung.length + jong.length, nJung: jung.length, nJong: jong.length, kind }
}

// ───────── outlines ─────────
const EM = 1000
const TOP = -843 // top of the Hangul cell in em/1000 units (y is negative above the baseline)
const CELL_H = 939
const num = (v) => Math.round(v)
function contoursOf(font, ch) {
  const g = font.charToGlyph(ch)
  const path = g.getPath(0, 0, EM)
  const list = []
  for (const c of path.commands) {
    if (c.type === 'M') list.push([])
    list.at(-1).push(c)
  }
  return {
    adv: num((g.advanceWidth / font.unitsPerEm) * EM),
    contours: list.map((cmds) => {
      const pts = cmds.flatMap((c) => [[c.x, c.y], c.x1 !== undefined ? [c.x1, c.y1] : null, c.x2 !== undefined ? [c.x2, c.y2] : null].filter(Boolean))
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
      return { cmds, bb, cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2 }
    }),
  }
}
const toD = (cmds) =>
  cmds
    .map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${num(c.x)} ${num(c.y)}`
      if (c.type === 'Q') return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
      if (c.type === 'C') return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
      return 'Z'
    })
    .join('')

// Assign each outline to the keystroke (letter) it belongs to, by where its centre sits in the syllable block.
function assign(adv, contours, s) {
  const keys = Array.from({ length: s.nKeys }, () => [])
  const hasJong = s.nJong > 0
  const jongKeys = []
  for (const c of contours) {
    const fx = c.cx / adv
    const fy = (c.cy - TOP) / CELL_H
    let k
    if (hasJong && fy > 0.66) {
      jongKeys.push(c)
      continue
    }
    if (s.kind === 'vertical') k = fx > 0.55 ? 1 : 0
    else if (s.kind === 'horizontal') k = fy < (hasJong ? 0.33 : 0.47) ? 0 : 1
    else k = fx > 0.58 ? 2 : fy < (hasJong ? 0.33 : 0.47) ? 0 : 1
    keys[k].push(c)
  }
  if (hasJong) {
    const base = 1 + s.nJung
    if (s.nJong === 1) keys[base].push(...jongKeys)
    else {
      // two final consonants: split the outlines into a left group and a right group at the widest gap
      const sorted = [...jongKeys].sort((a, b) => a.cx - b.cx)
      let cut = 1
      let best = -1
      for (let i = 1; i < sorted.length; i++) if (sorted[i].cx - sorted[i - 1].cx > best) ((best = sorted[i].cx - sorted[i - 1].cx), (cut = i))
      keys[base].push(...sorted.slice(0, cut))
      keys[base + 1].push(...sorted.slice(cut))
    }
  }
  return keys
}

// ───────── corpus ─────────
const lessonDir = join(ROOT, 'src', 'data', 'lessons')
// Only characters that can actually be typed: strings of ko text, not JSON punctuation or English.
const typed = new Set()
const sampleDir = join(ROOT, 'src', 'data', 'sample')
const files = [
  ...(existsSync(lessonDir) ? readdirSync(lessonDir).filter((f) => /^lesson-\d+\.json$/.test(f)).map((f) => join(lessonDir, f)) : []),
  ...(existsSync(sampleDir) ? readdirSync(sampleDir).filter((f) => f.endsWith('.json')).map((f) => join(sampleDir, f)) : []),
]
for (const file of files) {
  const l = JSON.parse(readFileSync(file, 'utf8'))
  const add = (s) => s && [...s].forEach((c) => typed.add(c))
  for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].forEach(add)
  for (const s of l.sentences) add(s.ko)
  for (const p of l.paragraphs) p.lines.forEach((ln) => add(ln.ko))
  for (const x of l.exercises) {
    x.answers.forEach(add)
    if (x.type === 'blank') add(x.sentence.replace('___', x.answers[0]))
  }
}

const out = {}
const problems = []
for (const ch of [...typed].sort()) {
  const cp = ch.codePointAt(0)
  const font = fontFor(cp)
  if (!font) {
    problems.push(`no font coverage for ${ch} U+${cp.toString(16)}`)
    continue
  }
  const { adv, contours } = contoursOf(font, ch)
  if (ch === ' ') {
    out[ch] = { a: adv, k: [] }
  } else if (cp >= 0xac00 && cp <= 0xd7a3) {
    const s = structure(ch)
    const keys = assign(adv, contours, s)
    if (keys.some((k) => k.length === 0)) problems.push(`${ch}: a letter got no outline (${keys.map((k) => k.length).join('/')})`)
    out[ch] = { a: adv, k: keys.map((k) => k.map((c) => toD(c.cmds)).join('')) }
  } else {
    out[ch] = { a: adv, k: [contours.map((c) => toD(c.cmds)).join('')] }
  }
}

writeFileSync(join(ROOT, 'src', 'data', 'glyphs.json'), JSON.stringify(out))
console.log(`glyphs.json: ${Object.keys(out).length} characters`)
for (const p of problems) console.error('PROBLEM ' + p)
process.exit(problems.length ? 1 : 0)
