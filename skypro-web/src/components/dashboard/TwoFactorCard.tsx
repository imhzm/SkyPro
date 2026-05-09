'use client'

import { useState } from 'react'
import { Shield, ShieldCheck, Copy, Check, AlertTriangle, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface Props {
  initialEnabled: boolean
  hasPassword: boolean
}

export default function TwoFactorCard({ initialEnabled, hasPassword }: Props) {
  const { success, error } = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setupOpen, setSetupOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [secret, setSecret] = useState('')
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [secretCopied, setSecretCopied] = useState(false)

  const startSetup = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/2fa/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.success) {
        setSecret(data.data.secret)
        setOtpauthUrl(data.data.otpauthUrl)
        setSetupOpen(true)
      } else {
        error(data.error || 'تعذّر بدء الإعداد')
      }
    } catch {
      error('فشل الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const verifySetup = async () => {
    if (!code) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.success) {
        success(data.message || 'تم تفعيل 2FA')
        setBackupCodes(data.data.backupCodes)
        setEnabled(true)
        setCode('')
        setSecret('')
        setOtpauthUrl('')
      } else {
        error(data.error || 'رمز غير صحيح')
      }
    } catch {
      error('فشل الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const disable2FA = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      })
      const data = await res.json()
      if (data.success) {
        success('تم تعطيل 2FA')
        setEnabled(false)
        setDisableOpen(false)
        setDisablePassword('')
        setDisableCode('')
      } else {
        error(data.error || 'فشل التعطيل')
      }
    } catch {
      error('فشل الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-amber-500/15 border border-amber-500/30'
          }`}>
            {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <Shield className="w-5 h-5 text-amber-400" />}
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              التحقق بخطوتين (2FA)
              {enabled && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">مُفعَّل</span>}
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed mt-1">
              {enabled
                ? 'حسابك محمي بطبقة إضافية. ستحتاج إلى رمز من تطبيق Authenticator عند تسجيل الدخول.'
                : 'أضف طبقة حماية إضافية. يستخدم تطبيق مثل Google Authenticator أو Authy لتوليد رمز كل 30 ثانية.'}
            </p>
          </div>
          {enabled ? (
            <button
              onClick={() => setDisableOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 transition shrink-0"
            >
              تعطيل
            </button>
          ) : (
            <button
              onClick={startSetup}
              disabled={submitting}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition shrink-0 disabled:opacity-50"
            >
              {submitting ? 'جارٍ...' : 'تفعيل'}
            </button>
          )}
        </div>
      </div>

      {/* SETUP modal */}
      {setupOpen && !backupCodes && (
        <Modal onClose={() => setSetupOpen(false)} title="إعداد التحقق بخطوتين">
          <ol className="text-sm text-slate-300 space-y-3 list-decimal mr-4">
            <li>افتح تطبيق <strong>Google Authenticator</strong> أو <strong>Authy</strong> على هاتفك.</li>
            <li>امسح الـ QR التالي أو أدخل الـ secret يدوياً.</li>
            <li>أدخل الرمز المُكوَّن من 6 أرقام الذي يظهر في التطبيق للتأكيد.</li>
          </ol>

          <div className="my-5 bg-white p-3 rounded-2xl flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(otpauthUrl)}`}
              alt="QR Code"
              width={180}
              height={180}
            />
          </div>

          <label className="block text-xs text-slate-500 mb-1">أو أدخل المفتاح يدوياً:</label>
          <div className="flex items-center gap-2 mb-4">
            <code className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-sky-300 font-mono break-all" dir="ltr">{secret}</code>
            <button onClick={copySecret} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 shrink-0" aria-label="نسخ">
              {secretCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <label className="block text-sm font-semibold text-slate-300 mb-1.5">رمز التحقق (6 أرقام)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-center text-2xl font-mono tracking-widest text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
          />

          <div className="mt-4 flex gap-2">
            <button onClick={() => setSetupOpen(false)} disabled={submitting} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 disabled:opacity-50">
              إلغاء
            </button>
            <button onClick={verifySetup} disabled={submitting || code.length !== 6} className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white disabled:opacity-50">
              {submitting ? 'جارٍ التحقق...' : 'تأكيد التفعيل'}
            </button>
          </div>
        </Modal>
      )}

      {/* BACKUP CODES modal — shown ONCE */}
      {backupCodes && (
        <Modal onClose={() => { setBackupCodes(null); setSetupOpen(false) }} title="🛡️ احفظ رموز النسخ الاحتياطي">
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200 text-sm leading-relaxed">
              هذه الرموز ستظهر <strong>مرة واحدة فقط</strong>. كل رمز يُستخدم مرة واحدة للدخول إذا فقدت تطبيق Authenticator.
              احفظهم في مكان آمن (خزنة، password manager).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/8 rounded-xl p-4 mb-4">
            {backupCodes.map((c, i) => (
              <code key={i} className="text-sky-300 font-mono text-sm tracking-wider text-center py-1.5" dir="ltr">{c}</code>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n')).catch(() => {})
                success('تم نسخ الرموز')
              }}
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10"
            >
              نسخ الكل
            </button>
            <button
              onClick={() => { setBackupCodes(null); setSetupOpen(false) }}
              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white"
            >
              لقد حفظتها
            </button>
          </div>
        </Modal>
      )}

      {/* DISABLE modal */}
      {disableOpen && (
        <Modal onClose={() => setDisableOpen(false)} title="تعطيل التحقق بخطوتين">
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            تعطيل 2FA يقلل من حماية حسابك. سنرسل إشعاراً لبريدك. للتأكيد، أدخل {hasPassword ? 'كلمة مرورك' : 'رمز TOTP الحالي'}.
          </p>

          {hasPassword && (
            <>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                dir="ltr"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white mb-3"
              />
            </>
          )}

          <label className="block text-sm font-semibold text-slate-300 mb-1.5">
            رمز TOTP {hasPassword && <span className="text-slate-500 text-xs">(اختياري)</span>}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-center text-xl font-mono tracking-widest text-white"
          />

          <div className="mt-4 flex gap-2">
            <button onClick={() => setDisableOpen(false)} disabled={submitting} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 disabled:opacity-50">
              إلغاء
            </button>
            <button
              onClick={disable2FA}
              disabled={submitting || (hasPassword && !disablePassword) || (!hasPassword && !disableCode)}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? 'جارٍ...' : 'تعطيل'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white" aria-label="إغلاق">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
