import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import {
  createSnapshotCache,
  getOrCreateSnapshotCached,
} from "@/lib/rules/applied-rule-snapshot-service"

const Decimal = Prisma.Decimal

export async function createPayout(params: {
  id?: string
  companyId: string
  payoutDate: Date
  periodFrom: Date
  periodTo: Date
  currency?: string
  description?: string | null
  lines: Array<{
    id?: string
    lineNumber: number
    employeeName: string
    employeeOib: string
    employeeIban?: string | null
    grossAmount: Prisma.Decimal | string
    netAmount: Prisma.Decimal | string
    taxAmount: Prisma.Decimal | string
    ruleVersionId?: string | null
    joppdData?: Prisma.InputJsonValue
  }>
}) {
  const periodYear = params.periodFrom.getFullYear()
  const periodMonth = params.periodFrom.getMonth() + 1

  // Wrap in transaction to ensure atomic creation of snapshots and payout
  // This prevents orphan snapshots if payout creation fails
  return db.$transaction(async (tx) => {
    // Create snapshot cache for this transaction
    // Cache is scoped to the transaction - if tx rolls back, cached IDs are invalid
    const snapshotCache = createSnapshotCache()

    // Resolve all snapshots INSIDE the transaction for atomicity
    const lineSnapshots = await Promise.all(
      params.lines.map(async (line) => {
        if (!line.ruleVersionId) {
          return null
        }
        return getOrCreateSnapshotCached(line.ruleVersionId, params.companyId, snapshotCache, tx)
      })
    )

    return tx.payout.create({
      data: {
        ...(params.id ? { id: params.id } : {}),
        companyId: params.companyId,
        payoutDate: params.payoutDate,
        periodYear,
        periodMonth,
        periodFrom: params.periodFrom,
        periodTo: params.periodTo,
        currency: params.currency ?? "EUR",
        description: params.description ?? null,
        lines: {
          create: params.lines.map((line, index) => ({
            ...(line.id ? { id: line.id } : {}),
            companyId: params.companyId,
            lineNumber: line.lineNumber,
            employeeName: line.employeeName,
            employeeOib: line.employeeOib,
            employeeIban: line.employeeIban ?? null,
            recipientName: line.employeeName,
            recipientOib: line.employeeOib,
            grossAmount:
              line.grossAmount instanceof Decimal
                ? line.grossAmount
                : new Decimal(line.grossAmount),
            netAmount:
              line.netAmount instanceof Decimal ? line.netAmount : new Decimal(line.netAmount),
            taxAmount:
              line.taxAmount instanceof Decimal ? line.taxAmount : new Decimal(line.taxAmount),
            currency: params.currency ?? "EUR",
            joppdData: line.joppdData ?? Prisma.DbNull,
            ruleVersionId: line.ruleVersionId ?? null,
            appliedRuleSnapshotId: lineSnapshots[index] ?? null,
          })),
        },
      },
      include: { lines: true },
    })
  })
}
