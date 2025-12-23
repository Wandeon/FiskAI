# Regulatory Truth Layer Autonomy Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Regulatory Truth Layer fully autonomous - daily runs achieve GO verdict without human intervention.

**Architecture:** BullMQ workers process queues continuously. Sentinel discovers URLs, Fetcher creates Evidence, Extractor creates SourcePointers, Composer creates Rules, Reviewer approves (auto for T2/T3, human for T0/T1), Arbiter resolves conflicts, Releaser publishes. Self-healing repairs hash mismatches before validation.

**Tech Stack:** TypeScript, BullMQ, Prisma, PostgreSQL, Ollama LLM

**Current State:**

- 328 PENDING discovered items (not fetched)
- 26 rules stuck in PENDING_REVIEW
- Only 1 PUBLISHED rule
- E2E harness achieves GO but pipeline is stalled

---

## Phase 1: Unblock Pipeline

### Task 1.1: Create Pipeline Drain Script

**Files:**

- Create: `src/lib/regulatory-truth/scripts/drain-pipeline.ts`

**Step 1: Write the pipeline drain script**

```typescript
#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/drain-pipeline.ts
// Drains all pending work through the full pipeline

import { db } from "@/lib/db"
import { fetchDiscoveredItems } from "../agents/sentinel"
import { runExtractorBatch } from "../agents/extractor"
import { runComposerBatch } from "../agents/composer"
import { autoApproveEligibleRules } from "../agents/reviewer"
import { runArbiterBatch } from "../agents/arbiter"
import { runReleaser } from "../agents/releaser"

interface DrainResult {
  phase: string
  success: boolean
  metrics: Record<string, number>
  duration: number
}

async function drainPhase(
  name: string,
  fn: () => Promise<Record<string, number>>
): Promise<DrainResult> {
  const start = Date.now()
  console.log(`\n=== DRAINING: ${name} ===`)

  try {
    const metrics = await fn()
    const duration = Date.now() - start
    console.log(`[${name}] Complete in ${duration}ms:`, metrics)
    return { phase: name, success: true, metrics, duration }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[${name}] FAILED:`, error)
    return { phase: name, success: false, metrics: {}, duration }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function drainPipeline(options?: {
  maxFetchBatches?: number
  maxExtractorBatches?: number
  batchDelay?: number
}): Promise<DrainResult[]> {
  const maxFetchBatches = options?.maxFetchBatches ?? 10
  const maxExtractorBatches = options?.maxExtractorBatches ?? 5
  const batchDelay = options?.batchDelay ?? 2000

  const results: DrainResult[] = []

  console.log("\n" + "=".repeat(72))
  console.log("           PIPELINE DRAIN - PROCESSING ALL PENDING WORK")
  console.log("=".repeat(72))

  // Get initial counts
  const initialCounts = {
    pending: await db.discoveredItem.count({ where: { status: "PENDING" } }),
    fetched: await db.discoveredItem.count({ where: { status: "FETCHED" } }),
    evidence: await db.evidence.count(),
    pointers: await db.sourcePointer.count(),
    rules: await db.regulatoryRule.count(),
    pendingReview: await db.regulatoryRule.count({ where: { status: "PENDING_REVIEW" } }),
    approved: await db.regulatoryRule.count({ where: { status: "APPROVED" } }),
    published: await db.regulatoryRule.count({ where: { status: "PUBLISHED" } }),
    conflicts: await db.regulatoryConflict.count({ where: { status: "OPEN" } }),
  }

  console.log("\nInitial state:", initialCounts)

  // Phase 1: Fetch all PENDING items (in batches)
  let totalFetched = 0
  for (let batch = 0; batch < maxFetchBatches; batch++) {
    const pendingCount = await db.discoveredItem.count({
      where: { status: "PENDING", retryCount: { lt: 3 } },
    })
    if (pendingCount === 0) break

    const result = await drainPhase(`fetch-batch-${batch + 1}`, async () => {
      const r = await fetchDiscoveredItems(50)
      totalFetched += r.fetched
      return { fetched: r.fetched, failed: r.failed, remaining: pendingCount - r.fetched }
    })
    results.push(result)

    if (result.metrics.fetched === 0) break
    await sleep(batchDelay)
  }

  // Phase 2: Extract from all unprocessed evidence (in batches)
  let totalExtracted = 0
  for (let batch = 0; batch < maxExtractorBatches; batch++) {
    const unprocessedCount = await db.evidence.count({ where: { sourcePointers: { none: {} } } })
    if (unprocessedCount === 0) break

    const result = await drainPhase(`extract-batch-${batch + 1}`, async () => {
      const r = await runExtractorBatch(10)
      totalExtracted += r.processed
      return { processed: r.processed, failed: r.failed, pointers: r.sourcePointerIds.length }
    })
    results.push(result)

    if (result.metrics.processed === 0) break
    await sleep(batchDelay)
  }

  // Phase 3: Compose rules from unlinked pointers
  results.push(
    await drainPhase("composer", async () => {
      const r = await runComposerBatch()
      return { success: r.success, failed: r.failed, totalRules: r.totalRules }
    })
  )

  // Phase 4: Auto-approve eligible T2/T3 rules
  // First, reduce grace period for initial drain
  const originalGrace = process.env.AUTO_APPROVE_GRACE_HOURS
  process.env.AUTO_APPROVE_GRACE_HOURS = "0" // No grace period for drain

  results.push(
    await drainPhase("auto-approve", async () => {
      const r = await autoApproveEligibleRules()
      return { approved: r.approved, skipped: r.skipped, errors: r.errors.length }
    })
  )

  // Restore original grace period
  if (originalGrace) {
    process.env.AUTO_APPROVE_GRACE_HOURS = originalGrace
  } else {
    delete process.env.AUTO_APPROVE_GRACE_HOURS
  }

  // Phase 5: Resolve conflicts
  results.push(
    await drainPhase("arbiter", async () => {
      const r = await runArbiterBatch(20)
      return {
        processed: r.processed,
        resolved: r.resolved,
        escalated: r.escalated,
        failed: r.failed,
      }
    })
  )

  // Phase 6: Release approved rules
  results.push(
    await drainPhase("releaser", async () => {
      const approvedRules = await db.regulatoryRule.findMany({
        where: { status: "APPROVED", releases: { none: {} } },
        select: { id: true },
      })

      if (approvedRules.length === 0) {
        return { released: 0, message: "No approved rules to release" }
      }

      const r = await runReleaser(approvedRules.map((rule) => rule.id))
      return { released: r.success ? 1 : 0, ruleCount: r.publishedRuleIds.length }
    })
  )

  // Get final counts
  const finalCounts = {
    pending: await db.discoveredItem.count({ where: { status: "PENDING" } }),
    fetched: await db.discoveredItem.count({ where: { status: "FETCHED" } }),
    evidence: await db.evidence.count(),
    pointers: await db.sourcePointer.count(),
    rules: await db.regulatoryRule.count(),
    pendingReview: await db.regulatoryRule.count({ where: { status: "PENDING_REVIEW" } }),
    approved: await db.regulatoryRule.count({ where: { status: "APPROVED" } }),
    published: await db.regulatoryRule.count({ where: { status: "PUBLISHED" } }),
    conflicts: await db.regulatoryConflict.count({ where: { status: "OPEN" } }),
  }

  console.log("\n" + "=".repeat(72))
  console.log("                      DRAIN COMPLETE")
  console.log("=".repeat(72))
  console.log("\nFinal state:", finalCounts)
  console.log("\nDelta:")
  console.log(`  - Fetched: ${totalFetched} items`)
  console.log(`  - Extracted: ${totalExtracted} evidence records`)
  console.log(`  - New pointers: ${finalCounts.pointers - initialCounts.pointers}`)
  console.log(
    `  - Rules pending → approved: ${initialCounts.pendingReview - finalCounts.pendingReview}`
  )
  console.log(`  - New published: ${finalCounts.published - initialCounts.published}`)

  return results
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2)
  const help = args.includes("--help") || args.includes("-h")

  if (help) {
    console.log(`
Pipeline Drain Script
=====================

Drains all pending work through the full regulatory pipeline.

Usage: npx tsx src/lib/regulatory-truth/scripts/drain-pipeline.ts [options]

Options:
  --fetch-batches N    Max fetch batches (default: 10)
  --extract-batches N  Max extractor batches (default: 5)
  --delay N            Delay between batches in ms (default: 2000)
  --help, -h           Show this help
`)
    process.exit(0)
  }

  const fetchBatches = parseInt(args.find((_, i, a) => a[i - 1] === "--fetch-batches") || "10")
  const extractBatches = parseInt(args.find((_, i, a) => a[i - 1] === "--extract-batches") || "5")
  const delay = parseInt(args.find((_, i, a) => a[i - 1] === "--delay") || "2000")

  await drainPipeline({
    maxFetchBatches: fetchBatches,
    maxExtractorBatches: extractBatches,
    batchDelay: delay,
  })

  process.exit(0)
}

main().catch((err) => {
  console.error("Drain failed:", err)
  process.exit(1)
})
```

**Step 2: Run the drain script**

Run: `npx tsx src/lib/regulatory-truth/scripts/drain-pipeline.ts --fetch-batches 5 --extract-batches 3`

Expected: Pipeline processes pending items, auto-approves T2/T3 rules, publishes approved rules.

**Step 3: Verify results**

Run: `docker exec fiskai-db psql -U fiskai -d fiskai -c "SELECT status, COUNT(*) FROM \"RegulatoryRule\" GROUP BY status"`

Expected: More PUBLISHED rules, fewer PENDING_REVIEW.

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/scripts/drain-pipeline.ts
git commit -m "feat(regulatory-truth): add pipeline drain script for initial unblock"
```

---

## Phase 2: 24/7 Continuous Processing

### Task 2.1: Create Continuous Pipeline Worker

**Files:**

- Create: `src/lib/regulatory-truth/workers/continuous-pipeline.ts`

**Step 1: Write the continuous pipeline worker**

```typescript
// src/lib/regulatory-truth/workers/continuous-pipeline.ts
// Continuous 24/7 pipeline processing with self-healing

import { db } from "@/lib/db"
import { fetchDiscoveredItems } from "../agents/sentinel"
import { runExtractorBatch } from "../agents/extractor"
import { runComposerBatch } from "../agents/composer"
import { autoApproveEligibleRules } from "../agents/reviewer"
import { runArbiterBatch } from "../agents/arbiter"
import { runReleaser } from "../agents/releaser"
import { runDataRepair } from "../e2e/data-repair"

interface PipelineStats {
  cycleCount: number
  lastCycleAt: Date | null
  fetched: number
  extracted: number
  composed: number
  approved: number
  released: number
  errors: number
}

const stats: PipelineStats = {
  cycleCount: 0,
  lastCycleAt: null,
  fetched: 0,
  extracted: 0,
  composed: 0,
  approved: 0,
  released: 0,
  errors: 0,
}

const CYCLE_DELAY_MS = parseInt(process.env.PIPELINE_CYCLE_DELAY_MS || "30000") // 30s between cycles
const PHASE_DELAY_MS = parseInt(process.env.PIPELINE_PHASE_DELAY_MS || "5000") // 5s between phases

let isRunning = false
let shouldStop = false

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runPipelineCycle(): Promise<void> {
  const cycleStart = Date.now()
  stats.cycleCount++
  stats.lastCycleAt = new Date()

  console.log(`\n[pipeline] === CYCLE ${stats.cycleCount} ===`)

  try {
    // Check queue depths
    const pending = await db.discoveredItem.count({
      where: { status: "PENDING", retryCount: { lt: 3 } },
    })
    const unextracted = await db.evidence.count({ where: { sourcePointers: { none: {} } } })
    const unlinkedPointers = await db.sourcePointer.count({ where: { rules: { none: {} } } })
    const pendingReview = await db.regulatoryRule.count({ where: { status: "PENDING_REVIEW" } })
    const approved = await db.regulatoryRule.count({
      where: { status: "APPROVED", releases: { none: {} } },
    })
    const openConflicts = await db.regulatoryConflict.count({ where: { status: "OPEN" } })

    console.log(
      `[pipeline] Queue depths: pending=${pending}, unextracted=${unextracted}, unlinked=${unlinkedPointers}, review=${pendingReview}, approved=${approved}, conflicts=${openConflicts}`
    )

    // Fetch phase (if items pending)
    if (pending > 0) {
      const result = await fetchDiscoveredItems(20)
      stats.fetched += result.fetched
      console.log(`[pipeline] Fetch: ${result.fetched} fetched, ${result.failed} failed`)
      await sleep(PHASE_DELAY_MS)
    }

    // Extract phase (if evidence needs processing)
    if (unextracted > 0) {
      const result = await runExtractorBatch(5)
      stats.extracted += result.processed
      console.log(`[pipeline] Extract: ${result.processed} processed, ${result.failed} failed`)
      await sleep(PHASE_DELAY_MS)
    }

    // Compose phase (if pointers need linking)
    if (unlinkedPointers > 0) {
      const result = await runComposerBatch()
      stats.composed += result.success
      console.log(`[pipeline] Compose: ${result.success} success, ${result.failed} failed`)
      await sleep(PHASE_DELAY_MS)
    }

    // Auto-approve phase (if rules pending review)
    if (pendingReview > 0) {
      const result = await autoApproveEligibleRules()
      stats.approved += result.approved
      console.log(`[pipeline] Approve: ${result.approved} approved, ${result.skipped} skipped`)
      await sleep(PHASE_DELAY_MS)
    }

    // Arbiter phase (if conflicts open)
    if (openConflicts > 0) {
      const result = await runArbiterBatch(5)
      console.log(
        `[pipeline] Arbiter: ${result.processed} processed, ${result.resolved} resolved, ${result.escalated} escalated`
      )
      await sleep(PHASE_DELAY_MS)
    }

    // Releaser phase (if rules approved)
    if (approved > 0) {
      const approvedRules = await db.regulatoryRule.findMany({
        where: { status: "APPROVED", releases: { none: {} } },
        select: { id: true },
        take: 20,
      })

      if (approvedRules.length > 0) {
        const result = await runReleaser(approvedRules.map((r) => r.id))
        if (result.success) {
          stats.released += result.publishedRuleIds.length
          console.log(`[pipeline] Release: ${result.publishedRuleIds.length} rules published`)
        }
      }
    }

    // Self-healing: repair hashes every 10 cycles
    if (stats.cycleCount % 10 === 0) {
      console.log(`[pipeline] Running self-healing data repair...`)
      const repairResult = await runDataRepair()
      if (repairResult.evidenceFixed > 0 || repairResult.releasesFixed > 0) {
        console.log(
          `[pipeline] Repaired ${repairResult.evidenceFixed} evidence, ${repairResult.releasesFixed} releases`
        )
      }
    }

    const cycleDuration = Date.now() - cycleStart
    console.log(`[pipeline] Cycle ${stats.cycleCount} complete in ${cycleDuration}ms`)
  } catch (error) {
    stats.errors++
    console.error(`[pipeline] Cycle ${stats.cycleCount} error:`, error)
  }
}

export async function startContinuousPipeline(): Promise<void> {
  if (isRunning) {
    console.log("[pipeline] Already running")
    return
  }

  isRunning = true
  shouldStop = false

  console.log("[pipeline] Starting continuous pipeline processing")
  console.log(`[pipeline] Cycle delay: ${CYCLE_DELAY_MS}ms, Phase delay: ${PHASE_DELAY_MS}ms`)

  while (!shouldStop) {
    await runPipelineCycle()
    await sleep(CYCLE_DELAY_MS)
  }

  isRunning = false
  console.log("[pipeline] Stopped")
}

export function stopContinuousPipeline(): void {
  console.log("[pipeline] Stopping...")
  shouldStop = true
}

export function getPipelineStats(): PipelineStats {
  return { ...stats }
}

// CLI entry point
if (require.main === module) {
  console.log("[pipeline] Starting as CLI...")

  process.on("SIGINT", () => {
    console.log("\n[pipeline] Received SIGINT, stopping gracefully...")
    stopContinuousPipeline()
  })

  process.on("SIGTERM", () => {
    console.log("\n[pipeline] Received SIGTERM, stopping gracefully...")
    stopContinuousPipeline()
  })

  startContinuousPipeline().catch((err) => {
    console.error("[pipeline] Fatal error:", err)
    process.exit(1)
  })
}
```

**Step 2: Test the continuous worker**

Run: `npx tsx src/lib/regulatory-truth/workers/continuous-pipeline.ts`

Expected: Worker runs cycles, processing queues continuously. Press Ctrl+C to stop gracefully.

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/workers/continuous-pipeline.ts
git commit -m "feat(regulatory-truth): add continuous 24/7 pipeline processing"
```

---

### Task 2.2: Add PM2 Process Configuration

**Files:**

- Create: `ecosystem.config.js` (if not exists)
- Modify: Add pipeline worker to PM2

**Step 1: Create/update PM2 config**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "fiskai-web",
      script: "npm",
      args: "start",
      cwd: "/home/admin/FiskAI",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "regulatory-pipeline",
      script: "npx",
      args: "tsx src/lib/regulatory-truth/workers/continuous-pipeline.ts",
      cwd: "/home/admin/FiskAI",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
        PIPELINE_CYCLE_DELAY_MS: "30000",
        PIPELINE_PHASE_DELAY_MS: "5000",
      },
    },
  ],
}
```

**Step 2: Start with PM2**

Run: `pm2 start ecosystem.config.js --only regulatory-pipeline`

**Step 3: Verify running**

Run: `pm2 status`

Expected: `regulatory-pipeline` shows as `online`.

**Step 4: Commit**

```bash
git add ecosystem.config.js
git commit -m "feat: add PM2 config for 24/7 pipeline worker"
```

---

## Phase 3: Baseline Backfill

### Task 3.1: Create Recursive Sitemap Scanner

**Files:**

- Create: `src/lib/regulatory-truth/scripts/baseline-backfill.ts`
- Modify: `src/lib/regulatory-truth/parsers/sitemap-parser.ts`

**Step 1: Enhance sitemap parser for sitemap indexes**

Add to `src/lib/regulatory-truth/parsers/sitemap-parser.ts`:

```typescript
/**
 * Parse sitemap index and return all child sitemap URLs
 */
export function parseSitemapIndex(content: string): string[] {
  const sitemapUrls: string[] = []

  // Match <sitemap><loc>...</loc></sitemap> entries
  const sitemapRegex = /<sitemap>\s*<loc>([^<]+)<\/loc>/gi
  let match

  while ((match = sitemapRegex.exec(content)) !== null) {
    sitemapUrls.push(match[1].trim())
  }

  return sitemapUrls
}

/**
 * Check if content is a sitemap index (contains <sitemapindex>)
 */
export function isSitemapIndex(content: string): boolean {
  return content.includes("<sitemapindex")
}
```

**Step 2: Create baseline backfill script**

```typescript
#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/baseline-backfill.ts
// Recursive sitemap scanning for historical regulatory data

import { db } from "@/lib/db"
import { fetchWithRateLimit } from "../utils/rate-limiter"
import {
  parseSitemap,
  parseSitemapIndex,
  isSitemapIndex,
  filterNNSitemaps,
} from "../parsers/sitemap-parser"

interface BackfillStats {
  sitemapsScanned: number
  urlsDiscovered: number
  urlsNew: number
  urlsDuplicate: number
  errors: string[]
}

const stats: BackfillStats = {
  sitemapsScanned: 0,
  urlsDiscovered: 0,
  urlsNew: 0,
  urlsDuplicate: 0,
  errors: [],
}

// Known sitemap entry points for Croatian regulatory sources
const SITEMAP_ENTRYPOINTS = [
  {
    domain: "narodne-novine.nn.hr",
    url: "https://narodne-novine.nn.hr/sitemap-index.xml",
    types: [1, 2],
  },
  { domain: "porezna-uprava.gov.hr", url: "https://www.porezna-uprava.gov.hr/sitemap.xml" },
  { domain: "hzzo.hr", url: "https://hzzo.hr/sitemap.xml" },
  { domain: "hzmo.hr", url: "https://www.hzmo.hr/sitemap.xml" },
  { domain: "mfin.gov.hr", url: "https://mfin.gov.hr/sitemap.xml" },
]

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function processUrl(
  endpointId: string,
  url: string,
  title: string | null,
  date: string | null
): Promise<boolean> {
  try {
    // Check if already exists
    const existing = await db.discoveredItem.findFirst({
      where: { endpointId, url },
    })

    if (existing) {
      stats.urlsDuplicate++
      return false
    }

    // Create new discovered item
    await db.discoveredItem.create({
      data: {
        endpointId,
        url,
        title,
        publishedAt: date ? new Date(date) : null,
        status: "PENDING",
      },
    })

    stats.urlsNew++
    return true
  } catch (error) {
    // Likely duplicate from race condition
    stats.urlsDuplicate++
    return false
  }
}

async function scanSitemap(
  domain: string,
  sitemapUrl: string,
  endpointId: string,
  options?: { types?: number[]; maxDepth?: number; currentDepth?: number }
): Promise<void> {
  const maxDepth = options?.maxDepth ?? 3
  const currentDepth = options?.currentDepth ?? 0

  if (currentDepth >= maxDepth) {
    console.log(`[backfill] Max depth reached for ${sitemapUrl}`)
    return
  }

  console.log(`[backfill] Scanning: ${sitemapUrl} (depth ${currentDepth})`)

  try {
    const response = await fetchWithRateLimit(sitemapUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const content = await response.text()
    stats.sitemapsScanned++

    // Check if this is a sitemap index
    if (isSitemapIndex(content)) {
      const childSitemaps = parseSitemapIndex(content)
      console.log(`[backfill] Found sitemap index with ${childSitemaps.length} child sitemaps`)

      for (const childUrl of childSitemaps) {
        await sleep(1000) // Rate limit
        await scanSitemap(domain, childUrl, endpointId, {
          ...options,
          currentDepth: currentDepth + 1,
        })
      }
    } else {
      // Regular sitemap - parse entries
      let entries = parseSitemap(content)

      // Apply NN-specific filtering if needed
      if (domain === "narodne-novine.nn.hr" && options?.types) {
        entries = filterNNSitemaps(entries, options.types)
      }

      console.log(`[backfill] Found ${entries.length} entries in ${sitemapUrl}`)
      stats.urlsDiscovered += entries.length

      // Process entries in batches
      for (const entry of entries) {
        await processUrl(endpointId, entry.url, null, entry.lastmod || null)
      }
    }
  } catch (error) {
    const msg = `Failed to scan ${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`
    stats.errors.push(msg)
    console.error(`[backfill] ${msg}`)
  }
}

export async function runBaselineBackfill(): Promise<BackfillStats> {
  console.log("\n" + "=".repeat(72))
  console.log("           BASELINE BACKFILL - RECURSIVE SITEMAP SCANNING")
  console.log("=".repeat(72))

  for (const entrypoint of SITEMAP_ENTRYPOINTS) {
    console.log(`\n[backfill] Processing: ${entrypoint.domain}`)

    // Find or create endpoint
    let endpoint = await db.discoveryEndpoint.findFirst({
      where: { domain: entrypoint.domain, path: "/sitemap.xml" },
    })

    if (!endpoint) {
      endpoint = await db.discoveryEndpoint.create({
        data: {
          domain: entrypoint.domain,
          path: "/sitemap.xml",
          name: `${entrypoint.domain} Sitemap`,
          endpointType: "SITEMAP",
          priority: "HIGH",
          scrapeFrequency: "DAILY",
          listingStrategy: "SITEMAP_XML",
          isActive: true,
        },
      })
      console.log(`[backfill] Created endpoint: ${endpoint.id}`)
    }

    await scanSitemap(entrypoint.domain, entrypoint.url, endpoint.id, {
      types: entrypoint.types,
    })

    await sleep(5000) // Rate limit between domains
  }

  console.log("\n" + "=".repeat(72))
  console.log("                    BACKFILL COMPLETE")
  console.log("=".repeat(72))
  console.log("\nStats:")
  console.log(`  Sitemaps scanned: ${stats.sitemapsScanned}`)
  console.log(`  URLs discovered: ${stats.urlsDiscovered}`)
  console.log(`  New items created: ${stats.urlsNew}`)
  console.log(`  Duplicates skipped: ${stats.urlsDuplicate}`)
  console.log(`  Errors: ${stats.errors.length}`)

  return stats
}

// CLI entry point
if (require.main === module) {
  runBaselineBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill failed:", err)
      process.exit(1)
    })
}
```

**Step 3: Run baseline backfill**

Run: `npx tsx src/lib/regulatory-truth/scripts/baseline-backfill.ts`

Expected: Recursively scans all sitemap indexes, discovers historical URLs.

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/parsers/sitemap-parser.ts src/lib/regulatory-truth/scripts/baseline-backfill.ts
git commit -m "feat(regulatory-truth): add baseline backfill with recursive sitemap scanning"
```

---

## Phase 4: Coverage Accounting

### Task 4.1: Create Coverage Metrics API

**Files:**

- Create: `src/lib/regulatory-truth/utils/coverage-metrics.ts`

**Step 1: Write coverage metrics module**

```typescript
// src/lib/regulatory-truth/utils/coverage-metrics.ts
// Live coverage accounting and saturation tracking

import { db } from "@/lib/db"

export interface CoverageMetrics {
  timestamp: string

  // Discovery layer
  discovery: {
    endpoints: { total: number; active: number; degraded: number; dead: number }
    items: { total: number; pending: number; fetched: number; processed: number; failed: number }
    saturationPercent: number
  }

  // Evidence layer
  evidence: {
    total: number
    byContentType: Record<string, number>
    unextracted: number
    extractionRate: number
  }

  // Pointer layer
  pointers: {
    total: number
    byDomain: Record<string, number>
    unlinked: number
    linkageRate: number
  }

  // Rule layer
  rules: {
    total: number
    byStatus: Record<string, number>
    byRiskTier: Record<string, number>
    publishedRate: number
  }

  // Conflict layer
  conflicts: {
    total: number
    open: number
    resolved: number
    escalated: number
    resolutionRate: number
  }

  // Release layer
  releases: {
    total: number
    latestVersion: string | null
    totalRulesPublished: number
  }

  // Health indicators
  health: {
    pipelineStalled: boolean
    queueBacklog: number
    oldestPendingAge: number | null // hours
    unresolvedConflictsOver7Days: number
  }
}

export async function collectCoverageMetrics(): Promise<CoverageMetrics> {
  const timestamp = new Date().toISOString()

  // Discovery metrics
  const endpointStats = await db.discoveryEndpoint.groupBy({
    by: ["isActive"],
    _count: true,
  })

  const itemStats = await db.discoveredItem.groupBy({
    by: ["status"],
    _count: true,
  })

  const totalItems = await db.discoveredItem.count()
  const processedItems = await db.discoveredItem.count({ where: { status: { in: ["FETCHED", "PROCESSED"] } } })

  // Evidence metrics
  const evidenceTotal = await db.evidence.count()
  const evidenceByType = await db.evidence.groupBy({
    by: ["contentType"],
    _count: true,
  })
  const unextractedEvidence = await db.evidence.count({ where: { sourcePointers: { none: {} } } })

  // Pointer metrics
  const pointerTotal = await db.sourcePointer.count()
  const pointersByDomain = await db.sourcePointer.groupBy({
    by: ["domain"],
    _count: true,
  })
  const unlinkedPointers = await db.sourcePointer.count({ where: { rules: { none: {} } } })

  // Rule metrics
  const ruleTotal = await db.regulatoryRule.count()
  const rulesByStatus = await db.regulatoryRule.groupBy({
    by: ["status"],
    _count: true,
  })
  const rulesByTier = await db.regulatoryRule.groupBy({
    by: ["riskTier"],
    _count: true,
  })
  const publishedRules = await db.regulatoryRule.count({ where: { status: "PUBLISHED" } })

  // Conflict metrics
  const conflictTotal = await db.regulatoryConflict.count()
  const conflictsByStatus = await db.regulatoryConflict.groupBy({
    by: ["status"],
    _count: true,
  })
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const oldConflicts = await db.regulatoryConflict.count({
    where: { status: "OPEN", createdAt: { lt: sevenDaysAgo } },
  })

  // Release metrics
  const releaseTotal = await db.ruleRelease.count()
  const latestRelease = await db.ruleRelease.findFirst({
    orderBy: { releasedAt: "desc" },
    select: { version: true },
  })

  // Health metrics
  const pendingItems = await db.discoveredItem.count({ where: { status: "PENDING" } })
  const oldestPending = await db.discoveredItem.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  })

  const oldestPendingAge = oldestPending
    ? (Date.now() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60)
    : null

  return {
    timestamp,

    discovery: {
      endpoints: {
        total: endpointStats.reduce((sum, s) => sum + s._count, 0),
        active: endpointStats.find(s => s.isActive)?.\_count || 0,
        degraded: 0, // TODO: track degraded endpoints
        dead: endpointStats.find(s => !s.isActive)?._count || 0,
      },
      items: {
        total: totalItems,
        pending: itemStats.find(s => s.status === "PENDING")?._count || 0,
        fetched: itemStats.find(s => s.status === "FETCHED")?._count || 0,
        processed: itemStats.find(s => s.status === "PROCESSED")?._count || 0,
        failed: itemStats.find(s => s.status === "FAILED")?._count || 0,
      },
      saturationPercent: totalItems > 0 ? (processedItems / totalItems) * 100 : 0,
    },

    evidence: {
      total: evidenceTotal,
      byContentType: Object.fromEntries(evidenceByType.map(e => [e.contentType, e._count])),
      unextracted: unextractedEvidence,
      extractionRate: evidenceTotal > 0 ? ((evidenceTotal - unextractedEvidence) / evidenceTotal) * 100 : 0,
    },

    pointers: {
      total: pointerTotal,
      byDomain: Object.fromEntries(pointersByDomain.map(p => [p.domain, p._count])),
      unlinked: unlinkedPointers,
      linkageRate: pointerTotal > 0 ? ((pointerTotal - unlinkedPointers) / pointerTotal) * 100 : 0,
    },

    rules: {
      total: ruleTotal,
      byStatus: Object.fromEntries(rulesByStatus.map(r => [r.status, r._count])),
      byRiskTier: Object.fromEntries(rulesByTier.map(r => [r.riskTier, r._count])),
      publishedRate: ruleTotal > 0 ? (publishedRules / ruleTotal) * 100 : 0,
    },

    conflicts: {
      total: conflictTotal,
      open: conflictsByStatus.find(c => c.status === "OPEN")?._count || 0,
      resolved: conflictsByStatus.find(c => c.status === "RESOLVED")?._count || 0,
      escalated: conflictsByStatus.find(c => c.status === "ESCALATED")?._count || 0,
      resolutionRate: conflictTotal > 0
        ? ((conflictsByStatus.find(c => c.status === "RESOLVED")?._count || 0) / conflictTotal) * 100
        : 0,
    },

    releases: {
      total: releaseTotal,
      latestVersion: latestRelease?.version || null,
      totalRulesPublished: publishedRules,
    },

    health: {
      pipelineStalled: pendingItems > 100 && (oldestPendingAge || 0) > 24,
      queueBacklog: pendingItems + unextractedEvidence + unlinkedPointers,
      oldestPendingAge,
      unresolvedConflictsOver7Days: oldConflicts,
    },
  }
}

export function formatCoverageReport(metrics: CoverageMetrics): string {
  return `
# Regulatory Truth Layer Coverage Report

**Generated:** ${metrics.timestamp}

## Discovery Layer
- Endpoints: ${metrics.discovery.endpoints.active} active / ${metrics.discovery.endpoints.total} total
- Items: ${metrics.discovery.items.total} total
  - Pending: ${metrics.discovery.items.pending}
  - Fetched: ${metrics.discovery.items.fetched}
  - Processed: ${metrics.discovery.items.processed}
  - Failed: ${metrics.discovery.items.failed}
- **Saturation: ${metrics.discovery.saturationPercent.toFixed(1)}%**

## Evidence Layer
- Total: ${metrics.evidence.total}
- By type: ${Object.entries(metrics.evidence.byContentType).map(([k, v]) => `${k}=${v}`).join(", ")}
- Unextracted: ${metrics.evidence.unextracted}
- **Extraction rate: ${metrics.evidence.extractionRate.toFixed(1)}%**

## Pointer Layer
- Total: ${metrics.pointers.total}
- Unlinked: ${metrics.pointers.unlinked}
- **Linkage rate: ${metrics.pointers.linkageRate.toFixed(1)}%**

## Rule Layer
- Total: ${metrics.rules.total}
- By status: ${Object.entries(metrics.rules.byStatus).map(([k, v]) => `${k}=${v}`).join(", ")}
- By tier: ${Object.entries(metrics.rules.byRiskTier).map(([k, v]) => `${k}=${v}`).join(", ")}
- **Published rate: ${metrics.rules.publishedRate.toFixed(1)}%**

## Conflicts
- Total: ${metrics.conflicts.total}
- Open: ${metrics.conflicts.open}
- Resolved: ${metrics.conflicts.resolved}
- Escalated: ${metrics.conflicts.escalated}
- **Resolution rate: ${metrics.conflicts.resolutionRate.toFixed(1)}%**

## Releases
- Total releases: ${metrics.releases.total}
- Latest version: ${metrics.releases.latestVersion || "N/A"}
- Rules published: ${metrics.releases.totalRulesPublished}

## Health
- Pipeline stalled: ${metrics.health.pipelineStalled ? "YES ⚠️" : "NO ✓"}
- Queue backlog: ${metrics.health.queueBacklog}
- Oldest pending: ${metrics.health.oldestPendingAge ? metrics.health.oldestPendingAge.toFixed(1) + " hours" : "N/A"}
- Conflicts >7 days: ${metrics.health.unresolvedConflictsOver7Days}
`.trim()
}
```

**Step 2: Add CLI script**

Create `src/lib/regulatory-truth/scripts/coverage-report.ts`:

```typescript
#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/coverage-report.ts

import { collectCoverageMetrics, formatCoverageReport } from "../utils/coverage-metrics"

async function main() {
  const metrics = await collectCoverageMetrics()
  console.log(formatCoverageReport(metrics))

  // Also output JSON for machine consumption
  if (process.argv.includes("--json")) {
    console.log("\n--- JSON ---\n")
    console.log(JSON.stringify(metrics, null, 2))
  }
}

main().catch((err) => {
  console.error("Coverage report failed:", err)
  process.exit(1)
})
```

**Step 3: Run coverage report**

Run: `npx tsx src/lib/regulatory-truth/scripts/coverage-report.ts`

Expected: Displays comprehensive coverage metrics.

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/utils/coverage-metrics.ts src/lib/regulatory-truth/scripts/coverage-report.ts
git commit -m "feat(regulatory-truth): add coverage accounting and saturation tracking"
```

---

## Phase 5: Review Automation

### Task 5.1: Create Daily Review Bundle Generator

**Files:**

- Create: `src/lib/regulatory-truth/scripts/generate-review-bundle.ts`

**Step 1: Write review bundle generator**

```typescript
#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/generate-review-bundle.ts
// Generates daily review bundles for human approval

import { db } from "@/lib/db"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

interface ReviewItem {
  id: string
  conceptSlug: string
  titleHr: string
  value: string
  valueType: string
  riskTier: string
  confidence: number
  sourceCount: number
  quotes: string[]
  url: string
  waitingHours: number
}

interface ReviewBundle {
  generatedAt: string
  totalItems: number
  byRiskTier: Record<string, number>
  items: ReviewItem[]
  approveCommand: string
}

export async function generateReviewBundle(options?: {
  maxItems?: number
  prioritize?: "risk" | "age"
}): Promise<ReviewBundle> {
  const maxItems = options?.maxItems ?? 20
  const prioritize = options?.prioritize ?? "risk"

  const now = new Date()

  // Get pending rules with source information
  const pendingRules = await db.regulatoryRule.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      sourcePointers: {
        include: {
          evidence: { select: { url: true } },
        },
      },
    },
    orderBy:
      prioritize === "risk" ? [{ riskTier: "asc" }, { updatedAt: "asc" }] : [{ updatedAt: "asc" }],
    take: maxItems,
  })

  const items: ReviewItem[] = pendingRules.map((rule) => ({
    id: rule.id,
    conceptSlug: rule.conceptSlug,
    titleHr: rule.titleHr,
    value: rule.value,
    valueType: rule.valueType,
    riskTier: rule.riskTier,
    confidence: rule.confidence,
    sourceCount: rule.sourcePointers.length,
    quotes: rule.sourcePointers.map((sp) => sp.exactQuote).slice(0, 3),
    url: rule.sourcePointers[0]?.evidence?.url || "",
    waitingHours: (now.getTime() - rule.updatedAt.getTime()) / (1000 * 60 * 60),
  }))

  const byRiskTier: Record<string, number> = {}
  for (const item of items) {
    byRiskTier[item.riskTier] = (byRiskTier[item.riskTier] || 0) + 1
  }

  // Generate approve command
  const ruleIds = items.map((i) => i.id).join(",")
  const approveCommand = `npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "${ruleIds}"`

  return {
    generatedAt: now.toISOString(),
    totalItems: items.length,
    byRiskTier,
    items,
    approveCommand,
  }
}

function formatBundleMarkdown(bundle: ReviewBundle): string {
  let md = `# Daily Review Bundle

**Generated:** ${bundle.generatedAt}
**Total items:** ${bundle.totalItems}
**By risk tier:** ${Object.entries(bundle.byRiskTier)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")}

---

## Quick Approve All

\`\`\`bash
${bundle.approveCommand}
\`\`\`

---

## Items for Review

`

  for (const item of bundle.items) {
    md += `### ${item.conceptSlug}

- **Title:** ${item.titleHr}
- **Value:** ${item.value} (${item.valueType})
- **Risk Tier:** ${item.riskTier}
- **Confidence:** ${(item.confidence * 100).toFixed(0)}%
- **Sources:** ${item.sourceCount}
- **Waiting:** ${item.waitingHours.toFixed(1)} hours
- **URL:** ${item.url}

**Source quotes:**
${item.quotes.map((q, i) => `${i + 1}. "${q.slice(0, 200)}..."`).join("\n")}

**Approve:** \`npx tsx src/lib/regulatory-truth/scripts/approve-bundle.ts --ids "${item.id}"\`

---

`
  }

  return md
}

// CLI entry point
async function main() {
  const bundle = await generateReviewBundle()
  const markdown = formatBundleMarkdown(bundle)

  // Save to file
  const date = new Date().toISOString().split("T")[0]
  const dir = "docs/regulatory-truth/review-bundles"
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${date}-review-bundle.md`)
  writeFileSync(path, markdown)

  console.log(markdown)
  console.log(`\nSaved to: ${path}`)
}

main().catch((err) => {
  console.error("Bundle generation failed:", err)
  process.exit(1)
})
```

**Step 2: Create approve bundle script**

Create `src/lib/regulatory-truth/scripts/approve-bundle.ts`:

```typescript
#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/approve-bundle.ts

import { db } from "@/lib/db"
import { logAuditEvent } from "../utils/audit-log"
import { runReleaser } from "../agents/releaser"

async function main() {
  const args = process.argv.slice(2)
  const idsArg = args.find((_, i, a) => a[i - 1] === "--ids")

  if (!idsArg) {
    console.log('Usage: npx tsx approve-bundle.ts --ids "id1,id2,id3"')
    process.exit(1)
  }

  const ids = idsArg.split(",").map((id) => id.trim())
  console.log(`Approving ${ids.length} rules...`)

  let approved = 0
  for (const id of ids) {
    try {
      await db.regulatoryRule.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: "HUMAN_REVIEW",
        },
      })

      await logAuditEvent({
        action: "RULE_APPROVED",
        entityType: "RULE",
        entityId: id,
        metadata: { approved_via: "review_bundle" },
      })

      approved++
      console.log(`✓ Approved: ${id}`)
    } catch (error) {
      console.log(`✗ Failed: ${id} - ${error}`)
    }
  }

  console.log(`\nApproved ${approved}/${ids.length} rules`)

  // Optionally release
  if (args.includes("--release") && approved > 0) {
    console.log("\nReleasing approved rules...")
    const result = await runReleaser(ids)
    if (result.success) {
      console.log(
        `Released ${result.publishedRuleIds.length} rules as version ${result.output?.version}`
      )
    }
  }
}

main().catch((err) => {
  console.error("Approval failed:", err)
  process.exit(1)
})
```

**Step 3: Test review bundle**

Run: `npx tsx src/lib/regulatory-truth/scripts/generate-review-bundle.ts`

Expected: Generates markdown review bundle with approve commands.

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/scripts/generate-review-bundle.ts src/lib/regulatory-truth/scripts/approve-bundle.ts
git commit -m "feat(regulatory-truth): add review bundle generator for efficient human approval"
```

---

## Final: Verification Checklist

### Task 6.1: Run Full E2E Validation

**Step 1: Run E2E harness**

Run: `npx tsx src/lib/regulatory-truth/e2e/run-e2e.ts`

Expected: VERDICT: GO (all 8 invariants pass)

**Step 2: Check coverage metrics**

Run: `npx tsx src/lib/regulatory-truth/scripts/coverage-report.ts`

Expected: Saturation increasing, pipeline not stalled.

**Step 3: Verify continuous worker running**

Run: `pm2 status`

Expected: `regulatory-pipeline` is `online`.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(regulatory-truth): complete autonomy closure implementation"
git push
```

---

## GO/NO-GO Checklist

Before declaring autonomy achieved, ALL must be true:

- [ ] Pipeline drain completed (328 PENDING → processed)
- [ ] Auto-approval enabled for T2/T3 rules
- [ ] Continuous worker running 24/7 via PM2
- [ ] Baseline backfill discovered historical URLs
- [ ] Coverage metrics show saturation > 50%
- [ ] E2E harness returns VERDICT: GO
- [ ] All 8 invariants pass
- [ ] Review bundle generator produces actionable output
- [ ] No stalled queues (oldest pending < 24 hours)
- [ ] Self-healing repairs hash mismatches automatically
