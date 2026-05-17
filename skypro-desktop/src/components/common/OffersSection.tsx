import { useEffect, useState, useCallback } from 'react'
import { Megaphone, ExternalLink, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

const WEB_API_URL =
  import.meta.env.VITE_WEB_API_URL ||
  import.meta.env.VITE_API_URL ||
  'https://skypro.skywaveads.com/api'

export interface Offer {
  id: string | number
  imageUrl: string
  externalUrl: string
  title?: string
  description?: string
  badge?: string
}

/** Placeholder offers shown until the admin publishes real ones via the web dashboard. */
const FALLBACK_OFFERS: Offer[] = [
  {
    id: 'welcome-1',
    title: 'Sky Wave Ads — حلول التسويق الرقمي',
    description: 'احصل على باقات تسويق احترافية مع متابعة وتحليل مستمر لحملاتك.',
    badge: 'العرض الرسمي',
    externalUrl: 'https://www.skywaveads.com',
    imageUrl: '',
  },
]

interface OffersSectionProps {
  /** Hide the section completely if no offers are available (default: false — shows fallback). */
  hideWhenEmpty?: boolean
}

export default function OffersSection({ hideWhenEmpty = false }: OffersSectionProps) {
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${WEB_API_URL}/offers`, { signal: ctrl.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Accept either { success, data: [...] } or a raw array.
      const list: Offer[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : []
      const cleaned = list
        .filter((o) => o && typeof o.externalUrl === 'string' && o.externalUrl.startsWith('https://'))
        .map((o) => ({
          ...o,
          imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : '',
        }))
      setOffers(cleaned.length > 0 ? cleaned : FALLBACK_OFFERS)
    } catch {
      // Network error or 404 — fall back to bundled offer (or empty if hideWhenEmpty)
      setOffers(hideWhenEmpty ? [] : FALLBACK_OFFERS)
    } finally {
      setLoading(false)
    }
  }, [hideWhenEmpty])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  // Auto-rotate every 7 seconds
  useEffect(() => {
    if (!offers || offers.length < 2) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % offers.length)
    }, 7000)
    return () => clearInterval(id)
  }, [offers])

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 h-36 flex items-center justify-center shimmer"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      />
    )
  }

  if (!offers || offers.length === 0) return null

  const current = offers[index]
  const hasNav = offers.length > 1

  const handleOpen = () => {
    if (!current.externalUrl) return
    // Open the URL immediately so the user gets instant feedback…
    window.open(current.externalUrl, '_blank', 'noopener,noreferrer')
    // …then fire the click tracker in the background (best-effort, never
    // blocks the navigation, never blows up on the UI).
    const id = current.id
    if (typeof id === 'number') {
      fetch(`${WEB_API_URL}/offers/${id}/click`, { method: 'POST' }).catch(() => {})
    }
  }

  return (
    <section aria-label="عروض وإعلانات">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #ff4fd8 0%, #8b2cf5 100%)' }}
          >
            <Megaphone size={15} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-secondary-900 tracking-tight">العروض والإعلانات</h2>
            <p className="text-[10px] text-secondary-500">عروض حصرية من Sky Wave Ads</p>
          </div>
        </div>
        {hasNav && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-secondary-500">
              {index + 1} / {offers.length}
            </span>
            <button
              onClick={() => setIndex((i) => (i - 1 + offers.length) % offers.length)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary-100 transition-colors"
              title="السابق"
            >
              <ChevronRight size={14} className="text-secondary-500" />
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % offers.length)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary-100 transition-colors"
              title="التالي"
            >
              <ChevronLeft size={14} className="text-secondary-500" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleOpen}
        className="group relative w-full text-right rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
        style={{
          /* Slightly more "offer-energetic" gradient — leans into magenta/violet
             to differentiate from the regular ModuleHeader. */
          background:
            'linear-gradient(135deg, #1a0b2e 0%, #2e1065 25%, #6d28d9 55%, #c026d3 85%, #ec4899 100%)',
          boxShadow:
            '0 16px 40px rgba(192, 38, 211, 0.22), 0 6px 18px rgba(124, 58, 237, 0.16), inset 0 1px 0 rgba(255,255,255,0.10)',
          minHeight: '140px',
        }}
      >
        {/* Aurora blob — vibrant pink top right */}
        <div
          aria-hidden
          className="absolute -top-24 -right-16 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(244, 114, 182, 0.48) 0%, rgba(236, 72, 153, 0.20) 40%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        {/* Aurora blob — indigo bottom left */}
        <div
          aria-hidden
          className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.36) 0%, rgba(56, 189, 248, 0.18) 40%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />

        <div className="relative flex items-center gap-5 p-5">
          {/* Image / Visual */}
          <div
            className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background:
                current.imageUrl
                  ? `url(${current.imageUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 6px 18px rgba(0,0,0,0.25)',
            }}
          >
            {!current.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-white/50" />
              </div>
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            {current.badge && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mb-2"
                style={{
                  background: 'rgba(255, 79, 216, 0.20)',
                  border: '1px solid rgba(255, 79, 216, 0.40)',
                }}
              >
                <Sparkles size={10} />
                {current.badge}
              </span>
            )}
            <h3 className="text-base font-bold text-white tracking-tight leading-tight mb-1 truncate">
              {current.title || 'عرض حصري'}
            </h3>
            {current.description && (
              <p
                className="text-xs leading-relaxed line-clamp-2"
                style={{ color: 'rgba(234, 243, 255, 0.7)' }}
              >
                {current.description}
              </p>
            )}
          </div>

          {/* CTA */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0 transition-all group-hover:scale-105"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-xs font-semibold text-white">اعرف المزيد</span>
            <ExternalLink size={12} className="text-white" />
          </div>
        </div>

        {/* Dots indicator */}
        {hasNav && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {offers.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? '16px' : '6px',
                  height: '6px',
                  background: i === index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        )}
      </button>
    </section>
  )
}
