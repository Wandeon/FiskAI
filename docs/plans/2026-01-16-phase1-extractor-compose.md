# Phase 1: Extractor → Compose Path Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable compose queueing in extractor.worker.ts with proper CandidateFact grouping.

**Architecture:** After extraction creates CandidateFacts, group them by concept and queue compose jobs.

**Tech Stack:** BullMQ, Prisma, TypeScript

---

## Implementation Steps

### Step 1: Add compose queue import and db import

**File**: `src/lib/regulatory-truth/workers/extractor.worker.ts`

Uncomment/add the compose queue import:

```typescript
import { composeQueue } from "./queues"
import { db } from "@/lib/db"
```

---

### Step 2: Create grouping helper function

**File**: `src/lib/regulatory-truth/workers/extractor.worker.ts`

Add helper function to group CandidateFacts by concept:

```typescript
interface CandidateFactGroup {
  key: string
  domain: string
  candidateFactIds: string[]
}

/**
 * Group CandidateFacts by suggestedConceptSlug (preferred) or domain+valueType fallback.
 * Returns groups ready for compose job queueing.
 */
async function groupCandidateFactsForCompose(
  candidateFactIds: string[]
): Promise<CandidateFactGroup[]> {
  if (candidateFactIds.length === 0) return []

  // Fetch the CandidateFacts with grouping fields
  const facts = await db.candidateFact.findMany({
    where: { id: { in: candidateFactIds } },
    select: {
      id: true,
      suggestedConceptSlug: true,
      suggestedDomain: true,
      suggestedValueType: true,
    },
  })

  // Group by conceptSlug (preferred) or domain+valueType (fallback)
  const groups = new Map<string, { domain: string; ids: string[] }>()

  for (const fact of facts) {
    // Primary: use suggestedConceptSlug
    // Fallback: use domain-valueType
    // Last resort: use domain only
    const key =
      fact.suggestedConceptSlug ||
      (fact.suggestedDomain && fact.suggestedValueType
        ? `${fact.suggestedDomain}-${fact.suggestedValueType}`.toLowerCase()
        : fact.suggestedDomain?.toLowerCase() || "unknown")

    const domain = fact.suggestedDomain || "unknown"

    if (!groups.has(key)) {
      groups.set(key, { domain, ids: [] })
    }
    groups.get(key)!.ids.push(fact.id)
  }

  return Array.from(groups.entries()).map(([key, { domain, ids }]) => ({
    key,
    domain,
    candidateFactIds: ids,
  }))
}
```

---

### Step 3: Enable compose queueing in processExtractJob

**File**: `src/lib/regulatory-truth/workers/extractor.worker.ts`

Replace the disabled compose queueing section with working code:

```typescript
// PHASE-D: Queue compose jobs for CandidateFact groups
if (FeatureFlags.isPhaseD && result.success && result.candidateFactIds.length > 0) {
  try {
    const groups = await groupCandidateFactsForCompose(result.candidateFactIds)

    for (const group of groups) {
      // Use sorted IDs for stable, idempotent jobId
      const sortedIds = [...group.candidateFactIds].sort().join(",")
      const jobId = `compose-${group.key}-${sortedIds}`

      await composeQueue.add(
        "compose",
        {
          candidateFactIds: group.candidateFactIds,
          domain: group.domain,
          runId,
          parentJobId: job.id,
        },
        { jobId }
      )

      console.log(
        `[extractor] Queued compose job for ${group.key} with ${group.candidateFactIds.length} facts`
      )
    }
  } catch (composeError) {
    // Non-blocking: facts are saved even if compose queueing fails
    console.error(`[extractor] Failed to queue compose jobs:`, composeError)
  }
}
```

---

### Step 4: Update continuous-drainer for CandidateFact-based detection

**File**: `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts`

Update `drainFetchedEvidence()` to check CandidateFacts instead of SourcePointers:

```typescript
async function drainFetchedEvidence(): Promise<number> {
  // PHASE-D: Check CandidateFacts for processed evidence, not SourcePointers
  if (FeatureFlags.isPhaseD) {
    // Find FETCHED items without CandidateFacts linked via groundingQuotes
    const fetchedItems = await db.discoveredItem.findMany({
      where: {
        status: "FETCHED",
        evidenceId: { not: null },
      },
      select: { evidenceId: true },
      take: 100,
    })

    if (fetchedItems.length === 0) return 0

    const evidenceIds = fetchedItems
      .map((i) => i.evidenceId)
      .filter((id): id is string => id !== null)

    // Check which evidence has CandidateFacts
    const factsWithEvidence = await db.candidateFact.findMany({
      where: {
        groundingQuotes: {
          path: ["$[*].evidenceId"],
          array_contains: evidenceIds,
        },
      },
      select: {
        groundingQuotes: true,
      },
    })

    // Extract evidence IDs that have facts
    const processedEvidenceIds = new Set<string>()
    for (const fact of factsWithEvidence) {
      const quotes = fact.groundingQuotes as Array<{ evidenceId?: string }>
      for (const quote of quotes) {
        if (quote.evidenceId) processedEvidenceIds.add(quote.evidenceId)
      }
    }

    // Filter to unprocessed evidence
    const newEvidenceIds = evidenceIds.filter((id) => !processedEvidenceIds.has(id)).slice(0, 50)

    if (newEvidenceIds.length === 0) return 0

    const runId = `drain-${Date.now()}`
    await extractQueue.addBulk(
      newEvidenceIds.map((id) => ({
        name: "extract",
        data: { evidenceId: id, runId },
        opts: { jobId: `extract-${id}` },
      }))
    )

    console.log(`[drainer] Queued ${newEvidenceIds.length} extract jobs (PHASE-D)`)
    state.stats.extractJobsQueued += newEvidenceIds.length
    return newEvidenceIds.length
  }

  // Legacy mode: use SourcePointer detection
  // ... existing code ...
}
```

---

### Step 5: Update drainSourcePointers to be backstop only in PHASE-D

**File**: `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts`

Update to handle orphaned CandidateFacts:

```typescript
async function drainSourcePointers(): Promise<number> {
  // PHASE-D: This becomes a backstop for orphaned CandidateFacts
  // (facts that weren't composed due to extractor queueing failure)
  if (FeatureFlags.isPhaseD) {
    // Find CandidateFacts with status=CAPTURED that have no compose job in progress
    // This is a backstop - normally extractor queues compose immediately
    const orphanedFacts = await db.candidateFact.findMany({
      where: {
        status: "CAPTURED",
        createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // Older than 5 min
      },
      select: {
        id: true,
        suggestedConceptSlug: true,
        suggestedDomain: true,
        suggestedValueType: true,
      },
      take: 50,
    })

    if (orphanedFacts.length === 0) return 0

    // Group and queue (same logic as extractor)
    const groups = new Map<string, { domain: string; ids: string[] }>()
    for (const fact of orphanedFacts) {
      const key =
        fact.suggestedConceptSlug ||
        (fact.suggestedDomain && fact.suggestedValueType
          ? `${fact.suggestedDomain}-${fact.suggestedValueType}`.toLowerCase()
          : fact.suggestedDomain?.toLowerCase() || "unknown")
      const domain = fact.suggestedDomain || "unknown"
      if (!groups.has(key)) groups.set(key, { domain, ids: [] })
      groups.get(key)!.ids.push(fact.id)
    }

    let queued = 0
    const runId = `drain-backstop-${Date.now()}`
    for (const [key, { domain, ids }] of groups) {
      const sortedIds = [...ids].sort().join(",")
      await composeQueue.add(
        "compose",
        { candidateFactIds: ids, domain, runId },
        { jobId: `compose-backstop-${key}-${sortedIds}` }
      )
      queued++
    }

    console.log(
      `[drainer] Backstop: Queued ${queued} compose jobs for ${orphanedFacts.length} orphaned facts`
    )
    state.stats.composeJobsQueued += queued
    return queued
  }

  // Legacy mode: use SourcePointer-based compose
  // ... existing code ...
}
```

---

## Verification

1. **TypeScript compiles**: `npx tsc --noEmit`
2. **Unit tests pass**: `npm run test:unit -- src/lib/regulatory-truth`
3. **Manual test**:
   - Set `RTL_PIPELINE_MODE=PHASE_D`
   - Trigger extraction for one evidence
   - Verify compose jobs are queued with candidateFactIds
   - Verify composer receives and processes the job

---

## Files Modified

| File                                                            | Change                                   |
| --------------------------------------------------------------- | ---------------------------------------- |
| `src/lib/regulatory-truth/workers/extractor.worker.ts`          | Add grouping logic and compose queueing  |
| `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts` | Update for CandidateFact-based detection |

---

## Rollback

If issues arise:

1. Set `RTL_PIPELINE_MODE=OFF` to stop all processing
2. Or set `RTL_PIPELINE_MODE=LEGACY` to revert to SourcePointer path
