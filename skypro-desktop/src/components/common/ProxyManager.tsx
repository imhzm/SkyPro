import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, CheckCircle, XCircle, Wifi, WifiOff, Loader2, AlertCircle, Shield } from 'lucide-react'

interface Proxy {
  id: string
  label: string
  host: string
  port: string
  protocol: 'http' | 'https' | 'socks5'
  username?: string
  password?: string
  status: 'متاح' | 'قيد الاستخدام' | 'متوقف'
}

export default function ProxyManager() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newProxy, setNewProxy] = useState<Partial<Proxy>>({ protocol: 'http', status: 'متاح' })
  const [loadingTest, setLoadingTest] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 4000)
  }

  const loadProxies = useCallback(async () => {
    try {
      const res = await window.electronAPI.getProxies()
      if (res.success && res.data) setProxies((Array.isArray(res.data) ? res.data : []) as unknown as Proxy[])
    } catch { showMsg('فشل تحميل البروكسيات', true) }
  }, [])

  useEffect(() => { loadProxies() }, [loadProxies])

  const handleAdd = async () => {
    if (!newProxy.host || !newProxy.port) {
      showMsg('يرجى إدخال الـ IP والـ Port', true)
      return
    }
    const portNum = parseInt(String(newProxy.port))
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showMsg('رقم المنفذ غير صالح (1-65535)', true)
      return
    }
    try {
      await window.electronAPI.saveProxy({
        label: newProxy.label || `${newProxy.host}:${newProxy.port}`,
        host: newProxy.host!,
        port: newProxy.port!,
        protocol: newProxy.protocol || 'http',
        username: newProxy.username || '',
        password: newProxy.password || '',
      } as Parameters<typeof window.electronAPI.saveProxy>[0])
      setNewProxy({ protocol: 'http', status: 'متاح' })
      setShowAdd(false)
      showMsg('تم إضافة البروكسي بنجاح')
      await loadProxies()
    } catch { showMsg('فشل إضافة البروكسي', true) }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.deleteProxy({ id: parseInt(id) })
      showMsg('تم حذف البروكسي')
      await loadProxies()
    } catch { showMsg('فشل حذف البروكسي', true) }
  }

  const handleTest = async (proxy: Proxy) => {
    setLoadingTest(proxy.id)
    try {
      const proxyStr = `${proxy.protocol}://${proxy.username ? proxy.username + ':' + proxy.password + '@' : ''}${proxy.host}:${proxy.port}`
      const res = await window.electronAPI.testProxy({ host: proxy.host, port: proxy.port, protocol: proxy.protocol, proxy: proxyStr } as Parameters<typeof window.electronAPI.testProxy>[0])
      const status = res.success ? 'متاح' : 'متوقف'
      await window.electronAPI.dbUpdate({ table: 'proxies', id: parseInt(proxy.id), data: { status } })
      setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: status as Proxy['status'] } : p))
      showMsg(res.success ? 'البروكسي يعمل بشكل صحيح' : 'البروكسي لا يستجيب')
    } catch {
      setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: 'متوقف' } : p))
      showMsg('فشل اختبار البروكسي', true)
    }
    setLoadingTest(null)
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-secondary-900">إدارة البروكسيات</h2>
            <p className="text-xs text-secondary-500">إدارة واختبار البروكسيات للحماية</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary"><Plus size={18} /> إضافة بروكسي</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card-gradient-border">
          <h3 className="font-bold text-secondary-900 mb-4">بروكسي جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">الاسم</label><input type="text" className="input-field" placeholder="بروكسي 1" value={newProxy.label || ''} onChange={(e) => setNewProxy({ ...newProxy, label: e.target.value })} /></div>
            <div><label className="label-field">البروتوكول</label><select className="select-field" value={newProxy.protocol} onChange={(e) => setNewProxy({ ...newProxy, protocol: e.target.value as Proxy['protocol'] })}><option value="http">HTTP</option><option value="https">HTTPS</option><option value="socks5">SOCKS5</option></select></div>
            <div><label className="label-field">الـ IP</label><input type="text" className="input-field" placeholder="192.168.1.1" dir="ltr" value={newProxy.host || ''} onChange={(e) => setNewProxy({ ...newProxy, host: e.target.value })} /></div>
            <div><label className="label-field">الـ Port</label><input type="text" className="input-field" placeholder="8080" dir="ltr" value={newProxy.port || ''} onChange={(e) => setNewProxy({ ...newProxy, port: e.target.value })} /></div>
            <div><label className="label-field">اسم المستخدم (اختياري)</label><input type="text" className="input-field" placeholder="username" dir="ltr" value={newProxy.username || ''} onChange={(e) => setNewProxy({ ...newProxy, username: e.target.value })} /></div>
            <div><label className="label-field">كلمة المرور (اختياري)</label><input type="password" className="input-field" placeholder="password" dir="ltr" value={newProxy.password || ''} onChange={(e) => setNewProxy({ ...newProxy, password: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="btn-primary">إضافة</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      )}

      {/* Proxy List */}
      <div className="space-y-3">
        {proxies.length === 0 ? (
          <div className="card-gradient-border text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(10,108,241,0.1), rgba(139,44,245,0.1))' }}>
              <Globe size={32} style={{ color: '#94a3b8' }} />
            </div>
            <p className="text-secondary-500 font-medium">لا توجد بروكسيات مضافة</p>
            <p className="text-xs text-secondary-400 mt-1">أضف بروكسي لحماية حساباتك من الحظر</p>
          </div>
        ) : (
          proxies.map((proxy) => (
            <div key={proxy.id} className="card-gradient-border flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: proxy.status === 'متاح' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {proxy.status === 'متاح' ? <Wifi size={20} className="text-emerald-500" /> : <WifiOff size={20} className="text-red-500" />}
                </div>
                <div>
                  <h4 className="font-bold text-secondary-900 text-sm">{proxy.label}</h4>
                  <p className="text-xs text-secondary-500 font-mono">{proxy.protocol.toUpperCase()}://{proxy.host}:{proxy.port}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${proxy.status === 'متاح' ? 'badge-success' : 'badge-danger'}`}>
                  {proxy.status === 'متاح' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {proxy.status}
                </span>
                <button onClick={() => handleTest(proxy)} className="btn-secondary text-sm" disabled={loadingTest === proxy.id} style={{ padding: '0.375rem 0.75rem' }}>
                  {loadingTest === proxy.id ? <Loader2 size={14} className="animate-spin" /> : 'اختبار'}
                </button>
                <button onClick={() => handleDelete(proxy.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
