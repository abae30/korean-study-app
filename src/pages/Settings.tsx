import { BackupCard } from '../components/BackupCard'
import { Link } from 'react-router-dom'
import { ResetCard } from '../components/ResetCard'
import { Card, Row } from '../components/Card'
import { ThemePicker } from '../components/ThemePicker'
import { useApp } from '../store/app'

function Num({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const n = Math.round(Number(e.target.value))
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
      }}
      className="w-20 rounded-lg border border-line bg-card2 px-2 py-1 text-right font-bold tabular-nums"
    />
  )
}

export default function Settings() {
  const { settings: s, setSettings } = useApp()
  return (
    <div className="mx-auto grid max-w-[900px] gap-5 px-6 py-6 md:grid-cols-2">
      <div className="space-y-5">
        <Card title="Study">
          <Row label="New cards per day" value={<Num value={s.newPerDay} min={0} max={200} onChange={(n) => setSettings({ newPerDay: n })} />} />
          <Row
            label="Vocab: new words only"
            value={<input type="checkbox" checked={s.newWordsOnly} onChange={(e) => setSettings({ newWordsOnly: e.target.checked })} className="size-5 accent-[var(--accent)]" />}
          />
          <Row label="Daily goal (items)" value={<Num value={s.dailyGoal} min={1} max={1000} onChange={(n) => setSettings({ dailyGoal: n })} />} />
        </Card>
        <Card title="Flashcards">
          <Row
            label="Front side"
            value={
              <select
                value={s.flipDirection}
                onChange={(e) => setSettings({ flipDirection: e.target.value as typeof s.flipDirection })}
                className="rounded-lg border border-line bg-card2 px-2 py-1 font-bold"
              >
                <option value="ko-en">Korean first</option>
                <option value="en-ko">English first</option>
                <option value="random">Random</option>
              </select>
            }
          />
          <Row label="Shuffle by default" value={<input type="checkbox" checked={s.shuffle} onChange={(e) => setSettings({ shuffle: e.target.checked })} className="size-5 accent-[var(--accent)]" />} />
        </Card>
        <Card title="Typing">
          <Row
            label="Type Korean on my regular keyboard"
            value={<input type="checkbox" checked={s.builtinKeyboard} onChange={(e) => setSettings({ builtinKeyboard: e.target.checked })} className="size-5 accent-[var(--accent)]" />}
          />
          <Row>
            <p className="text-sm text-muted">
              Letter keys type the matching Korean letters (the standard 두벌식 layout, e.g. G K S → 한) with no need to switch
              input source. If you switch to a Korean keyboard yourself, that works too.
            </p>
          </Row>
        </Card>
        <Card title="Audio">
          <Row label="Sound on" value={<input type="checkbox" checked={s.sound} onChange={(e) => setSettings({ sound: e.target.checked })} className="size-5 accent-[var(--accent)]" />} />
          <Row label="Auto-play audio" value={<input type="checkbox" checked={s.autoplay} onChange={(e) => setSettings({ autoplay: e.target.checked })} className="size-5 accent-[var(--accent)]" />} />
        </Card>
      </div>
      <div className="space-y-5">
        <Card title="Theme">
          <div className="border-t border-line">
            <ThemePicker />
          </div>
        </Card>
        <Card title="Your content">
          <Row>
            <p className="mb-2 text-sm text-muted">Add your own lessons (vocabulary, sentences, dialogues) from a JSON file.</p>
            <Link to="/import" className="inline-flex h-8 items-center rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold hover:border-muted">
              Import lessons →
            </Link>
          </Row>
        </Card>
        <BackupCard />
        <ResetCard />
      </div>
    </div>
  )
}
