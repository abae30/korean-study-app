import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import Flashcards from './pages/Flashcards'
import GrammarPractice from './pages/GrammarPractice'
import Home from './pages/Home'
import ImportContent from './pages/ImportContent'
import Library from './pages/Library'
import Mistakes from './pages/Mistakes'
import ParagraphTyping from './pages/ParagraphTyping'
import Placeholder from './pages/Placeholder'
import Review from './pages/Review'
import SentenceTyping from './pages/SentenceTyping'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import VocabTyping from './pages/VocabTyping'
import { useApp } from './store/app'

export default function App() {
  const init = useApp((s) => s.init)
  const ready = useApp((s) => s.ready)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header />
      {!ready ? (
        <div className="p-10 text-center text-muted">Loading…</div>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/import" element={<ImportContent />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/review" element={<Review />} />
          <Route path="/type/vocab" element={<VocabTyping />} />
          <Route path="/type/sentences" element={<SentenceTyping />} />
          <Route path="/type/paragraphs" element={<ParagraphTyping />} />
          <Route path="/grammar" element={<GrammarPractice />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="*" element={<Placeholder title="Not found" step="—" />} />
        </Routes>
      )}
    </div>
  )
}
