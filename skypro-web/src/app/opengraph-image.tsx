/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SkyPro — #1 Arabic Marketing Automation for 18+ Platforms'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Dynamic Open Graph image for the root site.
 * Uses English text only — Satori (the OG renderer) doesn't fully support
 * Arabic complex glyph shaping. The visual identity (gradient, logo, platforms)
 * still conveys the Arabic-first brand.
 */
export default async function Image() {
  const logoUrl = `${process.env.NEXTAUTH_URL || 'https://skypro.skywaveads.com'}/images/skypro-logo.png`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top right, #1a1f4d 0%, #060d1b 50%, #0a1020 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative gradient blobs */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(10,108,241,0.35) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            left: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(139,44,245,0.30) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            display: 'flex',
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(10,108,241,0.12)',
            border: '1px solid rgba(10,108,241,0.35)',
            borderRadius: 9999,
            padding: '10px 24px',
            marginBottom: 40,
            color: '#7dd3fc',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              background: '#38bdf8',
              borderRadius: 9999,
              display: 'flex',
              boxShadow: '0 0 16px rgba(56,189,248,0.8)',
            }}
          />
          AI-Powered · Trusted by 10,000+ Companies · by Sky Wave
        </div>

        {/* Hero block: logo + brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginBottom: 32,
          }}
        >
          <img
            src={logoUrl}
            alt="SkyPro Logo"
            width={150}
            height={150}
            style={{
              filter: 'drop-shadow(0 0 40px rgba(10,108,241,0.5))',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 130,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              SkyPro
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#94a3b8',
                marginTop: 8,
                display: 'flex',
              }}
            >
              by Sky Wave
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            color: '#fff',
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 980,
            lineHeight: 1.3,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          Marketing Automation for{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              padding: '0 16px',
            }}
          >
            18+ Platforms
          </span>{' '}
          in One Click
        </div>

        {/* Platforms row */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 56,
            alignItems: 'center',
          }}
        >
          {[
            { name: 'FB', color: '#1877F2' },
            { name: 'WA', color: '#25D366' },
            { name: 'IG', color: '#E4405F' },
            { name: 'TG', color: '#0088cc' },
            { name: 'TT', color: '#69C9D0' },
            { name: 'X',  color: '#000000' },
            { name: 'LI', color: '#0A66C2' },
            { name: 'YT', color: '#FF0000' },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                width: 56,
                height: 56,
                background: p.color,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
                fontWeight: 800,
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {p.name}
            </div>
          ))}
          <div
            style={{
              width: 56,
              height: 56,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: 22,
              fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            +10
          </div>
        </div>

        {/* Bottom ribbon */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            color: '#64748b',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'flex' }}>5-min Setup</span>
          <span style={{ color: '#334155', display: 'flex' }}>·</span>
          <span style={{ display: 'flex' }}>100% Ban-Safe</span>
          <span style={{ color: '#334155', display: 'flex' }}>·</span>
          <span style={{ display: 'flex' }}>2-Day Free Trial</span>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  )
}
