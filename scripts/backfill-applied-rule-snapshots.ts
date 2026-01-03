#!/usr/bin/env npx tsx
// scripts/backfill-applied-rule-snapshots.ts
/**
 * Backfill AppliedRuleSnapshot for existing PayoutLine and JoppdSubmissionLine records.
 *
 * This script:
 * 1. Finds all lines with ruleVersionId but no appliedRuleSnapshotId
 * 2. Creates snapshots via the snapshot service (with dedupe)
 * 3. Updates lines to reference the snapshots
 *
 * ATOMICITY: Each batch of lines per company is processed atomically.
 * If snapshot creation or line update fails, the entire batch rolls back.
 * This prevents orphan snapshots.
 *
 * Usage:
 *   npx tsx scripts/backfill-applied-rule-snapshots.ts [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run     Preview changes without writing to database
 *   --batch-size  Number of records to process per batch (default: 100)
 *
 * Idempotent: Safe to run multiple times. Already-backfilled records are skipped.
 */

import { db } from "../src/lib/db"
import { prisma } from "../src/lib/prisma"
import {
  createSnapshotCache,
  getOrCreateSnapshotCached,
} from "../src/lib/rules/applied-rule-snapshot-service"

interface BackfillStats {
  payoutLinesScanned: number
  payoutLinesUpdated: number
  joppdLinesScanned: number
  joppdLinesUpdated: number
  snapshotsCreated: number
  snapshotsReused: number
  errors: number
}

const stats: BackfillStats = {
  payoutLinesScanned: 0,
  payoutLinesUpdated: 0,
  joppdLinesScanned: 0,
  joppdLinesUpdated: 0,
  snapshotsCreated: 0,
  snapshotsReused: 0,
  errors: 0,
}

function parseArgs(): { dryRun: boolean; batchSize: number } {
  const args = process.argv.slice(2)
  let dryRun = false
  let batchSize = 100

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true
    } else if (arg.startsWith("--batch-size=")) {
      batchSize = parseInt(arg.split("=")[1], 10)
      if (isNaN(batchSize) || batchSize < 1) {
        console.error("Invalid batch size")
        process.exit(1)
      }
    }
  }

  return { dryRun, batchSize }
}

async function backfillPayoutLines(dryRun: boolean, batchSize: number): Promise<void> {
  console.log("\n=== Backfilling PayoutLine records ===")

  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const lines = await db.payoutLine.findMany({
      where: {
        ruleVersionId: { not: null },
        appliedRuleSnapshotId: null,
      },
      select: {
        id: true,
        companyId: true,
        ruleVersionId: true,
      },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    })

    if (lines.length === 0) {
      hasMore = false
      break
    }

    stats.payoutLinesScanned += lines.length
    cursor = lines[lines.length - 1].id

    // Group by company for efficient snapshot caching
    const byCompany = new Map<string, typeof lines>()
    for (const line of lines) {
      const existing = byCompany.get(line.companyId) ?? []
      existing.push(line)
      byCompany.set(line.companyId, existing)
    }

    // Process each company's batch atomically
    for (const [companyId, companyLines] of byCompany) {
      try {
        // Atomic transaction: snapshot creation + line updates
        const result = await db.$transaction(async (tx) => {
          const snapshotCache = createSnapshotCache()
          let batchUpdated = 0
          let batchCreated = 0
          let batchReused = 0

          for (const line of companyLines) {
            if (!line.ruleVersionId) continue

            const initialCacheSize = snapshotCache.size
            const snapshotId = await getOrCreateSnapshotCached(
              line.ruleVersionId,
              companyId,
              snapshotCache,
              tx
            )

            if (!snapshotId) {
              console.warn(
                `  Warning: RuleVersion ${line.ruleVersionId} not found for PayoutLine ${line.id}`
              )
              continue
            }

            // Track whether this was a new snapshot or reused
            if (snapshotCache.size > initialCacheSize) {
              batchCreated++
            } else {
              batchReused++
            }

            if (!dryRun) {
              await tx.payoutLine.update({
                where: { id: line.id },
                data: { appliedRuleSnapshotId: snapshotId },
              })
            }

            batchUpdated++
          }

          return { updated: batchUpdated, created: batchCreated, reused: batchReused }
        })

        stats.payoutLinesUpdated += result.updated
        stats.snapshotsCreated += result.created
        stats.snapshotsReused += result.reused
      } catch (error) {
        // Transaction rolled back - count all lines in batch as errors
        console.error(`  Error processing PayoutLine batch for company ${companyId}:`, error)
        stats.errors += companyLines.length
      }
    }

    console.log(`  Processed ${stats.payoutLinesScanned} PayoutLine records...`)

    if (lines.length < batchSize) {
      hasMore = false
    }
  }

  console.log(`  PayoutLine backfill complete: ${stats.payoutLinesUpdated} updated`)
}

async function backfillJoppdSubmissionLines(dryRun: boolean, batchSize: number): Promise<void> {
  console.log("\n=== Backfilling JoppdSubmissionLine records ===")

  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const lines = await db.joppdSubmissionLine.findMany({
      where: {
        ruleVersionId: { not: null },
        appliedRuleSnapshotId: null,
      },
      select: {
        id: true,
        ruleVersionId: true,
        submission: {
          select: {
            companyId: true,
          },
        },
      },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    })

    if (lines.length === 0) {
      hasMore = false
      break
    }

    stats.joppdLinesScanned += lines.length
    cursor = lines[lines.length - 1].id

    // Group by company for efficient snapshot caching
    const byCompany = new Map<string, typeof lines>()
    for (const line of lines) {
      const companyId = line.submission.companyId
      const existing = byCompany.get(companyId) ?? []
      existing.push(line)
      byCompany.set(companyId, existing)
    }

    // Process each company's batch atomically
    for (const [companyId, companyLines] of byCompany) {
      try {
        // Atomic transaction: snapshot creation + line updates
        const result = await db.$transaction(async (tx) => {
          const snapshotCache = createSnapshotCache()
          let batchUpdated = 0
          let batchCreated = 0
          let batchReused = 0

          for (const line of companyLines) {
            if (!line.ruleVersionId) continue

            const initialCacheSize = snapshotCache.size
            const snapshotId = await getOrCreateSnapshotCached(
              line.ruleVersionId,
              companyId,
              snapshotCache,
              tx
            )

            if (!snapshotId) {
              console.warn(
                `  Warning: RuleVersion ${line.ruleVersionId} not found for JoppdSubmissionLine ${line.id}`
              )
              continue
            }

            // Track whether this was a new snapshot or reused
            if (snapshotCache.size > initialCacheSize) {
              batchCreated++
            } else {
              batchReused++
            }

            if (!dryRun) {
              await tx.joppdSubmissionLine.update({
                where: { id: line.id },
                data: { appliedRuleSnapshotId: snapshotId },
              })
            }

            batchUpdated++
          }

          return { updated: batchUpdated, created: batchCreated, reused: batchReused }
        })

        stats.joppdLinesUpdated += result.updated
        stats.snapshotsCreated += result.created
        stats.snapshotsReused += result.reused
      } catch (error) {
        // Transaction rolled back - count all lines in batch as errors
        console.error(
          `  Error processing JoppdSubmissionLine batch for company ${companyId}:`,
          error
        )
        stats.errors += companyLines.length
      }
    }

    console.log(`  Processed ${stats.joppdLinesScanned} JoppdSubmissionLine records...`)

    if (lines.length < batchSize) {
      hasMore = false
    }
  }

  console.log(`  JoppdSubmissionLine backfill complete: ${stats.joppdLinesUpdated} updated`)
}

async function main() {
  const { dryRun, batchSize } = parseArgs()

  console.log("=========================================")
  console.log("AppliedRuleSnapshot Backfill Script")
  console.log("=========================================")
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`)
  console.log(`Batch size: ${batchSize}`)
  console.log("")

  const startTime = Date.now()

  try {
    await backfillPayoutLines(dryRun, batchSize)
    await backfillJoppdSubmissionLines(dryRun, batchSize)
  } finally {
    await prisma.$disconnect()
    await db.$disconnect()
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log("\n=========================================")
  console.log("Backfill Summary")
  console.log("=========================================")
  console.log(`Duration: ${duration}s`)
  console.log("")
  console.log("PayoutLine:")
  console.log(`  Scanned: ${stats.payoutLinesScanned}`)
  console.log(`  Updated: ${stats.payoutLinesUpdated}`)
  console.log("")
  console.log("JoppdSubmissionLine:")
  console.log(`  Scanned: ${stats.joppdLinesScanned}`)
  console.log(`  Updated: ${stats.joppdLinesUpdated}`)
  console.log("")
  console.log("Snapshots:")
  console.log(`  Created: ${stats.snapshotsCreated}`)
  console.log(`  Reused: ${stats.snapshotsReused}`)
  console.log("")
  console.log(`Errors: ${stats.errors}`)
  console.log("")

  if (dryRun) {
    console.log("DRY RUN - No changes were made. Run without --dry-run to apply changes.")
  } else {
    console.log("Backfill complete!")
  }

  if (stats.errors > 0) {
    process.exit(1)
  }
}

void main()
