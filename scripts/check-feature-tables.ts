#!/usr/bin/env npx tsx
/**
 * CI/CD Script: Verify Type A Feature Tables
 *
 * This script checks that all Type A feature tables exist in the database.
 * Run this after migrations to ensure deployment is healthy.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/check-feature-tables.ts
 *
 * Exit codes:
 *   0 - All Type A feature tables exist
 *   1 - One or more Type A feature tables are missing
 *   2 - Could not connect to database
 *
 * Options:
 *   --strict    Exit 1 if ANY feature is unhealthy (default in prod)
 *   --verbose   Show detailed output for each feature
 */

import { Client } from "pg"

// Type A feature definitions (keep in sync with src/lib/admin/feature-contracts.ts)
const TYPE_A_FEATURES = {
  news: {
    name: "News",
    requiredTables: ["news_posts", "news_categories", "news_items", "news_sources"],
    envFlag: "NEWS_TYPE_A",
  },
} as const

type FeatureId = keyof typeof TYPE_A_FEATURES

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    ) as exists`,
    [tableName]
  )
  return result.rows[0]?.exists === true
}

function isFeatureEnabled(envFlag: string): boolean {
  const envValue = process.env[envFlag]
  if (envValue === "false" || envValue === "0") return false
  // Default to enabled in production
  if (process.env.NODE_ENV === "production") return true
  return envValue === "true" || envValue === "1"
}

async function main() {
  const verbose = process.argv.includes("--verbose")
  const strict = process.argv.includes("--strict") || process.env.NODE_ENV === "production"

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set")
    process.exit(2)
  }

  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log("✅ Connected to database")
  } catch (error) {
    console.error("❌ Could not connect to database:", error)
    process.exit(2)
  }

  let allHealthy = true
  const results: Array<{
    featureId: string
    name: string
    enabled: boolean
    healthy: boolean
    missingTables: string[]
  }> = []

  for (const [featureId, feature] of Object.entries(TYPE_A_FEATURES)) {
    const enabled = isFeatureEnabled(feature.envFlag)
    const missingTables: string[] = []

    if (enabled) {
      for (const table of feature.requiredTables) {
        if (!(await tableExists(client, table))) {
          missingTables.push(table)
        }
      }
    }

    const healthy = missingTables.length === 0
    if (enabled && !healthy) allHealthy = false

    results.push({
      featureId,
      name: feature.name,
      enabled,
      healthy,
      missingTables,
    })
  }

  await client.end()

  // Output results
  console.log("\n=== Type A Feature Contract Verification ===\n")

  for (const result of results) {
    if (!result.enabled) {
      if (verbose) {
        console.log(`⏭️  ${result.name}: SKIPPED (not enabled via ${TYPE_A_FEATURES[result.featureId as FeatureId].envFlag})`)
      }
      continue
    }

    if (result.healthy) {
      console.log(`✅ ${result.name}: All ${TYPE_A_FEATURES[result.featureId as FeatureId].requiredTables.length} required tables exist`)
      if (verbose) {
        for (const table of TYPE_A_FEATURES[result.featureId as FeatureId].requiredTables) {
          console.log(`   ✓ ${table}`)
        }
      }
    } else {
      console.log(`❌ ${result.name}: MISSING TABLES`)
      for (const table of result.missingTables) {
        console.log(`   ✗ ${table}`)
      }
    }
  }

  console.log("")

  const enabledCount = results.filter((r) => r.enabled).length
  const unhealthyCount = results.filter((r) => r.enabled && !r.healthy).length

  if (enabledCount === 0) {
    console.log("ℹ️  No Type A features enabled. Nothing to verify.")
    process.exit(0)
  }

  if (allHealthy) {
    console.log(`✅ All ${enabledCount} enabled Type A feature(s) have their required tables.`)
    process.exit(0)
  } else {
    console.error(
      `\n❌ DEPLOYMENT DEFECT: ${unhealthyCount} Type A feature(s) are missing required tables.`
    )
    console.error("   Run migrations to fix: npm run db:migrate")

    if (strict) {
      console.error("\n   Exiting with error (--strict mode or production)")
      process.exit(1)
    } else {
      console.warn("\n   ⚠️  Not exiting with error (development mode, use --strict to enforce)")
      process.exit(0)
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(2)
})
