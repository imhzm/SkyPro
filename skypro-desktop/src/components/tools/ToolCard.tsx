import type { LucideIcon } from 'lucide-react'

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
  onClick: () => void
}

const badgeTones = {
  success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: 'rgba(34, 197, 94, 0.25)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
  danger: { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' },
  primary: { bg: 'rgba(10, 108, 241, 0.1)', color: '#0A6CF1', border: 'rgba(10, 108, 241, 0.25)' },
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
  onClick,
}: ToolCardProps) {
  const iconBg = accentGradient || `linear-gradient(135deg, ${accent}, ${accent}dd)`
  const tone = badgeTones[badgeTone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative text-right rounded-2xl p-4 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none focus:outline-none"
      style={{
        background: active
          ? `linear-gradient(135deg, ${accent}10, ${accent}05)`
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${active ? accent + '60' : 'rgba(226, 232, 240, 0.7)'}`,
        boxShadow: active
          ? `0 0 0 3px ${accent}1f, 0 6px 20px ${accent}1a`
          : '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.03)',
      }}
      onMouseEnter={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 10px 28px ${accent}22, 0 4px 14px rgba(0, 0, 0, 0.05)`
        e.currentTarget.style.borderColor = accent + '55'
      }}
      onMouseLeave={(e) => {
        if (disabled || active) return
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.03)'
        e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.7)'
      }}
    >
      {badge && (
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: tone.bg,
            color: tone.color,
            border: `1px solid ${tone.border}`,
          }}
        >
          {badge}
        </span>
      )}

      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: iconBg,
            color: 'white',
            boxShadow: `0 6px 16px ${accent}40`,
          }}
        >
          <Icon size={26} />
        </div>
        <div className="space-y-1">
          <h4
            className="font-bold text-sm leading-tight"
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
