import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import * as Icons from 'lucide-react'
import { ExternalLink } from 'lucide-react'
import { BrandIcon } from '../icons/BrandIcon'
import { hasBrandIcon } from '../icons/brand-data'
import logoSrc from '../../assets/logo.png'

/* ============================================================
   Sidebar — Night Edition navigation rail

   Groups (order derives from src/data/platforms.ts):
   · main      dashboard / accounts — 34px rounded icon chips
   · القنوات    brand channels — flat mono BrandIcon marks
   · أدوات      auto-point / other-tools — lucide icons
   · pinned    security / settings / account + footer (fixed)
   ============================================================ */

/* Lucide resolution for entries without an official brand mark. */
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard: Icons.LayoutDashboard,
  Users: Icons.Users,
  Facebook: Icons.Facebook,
  MessageCircle: Icons.MessageCircle,
  Instagram: Icons.Instagram,
  Twitter: Icons.Twitter,
  Linkedin: Icons.Linkedin,
  Send: Icons.Send,
  Sparkles: Icons.Sparkles,
  Ghost: Icons.Ghost,
  Pin: Icons.Pin,
  Music: Icons.Music,
  MessageSquare: Icons.MessageSquare,
  MapPin: Icons.MapPin,
  Mail: Icons.Mail,
  Zap: Icons.Zap,
  Wrench: Icons.Wrench,
  Shield: Icons.Shield,
  User: Icons.User,
  Settings: Icons.Settings,
}

const MAIN_IDS: ReadonlySet<string> = new Set(['dashboard', 'accounts'])
const TOOL_IDS: ReadonlySet<string> = new Set(['auto-point', 'other-tools'])
const PINNED_ID_ORDER = ['security', 'settings', 'account']
const PINNED_IDS: ReadonlySet<string> = new Set(PINNED_ID_ORDER)

const COMPANY_URL = 'https://www.skywaveads.com'

type SidebarPlatform = (typeof platforms)[number]

export default function Sidebar() {
  const { activePlatform, setActivePlatform, isSidebarOpen } = useAppStore()

  const mainItems = useMemo(() => platforms.filter((p) => MAIN_IDS.has(p.id)), [])
  const channelItems = useMemo(
    () => platforms.filter((p) => !MAIN_IDS.has(p.id) && !TOOL_IDS.has(p.id) && !PINNED_IDS.has(p.id)),
    [],
  )
  const toolItems = useMemo(() => platforms.filter((p) => TOOL_IDS.has(p.id)), [])
  const pinnedItems = useMemo(
    () =>
      PINNED_ID_ORDER.map((id) => platforms.find((p) => p.id === id)).filter(
        (p): p is SidebarPlatform => Boolean(p),
      ),
    [],
  )

  const openCompanySite = () =>
    window.open(COMPANY_URL, '_blank', 'noopener,noreferrer')

  const renderItem = (platform: SidebarPlatform, variant: 'main' | 'flat') => {
    const isActive = activePlatform === platform.id
    const useBrandMark = variant === 'flat' && hasBrandIcon(platform.id)
    const LucideIcon = iconMap[platform.icon] || Icons.Circle

    return (
      <button
        key={platform.id}
        onClick={() => setActivePlatform(platform.id)}
        className={`sidebar-item group ${isActive ? 'active' : ''} ${
          isSidebarOpen ? '' : 'justify-center'
        }`}
        title={platform.name}
      >
        <span
          className={`w-[34px] h-[34px] flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
            variant === 'main' ? 'rounded-xl' : ''
          }`}
          style={
            variant === 'main'
              ? {
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.85)',
                }
              : { color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.75)' }
          }
        >
          {useBrandMark ? (
            <BrandIcon platform={platform.id} variant="mono" size={18} />
          ) : (
            <LucideIcon size={variant === 'main' ? 16 : 17} />
          )}
        </span>

        {isSidebarOpen && (
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span
              className={`truncate w-full tracking-tight ${
                variant === 'main' ? 'text-[13px] font-semibold' : 'text-[12.5px] font-medium'
              }`}
            >
              {platform.name}
            </span>
            <span
              className="truncate w-full text-[10.5px] font-medium"
              style={{ color: isActive ? 'rgba(255, 255, 255, 0.55)' : 'rgba(234, 243, 255, 0.40)' }}
            >
              {platform.segment}
            </span>
          </div>
        )}

        {isActive && isSidebarOpen && (
          <Icons.ChevronLeft
            size={13}
            className="flex-shrink-0"
            style={{ color: 'rgba(255, 255, 255, 0.55)' }}
          />
        )}
      </button>
    )
  }

  const renderSectionLabel = (label: string) =>
    isSidebarOpen ? (
      <div className="flex items-center gap-2 px-2 pt-5 pb-1.5">
        <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
          {label}
        </span>
        <span className="flex-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.07)' }} />
      </div>
    ) : (
      <div className="my-2.5 mx-3 h-px" style={{ background: 'rgba(255, 255, 255, 0.08)' }} />
    )

  return (
    <aside
      className={`relative h-full flex flex-col transition-[width] duration-300 ease-out flex-shrink-0 ${
        isSidebarOpen ? 'w-[260px]' : 'w-[68px]'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderInlineEnd: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* ===== Header ===== */}
      <div
        className={`flex items-center gap-2.5 px-3 pt-4 pb-3 ${isSidebarOpen ? 'ps-4' : 'justify-center'}`}
      >
        <img
          src={logoSrc}
          alt="SkyPro"
          className="w-8 h-8 flex-shrink-0 object-contain"
          style={{ filter: 'drop-shadow(0 3px 12px rgba(124, 58, 237, 0.40))' }}
        />
        {isSidebarOpen && (
          <div className="min-w-0 leading-tight">
            <h1 className="font-bold text-[15px] tracking-tight">
              <span className="text-white/95">Sky</span>
              <span className="text-gradient">Pro</span>
            </h1>
            <p
              className="text-[8.5px] mt-0.5 font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'rgba(234, 243, 255, 0.35)' }}
            >
              Marketing Automation
            </p>
          </div>
        )}
      </div>

      {/* ===== Navigation (scrolls) ===== */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scroll-container">
        {mainItems.map((p) => renderItem(p, 'main'))}

        {renderSectionLabel('القنوات')}
        {channelItems.map((p) => renderItem(p, 'flat'))}

        {renderSectionLabel('أدوات')}
        {toolItems.map((p) => renderItem(p, 'flat'))}
      </nav>

      {/* ===== Pinned group ===== */}
      <div
        className="px-2 pt-2 pb-1 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        {pinnedItems.map((p) => renderItem(p, 'flat'))}
      </div>

      {/* ===== Footer ===== */}
      <div className="px-3 pb-3 pt-2">
        {isSidebarOpen ? (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-medium" style={{ color: 'rgba(234, 243, 255, 0.40)' }}>
                Active Workspace
              </span>
              <span className="sw-status-dot" />
            </div>
            <button
              onClick={openCompanySite}
              className="group w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors hover:bg-white/[0.07]"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(234, 243, 255, 0.70)',
              }}
              title="زيارة موقع Sky Wave Ads"
            >
              <ExternalLink
                size={12}
                className="flex-shrink-0"
                style={{ color: 'rgba(167, 139, 250, 0.70)' }}
              />
              www.skywaveads.com
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <span className="sw-status-dot" />
            <button
              onClick={openCompanySite}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.07]"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(234, 243, 255, 0.60)',
              }}
              title="زيارة موقع Sky Wave Ads"
            >
              <ExternalLink size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
