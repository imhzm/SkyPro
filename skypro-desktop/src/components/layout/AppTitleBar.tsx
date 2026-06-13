import { useEffect, useRef, useState } from 'react'
import { useAppStore, useAuthStore } from '../../stores/appStore'
import { Menu, Bell, Globe, Minus, Square, X, LogOut, Search, ChevronDown } from 'lucide-react'
import logoSrc from '../../assets/logo.png'

/* ============================================================
   AppTitleBar — slim frameless-window top bar (Night Edition)

   Single translucent dark strip (~h-12). The whole bar is an
   Electron drag region; every interactive cluster opts out via
   -webkit-app-region: no-drag (.sw-win-btn carries it in CSS).
   ============================================================ */

export default function AppTitleBar() {
  const { toggleSidebar } = useAppStore()
  const { loginUser, logout } = useAuthStore()
  const [isMaximized, setIsMaximized] = useState(false)
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMaximized = () => {
      setIsMaximized(window.outerWidth >= screen.availWidth - 10)
    }
    checkMaximized()
    window.addEventListener('resize', checkMaximized)
    return () => window.removeEventListener('resize', checkMaximized)
  }, [])

  /* Close the workspace dropdown on outside click / Escape. */
  useEffect(() => {
    if (!isWorkspaceOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setIsWorkspaceOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWorkspaceOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isWorkspaceOpen])

  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleToggleMaximize = () => {
    window.electronAPI?.toggleMaximizeWindow()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.electronAPI?.closeWindow()

  const openPalette = () => window.dispatchEvent(new CustomEvent('skypro:open-palette'))

  const toggleLanguage = () => {
    const { settings, setSettings } = useAppStore.getState()
    setSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
  }

  const handleLogout = () => {
    setIsWorkspaceOpen(false)
    logout()
  }

  return (
    <div
      className="relative flex items-center h-12 select-none"
      style={{
        background: 'rgba(7, 10, 19, 0.72)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* ===== Inline-start (right in RTL): menu + brand + workspace ===== */}
      <div className="flex items-center h-full">
        <button onClick={toggleSidebar} className="sw-win-btn px-3 h-full" title="القائمة الجانبية">
          <Menu size={16} className="text-white/60" />
        </button>

        {/* Brand block */}
        <div className="flex items-center gap-2.5 ps-0.5 pe-3">
          <img
            src={logoSrc}
            alt="SkyPro"
            className="w-7 h-7 flex-shrink-0 object-contain"
            style={{ filter: 'drop-shadow(0 2px 10px rgba(124, 58, 237, 0.45))' }}
          />
          <div className="hidden md:flex flex-col leading-none">
            <span className="text-white/95 font-bold text-[12.5px] tracking-wide">SkyPro</span>
            <span
              className="mt-0.5 text-[8.5px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: 'rgba(167, 139, 250, 0.55)' }}
            >
              BY SKY WAVE
            </span>
          </div>
        </div>

        {/* Workspace pill + dropdown */}
        <div
          ref={workspaceRef}
          className="relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setIsWorkspaceOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={isWorkspaceOpen}
            title="مساحة العمل"
            className="flex items-center gap-2 h-8 ps-1.5 pe-2.5 rounded-full transition-colors hover:bg-white/[0.07]"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
              }}
            >
              س
            </span>
            <span className="text-[11px] font-semibold text-white/85 hidden lg:block">Sky Wave Ads</span>
            <ChevronDown
              size={12}
              className={`text-white/45 transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isWorkspaceOpen && (
            <div
              role="menu"
              className="absolute top-full mt-2 w-60 rounded-xl overflow-hidden z-50"
              style={{
                insetInlineStart: 0,
                background: '#0b0f1a',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="px-3.5 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <p className="text-[9.5px] font-semibold mb-1" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
                  الحساب الحالي
                </p>
                <p
                  className="text-[11.5px] font-semibold text-white/90 truncate"
                  dir="ltr"
                  style={{ textAlign: 'end' }}
                >
                  {loginUser?.email || 'حساب SkyPro'}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[11.5px] font-semibold transition-colors hover:bg-white/[0.06]"
                style={{ color: '#f87171' }}
              >
                <LogOut size={13} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== Center: command-palette search pill ===== */}
      <div className="flex-1 flex items-center justify-center px-3 h-full min-w-0">
        <button
          onClick={openPalette}
          title="بحث سريع (Ctrl+K)"
          className="group flex items-center gap-2 w-full max-w-md h-8 ps-3 pe-1.5 rounded-full transition-colors hover:bg-white/[0.06]"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <Search size={13} className="text-white/40 flex-shrink-0" />
          <span
            className="flex-1 text-start text-[11.5px] truncate"
            style={{ color: 'rgba(234, 243, 255, 0.40)' }}
          >
            ابحث أو اكتب أمر…
          </span>
          <span className="sw-kbd hidden sm:inline-flex flex-shrink-0" dir="ltr">
            Ctrl K
          </span>
        </button>
      </div>

      {/* ===== Inline-end (left in RTL): status cluster + window controls ===== */}
      <div className="flex items-center h-full">
        {/* Online pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 h-6 px-2.5 rounded-full me-1"
          style={{
            background: 'rgba(34, 197, 94, 0.10)',
            border: '1px solid rgba(34, 197, 94, 0.22)',
          }}
        >
          <span className="sw-status-dot" />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'rgba(74, 222, 128, 0.90)' }}>
            متصل
          </span>
        </div>

        <button className="sw-win-btn px-2.5 h-full" title="الإشعارات">
          <Bell size={15} className="text-white/55" />
        </button>

        <button onClick={toggleLanguage} className="sw-win-btn px-2.5 h-full" title="تبديل اللغة">
          <Globe size={15} className="text-white/55" />
        </button>

        <div className="h-5 w-px mx-1" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        <button onClick={handleMinimize} className="sw-win-btn w-11 h-full" title="تصغير">
          <Minus size={16} className="text-white/65" />
        </button>

        <button
          onClick={handleToggleMaximize}
          className="sw-win-btn w-11 h-full"
          title={isMaximized ? 'استعادة' : 'تكبير'}
        >
          {isMaximized ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-white/65"
            >
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <path d="M5 3V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-1" />
            </svg>
          ) : (
            <Square size={14} className="text-white/65" />
          )}
        </button>

        <button onClick={handleClose} className="sw-win-btn sw-win-btn-close w-11 h-full" title="إغلاق">
          <X size={16} className="text-white/65" />
        </button>
      </div>
    </div>
  )
}
