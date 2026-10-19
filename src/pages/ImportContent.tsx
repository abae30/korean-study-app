import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Row } from '../components/Card'
import { Icon } from '../components/Icon'
import { importedLessons, isSampleOnly, lessons } from '../data'
import type { Lesson } from '../data/types'
import { normalizeLesson, TEMPLATE, type ImportResult } from '../lib/content'
import { kvSet } from '../lib/db'
import { downloadJson } from '../lib/backup'
import { removeUserLesson, saveUserLessons } from '../lib/userContent'

interface Picked extends ImportResult {
  name: string
}

const counts = (l: Lesson) => `${l.vocab.length} words · ${l.sentences.length} sentences · ${l.paragraphs.length} passages · ${l.grammar.length} grammar · ${l.exercises.length} exercises`

export default function ImportContent() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [busy, setBusy] = useState(false)
  const mine = importedLessons()
  const good = picked.filter((p) => p.lesson)
  const replacing = (n: number) => lessons.some((l) => l.lesson === n && !l.sample)

  async function choose(files: FileList) {
    const out: Picked[] = []
    for (const f of Array.from(files)) {
      try {
        out.push({ name: f.name, ...normalizeLesson(JSON.parse(await f.text()), f.name) })
      } catch (e) {
        out.push({ name: f.name, errors: [`${f.name}: this is not valid JSON (${e instanceof Error ? e.message : 'parse error'}).`], warnings: [] })
      }
    }
    setPicked(out)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function doImport() {
    setBusy(true)
    const ls = good.map((p) => p.lesson!)
    await saveUserLessons(ls)
    await kvSet('scope', ls.map((l) => l.lesson))
    location.hash = '#/library'
    location.reload() // the lesson data is read once at start-up
  }

  async function remove(n: number) {
    if (!window.confirm(`Remove imported Lesson ${n}? Your study progress for its words is kept, but the lesson disappears until you import it again.`)) return
    await removeUserLesson(n)
    location.reload()
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5 px-6 py-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Import your own lessons</h1>
        <p className="mt-1 text-muted">
          This app doesn&apos;t include any textbook. Bring your own vocabulary, sentences and dialogues as a small JSON file and study them in every mode
          (flashcards, typing, grammar practice, review).
        </p>
        {isSampleOnly() && (
          <p className="mt-2 rounded-lg border border-accent/40 bg-card px-3 py-2 text-sm">
            You are looking at the built-in <b>sample lesson</b>. It disappears as soon as you import a lesson of your own.
          </p>
        )}
      </div>

      <Card title="1 · Get the format">
        <Row>
          <p className="mb-3 text-sm text-muted">
            Only <code>lesson</code> and <code>title</code> are required. Ids, part of speech, and which words a sentence uses are filled in for you. Download the
            template, replace its content with yours, and import it. (An AI assistant can write one from your notes or textbook pages. Paste it the format guide
            in <code>docs/CONTENT-FORMAT.md</code>.)
          </p>
          <Button onClick={() => downloadJson('lesson-template.json', TEMPLATE)} className="!py-1.5 text-sm">
            <Icon name="download" size={16} /> Download template
          </Button>
        </Row>
      </Card>

      <Card title="2 · Choose your file(s)">
        <Row>
          <p className="mb-3 text-sm text-muted">One file per lesson. A lesson with the same number as one you already have replaces it.</p>
          <Button onClick={() => fileRef.current?.click()} className="!py-1.5 text-sm">
            <Icon name="upload" size={16} /> Choose lesson file(s)…
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => e.target.files?.length && void choose(e.target.files)} />
        </Row>
        {picked.map((p) => (
          <Row key={p.name}>
            {p.lesson ? (
              <div>
                <div className="font-extrabold text-good">
                  ✓ {p.name} → Lesson {p.lesson.lesson}: {p.lesson.title}
                  {replacing(p.lesson.lesson) && <span className="ml-2 text-sm font-bold text-warn">(replaces your current Lesson {p.lesson.lesson})</span>}
                </div>
                <div className="text-sm text-muted">{counts(p.lesson)}</div>
              </div>
            ) : (
              <div className="font-extrabold text-bad">✗ {p.name} can&apos;t be imported</div>
            )}
            {p.errors.map((e, i) => (
              <div key={i} className="mt-1 text-sm text-bad">
                {e}
              </div>
            ))}
            {p.warnings.slice(0, 8).map((w, i) => (
              <div key={i} className="mt-1 text-sm text-warn">
                {w}
              </div>
            ))}
            {p.warnings.length > 8 && <div className="mt-1 text-sm text-warn">…and {p.warnings.length - 8} more notes.</div>}
          </Row>
        ))}
        {good.length > 0 && (
          <Row>
            <Button variant="primary" onClick={() => void doImport()} disabled={busy}>
              Import {good.length} lesson{good.length === 1 ? '' : 's'}
            </Button>
          </Row>
        )}
      </Card>

      <Card title="Your imported lessons">
        {mine.length === 0 ? (
          <Row>
            <p className="text-sm text-muted">Nothing imported yet.</p>
          </Row>
        ) : (
          mine.map((l) => (
            <Row key={l.lesson}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold">
                    Lesson {l.lesson}: {l.title}
                  </div>
                  <div className="text-sm text-muted">{counts(l)}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadJson(`lesson-${l.lesson}.json`, l)} className="!py-1 text-sm">
                    Export
                  </Button>
                  <Button onClick={() => void remove(l.lesson)} className="!py-1 text-sm !text-bad">
                    Remove
                  </Button>
                </div>
              </div>
            </Row>
          ))
        )}
      </Card>

      <Card title="Good to know">
        <Row>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              <b className="text-ink">Audio:</b> imported lessons use your browser&apos;s built-in Korean voice. Natural pre-generated audio is only built for lessons you add
              to the project folder (see the README&apos;s audio section).
            </li>
            <li>
              <b className="text-ink">Typing letters:</b> the per-letter lighting uses outlines for the characters already in the project. A syllable it has never seen is
              shown as plain text. Run <code>npm run build-glyphs</code> after adding lesson files to the project to cover them.
            </li>
            <li>
              <b className="text-ink">Backup:</b> imported lessons are stored in this browser and included in Settings → Backup.
            </li>
            <li>
              <b className="text-ink">Copyright:</b> import material you have the right to use, and don&apos;t publish a textbook&apos;s content.
            </li>
          </ul>
          <Link to="/library" className="mt-3 inline-block text-sm font-bold text-accent hover:underline">
            Open the lesson library →
          </Link>
        </Row>
      </Card>
    </div>
  )
}
