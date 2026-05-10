import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/account/invoices/[id]/download
 * Returns a print-ready HTML invoice. The browser's print dialog produces
 * a high-quality PDF without server-side dependencies.
 *
 * Customers can only download their own invoices (verified via session).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }

    const { id: idStr } = await ctx.params
    const invoiceId = Number.parseInt(idStr, 10)
    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json(errorResponse('معرّف غير صالح'), { status: 400 })
    }

    const userId = Number(session.user.id)
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        user: { select: { name: true, email: true } },
        subscription: {
          include: { key: { select: { keyCode: true, plan: true } } },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json(errorResponse('الفاتورة غير موجودة'), { status: 404 })
    }

    const html = renderInvoiceHTML(invoice)
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    })
  } catch (err) {
    console.error('Invoice download error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
  )
}

function fmtCurrency(amount: number, currency = 'EGP'): string {
  return `${amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

function renderInvoiceHTML(inv: any): string {
  const subtotal = Number(inv.subtotal ?? 0)
  const tax = Number(inv.taxAmount ?? 0)
  const discount = Number(inv.discountAmount ?? 0)
  const total = Number(inv.totalAmount ?? subtotal + tax - discount)
  const currency = inv.currency || 'EGP'
  const isPaid = inv.status === 'paid'
  const planLabel = inv.subscription?.key?.plan || 'اشتراك SkyPro'

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>فاتورة ${escapeHtml(inv.invoiceNumber)} — SkyPro</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tahoma', Arial, sans-serif; background: #f5f7fa; color: #0f172a; padding: 24px; line-height: 1.6; }
  .invoice { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.08); }
  .invoice-header { background: linear-gradient(135deg,#0A6CF1 0%, #8B2CF5 100%); color: #fff; padding: 36px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
  .invoice-header h1 { font-size: 30px; font-weight: 800; letter-spacing: 1px; }
  .invoice-header .subtitle { opacity: 0.9; font-size: 14px; margin-top: 4px; }
  .invoice-num { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 8px; font-family: monospace; font-size: 14px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
  .badge-paid { background: #10b98122; color: #047857; border: 1px solid #10b98155; }
  .badge-draft { background: #f59e0b22; color: #92400e; border: 1px solid #f59e0b55; }
  .body { padding: 36px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-block h3 { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; font-weight: 600; }
  .meta-block p { font-size: 14px; color: #0f172a; font-weight: 500; }
  .meta-block strong { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f1f5f9; padding: 12px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .total-row { background: #f8fafc; font-weight: 700; }
  .total-row td { font-size: 16px; padding: 16px 12px; }
  .summary { display: flex; justify-content: flex-end; }
  .summary-table { min-width: 280px; }
  .summary-table tr { border: none; }
  .summary-table td { padding: 6px 0; border: none; }
  .summary-table td:last-child { text-align: left; font-weight: 600; }
  .summary-grand { border-top: 2px solid #0A6CF1; padding-top: 12px !important; font-size: 18px !important; color: #0A6CF1; font-weight: 800 !important; }
  .footer { background: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.8; }
  .footer p { margin-bottom: 4px; }
  .actions { max-width: 820px; margin: 0 auto 16px; display: flex; gap: 8px; justify-content: flex-end; }
  .btn { padding: 10px 20px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; }
  .btn-primary { background: #0A6CF1; color: #fff; border-color: #0A6CF1; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice { box-shadow: none; border-radius: 0; }
    .actions { display: none; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    <button class="btn" onclick="window.close()">إغلاق</button>
  </div>
  <div class="invoice">
    <div class="invoice-header">
      <div>
        <h1>SkyPro</h1>
        <p class="subtitle">منتج Sky Wave للتسويق الآلي</p>
      </div>
      <div style="text-align: left;">
        <div class="invoice-num">#${escapeHtml(inv.invoiceNumber)}</div>
        <div style="margin-top: 8px;">
          <span class="badge ${isPaid ? 'badge-paid' : 'badge-draft'}">
            ${isPaid ? '✓ مدفوعة' : 'مسودّة'}
          </span>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="meta-grid">
        <div class="meta-block">
          <h3>الفاتورة موجهة إلى</h3>
          <p><strong>${escapeHtml(inv.user?.name || 'عميلنا الكريم')}</strong></p>
          <p style="color: #64748b; font-size: 13px;" dir="ltr">${escapeHtml(inv.user?.email || '')}</p>
        </div>
        <div class="meta-block" style="text-align: left;">
          <h3>التواريخ</h3>
          <p>إصدار: <strong>${fmtDate(inv.createdAt)}</strong></p>
          ${inv.dueDate ? `<p>استحقاق: <strong>${fmtDate(inv.dueDate)}</strong></p>` : ''}
          ${inv.paidAt ? `<p>دفع: <strong>${fmtDate(inv.paidAt)}</strong></p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>الوصف</th>
            <th style="text-align: center; width: 100px;">الكمية</th>
            <th style="text-align: left; width: 140px;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${escapeHtml(planLabel)}</strong>
              ${inv.subscription?.key?.keyCode ? `<br><span style="color: #64748b; font-size: 12px; font-family: monospace;" dir="ltr">${escapeHtml(inv.subscription.key.keyCode)}</span>` : ''}
            </td>
            <td style="text-align: center;">1</td>
            <td style="text-align: left;">${fmtCurrency(subtotal, currency)}</td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <table class="summary-table">
          <tr><td>الإجمالي الفرعي:</td><td>${fmtCurrency(subtotal, currency)}</td></tr>
          ${tax > 0 ? `<tr><td>الضريبة:</td><td>${fmtCurrency(tax, currency)}</td></tr>` : ''}
          ${discount > 0 ? `<tr><td>الخصم:</td><td>-${fmtCurrency(discount, currency)}</td></tr>` : ''}
          <tr><td class="summary-grand">الإجمالي:</td><td class="summary-grand">${fmtCurrency(total, currency)}</td></tr>
        </table>
      </div>

      ${inv.notes ? `<div style="margin-top: 24px; padding: 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; font-size: 13px; color: #9a3412;"><strong>ملاحظة:</strong> ${escapeHtml(inv.notes)}</div>` : ''}
    </div>

    <div class="footer">
      <p><strong>Sky Wave for Digital Marketing</strong></p>
      <p>للاستفسارات: <a href="mailto:billing@skywaveads.com" style="color: #0A6CF1;">billing@skywaveads.com</a></p>
      <p style="margin-top: 8px; color: #94a3b8;">شكراً لاستخدامك SkyPro · skypro.skywaveads.com</p>
    </div>
  </div>
</body>
</html>`
}
