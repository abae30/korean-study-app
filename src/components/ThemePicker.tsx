import { useApp, type ThemeId } from '../store/app'

const THEMES: { id: ThemeId; label: string; a: string; b: string }[] = [
  { id: 'blue', label: 'Blue', a: '#1c7dff', b: '#000' },
  { id: 'orange', label: 'Orange', a: '#d9822b', b: '#000' },
  { id: 'pink', label: 'Pink', a: '#ee6f98', b: '#fff' },
  { id: 'lime', label: 'Lime', a: '#9bd12f', b: '#fff' },
]

export function ThemePicker() {
  const theme = useApp((s) => s.settings.theme)
  const setSettings = useApp((s) => s.setSettings)
  return (
    <div className="flex gap-3 px-4 py-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setSettings({ theme: t.id })}
          aria-label={`${t.label} theme`}
          aria-pressed={theme === t.id}
          className={`h-10 w-10 rounded-full border-2 transition ${theme === t.id ? 'border-ink' : 'border-line'}`}
          style={{ background: `linear-gradient(135deg, ${t.a} 50%, ${t.b} 50%)` }}
        />
      ))}
    </div>
  )
}
