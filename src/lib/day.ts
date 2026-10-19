// A "study day" rolls over at 4am local time (like Anki), so late-night sessions count for the day they started in.
export const DAY_ROLLOVER_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

export function studyDay(at: Date | number = Date.now()): string {
  const d = new Date(at)
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Calendar-day arithmetic on "YYYY-MM-DD" keys (no timezone surprises). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** 4am local on the study day `offset` days from the one containing `at`, as epoch ms. */
export function startOfStudyDay(at: Date | number = Date.now(), offset = 0): number {
  const d = new Date(at)
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR)
  d.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.getTime()
}

/** Start of the next study day (4am local) as epoch ms. */
export function nextDayStart(at: Date | number = Date.now()): number {
  return startOfStudyDay(at, 1)
}
