import type { Note } from '../api/types'

interface Props {
  notes: Note[]
  connectionSentence?: string
  onOpen?: (noteId: string) => void
}

export default function RelatedNotes({ notes, connectionSentence, onOpen }: Props) {
  if (notes.length === 0) {
    return <p className="related__empty">Nothing connects to this yet. Add more notes and links will appear here.</p>
  }

  return (
    <div className="related">
      {connectionSentence && <p className="related__connection">{connectionSentence}</p>}

      <ul className="related__list">
        {notes.map((note) => (
          <li key={note.id}>
            <button className="related__item" onClick={() => onOpen?.(note.id)}>
              <span className="related__name">{note.title}</span>
              <span className="related__concepts">{note.keyConcepts.slice(0, 3).join(', ')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
