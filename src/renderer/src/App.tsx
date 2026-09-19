import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import NoteView from './pages/NoteView'
import GraphView from './pages/GraphView'
import { checkHealth } from './api/client'
import { DEMO_NOTE, DEMO_RELATED } from './fixtures/demoNote'

type View = 'dashboard' | 'capture' | 'note' | 'graph'

const TABS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Session' },
  { id: 'capture', label: 'Capture' },
  { id: 'note', label: 'Note' },
  { id: 'graph', label: 'Graph' }
]

// Concepts from the newest note, so they stand out in the graph.
const NEW_CONCEPT_IDS = ['c-derivatives', 'c-tangent', 'c-secant']

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    const poll = () => {
      void checkHealth().then((ok) => {
        if (active) setBackendUp(ok)
      })
    }
    poll()
    const id = window.setInterval(poll, 10_000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="shell">
      <header className="shell__bar">
        <span className="shell__wordmark">StudyPet</span>

        <nav className="nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav__tab ${view === tab.id ? 'nav__tab--on' : ''}`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <span
          className={`status status--${backendUp === null ? 'unknown' : backendUp ? 'up' : 'down'}`}
          title={backendUp ? 'Backend reachable' : 'Backend not reachable on localhost:8000'}
        >
          {backendUp === null ? 'checking' : backendUp ? 'backend up' : 'backend down'}
        </span>
      </header>

      <main className="shell__body">
        {view === 'dashboard' && <Dashboard />}
        {view === 'capture' && <Capture onSaved={() => setView('note')} />}
        {view === 'note' && <NoteView note={DEMO_NOTE} related={DEMO_RELATED} />}
        {view === 'graph' && <GraphView highlightIds={NEW_CONCEPT_IDS} onOpenNote={() => setView('note')} />}
      </main>
    </div>
  )
}

export default App
