'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (data.success) {
        setSent(true)
      } else {
        setError(data.error || 'فشل إرسال الرابط')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1b] px-4" dir="rtl">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text-brand">سيندر برو</span>
          </Link>
        </div>

        <div className="gradient-border p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">تم إرسال الرابط</h2>
              <p className="text-slate-400 mb-6">
                إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
              </p>
              <Link href="/auth/login" className="btn-primary inline-block">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">نسيت كلمة المرور؟</h2>
              <p className="text-slate-400 mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="admin-label">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="admin-input pr-10"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جارٍ الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-4">
                <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 font-semibold">
                  العودة لتسجيل الدخول
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}