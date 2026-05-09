'use client'

import { ArrowUpRight } from 'lucide-react'

export default function RenewButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="/#pricing"
      className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-all ${className}`}
    >
      جدّد الاشتراك
      <ArrowUpRight className="w-4 h-4" />
    </a>
  )
}
