/** Human-readable scope label: [1,2,3] → "Lessons 1–3", [1,3] → "Lessons 1, 3", [2] → "Lesson 2". */
export function formatScope(lessons: number[]): string {
  const ls = [...new Set(lessons)].sort((a, b) => a - b)
  if (ls.length === 0) return 'No lessons'
  if (ls.length === 1) return `Lesson ${ls[0]}`
  const parts: string[] = []
  let start = ls[0]
  let prev = ls[0]
  for (const n of [...ls.slice(1), Infinity]) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    parts.push(start === prev ? `${start}` : prev === start + 1 ? `${start}, ${prev}` : `${start}–${prev}`)
    start = prev = n
  }
  return `Lessons ${parts.join(', ')}`
}

export function upTo(n: number, available: number[]): number[] {
  return available.filter((l) => l <= n).sort((a, b) => a - b)
}

/** Toggle a lesson, but never allow the scope to become empty. */
export function toggleLesson(scope: number[], lesson: number): number[] {
  const has = scope.includes(lesson)
  if (has && scope.length === 1) return scope
  return (has ? scope.filter((l) => l !== lesson) : [...scope, lesson]).sort((a, b) => a - b)
}
