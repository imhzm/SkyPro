import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import { BrandIcon } from '../icons/BrandIcon'
import { hasBrandIcon } from '../icons/brand-data'
import type { PlatformId } from '../../types'

/* ============================================================
   CommandPalette — quick platform/tool switcher (Night Edition)

   Opens on Ctrl/Meta+K or the 'skypro:open-palette' window event
   (dispatched by the title-bar search pill). Selecting an entry
   routes through useAppStore.setActivePlatform — same contract
   the Sidebar uses.
   ============================================================ */

/* Lucide fallbacks for entries without an official brand mark
   (same icon-name resolution the Sidebar uses). */
const lucideMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard: Icons.LayoutDashboard,
  Users: Icons.Users,
  Zap: Icons.Zap,
  Wrench: Icons.Wrench,
  Shield: Icons.Shield,
  User: Icons.User,
  Settings: Icons.Settings,
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return platforms
    return platforms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.segment.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    )
  }, [query])

  const open = useCallback(() => {
    setQuery('')
    setHighlight(0)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const select = useCallback((id: PlatformId) => {
    useAppStore.getState().setActivePlatform(id)
    setIsOpen(false)
  }, [])

  /* Open via the title-bar search pill. */
  useEffect(() => {
    const onOpenPalette = () => open()
    window.addEventListener('skypro:open-palette', onOpenPalette)
    return () => window.removeEventListener('skypro:open-palette', onOpenPalette)
  }, [open])

  /* Global keyboard: Ctrl/Meta+K toggles; arrows / Enter / Escape while open. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        if (isOpen) close()
        else open()
        return
      }
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (results.length ? (h + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (results.length ? (h - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = results[highlight]
        if (item) select(item.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, results, highlight, open, close, select])

  /* Keep the highlighted row visible while navigating with the keyboard. */
  useEffect(() => {
    if (!isOpen) return
    const el = listRef.current?.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="البحث السريع">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Panel */}
      <div
        className="relative mt-[12vh] mx-auto w-full max-w-lg rounded-2xl overflow-hidden shadow-xl"
        style={{ background: '#0b0f1a', border: '1px solid rgba(255, 255, 255, 0.10)' }}
      >
        {/* Search header */}
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}
        >
          <Icons.Search size={15} className="text-white/40 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            placeholder="ابحث عن منصة أو أداة…"
            className="flex-1 min-w-0 h-12 bg-transparent text-[13px] text-white placeholder:text-white/35"
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
          />
          <span className="sw-kbd flex-shrink-0">Esc</span>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="النتائج"
          className="max-h-[46vh] overflow-y-auto scroll-container p-1.5"
        >
          {results.length === 0 ? (
            <p className="py-8 text-center text-[12px]" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
              لا توجد نتائج مطابقة
            </p>
          ) : (
            results.map((platform, index) => {
              const isHighlighted = index === highlight
              const LucideFallback = lucideMap[platform.icon] || Icons.Circle
              return (
                <button
                  key={platform.id}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => select(platform.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-colors cursor-pointer"
                  style={{
                    background: isHighlighted ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                    border: 'none',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: isHighlighted ? '#fff' : 'rgba(255, 255, 255, 0.78)',
                    }}
                  >
                    {hasBrandIcon(platform.id) ? (
                      <BrandIcon platform={platform.id} variant="mono" size={18} />
                    ) : (
                      <LucideFallback size={16} />
                    )}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col items-start">
                    <span
                      className="truncate w-full text-[12.5px] font-semibold"
                      style={{ color: isHighlighted ? '#fff' : 'rgba(234, 243, 255, 0.85)' }}
                    >
                      {platform.name}
                    </span>
                    <span
                      className="truncate w-full text-[10.5px]"
                      style={{ color: 'rgba(234, 243, 255, 0.40)' }}
                    >
                      {platform.segment}
                    </span>
                  </span>
                  {isHighlighted && (
                    <Icons.CornerDownLeft
                      size={12}
                      className="flex-shrink-0"
                      style={{ color: 'rgba(167, 139, 250, 0.70)' }}
                    />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Hints footer */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
            <span className="sw-kbd" dir="ltr">↑↓</span>
            تنقل
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
            <span className="sw-kbd">Enter</span>
            فتح
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
            <span className="sw-kbd">Esc</span>
            إغلاق
          </span>
        </div>
      </div>
    </div>
  )
}
