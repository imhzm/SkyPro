import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { requireAdmin } from '@/lib/admin-security'
import { verifyAuditChain } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-log/verify
 *
 * Walks the audit log and verifies each entry's hash chain integrity.
 * If any entry was modified or removed, this endpoint detects exactly where.
 */
export async function GET(_req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const result = await verifyAuditChain(5000)
    return NextResponse.json(successResponse(result, result.ok ? 'سجل التدقيق سليم' : '⚠️ تم اكتشاف تلاعب!'))
  } catch (err) {
    console.error('Audit verify error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
