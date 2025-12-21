// src/lib/regulatory-truth/scripts/run-extractor.ts

import { config } from "dotenv"
import { Pool } from "pg"
import { runExtractor } from "../agents/extractor"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

// Create pool for direct SQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

/**
 * Run Extractor agent on evidence records
 */
async function main() {
  const args = process.argv.slice(2)
  const evidenceId = args[0]

  const client = await pool.connect()
  try {
    if (evidenceId) {
      // Run on specific evidence
      console.log(`[extractor] Running on evidence: ${evidenceId}`)

      const result = await client.query(
        `SELECT id, "sourceId", url FROM "Evidence" WHERE id = $1`,
        [evidenceId]
      )

      if (result.rows.length === 0) {
        console.error(`[extractor] Evidence not found: ${evidenceId}`)
        process.exit(1)
      }

      const extractorResult = await runExtractor(evidenceId)
      console.log("[extractor] Result:", JSON.stringify(extractorResult, null, 2))

      process.exit(extractorResult.success ? 0 : 1)
    } else {
      // Run on all unprocessed evidence
      console.log("[extractor] Running on unprocessed evidence...")

      // Find evidence that has no source pointers yet
      const result = await client.query(
        `SELECT e.id, e."sourceId", e.url, s.slug, s.name
         FROM "Evidence" e
         JOIN "RegulatorySource" s ON e."sourceId" = s.id
         WHERE NOT EXISTS (
           SELECT 1 FROM "SourcePointer" sp WHERE sp."evidenceId" = e.id
         )
         ORDER BY e."fetchedAt" DESC
         LIMIT 50`
      )

      const unprocessedEvidence = result.rows
      console.log(`[extractor] Found ${unprocessedEvidence.length} unprocessed evidence records`)

      let success = 0
      let failed = 0
      let totalPointers = 0

      for (const evidence of unprocessedEvidence) {
        console.log(`\n[extractor] Processing: ${evidence.slug} (${evidence.id})`)

        try {
          const extractorResult = await runExtractor(evidence.id)

          if (extractorResult.success) {
            success++
            totalPointers += extractorResult.sourcePointerIds.length
            console.log(
              `[extractor] ✓ Extracted ${extractorResult.sourcePointerIds.length} data points`
            )
          } else {
            failed++
            console.log(`[extractor] ✗ ${extractorResult.error}`)
          }
        } catch (error) {
          failed++
          console.error(`[extractor] ✗ ${error}`)
        }

        // Rate limiting - wait 3 seconds between extractions
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      console.log(
        `\n[extractor] Complete: ${success} success, ${failed} failed, ${totalPointers} total pointers`
      )
      process.exit(failed > 0 ? 1 : 0)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(async (error) => {
  console.error("[extractor] Fatal error:", error)
  await pool.end()
  process.exit(1)
})
