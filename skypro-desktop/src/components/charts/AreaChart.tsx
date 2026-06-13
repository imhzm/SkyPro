import { useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

/* ============================================================
   AreaChart — dependency-free SVG area chart (Night Edition).

   Fixed internal coordinate system (VIEW_W × height viewBox) that
   scales uniformly with the container width, so it is RTL-safe:
   SVG coordinates are always LTR regardless of document dir.
   ============================================================ */

export interface AreaChartPoint {
  label: string
  value: number
}

export interface AreaChartProps {
  data: AreaChartPoint[]
  /** viewBox height (rendered height scales with container width). */
  height?: number
  color?: string
}

const VIEW_W = 600
const PAD_X = 20
const PAD_TOP = 18
const PAD_BOTTOM = 30

const fmt = (n: number) => n.toLocaleString('en-US')

/** Smooth path through every point (Catmull-Rom → bezier segments). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export function AreaChart({ data, height = 220, color = '#8b5cf6' }: AreaChartProps) {
  const gradientId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const baseY = height - PAD_BOTTOM
  const chartH = baseY - PAD_TOP
  const max = useMemo(() => Math.max(...data.map((d) => d.value), 0), [data])
  const hasData = data.length > 0 && max > 0

  const points = useMemo(() => {
    if (data.length === 0) return []
    const innerW = VIEW_W - PAD_X * 2
    const step = data.length > 1 ? innerW / (data.length - 1) : 0
    return data.map((d, i) => ({
      x: data.length > 1 ? PAD_X + step * i : VIEW_W / 2,
      y: max > 0 ? baseY - (d.value / max) * chartH : baseY,
      label: d.label,
      value: d.value,
    }))
  }, [data, max, baseY, chartH])

  const linePath = useMemo(() => (hasData ? smoothPath(points) : ''), [hasData, points])
  const areaPath = useMemo(() => {
    if (!hasData || points.length < 2) return ''
    const first = points[0]
    const last = points[points.length - 1]
    return `${linePath} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`
  }, [hasData, points, linePath, baseY])

  // Horizontal gridlines at 0 / ⅓ / ⅔ / max with value labels (deduped).
  const gridlines = useMemo(() => {
    const fracs = [0, 1 / 3, 2 / 3, 1]
    const seen = new Set<number>()
    return fracs.map((f) => {
      const value = Math.round(max * f)
      const showLabel = hasData && !seen.has(value)
      seen.add(value)
      return { y: baseY - f * chartH, value, showLabel }
    })
  }, [max, hasData, baseY, chartH])

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!hasData || points.length === 0) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W
    let nearest = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - x)
      if (dist < bestDist) {
        bestDist = dist
        nearest = i
      }
    }
    setHover(nearest)
  }

  const tooltip = useMemo(() => {
    if (hover === null || !hasData || !points[hover]) return null
    const p = points[hover]
    const text = `${p.label} · ${fmt(p.value)} سجل`
    const w = Math.max(72, text.length * 6.4 + 18)
    const x = Math.min(Math.max(p.x - w / 2, 4), VIEW_W - w - 4)
    const above = p.y - 40 >= 2
    const y = above ? p.y - 40 : p.y + 14
    return { p, text, w, x, y }
  }, [hover, hasData, points])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      width="100%"
      style={{ display: 'block', height: 'auto' }}
      role="img"
      aria-label="مخطط النشاط"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* gridlines + value labels */}
      {gridlines.map((g, i) => (
        <g key={i}>
          <line x1={PAD_X} x2={VIEW_W - PAD_X} y1={g.y} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          {g.showLabel && (
            <text x={VIEW_W - PAD_X} y={g.y - 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.30)">
              {fmt(g.value)}
            </text>
          )}
        </g>
      ))}

      {/* x labels (real day names) */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 10} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.40)">
          {p.label}
        </text>
      ))}

      {hasData ? (
        <>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3.5}
              fill={color}
              stroke="#0a0e1a"
              strokeWidth={1.5}
            />
          ))}
          {tooltip && (
            <g pointerEvents="none">
              <line x1={tooltip.p.x} x2={tooltip.p.x} y1={PAD_TOP} y2={baseY} stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="3 3" />
              <rect x={tooltip.x} y={tooltip.y} width={tooltip.w} height={24} rx={7} fill="rgba(8,11,22,0.96)" stroke="rgba(255,255,255,0.12)" />
              <text x={tooltip.x + tooltip.w / 2} y={tooltip.y + 16} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.92)">
                {tooltip.text}
              </text>
            </g>
          )}
        </>
      ) : (
        <>
          {/* flat baseline + honest empty state */}
          <line x1={PAD_X} x2={VIEW_W - PAD_X} y1={baseY} y2={baseY} stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} />
          <text x={VIEW_W / 2} y={PAD_TOP + chartH / 2} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.30)">
            لا بيانات بعد
          </text>
        </>
      )}
    </svg>
  )
}

export default AreaChart
