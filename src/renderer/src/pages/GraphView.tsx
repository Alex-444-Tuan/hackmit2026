import { useState } from 'react'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { DEMO_CONCEPT_NOTES, DEMO_GRAPH } from '../fixtures/demoGraph'
import type { GraphData } from '../api/types'

interface Props {
  data?: GraphData
  /** Concepts from the most recently added note, drawn in the accent colour. */
  highlightIds?: string[]
  onOpenNote?: (noteId: string) => void
}

export default function GraphView({ data = DEMO_GRAPH, highlightIds = [], onOpenNote }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = data.nodes.find((n) => n.id === selectedId) ?? null
  const notes = selectedId ? (DEMO_CONCEPT_NOTES[selectedId] ?? []) : []

  return (
    <div className="graphview">
      <header className="graphview__head">
        <h1 className="graphview__title">Your knowledge graph</h1>
        <p className="graphview__meta">
          {data.nodes.length} concepts, {data.links.length} connections. Bigger circles show up in more notes.
        </p>
      </header>

      <div className="graphview__body">
        <KnowledgeGraph
          data={data}
          selectedId={selectedId}
          highlightIds={highlightIds}
          onSelect={setSelectedId}
        />

        <aside className="panel">
          {selected ? (
            <>
              <h2 className="panel__title">{selected.name}</h2>
              <p className="panel__meta">
                In {selected.noteCount} note{selected.noteCount === 1 ? '' : 's'}
              </p>
              <ul className="panel__list">
                {notes.map((note) => (
                  <li key={note.id}>
                    <button className="related__item" onClick={() => onOpenNote?.(note.id)}>
                      <span className="related__name">{note.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="panel__empty">Select a concept to see which notes mention it.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
