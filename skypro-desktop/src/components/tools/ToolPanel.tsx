import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ToolPanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ size?: number }>
  accent?: string
  accentGradient?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widthMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export default function ToolPanel({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  accent = '#0A6CF1',
  accentGradient,
  children,
  footer,
  width = 'lg',
}: ToolPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const headerGradient =
    accentGradient || `linear-gradient(135deg, ${accent}, ${accent}cc)`

  return createPortal(
    <div
      aria-hidden={!open}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ top: '44px' }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.40) 100%)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 bottom-0 right-0 w-full ${widthMap[width]} flex flex-col`}
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow:
            '-24px 0 80px rgba(15, 23, 42, 0.24), -8px 0 24px rgba(10, 108, 241, 0.08)',
          borderInlineStart: '1px solid rgba(226, 232, 240, 0.8)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 py-4 overflow-hidden"
          style={{
            background: headerGradient,
          }}
        >
          {/* Decorative top hairline */}
          <span
            aria-hidden
            className="absolute inset-x-12 top-0 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            }}
          />
          {/* Decorative aurora blob */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 65%)',
              filter: 'blur(20px)',
            }}
          />

          <div className="flex items-center gap-3 min-w-0 relative">
            {Icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.20)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.20)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20)',
                }}
              >
                <span className="text-white">
                  <Icon size={20} />
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-white font-bold text-lg leading-tight truncate tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-white/80 text-xs mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-white shrink-0 relative"
            style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.26)'
              e.currentTarget.style.transform = 'rotate(90deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'
              e.currentTarget.style.transform = 'rotate(0)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-container px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 py-4 border-t"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderColor: 'rgba(226, 232, 240, 0.8)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
