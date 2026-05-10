'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, X, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface Notification {
  id: number
  userId: number | null
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  link: string | null
  readAt: string | null
  createdAt: string
}

const TYPE_CFG: Record<string, { Icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  info:    { Icon: Info,         cls: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
  success: { Icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  error:   { Icon: XCircle,      cls: 'text-red-400 bg-red-500/10 border-red-500/25' },
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  const load = () => {
    fetch('/api/account/notifications', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setItems(data.data.items ?? [])
          setUnread(data.data.unread ?? 0)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000) // refresh every minute
    return () => clearInterval(t)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/account/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    load()
  }

  const markRead = async (id: number) => {
    await fetch('/api/account/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    load()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition"
        aria-label={`الإشعارات (${unread} غير مقروءة)`}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40"
          aria-hidden="true"
        />
      )}

      {open && (
        <div className="absolute left-0 mt-2 w-[340px] sm:w-[380px] z-50 bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between p-3 border-b border-white/8">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              الإشعارات
              {unread > 0 && <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{unread} جديد</span>}
            </h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-sky-400 hover:text-sky-300 px-2 py-1 rounded"
                >
                  تعليم الكل كمقروء
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white p-1"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا توجد إشعارات بعد.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((n) => {
                  const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.info
                  const isRead = !!n.readAt
                  return (
                    <li
                      key={n.id}
                      className={`p-3 hover:bg-white/[0.03] transition-colors ${!isRead ? 'bg-sky-500/[0.04]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${cfg.cls}`}>
                          <cfg.Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isRead ? 'text-slate-300' : 'text-white'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className="text-[10px] text-slate-600">
                              {new Date(n.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            <div className="flex items-center gap-2">
                              {n.link && (
                                <a href={n.link} className="text-[11px] text-sky-400 hover:text-sky-300">
                                  عرض
                                </a>
                              )}
                              {!isRead && (
                                <button
                                  onClick={() => markRead(n.id)}
                                  className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-0.5"
                                >
                                  <Check className="w-3 h-3" /> تم القراءة
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
