'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const error = searchParams.get('error')

    if (error) {
      router.push(`/auth/login?error=${encodeURIComponent(error)}`)
    } else {
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/')
          }
        })
        .catch(() => router.push('/'))
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1b]" dir="rtl">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">جارٍ تسجيل الدخول...</p>
      </div>
    </div>
  )
}