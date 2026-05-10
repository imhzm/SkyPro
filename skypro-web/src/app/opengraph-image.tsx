/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SkyPro — Marketing Automation for 18+ Platforms in One Click | Try Free for 2 Days'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Dynamic Open Graph image (1200×630, ~250 KB) generated on the Edge.
 * Optimized for: Facebook, X/Twitter, WhatsApp, LinkedIn, Telegram cards.
 *
 * Design rules respected:
 *  - Headline: large, prominent ("Automate Marketing on 18+ Platforms")
 *  - CTA: visible green pill ("Try Free →")
 *  - Logo + brand name center-stage
 *  - Trust signals: "10,000+ Companies · AI-Powered · Meta Partner"
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
          background: '#060d1b',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          position: 'relative',
        }}
      >
        {/* Background mesh gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 800px 600px at 85% 15%, rgba(10,108,241,0.45) 0%, transparent 60%),' +
              'radial-gradient(ellipse 700px 500px at 10% 85%, rgba(139,44,245,0.40) 0%, transparent 65%),' +
              'linear-gradient(180deg, #0a1020 0%, #060d1b 100%)',
            display: 'flex',
          }}
        />
        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            display: 'flex',
          }}
        />

        {/* ============== LEFT COLUMN (text) ============== */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 50px 60px 70px',
          }}
        >
          {/* Trust badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'flex-start',
              background: 'rgba(56,189,248,0.10)',
              border: '1px solid rgba(56,189,248,0.30)',
              borderRadius: 9999,
              padding: '8px 18px',
              marginBottom: 26,
              color: '#7dd3fc',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 8, height: 8, background: '#38bdf8', borderRadius: 9999, display: 'flex', boxShadow: '0 0 12px #38bdf8' }} />
            Trusted by 10,000+ Companies
          </div>

          {/* HEADLINE (the main hero copy) */}
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: -1.5,
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 18,
            }}
          >
            <span style={{ display: 'flex' }}>Automate Marketing</span>
            <span style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 14 }}>
              <span>on</span>
              <span
                style={{
                  background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                  display: 'flex',
                }}
              >
                18+ Platforms
              </span>
            </span>
            <span style={{ display: 'flex', color: '#94a3b8', fontSize: 56 }}>in One Click</span>
          </div>

          {/* Sub-line */}
          <div
            style={{
              fontSize: 22,
              color: '#cbd5e1',
              fontWeight: 500,
              lineHeight: 1.4,
              marginBottom: 30,
              maxWidth: 540,
              display: 'flex',
            }}
          >
            Extract leads, send bulk messages, manage multi-accounts. AI-powered, ban-safe, Arabic-first.
          </div>

          {/* CTA + secondary signal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: 22,
                fontWeight: 800,
                padding: '14px 28px',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
              }}
            >
              Try Free for 2 Days →
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#94a3b8',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex' }}>✓ No credit card</span>
            </div>
          </div>
        </div>

        {/* ============== RIGHT COLUMN (logo + platforms) ============== */}
        <div
          style={{
            width: 420,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 50px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 30,
            }}
          >
            <img
              src={logoUrl}
              alt="SkyPro"
              width={180}
              height={180}
              style={{
                filter: 'drop-shadow(0 0 50px rgba(10,108,241,0.6))',
              }}
            />
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: -1,
                marginTop: 8,
                background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              SkyPro
            </div>
            <div style={{ fontSize: 16, color: '#64748b', fontWeight: 600, display: 'flex', marginTop: -2 }}>
              by Sky Wave
            </div>
          </div>

          {/* Platforms grid (flex-wrap, since Satori doesn't support display:grid) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              width: 222,
              justifyContent: 'flex-start',
            }}
          >
            {[
              { label: 'FB', color: '#1877F2' },
              { label: 'WA', color: '#25D366' },
              { label: 'IG', color: '#E4405F' },
              { label: 'TG', color: '#0088cc' },
              { label: 'TT', color: '#000000' },
              { label: 'X',  color: '#1d1d1f' },
              { label: 'LI', color: '#0A66C2' },
              { label: 'YT', color: '#FF0000' },
              { label: '+10', color: 'rgba(255,255,255,0.10)', isLast: true },
            ].map((p) => (
              <div
                key={p.label}
                style={{
                  width: 64,
                  height: 64,
                  background: p.color,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: p.isLast ? '#94a3b8' : '#ffffff',
                  fontSize: p.isLast ? 18 : 17,
                  fontWeight: 800,
                  border: '2px solid rgba(255,255,255,0.10)',
                  boxShadow: p.isLast ? 'none' : '0 6px 16px rgba(0,0,0,0.3)',
                }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 70,
            right: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#64748b',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', gap: 18 }}>
            <span style={{ display: 'flex' }}>5-min Setup</span>
            <span style={{ display: 'flex', color: '#334155' }}>·</span>
            <span style={{ display: 'flex' }}>100% Ban-Safe</span>
            <span style={{ display: 'flex', color: '#334155' }}>·</span>
            <span style={{ display: 'flex' }}>Meta Verified Partner</span>
          </div>
          <div style={{ display: 'flex', color: '#475569' }}>skypro.skywaveads.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  )
}
