import { useState, useEffect } from 'react'
import { useAppStore, useAuthStore } from '../../stores/appStore'
import { getPlatformById } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import { Menu, Bell, Globe, Minus, Square, X, LogOut } from 'lucide-react'
import logoSrc from '../../assets/logo.png'

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

  return (
    <div
      className="flex items-center justify-between h-12 select-none"
      style={{
        background: 'linear-gradient(90deg, #001A3A 0%, #0A1E3D 40%, #0D1137 100%)',
        borderBottom: '1px solid rgba(10, 108, 241, 0.15)',
        boxShadow: '0 1px 16px rgba(10, 108, 241, 0.06)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left section */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={toggleSidebar} className="sw-win-btn px-3 h-full">
          <Menu size={18} className="text-white/60" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2">
          <img src={logoSrc} alt="SkyPro" className="w-7 h-7 rounded-md flex-shrink-0 object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(10, 108, 241, 0.3))' }} />
          <div className="hidden md:block">
            <p className="text-white font-bold text-xs leading-none">SkyPro</p>
            <p className="leading-none mt-0.5" style={{ color: 'rgba(234, 243, 255, 0.35)', fontSize: '9px' }}>Automation Dashboard</p>
          </div>
        </div>

        <div className="w-px h-5 mx-2" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        {/* Section Badge — uses platform gradient */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${platform?.color || '#0A6CF1'}10`, border: `1px solid ${platform?.color || '#0A6CF1'}25` }}>
          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: gradient }}>
            {platform?.name?.[0] || 'D'}
          </div>
          <span className="text-[11px] font-medium text-white/80 hidden sm:block truncate max-w-[120px]">
            {platform?.name || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => {
            const { settings, setSettings } = useAppStore.getState()
            setSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
          }}
          className="sw-win-btn px-2.5 h-full"
          title="تبديل اللغة"
        >
          <Globe size={15} className="text-white/45" />
        </button>

        <button className="sw-win-btn px-2.5 h-full relative" title="الإشعارات">
          <Bell size={15} className="text-white/45" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: '#FF4FD8', boxShadow: '0 0 4px rgba(255, 79, 216, 0.5)' }} />
        </button>

        <div className="flex items-center gap-1.5 px-2 mr-1">
          <span className="sw-status-dot" />
          <span className="text-[10px] font-medium" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>متصل</span>
        </div>

        <button onClick={logout} className="sw-win-btn sw-win-btn-close px-2.5 h-full" style={{ '--hover-bg': 'rgba(239,68,68,0.15)' } as React.CSSProperties} title="تسجيل خروج">
          <LogOut size={15} className="text-white/45" />
        </button>

        <div className="h-5 w-px mx-0.5" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        <button onClick={handleMinimize} className="sw-win-btn w-11 h-full" title="تصغير">
          <Minus size={16} className="text-white/60" />
        </button>

        <button onClick={handleToggleMaximize} className="sw-win-btn w-11 h-full" title={isMaximized ? 'استعادة' : 'تكبير'}>
          {isMaximized ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/60">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <path d="M5 3V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-1" />
            </svg>
          ) : (
            <Square size={14} className="text-white/60" />
          )}
        </button>

        <button onClick={handleClose} className="sw-win-btn sw-win-btn-close w-11 h-full" title="إغلاق">
          <X size={16} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}
