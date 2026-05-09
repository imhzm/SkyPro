import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`subscribe:ip:${ipAddress}`, 5, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json().catch(() => null)
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const source = typeof body?.source === 'string' ? body.source.slice(0, 60) : 'homepage_footer'

    if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json(errorResponse('بريد إلكتروني غير صالح'), { status: 400 })
    }

    const emailLimit = checkRateLimit(`subscribe:email:${rawEmail}`, 3, 60 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: rawEmail },
    })

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(successResponse(
          { alreadySubscribed: true },
          'بريدك مسجل بالفعل في النشرة البريدية'
        ))
      }
      await prisma.newsletterSubscriber.update({
        where: { email: rawEmail },
        data: { status: 'active', unsubscribedAt: null, source, ipAddress, userAgent },
      })
    } else {
      await prisma.newsletterSubscriber.create({
        data: { email: rawEmail, source, ipAddress, userAgent },
      })
    }

    const adminEmail = process.env.NEWSLETTER_NOTIFY_EMAIL || 'admin@skywaveads.com'
    sendEmail({
      to: adminEmail,
      subject: `📬 اشتراك جديد في نشرة SkyPro: ${rawEmail}`,
      text: `مشترك جديد في نشرة SkyPro البريدية:\n\nالبريد: ${rawEmail}\nالمصدر: ${source}\nIP: ${ipAddress ?? 'غير معروف'}\nالتاريخ: ${new Date().toLocaleString('ar-EG')}\n`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;padding:24px;background:#f8fafc;">
        <h2 style="color:#0f172a;margin:0 0 12px;">📬 مشترك جديد في النشرة البريدية</h2>
        <table style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#64748b;">البريد:</td><td style="padding:6px;color:#0f172a;font-weight:bold;">${rawEmail}</td></tr>
          <tr><td style="padding:6px;color:#64748b;">المصدر:</td><td style="padding:6px;color:#0f172a;">${source}</td></tr>
          <tr><td style="padding:6px;color:#64748b;">IP:</td><td style="padding:6px;color:#0f172a;">${ipAddress ?? 'غير معروف'}</td></tr>
          <tr><td style="padding:6px;color:#64748b;">التاريخ:</td><td style="padding:6px;color:#0f172a;">${new Date().toLocaleString('ar-EG')}</td></tr>
        </table>
      </div>`,
    }).catch((err) => {
      console.error('Newsletter notification email failed:', err)
    })

    return NextResponse.json(successResponse(
      { subscribed: true },
      'تم اشتراكك بنجاح! 🎉 ستصلك آخر التحديثات والعروض'
    ))
  } catch (err) {
    console.error('Newsletter subscribe error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
