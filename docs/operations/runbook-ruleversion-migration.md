# RuleVersion Bundle Migration Runbook

**Purpose:** Migrate RuleVersion bundle (RuleTable, RuleVersion, RuleSnapshot, RuleCalculation) from core schema to regulatory schema.

**Last Verified:** 2026-01-04 (development environment)

## Overview

This migration enables the RuleVersion bundle to be read from the regulatory database schema instead of the core schema. The migration is designed to be:

- **Idempotent** - Safe to re-run, uses skipDuplicates
- **Non-destructive** - Copies data without modifying source
- **Verifiable** - Parity check before cutover
- **Reversible** - Set RULE_VERSION_SOURCE back to "core" to rollback

## Prerequisites

1. **Database Access**
   - Core database accessible via DATABASE_URL
   - Regulatory schema accessible via REGULATORY_DATABASE_URL
   - Both can be the same database with different schemas

2. **Schema Ready**
   - regulatory.prisma includes RuleTable, RuleVersion, RuleSnapshot, RuleCalculation
   - All models have `@@schema("regulatory")` directive
   - Prisma client regenerated with multiSchema support

3. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://...?schema=public
   REGULATORY_DATABASE_URL=postgresql://...?schema=regulatory
   ```

## Pre-Migration Steps

### 1. Take Database Backup

```bash
# Create backup
pg_dump -U fiskai -d fiskai -Fc > fiskai_backup_$(date +%Y%m%d_%H%M%S).dump

# Or via Docker
docker exec fiskai-db pg_dump -U fiskai -d fiskai -Fc > backup.dump
```

### 2. Verify Regulatory Schema Exists

```bash
# Check tables exist
docker exec fiskai-db psql -U fiskai -d fiskai -c "
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'regulatory'
  AND table_name IN ('rule_table', 'rule_version', 'rule_snapshot', 'rule_calculation');
"
```

Expected: 4 rows showing the tables exist in regulatory schema.

### 3. Push Schema if Needed

If tables don't exist, push the schema:

```bash
# Note: May need to manually create Evidence table first due to vector type
npx prisma db push --schema=prisma/regulatory.prisma --url="$REGULATORY_DATABASE_URL"
```

## Migration Execution

### Step 1: Run Copy Script (Dry Run)

```bash
npx tsx scripts/copy-ruleversion-to-regulatory.ts --dry-run
```

**Expected Output:**

```
=== Copy RuleVersion Bundle to Regulatory DB ===
Mode: DRY RUN
...
```

Review the counts before proceeding.

### Step 2: Run Copy Script (Live)

```bash
npx tsx scripts/copy-ruleversion-to-regulatory.ts
```

**Expected Output:**

```
=== Copy RuleVersion Bundle to Regulatory DB ===
Mode: LIVE
...
| Table            | Scanned | Inserted | Skipped |
|------------------|---------|----------|---------|
| RuleTable        |       7 |        7 |       0 |
| RuleVersion      |       7 |        7 |       0 |
| RuleSnapshot     |       0 |        0 |       0 |
| RuleCalculation  |       0 |        0 |       0 |
```

### Step 3: Verify Parity

```bash
npx tsx scripts/verify-ruleversion-parity.ts
```

**Expected Output:**

```
=== Parity Verification Summary ===

| Table            | Status | Core Count | Reg Count |
|------------------|--------|------------|-----------|
| RuleTable        | PASS   |          7 |         7 |
| RuleVersion      | PASS   |          7 |         7 |
| RuleSnapshot     | PASS   |          0 |         0 |
| RuleCalculation  | PASS   |          0 |         0 |

All parity checks PASSED.
```

### Step 4: Prove Idempotency

Run copy again to verify no duplicates created:

```bash
npx tsx scripts/copy-ruleversion-to-regulatory.ts
```

**Expected Output:**

```
| Table            | Scanned | Inserted | Skipped |
|------------------|---------|----------|---------|
| RuleTable        |       7 |        7 |       0 |
| RuleVersion      |       7 |        0 |       7 |  # <-- All skipped
```

## Cutover Procedure

### Phase 1: Dual Mode (Staging)

1. Set environment variable:

   ```bash
   RULE_VERSION_SOURCE=dual
   ```

2. Deploy to staging

3. **Monitor metrics endpoint:**

   ```bash
   # Check dual-mode metrics
   curl -s https://staging.fiskai.hr/api/health/ruleversion-dual | jq
   ```

   Expected healthy response:

   ```json
   {
     "source": "dual",
     "metrics": {
       "reads": { "core": 42, "regulatory": 42, "total": 84 },
       "mismatches": { "total": 0, "byTableKey": {}, "byField": {} },
       "missing": { "inCore": 0, "inRegulatory": 0 }
     },
     "healthy": true,
     "timestamp": "2026-01-04T..."
   }
   ```

4. **Monitor structured logs for mismatches:**

   ```bash
   # Search for parity events
   grep -E "parity_mismatch|parity_missing" /var/log/app/*.log

   # Or via Loki/Grafana:
   # {app="fiskai"} |= "parity_mismatch"
   ```

5. Run integration tests

### Phase 2: Regulatory Mode (Production)

**Production flip criteria - ALL must be met:**

1. Staging has run in dual mode for real window (hours to a day) with 0 mismatches
2. No latency spikes or DB pool starvation in dbReg
3. At least one full end-to-end payout + JOPPD generation validated
4. Metrics endpoint shows `healthy: true` consistently

**Production sequence:**

1. Set environment variable for DUAL first:

   ```bash
   RULE_VERSION_SOURCE=dual
   ```

2. Deploy to production, monitor metrics endpoint:

   ```bash
   watch -n 30 'curl -s https://fiskai.hr/api/health/ruleversion-dual | jq ".healthy, .metrics.mismatches.total"'
   ```

3. After stability window (minimum 4 hours, recommended 24 hours):

   ```bash
   RULE_VERSION_SOURCE=regulatory
   ```

4. Deploy final cutover

5. Monitor application behavior for 24-48 hours

## Rollback Procedure

If issues arise after cutover:

1. **Immediate Rollback:**

   ```bash
   RULE_VERSION_SOURCE=core
   ```

2. Deploy with the changed environment variable

3. Investigate issues with regulatory data

## Verification Queries

### Check RuleVersion Counts by Table

```sql
-- Core schema
SELECT rt."key", COUNT(rv.id) as versions
FROM public."RuleTable" rt
LEFT JOIN public."RuleVersion" rv ON rv."tableId" = rt.id
GROUP BY rt."key"
ORDER BY rt."key";

-- Regulatory schema
SELECT rt."key", COUNT(rv.id) as versions
FROM regulatory.rule_table rt
LEFT JOIN regulatory.rule_version rv ON rv."tableId" = rt.id
GROUP BY rt."key"
ORDER BY rt."key";
```

### Check for Data Hash Mismatches

```sql
-- Compare data hashes between schemas
WITH core_versions AS (
  SELECT rt."key", rv.version, rv."dataHash"
  FROM public."RuleTable" rt
  JOIN public."RuleVersion" rv ON rv."tableId" = rt.id
),
reg_versions AS (
  SELECT rt."key", rv.version, rv."dataHash"
  FROM regulatory.rule_table rt
  JOIN regulatory.rule_version rv ON rv."tableId" = rt.id
)
SELECT c."key", c.version, c."dataHash" as core_hash, r."dataHash" as reg_hash
FROM core_versions c
JOIN reg_versions r ON c."key" = r."key" AND c.version = r.version
WHERE c."dataHash" != r."dataHash";
```

Expected: 0 rows (no mismatches)

## Known Issues

### pgvector Extension

The regulatory schema requires the pgvector extension for the Evidence.embedding column. If `prisma db push` fails with "type vector does not exist":

1. Check extension exists in public schema:

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

2. Manually create the Evidence table with proper vector type reference:

   ```sql
   SET search_path TO regulatory, public;
   CREATE TABLE IF NOT EXISTS regulatory."Evidence" (
     embedding public.vector(768),
     ...
   );
   ```

3. Re-run `prisma db push`

### Cached Prisma Client

If changes to regulatory.ts don't take effect:

1. Stop the application
2. Clear node_modules/.prisma cache if needed
3. Restart the application

## Contacts

- **Primary:** DevOps Team
- **Escalation:** Backend Engineering Lead
- **Database:** Database Administration Team

## Revision History

| Date       | Version | Author   | Changes                                |
| ---------- | ------- | -------- | -------------------------------------- |
| 2026-01-04 | 1.0     | AI Agent | Initial runbook based on dev execution |
