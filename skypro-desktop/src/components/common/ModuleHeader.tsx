import type { LucideIcon } from 'lucide-react'

interface ModuleHeaderBadge {
  label: string
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
}

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  badge?: ModuleHeaderBadge
  /** Optional right-side action (e.g. button). Drag-friendly. */
  action?: React.ReactNode
  /** Optional content below the title/subtitle, like meta chips. */
  meta?: React.ReactNode
}

const TONE_STYLES: Record<
  NonNullable<ModuleHeaderBadge['tone']>,
  { bg: string; border: string; dot: string }
> = {
  success: {
    bg: 'rgba(34, 197, 94, 0.18)',
    border: 'rgba(34, 197, 94, 0.40)',
    dot: '#4ade80',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.40)',
    dot: '#fbbf24',
  },
  danger: {
    bg: 'rgba(239, 68, 68, 0.22)',
    border: 'rgba(239, 68, 68, 0.45)',
    dot: '#f87171',
  },
  neutral: {
    bg: 'rgba(255, 255, 255, 0.10)',
    border: 'rgba(255, 255, 255, 0.18)',
    dot: '#e2e8f0',
  },
}

/**
 * Unified dark brand header used at the top of every primary module page.
 * Single gradient palette so Dashboard / Settings / Security / Account /
 * etc. all share the same "SkyPro feel".
 */
export default function ModuleHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  meta,
}: ModuleHeaderProps) {
  const tone = badge ? TONE_STYLES[badge.tone ?? 'neutral'] : null

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5 sm:p-6"
      style={{
        /* 2026 brand gradient — deep indigo to vivid violet, smoother stops
           so the transition zone doesn't feel muddy. */
        background:
          'linear-gradient(135deg, #0b0a1f 0%, #1e1b4b 28%, #4338ca 56%, #7c3aed 80%, #a855f7 100%)',
        boxShadow:
          '0 20px 50px rgba(67, 56, 202, 0.22), 0 6px 20px rgba(168, 85, 247, 0.14), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.20)',
      }}
    >
      {/* Aurora blob — magenta/pink top right */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(236, 72, 153, 0.45) 0%, rgba(168, 85, 247, 0.20) 40%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      {/* Aurora blob — cyan/blue bottom left for cool contrast */}
      <div
        aria-hidden
        className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(99, 102, 241, 0.18) 40%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      {/* Aurora blob — center violet glow for depth */}
      <div
        aria-hidden
        className="absolute top-1/3 left-1/3 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(196, 181, 253, 0.18) 0%, transparent 60%)',
          filter: 'blur(36px)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at center, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at center, black 30%, transparent 75%)',
        }}
      />

      {/* Top hairline — brighter for premium feel */}
      <div
        aria-hidden
        className="absolute inset-x-12 top-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
        }}
      />

      {/* Bottom hairline */}
      <div
        aria-hidden
        className="absolute inset-x-16 bottom-0 h-px pointer-events-none opacity-60"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.35), transparent)',
        }}
      />

      <div className="relative flex items-center gap-4 sm:gap-5">
        {/* Icon tile */}
        <div
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.15), 0 6px 18px rgba(0,0,0,0.25)',
          }}
        >
          <Icon size={26} className="text-white sm:hidden" />
          <Icon size={30} className="text-white hidden sm:block" />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-xs sm:text-[13px] mt-1 leading-relaxed"
              style={{ color: 'rgba(234, 243, 255, 0.65)' }}
            >
              {subtitle}
            </p>
          )}
          {meta && <div className="mt-3 flex flex-wrap gap-2">{meta}</div>}
        </div>

        {/* Right side: badge + action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge && tone && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: tone.dot,
                  boxShadow: `0 0 6px ${tone.dot}aa`,
                }}
              />
              <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Meta chip for use in ModuleHeader `meta` slot.
   Inline component to keep imports simple in callers.
   ============================================================ */
export function HeaderChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
      style={{
        background: 'rgba(255, 255, 255, 0.10)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </span>
  )
}
