// scripts/propose-orphan-cleanup.ts
// Propose cleanup strategy for orphaned evidence

import { db, dbReg } from "../src/lib/db"

async function proposeCleanup() {
  // Get all evidence IDs
  const allEvidence = await dbReg.evidence.findMany({
    select: { id: true },
  })
  const validEvidenceIds = new Set(allEvidence.map((e) => e.id))

  console.log("=== Current State ===")
  console.log(`Valid evidence records: ${allEvidence.length}`)

  // Count orphaned source pointers
  const allPointers = await db.sourcePointer.findMany({
    select: { id: true, evidenceId: true },
  })

  const orphanedPointers = allPointers.filter((p) => !validEvidenceIds.has(p.evidenceId))
  const validPointers = allPointers.filter((p) => validEvidenceIds.has(p.evidenceId))

  console.log(`Total source pointers: ${allPointers.length}`)
  console.log(`Valid pointers: ${validPointers.length}`)
  console.log(`Orphaned pointers: ${orphanedPointers.length}`)

  // Count rules by status
  const allRules = await db.regulatoryRule.findMany({
    select: { id: true, status: true, conceptSlug: true },
  })

  // Categorize rules
  const rulesWithValidEvidence: string[] = []
  const rulesFullyOrphaned: typeof allRules = []

  for (const rule of allRules) {
    const rulePointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { evidenceId: true },
    })

    const hasValid = rulePointers.some((p) => validEvidenceIds.has(p.evidenceId))

    if (hasValid) {
      rulesWithValidEvidence.push(rule.id)
    } else {
      rulesFullyOrphaned.push(rule)
    }
  }

  console.log(`\nRules with at least 1 valid pointer: ${rulesWithValidEvidence.length}`)
  console.log(`Rules fully orphaned (0 valid pointers): ${rulesFullyOrphaned.length}`)

  // Break down fully orphaned by status
  const orphanedByStatus: Record<string, number> = {}
  for (const rule of rulesFullyOrphaned) {
    orphanedByStatus[rule.status] = (orphanedByStatus[rule.status] || 0) + 1
  }

  console.log("\nFully orphaned rules by status:")
  for (const [status, count] of Object.entries(orphanedByStatus)) {
    console.log(`  ${status}: ${count}`)
  }

  // Propose cleanup actions
  console.log("\n=== Proposed Cleanup Strategy ===\n")

  console.log("Option A: Aggressive Cleanup (Recommended)")
  console.log("------------------------------------------")
  console.log("1. DELETE all orphaned SourcePointers")
  console.log(`   Impact: ${orphanedPointers.length} pointers deleted`)
  console.log("2. Set status=REJECTED for rules with 0 remaining pointers")
  console.log(`   Impact: ~${rulesFullyOrphaned.length} rules marked REJECTED`)
  console.log("3. Keep rules with at least 1 valid pointer")
  console.log(`   Impact: ${rulesWithValidEvidence.length} rules preserved`)
  console.log("4. Let pipeline re-extract from current evidence")
  console.log("")

  console.log("Option B: Conservative Cleanup")
  console.log("------------------------------")
  console.log("1. Keep all rules but add flag 'hasOrphanedEvidence: true'")
  console.log("2. Block orphaned rules from auto-approve/publish")
  console.log("3. Manually review and re-link over time")
  console.log("")

  console.log("Option C: Nuclear Reset")
  console.log("-----------------------")
  console.log("1. DELETE all RegulatoryRules")
  console.log("2. DELETE all SourcePointers")
  console.log("3. DELETE all CandidateFacts")
  console.log("4. Let pipeline re-extract everything fresh")
  console.log("")

  // Show what current evidence can produce
  console.log("=== Current Evidence Quality ===")
  const evidenceWithContent = await dbReg.evidence.count({
    where: { rawContent: { not: { equals: "" } } },
  })
  console.log(`Evidence with content: ${evidenceWithContent}/${allEvidence.length}`)

  const evidenceBySource = await dbReg.evidence.groupBy({
    by: ["sourceId"],
    _count: { id: true },
  })

  const sources = await dbReg.regulatorySource.findMany({
    select: { id: true, name: true },
  })
  const sourceMap = new Map(sources.map((s) => [s.id, s.name]))

  console.log("\nEvidence by source:")
  for (const group of evidenceBySource.slice(0, 10)) {
    const sourceName = sourceMap.get(group.sourceId) || group.sourceId
    console.log(`  ${sourceName}: ${group._count.id}`)
  }

  await db.$disconnect()
}

proposeCleanup().catch(console.error)
