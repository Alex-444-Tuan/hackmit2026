import type { Note } from '../api/types'

/**
 * Stand in for the summarize response until the backend lands. Shaped exactly
 * like the Note model, and deliberately reuses the seeded concept names
 * (Limits, Continuity, Slope, Functions) so the graph merges instead of
 * creating duplicate nodes.
 */
export const DEMO_NOTE: Note = {
  id: 'demo-derivatives',
  title: 'Lecture 4: Introduction to Derivatives',
  source: 'pasted-text',
  rawContent: '',
  summary:
    'A derivative measures how fast a function changes at a single point. The idea builds directly on limits: take the slope of a secant line between two points, then let the gap between them shrink toward zero. What the slope approaches is the instantaneous rate of change, written as the derivative. Continuity matters because a function has to be continuous at a point to be differentiable there, though continuity alone is not enough.',
  keyConcepts: ['Limits', 'Continuity', 'Slope', 'Functions', 'Derivatives', 'Secant Lines', 'Tangent Lines'],
  questions: [
    'Why does differentiability require continuity, but not the reverse?',
    'What happens to the secant line as the two points converge?',
    'How would you find the slope of a curve at a sharp corner?'
  ],
  flowchart: [
    { concept: 'Functions', leadsTo: ['Limits'] },
    { concept: 'Limits', leadsTo: ['Continuity', 'Derivatives'] },
    { concept: 'Slope', leadsTo: ['Secant Lines'] },
    { concept: 'Secant Lines', leadsTo: ['Tangent Lines'] },
    { concept: 'Tangent Lines', leadsTo: ['Derivatives'] },
    { concept: 'Derivatives', relatedTo: ['Continuity'] }
  ],
  relatedNoteIds: ['seed-limits', 'seed-slope', 'seed-tangent'],
  connectionSentence: 'This builds on your previous note about Limits, where you worked through one sided limits.',
  createdAt: new Date().toISOString()
}

export const DEMO_RELATED: Note[] = [
  {
    id: 'seed-limits',
    title: 'Limits',
    source: 'pasted-text',
    rawContent: '',
    summary: '',
    keyConcepts: ['Limits', 'Approaching a Value', 'One Sided Limits', 'Continuity'],
    questions: [],
    flowchart: [],
    relatedNoteIds: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-slope',
    title: 'Slope',
    source: 'pasted-text',
    rawContent: '',
    summary: '',
    keyConcepts: ['Slope', 'Rate of Change', 'Secant Lines', 'Functions'],
    questions: [],
    flowchart: [],
    relatedNoteIds: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-tangent',
    title: 'Tangent Lines',
    source: 'pasted-text',
    rawContent: '',
    summary: '',
    keyConcepts: ['Tangent Lines', 'Slope', 'Limits', 'Instantaneous Rate of Change'],
    questions: [],
    flowchart: [],
    relatedNoteIds: [],
    createdAt: new Date().toISOString()
  }
]
