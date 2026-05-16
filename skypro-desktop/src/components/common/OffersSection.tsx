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
    window.open(current.externalUrl, '_blank', 'noopener,noreferrer')
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
          background:
            'linear-gradient(135deg, #050a1c 0%, #0a1437 35%, #0a3a8a 70%, #6d23c0 100%)',
          boxShadow:
            '0 12px 32px rgba(10, 108, 241, 0.18), 0 4px 16px rgba(139, 44, 245, 0.10)',
          minHeight: '140px',
        }}
      >
        {/* Decorative aurora */}
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 79, 216, 0.30) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(10, 108, 241, 0.30) 0%, transparent 65%)',
            filter: 'blur(40px)',
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
