'use client'

import { useMemo } from 'react'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'

// Each bubble drifts in a unique direction at a unique speed. The grid is
// arranged with deterministic positions so SSR + client output match (no
// hydration mismatch). All animation is pure CSS @keyframes — no JS render
// loop, no main-thread cost.
const PLATFORMS_FOR_BUBBLES = [
  { id: 'facebook',  color: '#1877F2', size: 64, left: '8%',  top: '15%', delay: 0,    duration: 18 },
  { id: 'whatsapp',  color: '#25D366', size: 56, left: '85%', top: '22%', delay: 2.5,  duration: 22 },
  { id: 'instagram', color: '#E4405F', size: 72, left: '92%', top: '70%', delay: 5,    duration: 20 },
  { id: 'twitter',   color: '#1DA1F2', size: 52, left: '5%',  top: '78%', delay: 7.5,  duration: 24 },
  { id: 'linkedin',  color: '#0A66C2', size: 60, left: '50%', top: '8%',  delay: 1.5,  duration: 19 },
  { id: 'telegram',  color: '#0088CC', size: 58, left: '15%', top: '50%', delay: 4,    duration: 21 },
  { id: 'tiktok',    color: '#FE2C55', size: 50, left: '78%', top: '50%', delay: 6,    duration: 23 },
  { id: 'snapchat',  color: '#FFFC00', size: 48, left: '38%', top: '88%', delay: 3,    duration: 25 },
  { id: 'pinterest', color: '#E60023', size: 54, left: '62%', top: '12%', delay: 8,    duration: 17 },
  { id: 'reddit',    color: '#FF4500', size: 50, left: '25%', top: '32%', delay: 9,    duration: 26 },
  { id: 'threads',   color: '#000000', size: 46, left: '70%', top: '85%', delay: 10,   duration: 22 },
  { id: 'google-maps', color: '#4285F4', size: 56, left: '45%', top: '55%', delay: 11, duration: 20 },
]

export function SocialBubblesBackground() {
  // Random keyframe phase per bubble — pre-computed once so all renders
  // produce the same DOM (avoids hydration mismatch warnings).
  const bubbles = useMemo(
    () =>
      PLATFORMS_FOR_BUBBLES.map((p, i) => ({
        ...p,
        // Stagger the keyframe offset so bubbles don't all sync up.
        animationName: `bubble-drift-${i % 4}`,
      })),
    [],
  )

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: b.left,
              top: b.top,
              width: `${b.size}px`,
              height: `${b.size}px`,
              background: `radial-gradient(circle at 30% 30%, ${b.color}40, ${b.color}10 70%, transparent)`,
              border: `1px solid ${b.color}40`,
              boxShadow: `0 0 ${b.size}px ${b.color}25, inset 0 0 ${b.size / 2}px ${b.color}15`,
              backdropFilter: 'blur(2px)',
              animation: `${b.animationName} ${b.duration}s ease-in-out ${b.delay}s infinite`,
              opacity: 0.85,
            }}
          >
            <PlatformIcon
              id={b.id}
              size={b.size * 0.42}
              style={{
                color: b.color,
                filter: `drop-shadow(0 0 6px ${b.color}80)`,
                opacity: 0.95,
              }}
            />
          </div>
        ))}
      </div>

      {/* CSS keyframes — 4 variants to add organic variety to the motion */}
      <style jsx global>{`
        @keyframes bubble-drift-0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25%      { transform: translate(40px, -30px) rotate(8deg); }
          50%      { transform: translate(-20px, 50px) rotate(-5deg); }
          75%      { transform: translate(-50px, -20px) rotate(10deg); }
        }
        @keyframes bubble-drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33%      { transform: translate(-35px, 40px) rotate(-8deg); }
          66%      { transform: translate(50px, 25px) rotate(12deg); }
        }
        @keyframes bubble-drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20%      { transform: translate(60px, 15px) rotate(15deg); }
          40%      { transform: translate(30px, -45px) rotate(-10deg); }
          60%      { transform: translate(-25px, -30px) rotate(5deg); }
          80%      { transform: translate(-45px, 20px) rotate(-15deg); }
        }
        @keyframes bubble-drift-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50%      { transform: translate(35px, -55px) rotate(20deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="rounded-full"][style*="bubble-drift"] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}
