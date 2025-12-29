// scripts/check-orphaned-pointers.ts
// Diagnostic script to check for orphaned SourcePointers

import { db } from "@/lib/db"

async function checkOrphanedPointers() {
  console.log("Checking for orphaned SourcePointers...")

  // Count total pointers
  const totalPointers = await db.sourcePointer.count({
    where: { deletedAt: null },
  })
  console.log(`Total SourcePointers (not deleted): ${totalPointers}`)

  // Count pointers linked to rules
  const linkedPointers = await db.sourcePointer.count({
    where: {
      deletedAt: null,
      rules: {
        some: {},
      },
    },
  })
  console.log(`SourcePointers linked to rules: ${linkedPointers}`)

  // Count orphaned pointers
  const orphanedPointers = await db.sourcePointer.count({
    where: {
      deletedAt: null,
      rules: {
        none: {},
      },
    },
  })
  console.log(`Orphaned SourcePointers: ${orphanedPointers}`)

  // Get sample orphaned pointers
  const sampleOrphaned = await db.sourcePointer.findMany({
    where: {
      deletedAt: null,
      rules: {
        none: {},
      },
    },
    select: {
      id: true,
      domain: true,
      extractedValue: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  })

  if (sampleOrphaned.length > 0) {
    console.log("\nSample orphaned pointers (most recent):")
    for (const pointer of sampleOrphaned) {
      console.log(
        `  - ${pointer.id} | ${pointer.domain} | ${pointer.extractedValue} | Created: ${pointer.createdAt.toISOString()}`
      )
    }
  }

  // Count total rules
  const totalRules = await db.regulatoryRule.count()
  console.log(`\nTotal RegulatoryRules: ${totalRules}`)

  // Count rules with no pointers
  const rulesWithoutPointers = await db.regulatoryRule.count({
    where: {
      sourcePointers: {
        none: {},
      },
    },
  })
  console.log(`Rules without SourcePointers: ${rulesWithoutPointers}`)

  // Summary
  const orphanedPercentage = totalPointers > 0 ? (orphanedPointers / totalPointers) * 100 : 0
  console.log(`\nSummary:`)
  console.log(`  - ${orphanedPercentage.toFixed(1)}% of pointers are orphaned`)
  console.log(`  - ${linkedPointers + orphanedPointers === totalPointers ? "✓" : "✗"} Counts match`)

  await db.$disconnect()
}

checkOrphanedPointers().catch(console.error)
