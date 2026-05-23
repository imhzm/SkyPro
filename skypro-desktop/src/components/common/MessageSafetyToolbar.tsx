import { useState } from 'react'
import { Sparkles, Loader2, Copy, RefreshCw } from 'lucide-react'

interface Props {
  /** Current message in the parent — used as the template. */
  template: string
  /** Called when the user picks a variation. Parent should update its message state. */
  onApply: (variation: string) => void
  /** Optional custom synonyms — defaults pulled from IPC handler. */
  synonyms?: Record<string, string[]>
  /** How many variations to generate (default 8). */
  defaultCount?: number
  /** Accent color for the button. */
  accent?: string
}

/**
 * Inline anti-ban helper bar. Generates N variations of the current message
 * using synonym rotation, ZWSP injection, and emoji/punctuation tweaks so the
 * user can pick a different one between sends to dodge spam detection.
 */
export default function MessageSafetyToolbar({ template, onApply, synonyms, defaultCount = 8, accent = '#7c3aed' }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [variations, setVariations] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!template.trim()) { setError('اكتب رسالة أولاً'); return }
    setError('')
    setLoading(true)
    try {
      const res = await window.electronAPI.safetyGenerateMessageVariations({
        template,
        count: defaultCount,
        synonyms: synonyms || {},
      })
      if (res.success && res.data) {
        setVariations(res.data.variations || [])
        setOpen(true)
      } else {
        setError((res as any).error || 'فشل توليد النسخ')
      }
    } catch (err: any) { setError(err.message || 'خطأ') }
    setLoading(false)
  }

  return (
    <div className="rounded-xl border" style={{ background: 'rgba(124,58,237,0.04)', borderColor: 'rgba(124,58,237,0.18)' }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: accent }} />
          <span className="text-xs font-semibold" style={{ color: accent }}>تنويع الرسالة (حماية ضد الحظر)</span>
        </div>
        <button onClick={handleGenerate} disabled={loading || !template.trim()} type="button" className="btn-secondary text-xs disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={14} /> توليد {defaultCount} نسخة</>}
        </button>
      </div>
      {error && <div className="px-3 pb-2 text-xs text-red-600">{error}</div>}
      {open && variations.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5 max-h-56 overflow-y-auto">
          {variations.map((v, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/70 border border-secondary-100 hover:border-secondary-300">
              <span className="text-xs flex-1 truncate" title={v}>{v}</span>
              <button onClick={() => { onApply(v); setOpen(false) }} type="button" className="text-xs text-secondary-600 hover:text-secondary-900 px-2 py-0.5 rounded hover:bg-secondary-50">استخدام</button>
              <button onClick={() => { navigator.clipboard.writeText(v).catch(() => {}) }} type="button" className="p-1 text-secondary-500 hover:bg-secondary-50 rounded"><Copy size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
