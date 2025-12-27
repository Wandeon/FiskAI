# Adaptive Sentinel Phase 3: Sentinel Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Integrate adaptive utilities into the sentinel agent with manifest-based scheduling and polite batching.

**Architecture:** Replace static loop with "Daily Manifest" query. Group by endpoint for rate limiting. Update velocity and schedule after each scan.

**Tech Stack:** TypeScript, Prisma, existing sentinel infrastructure

---

## Task 1: Add Manifest Query Function

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Add imports at top of file (after existing imports around line 23)**

```typescript
import {
  classifyUrl,
  applyRiskInheritance,
  updateVelocity,
  calculateNextScan,
} from "../utils/adaptive-sentinel"
```

**Step 2: Add manifest query function after the imports (around line 50)**

```typescript
/**
 * Fetch the "Daily Manifest" - URLs that are due for scanning.
 * Orders by freshnessRisk (CRITICAL first) then by nextScanDue.
 */
async function fetchDueItems(limit: number = 500): Promise<
  Array<{
    id: string
    url: string
    contentHash: string | null
    changeFrequency: number
    scanCount: number
    freshnessRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    endpointId: string
    endpoint: { domain: string; id: string }
  }>
> {
  const dueItems = await db.discoveredItem.findMany({
    where: {
      nextScanDue: { lte: new Date() },
      status: { in: ["PENDING", "FETCHED", "PROCESSED"] },
    },
    orderBy: [
      { freshnessRisk: "asc" }, // CRITICAL=first in enum order
      { nextScanDue: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      url: true,
      contentHash: true,
      changeFrequency: true,
      scanCount: true,
      freshnessRisk: true,
      endpointId: true,
      endpoint: {
        select: {
          domain: true,
          id: true,
        },
      },
    },
  })

  return dueItems
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): add manifest query for due items"
```

---

## Task 2: Add Group-by-Endpoint Helper

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Add groupBy helper after fetchDueItems function**

```typescript
/**
 * Group items by endpoint for rate-limited execution.
 */
function groupByEndpoint<T extends { endpointId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const existing = groups.get(item.endpointId) || []
    existing.push(item)
    groups.set(item.endpointId, existing)
  }
  return groups
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): add groupByEndpoint helper"
```

---

## Task 3: Add Adaptive Scan Function

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Add the adaptive scan function for single items**

```typescript
/**
 * Scan a single URL and update its velocity/schedule.
 * Returns true if content changed, false otherwise.
 */
async function scanAndUpdateItem(item: {
  id: string
  url: string
  contentHash: string | null
  changeFrequency: number
  scanCount: number
  freshnessRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}): Promise<{ changed: boolean; error?: string }> {
  try {
    console.log(`[sentinel:adaptive] Scanning: ${item.url}`)

    const response = await fetchWithRateLimit(item.url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const content = await response.text()
    const newHash = hashContent(content)
    const contentChanged = item.contentHash !== null && item.contentHash !== newHash

    // Update velocity using EWMA
    const velocityUpdate = updateVelocity(item.changeFrequency, item.scanCount, contentChanged)

    // Calculate next scan time
    const nextScanDue = calculateNextScan(velocityUpdate.newFrequency, item.freshnessRisk)

    // Update the item
    await db.discoveredItem.update({
      where: { id: item.id },
      data: {
        contentHash: newHash,
        changeFrequency: velocityUpdate.newFrequency,
        scanCount: { increment: 1 },
        lastChangedAt: velocityUpdate.lastChangedAt,
        nextScanDue,
        status: "FETCHED",
      },
    })

    if (contentChanged) {
      console.log(
        `[sentinel:adaptive] Content changed for ${item.url}, velocity: ${velocityUpdate.newFrequency.toFixed(2)}`
      )
    }

    return { changed: contentChanged }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[sentinel:adaptive] Error scanning ${item.url}: ${errorMessage}`)

    // On error, push back the next scan by 1 hour
    const nextScanDue = new Date()
    nextScanDue.setHours(nextScanDue.getHours() + 1)

    await db.discoveredItem.update({
      where: { id: item.id },
      data: {
        nextScanDue,
        errorMessage,
      },
    })

    return { changed: false, error: errorMessage }
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): add scanAndUpdateItem with velocity tracking"
```

---

## Task 4: Add Polite Batch Processor

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Add batch processor with rate limiting**

```typescript
/**
 * Process a batch of items for a single endpoint with rate limiting.
 * Max 2 concurrent requests, 2-5 second delay between.
 */
async function processBatchPolitely(
  items: Array<{
    id: string
    url: string
    contentHash: string | null
    changeFrequency: number
    scanCount: number
    freshnessRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  }>,
  config: { delayMinMs: number; delayMaxMs: number }
): Promise<{ scanned: number; changed: number; errors: number }> {
  let scanned = 0
  let changed = 0
  let errors = 0

  for (const item of items) {
    // Add random delay between requests
    if (scanned > 0) {
      await randomDelay(config.delayMinMs, config.delayMaxMs)
    }

    const result = await scanAndUpdateItem(item)
    scanned++

    if (result.error) {
      errors++
    } else if (result.changed) {
      changed++
    }
  }

  return { scanned, changed, errors }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): add polite batch processor with rate limiting"
```

---

## Task 5: Add Main Adaptive Sentinel Runner

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Add the main adaptive runner function (at end of file before final export)**

```typescript
export interface AdaptiveSentinelResult {
  success: boolean
  itemsScanned: number
  itemsChanged: number
  errors: number
  endpointsProcessed: number
}

/**
 * Run the adaptive sentinel cycle.
 *
 * 1. Fetch "due" items from the manifest
 * 2. Group by endpoint for rate limiting
 * 3. Process each group politely
 * 4. Update velocity and schedule for each item
 */
export async function runAdaptiveSentinel(
  config: Partial<SentinelConfig> = {}
): Promise<AdaptiveSentinelResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  const result: AdaptiveSentinelResult = {
    success: true,
    itemsScanned: 0,
    itemsChanged: 0,
    errors: 0,
    endpointsProcessed: 0,
  }

  try {
    console.log("[sentinel:adaptive] Starting adaptive scan cycle...")

    // 1. Fetch due items
    const dueItems = await fetchDueItems(mergedConfig.maxItemsPerRun)
    console.log(`[sentinel:adaptive] Found ${dueItems.length} items due for scanning`)

    if (dueItems.length === 0) {
      console.log("[sentinel:adaptive] No items due, cycle complete")
      return result
    }

    // 2. Group by endpoint
    const batches = groupByEndpoint(dueItems)
    console.log(`[sentinel:adaptive] Grouped into ${batches.size} endpoint batches`)

    // 3. Process each batch
    for (const [endpointId, items] of batches) {
      const domain = items[0]?.endpoint.domain || "unknown"
      console.log(`[sentinel:adaptive] Processing ${items.length} items for ${domain}`)

      const batchResult = await processBatchPolitely(items, {
        delayMinMs: mergedConfig.delayMinMs,
        delayMaxMs: mergedConfig.delayMaxMs,
      })

      result.itemsScanned += batchResult.scanned
      result.itemsChanged += batchResult.changed
      result.errors += batchResult.errors
      result.endpointsProcessed++
    }

    console.log(
      `[sentinel:adaptive] Cycle complete: ${result.itemsScanned} scanned, ${result.itemsChanged} changed, ${result.errors} errors`
    )
  } catch (error) {
    result.success = false
    console.error("[sentinel:adaptive] Cycle failed:", error)
  }

  return result
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): add runAdaptiveSentinel main entry point"
```

---

## Task 6: Update Discovery to Use Classifier

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Find the DiscoveredItem creation in processEndpoint (around line 455-465)**

Replace the create call with classification:

```typescript
// In processEndpoint function, find this block:
// await db.discoveredItem.create({
//   data: {
//     endpointId: endpoint.id,
//     url: item.url,
//     title: item.title,
//     publishedAt: item.date ? new Date(item.date) : null,
//     status: "PENDING",
//   },
// })

// Replace with:
const classification = classifyUrl(item.url)
await db.discoveredItem.create({
  data: {
    endpointId: endpoint.id,
    url: item.url,
    title: item.title,
    publishedAt: item.date ? new Date(item.date) : null,
    status: "PENDING",
    // New adaptive fields
    nodeType: classification.nodeType,
    nodeRole: classification.nodeRole,
    freshnessRisk: classification.freshnessRisk,
    changeFrequency: 0.5, // Start neutral
    scanCount: 0,
    nextScanDue: new Date(), // Due immediately
  },
})
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(sentinel): use classifier when creating discovered items"
```

---

## Task 7: Add CLI Runner for Adaptive Mode

**Files:**

- Modify: `src/lib/regulatory-truth/scripts/run-sentinel.ts`

**Step 1: Add adaptive mode to the CLI runner**

Add after existing runSentinel call logic:

```typescript
// Check for --adaptive flag
const useAdaptive = process.argv.includes("--adaptive")

if (useAdaptive) {
  console.log("Running in ADAPTIVE mode...")
  const { runAdaptiveSentinel } = await import("../agents/sentinel")
  const result = await runAdaptiveSentinel()

  console.log("\n=== Adaptive Sentinel Results ===")
  console.log(`Success: ${result.success}`)
  console.log(`Items scanned: ${result.itemsScanned}`)
  console.log(`Items changed: ${result.itemsChanged}`)
  console.log(`Errors: ${result.errors}`)
  console.log(`Endpoints processed: ${result.endpointsProcessed}`)

  process.exit(result.success ? 0 : 1)
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/run-sentinel.ts
git commit -m "feat(cli): add --adaptive flag to sentinel runner"
```

---

## Verification

After all tasks, run:

```bash
npx tsc --noEmit && echo "TypeScript valid"
```

Test the adaptive sentinel:

```bash
npx tsx src/lib/regulatory-truth/scripts/run-sentinel.ts --adaptive
```
