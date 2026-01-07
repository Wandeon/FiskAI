#!/usr/bin/env npx tsx
// scripts/promote-candidatefacts.ts
// Promotes CandidateFacts to RuleFacts (Phase B of cutover)
//
// This script transforms CandidateFacts (staging table) into RuleFacts (canonical table).
// It handles type mapping between the looser CandidateFact schema and stricter RuleFact enums.
//
// Safety:
// - Idempotent: checks for existing RuleFacts via promotedToRuleFactId
// - Rate-limited: pauses between batches
// - Bounded: has configurable limit
// - Auditable: logs all transformations
//
// Usage:
//   npx tsx scripts/promote-candidatefacts.ts --dry-run   # Preview without changes
//   npx tsx scripts/promote-candidatefacts.ts --limit 50  # Promote up to 50 records
//   npx tsx scripts/promote-candidatefacts.ts             # Promote all eligible (default 100)

import { config } from "dotenv"
import { Pool, type PoolClient } from "pg"

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
const DEFAULT_LIMIT = 100
const BATCH_SIZE = 50
const BATCH_PAUSE_MS = 500

// === TYPE MAPPING TABLES ===

// Map CandidateFact domain -> RuleFact objectType
const DOMAIN_TO_OBJECT_TYPE: Record<string, string> = {
  rokovi: "ROK",
  obrasci: "OBVEZA",
  fiskalizacija: "OBVEZA",
  doprinosi: "POSTOTAK",
  pdv: "POREZNA_STOPA",
  porez_dohodak: "POREZNA_STOPA",
  "legal-metadata": "OBVEZA",
  "exchange-rate": "IZNOS",
  "e-invoicing": "OBVEZA",
  pausalni: "IZNOS",
  insolvency: "OBVEZA",
  vat: "POREZNA_STOPA",
  invoicing: "OBVEZA",
}

// Map CandidateFact valueType -> RuleFact valueType
const VALUE_TYPE_MAP: Record<string, string> = {
  date: "DEADLINE_DESCRIPTION",
  threshold: "COUNT",
  text: "DEADLINE_DESCRIPTION",
  currency: "CURRENCY_EUR",
  decimal: "CURRENCY_EUR",
  percentage: "PERCENTAGE",
}

// Map domain to default authority level
const DOMAIN_TO_AUTHORITY: Record<string, string> = {
  pdv: "LAW",
  porez_dohodak: "LAW",
  doprinosi: "LAW",
  fiskalizacija: "LAW",
  "legal-metadata": "LAW",
  rokovi: "GUIDANCE",
  obrasci: "GUIDANCE",
  "exchange-rate": "PRACTICE",
  "e-invoicing": "GUIDANCE",
  pausalni: "LAW",
  insolvency: "LAW",
  vat: "LAW",
  invoicing: "GUIDANCE",
}

// Map domain to default risk tier
const DOMAIN_TO_RISK_TIER: Record<string, string> = {
  pdv: "T1",
  porez_dohodak: "T1",
  doprinosi: "T1",
  fiskalizacija: "T0",
  rokovi: "T2",
  obrasci: "T2",
  "exchange-rate": "T3",
  "e-invoicing": "T1",
  pausalni: "T1",
  insolvency: "T1",
  "legal-metadata": "T3",
  vat: "T1",
  invoicing: "T2",
}

interface CandidateFactRow {
  id: string
  suggestedConceptSlug: string | null
  suggestedDomain: string | null
  subjectDescription: string | null
  objectDescription: string | null
  extractedValue: string | null
  suggestedValueType: string | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  suggestedAuthority: string | null
  legalReferenceRaw: string | null
  groundingQuotes: unknown
  overallConfidence: number
  extractorNotes: string | null
}

interface PromotionMetrics {
  startTime: Date
  endTime?: Date
  totalEligible: number
  processed: number
  promoted: number
  skipped: number
  failed: number
  byDomain: Record<string, { processed: number; promoted: number }>
  errors: Array<{ candidateId: string; error: string }>
}

/**
 * Find CandidateFacts eligible for promotion
 * - promotionCandidate = true
 * - promotedToRuleFactId IS NULL (not yet promoted)
 * - Has grounding quotes
 */
async function findEligibleCandidates(pool: Pool, limit: number): Promise<CandidateFactRow[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
      SELECT
        id,
        "suggestedConceptSlug",
        "suggestedDomain",
        "subjectDescription",
        "objectDescription",
        "extractedValue",
        "suggestedValueType",
        "effectiveFrom",
        "effectiveUntil",
        "suggestedAuthority",
        "legalReferenceRaw",
        "groundingQuotes",
        "overallConfidence",
        "extractorNotes"
      FROM public."CandidateFact"
      WHERE "promotionCandidate" = true
        AND "promotedToRuleFactId" IS NULL
        AND "groundingQuotes" IS NOT NULL
        AND jsonb_array_length("groundingQuotes") > 0
      ORDER BY "overallConfidence" DESC, "createdAt" ASC
      LIMIT $1
      `,
      [limit]
    )
    return result.rows
  } finally {
    client.release()
  }
}

/**
 * Create a RuleFact from a CandidateFact and update the CandidateFact with the reference
 */
async function promoteCandidateFact(
  pool: Pool,
  cf: CandidateFactRow
): Promise<{ success: boolean; ruleFactId?: string; error?: string }> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Map types
    const domain = cf.suggestedDomain || "rokovi"
    const objectType = DOMAIN_TO_OBJECT_TYPE[domain] || "OBVEZA"
    const valueType = VALUE_TYPE_MAP[cf.suggestedValueType || "text"] || "DEADLINE_DESCRIPTION"
    const authority =
      cf.suggestedAuthority?.toUpperCase() || DOMAIN_TO_AUTHORITY[domain] || "GUIDANCE"
    const riskTier = DOMAIN_TO_RISK_TIER[domain] || "T2"

    // Build legal reference JSON
    const legalReference = cf.legalReferenceRaw
      ? { raw: cf.legalReferenceRaw }
      : { note: "Auto-promoted from CandidateFact" }

    // Use effectiveFrom from candidate or default to now
    const effectiveFrom = cf.effectiveFrom || new Date()

    // Build concept slug
    const conceptSlug = cf.suggestedConceptSlug || `${domain}-${cf.suggestedValueType || "general"}`

    // Insert into regulatory.RuleFact
    const insertResult = await client.query(
      `
      INSERT INTO regulatory."RuleFact" (
        id,
        "conceptSlug",
        "subjectType",
        "subjectDescription",
        "objectType",
        "objectDescription",
        conditions,
        value,
        "valueType",
        "displayValue",
        "effectiveFrom",
        "effectiveUntil",
        authority,
        "legalReference",
        "groundingQuotes",
        "riskTier",
        confidence,
        status,
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17, NOW(), NOW()
      )
      RETURNING id
      `,
      [
        conceptSlug,
        "ALL", // subjectType - default to ALL for now
        cf.subjectDescription || `Subject for ${domain}`,
        objectType,
        cf.objectDescription || `${domain} rule`,
        JSON.stringify({ always: true }), // conditions
        cf.extractedValue || "",
        valueType,
        cf.extractedValue || "", // displayValue same as value
        effectiveFrom,
        cf.effectiveUntil,
        authority,
        JSON.stringify(legalReference),
        JSON.stringify(cf.groundingQuotes),
        riskTier,
        cf.overallConfidence,
        "DRAFT", // Start as DRAFT, can be published later
      ]
    )

    const ruleFactId = insertResult.rows[0].id

    // Update CandidateFact with reference to RuleFact
    await client.query(
      `
      UPDATE public."CandidateFact"
      SET "promotedToRuleFactId" = $1,
          status = 'PROMOTED',
          "reviewedAt" = NOW(),
          "reviewNotes" = COALESCE("reviewNotes", '') || ' [Auto-promoted Phase B cutover]'
      WHERE id = $2
      `,
      [ruleFactId, cf.id]
    )

    await client.query("COMMIT")
    return { success: true, ruleFactId }
  } catch (error) {
    await client.query("ROLLBACK")
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    client.release()
  }
}

/**
 * Get current counts for reporting
 */
async function getCounts(pool: Pool): Promise<{
  candidateFacts: number
  promotionCandidates: number
  alreadyPromoted: number
  ruleFacts: number
}> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public."CandidateFact") as "candidateFacts",
        (SELECT COUNT(*) FROM public."CandidateFact" WHERE "promotionCandidate" = true AND "promotedToRuleFactId" IS NULL) as "promotionCandidates",
        (SELECT COUNT(*) FROM public."CandidateFact" WHERE "promotedToRuleFactId" IS NOT NULL) as "alreadyPromoted",
        (SELECT COUNT(*) FROM regulatory."RuleFact") as "ruleFacts"
    `)
    return result.rows[0]
  } finally {
    client.release()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")

  let limit = DEFAULT_LIMIT
  const limitIndex = args.indexOf("--limit")
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10) || DEFAULT_LIMIT
  }

  console.log("=".repeat(60))
  console.log("CANDIDATEFACT → RULEFACT PROMOTION")
  console.log("=".repeat(60))
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`)
  console.log(`Limit: ${limit}`)
  console.log("=".repeat(60))

  const pool = new Pool({
    connectionString: process.env.REGULATORY_DATABASE_URL || process.env.DATABASE_URL,
  })

  try {
    // Pre-flight counts
    const preCounts = await getCounts(pool)
    console.log("\n--- PRE-FLIGHT COUNTS ---")
    console.log(`CandidateFacts: ${preCounts.candidateFacts}`)
    console.log(`Eligible for promotion: ${preCounts.promotionCandidates}`)
    console.log(`Already promoted: ${preCounts.alreadyPromoted}`)
    console.log(`RuleFacts: ${preCounts.ruleFacts}`)

    if (preCounts.promotionCandidates === 0) {
      console.log("\n✓ No eligible CandidateFacts. All caught up!")
      await pool.end()
      process.exit(0)
    }

    // Find eligible CandidateFacts
    const candidates = await findEligibleCandidates(pool, limit)
    console.log(`\nFound ${candidates.length} CandidateFacts to promote`)

    if (isDryRun) {
      console.log("\n--- DRY RUN: Would promote CandidateFacts ---")
      const byDomain: Record<string, number> = {}
      for (const cf of candidates) {
        const domain = cf.suggestedDomain || "unknown"
        byDomain[domain] = (byDomain[domain] || 0) + 1
      }
      for (const [domain, count] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
        const objectType = DOMAIN_TO_OBJECT_TYPE[domain] || "OBVEZA"
        const authority = DOMAIN_TO_AUTHORITY[domain] || "GUIDANCE"
        console.log(`  ${domain} → ${objectType} (${authority}): ${count}`)
      }
      console.log(`\nTotal: ${candidates.length} RuleFacts would be created`)
      console.log("\n✓ Dry run complete. No changes made.")
      await pool.end()
      process.exit(0)
    }

    // Initialize metrics
    const metrics: PromotionMetrics = {
      startTime: new Date(),
      totalEligible: candidates.length,
      processed: 0,
      promoted: 0,
      skipped: 0,
      failed: 0,
      byDomain: {},
      errors: [],
    }

    // Process in batches
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(candidates.length / BATCH_SIZE)

      console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} records) ---`)

      for (const cf of batch) {
        const domain = cf.suggestedDomain || "unknown"

        // Initialize domain metrics
        if (!metrics.byDomain[domain]) {
          metrics.byDomain[domain] = { processed: 0, promoted: 0 }
        }

        metrics.processed++
        metrics.byDomain[domain].processed++

        const result = await promoteCandidateFact(pool, cf)
        if (result.success) {
          metrics.promoted++
          metrics.byDomain[domain].promoted++
        } else {
          metrics.failed++
          metrics.errors.push({ candidateId: cf.id, error: result.error || "Unknown error" })
          console.error(`  ✗ Failed ${cf.id}: ${result.error}`)
        }
      }

      console.log(
        `  Promoted: ${batch.length - metrics.errors.filter((e) => batch.some((c) => c.id === e.candidateId)).length}/${batch.length}`
      )

      // Pause between batches
      if (i + BATCH_SIZE < candidates.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS))
      }
    }

    metrics.endTime = new Date()
    const durationMs = metrics.endTime.getTime() - metrics.startTime.getTime()
    const durationSec = (durationMs / 1000).toFixed(1)

    // Final report
    console.log("\n" + "=".repeat(60))
    console.log("PROMOTION COMPLETE")
    console.log("=".repeat(60))
    console.log(`Duration: ${durationSec} seconds`)
    console.log(`Processed: ${metrics.processed}/${metrics.totalEligible}`)
    console.log(`Promoted: ${metrics.promoted}`)
    console.log(`Failed: ${metrics.failed}`)

    console.log("\n--- BY DOMAIN ---")
    for (const [domain, stats] of Object.entries(metrics.byDomain).sort(
      (a, b) => b[1].promoted - a[1].promoted
    )) {
      console.log(`  ${domain}: ${stats.promoted}/${stats.processed} promoted`)
    }

    if (metrics.errors.length > 0) {
      console.log("\n--- ERRORS ---")
      for (const err of metrics.errors.slice(0, 10)) {
        console.log(`  ${err.candidateId}: ${err.error}`)
      }
    }

    // Post-flight counts
    const postCounts = await getCounts(pool)
    console.log("\n--- POST-FLIGHT COUNTS ---")
    console.log(`CandidateFacts: ${postCounts.candidateFacts}`)
    console.log(`Eligible for promotion: ${postCounts.promotionCandidates}`)
    console.log(`Already promoted: ${postCounts.alreadyPromoted}`)
    console.log(`RuleFacts: ${postCounts.ruleFacts}`)

    await pool.end()
    process.exit(metrics.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error("\nFATAL ERROR:", error)
    await pool.end()
    process.exit(1)
  }
}

void main()
