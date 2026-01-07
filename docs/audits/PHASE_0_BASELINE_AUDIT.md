# Phase 0: Baseline Truth Audit

**Date:** 2026-01-07
**Auditor:** Claude (Bridge & Cutover Engineer)
**Purpose:** Establish exact state before bridge implementation

---

## Summary of Critical Findings

| Finding                      | Severity | Impact                                                    |
| ---------------------------- | -------- | --------------------------------------------------------- |
| Evidence split-brain         | CRITICAL | Two Evidence tables with referential integrity issues     |
| Phase-1 models orphaned      | HIGH     | CandidateFact, RuleFact exist in DB but not in Prisma     |
| public.Evidence schema drift | HIGH     | Table exists in DB but removed from Prisma                |
| SourcePointer FK violation   | MEDIUM   | References both Evidence tables (soft ref, no constraint) |

---

## Section 1: Entity Row Counts

### Production Tables (Active)

| Schema     | Table          | Row Count | In Prisma?       | Production Write?      | Production Read?           |
| ---------- | -------------- | --------- | ---------------- | ---------------------- | -------------------------- |
| public     | RegulatoryRule | 615       | YES              | YES (composer.ts:379)  | YES (rule-selector.ts:131) |
| public     | SourcePointer  | 2,177     | YES              | YES (extractor.ts:278) | YES (via rule include)     |
| public     | Concept        | 480       | YES              | YES                    | YES                        |
| public     | Evidence       | 2,022     | **NO** (removed) | NO (legacy)            | NO                         |
| regulatory | Evidence       | 169       | YES              | YES (fetchers)         | YES (extractor.ts:110)     |

### Phase-1 Tables (Empty)

| Schema     | Table         | Row Count | In Prisma? | Write Path | Read Path |
| ---------- | ------------- | --------- | ---------- | ---------- | --------- |
| public     | CandidateFact | 0         | **NO**     | None       | None      |
| public     | AtomicClaim   | 0         | **NO**     | None       | None      |
| regulatory | RuleFact      | 0         | **NO**     | None       | None      |

---

## Section 2: Evidence Split-Brain Analysis

### The Problem

SourcePointers reference **BOTH** Evidence tables via soft reference (no FK constraint):

```sql
-- Query results:
References public.Evidence     | 1,995
References regulatory.Evidence |   182
Orphaned (no match)            |     0
```

### Timeline of Divergence

| Date                     | Evidence Table      | SourcePointer Count |
| ------------------------ | ------------------- | ------------------- |
| 2025-12-21 to 2025-12-25 | public.Evidence     | 1,995               |
| 2026-01-06               | regulatory.Evidence | 182                 |

### Root Cause

1. **Original design:** Evidence lived in `public` schema, managed by `prisma/schema.prisma`
2. **Migration:** Evidence was moved to `regulatory` schema in `prisma/regulatory.prisma`
3. **Schema drift:** `public.Evidence` was removed from `schema.prisma` but table remained in DB
4. **Fetchers updated:** Now write to `dbReg.evidence` (regulatory.Evidence)
5. **Result:** Historical SourcePointers still reference old `public.Evidence` IDs

### Current Write Paths

**Fetchers (create Evidence):**

```typescript
// src/lib/regulatory-truth/fetchers/hnb-fetcher.ts:133
const evidence = await dbReg.evidence.create({...})  // regulatory.Evidence
```

**Extractor (reads Evidence, creates SourcePointer):**

```typescript
// src/lib/regulatory-truth/agents/extractor.ts:110
const evidence = await dbReg.evidence.findUnique({...})  // regulatory.Evidence

// src/lib/regulatory-truth/agents/extractor.ts:278
const pointer = await db.sourcePointer.create({
  data: {
    evidenceId: evidence.id,  // References regulatory.Evidence
    ...
  }
})
```

---

## Section 3: Prisma Schema Drift

### Tables in DB but NOT in Prisma

| Table         | Database Location    | Prisma Location    | Status   |
| ------------- | -------------------- | ------------------ | -------- |
| Evidence      | public.Evidence      | **NONE** (removed) | ORPHANED |
| CandidateFact | public.CandidateFact | **NONE**           | ORPHANED |
| AtomicClaim   | public.AtomicClaim   | **NONE**           | ORPHANED |
| RuleFact      | regulatory.RuleFact  | **NONE**           | ORPHANED |

### Prisma File Inventory

| File                       | Tables Defined                                     | Evidence Model?         |
| -------------------------- | -------------------------------------------------- | ----------------------- |
| `prisma/schema.prisma`     | SourcePointer, RegulatoryRule, Concept, etc.       | NO                      |
| `prisma/regulatory.prisma` | RegulatorySource, Evidence, EvidenceArtifact, etc. | YES (regulatory schema) |

### Verification Commands

```bash
# Check for Evidence in schema.prisma
grep -c "model Evidence" prisma/schema.prisma
# Result: 0

# Check for Evidence in regulatory.prisma
grep -c "model Evidence" prisma/regulatory.prisma
# Result: 1 (in regulatory schema)
```

---

## Section 4: Write Path Mapping

### SourcePointer Writes (PRODUCTION ACTIVE)

| File                                               | Function         | Line | Target                      | Active? |
| -------------------------------------------------- | ---------------- | ---- | --------------------------- | ------- |
| `src/lib/regulatory-truth/agents/extractor.ts`     | `runExtractor()` | 278  | `db.sourcePointer.create()` | **YES** |
| `src/lib/regulatory-truth/fetchers/hnb-fetcher.ts` | N/A              | N/A  | SKIPPED (domain leakage)    | NO      |

### RegulatoryRule Writes (PRODUCTION ACTIVE)

| File                                               | Function           | Line | Target                       | Active? |
| -------------------------------------------------- | ------------------ | ---- | ---------------------------- | ------- |
| `src/lib/regulatory-truth/agents/composer.ts`      | `runComposer()`    | 379  | `db.regulatoryRule.create()` | **YES** |
| `src/lib/regulatory-truth/fetchers/hnb-fetcher.ts` | `createHNBRules()` | ~180 | `db.regulatoryRule.create()` | **YES** |

### Evidence Writes (PRODUCTION ACTIVE)

| File                                                  | Function           | Line    | Target                    | Active? |
| ----------------------------------------------------- | ------------------ | ------- | ------------------------- | ------- |
| `src/lib/regulatory-truth/fetchers/hnb-fetcher.ts`    | `createHNBRules()` | 133     | `dbReg.evidence.create()` | **YES** |
| `src/lib/regulatory-truth/fetchers/eurlex-fetcher.ts` | `fetchEurLex()`    | ~168    | `dbReg.evidence.create()` | **YES** |
| `src/lib/regulatory-truth/fetchers/mrms-fetcher.ts`   | Various            | Various | `dbReg.evidence.create()` | **YES** |

### CandidateFact Writes

**NONE** - No production code writes to CandidateFact

### RuleFact Writes

**NONE** - No production code writes to RuleFact

---

## Section 5: Read Path Mapping

### Assistant Query Path (ONLY PATH TO ANSWERS)

```typescript
// src/lib/assistant/query-engine/rule-selector.ts:131-140
const allRulesRaw = await prisma.regulatoryRule.findMany({
  where: {
    conceptSlug: { in: conceptSlugs },
    status: "PUBLISHED",
  },
  include: {
    sourcePointers: true, // For grounding citations
  },
  orderBy: [{ authorityLevel: "asc" }, { confidence: "desc" }, { effectiveFrom: "desc" }],
})
```

### Verified: NO Phase-1 Model Queries

```bash
grep -r "ruleFact" src/lib/assistant/
# Result: 0 matches

grep -r "candidateFact" src/lib/assistant/
# Result: 0 matches
```

---

## Section 6: Database FK Constraints

### SourcePointer Foreign Keys

```sql
-- Result: NO FK constraints on SourcePointer.evidenceId
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name = 'SourcePointer';
-- 0 rows
```

**Impact:** SourcePointer.evidenceId is a soft reference. Database does not enforce which Evidence table it references.

---

## Section 7: Canonical Truth Decision Required

### Evidence Table Decision

| Option                             | Pros                                   | Cons                                     |
| ---------------------------------- | -------------------------------------- | ---------------------------------------- |
| `regulatory.Evidence` as canonical | Already in Prisma, fetchers write here | 1,995 SourcePointers orphaned            |
| `public.Evidence` as canonical     | Has historical data                    | Not in Prisma, would need re-adding      |
| Migrate public → regulatory        | Preserves data                         | Complex migration, ID conflicts possible |

### Recommended: `regulatory.Evidence` as Canonical

1. It's the forward-looking architecture (RTL isolation)
2. It's already active in production fetchers
3. Historical `public.Evidence` data can be migrated with new IDs
4. SourcePointer.evidenceId can be updated in batch

---

## Section 8: Pre-Bridge State Summary

### What Exists and Works

```
Evidence (regulatory) → Fetchers → ✓ ACTIVE
Evidence (regulatory) → Extractor → SourcePointer → ✓ ACTIVE
SourcePointer → Composer → RegulatoryRule → ✓ ACTIVE
RegulatoryRule → Assistant → ✓ ACTIVE
```

### What Exists but Doesn't Work

```
Evidence (public) → 2,022 rows → ✗ ORPHANED (not in Prisma)
SourcePointers → 1,995 reference public.Evidence → ✗ SPLIT-BRAIN
CandidateFact → 0 rows → ✗ NOT CONNECTED
RuleFact → 0 rows → ✗ NOT CONNECTED
```

### Target End State

```
Evidence (regulatory ONLY) → Extractor → CandidateFact → (Promotion) → RuleFact → Assistant
```

---

## Verification SQL Snippets

```sql
-- Count all tables
SELECT 'public.Evidence' as t, COUNT(*) FROM public."Evidence"
UNION ALL SELECT 'regulatory.Evidence', COUNT(*) FROM regulatory."Evidence"
UNION ALL SELECT 'public.SourcePointer', COUNT(*) FROM public."SourcePointer"
UNION ALL SELECT 'public.RegulatoryRule', COUNT(*) FROM public."RegulatoryRule"
UNION ALL SELECT 'public.CandidateFact', COUNT(*) FROM public."CandidateFact"
UNION ALL SELECT 'regulatory.RuleFact', COUNT(*) FROM regulatory."RuleFact";

-- Check SourcePointer evidence references
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM public."Evidence" e WHERE e.id = sp."evidenceId")
    THEN 'public.Evidence'
    WHEN EXISTS (SELECT 1 FROM regulatory."Evidence" re WHERE re.id = sp."evidenceId")
    THEN 'regulatory.Evidence'
    ELSE 'ORPHANED'
  END as evidence_table,
  COUNT(*)
FROM public."SourcePointer" sp
GROUP BY 1;
```

---

**Audit Complete:** 2026-01-07
**Next Phase:** Phase 1 - Canonical Evidence Consolidation
