import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded'])

const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20),
  status: paymentStatusSchema.optional()
})

const createPaymentSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  subscriptionId: z.coerce.number().int().positive().optional(),
  invoiceId: z.coerce.number().int().positive().optional(),
  provider: z.string().max(100).optional(),
  providerRef: z.string().max(255).optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(10).default('EGP'),
  method: z.string().max(50).optional(),
  status: paymentStatusSchema.default('paid'),
  paidAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
})

const updatePaymentSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: paymentStatusSchema.optional(),
  providerRef: z.string().max(255).nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional()
})

function inputJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return value as Prisma.InputJsonValue
}

function nullableInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listPaymentsSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit, status } = parsed.data
    const where = status ? { status } : {}

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, status: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } }
        }
      }),
      prisma.payment.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        payments,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Payments list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = createPaymentSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const payload = parsed.data
    if (payload.userId) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
      if (!user) return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    if (payload.subscriptionId) {
      const subscription = await prisma.subscription.findUnique({ where: { id: payload.subscriptionId }, select: { id: true } })
      if (!subscription) return NextResponse.json(errorResponse('الاشتراك غير موجود'), { status: 404 })
    }

    if (payload.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: payload.invoiceId }, select: { id: true } })
      if (!invoice) return NextResponse.json(errorResponse('الفاتورة غير موجودة'), { status: 404 })
    }

    const payment = await prisma.payment.create({
      data: {
        userId: payload.userId || null,
        subscriptionId: payload.subscriptionId || null,
        invoiceId: payload.invoiceId || null,
        provider: payload.provider || null,
        providerRef: payload.providerRef || null,
        amount: payload.amount,
        currency: payload.currency.toUpperCase(),
        method: payload.method || null,
        status: payload.status,
        paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
        metadata: inputJson(payload.metadata)
      }
    })

    if (payment.invoiceId && payment.status === 'paid') {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'paid', paidAt: payment.paidAt || new Date() }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: guard.session?.user?.id ? Number(guard.session.user.id) : null,
        action: 'create_payment',
        details: { paymentId: payment.id, amount: payment.amount, status: payment.status },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (err) {
    console.error('Create payment error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = updatePaymentSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { id, status, providerRef, paidAt, metadata } = parsed.data
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, invoiceId: true }
    })
    if (!existing) return NextResponse.json(errorResponse('العملية غير موجودة'), { status: 404 })

    const updateData: {
      status?: string
      providerRef?: string | null
      paidAt?: Date | null
      metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    } = {}
    if (status) updateData.status = status
    if (providerRef !== undefined) updateData.providerRef = providerRef
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (metadata !== undefined) updateData.metadata = nullableInputJson(metadata)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(errorResponse('لا توجد بيانات لتحديثها'), { status: 400 })
    }

    const payment = await prisma.payment.update({ where: { id }, data: updateData })

    if (existing.invoiceId && status === 'paid') {
      await prisma.invoice.update({
        where: { id: existing.invoiceId },
        data: { status: 'paid', paidAt: payment.paidAt || new Date() }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: guard.session?.user?.id ? Number(guard.session.user.id) : null,
        action: 'update_payment',
        details: {
          paymentId: id,
          updates: {
            status: status ?? null,
            providerRef: providerRef ?? null,
            paidAt: paidAt ?? null
          }
        },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (err) {
    console.error('Update payment error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
