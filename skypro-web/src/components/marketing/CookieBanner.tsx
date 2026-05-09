'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X, Settings2, Check } from 'lucide-react'

const STORAGE_KEY = 'skypro_cookie_consent_v1'

type Preferences = {
  necessary: true // always true
  analytics: boolean
  marketing: boolean
  consentedAt: string
}

function readConsent(): Preferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Preferences : null
  } catch {
    return null
  }
}

function writeConsent(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    document.cookie = `cookie_consent=${prefs.analytics ? 'a' : ''}${prefs.marketing ? 'm' : ''}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`
  } catch {
    /* ignore */
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = readConsent()
    if (!existing) setVisible(true)
  }, [])

  const acceptAll = () => {
    writeConsent({ necessary: true, analytics: true, marketing: true, consentedAt: new Date().toISOString() })
    setVisible(false)
  }

  const rejectOptional = () => {
    writeConsent({ necessary: true, analytics: false, marketing: false, consentedAt: new Date().toISOString() })
    setVisible(false)
  }

  const saveCustom = () => {
    writeConsent({ necessary: true, analytics, marketing, consentedAt: new Date().toISOString() })
    setVisible(false)
    setShowCustomize(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="إعدادات ملفات تعريف الارتباط"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6 pointer-events-none"
      dir="rtl"
    >
      <div className="mx-auto max-w-3xl pointer-events-auto bg-[#0a1628]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-sky-500/10 overflow-hidden">
        {!showCustomize ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-base mb-1.5">نستخدم ملفات تعريف الارتباط 🍪</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  نستعين بـ cookies لتحسين تجربتك، تحليل استخدام الموقع، وعرض محتوى مخصص. يمكنك قبول الكل،
                  رفض الاختياري، أو التحكم في تفضيلاتك. المزيد في{' '}
                  <Link href="/privacy#cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                    سياسة الخصوصية
                  </Link>
                  .
                </p>
              </div>
              <button
                onClick={rejectOptional}
                className="p-1 text-slate-500 hover:text-white shrink-0"
                aria-label="رفض الاختياري وإغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <button
                onClick={() => setShowCustomize(true)}
                className="text-xs sm:text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <Settings2 className="w-3.5 h-3.5" />
                تخصيص
              </button>
              <button
                onClick={rejectOptional}
                className="text-xs sm:text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                الضروري فقط
              </button>
              <button
                onClick={acceptAll}
                className="text-xs sm:text-sm font-bold text-white px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 shadow-lg shadow-sky-500/30 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                قبول الكل
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-400" />
                تفضيلات ملفات تعريف الارتباط
              </h2>
              <button
                onClick={() => setShowCustomize(false)}
                className="text-slate-500 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <CookieToggle
                title="ضرورية"
                desc="مطلوبة لتشغيل الموقع وتسجيل الدخول. لا يمكن تعطيلها."
                checked
                disabled
              />
              <CookieToggle
                title="تحليلية"
                desc="تساعدنا على فهم كيفية استخدام الموقع وتحسينه (Google Analytics)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CookieToggle
                title="تسويقية"
                desc="تُظهر إعلانات أكثر صلة باهتماماتك (Meta Pixel)."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={rejectOptional}
                className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                الضروري فقط
              </button>
              <button
                onClick={saveCustom}
                className="text-sm font-bold text-white px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 transition flex items-center justify-center gap-2"
              >
                حفظ التفضيلات
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CookieToggle({
  title, desc, checked, disabled = false, onChange,
}: {
  title: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange?: (next: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        disabled ? 'bg-white/[0.02] border-white/5 cursor-default' : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04] cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only peer"
      />
      <span
        className={`mt-0.5 w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
          checked ? 'bg-sky-500' : 'bg-slate-700'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? '-translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{title}</p>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </label>
  )
}
