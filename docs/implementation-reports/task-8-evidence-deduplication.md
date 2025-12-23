# Task 8: Evidence Deduplication Implementation Report

**Date:** 2025-12-23
**Task:** Fix evidence idempotency - dedupe by URL+hash (RTL-008)
**Status:** ✅ Complete

## Problem

The Evidence table could have duplicate entries for the same URL and content hash combination. This occurred because the sentinel worker used `create()` instead of `upsert()`, allowing multiple records with identical content to be stored.

**Duplicate Found:**

- URL: `https://www.porezna-uprava.hr/HR_publikacije/Stranice/Misljenja_Upute.aspx`
- Content Hash: `47d70a70d050f8d57b09f94eafc08e4c2d05988058d9ce4779b4194cedff838e`
- Count: 2 records

## Solution Implemented

### 1. Database Schema Update

**File:** `/home/admin/FiskAI/prisma/schema.prisma`

Added unique constraint to Evidence model:

```prisma
model Evidence {
  // ... existing fields ...

  @@unique([url, contentHash])  // NEW: Prevents duplicates
  @@index([sourceId])
  @@index([fetchedAt])
  @@index([contentHash])
}
```

### 2. Duplicate Cleanup

**Pre-Migration Step:**

Before applying the unique constraint, existing duplicates were merged:

```sql
-- Identified duplicate group
URL: https://www.porezna-uprava.hr/HR_publikacije/Stranice/Misljenja_Upute.aspx
Hash: 47d70a70d050f8d57b09f94eafc08e4c2d05988058d9ce4779b4194cedff838e

-- Kept newest record: cmjg057gk000ap3waqu4jxgzj (2025-12-21 17:29:36)
--   - 6 SourcePointers
--   - 4 AgentRuns

-- Migrated from older record: cmjfwtxiu001aflwa7ih6u9yv (2025-12-21 15:56:51)
--   - 5 SourcePointers → migrated to newer record
--   - 4 AgentRuns → migrated to newer record
--   - Record deleted after migration
```

**Actions Taken:**

1. Migrated 5 SourcePointers from old record to new record
2. Migrated 4 AgentRuns from old record to new record
3. Deleted old duplicate Evidence record
4. Verified no duplicates remained

### 3. Migration Applied

**File:** `/home/admin/FiskAI/prisma/migrations/20251223_add_evidence_unique_constraint/migration.sql`

```sql
-- Add unique constraint on Evidence (url, contentHash) to prevent duplicates
CREATE UNIQUE INDEX "Evidence_url_contentHash_key" ON "Evidence"("url", "contentHash");
```

**Migration Status:** ✅ Applied to database and registered in `_prisma_migrations`

### 4. Sentinel Worker Update

**File:** `/home/admin/FiskAI/src/lib/regulatory-truth/agents/sentinel.ts`

Changed from `create()` to `upsert()`:

```typescript
// BEFORE:
const evidence = await db.evidence.create({
  data: {
    sourceId: source.id,
    url: item.url,
    rawContent: content,
    contentHash,
    contentType: "html",
    hasChanged: isContentChange,
    changeSummary: isContentChange ? `Content updated...` : null,
  },
})

// AFTER:
const evidence = await db.evidence.upsert({
  where: {
    url_contentHash: {
      url: item.url,
      contentHash,
    },
  },
  create: {
    sourceId: source.id,
    url: item.url,
    rawContent: content,
    contentHash,
    contentType: "html",
    hasChanged: isContentChange,
    changeSummary: isContentChange ? `Content updated...` : null,
  },
  update: {
    // If we re-encounter same content, just update fetchedAt timestamp
    fetchedAt: new Date(),
  },
})
```

**Benefits:**

- If evidence with same (url, contentHash) exists → updates fetchedAt timestamp
- If evidence doesn't exist → creates new record
- Never creates duplicates
- Idempotent operation

### 5. Cleanup Script Created

**File:** `/home/admin/FiskAI/scripts/cleanup-duplicate-evidence.ts`

A reusable script that:

1. Finds all duplicate groups by (url, contentHash)
2. Keeps the newest record (latest fetchedAt)
3. Migrates all SourcePointers and AgentRuns to newest record
4. Deletes older duplicate records
5. Verifies no duplicates remain

**Note:** This script is available for future use if needed, though the unique constraint should prevent new duplicates.

## Testing

### Database Constraint Test

```sql
-- Attempted to insert duplicate
INSERT INTO "Evidence" (...)
VALUES (...); -- First insert: SUCCESS

INSERT INTO "Evidence" (...)
VALUES (...); -- Second insert with same url+contentHash: FAILED

-- Result: ERROR: duplicate key value violates unique constraint
--         "Evidence_url_contentHash_key"
```

✅ Unique constraint working correctly

### Prisma Client Test

Generated Prisma types include:

```typescript
// Type definition includes url_contentHash unique field
type EvidenceWhereUniqueInput = {
  id?: string
  url_contentHash?: EvidenceUrlContentHashCompoundUniqueInput
}
```

✅ Prisma client correctly generated with unique constraint

## Verification

### Pre-Implementation State

```sql
SELECT url, "contentHash", COUNT(*) as cnt
FROM "Evidence"
GROUP BY url, "contentHash"
HAVING COUNT(*) > 1;

-- Result: 1 duplicate group found
```

### Post-Implementation State

```sql
SELECT url, "contentHash", COUNT(*) as cnt
FROM "Evidence"
GROUP BY url, "contentHash"
HAVING COUNT(*) > 1;

-- Result: 0 duplicate groups (no duplicates)
```

### Database Constraints

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Evidence' AND indexdef LIKE '%UNIQUE%';

-- Result:
-- Evidence_url_contentHash_key | CREATE UNIQUE INDEX ... ON "Evidence"("url", "contentHash")
-- Evidence_pkey                | CREATE UNIQUE INDEX ... ON "Evidence"("id")
```

## Impact Analysis

### Positive Impacts

1. **Data Integrity:** Prevents duplicate evidence records at database level
2. **Performance:** Upsert operation prevents redundant data storage
3. **Consistency:** Sentinel worker now idempotent - can be safely rerun
4. **Storage:** Reduced storage waste from duplicate content
5. **Relationships:** All existing SourcePointers and AgentRuns preserved during migration

### No Breaking Changes

- Existing code continues to work
- Related tables (SourcePointer, AgentRun) unaffected
- Query performance maintained with existing indexes
- All relationships migrated successfully

## Files Changed

1. ✅ `prisma/schema.prisma` - Added @@unique([url, contentHash])
2. ✅ `prisma/migrations/20251223_add_evidence_unique_constraint/migration.sql` - Migration file
3. ✅ `src/lib/regulatory-truth/agents/sentinel.ts` - Changed create() to upsert()
4. ✅ `scripts/cleanup-duplicate-evidence.ts` - Cleanup script for future use

## Commit

```
feat(regulatory-truth): add evidence deduplication constraint

- Added @@unique([url, contentHash]) to Evidence model
- Sentinel uses upsert instead of create to prevent duplicates
- Created cleanup script to merge existing duplicate evidence
- Migrated SourcePointers and AgentRuns from old to new records
- Migration applied: unique index on Evidence(url, contentHash)

Fixes RTL-008
```

**Commit Hash:** e819be5

## Conclusion

Task 8 successfully implemented. Evidence deduplication is now enforced at both:

1. **Database level:** Unique constraint on (url, contentHash)
2. **Application level:** Sentinel worker uses upsert instead of create

The single existing duplicate was properly merged, preserving all relationships. Future duplicate insertions are prevented by the unique constraint.

**Status:** ✅ Complete and tested
**Next Task:** Task 9 - Fix rules pending review without source pointers (RTL-009)
