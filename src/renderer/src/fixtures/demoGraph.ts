import type { GraphData } from '../api/types'

/**
 * Stand in for GET /graph. Matches the four seeded notes plus the live
 * derivatives note, so the hubs (Limits, Slope, Functions) are already
 * visible before the backend exists.
 */
export const DEMO_GRAPH: GraphData = {
  nodes: [
    { id: 'c-functions', name: 'Functions', noteCount: 3 },
    { id: 'c-domain', name: 'Domain', noteCount: 1 },
    { id: 'c-range', name: 'Range', noteCount: 1 },
    { id: 'c-limits', name: 'Limits', noteCount: 3 },
    { id: 'c-approaching', name: 'Approaching a Value', noteCount: 1 },
    { id: 'c-onesided', name: 'One Sided Limits', noteCount: 1 },
    { id: 'c-continuity', name: 'Continuity', noteCount: 2 },
    { id: 'c-slope', name: 'Slope', noteCount: 3 },
    { id: 'c-rate', name: 'Rate of Change', noteCount: 1 },
    { id: 'c-secant', name: 'Secant Lines', noteCount: 2 },
    { id: 'c-tangent', name: 'Tangent Lines', noteCount: 2 },
    { id: 'c-instant', name: 'Instantaneous Rate of Change', noteCount: 1 },
    { id: 'c-derivatives', name: 'Derivatives', noteCount: 1 }
  ],
  links: [
    { source: 'c-functions', target: 'c-domain', kind: 'related-to' },
    { source: 'c-functions', target: 'c-range', kind: 'related-to' },
    { source: 'c-functions', target: 'c-limits', kind: 'leads-to' },
    { source: 'c-limits', target: 'c-approaching', kind: 'leads-to' },
    { source: 'c-limits', target: 'c-onesided', kind: 'leads-to' },
    { source: 'c-limits', target: 'c-continuity', kind: 'leads-to' },
    { source: 'c-slope', target: 'c-rate', kind: 'related-to' },
    { source: 'c-slope', target: 'c-secant', kind: 'leads-to' },
    { source: 'c-secant', target: 'c-tangent', kind: 'leads-to' },
    { source: 'c-tangent', target: 'c-slope', kind: 'related-to' },
    { source: 'c-tangent', target: 'c-limits', kind: 'related-to' },
    { source: 'c-tangent', target: 'c-instant', kind: 'leads-to' },
    { source: 'c-tangent', target: 'c-derivatives', kind: 'leads-to' },
    { source: 'c-limits', target: 'c-derivatives', kind: 'leads-to' },
    { source: 'c-derivatives', target: 'c-continuity', kind: 'related-to' }
  ]
}

/** Which notes mention each concept. Backend replaces this with a real query. */
export const DEMO_CONCEPT_NOTES: Record<string, { id: string; title: string }[]> = {
  'c-functions': [
    { id: 'seed-functions', title: 'Functions' },
    { id: 'seed-slope', title: 'Slope' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-limits': [
    { id: 'seed-limits', title: 'Limits' },
    { id: 'seed-tangent', title: 'Tangent Lines' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-slope': [
    { id: 'seed-slope', title: 'Slope' },
    { id: 'seed-tangent', title: 'Tangent Lines' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-continuity': [
    { id: 'seed-limits', title: 'Limits' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-secant': [
    { id: 'seed-slope', title: 'Slope' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-tangent': [
    { id: 'seed-tangent', title: 'Tangent Lines' },
    { id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }
  ],
  'c-derivatives': [{ id: 'demo-derivatives', title: 'Lecture 4: Introduction to Derivatives' }],
  'c-domain': [{ id: 'seed-functions', title: 'Functions' }],
  'c-range': [{ id: 'seed-functions', title: 'Functions' }],
  'c-approaching': [{ id: 'seed-limits', title: 'Limits' }],
  'c-onesided': [{ id: 'seed-limits', title: 'Limits' }],
  'c-rate': [{ id: 'seed-slope', title: 'Slope' }],
  'c-instant': [{ id: 'seed-tangent', title: 'Tangent Lines' }]
}
