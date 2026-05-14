import type { LucideIcon } from 'lucide-react'

interface ToolGridProps {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  accent?: string
  children: React.ReactNode
  cols?: 2 | 3 | 4 | 5 | 6
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
}: ToolGridProps) {
  return (
    <section className="space-y-4">
      {(title || subtitle) && (
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                  border: `1px solid ${accent}30`,
                  color: accent,
                }}
              >
                <Icon size={20} />
              </div>
            )}
            <div>
              {title && <h3 className="font-bold text-secondary-900 text-base leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-secondary-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </header>
      )}
      <div className={`grid ${colsMap[cols]} gap-3`}>{children}</div>
    </section>
  )
}
