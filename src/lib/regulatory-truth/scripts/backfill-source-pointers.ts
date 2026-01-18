// src/lib/regulatory-truth/scripts/backfill-source-pointers.ts
//
// Source Pointer Reconstruction Script - Self-Healing RTL Pipeline (Priority 1B)
//
// Purpose: Reconstructs missing source pointers for rules that were orphaned
// during migration or due to bugs.
//
// This addresses the "48 rules blocked: no source pointers (no audit trail)"
// issue by searching CandidateFacts and Evidence for matching data.
//
// Usage:
//   npx tsx src/lib/regulatory-truth/scripts/backfill-source-pointers.ts [--dry-run] [--limit N]
//
// Arguments:
//   --dry-run   Don't write changes, just report what would be done
//   --limit N   Process at most N rules (default: all)
//   --verbose   Show detailed progress

import { db } from "@/lib/db"
import { dbReg } from "@/lib/db/regulatory"
import { calculateNormalizedSimilarity, normalizeForComparison } from "../utils/croatian-text"

/**
 * Grounding quote from CandidateFact
 */
interface GroundingQuote {
  text: string
  contextBefore?: string
  contextAfter?: string
  evidenceId?: string
  articleNumber?: string
  lawReference?: string
}

/**
 * Result of backfill for a single rule
 */
interface BackfillResult {
  ruleId: string
  conceptSlug: string
  status: "CREATED" | "SKIPPED" | "FAILED"
  sourcePointersCreated: number
  reason?: string
  details?: {
    matchedCandidateFacts: number
    matchedEvidenceIds: string[]
  }
}

/**
 * Summary of backfill operation
 */
interface BackfillSummary {
  totalRulesProcessed: number
  rulesWithPointersCreated: number
  totalPointersCreated: number
  skippedRules: number
  failedRules: number
  results: BackfillResult[]
}

/**
 * Find rules that have no source pointers
 */
async function findOrphanRules(limit?: number): Promise<
  Array<{
    id: string
    conceptSlug: string
    value: string
    valueType: string
    effectiveFrom: Date
    effectiveUntil: Date | null
    originatingCandidateFactIds: string[]
    status: string
  }>
> {
  // Find rules where sourcePointers relation is empty
  const rulesWithoutPointers = await db.regulatoryRule.findMany({
    where: {
      sourcePointers: {
        none: {},
      },
      // Only process rules in certain statuses
      status: {
        in: ["APPROVED", "PENDING_REVIEW", "DRAFT"],
      },
    },
    select: {
      id: true,
      conceptSlug: true,
      value: true,
      valueType: true,
      effectiveFrom: true,
      effectiveUntil: true,
      originatingCandidateFactIds: true,
      status: true,
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  })

  return rulesWithoutPointers
}

/**
 * Try to find matching CandidateFacts for a rule
 */
async function findMatchingCandidateFacts(rule: {
  id: string
  conceptSlug: string
  value: string
  valueType: string
  originatingCandidateFactIds: string[]
}): Promise<
  Array<{
    id: string
    groundingQuotes: GroundingQuote[]
    suggestedDomain: string | null
    extractedValue: string | null
  }>
> {
  // First try: Use originatingCandidateFactIds if available
  if (rule.originatingCandidateFactIds.length > 0) {
    const facts = await db.candidateFact.findMany({
      where: {
        id: { in: rule.originatingCandidateFactIds },
      },
      select: {
        id: true,
        groundingQuotes: true,
        suggestedDomain: true,
        extractedValue: true,
      },
    })

    if (facts.length > 0) {
      return facts.map((f) => ({
        ...f,
        groundingQuotes: parseGroundingQuotes(f.groundingQuotes),
      }))
    }
  }

  // Second try: Search by conceptSlug and value similarity
  const candidateFacts = await db.candidateFact.findMany({
    where: {
      OR: [
        { suggestedConceptSlug: rule.conceptSlug },
        { suggestedDomain: rule.conceptSlug.split("-")[0] }, // Try domain prefix
      ],
      status: { in: ["CAPTURED", "PROMOTED"] },
    },
    select: {
      id: true,
      groundingQuotes: true,
      suggestedDomain: true,
      extractedValue: true,
    },
    take: 20, // Limit search scope
  })

  // Filter by value similarity
  const matches = candidateFacts.filter((fact) => {
    if (!fact.extractedValue) return false
    const similarity = calculateNormalizedSimilarity(
      String(rule.value),
      String(fact.extractedValue)
    )
    return similarity > 0.9 // High threshold for value match
  })

  return matches.map((f) => ({
    ...f,
    groundingQuotes: parseGroundingQuotes(f.groundingQuotes),
  }))
}

/**
 * Parse groundingQuotes from JSON
 */
function parseGroundingQuotes(json: unknown): GroundingQuote[] {
  if (!json) return []
  if (!Array.isArray(json)) return []
  return json as GroundingQuote[]
}

/**
 * Verify that quote exists in evidence content
 */
async function verifyQuoteInEvidence(
  quote: string,
  evidenceId: string
): Promise<{ found: boolean; offset?: number }> {
  const evidence = await dbReg.evidence.findUnique({
    where: { id: evidenceId },
    select: { rawContent: true },
  })

  if (!evidence?.rawContent) {
    return { found: false }
  }

  // Try exact match first
  const exactIndex = evidence.rawContent.indexOf(quote)
  if (exactIndex !== -1) {
    return { found: true, offset: exactIndex }
  }

  // Try normalized match
  const normalizedQuote = normalizeForComparison(quote)
  const normalizedContent = normalizeForComparison(evidence.rawContent)
  const normalizedIndex = normalizedContent.indexOf(normalizedQuote)

  if (normalizedIndex !== -1) {
    return { found: true, offset: normalizedIndex }
  }

  return { found: false }
}

/**
 * Create source pointer from grounding quote
 */
async function createSourcePointer(
  ruleId: string,
  quote: GroundingQuote,
  domain: string,
  valueType: string,
  value: string
): Promise<string | null> {
  if (!quote.evidenceId || !quote.text) {
    return null
  }

  // Verify quote exists in evidence
  const verification = await verifyQuoteInEvidence(quote.text, quote.evidenceId)

  const pointer = await db.sourcePointer.create({
    data: {
      evidenceId: quote.evidenceId,
      domain: domain,
      valueType: valueType,
      extractedValue: value,
      displayValue: value,
      exactQuote: quote.text,
      contextBefore: quote.contextBefore || null,
      contextAfter: quote.contextAfter || null,
      articleNumber: quote.articleNumber || null,
      lawReference: quote.lawReference || null,
      confidence: verification.found ? 0.85 : 0.6, // Lower confidence if not verified
      startOffset: verification.offset ?? null,
      endOffset: verification.offset != null ? verification.offset + quote.text.length : null,
      matchType: verification.found ? "EXACT" : "PENDING_VERIFICATION",
      rules: {
        connect: { id: ruleId },
      },
    },
  })

  return pointer.id
}

/**
 * Process a single rule for backfill
 */
async function backfillRule(
  rule: {
    id: string
    conceptSlug: string
    value: string
    valueType: string
    effectiveFrom: Date
    effectiveUntil: Date | null
    originatingCandidateFactIds: string[]
    status: string
  },
  dryRun: boolean,
  verbose: boolean
): Promise<BackfillResult> {
  try {
    // Find matching CandidateFacts
    const candidateFacts = await findMatchingCandidateFacts(rule)

    if (candidateFacts.length === 0) {
      if (verbose) {
        console.log(`  [${rule.id}] No matching CandidateFacts found`)
      }
      return {
        ruleId: rule.id,
        conceptSlug: rule.conceptSlug,
        status: "SKIPPED",
        sourcePointersCreated: 0,
        reason: "No matching CandidateFacts",
      }
    }

    // Extract unique evidence IDs from grounding quotes
    const evidenceIds = new Set<string>()
    const allQuotes: Array<{ quote: GroundingQuote; domain: string }> = []

    for (const fact of candidateFacts) {
      for (const quote of fact.groundingQuotes) {
        if (quote.evidenceId && quote.text) {
          evidenceIds.add(quote.evidenceId)
          allQuotes.push({
            quote,
            domain: fact.suggestedDomain || rule.conceptSlug.split("-")[0],
          })
        }
      }
    }

    if (allQuotes.length === 0) {
      if (verbose) {
        console.log(`  [${rule.id}] CandidateFacts have no grounding quotes`)
      }
      return {
        ruleId: rule.id,
        conceptSlug: rule.conceptSlug,
        status: "SKIPPED",
        sourcePointersCreated: 0,
        reason: "No grounding quotes in CandidateFacts",
      }
    }

    if (dryRun) {
      console.log(
        `  [${rule.id}] Would create ${allQuotes.length} source pointers ` +
          `from ${candidateFacts.length} CandidateFacts`
      )
      return {
        ruleId: rule.id,
        conceptSlug: rule.conceptSlug,
        status: "SKIPPED",
        sourcePointersCreated: 0,
        reason: "Dry run",
        details: {
          matchedCandidateFacts: candidateFacts.length,
          matchedEvidenceIds: Array.from(evidenceIds),
        },
      }
    }

    // Create source pointers
    let created = 0
    for (const { quote, domain } of allQuotes) {
      const pointerId = await createSourcePointer(
        rule.id,
        quote,
        domain,
        rule.valueType,
        rule.value
      )
      if (pointerId) {
        created++
      }
    }

    if (verbose) {
      console.log(`  [${rule.id}] Created ${created} source pointers ` + `(${rule.conceptSlug})`)
    }

    return {
      ruleId: rule.id,
      conceptSlug: rule.conceptSlug,
      status: created > 0 ? "CREATED" : "FAILED",
      sourcePointersCreated: created,
      details: {
        matchedCandidateFacts: candidateFacts.length,
        matchedEvidenceIds: Array.from(evidenceIds),
      },
    }
  } catch (error) {
    console.error(`  [${rule.id}] Error:`, error)
    return {
      ruleId: rule.id,
      conceptSlug: rule.conceptSlug,
      status: "FAILED",
      sourcePointersCreated: 0,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Run the backfill operation
 */
async function runBackfill(options: {
  dryRun: boolean
  limit?: number
  verbose: boolean
}): Promise<BackfillSummary> {
  const { dryRun, limit, verbose } = options

  console.log("\n=== Source Pointer Backfill ===")
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`)
  if (limit) console.log(`Limit: ${limit} rules`)
  console.log("")

  // Find orphan rules
  console.log("Finding rules without source pointers...")
  const orphanRules = await findOrphanRules(limit)
  console.log(`Found ${orphanRules.length} rules without source pointers\n`)

  if (orphanRules.length === 0) {
    return {
      totalRulesProcessed: 0,
      rulesWithPointersCreated: 0,
      totalPointersCreated: 0,
      skippedRules: 0,
      failedRules: 0,
      results: [],
    }
  }

  // Process each rule
  const results: BackfillResult[] = []

  for (let i = 0; i < orphanRules.length; i++) {
    const rule = orphanRules[i]
    if (verbose) {
      console.log(`Processing [${i + 1}/${orphanRules.length}] ${rule.conceptSlug} (${rule.id})`)
    }

    const result = await backfillRule(rule, dryRun, verbose)
    results.push(result)

    // Add small delay to avoid overwhelming DB
    if (i > 0 && i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  // Calculate summary
  const summary: BackfillSummary = {
    totalRulesProcessed: results.length,
    rulesWithPointersCreated: results.filter((r) => r.status === "CREATED").length,
    totalPointersCreated: results.reduce((sum, r) => sum + r.sourcePointersCreated, 0),
    skippedRules: results.filter((r) => r.status === "SKIPPED").length,
    failedRules: results.filter((r) => r.status === "FAILED").length,
    results,
  }

  // Print summary
  console.log("\n=== Summary ===")
  console.log(`Total rules processed: ${summary.totalRulesProcessed}`)
  console.log(`Rules with pointers created: ${summary.rulesWithPointersCreated}`)
  console.log(`Total pointers created: ${summary.totalPointersCreated}`)
  console.log(`Skipped rules: ${summary.skippedRules}`)
  console.log(`Failed rules: ${summary.failedRules}`)

  if (summary.failedRules > 0) {
    console.log("\nFailed rules:")
    for (const result of results.filter((r) => r.status === "FAILED")) {
      console.log(`  - ${result.ruleId} (${result.conceptSlug}): ${result.reason}`)
    }
  }

  return summary
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const verbose = args.includes("--verbose")

  let limit: number | undefined
  const limitIndex = args.indexOf("--limit")
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10)
    if (isNaN(limit) || limit < 1) {
      console.error("Invalid limit value")
      process.exit(1)
    }
  }

  try {
    const summary = await runBackfill({ dryRun, limit, verbose })

    if (!dryRun && summary.totalPointersCreated > 0) {
      console.log("\nBackfill complete! Rules may now pass provenance validation.")
    }

    process.exit(0)
  } catch (error) {
    console.error("Backfill failed:", error)
    process.exit(1)
  }
}

// Export for programmatic use
export { runBackfill, findOrphanRules, backfillRule }

// Run if executed directly
void main()
