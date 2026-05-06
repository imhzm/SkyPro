/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { hashPassword, generateApiKey, getActivationExpiry } from '@/lib/utils'
import {
  sendEmail,
  generateWelcomeEmail,
  generateWelcomeEmailText,
  generateAccountSuspendedEmail,
  generateAccountSuspendedEmailText
} from '@/lib/email'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { createUserSchema } from '@/lib/validations'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

const userStatusSchema = z.enum(['active', 'suspended', 'deleted'])
const userRoleSchema = z.enum(['user', 'admin'])

export const dynamic = 'force-dynamic'

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20),
  search: z.string().trim().max(120).default(''),
  status: z.union([userStatusSchema, z.literal('')]).default(''),
  role: z.union([userRoleSchema, z.literal('')]).default('')
})

const updateUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().max(120).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  maxDevices: z.coerce.number().int().min(1).max(50).optional(),
  suspensionReason: z.string().trim().max(500).optional()
})

function sanitizeUserUpdate(update: z.infer<typeof updateUserSchema>) {
  const updateData: Record<string, string | null> = {}
  if (update.name !== undefined) updateData.name = update.name || null
  if (update.role) updateData.role = update.role
  if (update.status) updateData.status = update.status
  return updateData
}

async function restoreSuspendedSubscriptions(userId: number) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: 'suspended' },
    select: { id: true, trialEndsAt: true, expiresAt: true }
  })

  const now = new Date()
  for (const subscription of subscriptions) {
    const isTrial = subscription.trialEndsAt && subscription.trialEndsAt > now
    const isActive = subscription.expiresAt && subscription.expiresAt > now
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: isTrial ? 'trial' : isActive ? 'active' : 'expired' }
    })
  }
}

function generateSecurePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + digits + symbols

  const pick = (pool: string) => pool[crypto.randomInt(0, pool.length)]
  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
    ...Array.from({ length: 8 }, () => pick(all))
  ]

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listUsersSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { page, limit, search, status, role } = parsed.data
    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } }
      ]
    }
    if (status) where.status = status
    if (role) where.role = role

    const [users, total, statusCounts] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { activationKeys: true, devices: true } },
          subscriptions: { take: 1, orderBy: { createdAt: 'desc' } },
          activationKeys: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { keyCode: true, status: true, expiresAt: true, maxDevices: true }
          }
        }
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ['status'],
        _count: { status: true }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          emailVerifiedAt: u.emailVerifiedAt,
          createdAt: u.createdAt,
          keysCount: u._count.activationKeys,
          devicesCount: u._count.devices,
          subscription: u.subscriptions[0] || null,
          latestKey: u.activationKeys[0] || null
        })),
        total,
        statusCounts: statusCounts.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {}),
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Users list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = updateUserSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const update = parsed.data
    const adminId = guard.session?.user?.id ? Number(guard.session.user.id) : null
    const targetUser = await prisma.user.findUnique({
      where: { id: update.id },
      include: {
        activationKeys: { select: { id: true, status: true } },
        subscriptions: { select: { id: true, status: true } }
      }
    })

    if (!targetUser) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    if (targetUser.id === adminId && (update.status === 'suspended' || update.status === 'deleted' || update.role === 'user')) {
      return NextResponse.json(errorResponse('لا يمكن تعطيل أو تقليل صلاحية حساب الأدمن الحالي'), { status: 400 })
    }

    const updateData = sanitizeUserUpdate(update)
    const statusChanged = update.status && update.status !== targetUser.status
    const auditDetails: Prisma.InputJsonObject = {
      targetUserId: targetUser.id,
      previousStatus: targetUser.status,
      updates: updateData,
      maxDevices: update.maxDevices ?? null,
      suspensionReason: update.suspensionReason || null
    }
    let emailSent = false
    let emailError: string | undefined

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: updateData
        })
      }

      if (update.maxDevices !== undefined) {
        await tx.activationKey.updateMany({
          where: { userId: targetUser.id },
          data: { maxDevices: update.maxDevices }
        })
      }

      if (update.status === 'suspended') {
        await tx.activationKey.updateMany({
          where: {
            userId: targetUser.id,
            status: { notIn: ['revoked', 'expired'] }
          },
          data: { status: 'suspended' }
        })
        await tx.device.updateMany({
          where: { userId: targetUser.id, isActive: true },
          data: { isActive: false }
        })
        await tx.subscription.updateMany({
          where: { userId: targetUser.id, status: { notIn: ['expired', 'cancelled'] } },
          data: { status: 'suspended' }
        })
      }

      if (update.status === 'active') {
        await tx.activationKey.updateMany({
          where: { userId: targetUser.id, status: 'suspended' },
          data: { status: 'active' }
        })
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: update.status === 'suspended' ? 'suspend_user' : update.status === 'active' ? 'activate_user' : 'update_user',
          details: auditDetails,
          ipAddress: getClientIp(req)
        }
      })
    })

    if (update.status === 'active') {
      await restoreSuspendedSubscriptions(targetUser.id)
    }

    if (statusChanged && update.status === 'suspended') {
      const result = await sendEmail({
        to: targetUser.email,
        subject: 'تم حظر حسابك في SkyPro',
        text: generateAccountSuspendedEmailText({
          name: targetUser.name,
          email: targetUser.email,
          reason: update.suspensionReason
        }),
        html: generateAccountSuspendedEmail({
          name: targetUser.name,
          email: targetUser.email,
          reason: update.suspensionReason
        })
      })
      emailSent = result.success
      emailError = result.error
    }

    return NextResponse.json({
      success: true,
      message: update.status === 'suspended'
        ? emailSent
          ? 'تم حظر المستخدم وإرسال رسالة الإيميل بنجاح'
          : 'تم حظر المستخدم، لكن فشل إرسال رسالة الإيميل'
        : 'تم تحديث المستخدم بنجاح',
      data: { emailSent, emailError }
    })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { email, name, sendEmail: shouldSendEmail } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(errorResponse('البريد الإلكتروني مسجل مسبقاً'), { status: 400 })
    }

    const password = generateSecurePassword()
    const passwordHash = hashPassword(password)
    const expiryDate = getActivationExpiry()
    const keyCode = generateApiKey()
    const adminId = guard.session?.user?.id ? Number(guard.session.user.id) : null

    const { user, activationKey } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: 'user',
          status: 'active',
          emailVerifiedAt: new Date()
        }
      })

      const activationKey = await tx.activationKey.create({
        data: {
          keyCode,
          userId: user.id,
          status: 'active',
          activatedAt: new Date(),
          expiresAt: expiryDate
        }
      })

      await tx.subscription.create({
        data: {
          userId: user.id,
          keyId: activationKey.id,
          status: 'active',
          startedAt: new Date(),
          expiresAt: expiryDate,
          amount: parseFloat(process.env.DEFAULT_KEY_PRICE || '2000'),
          currency: process.env.DEFAULT_KEY_CURRENCY || 'EGP'
        }
      })

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'create_user',
          details: { newUserId: user.id, email, keyId: activationKey.id },
          ipAddress: getClientIp(req)
        }
      })

      return { user, activationKey }
    })

    let emailSent = false
    let emailError: string | undefined
    if (shouldSendEmail) {
      const welcomeData = {
        name: name || 'عميلنا الكريم',
        email,
        password,
        serial: activationKey.keyCode,
        expiryDate: expiryDate.toLocaleDateString('ar-EG'),
        planLabel: 'اشتراك سنوي'
      }
      const emailResult = await sendEmail({
        to: email,
        subject: 'بيانات حسابك وتفعيل SkyPro',
        text: generateWelcomeEmailText(welcomeData),
        html: generateWelcomeEmail(welcomeData)
      })
      emailSent = emailResult.success
      emailError = emailResult.error
    }

    return NextResponse.json({
      success: true,
      message: shouldSendEmail
        ? (emailSent ? 'تم إنشاء المستخدم وإرسال الإيميل بنجاح' : 'تم إنشاء المستخدم لكن فشل إرسال الإيميل')
        : 'تم إنشاء المستخدم بنجاح',
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        expiryDate,
        emailSent,
        emailError
      }
    })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const id = Number(url.searchParams.get('id'))
    const adminId = guard.session?.user?.id ? Number(guard.session.user.id) : null

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرف المستخدم مطلوب'), { status: 400 })
    }

    if (id === adminId) {
      return NextResponse.json(errorResponse('لا يمكن حذف حساب الأدمن الحالي'), { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: 'deleted' }
      })
      await tx.activationKey.updateMany({
        where: { userId: id },
        data: { status: 'revoked' }
      })
      await tx.device.updateMany({
        where: { userId: id },
        data: { isActive: false }
      })
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'delete_user',
          details: { targetUserId: id },
          ipAddress: getClientIp(req)
        }
      })
    })

    return NextResponse.json({ success: true, message: 'تم حذف المستخدم وتعطيل مفاتيحه بنجاح' })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
