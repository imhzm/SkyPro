'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'

const DOWNLOADS_BASE = 'https://downloads.skywaveads.com/skypro'

export default function DesktopDownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${DOWNLOADS_BASE}/version.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl)
        if (data.version) setVersion(data.version)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && !downloadUrl) {
    // No version.json available yet — hide the button or show disabled
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-slate-500 cursor-not-allowed">
        <Download className="w-4 h-4" />
        تحميل البرنامج (قريباً)
      </span>
    )
  }

  return (
    <a
      href={downloadUrl || '#'}
      className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {version ? `تحميل البرنامج v${version}` : 'تحميل البرنامج'}
    </a>
  )
}
