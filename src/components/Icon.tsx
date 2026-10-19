const paths: Record<string, string> = {
  volume: 'M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6',
  mute: 'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
  cards: 'M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm4-4h10a2 2 0 0 1 2 2v10',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3',
  type: 'M4 7V5h16v2M9 19h6M12 5v14',
  lines: 'M4 6h16M4 12h16M4 18h10',
  para: 'M4 5h16M4 10h16M4 15h16M4 20h9',
  grammar: 'M8 9 4 12l4 3M16 9l4 3-4 3M14 5l-4 14',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm2 14h13v2H6',
  chart: 'M5 20V10m7 10V4m7 16v-7',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z',
  play: 'M8 5v14l11-7L8 5Z',
  star: 'm12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M5 21h14',
  upload: 'M12 21V9m0 0-4 4m4-4 4 4M5 3h14',
  check: 'm5 12 5 5 9-10',
  warn: 'M12 3 2 20h20L12 3Zm0 7v5m0 3v.01',
}

export function Icon({ name, size = 20, className = '' }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name] ?? paths.check} />
    </svg>
  )
}
