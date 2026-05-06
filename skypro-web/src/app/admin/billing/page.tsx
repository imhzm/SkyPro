'use client'

import { useEffect, useState } from 'react'
import { CreditCard, FileText, TrendingUp } from 'lucide-react'

type BillingOverview = {
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  expiredSubscriptions: number
  cancelledSubscriptions: number
  suspendedSubscriptions: number
  totalAmountActive: number
  currency: string
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing/overview')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) setData(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return <div className="py-20 text-center text-slate-500">فشل تحميل بيانات الفوترة</div>
  }

  const cards = [
    {
      label: 'المدفوعات (تقديريًا)',
      value: `${data.totalAmountActive.toLocaleString('ar-EG')} ${data.currency}`,
      icon: TrendingUp,
      sub: 'مجموع مبالغ الاشتراكات النشطة (من جدول الاشتراكات)',
      tone: 'from-emerald-500 to-green-600'
    },
    {
      label: 'الاشتراكات',
      value: data.totalSubscriptions.toLocaleString('ar-EG'),
      icon: CreditCard,
      sub: `${data.activeSubscriptions} نشط / ${data.trialSubscriptions} تجريبي / ${data.expiredSubscriptions} منتهي`,
      tone: 'from-sky-500 to-blue-600'
    },
    {
      label: 'الفواتير',
      value: 'غير مفعّل بعد',
      icon: FileText,
      sub: 'سيتم إضافة نظام فواتير ومدفوعات فعلي (Invoices/Payments) في المرحلة التالية',
      tone: 'from-violet-500 to-purple-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">الفوترة</h1>
        <p className="mt-1 text-sm text-slate-400">
          عرض ملخص الفوترة الحالي. (المرحلة التالية ستضيف فواتير ومدفوعات حقيقية بدل الحساب التقديري)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="admin-card">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.tone} shadow-lg`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
