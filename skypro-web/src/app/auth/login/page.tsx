'use client'

import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Logo } from '@/components/marketing/Logo'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'بيانات الدخول غير صحيحة',
  email_not_verified: 'بريدك الإلكتروني لم يُؤكَّد بعد. تحقّق من رسالتك أو اطلب رابطاً جديداً بالأسفل.',
  account_suspended: 'حسابك محظور — تواصل مع الدعم الفني',
  account_deleted: 'هذا الحساب محذوف ولا يمكن استخدامه',
  google_only_account: 'هذا الحساب مرتبط بـ Google — استخدم زر Google للدخول',
  rate_limited: 'محاولات كثيرة جداً — انتظر قليلاً ثم حاول مرة أخرى',
  CredentialsSignin: 'بيانات الدخول غير صحيحة',
}

function mapAuthError(code?: string | null): string {
  if (!code) return 'بيانات الدخول غير صحيحة'
  return ERROR_MESSAGES[code] || code
}

function LoginContent() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  useEffect(() => {
    if (params.get('message') === 'trial-created') {
      setNotice('تم إنشاء حسابك وتفعيل تجربة SkyPro لمدة يومين. أرسلنا بيانات الدخول والسيريال إلى بريدك، وإذا لم تظهر الرسالة في الوارد راجع قسم Spam/Junk.')
    }
    const errParam = params.get('error')
    if (errParam) {
      setError(decodeURIComponent(errParam))
    }
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (!res?.ok || res.error) {
        const code = (res as { code?: string })?.code ?? res?.error
        setErrorCode(code ?? null)
        setError(mapAuthError(code))
        setLoading(false)
        return
      }
      setErrorCode(null)

      const callback = params.get('callbackUrl')
      let target = callback && callback.startsWith('/') ? callback : '/dashboard'

      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          if (me?.success && me.data?.role === 'admin' && !callback) {
            target = '/admin'
          }
        }
      } catch {
        // Fall back to /dashboard if /api/auth/me fails
      }

      window.location.href = target
    } catch {
      setError('فشل الاتصال بالخادم')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1b] px-4" dir="rtl">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />
        <Image
          src="/images/hero-background.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo size={44} priority />
            <span className="text-2xl font-bold gradient-text-brand">SkyPro</span>
          </Link>
          <p className="text-slate-400 mt-3">تسجيل الدخول إلى حسابك</p>
        </div>

        <div className="gradient-border p-8">
          {notice && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl mb-4 text-sm leading-6">
              {notice}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
              {errorCode === 'email_not_verified' && (
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  {resendSent ? (
                    <p className="text-emerald-400 text-xs">
                      ✓ تم إرسال رابط جديد. تحقق من بريدك (وSpam).
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={resending || !email.trim()}
                      onClick={async () => {
                        if (!email.trim()) return
                        setResending(true)
                        try {
                          await fetch('/api/auth/resend-verify-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email.trim().toLowerCase() }),
                          })
                          setResendSent(true)
                        } catch {
                          /* ignored */
                        } finally {
                          setResending(false)
                        }
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold disabled:opacity-50"
                    >
                      {resending ? 'جارٍ الإرسال...' : 'أرسل رابط التحقق مرة أخرى'}
                    </button>
                  )}
                </div>
              )}
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

            <div>
              <label className="admin-label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input pr-10 pl-10"
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-sky-400 hover:text-sky-300 transition-colors">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-slate-500">أو</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 font-medium text-slate-300 hover:bg-white/10 hover:border-white/15 transition-all mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            تسجيل الدخول بـ Google
          </a>

          <p className="text-center text-sm text-slate-500 mt-6">
            ليس لديك حساب؟{' '}
            <Link href="/auth/register" className="text-sky-400 hover:text-sky-300 font-semibold">
              أنشئ حساب مجاناً
            </Link>
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/hero-dashboard.png"
              alt="لوحة تحكم لحملات التسويق"
              width={1200}
              height={288}
              className="h-24 w-full object-cover opacity-70"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060d1b]" />}>
      <LoginContent />
    </Suspense>
  )
}
