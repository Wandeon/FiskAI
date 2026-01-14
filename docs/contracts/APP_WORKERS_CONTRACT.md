# App ↔ Workers Contract

> **Track C: Freeze Worker ↔ App Contracts**
>
> This document defines the explicit contracts between the Next.js App and the BullMQ Workers.
> Future changes must respect these boundaries to prevent reintroducing coupling.
>
> **Last updated:** 2026-01-10

---

## 1. Executive Summary

The FiskAI system is split into two runtime contexts:

| Context | Location | Runtime | Purpose |
|---------|----------|---------|---------|
| **App** | `/src/app/` | Next.js (Node.js) | User-facing API routes, server actions, UI rendering |
| **Workers** | `/src/lib/regulatory-truth/workers/` | Standalone Node.js processes | Background job processing, LLM calls, long-running tasks |

**The Golden Rule:** Redis queues are the ONLY communication channel between App and Workers.

---

## 2. Queue Ownership Matrix

### 2.1 Queues Defined

All queues are defined in `/src/lib/regulatory-truth/workers/queues.ts`:

| Queue Name | Purpose | Rate Limit |
|------------|---------|------------|
| `sentinel` | Discovery of regulatory sources | 5/min |
| `extract` | LLM-based fact extraction | 10/min |
| `ocr` | PDF OCR processing | 2/min |
| `compose` | Rule composition from pointers | 5/min |
| `review` | Automated rule review | 5/min |
| `arbiter` | Conflict resolution | 3/min |
| `release` | Rule publication | 2/min |
| `consolidator` | Rule deduplication | 1/5min |
| `content-sync` | MDX content patching | 2/min |
| `article` | Article generation pipeline | 2/min |
| `backup` | Company data backup | 2/min |
| `embedding` | Rule embedding generation | 10/min |
| `evidence-embedding` | Evidence embedding generation | 5/min |
| `scheduled` | Scheduled maintenance tasks | No limit |
| `deadletter` | Failed job storage (DLQ) | N/A |
| `system-status` | Human control layer status | N/A |

### 2.2 Queue Consumption (Workers Read From)

| Queue | Consumer Worker | File |
|-------|-----------------|------|
| `sentinel` | Sentinel Worker | `sentinel.worker.ts` |
| `extract` | Extractor Worker | `extractor.worker.ts` |
| `ocr` | OCR Worker | `ocr.worker.ts` |
| `compose` | Composer Worker | `composer.worker.ts` |
| `review` | Reviewer Worker | `reviewer.worker.ts` |
| `arbiter` | Arbiter Worker | `arbiter.worker.ts` |
| `release` | Releaser Worker | `releaser.worker.ts` |
| `consolidator` | Consolidator Worker | `consolidator.worker.ts` |
| `content-sync` | Content Sync Worker | `content-sync.worker.ts` |
| `article` | Article Worker | `article.worker.ts` |
| `embedding` | Embedding Worker | `embedding.worker.ts` |
| `evidence-embedding` | Evidence Embedding Worker | `evidence-embedding.worker.ts` |

### 2.3 Queue Production (Who Enqueues Jobs)

| Queue | Producer(s) | Context |
|-------|-------------|---------|
| `sentinel` | Scheduler, Continuous Drainer | Worker |
| `extract` | Sentinel Worker, OCR Worker, Continuous Drainer | Worker |
| `ocr` | Continuous Drainer | Worker |
| `compose` | Extractor Worker, Continuous Drainer | Worker |
| `review` | Composer Worker, Continuous Drainer | Worker |
| `arbiter` | Continuous Drainer | Worker |
| `release` | Reviewer Worker, Continuous Drainer | Worker |
| `article` | News Cron (App), `enqueueArticleJob()` | **App + Worker** |
| `scheduled` | Scheduler, API route `/api/regulatory/trigger` | **App + Worker** |
| `backup` | Backup service (`/lib/backup/export.ts`) | **App** |
| `evidence-embedding` | Sentinel Agent | Worker |
| `content-sync` | Content Sync Enqueuer | Worker |

---

## 3. App May Enqueue (Permitted App → Queue Operations)

The App layer is permitted to enqueue jobs to these queues ONLY:

### 3.1 `scheduled` Queue

**Location:** `/src/app/api/regulatory/trigger/route.ts`

```typescript
// PERMITTED: App can trigger pipeline runs via scheduled queue
await scheduledQueue.add("scheduled", {
  type: "pipeline-run",
  runId: `api-${Date.now()}`,
  triggeredBy: "api",
  phases,
})
```

**Use case:** Admin-triggered manual pipeline runs.

### 3.2 `article` Queue

**Location:** `/src/lib/article-agent/queue.ts` (called from App routes/crons)

```typescript
// PERMITTED: App can enqueue article generation jobs
await articleQueue.add("article.generate", {
  action: "generate",
  type: params.type,
  sourceUrls: params.sourceUrls,
  topic: params.topic,
  ...
})
```

**Use case:** News cron creates articles for high-impact news items.

### 3.3 `backup` Queue

**Location:** `/src/lib/backup/export.ts` (called from App)

```typescript
// PERMITTED: App can schedule company data backups
await backupQueue.add("backup", { companyId, ... }, { repeat: { cron } })
```

**Use case:** Client-initiated or scheduled data exports.

---

## 4. Workers Own (Exclusive Worker Resources)

Workers have exclusive ownership of these resources. App MUST NOT directly read or write them.

### 4.1 Database Tables (Worker-Owned)

#### `regulatory` Schema (dbReg)

| Table | Owner | Purpose |
|-------|-------|---------|
| `Evidence` | Workers | Immutable source documents |
| `EvidenceArtifact` | Workers | OCR outputs, cleaned text |
| `ExtractionRejected` | Workers | DLQ for failed extractions |
| `ConflictResolutionAudit` | Workers | Arbiter resolution logs |
| `MonitoringAlert` | Workers | RTL system alerts |
| `RuleTable` | Workers | Fiscal rule definitions |
| `RuleVersion` | Workers | Versioned rule data |
| `RuleSnapshot` | Workers | Point-in-time rule snapshots |
| `RuleCalculation` | Workers | Calculation audit logs |
| `RuleFact` | Workers | Canonical regulatory facts |

#### `public` Schema (db) - Worker-Owned Tables

| Table | Owner | Purpose |
|-------|-------|---------|
| `RegulatoryRule` | Workers | Composed regulatory rules |
| `SourcePointer` | Workers | Evidence → Rule mappings |
| `RegulatoryConflict` | Workers | Conflict detection records |
| `RuleRelease` | Workers | Publication records |
| `AgentRun` | Workers | Agent execution logs |
| `GraphEdge` | Workers | Knowledge graph edges |
| `TruthHealthSnapshot` | Workers | System health metrics |
| `HumanReviewQueue` | Workers | Centralized review queue |
| `WatchdogHealth` | Workers | Watchdog status |
| `WatchdogAlert` | Workers | Watchdog alerts |
| `DiscoveredItem` | Workers | Discovered regulatory items |

### 4.2 Redis Keys (Worker-Owned)

Workers own all Redis keys under the BullMQ prefix (default: `bull:`):

- `bull:sentinel:*`
- `bull:extract:*`
- `bull:ocr:*`
- `bull:compose:*`
- `bull:review:*`
- `bull:arbiter:*`
- `bull:release:*`
- `bull:consolidator:*`
- `bull:content-sync:*`
- `bull:article:*`
- `bull:backup:*`
- `bull:embedding:*`
- `bull:evidence-embedding:*`
- `bull:scheduled:*`
- `bull:deadletter:*`
- `bull:system-status:*`

Workers also own heartbeat keys:

- `drainer:heartbeat`
- `drainer:stage:*`

---

## 5. App Must Never Write (Strict Boundaries)

The App layer MUST NEVER:

### 5.1 Write to Worker-Owned Tables

```typescript
// FORBIDDEN: App must not write to regulatory tables
await db.regulatoryRule.create({ ... })  // NO!
await db.sourcePointer.update({ ... })   // NO!
await dbReg.evidence.create({ ... })     // NO!
```

**Rationale:** Workers maintain referential integrity, confidence scores, and semantic signatures. Direct App writes would corrupt this state.

### 5.2 Directly Enqueue to Pipeline Queues

```typescript
// FORBIDDEN: App must not enqueue directly to pipeline queues
await extractQueue.add(...)      // NO!
await composeQueue.add(...)      // NO!
await reviewQueue.add(...)       // NO!
await releaseQueue.add(...)      // NO!
await ocrQueue.add(...)          // NO!
await arbiterQueue.add(...)      // NO!
await consolidatorQueue.add(...) // NO!
await embeddingQueue.add(...)    // NO!
```

**Rationale:** Pipeline queues are orchestrated by the Continuous Drainer. Direct enqueue would bypass rate limiting, circuit breakers, and backpressure.

### 5.3 Read Redis Queue Internals

```typescript
// FORBIDDEN: App must not read queue internals for business logic
const jobs = await extractQueue.getJobs()  // NO (for business logic)!
```

**Exception:** Queue status endpoints (`/api/regulatory/status`, `/api/admin/workers/status`) MAY read queue metrics for monitoring dashboards.

### 5.4 Modify Worker-Owned Status Fields

```typescript
// FORBIDDEN: App must not modify worker-managed status
await db.regulatoryRule.update({
  where: { id },
  data: { status: "PUBLISHED" }  // NO!
})

await db.discoveredItem.update({
  where: { id },
  data: { status: "FETCHED" }  // NO!
})
```

**Rationale:** Status transitions are managed by worker state machines. Direct updates would corrupt pipeline state.

---

## 6. Redis Is Not Truth

### 6.1 Source of Truth Hierarchy

```
PostgreSQL (Prisma) > Redis (BullMQ)
```

| Data Type | Source of Truth | Redis Role |
|-----------|-----------------|------------|
| Rules, Evidence, Pointers | PostgreSQL | None |
| Queue state (waiting, active) | Redis | Primary (transient) |
| Job data payload | Redis | Temporary |
| Job result | PostgreSQL | Primary |
| Heartbeats, metrics | Redis | Temporary |

### 6.2 Redis Is Ephemeral

Redis data can be lost without data loss:

- Queue jobs are re-created from database state by Continuous Drainer
- Heartbeats are regenerated on worker restart
- Metrics are recalculated from job results in PostgreSQL

**Design principle:** If Redis is flushed, the system MUST recover by:
1. Continuous Drainer queries PostgreSQL for pending work
2. Workers re-enqueue jobs based on database state
3. No regulatory data is lost

### 6.3 Never Store Business Data in Redis

```typescript
// FORBIDDEN: Don't store business data in Redis
await redis.set(`rule:${id}:confidence`, 0.95)  // NO!
await redis.set(`evidence:${id}:hash`, hash)    // NO!
```

All business data MUST be in PostgreSQL.

---

## 7. Contract Enforcement

### 7.1 Code Review Checklist

When reviewing PRs that touch App or Workers:

- [ ] Does App code import from `workers/queues.ts`? (Should only import permitted queues)
- [ ] Does App code write to tables in Section 4.1? (REJECT)
- [ ] Does App code enqueue to queues in Section 5.2? (REJECT)
- [ ] Does new worker code respect queue ownership? (Worker A shouldn't write to Worker B's tables)

### 7.2 Lint Rules (Future)

Consider adding ESLint rules:

```javascript
// Proposed: eslint-plugin-fiskai
// Rule: no-app-worker-table-write
// Rule: no-app-pipeline-queue-enqueue
// Rule: no-redis-business-data
```

### 7.3 Architecture Tests (Future)

Consider adding architecture tests:

```typescript
// Test: App files should not import extractQueue, composeQueue, etc.
// Test: App files should not have dbReg.evidence.create calls
// Test: Worker files should not have direct HTTP handlers
```

---

## 8. Worker ↔ Worker Communication

Workers communicate through queue chaining:

```
Sentinel → extract queue → Extractor → compose queue → Composer → review queue → Reviewer → release queue → Releaser
                ↑                          ↑                          ↑
            ocr queue                  arbiter queue              embedding queue
                |                          |                          |
           OCR Worker                 Arbiter Worker           Embedding Worker
```

### 8.1 Permitted Worker → Queue Relationships

| Worker | May Enqueue To |
|--------|---------------|
| Sentinel | `extract`, `ocr`, `evidence-embedding` |
| Extractor | `compose`, `extract` (requeue) |
| OCR | `extract` |
| Composer | `review` |
| Reviewer | `release` |
| Arbiter | None (terminal) |
| Releaser | `embedding` (implied via service) |
| Continuous Drainer | All pipeline queues (orchestrator) |

---

## 9. Exception Handling

### 9.1 DLQ (Dead Letter Queue)

Failed jobs are moved to `deadletter` queue after max retries:

```typescript
interface DeadLetterJobData {
  originalQueue: string
  originalJobId: string | undefined
  originalJobName: string
  originalJobData: unknown
  error: string
  stackTrace?: string
  attemptsMade: number
  failedAt: string
  firstFailedAt?: string
}
```

### 9.2 Human Review Escalation

Workers may create `HumanReviewQueue` entries for:

- OCR confidence below threshold
- Conflict resolution requiring human judgment
- Rule changes requiring T0/T1 approval

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **App** | Next.js application serving API routes and UI |
| **Workers** | Standalone BullMQ worker processes |
| **Pipeline** | Sequential processing chain (Sentinel → Extractor → Composer → Reviewer → Releaser) |
| **Continuous Drainer** | Orchestrator that monitors database state and enqueues work |
| **DLQ** | Dead Letter Queue for failed jobs |
| **dbReg** | Prisma client for `regulatory` schema |
| **db** | Prisma client for `public` schema |

---

## 11. Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-10 | Track C Implementation | Initial contract creation |

---

## 12. References

- `/src/lib/regulatory-truth/workers/queues.ts` - Queue definitions
- `/src/lib/regulatory-truth/workers/*.worker.ts` - Worker implementations
- `/prisma/schema.prisma` - Core database schema
- `/prisma/regulatory.prisma` - Regulatory database schema
- `/docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md` - RTL architecture
