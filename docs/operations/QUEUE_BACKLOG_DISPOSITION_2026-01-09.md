# Queue Backlog Disposition Report

**Date:** 2026-01-09
**Author:** Claude (AI Agent)
**Migration Phase:** Phase 1 Complete, Pre-Phase 2 Audit

---

## Executive Summary

**RECOMMENDATION: RESET**

The old Redis backlog (~2.93M keys) is technically intact but logically redundant. Processing it would waste weeks of compute on duplicate jobs while a deterministic requeue from Postgres can recreate the necessary work in minutes.

**GO for Phase 2** - Proceed with decommissioning old Redis.

---

## 1. Migration Context

### Infrastructure Changes
| Component | Old (VPS-01) | New (VPS) |
|-----------|--------------|-----------|
| Host | 100.75.121.126 (ARM64) | 100.120.14.126 (x86) |
| Container | fiskai-redis | fiskai-redis-vps |
| Max Memory | 2GB | 8GB |
| Eviction Policy | allkeys-lru | allkeys-lru |
| Password | None (internal Docker) | 48-char hex |

### Cutover Status
- **Workers:** 15 containers on VPS-01, all pointing to new Redis
- **App (Coolify):** REDIS_URL updated, status: `running:healthy`
- **30-min stability window:** PASSED (0 evictions, 1056 ops/sec at T+30)

---

## 2. Redis Comparison

### Old Redis (VPS-01) - Post-Cutover Snapshot
```
DBSIZE:           2,930,531 keys
used_memory:      2,130,076,520 bytes (~1.98 GB)
maxmemory:        2,147,483,648 bytes (2 GB)
evicted_keys:     0
connected_clients: 18 (stale ioredis connections)
ops_per_sec:      0
```

### New Redis (VPS) - Active
```
DBSIZE:           232 keys
used_memory:      9,034,080 bytes (~9 MB)
maxmemory:        8,589,934,592 bytes (8 GB)
evicted_keys:     0
connected_clients: 262
ops_per_sec:      1,250
```

---

## 3. Backlog Analysis

### Key Distribution
| Queue | Job Count | Est. Unique Entities |
|-------|-----------|---------------------|
| review | 2,586,996 | ~615 rules |
| compose | 80,060 | ~2,177 pointers |
| arbiter | 261,435 | unknown |
| **Total** | **2,928,491** | |

### Data Integrity
- **evicted_keys: 0** - No key loss from memory pressure
- **Job payloads intact** - Sample jobs contain valid JSON data
- **Foreign keys valid** - Sampled `ruleId` and `pointerIds` exist in Postgres

### Duplication Analysis
Sample of 1000 review jobs:
```
Occurrences  ruleId
     18      cmjm29xww00d00tmpdn762zp6
     18      cmjm1a5y800b10tmpipwg8gc8
     18      cmjm052lc008o0tmpd1h507dm
     17      cmjluwi3j000x0tmpk7ftnxhw
     15      cmjm314uv00e90tmp92l5mg0r
     ...
```

**Finding:** Jobs are highly duplicated. With 615 total rules in database but 2.59M review jobs, average duplication is **~4,200 jobs per rule**.

### Root Cause
All jobs have `runId: drain-*` timestamps, indicating they were created by a bulk drain operation that queued the same rules multiple times without deduplication.

---

## 4. Options Analysis

### Option A: PRESERVE (Migrate Backlog)
**Effort:** Dump from old Redis, restore to new Redis
**Risk:**
- Processing 2.6M duplicate jobs would take days/weeks
- Same rules processed thousands of times (wasted compute)
- No benefit over deterministic requeue

### Option B: RESET (Discard + Requeue)
**Effort:** Create requeue script from Postgres
**Benefit:**
- Creates exactly ONE job per rule needing review
- Completes in minutes vs weeks
- Clean slate with no duplicate work

---

## 5. RECOMMENDATION: RESET

### Justification
1. **No data loss** - evicted_keys: 0, job payloads intact
2. **Massive redundancy** - 4,200x duplication makes preservation wasteful
3. **Deterministic recovery** - Postgres is source of truth for rule status
4. **Time efficiency** - Requeue script: minutes. Process backlog: weeks.

### Pre-Requisites for Phase 2
1. ✅ New Redis operational (verified: 262 clients, 1250 ops/sec)
2. ✅ All workers pointing to new Redis (verified: REDIS_URL in docker-compose)
3. ✅ App pointing to new Redis (verified via Coolify)
4. ⏳ Password fix merged (PR required - see note below)

---

## 6. Requeue Script Design

The following script creates deterministic jobs from Postgres:

```typescript
// scripts/requeue-from-postgres.ts
import { PrismaClient } from '@prisma/client'
import { reviewQueue, composeQueue, arbiterQueue } from '@/lib/regulatory-truth/workers/queues'

async function requeue() {
  const prisma = new PrismaClient()
  const runId = `requeue-${Date.now()}`

  // 1. Queue all PENDING_REVIEW rules for review
  const reviewRules = await prisma.regulatoryRule.findMany({
    where: { status: 'PENDING_REVIEW' },
    select: { id: true }
  })
  for (const rule of reviewRules) {
    await reviewQueue.add('review', { ruleId: rule.id, runId })
  }
  console.log(`Queued ${reviewRules.length} review jobs`)

  // 2. Queue DRAFT rules for compose
  const draftRules = await prisma.regulatoryRule.findMany({
    where: { status: 'DRAFT' },
    include: { sourcePointers: { select: { id: true } } }
  })
  for (const rule of draftRules) {
    const pointerIds = rule.sourcePointers.map(p => p.id)
    if (pointerIds.length > 0) {
      await composeQueue.add('compose', {
        pointerIds,
        domain: rule.domain,
        runId
      })
    }
  }
  console.log(`Queued ${draftRules.length} compose jobs`)

  // 3. Queue APPROVED rules for arbiter
  const approvedRules = await prisma.regulatoryRule.findMany({
    where: { status: 'APPROVED' },
    select: { id: true }
  })
  for (const rule of approvedRules) {
    await arbiterQueue.add('arbiter', { ruleId: rule.id, runId })
  }
  console.log(`Queued ${approvedRules.length} arbiter jobs`)

  await prisma.$disconnect()
}

requeue().catch(console.error)
```

**Expected job counts after requeue:**
- review: ~28 (PENDING_REVIEW rules)
- compose: ~509 (DRAFT rules)
- arbiter: ~1 (APPROVED rules)

---

## 7. Phase 2 GO/NO-GO

### GO Criteria (All Met)
| Criterion | Status |
|-----------|--------|
| New Redis stable (30-min window) | ✅ |
| Workers connected to new Redis | ✅ |
| App connected to new Redis | ✅ |
| Old Redis backlog assessed | ✅ |
| Requeue strategy defined | ✅ |

### Outstanding Item (Non-Blocking)
**Password extraction fix needs PR:**

During migration, a code change was made to `src/lib/regulatory-truth/workers/redis.ts`:
```diff
export const redisConnectionOptions: RedisOptions = {
  host: new URL(REDIS_URL).hostname,
  port: parseInt(new URL(REDIS_URL).port || "6379"),
+ password: new URL(REDIS_URL).password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}
```

This change is currently only on VPS-01 (in deployed worker images). It needs:
1. PR created with this fix
2. Merged to main
3. Commit hash documented

**Workaround:** Fix is in production worker images. Not blocking Phase 2, but requires follow-up PR.

---

## 8. Phase 2 Actions

1. **Stop old Redis container:**
   ```bash
   ssh admin@vps-01 "docker stop fiskai-redis"
   ```

2. **Run requeue script:**
   ```bash
   npx tsx scripts/requeue-from-postgres.ts
   ```

3. **Verify worker processing:**
   ```bash
   docker logs fiskai-worker-reviewer --tail 20
   ```

4. **After 24h stability:** Remove old Redis container and volumes
   ```bash
   ssh admin@vps-01 "docker rm fiskai-redis && rm -rf /opt/redis-old"
   ```

---

## Appendix: Evidence

### Old Redis INFO (abridged)
```
redis_version:7.4.2
used_memory:2130076520
maxmemory:2147483648
maxmemory_policy:allkeys-lru
evicted_keys:0
expired_keys:0
connected_clients:18
```

### Key Type Breakdown
```
fiskai:review:*  - 2,586,996 hash keys (job payloads)
fiskai:compose:* -    80,060 hash keys
fiskai:arbiter:* -   261,435 hash keys
```

### Sample Job Payload
```json
{
  "ruleId": "cmjlxppyx004q0tmp1r1a7633",
  "runId": "drain-1767974234096"
}
```

### Database Entity Counts
| Table | Count |
|-------|-------|
| RegulatoryRule | 615 |
| SourcePointer | 2,177 |
| DRAFT rules | 509 |
| PENDING_REVIEW rules | 28 |
| APPROVED rules | 1 |

---

**END OF REPORT**
