// src/lib/admin/feature-contracts.ts
/**
 * Feature Contract Enforcement
 *
 * Defines Type A features (contracted, must exist in production) and their
 * required database tables. Type A features are production invariants - if
 * tables are missing, deployment has failed.
 *
 * Type A: Contracted - tables must exist, missing = deployment defect
 * Type B: Optional - graceful degradation allowed
 *
 * This module:
 * 1. Defines Type A features and their required tables
 * 2. Verifies table existence at startup
 * 3. Logs CRITICAL errors for missing Type A tables in production
 */

import { drizzleDb } from "@/lib/db/drizzle"
import { sql } from "drizzle-orm"
import { logger } from "@/lib/logger"

const featureLogger = logger.child({ context: "feature-contracts" })

/**
 * Type A feature definitions.
 *
 * Each feature lists the database tables it requires. If any table is
 * missing when the feature is enabled, it's a deployment defect.
 */
export const TYPE_A_FEATURES = {
  news: {
    name: "News",
    description: "News and content publishing system",
    requiredTables: ["news_posts", "news_categories", "news_items", "news_sources"],
    envFlag: "NEWS_TYPE_A", // Set to "true" to enforce as Type A
  },
} as const

export type FeatureId = keyof typeof TYPE_A_FEATURES

export interface FeatureContractResult {
  featureId: FeatureId
  name: string
  enabled: boolean
  healthy: boolean
  missingTables: string[]
}

/**
 * Check if a table exists in the database.
 */
async function tableExists(tableName: string): Promise<boolean> {
  const result = await drizzleDb.execute(
    sql`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ) as exists`
  )
  return result.rows[0]?.exists === true
}

/**
 * Check if a Type A feature is enabled via environment variable.
 *
 * Defaults to true in production (NEWS_TYPE_A not set = enabled).
 * This ensures Type A enforcement is the default unless explicitly disabled.
 */
function isFeatureTypeAEnabled(envFlag: string): boolean {
  const envValue = process.env[envFlag]

  // If explicitly set to "false", disable Type A enforcement
  if (envValue === "false" || envValue === "0") {
    return false
  }

  // In production, default to Type A enabled
  if (process.env.NODE_ENV === "production") {
    return true
  }

  // In development, only enforce if explicitly enabled
  return envValue === "true" || envValue === "1"
}

/**
 * Verify a single Type A feature contract.
 */
export async function verifyFeatureContract(featureId: FeatureId): Promise<FeatureContractResult> {
  const feature = TYPE_A_FEATURES[featureId]
  const enabled = isFeatureTypeAEnabled(feature.envFlag)

  if (!enabled) {
    return {
      featureId,
      name: feature.name,
      enabled: false,
      healthy: true, // Not enabled = not checked
      missingTables: [],
    }
  }

  const missingTables: string[] = []
  for (const table of feature.requiredTables) {
    if (!(await tableExists(table))) {
      missingTables.push(table)
    }
  }

  const healthy = missingTables.length === 0

  // Log CRITICAL error for missing Type A tables in production
  if (!healthy && process.env.NODE_ENV === "production") {
    featureLogger.error(
      {
        featureId,
        featureName: feature.name,
        missingTables,
        severity: "CRITICAL",
      },
      `[TYPE A CONTRACT VIOLATION] Feature "${feature.name}" is missing required tables: ${missingTables.join(", ")}. ` +
        "This is a deployment defect. Run migrations to fix."
    )
  }

  return {
    featureId,
    name: feature.name,
    enabled,
    healthy,
    missingTables,
  }
}

/**
 * Verify all Type A feature contracts.
 *
 * Returns overall health status and individual feature results.
 */
export async function verifyAllFeatureContracts(): Promise<{
  allHealthy: boolean
  features: FeatureContractResult[]
}> {
  const features: FeatureContractResult[] = []
  let allHealthy = true

  for (const featureId of Object.keys(TYPE_A_FEATURES) as FeatureId[]) {
    const result = await verifyFeatureContract(featureId)
    features.push(result)
    if (result.enabled && !result.healthy) {
      allHealthy = false
    }
  }

  return { allHealthy, features }
}

/**
 * Run Type A contract verification at startup.
 *
 * Call this during application initialization to detect deployment defects early.
 * In production, missing Type A tables will log CRITICAL errors.
 */
export async function runStartupContractVerification(): Promise<void> {
  featureLogger.info("Running Type A feature contract verification...")

  try {
    const { allHealthy, features } = await verifyAllFeatureContracts()

    const enabledFeatures = features.filter((f) => f.enabled)
    const unhealthyFeatures = enabledFeatures.filter((f) => !f.healthy)

    if (enabledFeatures.length === 0) {
      featureLogger.info("No Type A features enabled")
      return
    }

    if (allHealthy) {
      featureLogger.info(
        { features: enabledFeatures.map((f) => f.name) },
        `All Type A feature contracts satisfied: ${enabledFeatures.map((f) => f.name).join(", ")}`
      )
    } else {
      // Already logged CRITICAL for each unhealthy feature in verifyFeatureContract
      featureLogger.error(
        {
          unhealthyFeatures: unhealthyFeatures.map((f) => ({
            name: f.name,
            missingTables: f.missingTables,
          })),
          severity: "CRITICAL",
        },
        `Type A contract verification FAILED: ${unhealthyFeatures.length} feature(s) have missing tables`
      )
    }
  } catch (error) {
    featureLogger.error(
      { error, severity: "CRITICAL" },
      "Failed to run Type A contract verification - database may be unavailable"
    )
  }
}
