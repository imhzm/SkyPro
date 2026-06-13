import { useMemo, useState } from 'react'

/* ============================================================
   DonutChart — dependency-free SVG donut (Night Edition).
   Pure SVG coordinates (LTR) so it is RTL-safe. Hovering a
   segment emphasises it; the legend lives outside (caller).
   ============================================================ */

export interface DonutSegment {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  segments: DonutSegment[]
  /** Outer square size in px. */
  size?: number
  /** Ring thickness in px. */
  thickness?: number
  /** Small caption under the center total. */
  centerLabel?: string
  /** Index emphasised from outside (e.g. legend hover). */
  activeIndex?: number | null
  onActiveChange?: (index: number | null) => void
}

const fmt = (n: number) => n.toLocaleString('en-US')

export function DonutChart({
  segments,
  size = 180,
  thickness = 16,
  centerLabel = 'إجمالي',
  activeIndex = null,
  onActiveChange,
}: DonutChartProps) {
  const [innerActive, setInnerActive] = useState<number | null>(null)
  const active = activeIndex ?? innerActive

  const total = useMemo(() => segments.reduce((a, s) => a + s.value, 0), [segments])
  const r = (size - thickness) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  // Small visual gap between segments (none when a single segment).
  const visible = segments.filter((s) => s.value > 0)
  const gap = visible.length > 1 ? circumference * 0.012 : 0

  const arcs = useMemo(() => {
    if (total <= 0) return []
    let offset = 0
    return segments.map((s, i) => {
      const frac = s.value / total
      const len = Math.max(frac * circumference - gap, 0)
      const arc = { ...s, index: i, dash: `${len} ${circumference - len}`, offset: -offset }
      offset += frac * circumference
      return arc
    })
  }, [segments, total, circumference, gap])

  const setActive = (i: number | null) => {
    setInnerActive(i)
    onActiveChange?.(i)
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`مخطط دائري — ${centerLabel} ${fmt(total)}`}
      style={{ display: 'block' }}
    >
      {/* Track ring */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={thickness}
      />
      {/* Segments (start at 12 o'clock) */}
      <g transform={`rotate(-90 ${c} ${c})`}>
        {arcs.map((a) => (
          <circle
            key={a.index}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={active === a.index ? thickness + 3 : thickness}
            strokeDasharray={a.dash}
            strokeDashoffset={a.offset}
            opacity={active === null || active === a.index ? 1 : 0.30}
            style={{ transition: 'opacity 0.18s ease, stroke-width 0.18s ease', cursor: 'pointer' }}
            onMouseEnter={() => setActive(a.index)}
            onMouseLeave={() => setActive(null)}
          >
            <title>{`${a.label} · ${fmt(a.value)}`}</title>
          </circle>
        ))}
      </g>
      {/* Center total */}
      <text
        x={c}
        y={c - 2}
        textAnchor="middle"
        fontSize={size * 0.115}
        fontWeight={800}
        fill="rgba(255,255,255,0.95)"
      >
        {fmt(active !== null && segments[active] ? segments[active].value : total)}
      </text>
      <text
        x={c}
        y={c + size * 0.095}
        textAnchor="middle"
        fontSize={size * 0.058}
        fill="rgba(255,255,255,0.40)"
      >
        {active !== null && segments[active] ? segments[active].label : centerLabel}
      </text>
    </svg>
  )
}

export default DonutChart
