'use client'

import { MessageCircle } from 'lucide-react'

export function WhatsAppButton() {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <a
        href="https://wa.me/201067894321"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-110 hover:shadow-emerald-500/50 active:scale-95"
        aria-label="تواصل عبر واتساب"
      >
        <span className="absolute inset-[-4px] rounded-full bg-emerald-400/20 animate-ping" />
        <MessageCircle className="relative h-6 w-6 text-white drop-shadow-lg" />
        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 border-2 border-[#060d1b]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      </a>
    </div>
  )
}