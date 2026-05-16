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
  success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803d', border: 'rgba(34, 197, 94, 0.30)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: 'rgba(245, 158, 11, 0.30)' },
  danger:  { bg: 'rgba(239, 68, 68, 0.12)',  color: '#b91c1c', border: 'rgba(239, 68, 68, 0.30)' },
  primary: { bg: 'rgba(10, 108, 241, 0.10)', color: '#0a4fc4', border: 'rgba(10, 108, 241, 0.28)' },
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
          ? `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1.5px solid ${active ? accent + '60' : 'rgba(226, 232, 240, 0.7)'}`,
        boxShadow: active
          ? `0 0 0 3px ${accent}1f, 0 8px 24px ${accent}1c, inset 0 1px 0 rgba(255,255,255,0.6)`
          : '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
        opacity: locked ? 0.72 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 12px 32px ${accent}22, 0 4px 14px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)`
        e.currentTarget.style.borderColor = accent + '60'
        if (locked) e.currentTarget.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255,255,255,0.5)'
        e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.7)'
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
            background: 'rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(15, 23, 42, 0.10)',
            color: 'rgba(71, 85, 105, 0.85)',
            backdropFilter: 'blur(6px)',
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
            style={{ color: active ? accent : '#0f172a' }}
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
