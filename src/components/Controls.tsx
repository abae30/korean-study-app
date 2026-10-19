import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      {children}
    </div>
  )
}

/** Segmented choice: a row of toggle buttons where exactly one is on. */
export function Seg<T extends string | number>({ value, onChange, options, small }: { value: T; onChange: (v: T) => void; options: [T, string][]; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`${small ? 'h-8 px-3 text-sm' : 'h-10 px-4'} rounded-lg border font-extrabold ${value === v ? 'border-accent bg-accent text-accentink' : 'border-line bg-card2 hover:border-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`h-8 rounded-lg border px-3 text-sm font-extrabold ${on ? 'border-accent text-accent' : 'border-line bg-card2 text-muted hover:border-muted'}`}
    >
      {children}
    </button>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
    </div>
  )
}
