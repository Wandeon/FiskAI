# Adaptive Sentinel Phase 4: Backfill Script

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create a script to backfill existing DiscoveredItems with classification data.

**Architecture:** Batch processing with progress logging. Classifies URLs and sets initial velocity/schedule.

**Tech Stack:** TypeScript, Prisma, existing classifier

---

## Task 1: Create Backfill Script

**Files:**

- Create: `src/lib/regulatory-truth/scripts/backfill-classification.ts`

**Step 1: Create the backfill script**

```typescript
// src/lib/regulatory-truth/scripts/backfill-classification.ts

/**
 * Backfill existing DiscoveredItems with adaptive sentinel classification.
 *
 * Usage:
 *   npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts
 *   npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts --dry-run
 */

import { db } from "@/lib/db"
import { classifyUrl, calculateNextScan } from "../utils/adaptive-sentinel"

const BATCH_SIZE = 100

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
    const items = await db.discoveredItem.findMany({
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/scripts/backfill-classification.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/scripts/backfill-classification.ts
git commit -m "feat: add backfill script for classification data"
```

---

## Task 2: Create Verification Script

**Files:**

- Create: `src/lib/regulatory-truth/scripts/verify-classification.ts`

**Step 1: Create the verification script**

```typescript
// src/lib/regulatory-truth/scripts/verify-classification.ts

/**
 * Verify classification distribution after backfill.
 *
 * Usage:
 *   npx tsx src/lib/regulatory-truth/scripts/verify-classification.ts
 */

import { db } from "@/lib/db"

async function verifyClassification(): Promise<void> {
  console.log("[verify] Checking classification distribution...\n")

  // Count by nodeType
  const nodeTypeCounts = await db.discoveredItem.groupBy({
    by: ["nodeType"],
    _count: { id: true },
  })

  console.log("=== Node Types ===")
  for (const row of nodeTypeCounts) {
    console.log(`  ${row.nodeType}: ${row._count.id}`)
  }

  // Count by nodeRole
  const nodeRoleCounts = await db.discoveredItem.groupBy({
    by: ["nodeRole"],
    _count: { id: true },
  })

  console.log("\n=== Node Roles ===")
  for (const row of nodeRoleCounts) {
    console.log(`  ${row.nodeRole || "(none)"}: ${row._count.id}`)
  }

  // Count by freshnessRisk
  const riskCounts = await db.discoveredItem.groupBy({
    by: ["freshnessRisk"],
    _count: { id: true },
  })

  console.log("\n=== Freshness Risk ===")
  for (const row of riskCounts) {
    console.log(`  ${row.freshnessRisk}: ${row._count.id}`)
  }

  // Count items due now
  const dueNow = await db.discoveredItem.count({
    where: { nextScanDue: { lte: new Date() } },
  })

  console.log(`\n=== Scheduling ===`)
  console.log(`  Due now: ${dueNow}`)

  // Sample some CRITICAL items
  const criticalItems = await db.discoveredItem.findMany({
    where: { freshnessRisk: "CRITICAL" },
    take: 5,
    select: { url: true, nodeType: true, nodeRole: true },
  })

  console.log("\n=== Sample CRITICAL Items ===")
  for (const item of criticalItems) {
    console.log(`  ${item.nodeType}/${item.nodeRole}: ${item.url}`)
  }

  console.log("\n[verify] Done")
}

verifyClassification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[verify] Error:", error)
    process.exit(1)
  })
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/scripts/verify-classification.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/scripts/verify-classification.ts
git commit -m "feat: add verification script for classification data"
```

---

## Verification

After all tasks, test the scripts:

```bash
# Dry run first
npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts --dry-run

# If dry run looks good, run for real
npx tsx src/lib/regulatory-truth/scripts/backfill-classification.ts

# Verify the results
npx tsx src/lib/regulatory-truth/scripts/verify-classification.ts
```

Expected output shows distribution across node types, roles, and risk levels.
