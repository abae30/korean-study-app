// Runs a TypeScript authoring script with Vite's module loader, so it can import the app's own libraries
// (conjugation, hangul helpers, content types).   node scripts/author/run.mjs scripts/author/lesson-2.ts
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/author/run.mjs <script.ts>')
  process.exit(1)
}
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  await server.ssrLoadModule('/' + file.replace(/^\.?\//, ''))
} catch (e) {
  console.error(e)
  process.exitCode = 1
} finally {
  await server.close()
}
