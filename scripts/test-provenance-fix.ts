// scripts/test-provenance-fix.ts
// Test that provenance validation now works with artifact content
// Run with: npx tsx scripts/test-provenance-fix.ts

import { db, dbReg } from "../src/lib/db"
import { getExtractableContent } from "../src/lib/regulatory-truth/utils/content-provider"
import {
  findQuoteInEvidence,
  normalizeForMatch,
} from "../src/lib/regulatory-truth/utils/quote-in-evidence"

async function testProvenanceFix() {
  console.log("=== Testing Provenance Fix ===\n")

  // Get all valid evidence IDs
  const allEvidence = await dbReg.evidence.findMany({ select: { id: true } })
  const validEvidenceIds = new Set(allEvidence.map((e) => e.id))
  console.log(`Valid evidence records: ${validEvidenceIds.size}`)

  // Get all rules with valid pointers (non-REJECTED)
  const rules = await db.regulatoryRule.findMany({
    where: { status: { not: "REJECTED" } },
    select: { id: true, conceptSlug: true, status: true },
    orderBy: { status: "asc" },
  })

  console.log(`Rules to check: ${rules.length}`)
  console.log("")

  let passCount = 0
  let failCount = 0

  for (const rule of rules) {
    // Get source pointers for this rule
    const pointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { id: true, evidenceId: true, exactQuote: true },
    })

    // Only check rules with valid evidence pointers
    const validPointers = pointers.filter((p) => validEvidenceIds.has(p.evidenceId))
    if (validPointers.length === 0) {
      console.log(`SKIP: ${rule.conceptSlug} - no valid evidence pointers`)
      continue
    }

    let allPass = true
    const results: string[] = []

    for (const pointer of validPointers) {
      try {
        // Use the FIXED approach: getExtractableContent
        const content = await getExtractableContent(pointer.evidenceId)

        // Try to find quote
        const matchResult = findQuoteInEvidence(content.text, pointer.exactQuote)

        if (matchResult.found) {
          results.push(
            `  ✓ Pointer ${pointer.id.slice(0, 8)}... FOUND (${matchResult.matchType}, source: ${content.source})`
          )
        } else {
          results.push(`  ✗ Pointer ${pointer.id.slice(0, 8)}... NOT FOUND`)
          results.push(`    Quote: "${pointer.exactQuote.slice(0, 60)}..."`)
          results.push(`    Content source: ${content.source}`)
          results.push(`    Content length: ${content.text.length} chars`)

          // Debug: Check if quote is partially there
          const normQuote = normalizeForMatch(pointer.exactQuote)
          const normContent = normalizeForMatch(content.text)
          const partialMatch = normContent.includes(normQuote.slice(0, 30))
          results.push(`    Partial match (first 30 chars): ${partialMatch}`)

          allPass = false
        }
      } catch (err) {
        results.push(`  ✗ Pointer ${pointer.id.slice(0, 8)}... ERROR: ${(err as Error).message}`)
        allPass = false
      }
    }

    if (allPass) {
      console.log(`PASS: [${rule.status}] ${rule.conceptSlug}`)
      passCount++
    } else {
      console.log(`FAIL: [${rule.status}] ${rule.conceptSlug}`)
      failCount++
    }

    for (const result of results) {
      console.log(result)
    }
    console.log("")
  }

  console.log("=== Summary ===")
  console.log(`Passed: ${passCount}`)
  console.log(`Failed: ${failCount}`)

  await db.$disconnect()
}

testProvenanceFix().catch(console.error)
