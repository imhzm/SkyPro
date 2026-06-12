import { ShieldAlert, WifiOff, MessageCircle, Mail, RefreshCw, LogIn } from 'lucide-react'
import { SUPPORT, whatsappLink, emailLink, openExternal } from '../../config/support'

interface LicenseLockScreenProps {
  /** Human-readable reason returned by the server (or offline message). */
  message: string
  /** 'rejected' = server fail-closed (suspended/expired/device); 'offline' = unreachable past grace. */
  variant: 'rejected' | 'offline'
  /** Clear auth and return to the login screen. */
  onReLogin: () => void
}

export default function LicenseLockScreen({ message, variant, onReLogin }: LicenseLockScreenProps) {
  const isOffline = variant === 'offline'
  const Icon = isOffline ? WifiOff : ShieldAlert
  const accent = isOffline ? '#f59e0b' : '#ef4444'
  const title = isOffline ? 'تعذّر التحقق من الاشتراك' : 'تم إيقاف الوصول إلى البرنامج'
  const prefill = `مرحباً فريق SkyPro، أحتاج مساعدة بخصوص اشتراكي.\nالحالة: ${message}`

  return (
    <div
      dir="rtl"
      className="flex items-center justify-center min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #001A3A, #0A1628, #0D1137)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
          style={{ background: `${accent}1F` }}
        >
          <Icon size={32} color={accent} />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-white/60 leading-relaxed mb-6">{message}</p>

        {/* Primary action */}
        {isOffline ? (
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white mb-3 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <RefreshCw size={18} /> إعادة المحاولة
          </button>
        ) : (
          <button
            onClick={onReLogin}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white mb-3 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <LogIn size={18} /> تسجيل الدخول من جديد
          </button>
        )}

        {/* Support channels */}
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-white/40 mb-3">هل تحتاج مساعدة؟ تواصل مع الدعم الفني</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => openExternal(whatsappLink(prefill))}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}
            >
              <MessageCircle size={16} /> واتساب
            </button>
            <button
              onClick={() => openExternal(emailLink('دعم اشتراك SkyPro'))}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Mail size={16} /> البريد
            </button>
          </div>
          <p className="text-[11px] text-white/30 mt-3 select-text">{SUPPORT.email}</p>
        </div>
      </div>
    </div>
  )
}
