#!/usr/bin/env npx tsx
// scripts/backfill-candidatefacts.ts
// Backfills CandidateFacts from existing SourcePointers
//
// Phase A of cutover: Populate CandidateFact table with real data.
// This script creates CandidateFacts for SourcePointers that don't have them.
//
// Safety:
// - Idempotent: checks for existing CandidateFacts before creating
// - Rate-limited: pauses between batches to avoid DB pressure
// - Bounded: has configurable limit
// - Deduped: uses SourcePointer.id as unique reference
//
// Usage:
//   npx tsx scripts/backfill-candidatefacts.ts --dry-run   # Preview without changes
//   npx tsx scripts/backfill-candidatefacts.ts --limit 100 # Process up to 100 records
//   npx tsx scripts/backfill-candidatefacts.ts             # Process all eligible (default)

import { config } from "dotenv"
import { Pool } from "pg"

// Load environment variables
config({ path: ".env" })
config({ path: ".env.local", override: true })

// Verify we have required env vars
if (!process.env.DATABASE_URL && !process.env.REGULATORY_DATABASE_URL) {
  console.error("ERROR: Neither DATABASE_URL nor REGULATORY_DATABASE_URL is set")
  process.exit(1)
}

// ENVIRONMENT DETECTION: Handle Docker vs host machine
function getHostAccessibleUrl(url: string): string {
  if (process.env.DOCKER_CONTAINER === "true") {
    return url
  }
  return url.replace("fiskai-db:5432", "localhost:5434")
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getHostAccessibleUrl(process.env.DATABASE_URL)
}
if (process.env.REGULATORY_DATABASE_URL) {
  process.env.REGULATORY_DATABASE_URL = getHostAccessibleUrl(process.env.REGULATORY_DATABASE_URL)
}

// === SAFETY GUARDS ===
const DEFAULT_BATCH_SIZE = 100
const BATCH_PAUSE_MS = 500 // Pause between batches

interface SourcePointerRow {
  id: string
  evidenceId: string
  domain: string
  valueType: string
  extractedValue: string
  displayValue: string | null
  exactQuote: string
  contextBefore: string | null
  contextAfter: string | null
  articleNumber: string | null
  paragraphNumber: string | null
  lawReference: string | null
  confidence: number
  extractionNotes: string | null
  createdAt: Date
}

interface BackfillMetrics {
  startTime: Date
  endTime?: Date
  totalEligible: number
  processed: number
  created: number
  skipped: number
  failed: number
  byDomain: Record<string, { processed: number; created: number }>
  errors: Array<{ sourcePointerId: string; error: string }>
}

/**
 * Find SourcePointers that don't have corresponding CandidateFacts
 */
async function findEligibleSourcePointers(pool: Pool, limit?: number): Promise<SourcePointerRow[]> {
  const client = await pool.connect()
  try {
    // Find SourcePointers that don't have a CandidateFact referencing them
    // We check by looking for CandidateFacts with matching evidenceId and domain/valueType
    const result = await client.query(
      `
      SELECT
        sp.id,
        sp."evidenceId",
        sp.domain,
        sp."valueType",
        sp."extractedValue",
        sp."displayValue",
        sp."exactQuote",
        sp."contextBefore",
        sp."contextAfter",
        sp."articleNumber",
        sp."paragraphNumber",
        sp."lawReference",
        sp.confidence,
        sp."extractionNotes",
        sp."createdAt"
      FROM public."SourcePointer" sp
      WHERE sp."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public."CandidateFact" cf
          WHERE cf."groundingQuotes"::text LIKE '%' || sp.id || '%'
        )
      ORDER BY sp."createdAt" DESC
      ${limit ? `LIMIT ${limit}` : ""}
      `
    )
    return result.rows
  } finally {
    client.release()
  }
}

/**
 * Create a CandidateFact from a SourcePointer
 */
async function createCandidateFact(pool: Pool, sp: SourcePointerRow): Promise<boolean> {
  const client = await pool.connect()
  try {
    // Build grounding quotes JSON matching Phase-3 schema
    const groundingQuotes = [
      {
        text: sp.exactQuote,
        contextBefore: sp.contextBefore,
        contextAfter: sp.contextAfter,
        evidenceId: sp.evidenceId,
        sourcePointerId: sp.id,
      },
    ]

    // Generate concept slug from domain and valueType
    const conceptSlug = `${sp.domain}-${sp.valueType}`.toLowerCase()

    await client.query(
      `
      INSERT INTO public."CandidateFact" (
        id,
        "suggestedDomain",
        "suggestedValueType",
        "extractedValue",
        "overallConfidence",
        "valueConfidence",
        "groundingQuotes",
        "suggestedConceptSlug",
        "legalReferenceRaw",
        "extractorNotes",
        "suggestedPillar",
        status,
        "promotionCandidate",
        "createdAt"
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, NOW()
      )
      `,
      [
        sp.domain,
        sp.valueType,
        sp.extractedValue,
        sp.confidence,
        sp.confidence,
        JSON.stringify(groundingQuotes),
        conceptSlug,
        sp.lawReference,
        sp.extractionNotes,
        sp.domain, // suggestedPillar = domain
        "CAPTURED",
        sp.confidence >= 0.9, // promotionCandidate if high confidence
      ]
    )
    return true
  } catch (error) {
    console.error(`  Error creating CandidateFact for ${sp.id}:`, error)
    return false
  } finally {
    client.release()
  }
}

/**
 * Get current counts for reporting
 */
async function getCounts(pool: Pool): Promise<{
  sourcePointers: number
  candidateFacts: number
  eligible: number
}> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public."SourcePointer" WHERE "deletedAt" IS NULL) as "sourcePointers",
        (SELECT COUNT(*) FROM public."CandidateFact") as "candidateFacts",
        (SELECT COUNT(*) FROM public."SourcePointer" sp
         WHERE sp."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public."CandidateFact" cf
           WHERE cf."groundingQuotes"::text LIKE '%' || sp.id || '%'
         )
        ) as eligible
    `)
    return result.rows[0]
  } finally {
    client.release()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")

  let limit: number | undefined = undefined
  const limitIndex = args.indexOf("--limit")
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10) || DEFAULT_BATCH_SIZE
  }

  console.log("=".repeat(60))
  console.log("CANDIDATEFACT BACKFILL")
  console.log("=".repeat(60))
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`)
  console.log(`Limit: ${limit ?? "no limit (all eligible)"}`)
  console.log("=".repeat(60))

  const pool = new Pool({
    connectionString: process.env.REGULATORY_DATABASE_URL || process.env.DATABASE_URL,
  })

  try {
    // Pre-flight counts
    const preCounts = await getCounts(pool)
    console.log("\n--- PRE-FLIGHT COUNTS ---")
    console.log(`SourcePointers: ${preCounts.sourcePointers}`)
    console.log(`CandidateFacts: ${preCounts.candidateFacts}`)
    console.log(`Eligible for backfill: ${preCounts.eligible}`)

    if (preCounts.eligible === 0) {
      console.log("\n✓ No eligible SourcePointers. All caught up!")
      await pool.end()
      process.exit(0)
    }

    // Find eligible SourcePointers
    const sourcePointers = await findEligibleSourcePointers(pool, limit)
    console.log(`\nFound ${sourcePointers.length} SourcePointers to process`)

    if (isDryRun) {
      console.log("\n--- DRY RUN: Would create CandidateFacts for ---")
      const byDomain: Record<string, number> = {}
      for (const sp of sourcePointers) {
        byDomain[sp.domain] = (byDomain[sp.domain] || 0) + 1
      }
      for (const [domain, count] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${domain}: ${count}`)
      }
      console.log(`\nTotal: ${sourcePointers.length} CandidateFacts would be created`)
      console.log("\n✓ Dry run complete. No changes made.")
      await pool.end()
      process.exit(0)
    }

    // Initialize metrics
    const metrics: BackfillMetrics = {
      startTime: new Date(),
      totalEligible: sourcePointers.length,
      processed: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      byDomain: {},
      errors: [],
    }

    // Process in batches
    const batchSize = DEFAULT_BATCH_SIZE
    for (let i = 0; i < sourcePointers.length; i += batchSize) {
      const batch = sourcePointers.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(sourcePointers.length / batchSize)

      console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} records) ---`)

      for (const sp of batch) {
        // Initialize domain metrics
        if (!metrics.byDomain[sp.domain]) {
          metrics.byDomain[sp.domain] = { processed: 0, created: 0 }
        }

        metrics.processed++
        metrics.byDomain[sp.domain].processed++

        const success = await createCandidateFact(pool, sp)
        if (success) {
          metrics.created++
          metrics.byDomain[sp.domain].created++
        } else {
          metrics.failed++
          metrics.errors.push({ sourcePointerId: sp.id, error: "Insert failed" })
        }
      }

      console.log(`  Created: ${batch.filter((_, j) => j < batch.length).length}`)

      // Pause between batches
      if (i + batchSize < sourcePointers.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS))
      }
    }

    metrics.endTime = new Date()
    const durationMs = metrics.endTime.getTime() - metrics.startTime.getTime()
    const durationSec = (durationMs / 1000).toFixed(1)

    // Final report
    console.log("\n" + "=".repeat(60))
    console.log("BACKFILL COMPLETE")
    console.log("=".repeat(60))
    console.log(`Duration: ${durationSec} seconds`)
    console.log(`Processed: ${metrics.processed}/${metrics.totalEligible}`)
    console.log(`Created: ${metrics.created}`)
    console.log(`Failed: ${metrics.failed}`)

    console.log("\n--- BY DOMAIN ---")
    for (const [domain, stats] of Object.entries(metrics.byDomain).sort(
      (a, b) => b[1].created - a[1].created
    )) {
      console.log(`  ${domain}: ${stats.created}/${stats.processed} created`)
    }

    if (metrics.errors.length > 0) {
      console.log("\n--- ERRORS ---")
      for (const err of metrics.errors.slice(0, 10)) {
        console.log(`  ${err.sourcePointerId}: ${err.error}`)
      }
    }

    // Post-flight counts
    const postCounts = await getCounts(pool)
    console.log("\n--- POST-FLIGHT COUNTS ---")
    console.log(`SourcePointers: ${postCounts.sourcePointers}`)
    console.log(`CandidateFacts: ${postCounts.candidateFacts}`)
    console.log(`Remaining eligible: ${postCounts.eligible}`)

    await pool.end()
    process.exit(metrics.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error("\nFATAL ERROR:", error)
    await pool.end()
    process.exit(1)
  }
}

void main()
