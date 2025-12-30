import type { AuditLog, Prisma, AuditAction } from "@prisma/client"
import { db } from "@/lib/db"

export interface AuditQueryFilters {
  companyId: string
  entity?: string
  entityId?: string
  userId?: string
  actor?: string
  action?: string
  from?: Date
  to?: Date
  limit?: number
}

export async function queryAuditLogs(filters: AuditQueryFilters): Promise<AuditLog[]> {
  const where: Prisma.AuditLogWhereInput = {
    companyId: filters.companyId,
    entity: filters.entity ?? undefined,
    entityId: filters.entityId ?? undefined,
    userId: filters.userId ?? undefined,
    actor: filters.actor ?? undefined,
    action: (filters.action as AuditAction | undefined) ?? undefined,
    timestamp: {
      gte: filters.from ?? undefined,
      lte: filters.to ?? undefined,
    },
  }

  return db.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: filters.limit ?? 50,
  })
}
