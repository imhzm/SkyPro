import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const offerSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().url().max(1024).optional().nullable().or(z.literal('')),
  externalUrl: z.string().trim().url().max(1024),
  badge: z.string().trim().max(40).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
})

const offerListSchema = z.object({
  offers: z.array(offerSchema).max(50),
})

const deleteSchema = z.object({
  id: z.number().int().positive(),
})

function normalize(input: z.infer<typeof offerSchema>) {
  return {
    title: input.title || null,
    description: input.description || null,
    imageUrl: input.imageUrl ? String(input.imageUrl) : null,
    externalUrl: input.externalUrl,
    badge: input.badge || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }
}

/* ============================================================
   GET — list all offers (admin)
   ============================================================ */
export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const offers = await prisma.offer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(successResponse(offers))
  } catch (err) {
    console.error('Admin list offers error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

/* ============================================================
   POST — create a single offer OR bulk-replace via { offers: [...] }
   ============================================================ */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const tooLarge = rejectLargeJson(req, 64 * 1024)
    if (tooLarge) return tooLarge

    const body = await req.json()

    // Bulk replace path
    const bulk = offerListSchema.safeParse(body)
    if (bulk.success) {
      const upsertOps = bulk.data.offers.map((o) =>
        o.id
          ? prisma.offer.update({ where: { id: o.id }, data: normalize(o) })
          : prisma.offer.create({ data: normalize(o) }),
      )
      await prisma.$transaction(upsertOps)
      await prisma.auditLog.create({
        data: {
          userId: Number(guard.session?.user.id),
          action: 'bulk_save_offers',
          details: { count: bulk.data.offers.length },
          ipAddress: getClientIp(req),
        },
      })
      const offers = await prisma.offer.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      })
      return NextResponse.json(successResponse(offers, 'تم حفظ العروض بنجاح'))
    }

    // Single-offer path (create or update)
    const single = offerSchema.safeParse(body)
    if (!single.success) {
      return NextResponse.json(errorResponse('بيانات العرض غير صالحة'), { status: 400 })
    }

    const data = normalize(single.data)
    const saved = single.data.id
      ? await prisma.offer.update({ where: { id: single.data.id }, data })
      : await prisma.offer.create({ data })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: single.data.id ? 'update_offer' : 'create_offer',
        details: { offerId: saved.id, title: saved.title || '' },
        ipAddress: getClientIp(req),
      },
    })

    return NextResponse.json(successResponse(saved, 'تم الحفظ بنجاح'))
  } catch (err) {
    console.error('Save offer error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

/* ============================================================
   DELETE — remove a single offer (body: { id })
   ============================================================ */
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const tooLarge = rejectLargeJson(req, 1024)
    if (tooLarge) return tooLarge

    const parsed = deleteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(errorResponse('معرّف العرض مطلوب'), { status: 400 })
    }

    await prisma.offer.delete({ where: { id: parsed.data.id } })
    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'delete_offer',
        details: { offerId: parsed.data.id },
        ipAddress: getClientIp(req),
      },
    })

    return NextResponse.json(successResponse({ id: parsed.data.id }, 'تم حذف العرض'))
  } catch (err) {
    console.error('Delete offer error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
