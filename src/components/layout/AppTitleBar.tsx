import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import { getPlatformById } from '../../data/platforms'
import { Menu, Bell, Globe, Minus, Square, X } from 'lucide-react'

export default function AppTitleBar() {
  const { activePlatform, toggleSidebar } = useAppStore()
  const platform = getPlatformById(activePlatform)
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
      {/* Left section: Menu + Logo + Section */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="h-full px-3 flex items-center justify-center transition-colors duration-150"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Menu size={18} className="text-white/60" />
        </button>

        {/* Sky Wave Logo */}
        <div className="flex items-center gap-2 px-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)',
              boxShadow: '0 2px 10px rgba(10, 108, 241, 0.35)',
            }}
          >
            <span className="text-white font-bold" style={{ fontSize: '10px' }}>SW</span>
          </div>
          <div className="hidden md:block">
            <p className="text-white font-bold text-xs leading-none">Sky Wave Pro</p>
            <p className="leading-none mt-0.5" style={{ color: 'rgba(234, 243, 255, 0.35)', fontSize: '9px' }}>Automation Dashboard</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-2" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        {/* Section Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{
            background: 'rgba(139, 44, 245, 0.08)',
            border: '1px solid rgba(139, 44, 245, 0.15)',
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
            style={{
              backgroundColor: platform ? `${platform.color}20` : 'rgba(10, 108, 241, 0.15)',
              color: platform?.color || '#0A6CF1',
            }}
          >
            {platform?.name?.[0] || 'D'}
          </div>
          <span className="text-[11px] font-medium text-white/80 hidden sm:block truncate max-w-[120px]">
            {platform?.name || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Right section: Actions + Window Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Language */}
        <button
          onClick={() => {
            const { settings, setSettings } = useAppStore.getState()
            setSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
          }}
          className="h-full px-2.5 flex items-center justify-center transition-colors duration-150"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="تبديل اللغة"
        >
          <Globe size={15} className="text-white/45" />
        </button>

        {/* Notifications */}
        <button
          className="h-full px-2.5 flex items-center justify-center relative"
          title="الإشعارات"
        >
          <Bell size={15} className="text-white/45" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: '#FF4FD8', boxShadow: '0 0 4px rgba(255, 79, 216, 0.5)' }} />
        </button>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-2 mr-1">
          <span className="sw-status-dot" />
          <span className="text-[10px] font-medium" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>متصل</span>
        </div>

        {/* Divider before window controls */}
        <div className="h-5 w-px mx-0.5" style={{ background: 'rgba(234, 243, 255, 0.08)' }} />

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="h-full w-11 flex items-center justify-center transition-colors duration-150"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="تصغير"
        >
          <Minus size={16} className="text-white/60" />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleToggleMaximize}
          className="h-full w-11 flex items-center justify-center transition-colors duration-150"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(10, 108, 241, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={isMaximized ? 'استعادة' : 'تكبير'}
        >
          {isMaximized ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/60">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <path d="M5 3V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-1" />
            </svg>
          ) : (
            <Square size={14} className="text-white/60" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="h-full w-11 flex items-center justify-center transition-colors duration-150"
          onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="إغلاق"
        >
          <X size={16} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}