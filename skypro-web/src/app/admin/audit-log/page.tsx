'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface AuditLogEntry {
  id: number
  userId: number | null
  action: string
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  user: { id: number; email: string; name: string | null } | null
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  const loadLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25', action: actionFilter })
    fetch(`/api/admin/audit-log?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLogs(data.data.logs)
          setTotalPages(data.data.totalPages)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, actionFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const actionLabels: Record<string, string> = {
    login: 'تسجيل دخول',
    register: 'تسجيل حساب',
    register_google: 'تسجيل بـ Google',
    logout: 'تسجيل خروج',
    verify_email: 'تأكيد البريد',
    password_reset: 'إعادة تعيين كلمة المرور',
    device_verified: 'تحقق من جهاز',
    device_reset: 'إعادة تعيين جهاز',
    update_user: 'تعديل مستخدم',
    delete_user: 'حذف مستخدم',
    admin_generate_keys: 'إنشاء مفاتيح',
    admin_reset_device: 'إعادة تعيين جهاز (أدمن)',
    update_setting: 'تعديل إعدادات',
    update_subscription: 'تعديل اشتراك',
  }

  const filterActions = ['', 'login', 'register', 'register_google', 'device_verified', 'device_reset', 'update_user', 'delete_user', 'admin_generate_keys', 'update_setting']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">سجل الأحداث</h1>
        <button onClick={loadLogs} className="admin-btn-secondary text-sm">
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      <div className="admin-card mb-4">
        <div className="flex flex-wrap gap-2">
          {filterActions.map((a) => (
            <button
              key={a}
              onClick={() => { setActionFilter(a); setPage(1); }}
              className={actionFilter === a ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}
            >
              {a === '' ? 'الكل' : (actionLabels[a] || a)}
            </button>
          ))}
        </div>
      </div>

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
                  <th>الحدث</th>
                  <th>التفاصيل</th>
                  <th>IP</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-slate-400">{log.user?.email || '—'}</td>
                    <td>
                      <span className="admin-badge-info">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                    <td className="text-slate-500 font-mono text-xs">{log.ipAddress || '—'}</td>
                    <td className="text-slate-500">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
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