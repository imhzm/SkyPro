import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/utils'
import { errorResponse, getErrorMessage, successResponse } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'
import {
  sendEmail,
  generateGrantAccessEmail,
  generateGrantAccessEmailText,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * One-shot "Grant Access" admin workflow:
 *   user → key → subscription → (optional invoice + payment)
 * Replaces 3-4 manual steps with a single transactional call.
 */
const grantAccessSchema = z.object({
  userId: z.coerce.number().int().positive(),
  plan: z.string().trim().min(1).max(40).default('pro'),
  durationDays: z.coerce.number().int().min(1).max(3650).default(365),
  maxDevices: z.coerce.number().int().min(1).max(50).default(1),
  /** Subscription kind: 'trial' (no payment) or 'paid'. */
  type: z.enum(['trial', 'paid']).default('paid'),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().min(3).max(10).default('EGP'),
  /** Create an Invoice record for this grant (recommended for paid). */
  createInvoice: z.boolean().default(true),
  /** Mark the invoice as paid + create a corresponding Payment record. */
  markPaid: z.boolean().default(true),
  paymentMethod: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** Send a welcome email with the serial + subscription details to the user. */
  sendEmail: z.boolean().default(true),
})

function generateInvoiceNumber(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomInt(100000, 1000000)
  return `INV-${yyyy}${mm}${dd}-${rand}`
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const tooLarge = rejectLargeJson(req, 16 * 1024)
    if (tooLarge) return tooLarge

    const parsed = grantAccessSchema.safeParse(await req.json())
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join('، ')
      return NextResponse.json(errorResponse(message || 'بيانات غير صالحة'), { status: 400 })
    }

    const data = parsed.data

    // Validate user
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, status: true, name: true },
    })
    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
      return NextResponse.json(errorResponse('لا يمكن فتح اشتراك لمستخدم محظور أو محذوف'), { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000)
    const price = data.price ?? 0
    const isTrial = data.type === 'trial'

    // Run everything in a single transaction so partial failures roll back.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Activation key — already activated since admin is granting access directly.
      const key = await tx.activationKey.create({
        data: {
          keyCode: generateApiKey(),
          plan: data.plan,
          durationDays: data.durationDays,
          maxDevices: data.maxDevices,
          userId: user.id,
          status: 'active',
          activatedAt: now,
          expiresAt,
        },
      })

      // 2. Subscription — bound 1:1 to the key.
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          keyId: key.id,
          status: isTrial ? 'trial' : 'active',
          trialEndsAt: isTrial ? expiresAt : null,
          startedAt: now,
          expiresAt,
          autoRenew: false,
          paymentMethod: data.paymentMethod || (isTrial ? 'trial' : 'manual'),
          amount: isTrial ? 0 : price,
          currency: data.currency.toUpperCase(),
        },
      })

      let invoice = null
      let payment = null

      // 3. Optional invoice — skipped for trials.
      if (!isTrial && data.createInvoice && price > 0) {
        invoice = await tx.invoice.create({
          data: {
            userId: user.id,
            subscriptionId: subscription.id,
            invoiceNumber: generateInvoiceNumber(),
            status: data.markPaid ? 'paid' : 'issued',
            subtotal: price,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: price,
            currency: data.currency.toUpperCase(),
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            paidAt: data.markPaid ? now : null,
            notes: data.notes || `Manually granted by admin · ${data.plan} · ${data.durationDays} days`,
          },
        })

        // 4. Optional payment record.
        if (data.markPaid) {
          payment = await tx.payment.create({
            data: {
              userId: user.id,
              subscriptionId: subscription.id,
              invoiceId: invoice.id,
              provider: 'admin_manual',
              providerRef: `admin-${guard.session?.user?.id || 'sys'}-${Date.now()}`,
              status: 'paid',
              amount: price,
              currency: data.currency.toUpperCase(),
              method: data.paymentMethod || 'manual',
              paidAt: now,
              metadata: {
                grantedBy: guard.session?.user?.id || null,
                source: 'grant-access',
                plan: data.plan,
              },
            },
          })
        }
      }

      // 5. If user is not yet activated, mark them active.
      if (user.status !== 'active') {
        await tx.user.update({
          where: { id: user.id },
          data: { status: 'active', emailVerifiedAt: user.status === 'pending_verification' ? now : undefined },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: Number(guard.session?.user.id),
          action: 'admin_grant_access',
          details: {
            userId: user.id,
            email: user.email,
            keyId: key.id,
            subscriptionId: subscription.id,
            invoiceId: invoice?.id ?? null,
            paymentId: payment?.id ?? null,
            plan: data.plan,
            durationDays: data.durationDays,
            price: isTrial ? 0 : price,
            type: data.type,
          },
          ipAddress: getClientIp(req),
        },
      })

      return { key, subscription, invoice, payment, user }
    })

    // Send welcome/grant-access email (best-effort — failure shouldn't roll
    // back the DB transaction since the access is already granted).
    let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped'
    let emailError: string | null = null
    if (data.sendEmail) {
      try {
        const expiryFormatted = expiresAt.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const emailData = {
          name: result.user.name,
          email: result.user.email,
          serial: result.key.keyCode,
          expiryDate: expiryFormatted,
          planLabel: data.plan,
          durationDays: data.durationDays,
          isTrial,
          amount: isTrial ? undefined : price,
          currency: data.currency.toUpperCase(),
          invoiceNumber: result.invoice?.invoiceNumber || undefined,
        }
        const subject = isTrial
          ? `🎁 تم تفعيل فترتك التجريبية في SkyPro`
          : `✅ تم تفعيل اشتراكك في SkyPro — ${data.durationDays} يوم`
        const sent = await sendEmail({
          to: result.user.email,
          subject,
          text: generateGrantAccessEmailText(emailData),
          html: generateGrantAccessEmail(emailData),
        })
        emailStatus = sent.success ? 'sent' : 'failed'
        emailError = sent.success ? null : sent.error || null
      } catch (err) {
        emailStatus = 'failed'
        emailError = err instanceof Error ? err.message : String(err)
        console.error('Grant access email error:', err)
      }
    }

    return NextResponse.json(
      successResponse(
        {
          user: { id: result.user.id, email: result.user.email, name: result.user.name },
          key: {
            id: result.key.id,
            keyCode: result.key.keyCode,
            expiresAt: result.key.expiresAt,
            status: result.key.status,
          },
          subscription: {
            id: result.subscription.id,
            status: result.subscription.status,
            expiresAt: result.subscription.expiresAt,
          },
          invoice: result.invoice
            ? {
                id: result.invoice.id,
                invoiceNumber: result.invoice.invoiceNumber,
                status: result.invoice.status,
                totalAmount: result.invoice.totalAmount,
              }
            : null,
          payment: result.payment
            ? {
                id: result.payment.id,
                amount: result.payment.amount,
                status: result.payment.status,
              }
            : null,
          email: { status: emailStatus, error: emailError },
        },
        isTrial
          ? `تم فتح فترة تجريبية ${data.durationDays} يوم${emailStatus === 'sent' ? ' وإرسال البيانات بالبريد' : ''}`
          : `تم فتح اشتراك ${data.durationDays} يوم بقيمة ${price} ${data.currency.toUpperCase()}${emailStatus === 'sent' ? ' وإرسال البيانات بالبريد' : ''}`,
      ),
    )
  } catch (err) {
    console.error('Grant access error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
