'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Performance-conscious cosmic background:
 *  - 3 parallax star layers (svg, GPU-composited transforms)
 *  - 4 nebula blobs that drift at different speeds
 *  - 1 distant moon with halo
 *  - Subtle "shooting star" every ~30 s
 *  - Respects prefers-reduced-motion (disables parallax + animations)
 *  - Sits behind everything (z-index: -1) and is pointer-events: none
 *
 * Drop into a top-level layout / page once. The element is fixed-position so
 * it survives unrelated DOM updates — much cheaper than re-rendering.
 */
export function CosmicBackground() {
  const ref = useRef<HTMLDivElement>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced || typeof window === 'undefined') return
    const root = ref.current
    if (!root) return

    let raf = 0
    let lastY = 0

    const onScroll = () => {
      lastY = window.scrollY
      if (raf) return
      raf = requestAnimationFrame(() => {
        // Three layers move at increasing speeds (0.05x / 0.15x / 0.30x)
        const layers = root.querySelectorAll<HTMLElement>('[data-parallax]')
        layers.forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || '0.1')
          el.style.transform = `translate3d(0, ${-lastY * speed}px, 0)`
        })
        raf = 0
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="cosmic-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Deep space gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(20, 30, 70, 0.55) 0%, transparent 60%),' +
            'radial-gradient(ellipse 80% 60% at 100% 100%, rgba(80, 30, 120, 0.30) 0%, transparent 65%),' +
            'radial-gradient(ellipse 70% 60% at 0% 100%, rgba(10, 60, 130, 0.30) 0%, transparent 60%),' +
            'linear-gradient(180deg, #060d1b 0%, #0a0f24 50%, #060d1b 100%)',
        }}
      />

      {/* Nebula blobs (slow drift) */}
      <div
        data-parallax="0.05"
        className="absolute -top-40 -left-32 h-[640px] w-[640px] rounded-full opacity-40 will-change-transform animate-cosmic-drift-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(56, 189, 248, 0.15) 35%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        data-parallax="0.08"
        className="absolute top-[40%] -right-40 h-[720px] w-[720px] rounded-full opacity-35 will-change-transform animate-cosmic-drift-medium"
        style={{
          background:
            'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(168, 85, 247, 0.10) 40%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      <div
        data-parallax="0.06"
        className="absolute bottom-0 left-[20%] h-[520px] w-[520px] rounded-full opacity-30 will-change-transform animate-cosmic-drift-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, rgba(236, 72, 153, 0.08) 40%, transparent 70%)',
          filter: 'blur(100px)',
          animationDelay: '6s',
        }}
      />
      <div
        data-parallax="0.04"
        className="absolute top-[15%] left-[55%] h-[420px] w-[420px] rounded-full opacity-25 will-change-transform animate-cosmic-drift-medium"
        style={{
          background:
            'radial-gradient(circle, rgba(34, 197, 94, 0.30) 0%, transparent 60%)',
          filter: 'blur(110px)',
          animationDelay: '4s',
        }}
      />

      {/* ─── Star layer 1 (far): tiny, dim, slow ─── */}
      <div data-parallax="0.05" className="absolute inset-0 will-change-transform">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 1200">
          <Stars seed={1} count={60} sizeMin={0.4} sizeMax={1.0} opacity={0.55} twinkleClass="star-twinkle-slow" />
        </svg>
      </div>

      {/* ─── Star layer 2 (mid): small, regular ─── */}
      <div data-parallax="0.15" className="absolute inset-0 will-change-transform">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 1200">
          <Stars seed={2} count={50} sizeMin={0.8} sizeMax={1.6} opacity={0.75} twinkleClass="star-twinkle-medium" />
        </svg>
      </div>

      {/* ─── Star layer 3 (near): bigger, brighter, faster ─── */}
      <div data-parallax="0.3" className="absolute inset-0 will-change-transform">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 1200">
          <Stars seed={3} count={28} sizeMin={1.4} sizeMax={2.4} opacity={0.95} twinkleClass="star-twinkle-fast" />
        </svg>
      </div>

      {/* ─── Distant Moon ─── */}
      <div
        data-parallax="0.12"
        className="absolute right-[8%] top-[12%] will-change-transform"
        style={{ filter: 'drop-shadow(0 0 60px rgba(186, 230, 253, 0.35))' }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(186,230,253,0.25)" />
              <stop offset="60%" stopColor="rgba(186,230,253,0)" />
            </radialGradient>
            <radialGradient id="moonBody" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="55%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="58" fill="url(#moonHalo)" />
          <circle cx="60" cy="60" r="32" fill="url(#moonBody)" />
          <circle cx="50" cy="55" r="3" fill="rgba(71,85,105,0.5)" />
          <circle cx="68" cy="50" r="2" fill="rgba(71,85,105,0.4)" />
          <circle cx="70" cy="68" r="4" fill="rgba(71,85,105,0.35)" />
          <circle cx="55" cy="72" r="2.5" fill="rgba(71,85,105,0.3)" />
        </svg>
      </div>

      {/* ─── Distant planet (purple, smaller) ─── */}
      <div
        data-parallax="0.10"
        className="absolute left-[5%] top-[60%] will-change-transform"
        style={{ filter: 'drop-shadow(0 0 40px rgba(168, 85, 247, 0.25))' }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="planetBody" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="55%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="20" fill="url(#planetBody)" />
          <ellipse cx="32" cy="32" rx="30" ry="6" fill="none" stroke="rgba(196,181,253,0.35)" strokeWidth="1.2" transform="rotate(-18 32 32)" />
        </svg>
      </div>

      {/* ─── Galaxy spiral (decorative SVG, very dim) ─── */}
      <div
        data-parallax="0.07"
        className="absolute right-[20%] bottom-[15%] opacity-40 will-change-transform animate-galaxy-rotate"
      >
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="galaxyCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(252,211,77,0.6)" />
              <stop offset="40%" stopColor="rgba(244,114,182,0.25)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r="80" fill="url(#galaxyCore)" />
          {/* Spiral arms */}
          <path
            d="M 90 90 Q 150 60 165 95 Q 145 130 90 90"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 90 90 Q 30 120 15 85 Q 35 50 90 90"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* ─── Shooting star (CSS animation, runs every ~25s) ─── */}
      <span className="shooting-star shooting-star-1" />
      <span className="shooting-star shooting-star-2" />
    </div>
  )
}

/**
 * Deterministic random number generator for stable star positions across renders.
 * Without this, stars would randomly re-distribute on every refresh.
 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function Stars({
  seed, count, sizeMin, sizeMax, opacity, twinkleClass,
}: {
  seed: number
  count: number
  sizeMin: number
  sizeMax: number
  opacity: number
  twinkleClass: string
}) {
  const r = rng(seed)
  const stars = Array.from({ length: count }).map((_, i) => {
    const cx = r() * 1600
    const cy = r() * 1200
    const radius = sizeMin + r() * (sizeMax - sizeMin)
    const delay = r() * 8
    const duration = 3 + r() * 5
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={radius}
        fill="#fff"
        opacity={opacity}
        className={twinkleClass}
        style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      />
    )
  })
  return <>{stars}</>
}
