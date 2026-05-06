/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { requireAdmin } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'

const listAuditLogSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(200).default(50),
  action: z.string().trim().max(80).default(''),
  userId: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().positive().optional())
})

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listAuditLogSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit, action, userId } = parsed.data
    const where: any = {}
    if (action) where.action = action
    if (userId) where.userId = userId

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Audit log error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
