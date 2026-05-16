import type { LucideIcon } from 'lucide-react'

interface ToolGridProps {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  accent?: string
  children: React.ReactNode
  cols?: 2 | 3 | 4 | 5 | 6
  count?: number
}

const colsMap: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

export default function ToolGrid({
  title,
  subtitle,
  icon: Icon,
  accent = '#0A6CF1',
  children,
  cols = 4,
  count,
}: ToolGridProps) {
  return (
    <section className="space-y-3.5">
      {(title || subtitle) && (
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${accent}1a, ${accent}08)`,
                  border: `1px solid ${accent}30`,
                  color: accent,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px ${accent}14`,
                }}
              >
                <Icon size={19} />
                {/* Subtle gradient line accent */}
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-px rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
                  }}
                />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  className="font-bold text-secondary-900 text-base leading-tight tracking-tight"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11.5px] text-secondary-500 mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {typeof count === 'number' && (
            <span
              className="px-2.5 py-1 rounded-full text-[10.5px] font-bold flex-shrink-0"
              style={{
                background: `${accent}10`,
                color: accent,
                border: `1px solid ${accent}24`,
              }}
            >
              {count} {count === 1 ? 'أداة' : 'أدوات'}
            </span>
          )}
        </header>
      )}

      {/* Decorative gradient line under the header */}
      {(title || subtitle) && (
        <div
          aria-hidden
          className="mx-1 h-px"
          style={{
            background: `linear-gradient(90deg, ${accent}28, ${accent}08 40%, transparent 100%)`,
          }}
        />
      )}

      <div className={`grid ${colsMap[cols]} gap-3`}>{children}</div>
    </section>
  )
}
