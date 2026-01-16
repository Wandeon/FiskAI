// scripts/find-valid-rules-and-recovery.ts
// Find valid rules and check recovery options

import { db, dbReg } from "../src/lib/db"

async function findValidAndCheckRecovery() {
  // Get all evidence
  const allEvidence = await dbReg.evidence.findMany({
    select: { id: true, url: true, rawContent: true },
  })
  const validEvidenceIds = new Set(allEvidence.map((e) => e.id))
  const evidenceMap = new Map(allEvidence.map((e) => [e.id, e]))

  console.log("=== Finding Rules with Valid Evidence ===\n")

  // Find rules with at least one valid source pointer
  const allRules = await db.regulatoryRule.findMany({
    select: { id: true, conceptSlug: true, status: true, titleHr: true },
    orderBy: { status: "asc" },
  })

  const validRules: { rule: (typeof allRules)[0]; validPointers: number; totalPointers: number }[] =
    []

  for (const rule of allRules) {
    const pointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { evidenceId: true },
    })

    const validCount = pointers.filter((p) => validEvidenceIds.has(p.evidenceId)).length

    if (validCount > 0) {
      validRules.push({
        rule,
        validPointers: validCount,
        totalPointers: pointers.length,
      })
    }
  }

  console.log(`Rules with at least one valid evidence link: ${validRules.length}\n`)

  for (const { rule, validPointers, totalPointers } of validRules) {
    console.log(`[${rule.status}] ${rule.conceptSlug}`)
    console.log(`  Title: ${rule.titleHr?.slice(0, 60)}...`)
    console.log(`  Pointers: ${validPointers}/${totalPointers} valid`)
    console.log("")
  }

  // Check recovery potential by quote matching
  console.log("\n=== Checking Recovery Potential ===\n")

  // Get a sample of orphaned rules and try to find their quotes in current evidence
  const orphanedRules = await db.regulatoryRule.findMany({
    where: { status: "PENDING_REVIEW" },
    take: 5,
    select: { id: true, conceptSlug: true },
  })

  let recoverable = 0
  let notRecoverable = 0

  for (const rule of orphanedRules) {
    const pointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { id: true, evidenceId: true, exactQuote: true },
      take: 3,
    })

    console.log(`Rule: ${rule.conceptSlug}`)

    for (const pointer of pointers) {
      // Skip if already valid
      if (validEvidenceIds.has(pointer.evidenceId)) {
        console.log(`  ✓ Pointer ${pointer.id.slice(0, 8)}... already valid`)
        continue
      }

      // Try to find quote in current evidence
      const normalizedQuote = pointer.exactQuote.replace(/\s+/g, " ").trim().toLowerCase()
      let found = false

      for (const evidence of allEvidence) {
        if (evidence.rawContent) {
          const normalizedContent = evidence.rawContent.replace(/\s+/g, " ").toLowerCase()
          if (normalizedContent.includes(normalizedQuote.slice(0, 50))) {
            console.log(`  → Pointer ${pointer.id.slice(0, 8)}... RECOVERABLE`)
            console.log(`    Found in evidence: ${evidence.id.slice(0, 12)}...`)
            console.log(`    URL: ${evidence.url?.slice(0, 50)}...`)
            found = true
            recoverable++
            break
          }
        }
      }

      if (!found) {
        console.log(
          `  ✗ Pointer ${pointer.id.slice(0, 8)}... NOT recoverable (quote not in any evidence)`
        )
        notRecoverable++
      }
    }
    console.log("")
  }

  console.log(`\n=== Recovery Summary ===`)
  console.log(`Potentially recoverable pointers: ${recoverable}`)
  console.log(`Not recoverable (content lost): ${notRecoverable}`)

  await db.$disconnect()
}

findValidAndCheckRecovery().catch(console.error)
