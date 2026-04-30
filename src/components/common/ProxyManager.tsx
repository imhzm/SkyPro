import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, CheckCircle, XCircle, Wifi, WifiOff, Loader2 } from 'lucide-react'

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

  const loadProxies = useCallback(async () => {
    try {
      const res = await window.electronAPI.getProxies()
      if (res.success && res.data) setProxies(res.data || [])
    } catch (err: any) { console.error('Failed to load proxies:', err.message) }
  }, [])

  useEffect(() => { loadProxies() }, [loadProxies])

  const handleAdd = async () => {
    if (!newProxy.host || !newProxy.port) return
    const portNum = parseInt(String(newProxy.port))
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { setProxies(prev => prev); return }
    try {
      await window.electronAPI.saveProxy({
        label: newProxy.label || `${newProxy.host}:${newProxy.port}`,
        host: newProxy.host,
        port: newProxy.port,
        protocol: newProxy.protocol || 'http',
        username: newProxy.username || '',
        password: newProxy.password || '',
      })
      setNewProxy({ protocol: 'http', status: 'متاح' })
      setShowAdd(false)
      await loadProxies()
} catch (err: any) { console.error('Failed to add proxy:', err.message) }
  }

  const handleDelete = async (id: string) => {
    try { await window.electronAPI.deleteProxy({ id: parseInt(id) }); await loadProxies() } catch (err: any) { console.error('Failed to delete proxy:', err.message) }
  }

  const handleTest = async (proxy: Proxy) => {
    setLoadingTest(proxy.id)
    try {
      const proxyStr = `${proxy.protocol}://${proxy.username ? proxy.username + ':' + proxy.password + '@' : ''}${proxy.host}:${proxy.port}`
      const res = await window.electronAPI.testProxy({ proxy: proxyStr })
      const status = res.success ? 'متاح' : 'متوقف'
      await window.electronAPI.dbUpdate({ table: 'proxies', id: parseInt(proxy.id), data: { status } })
      setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: status as any } : p))
    } catch (err: any) { console.error('Proxy test failed:', err.message); setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: 'متوقف' as any } : p)) }
    setLoadingTest(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary-900">إدارة البروكسيات</h2>
          <p className="text-sm text-secondary-500">إدارة واختبار البروكسيات للحماية</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary"><Plus size={18} /> إضافة بروكسي</button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4">بروكسي جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">الاسم</label><input type="text" className="input-field" placeholder="بروكسي 1" value={newProxy.label || ''} onChange={(e) => setNewProxy({ ...newProxy, label: e.target.value })} /></div>
            <div><label className="label-field">البروتوكول</label><select className="select-field" value={newProxy.protocol} onChange={(e) => setNewProxy({ ...newProxy, protocol: e.target.value as any })}><option value="http">HTTP</option><option value="https">HTTPS</option><option value="socks5">SOCKS5</option></select></div>
            <div><label className="label-field">الـ IP</label><input type="text" className="input-field" placeholder="192.168.1.1" value={newProxy.host || ''} onChange={(e) => setNewProxy({ ...newProxy, host: e.target.value })} /></div>
            <div><label className="label-field">الـ Port</label><input type="text" className="input-field" placeholder="8080" value={newProxy.port || ''} onChange={(e) => setNewProxy({ ...newProxy, port: e.target.value })} /></div>
            <div><label className="label-field">اسم المستخدم (اختياري)</label><input type="text" className="input-field" placeholder="username" value={newProxy.username || ''} onChange={(e) => setNewProxy({ ...newProxy, username: e.target.value })} /></div>
            <div><label className="label-field">كلمة المرور (اختياري)</label><input type="password" className="input-field" placeholder="password" value={newProxy.password || ''} onChange={(e) => setNewProxy({ ...newProxy, password: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="btn-primary">إضافة</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {proxies.length === 0 ? (
          <div className="card text-center py-12"><Globe size={48} className="mx-auto mb-4 text-secondary-300" /><p className="text-secondary-500">لا توجد بروكسيات مضافة</p></div>
        ) : (
          proxies.map((proxy) => (
            <div key={proxy.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                {proxy.status === 'متاح' ? <Wifi size={20} className="text-success-500" /> : <WifiOff size={20} className="text-danger-500" />}
                <div>
                  <h4 className="font-bold text-secondary-900">{proxy.label}</h4>
                  <p className="text-sm text-secondary-500">{proxy.protocol.toUpperCase()}://{proxy.host}:{proxy.port}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${proxy.status === 'متاح' ? 'badge-success' : 'badge-danger'}`}>{proxy.status === 'متاح' ? <CheckCircle size={12} /> : <XCircle size={12} />}{proxy.status}</span>
                <button onClick={() => handleTest(proxy)} className="btn-secondary text-sm" disabled={loadingTest === proxy.id}>{loadingTest === proxy.id ? <Loader2 size={14} className="animate-spin"/> : 'اختبار'}</button>
                <button onClick={() => handleDelete(proxy.id)} className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
