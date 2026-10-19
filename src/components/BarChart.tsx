/** Minimal accessible bar chart: one colour, a baseline, a max label, and a tooltip on every bar. */
export function BarChart({
  data,
  height = 150,
  unit = '',
  labelEvery = 5,
  highlightFirst,
}: {
  data: { label: string; value: number }[]
  height?: number
  unit?: string
  labelEvery?: number
  highlightFirst?: boolean
}) {
  const W = 600
  const pad = { l: 28, r: 4, t: 8, b: 20 }
  const max = Math.max(1, ...data.map((d) => d.value))
  const niceMax = max <= 4 ? max : Math.ceil(max / 5) * 5
  const bw = (W - pad.l - pad.r) / data.length
  const h = height - pad.t - pad.b
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`Bar chart, ${total} ${unit || 'total'}`}>
      <text x={pad.l - 6} y={pad.t + 8} textAnchor="end" className="fill-muted text-[10px] font-bold">
        {niceMax}
      </text>
      <text x={pad.l - 6} y={pad.t + h} textAnchor="end" className="fill-muted text-[10px] font-bold">
        0
      </text>
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + h + 0.5} y2={pad.t + h + 0.5} className="stroke-line" />
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + 0.5} y2={pad.t + 0.5} className="stroke-line" strokeDasharray="2 4" />
      {data.map((d, i) => {
        const bh = (d.value / niceMax) * h
        return (
          <g key={i}>
            <rect
              x={pad.l + i * bw + bw * 0.15}
              y={pad.t + h - bh}
              width={bw * 0.7}
              height={Math.max(d.value > 0 ? 2 : 0, bh)}
              rx={2}
              className={highlightFirst && i === 0 ? 'fill-accent' : 'fill-accent/70'}
            >
              <title>{`${d.label}: ${d.value}${unit ? ' ' + unit : ''}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={pad.l + i * bw + bw / 2} y={height - 5} textAnchor="middle" className="fill-muted text-[10px] font-bold">
                {d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
