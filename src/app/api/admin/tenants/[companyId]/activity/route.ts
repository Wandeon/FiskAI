import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { apiError } from "@/lib/api-error"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { companyId } = await context.params

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: { companyId },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.auditLog.count({
        where: { companyId },
      }),
    ])

    // Fetch user details for logs with userId
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean) as string[])]
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        changes: log.changes,
        timestamp: log.timestamp,
        user: log.userId
          ? {
              id: log.userId,
              email: userMap.get(log.userId)?.email || "Unknown",
              name: userMap.get(log.userId)?.name || null,
            }
          : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
      total,
      hasMore: offset + logs.length < total,
    })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to fetch activity logs",
    })
  }
}
