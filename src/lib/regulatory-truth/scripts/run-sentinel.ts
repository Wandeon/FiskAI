// src/lib/regulatory-truth/scripts/run-sentinel.ts

import { config } from "dotenv"
import { Pool } from "pg"
import { runSentinel } from "../agents/sentinel"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

// Create pool for direct SQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

/**
 * Run Sentinel agent on a specific source or all active sources
 */
async function main() {
  const args = process.argv.slice(2)
  const sourceSlug = args[0]

  const client = await pool.connect()
  try {
    if (sourceSlug) {
      // Run on specific source
      console.log(`[sentinel] Running on source: ${sourceSlug}`)

      const result = await client.query(
        `SELECT id, slug, name FROM "RegulatorySource" WHERE slug = $1`,
        [sourceSlug]
      )

      if (result.rows.length === 0) {
        console.error(`[sentinel] Source not found: ${sourceSlug}`)
        process.exit(1)
      }

      const source = result.rows[0]
      const sentinelResult = await runSentinel(source.id)
      console.log("[sentinel] Result:", JSON.stringify(sentinelResult, null, 2))

      process.exit(sentinelResult.success ? 0 : 1)
    } else {
      // Run on all active sources that need updating
      console.log("[sentinel] Running on all active sources...")

      const result = await client.query(
        `SELECT id, slug, name
         FROM "RegulatorySource"
         WHERE "isActive" = true
         ORDER BY COALESCE("lastFetchedAt", '1970-01-01'::timestamp) ASC`
      )

      const sources = result.rows
      console.log(`[sentinel] Found ${sources.length} active sources`)

      let success = 0
      let failed = 0
      let changed = 0

      for (const source of sources) {
        console.log(`\n[sentinel] Processing: ${source.slug}`)

        try {
          const sentinelResult = await runSentinel(source.id)

          if (sentinelResult.success) {
            success++
            if (sentinelResult.hasChanged) {
              changed++
              console.log(`[sentinel] ✓ ${source.slug} - CHANGED`)
            } else {
              console.log(`[sentinel] ✓ ${source.slug} - no change`)
            }
          } else {
            failed++
            console.log(`[sentinel] ✗ ${source.slug} - ${sentinelResult.error}`)
          }
        } catch (error) {
          failed++
          console.error(`[sentinel] ✗ ${source.slug} - ${error}`)
        }

        // Rate limiting - wait 2 seconds between requests
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      console.log(`\n[sentinel] Complete: ${success} success, ${failed} failed, ${changed} changed`)
      process.exit(failed > 0 ? 1 : 0)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(async (error) => {
  console.error("[sentinel] Fatal error:", error)
  await pool.end()
  process.exit(1)
})
