import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { sanitizeIpAddress, sanitizeUserAgent } from "@/lib/security/sanitize"
import { sanitizeCsvValue } from "@/lib/csv-sanitize"
import { logAudit, getIpFromHeaders, getUserAgentFromHeaders } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { companyId } = await params

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || 200)
  const limit = Math.min(Math.max(limitParam, 10), 1000)

  const logs = await db.auditLog.findMany({
    where: { companyId },
    orderBy: { timestamp: "desc" },
    take: limit,
  })

  // Sanitize PII data before export
  const rows = [
    ["timestamp", "action", "entity", "entityId", "userId", "ipAddress", "userAgent"].join(","),
    ...logs.map((log) =>
      [
        sanitizeCsvValue(log.timestamp.toISOString()),
        sanitizeCsvValue(log.action),
        sanitizeCsvValue(log.entity),
        sanitizeCsvValue(log.entityId),
        sanitizeCsvValue(log.userId ?? ""),
        sanitizeCsvValue(sanitizeIpAddress(log.ipAddress)),
        sanitizeCsvValue(sanitizeUserAgent(log.userAgent)),
      ].join(",")
    ),
  ].join("\n")

  // Log the audit export action
  await logAudit({
    companyId,
    userId: user.id,
    action: "EXPORT",
    entity: "AuditLog",
    entityId: companyId,
    changes: {
      after: {
        exportedRecords: logs.length,
        limit,
      },
    },
    ipAddress: getIpFromHeaders(request.headers),
    userAgent: getUserAgentFromHeaders(request.headers),
  })

  return new NextResponse(rows, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${companyId}.csv"`,
    },
  })
}
