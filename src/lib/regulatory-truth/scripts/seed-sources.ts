// src/lib/regulatory-truth/scripts/seed-sources.ts

import { config } from "dotenv"
import { Pool } from "pg"
import { REGULATORY_SOURCES } from "../data/sources"
import { randomBytes } from "crypto"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

// Create pool for direct SQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Generate cuid-like ID
function generateId(): string {
  return randomBytes(12).toString("base64url").slice(0, 24)
}

/**
 * Seed the RegulatorySource table with initial sources
 */
export async function seedRegulatorySources(): Promise<{
  created: number
  skipped: number
  errors: string[]
}> {
  let created = 0
  let skipped = 0
  const errors: string[] = []

  console.log(`[seed] Seeding ${REGULATORY_SOURCES.length} regulatory sources...`)

  const client = await pool.connect()
  try {
    for (const source of REGULATORY_SOURCES) {
      try {
        // Check if source already exists
        const existing = await client.query(`SELECT id FROM "RegulatorySource" WHERE slug = $1`, [
          source.slug,
        ])

        if (existing.rows.length > 0) {
          console.log(`[seed] Skipping existing source: ${source.slug}`)
          skipped++
          continue
        }

        // Create new source
        const id = generateId()
        const now = new Date()
        await client.query(
          `INSERT INTO "RegulatorySource" (id, slug, name, url, hierarchy, "fetchIntervalHours", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            source.slug,
            source.name,
            source.url,
            source.hierarchy,
            source.fetchIntervalHours,
            true,
            now,
            now,
          ]
        )

        console.log(`[seed] Created source: ${source.slug}`)
        created++
      } catch (error) {
        const errorMsg = `Failed to seed ${source.slug}: ${error}`
        console.error(`[seed] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
  } finally {
    client.release()
  }

  console.log(`[seed] Complete: ${created} created, ${skipped} skipped, ${errors.length} errors`)

  return { created, skipped, errors }
}

// CLI runner
if (require.main === module) {
  seedRegulatorySources()
    .then(async (result) => {
      console.log("[seed] Result:", result)
      await pool.end()
      process.exit(result.errors.length > 0 ? 1 : 0)
    })
    .catch(async (error) => {
      console.error("[seed] Fatal error:", error)
      await pool.end()
      process.exit(1)
    })
}
