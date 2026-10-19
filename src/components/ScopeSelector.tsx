import { availableLessons, lessons } from '../data'
import { useApp } from '../store/app'

export function ScopeSelector() {
  const scope = useApp((s) => s.scope)
  const toggleLesson = useApp((s) => s.toggleLesson)
  const setUpTo = useApp((s) => s.setUpTo)
  const setScope = useApp((s) => s.setScope)
  const all = availableLessons
  const title = (n: number) => lessons.find((l) => l.lesson === n)?.title

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Pick lessons</div>
        <div className="flex flex-wrap gap-1.5">
          {all.map((n) => {
            const on = scope.includes(n)
            const ok = availableLessons.includes(n)
            return (
              <button
                key={n}
                disabled={!ok}
                onClick={() => toggleLesson(n)}
                title={ok ? `Lesson ${n}: ${title(n)}` : `Lesson ${n} is not imported yet`}
                aria-pressed={on}
                className={`h-9 min-w-9 rounded-lg border px-3 font-extrabold transition ${
                  on ? 'border-accent bg-accent text-accentink' : 'border-line bg-card2 hover:border-muted'
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Or everything up to</div>
        <div className="flex flex-wrap gap-1.5">
          {all.map((n) => (
            <button
              key={n}
              disabled={!availableLessons.includes(n)}
              onClick={() => setUpTo(n)}
              className="h-9 rounded-lg border border-line bg-card2 px-3 font-bold hover:border-muted disabled:cursor-not-allowed disabled:opacity-30"
            >
              ≤ {n}
            </button>
          ))}
          <button
            onClick={() => setScope(availableLessons)}
            className="h-9 rounded-lg border border-line bg-card2 px-3 font-bold hover:border-muted"
          >
            All
          </button>
        </div>
      </div>
    </div>
  )
}
