import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData } from '../api/types'

interface GraphNode {
  id: string
  name: string
  noteCount: number
  x?: number
  y?: number
}

interface Props {
  data: GraphData
  selectedId: string | null
  highlightIds?: string[]
  onSelect: (nodeId: string | null) => void
}

const MINT = '#79d6b0'
const LINE = '#5c568a'
const TEXT = '#eceaf8'
const MUTED = '#6f689a'

export default function KnowledgeGraph({ data, selectedId, highlightIds = [], onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 640, height: 460 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.max(320, width), height: Math.max(320, height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // react-force-graph mutates the objects it is given (it writes x, y and
  // replaces link source/target with node references). Hand it a fresh copy so
  // the fixture and any future API response are never corrupted.
  const graph = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l }))
    }),
    [data]
  )

  const highlighted = useMemo(() => new Set(highlightIds), [highlightIds])

  return (
    <div className="graph" ref={wrapRef}>
      <ForceGraph2D
        width={size.width}
        height={size.height}
        graphData={graph}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        d3VelocityDecay={0.3}
        linkColor={() => LINE}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node) => onSelect((node as GraphNode).id)}
        onBackgroundClick={() => onSelect(null)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNode
          // Hubs are bigger, so shared concepts read as the center of gravity.
          const radius = 4 + Math.min(n.noteCount, 6) * 1.9
          const isSelected = n.id === selectedId
          const isHot = highlighted.has(n.id)

          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, radius, 0, 2 * Math.PI)
          ctx.fillStyle = isSelected || isHot ? MINT : '#3d3a68'
          ctx.fill()

          if (isSelected) {
            ctx.lineWidth = 2 / globalScale
            ctx.strokeStyle = TEXT
            ctx.stroke()
          }

          const fontSize = Math.max(9, 12 / globalScale)
          ctx.font = `${fontSize}px 'Segoe UI', sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = isSelected || isHot ? TEXT : MUTED
          ctx.fillText(n.name, n.x ?? 0, (n.y ?? 0) + radius + 3)
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as GraphNode
          const radius = 4 + Math.min(n.noteCount, 6) * 1.9
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, radius + 4, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
        }}
      />
    </div>
  )
}
