// Plays pre-generated audio by item id (public/audio/manifest.json), falling back to the browser's ko-KR voice.
export type VoiceMode = 'random' | 'female' | 'male'
interface Variant {
  file: string
  voice: string
  gender: 'female' | 'male'
}
interface ManifestEntry {
  variants: Variant[]
}
let manifestP: Promise<Record<string, ManifestEntry>> | null = null
function fetchManifest(fresh = false): Promise<Record<string, ManifestEntry>> {
  return fetch('/audio/manifest.json', fresh ? { cache: 'no-store' } : undefined)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
}
function loadManifest() {
  manifestP ??= fetchManifest()
  return manifestP
}
let lastRefresh = 0
/** The audio can be rebuilt while the app is open; an id missing from the loaded manifest is looked up in a fresh copy once. */
async function lookup(id: string): Promise<ManifestEntry | undefined> {
  const hit = (await loadManifest())[id]
  if (hit?.variants?.length || Date.now() - lastRefresh < 15_000) return hit
  lastRefresh = Date.now()
  manifestP = fetchManifest(true)
  return (await manifestP)[id]
}

let current: HTMLAudioElement | null = null
let token = 0
const recent: string[] = [] // voices used most recently, newest last

export function stopAudio() {
  token++
  current?.pause()
  current = null
  window.speechSynthesis?.cancel()
}

/**
 * Choose which recorded voice to use. Random mode is genuinely random, but never plays the same voice three times in a
 * row, so you hear both female and male regularly. Items with a single variant (dialogue lines, which belong to one
 * speaker) always use it.
 */
export function pickVariant(variants: Variant[], mode: VoiceMode, history: string[] = recent, rand = Math.random): Variant {
  if (variants.length === 1) return variants[0]
  let pool = mode === 'random' ? variants : variants.filter((v) => v.gender === mode)
  if (pool.length === 0) pool = variants
  const n = history.length
  if (pool.length > 1 && n >= 2 && history[n - 1] === history[n - 2]) {
    const other = pool.filter((v) => v.voice !== history[n - 1])
    if (other.length) pool = other
  }
  return pool[Math.floor(rand() * pool.length)]
}

/** Same text cleanup the audio builder applies, so the fallback voice says the same thing. */
export const spokenText = (t: string) => t.replace(/\//g, ', ').replace(/[[\]]/g, '')

function speakFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) return resolve()
    const u = new SpeechSynthesisUtterance(spokenText(text))
    u.lang = 'ko-KR'
    u.rate = 0.9
    const ko = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ko'))
    if (ko) u.voice = ko
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
  })
}

async function playOne(id: string, fallbackText: string, my: number, mode: VoiceMode): Promise<void> {
  const entry = await lookup(id)
  if (my !== token) return
  if (!entry?.variants?.length) return speakFallback(fallbackText)
  const variant = pickVariant(entry.variants, mode)
  recent.push(variant.voice)
  if (recent.length > 4) recent.shift()
  return new Promise<void>((resolve) => {
    const a = new Audio(`/audio/${variant.file}`)
    current = a
    a.onended = () => resolve()
    a.onerror = () => {
      if (my === token) void speakFallback(fallbackText).then(resolve)
      else resolve()
    }
    a.play().catch(() => resolve())
  })
}

/** Play one item, cutting off anything already playing. Resolves when playback ends. */
export async function playItem(id: string, fallbackText: string, mode: VoiceMode = 'random'): Promise<void> {
  stopAudio()
  return playOne(id, fallbackText, token, mode)
}

/** Play several items back to back (dialogues). */
export async function playSequence(items: { id: string; text: string }[], mode: VoiceMode = 'random'): Promise<void> {
  stopAudio()
  const my = token
  for (const it of items) {
    if (my !== token) return
    await playOne(it.id, it.text, my, mode)
  }
}
