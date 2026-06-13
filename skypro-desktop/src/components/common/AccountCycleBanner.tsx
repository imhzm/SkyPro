import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Users,
  Repeat,
  CheckSquare,
  Square,
  ArrowLeft,
  Plus,
  Loader2,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useBackgroundMode } from '../../lib/backgroundMode'

export interface BannerAccount {
  id: number
  platform: string
  username: string
  password?: string
  proxy?: string
  status?: string
}

interface AccountCycleBannerProps {
  /** Platform identifier (e.g. "facebook"). */
  platformId: string
  /** Display name (e.g. "Facebook"). */
  platformName: string
  /** Gradient string used by the platform icon tile (must be a CSS gradient). */
  platformGradient: string
  /** All saved accounts (will be filtered to this platform). */
  accounts: BannerAccount[]
  /** True if a cycle is currently running for this platform. */
  cycleActive?: boolean
  /** Called when user clicks the primary CTA ("Open cycle settings"). */
  onOpenCycle?: () => void
  /** Storage key for persisting the selected-account IDs (default = `cycleSelection:{platformId}`). */
  storageKey?: string
}

/**
 * Prominent banner shown at the top of every platform module so users can
 * SEE that multi-account cycling exists, see which of their saved accounts
 * are eligible, pre-select which ones to use, and jump straight to the
 * cycle/extract panel where the actual run controls live.
 */
export default function AccountCycleBanner({
  platformId,
  platformName,
  platformGradient,
  accounts,
  cycleActive = false,
  onOpenCycle,
  storageKey,
}: AccountCycleBannerProps) {
  const { setActivePlatform } = useAppStore()
  const [bgOn, setBgOn] = useBackgroundMode(platformId)
  const filtered = useMemo(
    () => accounts.filter((a) => a.platform === platformId),
    [accounts, platformId],
  )

  const persistKey = storageKey ?? `cycleSelection:${platformId}`

  // Restore selection across renders within the same session.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(persistKey)
      if (!raw) return new Set()
      const ids = JSON.parse(raw)
      if (!Array.isArray(ids)) return new Set()
      return new Set(ids.filter((x) => typeof x === 'number'))
    } catch {
      return new Set()
    }
  })

  // Drop any selected IDs that no longer exist (e.g. account deleted).
  useEffect(() => {
    const existing = new Set(filtered.map((a) => a.id))
    setSelectedIds((prev) => {
      const next = new Set<number>()
      prev.forEach((id) => { if (existing.has(id)) next.add(id) })
      if (next.size !== prev.size) return next
      return prev
    })
  }, [filtered])

  // Persist selection to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify([...selectedIds]))
    } catch { /* localStorage may be unavailable */ }
  }, [selectedIds, persistKey])

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set()
      return new Set(filtered.map((a) => a.id))
    })
  }, [filtered])

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <section
      aria-label="تدوير الحسابات المتعدد"
      className="relative rounded-2xl overflow-hidden p-4 sm:p-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(10, 108, 241, 0.08) 0%, rgba(139, 44, 245, 0.06) 100%)',
        border: '1.5px solid rgba(10, 108, 241, 0.22)',
        boxShadow: '0 4px 16px rgba(10, 108, 241, 0.06)',
      }}
    >
      {/* Decorative accent line on the leading edge */}
      <div
        aria-hidden
        className="absolute inset-y-3 start-0 w-1 rounded-full"
        style={{ background: platformGradient }}
      />

      {/* ===== Header row ===== */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: platformGradient, boxShadow: '0 4px 12px rgba(10,108,241,0.20)' }}
          >
            <Repeat size={18} />
            {cycleActive && (
              <span
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 0 8px rgba(34,197,94,0.7)',
                  animation: 'sw-pulse 1.6s ease-in-out infinite',
                }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-secondary-900 text-sm tracking-tight">
                تدوير حسابات {platformName}
              </h3>
              {cycleActive && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                >
                  <Loader2 size={9} className="animate-spin" />
                  دورة نشطة
                </span>
              )}
            </div>
            <p className="text-[11px] text-secondary-500 leading-relaxed mt-0.5">
              استخدم أكثر من حساب تلقائياً للوصول لجمهور أوسع وتجنب الحظر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setBgOn(!bgOn)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              color: bgOn ? '#ffffff' : '#475569',
              background: bgOn ? 'linear-gradient(135deg, #0a6cf1, #8b2cf5)' : 'rgba(148, 163, 184, 0.12)',
              border: `1px solid ${bgOn ? 'transparent' : 'rgba(148, 163, 184, 0.30)'}`,
            }}
            title="تشغيل المتصفح مخفيًا في الخلفية حتى لا يزعجك. للمنصات ذات الدخول اليدوي (جوجل / تيك توك / تيليجرام): سجّل الدخول أول مرة والوضع مُطفأ، ثم فعّله."
          >
            {bgOn ? <EyeOff size={12} /> : <Eye size={12} />}
            {bgOn ? 'الخلفية: مُفعّل' : 'وضع الخلفية'}
          </button>
          {filtered.length > 1 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                color: '#0a6cf1',
                background: 'rgba(10, 108, 241, 0.08)',
                border: '1px solid rgba(10, 108, 241, 0.18)',
              }}
            >
              {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
              {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          )}
          {onOpenCycle && (
            <button
              onClick={onOpenCycle}
              disabled={!someSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
              style={{
                background:
                  'linear-gradient(135deg, #0a6cf1 0%, #5c3df0 55%, #8b2cf5 100%)',
                boxShadow: '0 4px 14px rgba(10,108,241,0.30)',
              }}
              title={someSelected ? 'فتح إعدادات الدورة' : 'حدد حساباً واحداً على الأقل'}
            >
              <Zap size={12} />
              ابدأ الدورة
              <ArrowLeft size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ===== Account chip grid ===== */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: 'var(--panel-bg)',
            border: '1px dashed rgba(10, 108, 241, 0.25)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Users size={18} className="text-secondary-400" />
            <div>
              <p className="text-xs font-semibold text-secondary-700">لا توجد حسابات محفوظة</p>
              <p className="text-[10.5px] text-secondary-500 leading-snug mt-0.5">
                أضف حسابات {platformName} في صفحة "الحسابات المحفوظة" لتفعيل التدوير
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePlatform('accounts')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #0a6cf1, #8b2cf5)',
              boxShadow: '0 3px 10px rgba(10,108,241,0.25)',
            }}
          >
            <Plus size={12} />
            إضافة حساب
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-secondary-600">
              {filtered.length} حساب محفوظ
            </span>
            <span className="text-[10px] text-secondary-400">·</span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: someSelected ? '#0a6cf1' : '#94a3b8' }}
            >
              {someSelected ? `${selectedIds.size} محدد` : 'لم يتم التحديد'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((acc) => {
              const isSelected = selectedIds.has(acc.id)
              return (
                <button
                  key={acc.id}
                  onClick={() => toggleOne(acc.id)}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: isSelected ? 'rgba(10, 108, 241, 0.12)' : 'var(--panel-bg)',
                    border: `1.5px solid ${isSelected ? '#0a6cf1' : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? '#0a4fc4' : '#475569',
                    boxShadow: isSelected ? '0 2px 8px rgba(10, 108, 241, 0.15)' : 'none',
                  }}
                  title={acc.username}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 transition-all"
                    style={
                      isSelected
                        ? { background: 'linear-gradient(135deg, #0a6cf1, #8b2cf5)' }
                        : { border: '1.5px solid #cbd5e1' }
                    }
                  >
                    {isSelected && (
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="truncate max-w-[140px]">{acc.username}</span>
                  {acc.status === 'active' && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#22c55e', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
