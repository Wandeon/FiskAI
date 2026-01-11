// src/lib/admin/runtime-capabilities.ts
import "server-only"
import { drizzleDb } from "@/lib/db/drizzle"
import { sql } from "drizzle-orm"

/**
 * Runtime capability detection for admin pages.
 *
 * Uses information_schema to detect table existence without querying data.
 * This allows pages to render gracefully when optional features are not deployed.
 */

/**
 * Check if a table exists in the current database schema.
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
 * Required tables for News feature:
 * - news_posts: Core content table for news articles
 * - news_categories: Category taxonomy for news
 */
const NEWS_REQUIRED_TABLES = ["news_posts", "news_categories"] as const

/**
 * Required tables for Content Automation (Regulatory Truth) feature:
 * - ArticleJob: Prisma model for article generation pipeline
 * - content_sync_events: Drizzle table for content sync queue
 */
const CONTENT_AUTOMATION_REQUIRED_TABLES = ["ArticleJob", "content_sync_events"] as const

export interface CapabilityResult {
  available: boolean
  missingTables: string[]
}

/**
 * Check if News tables are available.
 *
 * @returns { available: true } if all required tables exist
 * @returns { available: false, missingTables: [...] } if any tables are missing
 */
export async function hasNewsTables(): Promise<CapabilityResult> {
  const missing: string[] = []

  for (const table of NEWS_REQUIRED_TABLES) {
    if (!(await tableExists(table))) {
      missing.push(table)
    }
  }

  return {
    available: missing.length === 0,
    missingTables: missing,
  }
}

/**
 * Check if Regulatory Truth / Content Automation tables are available.
 *
 * @returns { available: true } if all required tables exist
 * @returns { available: false, missingTables: [...] } if any tables are missing
 */
export async function hasRegulatoryTruthTables(): Promise<CapabilityResult> {
  const missing: string[] = []

  for (const table of CONTENT_AUTOMATION_REQUIRED_TABLES) {
    if (!(await tableExists(table))) {
      missing.push(table)
    }
  }

  return {
    available: missing.length === 0,
    missingTables: missing,
  }
}

/**
 * Table requirement constants for display purposes.
 */
export const NEWS_TABLES = NEWS_REQUIRED_TABLES
export const CONTENT_AUTOMATION_TABLES = CONTENT_AUTOMATION_REQUIRED_TABLES
