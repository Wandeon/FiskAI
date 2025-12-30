import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { queryAuditLogs } from "@/lib/audit-query/service"

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const { searchParams } = new URL(req.url)

  const logs = await queryAuditLogs({
    companyId: company.id,
    entity: searchParams.get("entity") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    actor: searchParams.get("actor") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  })

  return NextResponse.json({ auditLog: logs })
}
