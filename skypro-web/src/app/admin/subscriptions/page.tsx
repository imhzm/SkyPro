'use client'

import { useEffect, useState, useCallback } from 'react'

interface Subscription {
  id: number
  userId: number
  keyId: number | null
  status: string
  trialEndsAt: string | null
  startedAt: string | null
  expiresAt: string | null
  autoRenew: boolean
  amount: number | null
  currency: string
  createdAt: string
  user: { id: number; email: string; name: string | null }
  key: { keyCode: string; status: string } | null
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadSubscriptions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    fetch(`/api/admin/subscriptions?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSubscriptions(data.data.subscriptions)
          setTotalPages(data.data.totalPages)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const updateSubscription = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      const data = await res.json()
      if (data.success) loadSubscriptions()
      else alert(data.error || 'فشلت العملية')
    } catch {
      alert('فشل الاتصال بالخادم')
    }
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = { trial: 'تجريبي', active: 'نشط', expired: 'منتهي', cancelled: 'ملغى' }
    return map[status] || status
  }

  const statusClass = (status: string) => {
    const map: Record<string, string> = { trial: 'admin-badge-warning', active: 'admin-badge-success', expired: 'admin-badge-danger', cancelled: 'admin-badge-danger' }
    return map[status] || 'admin-badge'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">إدارة الاشتراكات</h1>

      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>المفتاح</th>
                  <th>الحالة</th>
                  <th>النوع</th>
                  <th>بداية التجربة</th>
                  <th>تاريخ الانتهاء</th>
                  <th>المبلغ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="font-medium text-white">{sub.user?.name || sub.user?.email}</td>
                    <td className="text-sm font-mono text-slate-400">{sub.key?.keyCode || '—'}</td>
                    <td><span className={statusClass(sub.status)}>{statusLabel(sub.status)}</span></td>
                    <td className="text-slate-300">{sub.trialEndsAt ? 'تجريبي' : 'مدفوع'}</td>
                    <td className="text-slate-500">{sub.startedAt ? new Date(sub.startedAt).toLocaleDateString('ar-EG') : '—'}</td>
                    <td className="text-slate-500">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('ar-EG') : '—'}</td>
                    <td className="text-slate-300">{sub.amount ? `${sub.amount} ${sub.currency}` : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        {sub.status === 'trial' && (
                          <button
                            onClick={() => updateSubscription(sub.id, 'active')}
                            className="text-xs bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-500/25 transition-colors"
                          >
                            تفعيل
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <button
                            onClick={() => updateSubscription(sub.id, 'expired')}
                            className="text-xs bg-red-500/15 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/25 transition-colors"
                          >
                            إنهاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">السابق</button>
            <span className="text-sm text-slate-500">{page} من {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">التالي</button>
          </div>
        )}
      </div>
    </div>
  )
}