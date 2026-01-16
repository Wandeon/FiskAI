// scripts/cleanup-orphaned-evidence.ts
// Cleanup orphaned evidence references
// Run with: npx tsx scripts/cleanup-orphaned-evidence.ts --dry-run
// Or:       npx tsx scripts/cleanup-orphaned-evidence.ts --execute

import { db, dbReg, runWithRegulatoryContext } from "../src/lib/db"

const DRY_RUN = process.argv.includes("--dry-run")
const EXECUTE = process.argv.includes("--execute")

if (!DRY_RUN && !EXECUTE) {
  console.log("Usage: npx tsx scripts/cleanup-orphaned-evidence.ts --dry-run")
  console.log("       npx tsx scripts/cleanup-orphaned-evidence.ts --execute")
  process.exit(1)
}

async function cleanupOrphanedEvidence() {
  console.log(`\n=== Orphaned Evidence Cleanup (${DRY_RUN ? "DRY RUN" : "EXECUTING"}) ===\n`)

  // Get all valid evidence IDs
  const allEvidence = await dbReg.evidence.findMany({ select: { id: true } })
  const validEvidenceIds = new Set(allEvidence.map((e) => e.id))
  console.log(`Valid evidence records: ${validEvidenceIds.size}`)

  // Get all source pointers
  const allPointers = await db.sourcePointer.findMany({
    select: { id: true, evidenceId: true },
  })

  const orphanedPointerIds = allPointers
    .filter((p) => !validEvidenceIds.has(p.evidenceId))
    .map((p) => p.id)

  console.log(`Total source pointers: ${allPointers.length}`)
  console.log(`Orphaned pointers to delete: ${orphanedPointerIds.length}`)

  // Get all rules and categorize
  const allRules = await db.regulatoryRule.findMany({
    select: { id: true, status: true, conceptSlug: true },
  })

  const rulesToReject: string[] = []
  const rulesToKeep: string[] = []

  for (const rule of allRules) {
    // Skip already rejected rules
    if (rule.status === "REJECTED") {
      continue
    }

    const rulePointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { evidenceId: true },
    })

    const hasValidPointer = rulePointers.some((p) => validEvidenceIds.has(p.evidenceId))

    if (hasValidPointer) {
      rulesToKeep.push(rule.id)
    } else if (rulePointers.length > 0) {
      // Has pointers but all orphaned
      rulesToReject.push(rule.id)
    } else {
      // No pointers at all - also reject
      rulesToReject.push(rule.id)
    }
  }

  console.log(`Rules to keep (have valid evidence): ${rulesToKeep.length}`)
  console.log(`Rules to reject (all evidence orphaned): ${rulesToReject.length}`)

  if (DRY_RUN) {
    console.log("\n=== DRY RUN - No changes made ===")
    console.log("\nRules that would be rejected:")
    for (const ruleId of rulesToReject.slice(0, 10)) {
      const rule = allRules.find((r) => r.id === ruleId)
      console.log(`  - ${rule?.conceptSlug} (${rule?.status})`)
    }
    if (rulesToReject.length > 10) {
      console.log(`  ... and ${rulesToReject.length - 10} more`)
    }
    return
  }

  // EXECUTE mode - make changes
  console.log("\n=== EXECUTING CLEANUP ===\n")

  // Step 1: Disconnect orphaned pointers from rules (many-to-many)
  console.log("Step 1: Disconnecting orphaned pointers from rules...")
  let disconnectedCount = 0
  for (const pointerId of orphanedPointerIds) {
    await db.sourcePointer.update({
      where: { id: pointerId },
      data: { rules: { set: [] } }, // Disconnect from all rules
    })
    disconnectedCount++
    if (disconnectedCount % 500 === 0) {
      console.log(`  Disconnected ${disconnectedCount}/${orphanedPointerIds.length}...`)
    }
  }
  console.log(`  Disconnected ${disconnectedCount} pointers from rules`)

  // Step 2: Delete orphaned pointers
  console.log("\nStep 2: Deleting orphaned pointers...")
  const deleteResult = await db.sourcePointer.deleteMany({
    where: { id: { in: orphanedPointerIds } },
  })
  console.log(`  Deleted ${deleteResult.count} orphaned pointers`)

  // Step 3: Mark rules as REJECTED using raw SQL (bypass Prisma extension)
  console.log("\nStep 3: Marking orphaned rules as REJECTED...")

  // Process one at a time to handle unique constraint violations
  let rejectedCount = 0
  let duplicateCount = 0
  let deletedCount = 0

  for (const ruleId of rulesToReject) {
    try {
      await db.$executeRaw`
        UPDATE "RegulatoryRule"
        SET
          status = 'REJECTED',
          "reviewerNotes" = COALESCE("reviewerNotes", '') ||
            E'\n[2026-01-16 orphan-cleanup] Auto-rejected: All evidence references were orphaned.',
          "updatedAt" = NOW()
        WHERE id = ${ruleId}
      `
      rejectedCount++
    } catch (e) {
      const err = e as Error
      if (err.message.includes("duplicate key") || err.message.includes("UniqueConstraint")) {
        // A REJECTED version already exists - delete this duplicate orphaned rule instead
        try {
          await db.$executeRaw`DELETE FROM "RegulatoryRule" WHERE id = ${ruleId}`
          deletedCount++
          duplicateCount++
        } catch (deleteErr) {
          console.log(
            `    Warning: Could not handle rule ${ruleId}: ${(deleteErr as Error).message}`
          )
        }
      } else {
        console.log(`    Warning: Could not reject rule ${ruleId}: ${err.message}`)
      }
    }

    if ((rejectedCount + duplicateCount) % 100 === 0) {
      console.log(`  Processed ${rejectedCount + duplicateCount}/${rulesToReject.length}...`)
    }
  }

  console.log(`  Rejected ${rejectedCount} rules`)
  console.log(`  Deleted ${deletedCount} duplicate rules (already had REJECTED version)`)

  // Step 4: Verify cleanup
  console.log("\n=== Verification ===")

  const remainingPointers = await db.sourcePointer.count()
  const remainingOrphaned = await db.sourcePointer.count({
    where: { evidenceId: { notIn: [...validEvidenceIds] } },
  })

  console.log(`Remaining source pointers: ${remainingPointers}`)
  console.log(`Remaining orphaned pointers: ${remainingOrphaned}`)

  const rulesByStatus = await db.regulatoryRule.groupBy({
    by: ["status"],
    _count: { id: true },
  })

  console.log("\nRules by status after cleanup:")
  for (const group of rulesByStatus) {
    console.log(`  ${group.status}: ${group._count.id}`)
  }

  console.log("\n=== Cleanup Complete ===")
  await db.$disconnect()
}

cleanupOrphanedEvidence().catch(console.error)
