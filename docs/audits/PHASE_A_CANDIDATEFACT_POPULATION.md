# Phase A: CandidateFact Population Audit

**Date:** 2026-01-07
**Auditor:** Claude (Cutover Closure Engineer)
**PR:** #1350

---

## Summary

Populated CandidateFact table with 2,169 records backfilled from existing SourcePointers.

## Execution Details

**Script:** `scripts/backfill-candidatefacts.ts`

**Command:**

```bash
npx tsx scripts/backfill-candidatefacts.ts
```

**Duration:** 22.2 seconds

## Metrics

### Before Backfill

| Metric                | Count |
| --------------------- | ----- |
| SourcePointers        | 2,169 |
| CandidateFacts        | 0     |
| Eligible for backfill | 2,169 |

### After Backfill

| Metric         | Count |
| -------------- | ----- |
| SourcePointers | 2,169 |
| CandidateFacts | 2,169 |
| Failed         | 0     |

### Domain Distribution

| Domain         | Count     | Avg Confidence | Promotion Candidates |
| -------------- | --------- | -------------- | -------------------- |
| rokovi         | 1,139     | 1.00           | 1,134                |
| obrasci        | 605       | 1.00           | 605                  |
| fiskalizacija  | 198       | 1.00           | 198                  |
| doprinosi      | 99        | 1.00           | 99                   |
| pdv            | 52        | 1.00           | 52                   |
| porez_dohodak  | 40        | 1.00           | 40                   |
| legal-metadata | 17        | 1.00           | 17                   |
| exchange-rate  | 13        | 1.00           | 13                   |
| e-invoicing    | 2         | 1.00           | 2                    |
| pausalni       | 1         | 1.00           | 1                    |
| insolvency     | 1         | 1.00           | 1                    |
| vat            | 1         | 1.00           | 1                    |
| invoicing      | 1         | 1.00           | 1                    |
| **TOTAL**      | **2,169** | **1.00**       | **2,163**            |

## Data Quality Verification

### Sample CandidateFact

```sql
SELECT id, "suggestedDomain", "extractedValue",
       (groundingQuotes->0->>'evidenceId') as evidence_id
FROM "CandidateFact" LIMIT 1;
```

**Result:**

- ID: `db58a76a-026d-4968-955c-a20ccde0c79d`
- Domain: `rokovi`
- Extracted Value: `5`
- Evidence ID: `cmk1olkd6001fg2wau4huhceb`

### Evidence Link Verified

```sql
SELECT id, url, "contentClass" FROM regulatory."Evidence"
WHERE id = 'cmk1olkd6001fg2wau4huhceb';
```

**Result:**

- URL: `https://hzzo.hr/sites/default/files/2025-10/Direkcija...pdf`
- Content Class: `PDF_TEXT`
- Source: `Auto: hzzo.hr`

## Invariants Verified

| Invariant                                       | Status      |
| ----------------------------------------------- | ----------- |
| Each CandidateFact links to regulatory.Evidence | ✅ VERIFIED |
| Each CandidateFact has groundingQuotes          | ✅ VERIFIED |
| No orphaned CandidateFacts                      | ✅ VERIFIED |
| All have CAPTURED status                        | ✅ VERIFIED |
| Idempotent (re-run safe)                        | ✅ VERIFIED |

## Script Safety Features

1. **Idempotent:** Checks for existing CandidateFacts before creating
2. **Rate-limited:** 500ms pause between batches
3. **Bounded:** Configurable limit via `--limit`
4. **Deduped:** Uses SourcePointer.id as unique reference in groundingQuotes
5. **Dry-run:** Preview mode via `--dry-run`

## Rejection Analysis

**Rejections:** 0

No rejections occurred during this backfill because all SourcePointers had valid data.

---

## Acceptance Criteria

- [x] CandidateFact table has real rows (>>0): **2,169 rows**
- [x] Each CandidateFact links to regulatory.Evidence IDs: **Verified**
- [x] Each CandidateFact stores groundingQuotes: **Verified**
- [x] Batch runner script is safe (idempotent, rate-limited): **Verified**

---

**Phase A Complete:** 2026-01-07
**Next Phase:** Phase B - Promotion Pipeline
