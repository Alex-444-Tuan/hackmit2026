import { useRef, useState } from 'react'
import { createNote, describeError } from '../api/client'
import type { Note, NoteSource } from '../api/types'

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; note: Note } | { kind: 'error'; message: string }

/** First meaningful line of the material, used as a default title. */
function guessTitle(text: string): string {
  const line = text.split('\n').find((l) => l.trim().length > 0)
  if (!line) return 'Untitled note'
  const trimmed = line.trim()
  return trimmed.length > 70 ? `${trimmed.slice(0, 70)}...` : trimmed
}

export default function Capture({ onSaved }: { onSaved?: (note: Note) => void }) {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [source, setSource] = useState<NoteSource>('pasted-text')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  const effectiveTitle = titleTouched ? title : guessTitle(text)
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const canSave = text.trim().length > 0 && status.kind !== 'saving'

  function updateText(next: string, nextSource: NoteSource) {
    setText(next)
    setSource(nextSource)
    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const contents = await file.text()
    updateText(contents, 'uploaded-file')
    if (!titleTouched) setTitle(file.name.replace(/\.[^.]+$/, ''))
    setTitleTouched(true)
  }

  async function save() {
    if (!canSave) return
    setStatus({ kind: 'saving' })
    try {
      const note = await createNote({
        title: effectiveTitle,
        source,
        rawContent: text
      })
      setStatus({ kind: 'saved', note })
      onSaved?.(note)
    } catch (err) {
      setStatus({ kind: 'error', message: describeError(err) })
    }
  }

  function startOver() {
    setText('')
    setTitle('')
    setTitleTouched(false)
    setSource('pasted-text')
    setStatus({ kind: 'idle' })
  }

  if (status.kind === 'saved') {
    return (
      <section className="capture">
        <h1 className="capture__title">Saved</h1>
        <p className="capture__saved">
          {status.note.title} is in your notes. Summaries and the flowchart come next, once the AI step is wired up.
        </p>
        <button className="primary" onClick={startOver}>
          Capture something else
        </button>
      </section>
    )
  }

  return (
    <section className="capture">
      <h1 className="capture__title">Add study material</h1>

      <label className="field">
        <span className="field__label">Title</span>
        <input
          className="field__input"
          value={effectiveTitle}
          placeholder="Named from your first line"
          onChange={(e) => {
            setTitleTouched(true)
            setTitle(e.target.value)
          }}
        />
      </label>

      <label className="field">
        <span className="field__label">Paste a lecture transcript or your notes</span>
        <textarea
          className="field__input capture__area"
          value={text}
          onChange={(e) => updateText(e.target.value, source === 'uploaded-file' ? 'uploaded-file' : 'pasted-text')}
          placeholder="Paste here, or load a .txt file below"
          spellCheck={false}
        />
      </label>

      <div className="capture__row">
        <button className="ghost" onClick={() => fileRef.current?.click()}>
          Load a text file
        </button>
        <span className="capture__meta">
          {wordCount === 0 ? 'Nothing yet' : `${wordCount} word${wordCount === 1 ? '' : 's'}`}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {status.kind === 'error' && <p className="capture__error">{status.message}</p>}

      <button className="primary" disabled={!canSave} onClick={() => void save()}>
        {status.kind === 'saving' ? 'Saving...' : 'Save note'}
      </button>
    </section>
  )
}
