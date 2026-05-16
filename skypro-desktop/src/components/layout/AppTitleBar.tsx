import { useState, useEffect } from 'react'
import { useAppStore, useAuthStore } from '../../stores/appStore'
import { getPlatformById } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import { Menu, Bell, Globe, Minus, Square, X, LogOut, ExternalLink } from 'lucide-react'
import logoSrc from '../../assets/logo.png'

const COMPANY_URL = 'https://www.skywaveads.com'

export default function AppTitleBar() {
  const { activePlatform, toggleSidebar } = useAppStore()
  const { logout } = useAuthStore()
  const platform = getPlatformById(activePlatform)
  const gradient = getPlatformGradient(activePlatform)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const checkMaximized = () => {
      setIsMaximized(window.outerWidth >= screen.availWidth - 10)
    }
    checkMaximized()
    window.addEventListener('resize', checkMaximized)
    return () => window.removeEventListener('resize', checkMaximized)
  }, [])

  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleToggleMaximize = () => {
    window.electronAPI?.toggleMaximizeWindow()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.electronAPI?.closeWindow()

  const openCompanySite = () => {
    // External links route through main process for security
    window.open(COMPANY_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="relative flex items-center justify-between h-11 select-none"
      style={{
        background:
          'linear-gradient(90deg, #050a1c 0%, #0a1437 50%, #0d1137 100%)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Bottom hairline w/ gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(10,108,241,0.45) 30%, rgba(139,44,245,0.45) 70%, transparent 100%)',
        }}
      />

      {/* ===== Left section ===== */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button onClick={toggleSidebar} className="sw-win-btn px-3 h-full" title="القائمة الجانبية">
          <Menu size={17} className="text-white/65" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2.5">
          <div className="relative">
            <img
              src={logoSrc}
              alt="SkyPro"
              className="w-7 h-7 flex-shrink-0 object-contain"
              style={{ filter: 'drop-shadow(0 2px 10px rgba(10, 108, 241, 0.45))' }}
            />
          </div>
          <div className="hidden md:flex flex-col leading-none">
            <span className="text-white font-bold text-[12px] tracking-wide">SkyPro</span>
            <span
              className="mt-0.5 text-[9px] uppercase tracking-[0.18em] font-medium"
              style={{ color: 'rgba(167, 139, 250, 0.55)' }}
            >
              by Sky Wave
            </span>
          </div>
        </div>

        <div className="w-px h-5 mx-1.5" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        {/* Section badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: `${platform?.color || '#0A6CF1'}15`,
            border: `1px solid ${platform?.color || '#0A6CF1'}30`,
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: gradient, boxShadow: `0 2px 6px ${platform?.color || '#0A6CF1'}40` }}
          >
            {platform?.name?.[0] || 'D'}
          </div>
          <span className="text-[11px] font-medium text-white/85 hidden sm:block truncate max-w-[140px]">
            {platform?.name || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* ===== Center: company site link ===== */}
      <div
        className="hidden md:flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={openCompanySite}
          className="group flex items-center gap-1.5 px-3 py-1 rounded-full transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(10, 108, 241, 0.22)',
          }}
          title="زيارة موقع Sky Wave Ads"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #0a6cf1, #8b2cf5)',
              boxShadow: '0 0 8px rgba(139, 44, 245, 0.55)',
            }}
          />
          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: 'rgba(234, 243, 255, 0.85)' }}
          >
            www.skywaveads.com
          </span>
          <ExternalLink
            size={11}
            className="text-white/40 group-hover:text-white/80 transition-colors"
          />
        </button>
      </div>

      {/* ===== Right section ===== */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => {
            const { settings, setSettings } = useAppStore.getState()
            setSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
          }}
          className="sw-win-btn px-2.5 h-full"
          title="تبديل اللغة"
        >
          <Globe size={15} className="text-white/55" />
        </button>

        <button className="sw-win-btn px-2.5 h-full relative" title="الإشعارات">
          <Bell size={15} className="text-white/55" />
          <span
            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
            style={{ background: '#FF4FD8', boxShadow: '0 0 6px rgba(255, 79, 216, 0.6)' }}
          />
        </button>

        <div className="flex items-center gap-1.5 px-2 mr-0.5">
          <span className="sw-status-dot" />
          <span
            className="text-[10px] font-semibold tracking-wide hidden lg:block"
            style={{ color: 'rgba(34, 197, 94, 0.85)' }}
          >
            متصل
          </span>
        </div>

        <button
          onClick={logout}
          className="sw-win-btn sw-win-btn-close px-2.5 h-full"
          title="تسجيل خروج"
        >
          <LogOut size={15} className="text-white/55" />
        </button>

        <div className="h-5 w-px mx-0.5" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

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
