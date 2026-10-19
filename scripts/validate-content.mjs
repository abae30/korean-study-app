// Content validator: `npm run validate-content`
// Errors (exit 1): broken ids, bad blanks, vocab/grammar references to LATER lessons.
// Warnings: tokens in generated items that don't resolve to vocab/names of this or earlier lessons.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const dir = join(dataDir, 'lessons')
const sampleDir = join(dataDir, 'sample')
const own = existsSync(dir) ? readdirSync(dir).filter((f) => /^lesson-\d+\.json$/.test(f)).map((f) => join(dir, f)) : []
// the sample lesson is only checked when there are no lessons of your own (the app does the same)
const files = own.length ? own : existsSync(sampleDir) ? readdirSync(sampleDir).filter((f) => f.endsWith('.json')).map((f) => join(sampleDir, f)) : []
const lessons = files.map((f) => JSON.parse(readFileSync(f, 'utf8'))).sort((a, b) => a.lesson - b.lesson)

let errors = 0
let warnings = 0
const err = (m) => (errors++, console.error('ERROR  ' + m))
const warn = (m) => (warnings++, console.warn('warn   ' + m))

const allIds = new Map()
const reg = (id, where) => {
  if (allIds.has(id)) err(`duplicate id ${id} (${where} and ${allIds.get(id)})`)
  allIds.set(id, where)
}
const vocabLesson = new Map() // id -> lesson
const grammarLesson = new Map()

const SUFFIXES = ['이세요', '으세요', '세요', '으러', '러', '이에요', '예요', '입니다', '요', '이', '가', '은', '는', '도', '을', '를', '들', '에서', '에', '의', '와', '과', '으로', '로', '하고', '만']
const isHangul = (s) => /[가-힣]/.test(s)

for (const l of lessons) {
  for (const v of l.vocab) { reg(v.id, `vocab L${l.lesson}`); vocabLesson.set(v.id, l.lesson) }
  for (const g of l.grammar) { reg(g.id, `grammar L${l.lesson}`); grammarLesson.set(g.id, l.lesson) }
  for (const s of l.sentences) reg(s.id, `sentence L${l.lesson}`)
  for (const p of l.paragraphs) reg(p.id, `paragraph L${l.lesson}`)
  for (const x of l.exercises) reg(x.id, `exercise L${l.lesson}`)
}

for (const l of lessons) {
  const known = new Set()
  for (const k of lessons.filter((x) => x.lesson <= l.lesson)) {
    for (const v of k.vocab) { known.add(v.ko); for (const f of v.forms ?? []) known.add(f) }
    for (const n of k.names ?? []) { known.add(n.ko); for (const part of n.ko.split(' ')) known.add(part) }
  }
  const resolves = (tok) => {
    let t = tok.replace(/[.,?!'"“”‘’~\-—:;()\[\]]/g, '')
    if (!t || !isHangul(t)) return true // numerals / latin
    if (/^\d+(학년|과|층|명|개|권|원|월|시|분)?(에|은|는|이|가|이에요|예요)?$/.test(t)) return true
    if (/^[영일이삼사오육칠팔구십백천만억]+$/.test(t)) return true // Sino-Korean numerals
    if (/^(열|스물|스무|서른|마흔|쉰|예순|일흔|여든|아흔)?(하나|한|둘|두|셋|세|넷|네|다섯|여섯|일곱|여덟|아홉)?$/.test(t)) return true // native numerals
    const stack = [t]
    while (stack.length) {
      const cur = stack.pop()
      if (known.has(cur) || known.has(cur + '다')) return true // a bare stem (보 of 보세요) of a known verb/adjective
      for (const s of SUFFIXES) if (cur.length > s.length && cur.endsWith(s)) stack.push(cur.slice(0, -s.length))
    }
    return false
  }
  const checkText = (text, label) => {
    for (const tok of text.split(/\s+/)) if (!resolves(tok)) warn(`${label}: unknown token "${tok}" in "${text}"`)
  }
  const checkRefs = (item, label) => {
    for (const id of item.vocabIds ?? []) {
      if (!vocabLesson.has(id)) err(`${label}: unknown vocab id ${id}`)
      else if (vocabLesson.get(id) > l.lesson) err(`${label}: uses vocab ${id} from a later lesson`)
    }
    for (const id of item.grammarIds ?? []) {
      if (!grammarLesson.has(id)) err(`${label}: unknown grammar id ${id}`)
      else if (grammarLesson.get(id) > l.lesson) err(`${label}: uses grammar ${id} from a later lesson`)
    }
  }

  for (const s of l.sentences) {
    checkRefs(s, s.id)
    if (!s.ko || !s.en) err(`${s.id}: missing text`)
    if (s.source === 'generated') checkText(s.ko, s.id)
  }
  for (const p of l.paragraphs) {
    if (!p.lines.length) err(`${p.id}: empty`)
    if (p.source === 'generated') for (const ln of p.lines) checkText(ln.ko, p.id)
  }
  for (const x of l.exercises) {
    if (!grammarLesson.has(x.grammarId)) err(`${x.id}: unknown grammar ${x.grammarId}`)
    else if (grammarLesson.get(x.grammarId) > l.lesson) err(`${x.id}: grammar from a later lesson`)
    if (!x.answers?.length) err(`${x.id}: no answers`)
    if (!x.choices?.includes(x.answers?.[0])) err(`${x.id}: choices must include the canonical answer`)
    if (x.type === 'blank') {
      const n = x.sentence.split('___').length - 1
      if (n !== 1) err(`${x.id}: expected exactly one ___ blank, found ${n}`)
      if (x.source === 'generated') checkText(x.sentence.replace('___', ''), x.id)
    }
  }
}

// glyph coverage (the typing screens draw words from src/data/glyphs.json)
const glyphPath = join(dir, '..', 'glyphs.json')
if (!existsSync(glyphPath)) err('src/data/glyphs.json is missing: run `npm run build-glyphs`')
else {
  const glyphs = JSON.parse(readFileSync(glyphPath, 'utf8'))
  const need = new Set()
  const add = (t) => t && [...t].forEach((c) => need.add(c))
  for (const l of lessons) {
    for (const v of l.vocab) [v.ko, ...(v.forms ?? [])].forEach(add)
    for (const s of l.sentences) add(s.ko)
    for (const p of l.paragraphs) p.lines.forEach((ln) => add(ln.ko))
    for (const x of l.exercises) {
      x.answers.forEach(add)
      if (x.type === 'blank') add(x.sentence.replace('___', x.answers[0]))
    }
  }
  const missing = [...need].filter((c) => !glyphs[c])
  if (missing.length) err(`no glyph outlines for: ${missing.join(' ')} (run \`npm run build-glyphs\`)`)
}

console.log(`\nChecked ${lessons.length} lesson file(s): ${errors} error(s), ${warnings} warning(s).`)
process.exit(errors ? 1 : 0)
