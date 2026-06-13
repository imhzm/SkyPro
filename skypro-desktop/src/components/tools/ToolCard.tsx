import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, Lock } from 'lucide-react'

export interface ToolCardProps {
  icon: LucideIcon
  name: string
  description?: string
  accent?: string
  accentGradient?: string
  badge?: string
  badgeTone?: 'success' | 'warning' | 'danger' | 'primary'
  disabled?: boolean
  active?: boolean
  /** Show a subtle lock icon + dimmed look for tools that need an active session. */
  locked?: boolean
  onClick: () => void
}

const badgeTones = {
  success: { bg: 'rgba(34, 197, 94, 0.14)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.30)' },
  warning: { bg: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.30)' },
  danger:  { bg: 'rgba(239, 68, 68, 0.14)',  color: '#f87171', border: 'rgba(239, 68, 68, 0.30)' },
  primary: { bg: 'rgba(139, 92, 246, 0.14)', color: '#c4b5fd', border: 'rgba(139, 92, 246, 0.30)' },
}

export default function ToolCard({
  icon: Icon,
  name,
  description,
  accent = '#0A6CF1',
  accentGradient,
  badge,
  badgeTone = 'primary',
  disabled = false,
  active = false,
  locked = false,
  onClick,
}: ToolCardProps) {
  const iconBg = accentGradient || `linear-gradient(135deg, ${accent}, ${accent}dd)`
  const tone = badgeTones[badgeTone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={locked ? 'سجل الدخول أولاً لاستخدام هذه الأداة' : undefined}
      className="group relative text-right rounded-2xl p-4 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none focus:outline-none overflow-hidden"
      style={{
        background: active
          ? `linear-gradient(135deg, ${accent}26 0%, ${accent}12 100%)`
          : 'rgba(255, 255, 255, 0.04)',
        border: `1.5px solid ${active ? accent + '70' : 'rgba(255, 255, 255, 0.08)'}`,
        boxShadow: active
          ? `0 0 0 3px ${accent}26, 0 8px 24px ${accent}26, inset 0 1px 0 rgba(255,255,255,0.06)`
          : '0 1px 3px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        opacity: locked ? 0.72 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 12px 32px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.06)`
        e.currentTarget.style.borderColor = accent + '70'
        if (locked) e.currentTarget.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
        if (locked) e.currentTarget.style.opacity = '0.72'
      }}
    >
      {/* Hover sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      {/* Top-leading indicator: chevron on hover, OR lock when locked */}
      {locked ? (
        <span
          aria-hidden
          className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'rgba(234, 243, 255, 0.70)',
          }}
          title="تسجيل الدخول مطلوب"
        >
          <Lock size={11} />
        </span>
      ) : (
        <span
          aria-hidden
          className="absolute top-3 left-3 transition-all duration-300 opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0"
          style={{ color: accent }}
        >
          <ChevronLeft size={14} />
        </span>
      )}

      {badge && !locked && (
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
          style={{
            background: tone.bg,
            color: tone.color,
            border: `1px solid ${tone.border}`,
          }}
        >
          {badge}
        </span>
      )}

      <div className="flex flex-col items-center text-center gap-3 relative z-10">
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{
            background: iconBg,
            color: 'white',
            boxShadow: `0 8px 20px ${accent}48, inset 0 1px 0 rgba(255,255,255,0.20)`,
            filter: locked ? 'saturate(0.7)' : 'none',
          }}
        >
          {/* Icon glow */}
          <span
            aria-hidden
            className="absolute inset-0 -m-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />
          <Icon size={26} className="relative" />
        </div>
        <div className="space-y-1 w-full">
          <h4
            className="font-bold text-sm leading-tight tracking-tight"
            style={{ color: active ? accent : 'rgba(255,255,255,0.92)' }}
          >
            {name}
          </h4>
          {description && (
            <p className="text-[11px] leading-snug text-secondary-500 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
