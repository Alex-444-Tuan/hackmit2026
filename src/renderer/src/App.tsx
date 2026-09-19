import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import NoteView from './pages/NoteView'
import { checkHealth } from './api/client'
import { DEMO_NOTE, DEMO_RELATED } from './fixtures/demoNote'

type View = 'dashboard' | 'capture' | 'note'

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
          <button
            className={`nav__tab ${view === 'dashboard' ? 'nav__tab--on' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Session
          </button>
          <button
            className={`nav__tab ${view === 'capture' ? 'nav__tab--on' : ''}`}
            onClick={() => setView('capture')}
          >
            Capture
          </button>
          <button className={`nav__tab ${view === 'note' ? 'nav__tab--on' : ''}`} onClick={() => setView('note')}>
            Note
          </button>
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
      </main>
    </div>
  )
}

export default App
