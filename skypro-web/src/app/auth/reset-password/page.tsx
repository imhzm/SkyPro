'use client'

import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060d1b]" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}