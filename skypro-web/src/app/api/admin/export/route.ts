import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rowsToCsv, csvResponse } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  type: z.enum(['users', 'subscriptions', 'devices', 'keys', 'audit-log', 'newsletter']),
  status: z.string().max(40).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(20000).default(5000),
})

const TYPE_LABELS: Record<string, string> = {
  users: 'المستخدمين',
  subscriptions: 'الاشتراكات',
  devices: 'الأجهزة',
  keys: 'المفاتيح',
  'audit-log': 'سجل-التدقيق',
  newsletter: 'مشتركي-النشرة',
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات الاستعلام غير صحيحة'), { status: 400 })
    }

    const { type, status, search, limit } = parsed.data
    const adminId = Number(guard.session?.user.id)
    const dateStamp = new Date().toISOString().slice(0, 10)
    const filename = `skypro-${TYPE_LABELS[type]}-${dateStamp}.csv`

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin_export',
        details: { type, status: status || null, search: search || null, limit },
        ipAddress: getClientIp(req),
      },
    }).catch(() => {})

    if (type === 'users') {
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (search) {
        where.OR = [{ email: { contains: search } }, { name: { contains: search } }]
      }
      const rows = await prisma.user.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true, status: true,
          emailVerifiedAt: true, twoFactorEnabled: true,
          lastLoginAt: true, lastLoginIp: true, createdAt: true,
        },
      })
      const csv = rowsToCsv(rows.map((u) => ({
        ID: u.id, Email: u.email, Name: u.name ?? '', Role: u.role, Status: u.status,
        'Email Verified': u.emailVerifiedAt ? 'yes' : 'no',
        '2FA Enabled': u.twoFactorEnabled ? 'yes' : 'no',
        'Last Login': u.lastLoginAt?.toISOString() ?? '',
        'Last IP': u.lastLoginIp ?? '',
        'Created At': u.createdAt.toISOString(),
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'Email', label: 'Email' },
        { key: 'Name', label: 'Name' },
        { key: 'Role', label: 'Role' },
        { key: 'Status', label: 'Status' },
        { key: 'Email Verified', label: 'Email Verified' },
        { key: '2FA Enabled', label: '2FA Enabled' },
        { key: 'Last Login', label: 'Last Login' },
        { key: 'Last IP', label: 'Last IP' },
        { key: 'Created At', label: 'Created At' },
      ])
      return csvResponse(filename, csv)
    }

    if (type === 'subscriptions') {
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      const rows = await prisma.subscription.findMany({
        where, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } }, key: { select: { keyCode: true } } },
      })
      const csv = rowsToCsv(rows.map((s) => ({
        ID: s.id,
        UserEmail: s.user?.email ?? '', UserName: s.user?.name ?? '',
        Status: s.status, KeyCode: s.key?.keyCode ?? '',
        TrialEndsAt: s.trialEndsAt?.toISOString() ?? '',
        StartedAt: s.startedAt?.toISOString() ?? '',
        ExpiresAt: s.expiresAt?.toISOString() ?? '',
        Amount: s.amount ?? '', Currency: s.currency,
        AutoRenew: s.autoRenew ? 'yes' : 'no',
        CreatedAt: s.createdAt.toISOString(),
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'UserEmail', label: 'User Email' },
        { key: 'UserName', label: 'User Name' },
        { key: 'Status', label: 'Status' },
        { key: 'KeyCode', label: 'Key Code' },
        { key: 'TrialEndsAt', label: 'Trial Ends At' },
        { key: 'StartedAt', label: 'Started At' },
        { key: 'ExpiresAt', label: 'Expires At' },
        { key: 'Amount', label: 'Amount' },
        { key: 'Currency', label: 'Currency' },
        { key: 'AutoRenew', label: 'Auto Renew' },
        { key: 'CreatedAt', label: 'Created At' },
      ])
      return csvResponse(filename, csv)
    }

    if (type === 'devices') {
      const rows = await prisma.device.findMany({
        take: limit, orderBy: { lastSeenAt: 'desc' },
        include: { user: { select: { email: true, name: true } }, key: { select: { keyCode: true } } },
      })
      const csv = rowsToCsv(rows.map((d) => ({
        ID: d.id,
        UserEmail: d.user?.email ?? '',
        KeyCode: d.key?.keyCode ?? '',
        Fingerprint: d.deviceFingerprint,
        DeviceName: d.deviceName ?? '',
        OS: d.osInfo ?? '', CPU: d.cpuInfo ?? '',
        IsActive: d.isActive ? 'yes' : 'no',
        ResetCount: d.resetCount, MaxResets: d.maxResetsPerYear,
        FirstSeen: d.firstSeenAt.toISOString(),
        LastSeen: d.lastSeenAt.toISOString(),
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'UserEmail', label: 'User Email' },
        { key: 'KeyCode', label: 'Key Code' },
        { key: 'Fingerprint', label: 'Fingerprint' },
        { key: 'DeviceName', label: 'Device Name' },
        { key: 'OS', label: 'OS' },
        { key: 'CPU', label: 'CPU' },
        { key: 'IsActive', label: 'Is Active' },
        { key: 'ResetCount', label: 'Reset Count' },
        { key: 'MaxResets', label: 'Max Resets/Year' },
        { key: 'FirstSeen', label: 'First Seen' },
        { key: 'LastSeen', label: 'Last Seen' },
      ])
      return csvResponse(filename, csv)
    }

    if (type === 'keys') {
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      const rows = await prisma.activationKey.findMany({
        where, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } }, _count: { select: { devices: true } } },
      })
      const csv = rowsToCsv(rows.map((k) => ({
        ID: k.id, KeyCode: k.keyCode, Status: k.status,
        UserEmail: k.user?.email ?? '', UserName: k.user?.name ?? '',
        Plan: k.plan, DurationDays: k.durationDays, MaxDevices: k.maxDevices,
        DeviceCount: k._count.devices,
        ActivatedAt: k.activatedAt?.toISOString() ?? '',
        ExpiresAt: k.expiresAt?.toISOString() ?? '',
        CreatedAt: k.createdAt.toISOString(),
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'KeyCode', label: 'Key Code' },
        { key: 'Status', label: 'Status' },
        { key: 'UserEmail', label: 'User Email' },
        { key: 'UserName', label: 'User Name' },
        { key: 'Plan', label: 'Plan' },
        { key: 'DurationDays', label: 'Duration (days)' },
        { key: 'MaxDevices', label: 'Max Devices' },
        { key: 'DeviceCount', label: 'Device Count' },
        { key: 'ActivatedAt', label: 'Activated At' },
        { key: 'ExpiresAt', label: 'Expires At' },
        { key: 'CreatedAt', label: 'Created At' },
      ])
      return csvResponse(filename, csv)
    }

    if (type === 'audit-log') {
      const rows = await prisma.auditLog.findMany({
        take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      })
      const csv = rowsToCsv(rows.map((a) => ({
        ID: a.id, UserEmail: a.user?.email ?? '',
        Action: a.action, IPAddress: a.ipAddress ?? '',
        Details: typeof a.details === 'object' ? JSON.stringify(a.details) : (a.details ?? ''),
        CreatedAt: a.createdAt.toISOString(),
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'UserEmail', label: 'User Email' },
        { key: 'Action', label: 'Action' },
        { key: 'IPAddress', label: 'IP Address' },
        { key: 'Details', label: 'Details' },
        { key: 'CreatedAt', label: 'Created At' },
      ])
      return csvResponse(filename, csv)
    }

    if (type === 'newsletter') {
      const rows = await prisma.newsletterSubscriber.findMany({
        take: limit, orderBy: { createdAt: 'desc' },
      })
      const csv = rowsToCsv(rows.map((n) => ({
        ID: n.id, Email: n.email, Source: n.source ?? '',
        Status: n.status, IPAddress: n.ipAddress ?? '',
        CreatedAt: n.createdAt.toISOString(),
        UnsubscribedAt: n.unsubscribedAt?.toISOString() ?? '',
      })), [
        { key: 'ID', label: 'ID' },
        { key: 'Email', label: 'Email' },
        { key: 'Source', label: 'Source' },
        { key: 'Status', label: 'Status' },
        { key: 'IPAddress', label: 'IP Address' },
        { key: 'CreatedAt', label: 'Subscribed At' },
        { key: 'UnsubscribedAt', label: 'Unsubscribed At' },
      ])
      return csvResponse(filename, csv)
    }

    return NextResponse.json(errorResponse('نوع تصدير غير معروف'), { status: 400 })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
