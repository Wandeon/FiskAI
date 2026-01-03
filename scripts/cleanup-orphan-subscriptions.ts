#!/usr/bin/env npx tsx
/**
 * WebhookSubscription Orphan Cleanup
 *
 * Cleans up WebhookSubscription records that reference non-existent RegulatorySource IDs.
 * This handles the case where a source was deleted but the cascade didn't run (soft ref).
 *
 * Schedule this to run daily via cron or a scheduled job.
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphan-subscriptions.ts           # Dry run (report only)
 *   npx tsx scripts/cleanup-orphan-subscriptions.ts --fix     # Actually delete orphans
 */

import { db } from "@/lib/db"
import { dbReg } from "@/lib/db/regulatory"

const FIX_MODE = process.argv.includes("--fix")

interface OrphanSubscription {
  id: string
  sourceId: string
  provider: string
  webhookType: string
  createdAt: Date
}

async function findOrphanSubscriptions(): Promise<OrphanSubscription[]> {
  // Get all subscriptions with a sourceId
  const subscriptions = await db.webhookSubscription.findMany({
    where: { sourceId: { not: null } },
    select: {
      id: true,
      sourceId: true,
      provider: true,
      webhookType: true,
      createdAt: true,
    },
  })

  if (subscriptions.length === 0) {
    console.log("[cleanup] No subscriptions with sourceId found")
    return []
  }

  console.log(`[cleanup] Checking ${subscriptions.length} subscriptions...`)

  // Get all existing source IDs
  const existingSourceIds = new Set(
    (await dbReg.regulatorySource.findMany({ select: { id: true } })).map((s) => s.id)
  )

  // Find orphans
  const orphans: OrphanSubscription[] = []
  for (const sub of subscriptions) {
    if (sub.sourceId && !existingSourceIds.has(sub.sourceId)) {
      orphans.push({
        id: sub.id,
        sourceId: sub.sourceId,
        provider: sub.provider,
        webhookType: sub.webhookType,
        createdAt: sub.createdAt,
      })
    }
  }

  return orphans
}

async function cleanupOrphans(orphans: OrphanSubscription[]): Promise<number> {
  let cleaned = 0

  for (const orphan of orphans) {
    try {
      // First, delete any events associated with this subscription
      const deletedEvents = await db.webhookEvent.deleteMany({
        where: { subscriptionId: orphan.id },
      })

      if (deletedEvents.count > 0) {
        console.log(
          `  [cleanup] Deleted ${deletedEvents.count} events for subscription ${orphan.id}`
        )
      }

      // Then delete the subscription
      await db.webhookSubscription.delete({
        where: { id: orphan.id },
      })

      console.log(`  ✓ Deleted orphan subscription: ${orphan.id}`)
      cleaned++
    } catch (error) {
      console.error(`  ✗ Failed to delete ${orphan.id}:`, error)
    }
  }

  return cleaned
}

async function main() {
  console.log("🔍 WebhookSubscription Orphan Cleanup")
  console.log("=".repeat(50))
  console.log(`Mode: ${FIX_MODE ? "FIX (will delete orphans)" : "DRY RUN (report only)"}`)
  console.log()

  try {
    const orphans = await findOrphanSubscriptions()

    if (orphans.length === 0) {
      console.log("✅ No orphan subscriptions found")
      process.exit(0)
    }

    console.log(`\n⚠️  Found ${orphans.length} orphan subscriptions:\n`)

    for (const orphan of orphans) {
      console.log(
        `  - ${orphan.id}: ${orphan.provider}/${orphan.webhookType}` +
          ` (missing source: ${orphan.sourceId.slice(0, 8)}..., created: ${orphan.createdAt.toISOString().slice(0, 10)})`
      )
    }

    if (FIX_MODE) {
      console.log("\n🔧 Cleaning up orphans...")
      const cleaned = await cleanupOrphans(orphans)
      console.log(`\n✅ Cleaned up ${cleaned} of ${orphans.length} orphan subscriptions`)
    } else {
      console.log("\n💡 Run with --fix to delete these orphan subscriptions")
      console.log("   WARNING: This will also delete associated WebhookEvent records")
    }

    process.exit(FIX_MODE ? 0 : 1)
  } catch (error) {
    console.error("❌ Cleanup failed:", error)
    process.exit(2)
  } finally {
    await db.$disconnect()
    await dbReg.$disconnect()
  }
}

void main()
