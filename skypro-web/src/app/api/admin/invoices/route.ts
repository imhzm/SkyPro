import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const invoiceStatusSchema = z.enum(['draft', 'issued', 'paid', 'overdue', 'cancelled'])

const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20),
  status: invoiceStatusSchema.optional()
})

const createInvoiceSchema = z.object({
  userId: z.coerce.number().int().positive(),
  subscriptionId: z.coerce.number().int().positive().optional(),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  currency: z.string().min(3).max(10).default('EGP'),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional()
})

const updateInvoiceSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: invoiceStatusSchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
})

function generateInvoiceNumber() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = crypto.randomInt(100000, 1000000)
  return `INV-${yyyy}${mm}${dd}-${rand}`
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listInvoicesSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit, status } = parsed.data
    const where = status ? { status } : {}

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, status: true } },
          payments: { select: { id: true, amount: true, status: true, createdAt: true } }
        }
      }),
      prisma.invoice.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Invoices list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = createInvoiceSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const payload = parsed.data
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
    if (!user) return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })

    if (payload.subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: payload.subscriptionId },
        select: { id: true, userId: true }
      })
      if (!subscription) return NextResponse.json(errorResponse('الاشتراك غير موجود'), { status: 404 })
      if (subscription.userId !== payload.userId) {
        return NextResponse.json(errorResponse('الاشتراك لا يخص المستخدم المحدد'), { status: 400 })
      }
    }

    const totalAmount = Math.max(0, payload.subtotal + payload.taxAmount - payload.discountAmount)

    const invoice = await prisma.invoice.create({
      data: {
        userId: payload.userId,
        subscriptionId: payload.subscriptionId || null,
        invoiceNumber: generateInvoiceNumber(),
        status: 'issued',
        subtotal: payload.subtotal,
        taxAmount: payload.taxAmount,
        discountAmount: payload.discountAmount,
        totalAmount,
        currency: payload.currency.toUpperCase(),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        notes: payload.notes || null
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: guard.session?.user?.id ? Number(guard.session.user.id) : null,
        action: 'create_invoice',
        details: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (err) {
    console.error('Create invoice error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = updateInvoiceSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { id, status, dueDate, paidAt, notes } = parsed.data
    const exists = await prisma.invoice.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return NextResponse.json(errorResponse('الفاتورة غير موجودة'), { status: 404 })

    const updateData: {
      status?: string
      dueDate?: Date | null
      paidAt?: Date | null
      notes?: string | null
    } = {}

    if (status) updateData.status = status
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(errorResponse('لا توجد بيانات لتحديثها'), { status: 400 })
    }

    const invoice = await prisma.invoice.update({ where: { id }, data: updateData })

    await prisma.auditLog.create({
      data: {
        userId: guard.session?.user?.id ? Number(guard.session.user.id) : null,
        action: 'update_invoice',
        details: { invoiceId: id, updates: updateData },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, data: invoice })
  } catch (err) {
    console.error('Update invoice error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
