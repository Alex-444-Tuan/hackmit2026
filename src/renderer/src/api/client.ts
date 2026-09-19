import axios from 'axios'
import type { GraphData, Note, NoteSource } from './types'

export const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 20000
})

/** Turns an axios failure into something a human can act on. */
export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_NETWORK') {
      return 'Cannot reach the backend on localhost:8000. Is uvicorn running?'
    }
    if (err.code === 'ECONNABORTED') {
      return 'The backend took too long to respond.'
    }
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail
    return detail ?? `Backend returned ${err.response?.status ?? 'an error'}.`
  }
  return 'Something went wrong saving the note.'
}

export async function checkHealth(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 2500 })
    return true
  } catch {
    return false
  }
}

export interface CreateNoteInput {
  title: string
  source: NoteSource
  rawContent: string
  sourceUrl?: string
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data } = await api.post<Note>('/notes', input)
  return data
}

export async function listNotes(): Promise<Note[]> {
  const { data } = await api.get<Note[]>('/notes')
  return data
}

export async function getGraph(): Promise<GraphData> {
  const { data } = await api.get<GraphData>('/graph')
  return data
}
