import type { AuditAction } from "@prisma/client"
import { logAudit } from "./audit"

interface ServiceAuditParams {
  companyId: string
  userId?: string | null
  actor?: string | null
  reason?: string | null
  action: AuditAction
  entity: string
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logServiceBoundarySnapshot(params: ServiceAuditParams): Promise<void> {
  await logAudit({
    companyId: params.companyId,
    userId: params.userId ?? null,
    actor: params.actor ?? params.userId ?? null,
    reason: params.reason ?? "service_action",
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    changes: {
      before: params.before ?? undefined,
      after: params.after ?? undefined,
    },
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  })
}
