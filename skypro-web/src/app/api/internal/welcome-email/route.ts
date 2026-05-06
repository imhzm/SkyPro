import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { generateWelcomeEmail, generateWelcomeEmailText, sendEmail, type WelcomeEmailData } from '@/lib/email'
import { checkRateLimit, getClientIp, rateLimitedResponse, rejectLargeJson } from '@/lib/request-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface WelcomeEmailRequest {
  subject?: string
  welcomeData?: WelcomeEmailData
}

const welcomeEmailSchema = z.object({
  subject: z.string().trim().min(1).max(160).optional(),
  welcomeData: z.object({
    name: z.string().trim().max(120).nullable().optional(),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().max(256).nullable().optional(),
    serial: z.string().trim().min(1).max(80),
    expiryDate: z.string().trim().min(1).max(80),
    planLabel: z.string().trim().max(120).optional(),
    loginMethod: z.string().trim().max(80).optional()
  }).strict()
}).strict()

function authorized(authorization: string | null) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || !authorization) return false

  const expected = `Bearer ${secret}`
  if (authorization.length !== expected.length) return false

  return crypto.timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const ipLimit = checkRateLimit(`welcome-email:ip:${ip}`, 120, 15 * 60 * 1000)
  if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

  if (!authorized(req.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
  }

  const largePayload = rejectLargeJson(req, 32 * 1024)
  if (largePayload) return largePayload

  const parsed = welcomeEmailSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Missing welcome email data' }, { status: 400 })
  }

  const body = parsed.data as WelcomeEmailRequest
  const welcomeData = body.welcomeData!

  const result = await sendEmail({
    to: welcomeData.email,
    subject: body.subject || 'بيانات حسابك في SkyPro',
    text: generateWelcomeEmailText(welcomeData),
    html: generateWelcomeEmail(welcomeData)
  })

  return NextResponse.json(result, { status: result.success ? 200 : 502 })
}
