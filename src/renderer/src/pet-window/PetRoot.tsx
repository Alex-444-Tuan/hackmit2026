import { useEffect, useState } from 'react'

type Mood = 'idle' | 'studying' | 'distracted' | 'celebrating'

interface SessionState {
  mood: Mood
  secondsLeft: number
  streak: number
}

const FACE: Record<Mood, string> = {
  idle: '(-  -)',
  studying: '(o  o)',
  distracted: '(o  o)?',
  celebrating: '(^  ^)'
}

const LINE: Record<Mood, string> = {
  idle: 'ready when you are',
  studying: '',
  distracted: 'back to studying?',
  celebrating: 'you did it'
}

function clock(seconds: number): string {
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export default function PetRoot() {
  const [state, setState] = useState<SessionState>({ mood: 'idle', secondsLeft: 0, streak: 0 })

  useEffect(() => {
    // Returns its own unsubscribe, so the listener never stacks up on reload.
    const unsubscribe = window.studypet.onSessionState(setState)
    return unsubscribe
  }, [])

  const { mood, secondsLeft, streak } = state

  return (
    <div className={`pet-shell pet-shell--${mood}`}>
      <div className="pet-shell__face">{FACE[mood]}</div>

      {mood === 'studying' || mood === 'distracted' ? (
        <div className="pet-shell__clock">{clock(secondsLeft)}</div>
      ) : (
        <div className="pet-shell__line">{LINE[mood]}</div>
      )}

      <div className="pet-shell__streak">{streak > 0 ? `${streak} today` : 'no sessions yet'}</div>
    </div>
  )
}
