import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import * as Icons from 'lucide-react'
import { ExternalLink } from 'lucide-react'
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
  const socialPlatforms = useMemo(
    () => platforms.filter(p => p.id !== 'dashboard' && p.id !== 'accounts'),
    [],
  )

  const renderPlatformItem = (platform: typeof platforms[0]) => {
    const IconComponent = iconMap[platform.icon] || Icons.Circle
    const isActive = activePlatform === platform.id
    const gradient = getPlatformGradient(platform.id)

    return (
      <button
        key={platform.id}
        onClick={() => setActivePlatform(platform.id as PlatformId)}
        className={`sidebar-item group ${isActive ? 'active' : ''} ${
          isSidebarOpen ? '' : 'justify-center'
        }`}
        title={platform.name}
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: isActive ? gradient : 'rgba(234, 243, 255, 0.04)',
            color: isActive ? '#fff' : 'rgba(234, 243, 255, 0.7)',
            boxShadow: isActive
              ? '0 4px 16px rgba(10, 108, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
              : 'inset 0 1px 0 rgba(255,255,255,0.04)',
            border: isActive ? 'none' : '1px solid rgba(234, 243, 255, 0.06)',
          }}
        >
          <IconComponent size={16} />
        </span>
        {isSidebarOpen && (
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="truncate text-[12.5px] font-medium tracking-tight">
              {platform.name}
            </span>
            <span
              className="text-[9.5px] truncate font-medium"
              style={{ color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(234, 243, 255, 0.32)' }}
            >
              {platform.segment}
            </span>
          </div>
        )}
        {isActive && isSidebarOpen && (
          <Icons.ChevronLeft
            size={13}
            className="opacity-50"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          />
        )}
      </button>
    )
  }

  return (
    <aside
      className={`relative h-full flex flex-col transition-[width] duration-300 ease-out flex-shrink-0 ${
        isSidebarOpen ? 'w-[260px]' : 'w-[68px]'
      }`}
      style={{
        background:
          'linear-gradient(180deg, #050a1c 0%, #08102b 40%, #0a0e27 100%)',
        borderInlineEnd: '1px solid rgba(10, 108, 241, 0.10)',
      }}
    >
      {/* Subtle radial accent at top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(10, 108, 241, 0.15) 0%, transparent 65%)',
        }}
      />

      {/* ===== Logo ===== */}
      <div className="relative px-3 pt-4 pb-3">
        <div
          className={`flex items-center gap-3 ${
            isSidebarOpen ? 'px-1.5' : 'justify-center'
          }`}
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -m-1.5 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(10, 108, 241, 0.5) 0%, transparent 65%)',
                filter: 'blur(8px)',
              }}
            />
            <img
              src={logoSrc}
              alt="SkyPro"
              className="relative w-9 h-9 flex-shrink-0 object-contain"
              style={{ filter: 'drop-shadow(0 4px 14px rgba(10, 108, 241, 0.5))' }}
            />
          </div>
          {isSidebarOpen && (
            <div className="min-w-0 leading-tight">
              <h1 className="font-bold text-[15px] tracking-tight">
                <span className="text-white">Sky</span>
                <span className="text-gradient">Pro</span>
              </h1>
              <p
                className="text-[9.5px] mt-0.5 font-medium uppercase tracking-[0.18em]"
                style={{ color: 'rgba(167, 139, 250, 0.55)' }}
              >
                Marketing Automation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div
        className="mx-4 mb-1.5 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.22), transparent)',
        }}
      />

      {/* ===== Navigation ===== */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scroll-container">
        {mainPlatforms.map(renderPlatformItem)}
        {accountsPlatform.map(renderPlatformItem)}

        {/* Category header */}
        {isSidebarOpen ? (
          <div className="px-2 pt-5 pb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.15), transparent)',
                }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(167, 139, 250, 0.45)' }}
              >
                المنصات
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.15), transparent)',
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="my-2 mx-3 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(10, 108, 241, 0.15), transparent)',
            }}
          />
        )}

        {socialPlatforms.map(renderPlatformItem)}
      </nav>

      {/* ===== Footer ===== */}
      <div
        className="px-3 py-3 relative"
        style={{ borderTop: '1px solid rgba(10, 108, 241, 0.10)' }}
      >
        {isSidebarOpen ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="sw-status-dot" />
              <span className="text-[10.5px] font-medium" style={{ color: 'rgba(34, 197, 94, 0.78)' }}>
                Active Workspace
              </span>
            </div>
            <button
              onClick={() =>
                window.open('https://www.skywaveads.com', '_blank', 'noopener,noreferrer')
              }
              className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(10, 108, 241, 0.12)',
              }}
              title="زيارة موقع Sky Wave Ads"
            >
              <span
                className="text-[10.5px] font-medium tracking-wide truncate"
                style={{ color: 'rgba(234, 243, 255, 0.7)' }}
              >
                www.skywaveads.com
              </span>
              <ExternalLink
                size={11}
                style={{ color: 'rgba(167, 139, 250, 0.55)' }}
                className="flex-shrink-0 group-hover:opacity-100 opacity-70 transition-opacity"
              />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="sw-status-dot" />
          </div>
        )}
      </div>
    </aside>
  )
}
