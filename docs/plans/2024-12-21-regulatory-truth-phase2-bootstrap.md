# Regulatory Truth Layer - Phase 2: Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Populate the source registry with Croatian regulatory sources, run initial evidence collection, and extract the first batch of source pointers.

**Architecture:** Seed regulatory sources from authoritative Croatian government websites, run Sentinel agent to collect evidence, run Extractor to create source pointers.

**Tech Stack:** Prisma, Ollama agents, Node.js fetch

---

## Phase 2 Tasks Overview

| #   | Task                              | Description                               | Est. |
| --- | --------------------------------- | ----------------------------------------- | ---- |
| 1   | Create source seed data           | Define 20+ priority regulatory sources    | 10m  |
| 2   | Create seed script                | Script to populate RegulatorySource table | 5m   |
| 3   | Run seed script                   | Populate database with sources            | 2m   |
| 4   | Create Sentinel CLI command       | Manual trigger for source monitoring      | 8m   |
| 5   | Create Extractor CLI command      | Manual trigger for extraction             | 8m   |
| 6   | Test Sentinel on one source       | Verify evidence collection works          | 5m   |
| 7   | Test Extractor on evidence        | Verify extraction works                   | 5m   |
| 8   | Create bootstrap runner           | Batch process for initial bootstrap       | 10m  |
| 9   | Add admin API routes              | Endpoints to trigger/monitor agents       | 10m  |
| 10  | Verify current fiscal-data values | Compare against official sources          | 15m  |

---

## Task 1: Create source seed data

**Files:**

- Create: `src/lib/regulatory-truth/data/sources.ts`

**Step 1: Create the source definitions**

```typescript
// src/lib/regulatory-truth/data/sources.ts

export interface SourceDefinition {
  slug: string
  name: string
  url: string
  hierarchy: number // 1=Ustav, 2=Zakon, 3=Podzakonski, 4=Pravilnik, 5=Uputa, 6=Mišljenje, 7=Praksa
  fetchIntervalHours: number
  priority: "critical" | "high" | "medium" | "low"
  domains: string[] // pausalni, pdv, doprinosi, etc.
}

/**
 * Priority Croatian regulatory sources for FiskAI
 * Ordered by importance for paušalni obrt compliance
 */
export const REGULATORY_SOURCES: SourceDefinition[] = [
  // ==========================================================================
  // PRIORITY 1: Paušalni Core Sources
  // ==========================================================================
  {
    slug: "porezna-pausalno",
    name: "Porezna uprava - Paušalno oporezivanje",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/pausalno_oporezivanje.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["pausalni"],
  },
  {
    slug: "porezna-pausalno-obrtnici",
    name: "Porezna uprava - Paušalno oporezivanje obrtnika",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/porez_na_dohodak_pausalno_oporezivanje_obrtnika.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["pausalni"],
  },
  {
    slug: "narodne-novine-pausalni",
    name: "Narodne novine - Zakon o porezu na dohodak",
    url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2016_12_115_2519.html",
    hierarchy: 2,
    fetchIntervalHours: 168, // Weekly
    priority: "critical",
    domains: ["pausalni", "porez_dohodak"],
  },

  // ==========================================================================
  // PRIORITY 2: Contributions (Doprinosi)
  // ==========================================================================
  {
    slug: "hzmo-doprinosi",
    name: "HZMO - Doprinosi za mirovinsko osiguranje",
    url: "https://www.mirovinsko.hr/hr/doprinosi/72",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["doprinosi"],
  },
  {
    slug: "hzzo-doprinosi",
    name: "HZZO - Doprinosi za zdravstveno osiguranje",
    url: "https://www.hzzo.hr/obvezno-osiguranje/",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["doprinosi"],
  },
  {
    slug: "porezna-doprinosi-stope",
    name: "Porezna uprava - Stope doprinosa",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/doprinosi.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["doprinosi"],
  },

  // ==========================================================================
  // PRIORITY 3: VAT (PDV)
  // ==========================================================================
  {
    slug: "porezna-pdv",
    name: "Porezna uprava - Porez na dodanu vrijednost",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/porez_na_dodanu_vrijednost.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "high",
    domains: ["pdv"],
  },
  {
    slug: "porezna-pdv-stope",
    name: "Porezna uprava - Stope PDV-a",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/stope_poreza_na_dodanu_vrijednost.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "high",
    domains: ["pdv"],
  },
  {
    slug: "porezna-pdv-prag",
    name: "Porezna uprava - Prag za upis u registar PDV-a",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/prag_za_upis_u_registar_obveznika_PDV.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "critical",
    domains: ["pdv", "pausalni"],
  },

  // ==========================================================================
  // PRIORITY 4: Fiscalization (Fiskalizacija)
  // ==========================================================================
  {
    slug: "porezna-fiskalizacija",
    name: "Porezna uprava - Fiskalizacija",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/fiskalizacija.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "high",
    domains: ["fiskalizacija"],
  },
  {
    slug: "fina-fiskalizacija",
    name: "FINA - Fiskalizacija certifikati",
    url: "https://www.fina.hr/fiskalizacija",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "high",
    domains: ["fiskalizacija"],
  },

  // ==========================================================================
  // PRIORITY 5: Deadlines (Rokovi)
  // ==========================================================================
  {
    slug: "porezna-rokovi",
    name: "Porezna uprava - Rokovi plaćanja",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/rokovi_placanja_poreza.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "high",
    domains: ["rokovi"],
  },

  // ==========================================================================
  // PRIORITY 6: Chamber Fees (HOK)
  // ==========================================================================
  {
    slug: "hok-clanarina",
    name: "HOK - Članarina obrtnika",
    url: "https://www.hok.hr/clanarina",
    hierarchy: 7,
    fetchIntervalHours: 168, // Weekly
    priority: "medium",
    domains: ["pausalni"],
  },

  // ==========================================================================
  // PRIORITY 7: Income Tax (Porez na dohodak)
  // ==========================================================================
  {
    slug: "porezna-porez-dohodak",
    name: "Porezna uprava - Porez na dohodak",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/porez_na_dohodak.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "medium",
    domains: ["porez_dohodak"],
  },
  {
    slug: "porezna-osobni-odbitak",
    name: "Porezna uprava - Osobni odbitak",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/osobni_odbitak.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "medium",
    domains: ["porez_dohodak"],
  },

  // ==========================================================================
  // PRIORITY 8: Corporate Tax (Porez na dobit)
  // ==========================================================================
  {
    slug: "porezna-porez-dobit",
    name: "Porezna uprava - Porez na dobit",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/porez_na_dobit.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "low",
    domains: ["porez_dohodak"],
  },

  // ==========================================================================
  // PRIORITY 9: Minimum Wage & Employment
  // ==========================================================================
  {
    slug: "mrms-minimalna-placa",
    name: "MRMS - Minimalna plaća",
    url: "https://www.mrms.hr/minimalna-placa/",
    hierarchy: 4,
    fetchIntervalHours: 168, // Weekly
    priority: "medium",
    domains: ["doprinosi"],
  },

  // ==========================================================================
  // PRIORITY 10: EU Transactions
  // ==========================================================================
  {
    slug: "porezna-eu-promet",
    name: "Porezna uprava - Promet s EU",
    url: "https://www.porezna-uprava.hr/HR_Porezni_sustav/Stranice/eu_promet.aspx",
    hierarchy: 5,
    fetchIntervalHours: 24,
    priority: "medium",
    domains: ["pdv", "pausalni"],
  },
]

/**
 * Get sources by priority
 */
export function getSourcesByPriority(priority: SourceDefinition["priority"]): SourceDefinition[] {
  return REGULATORY_SOURCES.filter((s) => s.priority === priority)
}

/**
 * Get sources by domain
 */
export function getSourcesByDomain(domain: string): SourceDefinition[] {
  return REGULATORY_SOURCES.filter((s) => s.domains.includes(domain))
}

/**
 * Get critical sources (for hourly monitoring)
 */
export function getCriticalSources(): SourceDefinition[] {
  return REGULATORY_SOURCES.filter((s) => s.priority === "critical")
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/data/sources.ts
git commit -m "feat(regulatory-truth): add Croatian regulatory source definitions"
```

---

## Task 2: Create seed script

**Files:**

- Create: `src/lib/regulatory-truth/scripts/seed-sources.ts`

**Step 1: Create the seed script**

```typescript
// src/lib/regulatory-truth/scripts/seed-sources.ts

import { db } from "@/lib/db"
import { REGULATORY_SOURCES } from "../data/sources"

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

  for (const source of REGULATORY_SOURCES) {
    try {
      // Check if source already exists
      const existing = await db.regulatorySource.findUnique({
        where: { slug: source.slug },
      })

      if (existing) {
        console.log(`[seed] Skipping existing source: ${source.slug}`)
        skipped++
        continue
      }

      // Create new source
      await db.regulatorySource.create({
        data: {
          slug: source.slug,
          name: source.name,
          url: source.url,
          hierarchy: source.hierarchy,
          fetchIntervalHours: source.fetchIntervalHours,
          isActive: true,
        },
      })

      console.log(`[seed] Created source: ${source.slug}`)
      created++
    } catch (error) {
      const errorMsg = `Failed to seed ${source.slug}: ${error}`
      console.error(`[seed] ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  console.log(`[seed] Complete: ${created} created, ${skipped} skipped, ${errors.length} errors`)

  return { created, skipped, errors }
}

// CLI runner
if (require.main === module) {
  seedRegulatorySources()
    .then((result) => {
      console.log("[seed] Result:", result)
      process.exit(result.errors.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("[seed] Fatal error:", error)
      process.exit(1)
    })
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/seed-sources.ts
git commit -m "feat(regulatory-truth): add source seeding script"
```

---

## Task 3: Run seed script

**Step 1: Run the seed script**

Run: `cd /home/admin/FiskAI && npx tsx src/lib/regulatory-truth/scripts/seed-sources.ts`
Expected: "Complete: 20 created, 0 skipped, 0 errors"

**Step 2: Verify in database**

Run: `npx prisma studio` or query directly

---

## Task 4: Create Sentinel CLI command

**Files:**

- Create: `src/lib/regulatory-truth/scripts/run-sentinel.ts`

**Step 1: Create CLI script**

```typescript
// src/lib/regulatory-truth/scripts/run-sentinel.ts

import { db } from "@/lib/db"
import { runSentinel } from "../agents/sentinel"

/**
 * Run Sentinel agent on a specific source or all active sources
 */
async function main() {
  const args = process.argv.slice(2)
  const sourceSlug = args[0]

  if (sourceSlug) {
    // Run on specific source
    console.log(`[sentinel] Running on source: ${sourceSlug}`)

    const source = await db.regulatorySource.findUnique({
      where: { slug: sourceSlug },
    })

    if (!source) {
      console.error(`[sentinel] Source not found: ${sourceSlug}`)
      process.exit(1)
    }

    const result = await runSentinel(source.id)
    console.log("[sentinel] Result:", JSON.stringify(result, null, 2))

    process.exit(result.success ? 0 : 1)
  } else {
    // Run on all active sources that need updating
    console.log("[sentinel] Running on all active sources...")

    const sources = await db.regulatorySource.findMany({
      where: { isActive: true },
      orderBy: { lastFetchedAt: "asc" }, // Oldest first
    })

    console.log(`[sentinel] Found ${sources.length} active sources`)

    let success = 0
    let failed = 0
    let changed = 0

    for (const source of sources) {
      console.log(`\n[sentinel] Processing: ${source.slug}`)

      try {
        const result = await runSentinel(source.id)

        if (result.success) {
          success++
          if (result.hasChanged) {
            changed++
            console.log(`[sentinel] ✓ ${source.slug} - CHANGED`)
          } else {
            console.log(`[sentinel] ✓ ${source.slug} - no change`)
          }
        } else {
          failed++
          console.log(`[sentinel] ✗ ${source.slug} - ${result.error}`)
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
}

main().catch((error) => {
  console.error("[sentinel] Fatal error:", error)
  process.exit(1)
})
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/run-sentinel.ts
git commit -m "feat(regulatory-truth): add Sentinel CLI runner"
```

---

## Task 5: Create Extractor CLI command

**Files:**

- Create: `src/lib/regulatory-truth/scripts/run-extractor.ts`

**Step 1: Create CLI script**

```typescript
// src/lib/regulatory-truth/scripts/run-extractor.ts

import { db } from "@/lib/db"
import { runExtractor } from "../agents/extractor"

/**
 * Run Extractor agent on evidence records
 */
async function main() {
  const args = process.argv.slice(2)
  const evidenceId = args[0]

  if (evidenceId) {
    // Run on specific evidence
    console.log(`[extractor] Running on evidence: ${evidenceId}`)

    const evidence = await db.evidence.findUnique({
      where: { id: evidenceId },
    })

    if (!evidence) {
      console.error(`[extractor] Evidence not found: ${evidenceId}`)
      process.exit(1)
    }

    const result = await runExtractor(evidence.id)
    console.log("[extractor] Result:", JSON.stringify(result, null, 2))

    process.exit(result.success ? 0 : 1)
  } else {
    // Run on all unprocessed evidence
    console.log("[extractor] Running on unprocessed evidence...")

    // Find evidence that has no source pointers yet
    const unprocessedEvidence = await db.evidence.findMany({
      where: {
        sourcePointers: { none: {} },
      },
      include: {
        source: true,
      },
      orderBy: { fetchedAt: "desc" },
      take: 50, // Process in batches
    })

    console.log(`[extractor] Found ${unprocessedEvidence.length} unprocessed evidence records`)

    let success = 0
    let failed = 0
    let totalPointers = 0

    for (const evidence of unprocessedEvidence) {
      console.log(`\n[extractor] Processing: ${evidence.source.slug} (${evidence.id})`)

      try {
        const result = await runExtractor(evidence.id)

        if (result.success) {
          success++
          totalPointers += result.sourcePointerIds.length
          console.log(`[extractor] ✓ Extracted ${result.sourcePointerIds.length} data points`)
        } else {
          failed++
          console.log(`[extractor] ✗ ${result.error}`)
        }
      } catch (error) {
        failed++
        console.error(`[extractor] ✗ ${error}`)
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    console.log(
      `\n[extractor] Complete: ${success} success, ${failed} failed, ${totalPointers} total pointers`
    )
    process.exit(failed > 0 ? 1 : 0)
  }
}

main().catch((error) => {
  console.error("[extractor] Fatal error:", error)
  process.exit(1)
})
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/run-extractor.ts
git commit -m "feat(regulatory-truth): add Extractor CLI runner"
```

---

## Task 6: Test Sentinel on one source

**Step 1: Run Sentinel on a single source**

Run: `cd /home/admin/FiskAI && npx tsx src/lib/regulatory-truth/scripts/run-sentinel.ts porezna-pausalno`

Expected output:

```
[sentinel] Running on source: porezna-pausalno
[sentinel] Result: {
  "success": true,
  "evidenceId": "clxxxxxx",
  "hasChanged": true
}
```

**Step 2: Verify evidence was created**

Run: `npx prisma studio` and check Evidence table

---

## Task 7: Test Extractor on evidence

**Step 1: Run Extractor on the evidence**

Run: `cd /home/admin/FiskAI && npx tsx src/lib/regulatory-truth/scripts/run-extractor.ts <evidence-id-from-step-6>`

Expected output:

```
[extractor] Running on evidence: clxxxxxx
[extractor] Result: {
  "success": true,
  "sourcePointerIds": ["clxxxx1", "clxxxx2", ...]
}
```

**Step 2: Verify source pointers were created**

Run: `npx prisma studio` and check SourcePointer table

---

## Task 8: Create bootstrap runner

**Files:**

- Create: `src/lib/regulatory-truth/scripts/bootstrap.ts`

**Step 1: Create bootstrap script**

```typescript
// src/lib/regulatory-truth/scripts/bootstrap.ts

import { db } from "@/lib/db"
import { seedRegulatorySources } from "./seed-sources"
import { runSentinel } from "../agents/sentinel"
import { runExtractor } from "../agents/extractor"
import { getCriticalSources, getSourcesByPriority } from "../data/sources"

interface BootstrapResult {
  phase: string
  sourcesSeeded: number
  evidenceCollected: number
  sourcePointersCreated: number
  errors: string[]
}

/**
 * Full bootstrap process for Regulatory Truth Layer
 */
async function bootstrap(): Promise<BootstrapResult> {
  const result: BootstrapResult = {
    phase: "bootstrap",
    sourcesSeeded: 0,
    evidenceCollected: 0,
    sourcePointersCreated: 0,
    errors: [],
  }

  console.log("=".repeat(60))
  console.log("REGULATORY TRUTH LAYER - BOOTSTRAP")
  console.log("=".repeat(60))

  // Phase 1: Seed sources
  console.log("\n[Phase 1] Seeding regulatory sources...")
  try {
    const seedResult = await seedRegulatorySources()
    result.sourcesSeeded = seedResult.created
    result.errors.push(...seedResult.errors)
  } catch (error) {
    result.errors.push(`Seed failed: ${error}`)
  }

  // Phase 2: Collect evidence from critical sources
  console.log("\n[Phase 2] Collecting evidence from critical sources...")
  const criticalSources = getCriticalSources()

  for (const sourceDef of criticalSources) {
    const source = await db.regulatorySource.findUnique({
      where: { slug: sourceDef.slug },
    })

    if (!source) {
      console.log(`[bootstrap] Source not found in DB: ${sourceDef.slug}`)
      continue
    }

    console.log(`[bootstrap] Fetching: ${source.name}`)

    try {
      const sentinelResult = await runSentinel(source.id)
      if (sentinelResult.success && sentinelResult.evidenceId) {
        result.evidenceCollected++
        console.log(`[bootstrap] ✓ Evidence collected: ${sentinelResult.evidenceId}`)

        // Phase 3: Extract data points
        console.log(`[bootstrap] Extracting data points...`)
        const extractorResult = await runExtractor(sentinelResult.evidenceId)

        if (extractorResult.success) {
          result.sourcePointersCreated += extractorResult.sourcePointerIds.length
          console.log(
            `[bootstrap] ✓ Extracted ${extractorResult.sourcePointerIds.length} data points`
          )
        } else {
          result.errors.push(`Extraction failed for ${source.slug}: ${extractorResult.error}`)
        }
      } else {
        result.errors.push(`Sentinel failed for ${source.slug}: ${sentinelResult.error}`)
      }
    } catch (error) {
      result.errors.push(`Bootstrap failed for ${source.slug}: ${error}`)
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("BOOTSTRAP COMPLETE")
  console.log("=".repeat(60))
  console.log(`Sources seeded: ${result.sourcesSeeded}`)
  console.log(`Evidence collected: ${result.evidenceCollected}`)
  console.log(`Source pointers created: ${result.sourcePointersCreated}`)
  console.log(`Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.log("\nErrors:")
    result.errors.forEach((e) => console.log(`  - ${e}`))
  }

  return result
}

// CLI runner
if (require.main === module) {
  bootstrap()
    .then((result) => {
      process.exit(result.errors.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("[bootstrap] Fatal error:", error)
      process.exit(1)
    })
}

export { bootstrap }
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/bootstrap.ts
git commit -m "feat(regulatory-truth): add full bootstrap runner"
```

---

## Task 9: Add admin API routes

**Files:**

- Create: `src/app/api/admin/regulatory-truth/sources/route.ts`
- Create: `src/app/api/admin/regulatory-truth/bootstrap/route.ts`

**Step 1: Create sources API**

```typescript
// src/app/api/admin/regulatory-truth/sources/route.ts

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET() {
  await requireAdmin()

  const sources = await db.regulatorySource.findMany({
    orderBy: { lastFetchedAt: "desc" },
    include: {
      _count: {
        select: {
          evidence: true,
          monitoringAlerts: true,
        },
      },
    },
  })

  return NextResponse.json({ sources })
}
```

**Step 2: Create bootstrap API**

```typescript
// src/app/api/admin/regulatory-truth/bootstrap/route.ts

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-utils"
import { seedRegulatorySources } from "@/lib/regulatory-truth/scripts/seed-sources"

export async function POST() {
  await requireAdmin()

  try {
    const result = await seedRegulatorySources()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/admin/regulatory-truth
git commit -m "feat(regulatory-truth): add admin API routes"
```

---

## Task 10: Verify current fiscal-data values

**Files:**

- Create: `src/lib/regulatory-truth/scripts/verify-fiscal-data.ts`

**Step 1: Create verification script**

```typescript
// src/lib/regulatory-truth/scripts/verify-fiscal-data.ts

import { db } from "@/lib/db"
import { CONTRIBUTIONS } from "@/lib/fiscal-data/data/contributions"
import { TAX_RATES } from "@/lib/fiscal-data/data/tax-rates"
import { THRESHOLDS } from "@/lib/fiscal-data/data/thresholds"

interface VerificationResult {
  dataPoint: string
  currentValue: unknown
  sourcePointerValue: string | null
  status: "match" | "mismatch" | "no_data"
  sourcePointerIds: string[]
}

/**
 * Compare existing fiscal-data values against extracted source pointers
 */
async function verifyFiscalData(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  // Define key data points to verify
  const dataPoints = [
    {
      path: "THRESHOLDS.pausalni.value",
      expectedValue: THRESHOLDS.pausalni.value,
      domain: "pausalni",
    },
    { path: "THRESHOLDS.pdv.value", expectedValue: THRESHOLDS.pdv.value, domain: "pdv" },
    {
      path: "CONTRIBUTIONS.rates.MIO_I.rate",
      expectedValue: CONTRIBUTIONS.rates.MIO_I.rate,
      domain: "doprinosi",
    },
    {
      path: "CONTRIBUTIONS.rates.MIO_II.rate",
      expectedValue: CONTRIBUTIONS.rates.MIO_II.rate,
      domain: "doprinosi",
    },
    {
      path: "CONTRIBUTIONS.rates.HZZO.rate",
      expectedValue: CONTRIBUTIONS.rates.HZZO.rate,
      domain: "doprinosi",
    },
    { path: "TAX_RATES.pausal.rate", expectedValue: TAX_RATES.pausal.rate, domain: "pausalni" },
    {
      path: "TAX_RATES.vat.standard.rate",
      expectedValue: TAX_RATES.vat.standard.rate,
      domain: "pdv",
    },
  ]

  console.log(`[verify] Checking ${dataPoints.length} data points...`)

  for (const dp of dataPoints) {
    // Find source pointers for this domain
    const pointers = await db.sourcePointer.findMany({
      where: {
        domain: dp.domain,
        confidence: { gte: 0.8 },
      },
      orderBy: { confidence: "desc" },
      take: 10,
    })

    const result: VerificationResult = {
      dataPoint: dp.path,
      currentValue: dp.expectedValue,
      sourcePointerValue: null,
      status: "no_data",
      sourcePointerIds: [],
    }

    if (pointers.length > 0) {
      result.sourcePointerIds = pointers.map((p) => p.id)

      // Try to find a matching value
      for (const pointer of pointers) {
        const extractedNum = parseFloat(pointer.extractedValue)
        const expectedNum =
          typeof dp.expectedValue === "number"
            ? dp.expectedValue
            : parseFloat(String(dp.expectedValue))

        if (!isNaN(extractedNum) && !isNaN(expectedNum)) {
          result.sourcePointerValue = pointer.extractedValue
          if (Math.abs(extractedNum - expectedNum) < 0.001) {
            result.status = "match"
            break
          } else {
            result.status = "mismatch"
          }
        }
      }
    }

    results.push(result)
    console.log(`[verify] ${dp.path}: ${result.status}`)
  }

  return results
}

// CLI runner
if (require.main === module) {
  verifyFiscalData()
    .then((results) => {
      console.log("\n[verify] Results:")
      console.table(
        results.map((r) => ({
          dataPoint: r.dataPoint,
          current: r.currentValue,
          extracted: r.sourcePointerValue,
          status: r.status,
        }))
      )

      const mismatches = results.filter((r) => r.status === "mismatch")
      if (mismatches.length > 0) {
        console.log("\n[verify] MISMATCHES FOUND:")
        mismatches.forEach((m) => {
          console.log(`  ${m.dataPoint}: expected ${m.currentValue}, found ${m.sourcePointerValue}`)
        })
      }

      process.exit(0)
    })
    .catch((error) => {
      console.error("[verify] Error:", error)
      process.exit(1)
    })
}

export { verifyFiscalData }
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/scripts/verify-fiscal-data.ts
git commit -m "feat(regulatory-truth): add fiscal data verification script"
```

---

## Summary

Phase 2 creates the bootstrap infrastructure:

- **20+ regulatory sources** defined with hierarchy and priority
- **Seed script** to populate database
- **CLI commands** for Sentinel and Extractor agents
- **Bootstrap runner** for full initial load
- **Admin API routes** for monitoring
- **Verification script** to compare against existing fiscal-data

After completing these 10 tasks, run the bootstrap to populate the initial knowledge base.
