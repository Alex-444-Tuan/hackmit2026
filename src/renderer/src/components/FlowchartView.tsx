import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import type { FlowchartEdge } from '../api/types'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'strict',
  themeVariables: {
    background: '#1f1d3a',
    primaryColor: '#262347',
    primaryTextColor: '#eceaf8',
    primaryBorderColor: '#3f6f5e',
    lineColor: '#5c568a',
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', sans-serif",
    fontSize: '14px'
  }
})

/**
 * Builds Mermaid source from structured edges. The LLM never emits Mermaid
 * syntax directly, because it gets it wrong often enough to break a live demo.
 * Node ids are sanitized to n0, n1... and concept names go in quoted labels,
 * so parentheses, colons or quotes in a concept name cannot break the diagram.
 */
export function toMermaid(edges: FlowchartEdge[]): string {
  const ids = new Map<string, string>()

  const idFor = (concept: string): string => {
    const key = concept.trim()
    if (!ids.has(key)) ids.set(key, `n${ids.size}`)
    return ids.get(key) as string
  }

  const lines: string[] = ['flowchart TD']
  const seen = new Set<string>()

  for (const edge of edges) {
    if (!edge.concept?.trim()) continue
    idFor(edge.concept)

    for (const target of edge.leadsTo ?? []) {
      if (!target?.trim() || target.trim() === edge.concept.trim()) continue
      const key = `${edge.concept}>${target}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push(`  ${idFor(edge.concept)} --> ${idFor(target)}`)
    }

    for (const target of edge.relatedTo ?? []) {
      if (!target?.trim() || target.trim() === edge.concept.trim()) continue
      const key = `${edge.concept}-${target}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push(`  ${idFor(edge.concept)} -.- ${idFor(target)}`)
    }
  }

  // Labels last, so every node that only appeared as a target still gets named.
  for (const [concept, id] of ids) {
    const label = concept.replace(/"/g, "'")
    lines.push(`  ${id}["${label}"]`)
  }

  // A single node with no edges is still a valid diagram.
  if (ids.size === 0) lines.push('  n0["No concepts yet"]')

  return lines.join('\n')
}

export default function FlowchartView({ edges }: { edges: FlowchartEdge[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const reactId = useId()
  const renderId = `flow${reactId.replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    let cancelled = false
    const source = toMermaid(edges)

    mermaid
      .render(renderId, source)
      .then(({ svg }) => {
        if (cancelled || !hostRef.current) return
        hostRef.current.innerHTML = svg
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not draw the flowchart.')
      })

    return () => {
      cancelled = true
    }
  }, [edges, renderId])

  if (error) {
    return <p className="flow__error">Flowchart could not render: {error}</p>
  }

  return <div className="flow" ref={hostRef} />
}
