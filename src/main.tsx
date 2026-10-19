import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { initContent } from './data'

// Lessons imported in the app live in the browser's storage, so they are loaded before anything that reads the lesson data.
await initContent()
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
