# Phase D: Stop Legacy Writes

**Date:** 2026-01-07
**PR:** #1353
**Branch:** `cutover/phase-d-stop-legacy-writes`

## Objective

Remove SourcePointer creation from the extractor agent. After this phase, all new extractions write exclusively to CandidateFact.

## Changes Made

### File: `src/lib/regulatory-truth/agents/extractor.ts`

#### 1. Removed SourcePointer Creation (lines 281-300)

**Before:**

```typescript
const pointer = await db.sourcePointer.create({
  data: {
    evidenceId: evidence.id,
    domain: extraction.domain,
    valueType: extraction.value_type,
    // ... 15 more fields
  },
})
sourcePointerIds.push(pointer.id)
```

**After:**

```typescript
// PHASE-D: CandidateFact is now the primary extraction storage
// SourcePointer creation removed - Phase-1 system is canonical
const candidateFact = await db.candidateFact.create({
  data: {
    suggestedDomain: extraction.domain,
    suggestedValueType: extraction.value_type,
    // ... CandidateFact fields
  },
})
candidateFactIds.push(candidateFact.id)
```

#### 2. Removed Embedding Generation

**Before:**

```typescript
if (sourcePointerIds.length > 0) {
  const embeddings = await generatePointerEmbeddingsBatch(sourcePointerIds)
}
```

**After:**

```typescript
// PHASE-D: SourcePointer embedding generation removed
// Embeddings for CandidateFacts/RuleFacts are generated during promotion
```

#### 3. Updated Batch Processing

**Before:**

```typescript
const pointersWithEvidence = await db.sourcePointer.findMany({
  select: { evidenceId: true },
  distinct: ["evidenceId"],
})
```

**After:**

```typescript
const candidateFactsWithEvidence = await db.candidateFact.findMany({
  select: { groundingQuotes: true },
})
// Extract unique evidenceIds from groundingQuotes JSON
```

#### 4. Updated Interface

```typescript
export interface ExtractorResult {
  success: boolean
  output: ExtractorOutput | null
  /** @deprecated PHASE-D: SourcePointer creation removed. Use candidateFactIds instead. */
  sourcePointerIds: string[] // Always empty for backward compatibility
  /** PHASE-D: CandidateFacts created during extraction */
  candidateFactIds: string[]
  error: string | null
}
```

## Data Flow After Phase D

```
Evidence → Extractor → CandidateFact (only)
                           ↓
                    Promotion Script
                           ↓
                       RuleFact
```

**SourcePointer table is now read-only legacy data.**

## Verification

### CI Status (PR #1353)

- [x] TypeScript Check: PASS
- [x] Unit Tests: PASS
- [x] Integration Tests (DB): PASS
- [x] Lint & Format: PASS
- [x] Architecture Compliance: PASS
- [ ] E2E Tests: Pre-existing failure (no DB in workflow)

### Code Verification

- [x] No `db.sourcePointer.create()` calls remain in extractor
- [x] `generatePointerEmbeddingsBatch` import removed
- [x] Return type includes `candidateFactIds`
- [x] Backward compatibility maintained via empty `sourcePointerIds`

## Impact

| Metric                              | Before        | After        |
| ----------------------------------- | ------------- | ------------ |
| SourcePointer writes per extraction | 1+            | 0            |
| CandidateFact writes per extraction | 1+            | 1+           |
| Embedding generation                | On extraction | On promotion |

## Rollback Plan

If issues arise:

1. Revert PR #1353
2. SourcePointer creation will resume
3. Dual-write mode restored

## Next Steps

- Phase E: Run cutover-audit.ts to verify complete system state
- Merge PRs #1352 and #1353 after review
- Monitor for any extraction failures post-merge
