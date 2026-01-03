// src/lib/rules/snapshot-reader.ts
/**
 * Snapshot Reader Service
 *
 * Read-side utilities for AppliedRuleSnapshot.
 * Used by audit endpoints and compliance reports to retrieve the exact rule
 * data that was applied when lines were created.
 *
 * PERFORMANCE: Batch-first design. One query for lines + one query for snapshots.
 * No N+1 queries allowed.
 */

import { db } from "@/lib/db"

/**
 * Snapshot metadata returned in audit responses.
 * Does not include full snapshotData by default for performance.
 */
export interface SnapshotMetadata {
  id: string
  ruleTableKey: string
  version: string
  effectiveFrom: Date
  dataHash: string
}

/**
 * Full snapshot data including the rule content.
 */
export interface SnapshotWithData extends SnapshotMetadata {
  snapshotData: unknown
}

/**
 * JOPPD line with its applied rule snapshot.
 */
export interface JoppdLineWithSnapshot {
  id: string
  lineNumber: number
  payoutLineId: string
  lineData: unknown
  ruleVersionId: string | null
  appliedRuleSnapshotId: string | null
  appliedRuleSnapshot: SnapshotWithData | null
}

/**
 * Get snapshots by IDs with tenant isolation.
 *
 * @param companyId - Required for tenant isolation
 * @param snapshotIds - Array of snapshot IDs to fetch
 * @returns Map of snapshotId -> snapshot data
 */
export async function getAppliedRuleSnapshotsByIds(
  companyId: string,
  snapshotIds: string[]
): Promise<Map<string, SnapshotWithData>> {
  if (snapshotIds.length === 0) {
    return new Map()
  }

  // Single query for all snapshots with tenant filter
  const snapshots = await db.appliedRuleSnapshot.findMany({
    where: {
      id: { in: snapshotIds },
      companyId, // Tenant isolation - never trust snapshotIds alone
    },
    select: {
      id: true,
      ruleTableKey: true,
      version: true,
      effectiveFrom: true,
      dataHash: true,
      snapshotData: true,
    },
  })

  const result = new Map<string, SnapshotWithData>()
  for (const snapshot of snapshots) {
    result.set(snapshot.id, {
      id: snapshot.id,
      ruleTableKey: snapshot.ruleTableKey,
      version: snapshot.version,
      effectiveFrom: snapshot.effectiveFrom,
      dataHash: snapshot.dataHash,
      snapshotData: snapshot.snapshotData,
    })
  }

  return result
}

/**
 * Get JOPPD submission lines with their applied rule snapshots.
 *
 * Performance: Two queries total (lines + snapshots), no N+1.
 *
 * @param companyId - Required for tenant isolation
 * @param submissionId - JOPPD submission ID
 * @returns Lines with snapshot data attached, or null if submission not found
 */
export async function getSnapshotsForJoppdSubmissionLines(
  companyId: string,
  submissionId: string
): Promise<JoppdLineWithSnapshot[] | null> {
  // Query 1: Get submission with lines, verify tenant ownership
  const submission = await db.joppdSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      companyId: true,
      lines: {
        orderBy: { lineNumber: "asc" },
        select: {
          id: true,
          lineNumber: true,
          payoutLineId: true,
          lineData: true,
          ruleVersionId: true,
          appliedRuleSnapshotId: true,
        },
      },
    },
  })

  if (!submission) {
    return null
  }

  // Tenant isolation check
  if (submission.companyId !== companyId) {
    return null
  }

  // Collect snapshot IDs (filter out nulls)
  const snapshotIds = submission.lines
    .map((line) => line.appliedRuleSnapshotId)
    .filter((id): id is string => id !== null)

  // Query 2: Get all snapshots in one query
  const snapshotMap = await getAppliedRuleSnapshotsByIds(companyId, snapshotIds)

  // Attach snapshots to lines
  return submission.lines.map((line) => ({
    id: line.id,
    lineNumber: line.lineNumber,
    payoutLineId: line.payoutLineId,
    lineData: line.lineData,
    ruleVersionId: line.ruleVersionId,
    appliedRuleSnapshotId: line.appliedRuleSnapshotId,
    appliedRuleSnapshot: line.appliedRuleSnapshotId
      ? (snapshotMap.get(line.appliedRuleSnapshotId) ?? null)
      : null,
  }))
}

/**
 * Get PayoutLine snapshots for a payout.
 *
 * @param companyId - Required for tenant isolation
 * @param payoutId - Payout ID
 * @returns Lines with snapshot data, or null if payout not found
 */
export interface PayoutLineWithSnapshot {
  id: string
  lineNumber: number
  employeeName: string
  employeeOib: string
  grossAmount: string
  netAmount: string
  taxAmount: string
  ruleVersionId: string | null
  appliedRuleSnapshotId: string | null
  appliedRuleSnapshot: SnapshotWithData | null
}

export async function getSnapshotsForPayoutLines(
  companyId: string,
  payoutId: string
): Promise<PayoutLineWithSnapshot[] | null> {
  // Query 1: Get payout with lines, verify tenant ownership
  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      companyId: true,
      lines: {
        orderBy: { lineNumber: "asc" },
        select: {
          id: true,
          lineNumber: true,
          employeeName: true,
          employeeOib: true,
          grossAmount: true,
          netAmount: true,
          taxAmount: true,
          ruleVersionId: true,
          appliedRuleSnapshotId: true,
        },
      },
    },
  })

  if (!payout) {
    return null
  }

  // Tenant isolation check
  if (payout.companyId !== companyId) {
    return null
  }

  // Collect snapshot IDs
  const snapshotIds = payout.lines
    .map((line) => line.appliedRuleSnapshotId)
    .filter((id): id is string => id !== null)

  // Query 2: Get all snapshots
  const snapshotMap = await getAppliedRuleSnapshotsByIds(companyId, snapshotIds)

  // Attach snapshots to lines
  return payout.lines.map((line) => ({
    id: line.id,
    lineNumber: line.lineNumber ?? 0,
    employeeName: line.employeeName ?? "",
    employeeOib: line.employeeOib ?? "",
    grossAmount: line.grossAmount?.toString() ?? "0",
    netAmount: line.netAmount?.toString() ?? "0",
    taxAmount: line.taxAmount?.toString() ?? "0",
    ruleVersionId: line.ruleVersionId,
    appliedRuleSnapshotId: line.appliedRuleSnapshotId,
    appliedRuleSnapshot: line.appliedRuleSnapshotId
      ? (snapshotMap.get(line.appliedRuleSnapshotId) ?? null)
      : null,
  }))
}
