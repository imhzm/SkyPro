'use client'

import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'

type ServiceStatus = 'operational' | 'degraded' | 'down'

interface Health {
  status: ServiceStatus
  uptimePercent: number
  services: {
    web: { status: ServiceStatus; latencyMs: number }
    database: { status: ServiceStatus; latencyMs: number }
  }
  timestamp: string
}

const POLL_MS = 60_000

export function StatusWidget() {
  const [health, setHealth] = useState<Health | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = await res.json() as Health
        if (!cancelled) {
          setHealth(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setHealth({
            status: 'degraded',
            uptimePercent: 99.0,
            services: {
              web: { status: 'degraded', latencyMs: 0 },
              database: { status: 'degraded', latencyMs: 0 },
            },
            timestamp: new Date().toISOString(),
          })
          setLoading(false)
        }
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading || !health) return null

  const cfg = STATUS_CONFIG[health.status]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all hover:scale-105 ${cfg.badgeClass}`}
        aria-label={`حالة النظام: ${cfg.label}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dotPing}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
        </span>
        {cfg.label}
        <span className="text-[10px] opacity-70">·</span>
        <span className="text-[10px] opacity-70">{health.uptimePercent.toFixed(2)}% uptime</span>
      </button>

      {/* Modal / Popover */}
      {open && (
        <div
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          dir="rtl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className={`p-5 border-b border-white/8 flex items-center gap-3 ${cfg.bgGradient}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                <cfg.Icon className={`w-5 h-5 ${cfg.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base">{cfg.title}</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  متاح <strong className="text-white">{health.uptimePercent.toFixed(2)}%</strong> من الوقت
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2">
              <ServiceRow name="الموقع والـ API" status={health.services.web.status} latency={health.services.web.latencyMs} />
              <ServiceRow name="قاعدة البيانات" status={health.services.database.status} latency={health.services.database.latencyMs} />
            </div>

            <div className="px-5 pb-5 pt-2 border-t border-white/5">
              <p className="text-[11px] text-slate-500 text-center">
                آخر فحص: {new Date(health.timestamp).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300"
                >
                  JSON status
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ServiceRow({ name, status, latency }: { name: string; status: ServiceStatus; latency: number }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className="text-white text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-500 text-xs font-mono">{latency}ms</span>
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  operational: {
    label: 'كل الأنظمة تعمل',
    title: 'كل الأنظمة تعمل بشكل طبيعي',
    Icon: CheckCircle2,
    dot: 'bg-emerald-400',
    dotPing: 'bg-emerald-400',
    text: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
    bgGradient: 'bg-gradient-to-br from-emerald-500/10 to-transparent',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15',
  },
  degraded: {
    label: 'أداء منخفض',
    title: 'بعض الخدمات تعمل ببطء',
    Icon: AlertTriangle,
    dot: 'bg-amber-400',
    dotPing: 'bg-amber-400',
    text: 'text-amber-400',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15 border border-amber-500/30',
    bgGradient: 'bg-gradient-to-br from-amber-500/10 to-transparent',
    badgeClass: 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/15',
  },
  down: {
    label: 'خدمة معطّلة',
    title: 'بعض الأنظمة معطّلة حالياً',
    Icon: XCircle,
    dot: 'bg-red-400',
    dotPing: 'bg-red-400',
    text: 'text-red-400',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/15 border border-red-500/30',
    bgGradient: 'bg-gradient-to-br from-red-500/10 to-transparent',
    badgeClass: 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15',
  },
} as const

export { Activity }
