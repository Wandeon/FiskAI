import { db } from "./db"
import type { AuditAction } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { computeAuditChecksum } from "./audit-utils"
import { getContext } from "./context"

interface AuditLogParams {
  companyId: string
  userId?: string | null
  actor?: string | null
  action: AuditAction
  entity: string
  entityId: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  } | null
  ipAddress?: string | null
  userAgent?: string | null
  reason?: string | null
}

/**
 * Log an audit event to the database.
 * This function is intentionally fire-and-forget for performance.
 * Errors are logged but do not affect the main operation.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const timestamp = new Date()
    const actor = params.actor ?? params.userId ?? "system"
    const reason = params.reason ?? "unspecified"
    const correlationId = getContext()?.requestId
    const checksum = computeAuditChecksum({
      actor,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      reason,
      timestamp: timestamp.toISOString(),
    })

    const changes = params.changes
      ? ({
          ...(correlationId ? { correlationId } : {}),
          ...params.changes,
        } as Prisma.InputJsonValue)
      : correlationId
        ? ({ correlationId } as Prisma.InputJsonValue)
        : undefined

    await db.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId ?? null,
        actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        changes,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        reason,
        checksum,
        timestamp,
      },
    })
  } catch (error) {
    // Log error but don't throw - audit should never break main operations
    console.error("[AuditLog] Failed to log audit event:", error)
  }
}

/**
 * Helper to create a change object for UPDATE actions.
 * Filters out undefined values and common non-user fields.
 */
export function createChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const excludeFields = ["updatedAt", "createdAt", "id", "companyId"]

  const changedBefore: Record<string, unknown> = {}
  const changedAfter: Record<string, unknown> = {}

  for (const key of Object.keys(after)) {
    if (excludeFields.includes(key)) continue
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedBefore[key] = before[key]
      changedAfter[key] = after[key]
    }
  }

  return { before: changedBefore, after: changedAfter }
}

/**
 * Helper to get IP address from request headers.
 * Handles common proxy headers.
 */
export function getIpFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  )
}

/**
 * Helper to get user agent from request headers.
 */
export function getUserAgentFromHeaders(headers: Headers): string | null {
  return headers.get("user-agent")
}
