import type { ReactNode } from 'react'

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-card ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-[1.45rem] font-extrabold leading-tight tracking-tight">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

/** Label-left / value-right row separated by a hairline, as in the reference sidebar cards. */
export function Row({ label, value, children }: { label?: ReactNode; value?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-t border-line px-4 py-2.5 text-[0.95rem]">
      {children ?? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{label}</span>
          <span className="font-bold tabular-nums">{value}</span>
        </div>
      )}
    </div>
  )
}

export function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-card2">
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Button({
  children,
  variant = 'default',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed'
  const look =
    variant === 'primary'
      ? 'bg-accent text-accentink hover:brightness-110'
      : 'border border-line bg-card2 hover:border-muted'
  return (
    <button className={`${base} ${look} ${className}`} {...rest}>
      {children}
    </button>
  )
}
