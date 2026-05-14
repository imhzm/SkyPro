import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import * as Icons from 'lucide-react'
import logoSrc from '../../assets/logo.png'
import type { PlatformId } from '../../types'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard: Icons.LayoutDashboard,
  Facebook: Icons.Facebook,
  MessageCircle: Icons.MessageCircle,
  Instagram: Icons.Instagram,
  Twitter: Icons.Twitter,
  Linkedin: Icons.Linkedin,
  Send: Icons.Send,
  Music: Icons.Music,
  Pin: Icons.Pin,
  Ghost: Icons.Ghost,
  MessageSquare: Icons.MessageSquare,
  Search: Icons.Search,
  Mail: Icons.Mail,
  Zap: Icons.Zap,
  Wrench: Icons.Wrench,
  Shield: Icons.Shield,
  User: Icons.User,
  Globe: Icons.Globe,
  CreditCard: Icons.CreditCard,
  BarChart3: Icons.BarChart3,
  PieChart: Icons.PieChart,
  LogIn: Icons.LogIn,
  Download: Icons.Download,
  Megaphone: Icons.Megaphone,
  AtSign: Icons.AtSign,
  FileText: Icons.FileText,
  Filter: Icons.Filter,
  Users: Icons.Users,
  UserPlus: Icons.UserPlus,
  Calendar: Icons.Calendar,
  Repeat: Icons.Repeat,
  ArrowUp: Icons.ArrowUp,
  TrendingUp: Icons.TrendingUp,
  Upload: Icons.Upload,
  MapPin: Icons.MapPin,
  Star: Icons.Star,
  Settings: Icons.Settings,
  PenTool: Icons.PenTool,
  Contact: Icons.Contact,
  Sparkles: Icons.Sparkles,
  Wand2: Icons.Wand2,
  Hash: Icons.Hash,
  Bot: Icons.Bot,
}

export default function Sidebar() {
  const { activePlatform, setActivePlatform, isSidebarOpen } = useAppStore()

  const mainPlatforms = useMemo(() => platforms.filter(p => p.id === 'dashboard'), [])
  const accountsPlatform = useMemo(() => platforms.filter(p => p.id === 'accounts'), [])
  const socialPlatforms = useMemo(() => platforms.filter(p => p.id !== 'dashboard' && p.id !== 'accounts'), [])

  const renderPlatformItem = (platform: typeof platforms[0]) => {
    const IconComponent = iconMap[platform.icon] || Icons.Circle
    const isActive = activePlatform === platform.id
    const gradient = getPlatformGradient(platform.id)

    return (
      <button
        key={platform.id}
        onClick={() => setActivePlatform(platform.id as PlatformId)}
        className={`sidebar-item group ${isActive ? 'active' : ''}`}
        title={platform.name}
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: isActive ? gradient : 'rgba(234, 243, 255, 0.06)',
            color: isActive ? '#fff' : 'rgba(234, 243, 255, 0.65)',
            boxShadow: isActive ? '0 2px 12px rgba(10, 108, 241, 0.3)' : 'none',
          }}
        >
          <IconComponent size={16} />
        </span>
        {isSidebarOpen && (
          <div className="flex flex-col items-start min-w-0">
            <span className="truncate text-xs font-medium">{platform.name}</span>
            <span className="text-[9px] opacity-40 truncate">{platform.segment}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-[260px]' : 'w-[68px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0A0F1E 0%, #001233 40%, #0A0E27 100%)',
        borderRight: '1px solid rgba(10, 108, 241, 0.08)',
      }}
    >
      {/* Logo */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1.5">
          <img
            src={logoSrc}
            alt="SkyPro"
            className="w-9 h-9 rounded-lg flex-shrink-0 object-contain"
            style={{ filter: 'drop-shadow(0 3px 12px rgba(10, 108, 241, 0.3))' }}
          />
          {isSidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm tracking-wide leading-tight">Sky Wave Pro</h1>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(234, 243, 255, 0.35)' }}>Marketing Automation</p>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 mb-2" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.15), transparent)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5 scroll-container">
        {mainPlatforms.map(renderPlatformItem)}
        {accountsPlatform.map(renderPlatformItem)}

        {isSidebarOpen ? (
          <div className="px-2 pt-4 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.12), transparent)' }} />
              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(234, 243, 255, 0.25)' }}>
                المنصات
              </span>
              <div className="flex-1" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.12), transparent)' }} />
            </div>
          </div>
        ) : (
          <div className="my-1.5 mx-3" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.12), transparent)' }} />
        )}

        {socialPlatforms.map(renderPlatformItem)}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(10, 108, 241, 0.06)' }}>
        <div className={`flex items-center gap-2 ${!isSidebarOpen ? 'justify-center' : ''}`}>
          <span className="sw-status-dot" />
          {isSidebarOpen && (
            <span className="text-[11px] font-medium" style={{ color: 'rgba(234, 243, 255, 0.4)' }}>
              Active Workspace
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}