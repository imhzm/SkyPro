import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import {
  CreditCard, Calendar, CheckCircle2, Clock, XCircle,
  Download, FileText, ArrowUpRight, ShieldCheck
} from 'lucide-react'
import RenewButton from '@/components/dashboard/RenewButton'

const STATUS_LABELS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  trial:       { label: 'تجريبي',  cls: 'text-sky-300 bg-sky-500/10 border-sky-500/25',     Icon: Clock },
  active:      { label: 'نشط',     cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25', Icon: CheckCircle2 },
  expired:     { label: 'منتهي',   cls: 'text-red-300 bg-red-500/10 border-red-500/25',     Icon: XCircle },
  cancelled:   { label: 'ملغاة',   cls: 'text-slate-300 bg-slate-500/10 border-slate-500/25', Icon: XCircle },
  suspended:   { label: 'موقوفة',  cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25', Icon: Clock },
  pending_email: { label: 'بانتظار التفعيل', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25', Icon: Clock },
}

function formatDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return '—'
  return `${amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const userId = Number(session.user.id)

  const [subscriptions, invoices, payments] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: { key: { select: { keyCode: true, plan: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'trial')
  const totalPaid = payments
    .filter((p) => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">الفوترة والاشتراك</h1>
        <p className="text-slate-400 mt-1">سجل اشتراكاتك ومدفوعاتك في SkyPro</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={ShieldCheck}
          label="الاشتراك الحالي"
          value={activeSub ? STATUS_LABELS[activeSub.status]?.label ?? activeSub.status : 'لا يوجد'}
          sub={activeSub ? `حتى ${formatDate(activeSub.expiresAt ?? activeSub.trialEndsAt)}` : 'فعّل اشتراكاً للبدء'}
          tone="from-emerald-500/15 to-emerald-500/0"
          iconCls="text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
        />
        <SummaryCard
          icon={FileText}
          label="عدد الفواتير"
          value={invoices.length.toLocaleString('ar-EG')}
          sub={invoices.length === 0 ? 'لم تُصدر فواتير بعد' : 'منذ بدء حسابك'}
          tone="from-sky-500/15 to-sky-500/0"
          iconCls="text-sky-400 bg-sky-500/15 border-sky-500/30"
        />
        <SummaryCard
          icon={CreditCard}
          label="إجمالي المدفوع"
          value={totalPaid > 0 ? `${totalPaid.toLocaleString('ar-EG')} EGP` : '0 EGP'}
          sub={`${payments.length} عملية دفع`}
          tone="from-violet-500/15 to-violet-500/0"
          iconCls="text-violet-400 bg-violet-500/15 border-violet-500/30"
        />
      </div>

      {/* Active subscription detail */}
      {activeSub && (
        <section className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/8 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">تفاصيل اشتراكك</h2>
              <p className="text-slate-500 text-xs mt-0.5">الاشتراك النشط حالياً</p>
            </div>
            <RenewButton />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <DetailItem label="الخطة" value={activeSub.key?.plan ?? 'تجريبي'} />
            <DetailItem
              label="السيريال"
              value={activeSub.key?.keyCode ?? '—'}
              mono
            />
            <DetailItem label="تاريخ البدء" value={formatDate(activeSub.startedAt)} />
            <DetailItem
              label="تاريخ الانتهاء"
              value={formatDate(activeSub.expiresAt ?? activeSub.trialEndsAt)}
              icon={Calendar}
            />
            <DetailItem
              label="السعر"
              value={formatCurrency(activeSub.amount, activeSub.currency)}
            />
            <DetailItem
              label="التجديد التلقائي"
              value={activeSub.autoRenew ? 'مُفعَّل' : 'غير مُفعَّل'}
            />
          </dl>
        </section>
      )}

      {/* Subscription history */}
      <section>
        <h2 className="text-white font-bold text-lg mb-4">سجل الاشتراكات</h2>
        {subscriptions.length === 0 ? (
          <EmptyState
            title="لا يوجد اشتراك بعد"
            sub="اشتراكاتك السابقة والحالية ستظهر هنا."
          />
        ) : (
          <div className="overflow-x-auto bg-white/[0.02] border border-white/8 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-slate-400 text-xs">
                <tr>
                  <Th>البدء</Th>
                  <Th>الانتهاء</Th>
                  <Th>الحالة</Th>
                  <Th>السيريال</Th>
                  <Th>السعر</Th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const cfg = STATUS_LABELS[s.status]
                  return (
                    <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <Td>{formatDate(s.startedAt ?? s.createdAt)}</Td>
                      <Td>{formatDate(s.expiresAt ?? s.trialEndsAt)}</Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg?.cls ?? 'text-slate-300 bg-slate-500/10 border-slate-500/25'}`}>
                          {cfg && <cfg.Icon className="w-3 h-3" />}
                          {cfg?.label ?? s.status}
                        </span>
                      </Td>
                      <Td>
                        {s.key?.keyCode ? (
                          <code className="text-xs text-sky-300" dir="ltr">{s.key.keyCode}</code>
                        ) : <span className="text-slate-600">—</span>}
                      </Td>
                      <Td>{formatCurrency(s.amount, s.currency)}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invoices */}
      <section>
        <h2 className="text-white font-bold text-lg mb-4">الفواتير</h2>
        {invoices.length === 0 ? (
          <EmptyState
            title="لا توجد فواتير"
            sub="بعد دفع اشتراكك ستظهر فواتيرك هنا للتحميل."
          />
        ) : (
          <div className="overflow-x-auto bg-white/[0.02] border border-white/8 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-slate-400 text-xs">
                <tr>
                  <Th>رقم الفاتورة</Th>
                  <Th>التاريخ</Th>
                  <Th>المبلغ</Th>
                  <Th>الحالة</Th>
                  <Th>الإجراء</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <Td><code className="text-sky-300" dir="ltr">{inv.invoiceNumber}</code></Td>
                    <Td>{formatDate(inv.createdAt)}</Td>
                    <Td>{formatCurrency(inv.totalAmount, inv.currency)}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        inv.status === 'paid'
                          ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                          : 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                      }`}>
                        {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'draft' ? 'مسودّة' : inv.status}
                      </span>
                    </Td>
                    <Td>
                      <a
                        href={`/api/account/invoices/${inv.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        تحميل
                      </a>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="bg-gradient-to-br from-sky-500/10 to-violet-500/10 border border-sky-500/20 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-bold mb-1">هل تحتاج مساعدة في الفوترة؟</h3>
            <p className="text-slate-400 text-sm">فريق الدعم متاح للرد على استفساراتك المالية.</p>
          </div>
          <a
            href="mailto:billing@skywaveads.com"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition"
          >
            تواصل مع الدعم المالي
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ============== Helpers ==============

function SummaryCard({
  icon: Icon, label, value, sub, tone, iconCls,
}: {
  icon: typeof CreditCard
  label: string
  value: string
  sub: string
  tone: string
  iconCls: string
}) {
  return (
    <div className={`bg-white/[0.03] border border-white/8 rounded-2xl p-5 relative overflow-hidden`}>
      <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${tone}`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconCls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-400 font-medium">{label}</span>
        </div>
        <p className="text-white text-xl font-bold leading-tight">{value}</p>
        <p className="text-slate-500 text-xs mt-1">{sub}</p>
      </div>
    </div>
  )
}

function DetailItem({
  label, value, icon: Icon, mono,
}: {
  label: string
  value: string
  icon?: typeof Calendar
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </dt>
      <dd className={`text-white font-semibold ${mono ? 'font-mono text-sm tracking-wider' : ''}`} dir={mono ? 'ltr' : 'auto'}>
        {value}
      </dd>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="text-right px-4 py-3 text-slate-300">{children}</td>
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-10 text-center">
      <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-300 font-semibold">{title}</p>
      <p className="text-slate-500 text-xs mt-1">{sub}</p>
    </div>
  )
}
