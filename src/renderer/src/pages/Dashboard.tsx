import { useEffect, useMemo, useRef, useState } from 'react'

type Phase = 'setup' | 'running' | 'paused' | 'done'
type Mood = 'idle' | 'studying' | 'celebrating'

const PRESETS = [15, 25, 50]

const PET_FACE: Record<Mood, string> = {
  idle: '(-  -)',
  studying: '(o  o)',
  celebrating: '(^  ^)'
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Dashboard() {
  const [subject, setSubject] = useState('Calculus')
  const [goal, setGoal] = useState('Get through derivatives')
  const [minutes, setMinutes] = useState(25)
  const [phase, setPhase] = useState<Phase>('setup')
  const [remainingMs, setRemainingMs] = useState(25 * 60_000)
  const [totalMs, setTotalMs] = useState(25 * 60_000)
  const [streak, setStreak] = useState(0)

  // The session's end time as an absolute timestamp. Remaining time is always
  // recomputed from Date.now(), never accumulated from interval ticks, because
  // Chromium throttles timers when the window is hidden or minimized.
  const endAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'running') return

    const tick = () => {
      if (endAtRef.current === null) return
      const left = endAtRef.current - Date.now()
      if (left <= 0) {
        endAtRef.current = null
        setRemainingMs(0)
        setStreak((s) => s + 1)
        setPhase('done')
      } else {
        setRemainingMs(left)
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [phase])

  const mood: Mood = phase === 'running' ? 'studying' : phase === 'done' ? 'celebrating' : 'idle'
  const progress = totalMs === 0 ? 0 : 1 - remainingMs / totalMs

  const ring = useMemo(() => {
    const radius = 104
    const circumference = 2 * Math.PI * radius
    return { radius, circumference, offset: circumference * (1 - progress) }
  }, [progress])

  function startSession() {
    const duration = Math.max(1, minutes) * 60_000
    endAtRef.current = Date.now() + duration
    setTotalMs(duration)
    setRemainingMs(duration)
    setPhase('running')
  }

  function pauseSession() {
    if (endAtRef.current === null) return
    setRemainingMs(Math.max(0, endAtRef.current - Date.now()))
    endAtRef.current = null
    setPhase('paused')
  }

  function resumeSession() {
    endAtRef.current = Date.now() + remainingMs
    setPhase('running')
  }

  function endSession() {
    endAtRef.current = null
    setPhase('setup')
    setRemainingMs(minutes * 60_000)
  }

  return (
    <div className="dash">
      <header className="dash__bar">
        <span className="dash__wordmark">StudyPet</span>
        <span className="dash__streak">
          {streak === 0 ? 'No sessions yet' : `${streak} session${streak === 1 ? '' : 's'} today`}
        </span>
      </header>

      {phase === 'setup' ? (
        <section className="setup">
          <h1 className="setup__title">What are you studying?</h1>

          <label className="field">
            <span className="field__label">Subject</span>
            <input
              className="field__input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Calculus"
            />
          </label>

          <label className="field">
            <span className="field__label">Goal for this session</span>
            <input
              className="field__input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Get through derivatives"
            />
          </label>

          <div className="field">
            <span className="field__label">How long</span>
            <div className="presets">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className={`preset ${minutes === p ? 'preset--on' : ''}`}
                  onClick={() => {
                    setMinutes(p)
                    setRemainingMs(p * 60_000)
                  }}
                >
                  {p} min
                </button>
              ))}
              <input
                className="preset preset--custom"
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) => {
                  const next = Number(e.target.value) || 1
                  setMinutes(next)
                  setRemainingMs(next * 60_000)
                }}
              />
            </div>
          </div>

          <button className="primary" onClick={startSession}>
            Start studying
          </button>
        </section>
      ) : (
        <section className="session">
          <p className="session__goal">
            {subject}
            {goal ? ` · ${goal}` : ''}
          </p>

          <div className="timer">
            <svg viewBox="0 0 240 240" className="timer__ring" aria-hidden="true">
              <circle className="timer__track" cx="120" cy="120" r={ring.radius} />
              <circle
                className="timer__fill"
                cx="120"
                cy="120"
                r={ring.radius}
                strokeDasharray={ring.circumference}
                strokeDashoffset={ring.offset}
              />
            </svg>
            <div className="timer__center">
              <span className={`pet pet--${mood}`}>{PET_FACE[mood]}</span>
              <span className="timer__clock">{formatClock(remainingMs)}</span>
            </div>
          </div>

          {phase === 'done' ? (
            <>
              <p className="session__note">Session finished. Streak is now {streak}.</p>
              <div className="controls">
                <button className="primary" onClick={endSession}>
                  Start another
                </button>
              </div>
            </>
          ) : (
            <div className="controls">
              {phase === 'running' ? (
                <button className="primary" onClick={pauseSession}>
                  Pause
                </button>
              ) : (
                <button className="primary" onClick={resumeSession}>
                  Resume
                </button>
              )}
              <button className="ghost" onClick={endSession}>
                End session
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
