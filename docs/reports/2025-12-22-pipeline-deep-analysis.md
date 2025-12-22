# Regulatory Truth Layer - Deep Pipeline Analysis

**Date:** 2025-12-22
**Purpose:** Identify gaps, predict behavior, and recommend fixes

---

## Executive Summary

**CRITICAL FINDING: The pipeline will NOT run automatically and rules are stuck.**

| Issue                         | Severity | Status                            |
| ----------------------------- | -------- | --------------------------------- |
| Scheduler not enabled         | CRITICAL | `REGULATORY_CRON_ENABLED` not set |
| Scheduler not started         | CRITICAL | `startScheduler()` never called   |
| No cron job                   | CRITICAL | Nothing in crontab                |
| Rules stuck at PENDING_REVIEW | HIGH     | T0/T1 require human approval      |
| 47 ungrouped pointers         | MEDIUM   | Not being composed into rules     |
| 2 unprocessed evidence        | LOW      | Will process on next run          |

---

## 1. Current Pipeline State

```
EVIDENCE (12 total)
├── Processed: 10 (have source pointers)
└── Unprocessed: 2 (waiting for extraction)

SOURCE POINTERS (58 total)
├── Grouped (linked to rules): 11
└── Ungrouped: 47 ← STUCK, need composition

RULES (5 total)
├── DRAFT: 1 ← waiting for review
├── PENDING_REVIEW: 3 ← STUCK, need human approval
└── PUBLISHED: 1 ← working

APPROVED: 0 ← Nothing to release!
```

---

## 2. Why Rules Are Stuck

### The Human-in-the-Loop Gap

The Reviewer agent (`reviewer.ts` lines 114-126) has this logic:

```typescript
case "APPROVE":
  // Auto-approve for T2/T3 rules with high confidence
  if ((rule.riskTier === "T2" || rule.riskTier === "T3") &&
      reviewOutput.computed_confidence >= 0.95) {
    newStatus = "APPROVED"
  } else {
    // T0/T1 must go to PENDING_REVIEW for human
    newStatus = "PENDING_REVIEW"
  }
```

**Problem:** All current rules are T0 (critical), so they ALL go to PENDING_REVIEW.

**The Releaser (`overnight-run.ts` line 251-258) only looks for APPROVED:**

```sql
WHERE r.status = 'APPROVED'
```

**Result:** 0 APPROVED rules → Nothing gets released.

---

## 3. Why Automation Won't Run

### Check 1: Environment Variable

```
REGULATORY_CRON_ENABLED not set in .env
```

The scheduler checks `process.env.REGULATORY_CRON_ENABLED === "true"` and exits if not set.

### Check 2: Scheduler Never Started

```bash
grep -r "startScheduler" src/app  # Returns nothing
```

Nobody calls `startScheduler()` - it's defined but never invoked.

### Check 3: No Cron Job

```bash
crontab -l | grep regulatory  # Returns nothing
```

No external trigger exists either.

---

## 4. Data Flow Analysis

### Phase -1: Tier 1 Fetchers

| Component       | Input                        | Output                          | Status   |
| --------------- | ---------------------------- | ------------------------------- | -------- |
| HNB Fetcher     | api.hnb.hr                   | RegulatoryRule (exchange rates) | ✅ Works |
| NN Fetcher      | narodne-novine.nn.hr/json-ld | Evidence records                | ✅ Works |
| EUR-Lex Fetcher | SPARQL query                 | Evidence records                | ✅ Works |

### Phase 0: Sentinel Discovery

| Component | Input                  | Output                 | Status   |
| --------- | ---------------------- | ---------------------- | -------- |
| Sentinel  | DiscoveryEndpoint URLs | DiscoveredItem records | ✅ Works |
| Fetch     | DiscoveredItem         | Evidence records       | ✅ Works |

### Phase 1: Extraction

| Component | Input               | Output                | Status                      |
| --------- | ------------------- | --------------------- | --------------------------- |
| Extractor | Evidence.rawContent | SourcePointer records | ✅ Works (100% after fixes) |

**Gap:** 2 evidence records still unprocessed.

### Phase 2: Composition

| Component | Input           | Output                 | Status                   |
| --------- | --------------- | ---------------------- | ------------------------ |
| Composer  | SourcePointer[] | RegulatoryRule (DRAFT) | ⚠️ 47 ungrouped pointers |

**Gap:** overnight-run limits to processing by domain, but 47 pointers aren't being composed.

### Phase 3: Review

| Component | Input        | Output                            | Status         |
| --------- | ------------ | --------------------------------- | -------------- |
| Reviewer  | Rule (DRAFT) | Rule (PENDING_REVIEW or APPROVED) | ⚠️ T0/T1 stuck |

**Gap:** T0/T1 rules go to PENDING_REVIEW, not APPROVED.

### Phase 3.5: Arbiter

| Component | Input              | Output     | Status                 |
| --------- | ------------------ | ---------- | ---------------------- |
| Arbiter   | RegulatoryConflict | Resolution | ✅ Works (0 conflicts) |

### Phase 4: Release

| Component | Input           | Output      | Status              |
| --------- | --------------- | ----------- | ------------------- |
| Releaser  | Rule (APPROVED) | RuleRelease | ❌ 0 APPROVED rules |

**Gap:** Nothing to release because APPROVED count is 0.

---

## 5. One Week Projection

### If Nothing Changes (Current State)

| Day      | What Happens                             |
| -------- | ---------------------------------------- |
| Day 1-7  | **NOTHING** - scheduler not running      |
| Database | Stale - no new evidence, no new rules    |
| Rules    | Still 5 rules, 3 stuck at PENDING_REVIEW |
| Releases | Still v1.0.0 only                        |
| AI Agent | Using outdated regulatory data           |

### If Manual Trigger Only

| Day        | What Happens                                  |
| ---------- | --------------------------------------------- |
| Manual run | Tier1 fetchers get today's HNB rates          |
|            | Sentinel discovers 0-5 new items              |
|            | Extractor processes 2 pending + new           |
|            | Composer creates DRAFT rules from 47 pointers |
|            | Reviewer moves DRAFT → PENDING_REVIEW         |
|            | **Rules still stuck** - no human approval     |
|            | Releaser does nothing - 0 APPROVED            |

### If Automation Enabled + Human Approval

| Day     | What Happens                                   |
| ------- | ---------------------------------------------- |
| Day 1   | Pipeline runs at 6 AM, creates new DRAFT rules |
|         | Human approves PENDING_REVIEW rules → APPROVED |
|         | Releaser publishes v1.1.0 or v2.0.0            |
| Day 2-7 | Daily: 0-5 new evidence, 0-20 new pointers     |
|         | Weekly: 1-3 new releases                       |

---

## 6. Critical Fixes Required

### Fix 1: Enable Scheduler (5 minutes)

```bash
# Add to .env
echo "REGULATORY_CRON_ENABLED=true" >> /home/admin/FiskAI/.env
```

### Fix 2: Start Scheduler in App (10 minutes)

Create `/home/admin/FiskAI/src/app/api/cron/regulatory/start/route.ts`:

```typescript
import { startScheduler } from "@/lib/regulatory-truth/scheduler/cron"

// Start scheduler when app loads
if (process.env.REGULATORY_CRON_ENABLED === "true") {
  startScheduler()
}
```

Or add to `src/instrumentation.ts` or a server startup hook.

### Fix 3: Add Cron Job (Alternative) (5 minutes)

```bash
# Add to crontab
echo '0 6 * * * curl -s -X POST "http://localhost:3002/api/admin/regulatory-truth/trigger" -H "Authorization: Bearer CRON_SECRET"' | crontab -
```

### Fix 4: Human Approval Mechanism (30 minutes)

Option A: Admin UI to approve PENDING_REVIEW rules
Option B: Auto-approve PENDING_REVIEW after 24 hours if confidence > 0.9
Option C: Change T0 rules to T1 (lower risk tier = auto-approve)

### Fix 5: Process Ungrouped Pointers (5 minutes)

The overnight-run already handles this, but run it manually once:

```bash
npx tsx src/lib/regulatory-truth/scripts/overnight-run.ts
```

---

## 7. Overnight Run Issues

### Issue 1: Wrong Join Table Column (Potential)

```sql
-- overnight-run.ts line 134
WHERE NOT EXISTS (
  SELECT 1 FROM "_RuleSourcePointers" rsp WHERE rsp."B" = sp.id
)
```

The `_RuleSourcePointers` is a Prisma implicit many-to-many table. Column naming:

- `A` = RegulatoryRule.id
- `B` = SourcePointer.id

This looks correct, but should be verified against actual schema.

### Issue 2: Release Query Uses Wrong Column

```sql
-- overnight-run.ts line 256
WHERE rr."A" = r.id
```

For `_ReleaseRules`:

- `A` = RuleRelease.id (likely)
- `B` = RegulatoryRule.id (likely)

This might be inverted. Check Prisma schema.

### Issue 3: DATABASE_URL Mismatch

The overnight-run.ts uses:

```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
```

But .env has:

```
DATABASE_URL=postgresql://fiskai:fiskai_secret_2025@fiskai-postgres:5432/fiskai
```

The hostname `fiskai-postgres` is a Docker network name. When running outside Docker, it should be `localhost:5434`.

---

## 8. Recommended Immediate Actions

| Priority | Action                                  | Time   | Impact               |
| -------- | --------------------------------------- | ------ | -------------------- |
| 1        | Set REGULATORY_CRON_ENABLED=true        | 1 min  | Enables scheduler    |
| 2        | Add cron job OR start scheduler in app  | 10 min | Automation runs      |
| 3        | Manually approve 3 PENDING_REVIEW rules | 5 min  | Unblocks releases    |
| 4        | Run overnight-run.ts manually once      | 5 min  | Process backlog      |
| 5        | Add admin UI for approvals              | 2 hrs  | Sustainable workflow |

---

## 9. Conclusion

**The pipeline code is functional but the automation is not connected.**

- Scheduler exists but is never started
- Environment variable not set
- No cron job configured
- Rules stuck at PENDING_REVIEW (human approval required but no mechanism)

**In one week without changes:**

- System will be completely stale
- No new regulatory data captured
- AI agent using outdated rules

**To fix:**

1. Enable scheduler
2. Add human approval mechanism
3. Run once manually to clear backlog

---

_Analysis completed: 2025-12-22_
