// Mirrors the backend's Pydantic models. JSON over HTTP is camelCase everywhere,
// so these field names must match what FastAPI serializes.

export type NoteSource = 'pasted-text' | 'uploaded-file' | 'youtube'

export interface FlowchartEdge {
  concept: string
  leadsTo?: string[]
  relatedTo?: string[]
}

export interface Note {
  id: string
  title: string
  source: NoteSource
  sourceUrl?: string
  rawContent: string
  summary: string
  keyConcepts: string[]
  questions: string[]
  flowchart: FlowchartEdge[]
  relatedNoteIds: string[]
  connectionSentence?: string
  createdAt: string
}

export interface Concept {
  id: string
  name: string
  normalizedName: string
}

export interface GraphData {
  nodes: { id: string; name: string; noteCount: number }[]
  links: { source: string; target: string; kind: 'leads-to' | 'related-to' }[]
}

export interface StudySession {
  id: string
  subject: string
  goal: string
  durationMinutes: number
  completed: boolean
  relatedNoteIds: string[]
  createdAt: string
}

export type PetMood = 'studying' | 'distracted' | 'celebrating' | 'idle'

export interface PetState {
  experience: number
  streak: number
  mood: PetMood
  accessories: string[]
}
