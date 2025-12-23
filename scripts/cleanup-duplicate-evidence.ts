/**
 * Cleanup duplicate Evidence records before adding unique constraint.
 *
 * Strategy:
 * 1. Find duplicates by (url, contentHash)
 * 2. Keep the NEWEST record (latest fetchedAt)
 * 3. Migrate all SourcePointers and AgentRuns to the newest record
 * 4. Delete the older duplicate records
 */

import { db } from "../src/lib/db"

interface DuplicateGroup {
  url: string
  contentHash: string
  count: number
}

interface EvidenceRecord {
  id: string
  fetchedAt: Date
  sourcePointerCount: number
  agentRunCount: number
}

async function cleanupDuplicateEvidence() {
  console.log("Starting Evidence deduplication cleanup...")

  // Find all duplicate groups
  const duplicates = await db.$queryRaw<DuplicateGroup[]>`
    SELECT url, "contentHash", COUNT(*) as count
    FROM "Evidence"
    GROUP BY url, "contentHash"
    HAVING COUNT(*) > 1
  `

  console.log(`Found ${duplicates.length} duplicate groups`)

  if (duplicates.length === 0) {
    console.log("No duplicates found. Nothing to clean up.")
    return
  }

  for (const dup of duplicates) {
    console.log(`\n--- Processing duplicate: ${dup.url.slice(0, 60)}...`)
    console.log(`    Content hash: ${dup.contentHash}`)
    console.log(`    Duplicate count: ${dup.count}`)

    // Get all records for this (url, contentHash) combination
    const records = await db.evidence.findMany({
      where: {
        url: dup.url,
        contentHash: dup.contentHash,
      },
      include: {
        sourcePointers: true,
        agentRuns: true,
      },
      orderBy: {
        fetchedAt: "desc", // Newest first
      },
    })

    if (records.length < 2) {
      console.log(`    Skipping - only ${records.length} record(s) found`)
      continue
    }

    // Keep the newest record (first in sorted list)
    const keepRecord = records[0]
    const deleteRecords = records.slice(1)

    console.log(`    Keeping: ${keepRecord.id} (fetchedAt: ${keepRecord.fetchedAt.toISOString()})`)
    console.log(
      `             ${keepRecord.sourcePointers.length} pointers, ${keepRecord.agentRuns.length} runs`
    )

    // Migrate all relationships from older records to the newest record
    for (const oldRecord of deleteRecords) {
      console.log(
        `    Migrating from: ${oldRecord.id} (fetchedAt: ${oldRecord.fetchedAt.toISOString()})`
      )
      console.log(
        `                    ${oldRecord.sourcePointers.length} pointers, ${oldRecord.agentRuns.length} runs`
      )

      // Migrate SourcePointers
      if (oldRecord.sourcePointers.length > 0) {
        await db.sourcePointer.updateMany({
          where: { evidenceId: oldRecord.id },
          data: { evidenceId: keepRecord.id },
        })
        console.log(`        ✓ Migrated ${oldRecord.sourcePointers.length} SourcePointers`)
      }

      // Migrate AgentRuns
      if (oldRecord.agentRuns.length > 0) {
        await db.agentRun.updateMany({
          where: { evidenceId: oldRecord.id },
          data: { evidenceId: keepRecord.id },
        })
        console.log(`        ✓ Migrated ${oldRecord.agentRuns.length} AgentRuns`)
      }

      // Delete the old record
      await db.evidence.delete({
        where: { id: oldRecord.id },
      })
      console.log(`        ✓ Deleted old Evidence record ${oldRecord.id}`)
    }

    console.log(`    ✓ Completed merge for this duplicate group`)
  }

  // Verify no duplicates remain
  const remainingDuplicates = await db.$queryRaw<DuplicateGroup[]>`
    SELECT url, "contentHash", COUNT(*) as count
    FROM "Evidence"
    GROUP BY url, "contentHash"
    HAVING COUNT(*) > 1
  `

  if (remainingDuplicates.length === 0) {
    console.log("\n✓ All duplicates successfully cleaned up!")
  } else {
    console.log(`\n⚠ Warning: ${remainingDuplicates.length} duplicate groups still remain`)
  }
}

// Run the cleanup
cleanupDuplicateEvidence()
  .then(() => {
    console.log("\nCleanup complete.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error)
    process.exit(1)
  })
