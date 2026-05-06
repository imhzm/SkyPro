'use client'

import { useEffect, useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

interface Device {
  id: number
  userId: number
  keyId: number
  deviceFingerprint: string
  deviceName: string | null
  osInfo: string | null
  cpuInfo: string | null
  ramInfo: string | null
  isActive: boolean
  resetCount: number
  maxResetsPerYear: number
  firstSeenAt: string
  lastSeenAt: string
  user: { id: number; email: string; name: string | null }
  key: { keyCode: string; status: string }
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadDevices = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    fetch(`/api/admin/devices?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDevices(data.data.devices)
          setTotalPages(data.data.totalPages)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const resetDevice = async (deviceId: number) => {
    if (!confirm('هل أنت متأكد من إعادة تعيين هذا الجهاز؟')) return
    try {
      const res = await fetch(`/api/admin/devices?id=${deviceId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) loadDevices()
      else alert(data.error || 'فشلت العملية')
    } catch {
      alert('فشل الاتصال بالخادم')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">إدارة الأجهزة</h1>

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
                  <th>اسم الجهاز</th>
                  <th>نظام التشغيل</th>
                  <th>المعالج</th>
                  <th>الرام</th>
                  <th>الحالة</th>
                  <th>إعادة التعيين</th>
                  <th>آخر نشاط</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="font-medium text-white">{device.user?.name || device.user?.email || '—'}</td>
                    <td className="text-sm font-mono text-slate-400">{device.key?.keyCode || '—'}</td>
                    <td className="text-slate-300">{device.deviceName || '—'}</td>
                    <td className="text-slate-400">{device.osInfo || '—'}</td>
                    <td className="text-slate-400">{device.cpuInfo || '—'}</td>
                    <td className="text-slate-300">{device.ramInfo || '—'}</td>
                    <td>
                      <span className={device.isActive ? 'admin-badge-success' : 'admin-badge-danger'}>
                        {device.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="text-slate-400">{device.resetCount}/{device.maxResetsPerYear}</td>
                    <td className="text-slate-500">{new Date(device.lastSeenAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                      {device.isActive && (
                        <button
                          onClick={() => resetDevice(device.id)}
                          className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="إعادة تعيين الجهاز"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
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