'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock, User, Send } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('كلمة المرور غير متطابقة')
      return
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/.test(password)) {
      setError('كلمة المرور يجب أن تكون 10 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز خاص')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword })
      })
      const data = await res.json()

      if (data.success) {
        if (data.data?.emailSent === false) {
          setError(data.message || 'تم إنشاء الحساب لكن فشل إرسال بيانات التفعيل إلى الإيميل')
          return
        }
        router.push('/auth/login?message=trial-created')
      } else {
        setError(data.error || 'فشل إنشاء الحساب')
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
        <Image
          src="https://images.pexels.com/photos/7681096/pexels-photo-7681096.jpeg?auto=compress&cs=tinysrgb&w=1600"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text-brand">SkyPro</span>
          </Link>
          <p className="text-slate-400 mt-3">أنشئ حسابك المجاني — تجربة يومين</p>
        </div>

        <div className="gradient-border p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-4 py-3 rounded-xl mb-4 text-sm text-center">
            جرّب SkyPro مجاناً ليومين — بدون بطاقة ائتمانية. سيتم إرسال بيانات الدخول والسيريال إلى بريدك، وقد تظهر الرسالة في Spam/Junk.
          </div>

          <a
            href="/api/auth/signin/google"
            className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 font-medium text-slate-300 hover:bg-white/10 hover:border-white/15 transition-all mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            التسجيل بـ Google
          </a>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-slate-500">أو بالبريد الإلكتروني</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="admin-label">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="admin-input pr-10"
                  placeholder="أدخل اسمك"
                  required
                  minLength={2}
                />
              </div>
            </div>

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
                  placeholder="10 أحرف مع رقم ورمز"
                  required
                  minLength={10}
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

            <div>
              <label className="admin-label">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="admin-input pr-10"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            لديك حساب بالفعل؟{' '}
            <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 font-semibold">
              تسجيل الدخول
            </Link>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Image
                src="https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="فريق التسويق يعمل على حملات العملاء"
                width={900}
                height={320}
                className="h-20 w-full object-cover opacity-75"
                loading="lazy"
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Image
                src="https://images.pexels.com/photos/7567558/pexels-photo-7567558.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="تحليل أداء الحملات التسويقية"
                width={900}
                height={320}
                className="h-20 w-full object-cover opacity-75"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
