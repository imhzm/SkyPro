'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Save, Trash2, Eye, EyeOff, ExternalLink, Image as ImageIcon,
  X, Loader2, CheckCircle, AlertCircle, ArrowUp, ArrowDown, Megaphone,
} from 'lucide-react'

interface Offer {
  id?: number
  title?: string | null
  description?: string | null
  imageUrl?: string | null
  externalUrl: string
  badge?: string | null
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

const EMPTY_FORM: Offer = {
  title: '',
  description: '',
  imageUrl: '',
  externalUrl: '',
  badge: '',
  isActive: true,
  sortOrder: 0,
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [form, setForm] = useState<Offer>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') }
    else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 4500)
  }

  const loadOffers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/offers', { cache: 'no-store' })
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) {
        setOffers(data.data)
      }
    } catch {
      showMsg('فشل تحميل العروض', true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOffers() }, [loadOffers])

  const handleSubmit = async () => {
    if (!form.externalUrl.trim()) {
      showMsg('رابط الإعلان مطلوب', true)
      return
    }
    if (!form.externalUrl.startsWith('https://')) {
      showMsg('يجب أن يبدأ الرابط بـ https://', true)
      return
    }
    if (form.imageUrl && !form.imageUrl.startsWith('https://')) {
      showMsg('رابط الصورة يجب أن يبدأ بـ https://', true)
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        id: editingId ?? undefined,
      }
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        showMsg(data?.error || 'فشل الحفظ', true)
      } else {
        showMsg(editingId ? 'تم تحديث العرض' : 'تم إضافة العرض')
        setForm(EMPTY_FORM)
        setEditingId(null)
        setShowForm(false)
        await loadOffers()
      }
    } catch {
      showMsg('فشل الاتصال بالخادم', true)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (offer: Offer) => {
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      imageUrl: offer.imageUrl || '',
      externalUrl: offer.externalUrl,
      badge: offer.badge || '',
      isActive: offer.isActive,
      sortOrder: offer.sortOrder,
    })
    setEditingId(offer.id ?? null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggle = async (offer: Offer) => {
    if (!offer.id) return
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...offer, isActive: !offer.isActive }),
      })
      const data = await res.json()
      if (data?.success) {
        await loadOffers()
        showMsg(offer.isActive ? 'تم إخفاء العرض' : 'تم تفعيل العرض')
      } else {
        showMsg(data?.error || 'فشل التحديث', true)
      }
    } catch {
      showMsg('فشل الاتصال بالخادم', true)
    }
  }

  const handleReorder = async (offer: Offer, direction: 'up' | 'down') => {
    if (!offer.id) return
    const newOrder = direction === 'up' ? offer.sortOrder - 1 : offer.sortOrder + 1
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...offer, sortOrder: newOrder }),
      })
      const data = await res.json()
      if (data?.success) {
        await loadOffers()
      }
    } catch {
      showMsg('فشل التحديث', true)
    }
  }

  const handleDelete = async (id: number) => {
    if (deletingId !== id) { setDeletingId(id); setTimeout(() => setDeletingId(null), 4000); return }
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data?.success) {
        showMsg('تم حذف العرض')
        await loadOffers()
      } else {
        showMsg(data?.error || 'فشل الحذف', true)
      }
    } catch {
      showMsg('فشل الاتصال بالخادم', true)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
               style={{ background: 'linear-gradient(135deg, #ff4fd8 0%, #8b2cf5 100%)' }}>
            <Megaphone size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">العروض والإعلانات</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              يظهر هذا القسم في داشبورد التطبيق على أجهزة العملاء
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) { setShowForm(false); return }
            setForm(EMPTY_FORM)
            setEditingId(null)
            setShowForm(true)
          }}
          className="admin-btn-primary flex items-center gap-2"
        >
          {showForm && !editingId ? <><X size={18} /> إلغاء</> : <><Plus size={18} /> إضافة عرض</>}
        </button>
      </div>

      {/* Notification */}
      {(message || error) && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          message ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}>
          {message ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message || error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="admin-card mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {editingId ? 'تعديل العرض' : 'إضافة عرض جديد'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="offer-title" className="admin-label">العنوان</label>
              <input
                id="offer-title"
                type="text"
                className="admin-input"
                value={form.title || ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: عرض حصري لخدمات التسويق"
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="offer-badge" className="admin-label">الشارة (اختياري)</label>
              <input
                id="offer-badge"
                type="text"
                className="admin-input"
                value={form.badge || ''}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="مثال: العرض الرسمي"
                maxLength={40}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="offer-description" className="admin-label">الوصف</label>
              <textarea
                id="offer-description"
                className="admin-input min-h-[80px]"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف موجز للعرض يظهر تحت العنوان"
                maxLength={500}
              />
            </div>
            <div>
              <label htmlFor="offer-image" className="admin-label">رابط الصورة (HTTPS)</label>
              <input
                id="offer-image"
                type="url"
                dir="ltr"
                className="admin-input"
                value={form.imageUrl || ''}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
              {form.imageUrl && form.imageUrl.startsWith('https://') && (
                <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="معاينة"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              )}
            </div>
            <div>
              <label htmlFor="offer-url" className="admin-label">رابط الإعلان (HTTPS) *</label>
              <input
                id="offer-url"
                type="url"
                dir="ltr"
                className="admin-input"
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://www.skywaveads.com/offer"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                هذا الرابط يفتح في متصفح العميل عند الضغط على العرض
              </p>
            </div>
            <div>
              <label htmlFor="offer-order" className="admin-label">ترتيب العرض (الأصغر يظهر أولاً)</label>
              <input
                id="offer-order"
                type="number"
                className="admin-input"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                min={-1000}
                max={1000}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm text-slate-300">العرض مفعّل ومعروض للعملاء</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
            <button
              onClick={handleSubmit}
              disabled={saving || !form.externalUrl.trim()}
              className="admin-btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingId ? 'حفظ التغييرات' : 'إضافة العرض'}
            </button>
            <button
              onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">العروض الحالية ({offers.length})</h2>
          {!loading && offers.length > 0 && (
            <span className="text-xs text-slate-400">
              {offers.filter(o => o.isActive).length} مفعّل
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-white/5">
              <Megaphone size={32} className="text-slate-500" />
            </div>
            <p className="text-slate-300 font-semibold">لا توجد عروض حالياً</p>
            <p className="text-xs text-slate-500 mt-1.5">
              أضف عرضك الأول ليظهر في داشبورد التطبيق على أجهزة العملاء
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  offer.isActive
                    ? 'bg-white/[0.03] border-white/10'
                    : 'bg-white/[0.01] border-white/5 opacity-60'
                }`}
              >
                {/* Image preview */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={offer.imageUrl}
                      alt={offer.title || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {!offer.imageUrl && <ImageIcon size={24} className="text-slate-600" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {offer.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-400 border border-pink-500/25">
                        {offer.badge}
                      </span>
                    )}
                    <h3 className="font-semibold text-white text-sm truncate">
                      {offer.title || 'بدون عنوان'}
                    </h3>
                  </div>
                  {offer.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{offer.description}</p>
                  )}
                  <a
                    href={offer.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 truncate"
                    dir="ltr"
                  >
                    <ExternalLink size={10} />
                    <span className="truncate">{offer.externalUrl}</span>
                  </a>
                </div>

                {/* Order controls */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handleReorder(offer, 'up')}
                    className="p-1 rounded text-slate-400 hover:bg-white/5 hover:text-white"
                    title="تحريك للأعلى"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <span className="text-[10px] text-slate-500 text-center font-mono">
                    {offer.sortOrder}
                  </span>
                  <button
                    onClick={() => handleReorder(offer, 'down')}
                    className="p-1 rounded text-slate-400 hover:bg-white/5 hover:text-white"
                    title="تحريك للأسفل"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(offer)}
                    className={`p-2 rounded-lg transition-colors ${
                      offer.isActive
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-slate-500 hover:bg-white/5'
                    }`}
                    title={offer.isActive ? 'إخفاء' : 'تفعيل'}
                  >
                    {offer.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(offer)}
                    className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10"
                    title="تعديل"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => offer.id && handleDelete(offer.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      deletingId === offer.id
                        ? 'bg-red-500/15 text-red-400 animate-pulse'
                        : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                    }`}
                    title={deletingId === offer.id ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help footer */}
      <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <h3 className="text-sm font-bold text-white mb-2">معلومات مهمة</h3>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc pr-4">
          <li>روابط الصور والإعلانات يجب أن تبدأ بـ <code className="text-blue-400">https://</code></li>
          <li>يمكنك رفع الصور على CDN أو خدمة استضافة صور خارجية ولصق الرابط هنا</li>
          <li>العميل يرى العروض المفعّلة فقط، ومرتبة حسب رقم الترتيب (الأصغر أولاً)</li>
          <li>الحد الأقصى 50 عرض في النظام</li>
        </ul>
      </div>
    </div>
  )
}
