# Phase E: Final Cutover Audit

**Date:** 2026-01-07
**Script:** `scripts/cutover-audit.ts`
**Status:** Script created, pending production run

## Objective

Verify the Phase-1 cutover is complete by checking:

1. RuleFact has PUBLISHED records
2. CandidateFact is being populated
3. SourcePointer writes have stopped
4. Evidence linkage is intact

## Audit Script

Created `scripts/cutover-audit.ts` which performs 7 verification checks:

### Check 1: RuleFact Population

```typescript
const ruleFactCount = await dbReg.ruleFact.count()
const publishedRuleFacts = await dbReg.ruleFact.count({ where: { status: "PUBLISHED" } })
```

- PASS: Published RuleFacts exist
- WARN: RuleFacts exist but none PUBLISHED
- FAIL: No RuleFacts found

### Check 2: CandidateFact Population

```typescript
const candidateFactCount = await db.candidateFact.count()
const recentCandidateFacts = await db.candidateFact.count({
  where: { createdAt: { gte: oneHourAgo } },
})
```

- PASS: CandidateFacts exist
- WARN: No CandidateFacts found

### Check 3: SourcePointer Writes Stopped

```typescript
const recentSourcePointers = await db.sourcePointer.count({
  where: { createdAt: { gte: oneHourAgo } },
})
```

- PASS: No new SourcePointers in last hour
- FAIL: New SourcePointers detected (legacy writes still active)

### Check 4: RuleFact Evidence Linkage

```typescript
const ruleFactsWithQuotes = await dbReg.ruleFact.findMany({
  where: { status: "PUBLISHED" },
  select: { id: true, groundingQuotes: true },
})
// Check if groundingQuotes have evidenceId
```

- PASS: All RuleFacts have evidence links
- WARN: Some RuleFacts missing evidence links

### Check 5: Legacy Migration Completeness

```typescript
const legacyRuleCount = await db.regulatoryRule.count()
const coverage = (ruleFactCount / legacyRuleCount) * 100
```

- PASS: RuleFacts >= RegulatoryRules
- WARN: Migration incomplete

### Check 6: Evidence Processing Coverage

```typescript
const totalEvidence = await dbReg.evidence.count()
// Count unique evidenceIds in CandidateFacts
```

- PASS: Evidence records have CandidateFacts
- WARN: Low coverage

### Check 7: Concept Coverage

```typescript
const conceptsWithRuleFacts = await dbReg.ruleFact.findMany({
  where: { status: "PUBLISHED" },
  select: { conceptSlug: true },
  distinct: ["conceptSlug"],
})
```

- PASS: Concepts have RuleFacts
- WARN: Low concept coverage

## Local Run Status

**Error:** `type "regulatory.RuleFactStatus" does not exist`

The local development database doesn't have the RuleFact migration applied. This is expected - the migration exists but hasn't been run locally.

### To Run Audit on Production:

```bash
# SSH to production server
DATABASE_URL="<production-url>" npx tsx scripts/cutover-audit.ts
```

### To Run Audit Locally:

```bash
# First apply migrations
npx prisma migrate deploy --schema=prisma/regulatory.prisma

# Then run audit
DATABASE_URL="postgresql://..." npx tsx scripts/cutover-audit.ts
```

## Expected Output (When Run)

```
======================================================================
CUTOVER AUDIT - Phase-1 Verification
======================================================================

CHECK 1: RuleFact population...
CHECK 2: CandidateFact population...
CHECK 3: SourcePointer writes stopped...
CHECK 4: RuleFact evidence linkage...
CHECK 5: Legacy migration completeness...
CHECK 6: Evidence processing coverage...
CHECK 7: Concept linkage...

======================================================================
AUDIT RESULTS
======================================================================

✅ RuleFact population
   100 total RuleFacts, 100 PUBLISHED

✅ CandidateFact population
   2169 total CandidateFacts, 0 created in last hour

✅ SourcePointer writes stopped
   No new SourcePointers in last hour (X total legacy)

...

======================================================================
Summary: X PASS, Y WARN, Z FAIL
======================================================================

✅ CUTOVER COMPLETE - All checks passed
```

## Cutover Summary

### PRs Created

| Phase | PR    | Status         |
| ----- | ----- | -------------- |
| A     | #1350 | Merged         |
| B     | #1351 | Merged         |
| C     | #1352 | Awaiting merge |
| D     | #1353 | Awaiting merge |

### Data Flow (Final State)

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Evidence   │ ──▶ │ CandidateFact │ ──▶ │   RuleFact   │
│   (fetch)    │     │  (extract)    │     │  (promote)   │
└──────────────┘     └───────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Assistant   │
                                          │ (read-only)  │
                                          └──────────────┘
```

### Legacy Tables (Read-Only After Cutover)

- `SourcePointer` - No new writes
- `RegulatoryRule` - No longer queried

### Scripts Created

| Script                               | Purpose                           |
| ------------------------------------ | --------------------------------- |
| `scripts/backfill-candidatefacts.ts` | Phase A - Populate CandidateFacts |
| `scripts/promote-candidatefacts.ts`  | Phase B - Promote to RuleFacts    |
| `scripts/cutover-audit.ts`           | Phase E - Verify cutover complete |

## Post-Cutover Actions

1. **Merge PRs #1352 and #1353** - Complete the code cutover
2. **Run audit on production** - Verify database state
3. **Monitor extractor logs** - Ensure CandidateFacts are being created
4. **Schedule SourcePointer cleanup** - Optional: archive or delete legacy data
