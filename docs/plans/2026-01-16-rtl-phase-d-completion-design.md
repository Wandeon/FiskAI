# RTL Phase-D Completion Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Phase-D migration so CandidateFacts flow end-to-end through compose → apply → review → release, with proper grouping, idempotency, and a pipeline kill switch.

**Architecture:** Option A - Extractor queues compose directly after creating CandidateFacts. Drainer provides backstop for orphans only. Single source of truth via `RTL_PIPELINE_MODE` environment variable.

**Tech Stack:** BullMQ, Prisma, TypeScript, Redis

---

## Problem Statement

The Phase-D migration is incomplete:

1. Extractor creates CandidateFacts but compose queueing is disabled
2. Composer expects `candidateFactIds` but drainer sends `pointerIds`
3. "Processed evidence" detection still uses SourcePointers, not CandidateFacts
4. Three overlapping pipeline paths cause confusion and duplicate processing

## Design Decisions (Confirmed)

### Option A: Extractor Queues Compose Directly

**Flow:**

```
Evidence → Extractor → CandidateFacts → [group by concept] → Compose Queue → Composer
```

**Why this is correct:**

- Extractor has full context (just ran extraction)
- Immediate handoff (no polling delay)
- No "evidence processed" detection needed
- Simpler control flow

### CandidateFact Grouping Strategy

Group CandidateFacts before queueing compose jobs:

1. **Primary grouping**: `suggestedConceptSlug` (when populated)
2. **Fallback grouping**: `suggestedDomain` + `suggestedValueType`
3. **Last resort**: All facts from same extraction batch

This ensures semantically related facts are composed together, not mixed bags.

### Idempotent Compose Jobs

Job deduplication via stable `jobId`:

```typescript
const jobId = `compose-${domain}-${sortedCandidateFactIds.join("-")}`
```

Sorting IDs ensures same facts always produce same jobId, preventing duplicate jobs.

### Pipeline Kill Switch

Single environment variable controls pipeline mode:

```typescript
RTL_PIPELINE_MODE = "PHASE_D" | "LEGACY" | "OFF"
```

- `PHASE_D`: Use CandidateFact-based pipeline (new)
- `LEGACY`: Use SourcePointer-based pipeline (old)
- `OFF`: Stop all processing (no LLM calls)

**Enforcement points:**

- `extractor.worker.ts`: Queue compose (Phase-D) or skip (Legacy/Off)
- `continuous-drainer.worker.ts`: Backstop orphans (Phase-D) or full control (Legacy)
- `continuous-pipeline.ts`: Run (Legacy) or exit immediately (Phase-D/Off)
- `agents/sentinel.ts`: Run discovery (Phase-D/Legacy) or skip (Off)
- `sentinel.worker.ts`: Run discovery (Phase-D/Legacy) or skip (Off)

---

## Implementation Phases

### Phase 0: Kill Switch (IMMEDIATE)

Implement pipeline mode switch before any other changes. This allows stopping LLM spending during modifications.

**Files:**

- `src/lib/regulatory-truth/workers/utils/feature-flags.ts`
- `docker-compose.workers.override.yml`
- All enforcement points listed above

### Phase 1: Extractor → Compose Path (P0)

Enable compose queueing in extractor with proper grouping.

**Files:**

- `src/lib/regulatory-truth/workers/extractor.worker.ts`
- `src/lib/regulatory-truth/workers/queues.ts` (verify compose queue exists)

### Phase 2: Drainer Backstop (P0)

Update drainer to:

1. Use CandidateFact-based "processed" detection
2. Only queue compose for orphaned CandidateFacts (backstop)
3. Send `candidateFactIds` not `pointerIds`

**Files:**

- `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts`

### Phase 3: Legacy Guards (P2)

Disable legacy paths when Phase-D is active.

**Files:**

- `src/lib/regulatory-truth/workers/continuous-pipeline.ts`
- `src/lib/regulatory-truth/agents/sentinel.ts`

---

## Acceptance Criteria

### Phase 0: Kill Switch

- [ ] `RTL_PIPELINE_MODE=OFF` stops all extraction/compose/apply/review
- [ ] `RTL_PIPELINE_MODE=PHASE_D` enables new CandidateFact path
- [ ] `RTL_PIPELINE_MODE=LEGACY` enables old SourcePointer path
- [ ] Workers log which mode they're operating in at startup

### Phase 1: Extractor → Compose

- [ ] Extractor queues compose jobs after creating CandidateFacts
- [ ] Jobs grouped by `suggestedConceptSlug` (or fallback)
- [ ] JobId is stable and idempotent
- [ ] Compose queue receives `candidateFactIds` not `pointerIds`

### Phase 2: Drainer Backstop

- [ ] Drainer detects "processed" via CandidateFact existence
- [ ] Drainer only queues compose for orphaned facts (no AgentRun for compose)
- [ ] No duplicate compose jobs (idempotent jobId)

### Phase 3: Legacy Guards

- [ ] `continuous-pipeline.ts` exits immediately when PHASE_D
- [ ] `sentinel.ts` respects kill switch for discovery
- [ ] No duplicate routing from multiple sources

---

## Validation Checklist

End-to-end flow after implementation:

1. New evidence: discovery → OCR (if needed) → extraction → compose → apply → review → release
2. No duplicate jobs created across multiple routing sources
3. CandidateFacts with status=CAPTURED get composed
4. CandidateFacts with status=PROMOTED are linked to rules
5. Kill switch immediately stops LLM spending when set to OFF

---

## Risk Mitigation

1. **Deploy kill switch first** - Can stop processing if issues arise
2. **Test with single evidence** - Don't process backlog until validated
3. **Monitor CandidateFact status distribution** - Watch for stuck CAPTURED facts
4. **Keep drainer backstop** - Catches any facts missed by extractor path

---

_Design confirmed by user on 2026-01-16_
