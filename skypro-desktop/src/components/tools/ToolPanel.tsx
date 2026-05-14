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

  const headerGradient = accentGradient || `linear-gradient(135deg, ${accent}, ${accent}cc)`

  return createPortal(
    <div
      aria-hidden={!open}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ top: '48px' }}
    >
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 bottom-0 right-0 w-full ${widthMap[width]} flex flex-col`}
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '-20px 0 60px rgba(15, 23, 42, 0.18), -4px 0 20px rgba(10, 108, 241, 0.08)',
          borderInlineStart: '1px solid rgba(226, 232, 240, 0.8)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: headerGradient,
            borderColor: 'rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)' }}
              >
                <span className="text-white"><Icon size={20} /></span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{title}</h2>
              {subtitle && <p className="text-white/75 text-xs mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-white shrink-0"
            style={{ background: 'rgba(255, 255, 255, 0.12)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-container px-6 py-6">
          {children}
        </div>

        {footer && (
          <div
            className="px-6 py-4 border-t bg-white/80 backdrop-blur-sm"
            style={{ borderColor: 'rgba(226, 232, 240, 0.8)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
