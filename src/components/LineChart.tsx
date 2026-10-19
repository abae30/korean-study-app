/** Tiny line chart for a series over time (oldest first). One colour, dots with tooltips, a max and a zero label. */
export function LineChart({ points, unit = '', height = 150 }: { points: { label: string; value: number }[]; unit?: string; height?: number }) {
  const W = 600
  const pad = { l: 34, r: 10, t: 12, b: 22 }
  if (points.length === 0) return <div className="grid h-[150px] place-items-center text-sm text-muted">No runs yet</div>
  const max = Math.max(1, ...points.map((p) => p.value))
  const niceMax = max <= 10 ? Math.ceil(max) : Math.ceil(max / 5) * 5
  const h = height - pad.t - pad.b
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => pad.t + h - (v / niceMax) * h
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.value)}`).join('')
  const every = Math.max(1, Math.ceil(points.length / 6))
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`Line chart of ${points.length} runs`}>
      <text x={pad.l - 6} y={pad.t + 8} textAnchor="end" className="fill-muted text-[10px] font-bold">{niceMax}</text>
      <text x={pad.l - 6} y={pad.t + h} textAnchor="end" className="fill-muted text-[10px] font-bold">0</text>
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + h + 0.5} y2={pad.t + h + 0.5} className="stroke-line" />
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + 0.5} y2={pad.t + 0.5} className="stroke-line" strokeDasharray="2 4" />
      {points.length > 1 && <path d={line} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4} className="fill-accent">
            <title>{`${p.label}: ${p.value}${unit ? ' ' + unit : ''}`}</title>
          </circle>
          {i % every === 0 && (
            <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted text-[10px] font-bold">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  )
}
