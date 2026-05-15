'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Inbox, AlertTriangle, CheckCircle2, Key, Copy, Check } from 'lucide-react'

interface WelcomeModalProps {
  serial: string | null
  email: string | null
}

export default function WelcomeModal({ serial, email }: WelcomeModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setVisible(true)
    }
  }, [searchParams])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    // Clean the ?welcome=1 from URL
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
  }

  const copySerial = async () => {
    if (!serial) return
    try {
      await navigator.clipboard.writeText(serial)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" dir="rtl">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="bg-[#0e1a2e] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            تم إنشاء حسابك بنجاح!
          </h2>
          <p className="text-slate-400 mb-5">
            أرسلنا بيانات التفعيل وكلمة المرور إلى بريدك الإلكتروني
          </p>

          {/* Email display */}
          {email && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-2.5 mb-5">
              <p className="text-sky-300 text-sm font-mono" dir="ltr">{email}</p>
            </div>
          )}

          {/* Serial Key */}
          {serial && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                السيريال كود
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sky-300 text-sm font-mono font-bold tracking-wide break-all flex-1 text-right" dir="ltr">
                  {serial}
                </code>
                <button
                  onClick={copySerial}
                  className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="نسخ"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3 mb-6 text-right">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">1. افتح البريد الإلكتروني</p>
                <p className="text-slate-500 text-xs">
                  ابحث عن رسالة من SkyPro تحتوي على كلمة المرور والسيريال
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-300 font-semibold text-sm">2. تحقق من Spam / Junk</p>
                <p className="text-slate-500 text-xs">
                  قد تصل الرسالة في البريد غير المرغوب فيه
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">3. احفظ كلمة المرور</p>
                <p className="text-slate-500 text-xs">
                  يمكنك تسجيل الدخول بالبريد وكلمة المرور أو عبر Google
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 text-white font-semibold py-3.5 rounded-xl transition-all"
          >
            فهمت — متابعة للوحة التحكم
          </button>

          <p className="text-amber-400/80 text-xs mt-4 animate-pulse">
            الرسالة قد تصل خلال دقائق — لا تنسَ مراجعة Spam/Junk
          </p>
        </div>
      </div>
    </div>
  )
}
