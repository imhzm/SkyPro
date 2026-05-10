'use client'

import { useEffect, useState } from 'react'
import {
  Activity, LogIn, UserPlus, Key, ShieldCheck, ShieldOff,
  RefreshCw, Monitor, Check, Mail, User, Trash2,
} from 'lucide-react'

interface Event {
  id: number
  action: string
  label: string
  icon: string
  tone: string
  ipAddress: string | null
  createdAt: string
  relativeTime: string
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'log-in': LogIn,
  'user-plus': UserPlus,
  key: Key,
  'shield-check': ShieldCheck,
  'shield-off': ShieldOff,
  'refresh-cw': RefreshCw,
  monitor: Monitor,
  check: Check,
  mail: Mail,
  user: User,
  trash: Trash2,
  activity: Activity,
}

const TONE_MAP: Record<string, string> = {
  sky:     'bg-sky-500/10 border-sky-500/25 text-sky-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  amber:   'bg-amber-500/10 border-amber-500/25 text-amber-300',
  red:     'bg-red-500/10 border-red-500/25 text-red-300',
  slate:   'bg-slate-500/10 border-slate-500/25 text-slate-300',
}

export default function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const [events, setEvents] = useState<Event[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/account/activity?limit=${limit}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setEvents(data.data.events)
        else setError(true)
      })
      .catch(() => setError(true))
  }, [limit])

  if (events === null && !error) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-bold text-sm">آخر النشاطات</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-bold text-sm">آخر النشاطات</h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-6">لا يوجد نشاطات بعد.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-sky-400" />
        <h3 className="text-white font-bold text-sm">آخر النشاطات</h3>
        <span className="mr-auto text-[11px] text-slate-500">{events.length} حدث</span>
      </div>
      <ul className="space-y-2">
        {events.map((e) => {
          const Icon = ICON_MAP[e.icon] ?? Activity
          const toneCls = TONE_MAP[e.tone] ?? TONE_MAP.slate
          return (
            <li key={e.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${toneCls}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{e.label}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span>{e.relativeTime}</span>
                  {e.ipAddress && (
                    <span className="font-mono" dir="ltr">IP: {e.ipAddress}</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
