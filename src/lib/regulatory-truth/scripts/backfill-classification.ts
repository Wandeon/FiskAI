// src/lib/regulatory-truth/scripts/backfill-classification.ts

/**
 * Backfill existing DiscoveredItems with adaptive sentinel classification.
 *
 * Usage:
 *   npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts
 *   npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts --dry-run
 */

import { NodeType, FreshnessRisk } from "@prisma/client"
import { db } from "@/lib/db"
import { classifyUrl, calculateNextScan } from "../utils/adaptive-sentinel"

const BATCH_SIZE = 100

interface DiscoveredItemRow {
  id: string
  url: string
  nodeType: NodeType
  freshnessRisk: FreshnessRisk
}

async function backfillClassification(dryRun: boolean = false): Promise<void> {
  console.log(`[backfill] Starting classification backfill (dry-run: ${dryRun})`)

  // Count total items
  const totalCount = await db.discoveredItem.count()
  console.log(`[backfill] Total items to process: ${totalCount}`)

  let processed = 0
  let updated = 0
  let skipped = 0
  let cursor: string | undefined = undefined

  while (true) {
    // Fetch batch
    const items: DiscoveredItemRow[] = await db.discoveredItem.findMany({
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
      select: {
        id: true,
        url: true,
        nodeType: true,
        freshnessRisk: true,
      },
    })

    if (items.length === 0) break

    for (const item of items) {
      processed++

      // Skip if already classified (has non-default values)
      // Default is LEAF for nodeType, MEDIUM for freshnessRisk
      const alreadyClassified = item.nodeType !== "LEAF" || item.freshnessRisk !== "MEDIUM"

      if (alreadyClassified) {
        skipped++
        continue
      }

      // Classify the URL
      const classification = classifyUrl(item.url)

      // Calculate initial schedule (neutral velocity = 0.5)
      const nextScanDue = calculateNextScan(0.5, classification.freshnessRisk)

      if (!dryRun) {
        await db.discoveredItem.update({
          where: { id: item.id },
          data: {
            nodeType: classification.nodeType,
            nodeRole: classification.nodeRole,
            freshnessRisk: classification.freshnessRisk,
            changeFrequency: 0.5,
            scanCount: 0,
            nextScanDue,
          },
        })
      }

      updated++

      // Log classification for interesting cases
      if (classification.freshnessRisk === "CRITICAL") {
        console.log(
          `[backfill] CRITICAL: ${item.url} -> ${classification.nodeType}/${classification.nodeRole}`
        )
      }
    }

    // Progress logging
    if (processed % 500 === 0) {
      console.log(
        `[backfill] Progress: ${processed}/${totalCount} (${updated} updated, ${skipped} skipped)`
      )
    }

    cursor = items[items.length - 1]?.id
  }

  console.log(`\n[backfill] Complete!`)
  console.log(`  Total processed: ${processed}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped (already classified): ${skipped}`)

  if (dryRun) {
    console.log(`\n[backfill] This was a dry run. No changes were made.`)
    console.log(`[backfill] Run without --dry-run to apply changes.`)
  }
}

// Main
const dryRun = process.argv.includes("--dry-run")
backfillClassification(dryRun)
  .then(() => {
    console.log("[backfill] Done")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[backfill] Error:", error)
    process.exit(1)
  })
