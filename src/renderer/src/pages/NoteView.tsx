import FlowchartView from '../components/FlowchartView'
import RelatedNotes from '../components/RelatedNotes'
import type { Note } from '../api/types'

interface Props {
  note: Note
  related: Note[]
  onOpenNote?: (noteId: string) => void
}

export default function NoteView({ note, related, onOpenNote }: Props) {
  return (
    <article className="note">
      <header className="note__head">
        <h1 className="note__title">{note.title}</h1>
        <p className="note__meta">
          {note.source === 'youtube' ? 'From a YouTube transcript' : 'From text you added'}
        </p>
      </header>

      <section className="note__block">
        <h2 className="note__h2">Summary</h2>
        <p className="note__summary">{note.summary}</p>
      </section>

      <section className="note__block">
        <h2 className="note__h2">Key concepts</h2>
        <ul className="chips">
          {note.keyConcepts.map((concept) => (
            <li key={concept} className="chip">
              {concept}
            </li>
          ))}
        </ul>
      </section>

      <section className="note__block">
        <h2 className="note__h2">How it fits together</h2>
        <FlowchartView edges={note.flowchart} />
      </section>

      {note.questions.length > 0 && (
        <section className="note__block">
          <h2 className="note__h2">Check yourself</h2>
          <ul className="note__questions">
            {note.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="note__block">
        <h2 className="note__h2">Builds on</h2>
        <RelatedNotes notes={related} connectionSentence={note.connectionSentence} onOpen={onOpenNote} />
      </section>
    </article>
  )
}
