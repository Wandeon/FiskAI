// scripts/investigate-provenance.ts
// Investigate why provenance validation is failing

import "dotenv/config"
import { db, dbReg } from "../src/lib/db"
import { getExtractableContent } from "../src/lib/regulatory-truth/utils/content-provider"
import { findQuoteInEvidence } from "../src/lib/regulatory-truth/utils/quote-in-evidence"

async function investigate() {
  console.log("=== Investigating Provenance Failures ===\n")

  // Get sample failed rules
  const rules = await db.regulatoryRule.findMany({
    where: { status: "PENDING_REVIEW" },
    select: { id: true, conceptSlug: true, riskTier: true },
    take: 3,
  })

  console.log(`Checking ${rules.length} PENDING_REVIEW rules\n`)

  for (const rule of rules) {
    console.log(`\n=== Rule: ${rule.conceptSlug} (${rule.riskTier}) ===`)

    // Get source pointers
    const pointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { id: true, evidenceId: true, exactQuote: true, matchType: true },
      take: 2,
    })

    console.log(`Pointers: ${pointers.length}`)

    for (const p of pointers) {
      console.log(`\n--- Pointer ${p.id.slice(0, 8)} ---`)
      console.log(`Current matchType: ${p.matchType}`)
      console.log(`Quote (80 chars): "${p.exactQuote.slice(0, 80)}..."`)

      // Check evidence
      const evidence = await dbReg.evidence.findUnique({
        where: { id: p.evidenceId },
        select: {
          id: true,
          url: true,
          contentClass: true,
          primaryTextArtifactId: true,
          rawContent: true,
        },
      })

      if (!evidence) {
        console.log(`  ❌ Evidence NOT FOUND`)
        continue
      }

      console.log(`  Evidence: ${evidence.contentClass}`)
      console.log(`  URL: ${evidence.url?.slice(0, 60)}...`)
      console.log(`  Has artifact: ${!!evidence.primaryTextArtifactId}`)
      console.log(`  Has rawContent: ${!!evidence.rawContent}`)

      // Try to get extractable content
      try {
        const content = await getExtractableContent(p.evidenceId)
        console.log(`  Content source: ${content.source}`)
        console.log(`  Content length: ${content.text.length} chars`)

        // Try to find the quote
        const matchResult = findQuoteInEvidence(content.text, p.exactQuote)
        console.log(`  Match found: ${matchResult.found}`)
        console.log(`  Match type: ${matchResult.matchType}`)

        if (!matchResult.found) {
          // Check if quote exists anywhere
          const quoteNorm = p.exactQuote.toLowerCase().replace(/\s+/g, " ").trim()
          const contentNorm = content.text.toLowerCase().replace(/\s+/g, " ")
          const partialMatch = contentNorm.includes(quoteNorm.slice(0, 30))
          console.log(`  Partial match (first 30 chars): ${partialMatch}`)

          // Show a sample of content
          console.log(`  Content sample (200 chars): "${content.text.slice(0, 200)}..."`)
        }
      } catch (err) {
        console.log(`  ❌ Error getting content: ${(err as Error).message}`)
      }
    }
  }

  // Summary statistics
  console.log("\n\n=== Summary Statistics ===")

  const totalPointers = await db.sourcePointer.count()
  const matchTypes = await db.sourcePointer.groupBy({
    by: ["matchType"],
    _count: { id: true },
  })

  console.log(`Total source pointers: ${totalPointers}`)
  console.log("By match type:")
  for (const mt of matchTypes) {
    console.log(`  ${mt.matchType || "NULL"}: ${mt._count.id}`)
  }

  // Evidence stats
  const evidenceWithArtifact = await dbReg.evidence.count({
    where: { primaryTextArtifactId: { not: null } },
  })
  const evidenceWithContent = await dbReg.evidence.count({
    where: { rawContent: { not: null } },
  })
  const totalEvidence = await dbReg.evidence.count()

  console.log(`\nEvidence stats:`)
  console.log(`  Total: ${totalEvidence}`)
  console.log(`  With artifact: ${evidenceWithArtifact}`)
  console.log(`  With rawContent: ${evidenceWithContent}`)

  await db.$disconnect()
}

investigate().catch(console.error)
