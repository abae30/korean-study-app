import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatScope } from '../lib/scope'
import { useApp } from '../store/app'
import { Icon } from './Icon'
import { ScopeSelector } from './ScopeSelector'

const pill =
  'inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card2 px-3 text-sm font-extrabold hover:border-muted'

export function Header() {
  const scope = useApp((s) => s.scope)
  const sound = useApp((s) => s.settings.sound)
  const setSettings = useApp((s) => s.setSettings)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-[60px] max-w-[1180px] items-center justify-between px-6">
        <Link to="/" className="text-[1.65rem] font-black tracking-tight">
          한글<span className="text-accent">.</span>Study
        </Link>
        <div className="flex items-center gap-2">
          <div ref={ref} className="relative">
            <button className={pill} onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Lesson scope (applies to every mode)">
              <Icon name="book" size={18} />
              {formatScope(scope)}
            </button>
            {open && (
              <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-2xl border border-line bg-card p-4 shadow-2xl">
                <ScopeSelector />
              </div>
            )}
          </div>
          <button className={pill} onClick={() => setSettings({ sound: !sound })} aria-pressed={sound}>
            <Icon name={sound ? 'volume' : 'mute'} size={18} />
            Sound
          </button>
          <Link to="/settings" className={pill} aria-label="Settings">
            <Icon name="settings" size={18} />
          </Link>
        </div>
      </div>
    </header>
  )
}
