# RTL Pipeline Autonomy Improvements

> **Tooling:** If using Claude, apply `superpowers:executing-plans` skill. For other agents, follow the task sequence in order with TDD.

**Goal:** Reduce human intervention in the RTL pipeline by 70-80% through self-healing mechanisms, smarter automation, and continuous validation.

**Current State:** Semi-autonomous pipeline requiring human intervention for ~70% of edge cases
**Target State:** Autonomous pipeline requiring human intervention for ~15-20% of cases (critical/novel only)

---

## Executive Summary

Analysis of all 15 RTL workers identified **6 major autonomy gaps**. This plan provides concrete solutions for each, prioritized by impact and implementation effort.

| Gap                   | Current Human Load  | Solution                                   | Expected Reduction |
| --------------------- | ------------------- | ------------------------------------------ | ------------------ |
| Low-confidence rules  | ~40% of rules       | Evidence aggregation + calibration         | 60-70%             |
| Missed scheduled runs | 2-3 incidents/month | Startup catch-up + staleness watchdog      | 95%                |
| Format changes        | 1-2 per quarter     | Structural fingerprinting + LLM adaptation | 80%                |
| Conflict resolution   | ~70% escalated      | Deterministic pre-resolution + precedent   | 65%                |
| Quality assurance     | Weekly spot-checks  | Regression testing + feedback loop         | 75%                |
| DLQ investigation     | 10-20 jobs/day      | Auto-classification + self-healing replay  | 70%                |

**Total Expected Impact:** Human intervention reduced from ~200 touches/month to ~40 touches/month.

---

## Pre-Implementation Checklist

Before starting each task, verify:

- [ ] Branch created: `feat/rtl-autonomy`
- [ ] All tests passing on main: `npm run test`
- [ ] TypeScript compiles: `npm run type-check`
- [ ] Database migrations up to date: `npx prisma migrate status`

For each task:

- [ ] Write failing tests first (TDD)
- [ ] Implement minimum code to pass tests
- [ ] Run full test suite before commit
- [ ] Self-review for YAGNI violations
- [ ] Commit with descriptive message

---

## Phase 1: Quick Wins (Week 1-2)

### Task 1.1: DLQ Auto-Classification + Self-Healing Replay

**Problem:** All DLQ jobs require manual investigation and replay.

**Solution:**

1. Classify errors on DLQ entry (NETWORK, QUOTA, TIMEOUT, PARSE, VALIDATION, AUTH, EMPTY)
2. Auto-replay transient failures (NETWORK, TIMEOUT) after 5-minute cooldown
3. Auto-replay QUOTA errors after 1-hour cooldown
4. Only escalate permanent failures (AUTH, VALIDATION)

**Critical Safeguards (from Appendix A.1, A.9):**

- **Idempotency:** Add `idempotencyKey = jobId + payloadHash` to each DLQ entry
- **Dedupe:** Before replay, check if equivalent job already succeeded via `success_by_key`
- **Retry Cap:** Max 3 auto-retries with exponential backoff per error class
- **EMPTY Classification:** Add EMPTY to classification (zero extracted items after successful fetch)

**Files to modify:**

- `src/lib/regulatory-truth/workers/base.ts` - Add classification at DLQ entry
- `src/lib/regulatory-truth/workers/dlq-utils.ts` - Add healing cycle with idempotency
- `src/lib/regulatory-truth/workers/orchestrator.worker.ts` - Schedule healing every 5 min
- `src/lib/regulatory-truth/utils/error-classifier.ts` - Add EMPTY classification

**Tests to write:**

- `src/lib/regulatory-truth/workers/__tests__/dlq-healer.test.ts`
  - Test: classifies NETWORK errors correctly
  - Test: classifies QUOTA errors correctly
  - Test: classifies EMPTY errors correctly
  - Test: respects max 3 retry cap
  - Test: idempotency prevents duplicate replays
  - Test: exponential backoff applied per error class

**Acceptance Criteria:**

- [ ] All error types classified on DLQ entry
- [ ] Transient errors auto-replayed after cooldown
- [ ] Idempotency key prevents duplicate processing
- [ ] Max 3 retries enforced
- [ ] EMPTY errors classified and handled

---

### Task 1.2: Scheduler Run Persistence + Catch-up

**Problem:** If 6 AM discovery fails, no catch-up until next day.

**Solution:**

1. Create `SchedulerRun` table tracking expected vs actual runs
2. On startup, detect missed runs from last 24 hours
3. Hourly staleness check - if >26 hours since last discovery, auto-trigger

**Critical Safeguards (from Appendix A.2):**

- **Distributed Lock:** Use DB row lock or Redis lock keyed by `jobType`
- **Transaction:** Transition `SchedulerRun` from EXPECTED→RUNNING atomically
- **Conflict Handling:** If locked, set current run to MISSED and log

**Database changes:**

```prisma
model SchedulerRun {
  id            String   @id @default(cuid())
  jobType       String   // "discovery", "health-check", etc.
  scheduledAt   DateTime
  startedAt     DateTime?
  completedAt   DateTime?
  status        SchedulerRunStatus @default(EXPECTED)
  errorMessage  String?
  lockHolder    String?  // Instance ID holding the lock

  @@unique([jobType, scheduledAt])
  @@index([jobType, status])
}

enum SchedulerRunStatus {
  EXPECTED
  RUNNING
  COMPLETED
  FAILED
  MISSED
}
```

**Files to modify:**

- `prisma/schema.prisma` - Add SchedulerRun model
- `src/lib/regulatory-truth/workers/scheduler.service.ts` - Add persistence + catch-up + locking

**Tests to write:**

- `src/lib/regulatory-truth/workers/__tests__/scheduler-catchup.test.ts`
  - Test: detects missed runs on startup
  - Test: triggers catch-up for missed discovery
  - Test: staleness watchdog triggers after 26 hours
  - Test: distributed lock prevents concurrent runs
  - Test: sets run to MISSED if lock contention

**Acceptance Criteria:**

- [ ] SchedulerRun records created for all scheduled jobs
- [ ] Missed runs detected on startup
- [ ] Staleness watchdog triggers catch-up
- [ ] Distributed lock prevents concurrent discoveries
- [ ] MISSED status set on lock contention

---

### Task 1.3: Deterministic Conflict Pre-Resolution

**Problem:** All conflicts go to LLM, many could be resolved deterministically.

**Solution:**
Add resolution layer BEFORE LLM invocation:

1. Authority hierarchy (LAW > GUIDANCE > PROCEDURE > PRACTICE)
2. Source hierarchy (Constitution > Law > Regulation > Guidance)
3. Temporal (newer effective date wins if dates differ)

**Critical Safeguards (from Appendix A.3):**

- **Tier Gating:** T0/T1 rules NEVER auto-resolved
- **Recommendation Only:** For T0/T1, produce recommendation payload for human approval
- **Auto-Resolution:** Only T2/T3 rules can be auto-resolved
- **Audit Trail:** Log all auto-resolutions with reasoning

**Files to modify:**

- `src/lib/regulatory-truth/agents/arbiter.ts` - Add `tryDeterministicResolution()`

**Tests to write:**

- `src/lib/regulatory-truth/agents/__tests__/arbiter-deterministic.test.ts`
  - Test: resolves by authority hierarchy (LAW beats GUIDANCE)
  - Test: resolves by source hierarchy (Constitution beats Regulation)
  - Test: resolves by temporal (newer beats older)
  - Test: T0 rules NEVER auto-resolved (recommendation only)
  - Test: T1 rules NEVER auto-resolved (recommendation only)
  - Test: T2/T3 rules can be auto-resolved
  - Test: audit trail created for auto-resolutions

**Acceptance Criteria:**

- [ ] Deterministic resolution applied before LLM
- [ ] T0/T1 rules produce recommendation, not resolution
- [ ] T2/T3 rules auto-resolved with audit trail
- [ ] 60-70% fewer LLM calls for conflicts

---

## Phase 2: Confidence & Quality (Week 3-4)

### Task 2.1: Evidence Aggregation for Confidence

**Problem:** Single weak source pointer drags down entire rule confidence.

**Solution:**
Replace minimum-based confidence with:

1. Median confidence across source pointers
2. Corroboration bonus: +3% per independent source (max +10%)
3. Multi-source rules get confidence boost instead of penalty

**Critical Safeguards (from Appendix A.5):**

- **Independence Definition:** Unique combination of `publisherDomain + legalReference + evidenceType`
- **Cluster-Based Bonus:** Only apply corroboration bonus across independent clusters
- **No Double-Counting:** Same publisher with multiple articles = 1 source

**Files to modify:**

- `src/lib/regulatory-truth/utils/derived-confidence.ts` - Update formula

**Tests to write:**

- `src/lib/regulatory-truth/utils/__tests__/derived-confidence.test.ts`
  - Test: uses median instead of minimum
  - Test: applies +3% per independent source
  - Test: caps bonus at +10%
  - Test: same publisher = single source (no bonus)
  - Test: independence based on publisherDomain + legalReference + evidenceType

**Acceptance Criteria:**

- [ ] Median-based confidence calculation
- [ ] Corroboration bonus applied correctly
- [ ] Independence definition enforced
- [ ] No double-counting of same publisher

---

### Task 2.2: Automated Regression Testing

**Problem:** No detection when published rules silently change values.

**Solution:**

1. Daily snapshot of all PUBLISHED rules (value, confidence, sources)
2. Compare against previous snapshot
3. Alert on value changes not explained by source updates
4. Queue unexplained changes for human review

**Critical Safeguards (from Appendix A.6):**

- **Retention Policy:** Keep 90 days of snapshots, then archive
- **TTL Cleanup Job:** Daily job to purge old snapshots
- **Diff Storage:** After initial baseline, store diffs only
- **Index:** Add index on `snapshotAt` for efficient queries

**Database changes:**

```prisma
model RuleSnapshot {
  id              String   @id @default(cuid())
  ruleId          String
  conceptSlug     String
  valueHash       String
  confidence      Float
  sourceVersions  Json     // [{evidenceId, contentHash}]
  snapshotAt      DateTime @default(now())

  @@index([ruleId, snapshotAt])
  @@index([snapshotAt])  // For TTL cleanup
}
```

**New files:**

- `src/lib/regulatory-truth/utils/rule-snapshot.ts`
- `src/lib/regulatory-truth/workers/regression-detector.worker.ts`

**Tests to write:**

- `src/lib/regulatory-truth/utils/__tests__/rule-snapshot.test.ts`
  - Test: creates snapshot with correct fields
  - Test: detects value changes between snapshots
  - Test: ignores changes explained by source updates
  - Test: TTL cleanup removes snapshots >90 days

**Acceptance Criteria:**

- [ ] Daily snapshots created for all PUBLISHED rules
- [ ] Value changes detected and alerted
- [ ] Source-explained changes ignored
- [ ] 90-day retention with TTL cleanup

---

### Task 2.3: Precedent-Based Conflict Resolution

**Problem:** `ConflictResolutionAudit` exists but never consulted.

**Solution:**
Before escalating to human:

1. Query historical resolutions for same concept + conflict type
2. If 3+ precedents with 70%+ agreement, auto-apply precedent
3. System learns from human decisions

**Critical Safeguards (from Appendix A.3):**

- **Tier Gating:** Precedent resolution also respects T0/T1 gating
- **Minimum Precedents:** Require 3+ matching precedents
- **Agreement Threshold:** Require 70%+ agreement among precedents

**Files to modify:**

- `src/lib/regulatory-truth/agents/arbiter.ts` - Add `findPrecedent()`

**Tests to write:**

- `src/lib/regulatory-truth/agents/__tests__/arbiter-precedent.test.ts`
  - Test: finds matching precedents by concept + conflict type
  - Test: requires 3+ precedents to apply
  - Test: requires 70%+ agreement
  - Test: respects T0/T1 tier gating
  - Test: creates audit trail for precedent-based resolutions

**Acceptance Criteria:**

- [ ] Historical precedents queried before human escalation
- [ ] 3+ precedents with 70%+ agreement auto-applied
- [ ] T0/T1 tier gating respected
- [ ] Progressive learning from human decisions

---

## Phase 3: Self-Healing Sources (Week 5-6)

### Task 3.1: Structural Fingerprinting

**Problem:** Format changes fail silently (0 items extracted, no error).

**Solution:**

1. Generate structural fingerprint on each scrape (tag paths, selector yields, content ratios)
2. Store baseline fingerprint in endpoint metadata
3. Alert immediately when structure drifts >30% from baseline

**Critical Safeguards (from Appendix A.7):**

- **Baseline Governance:** Alert → Human validation → Approve new baseline
- **Audit Fields:** Store `baselineUpdatedAt`, `baselineUpdatedBy`, approved diff
- **No Auto-Update:** Baselines never updated automatically

**New file:**

- `src/lib/regulatory-truth/utils/structural-fingerprint.ts`

**Files to modify:**

- `src/lib/regulatory-truth/workers/sentinel.worker.ts` - Generate fingerprints
- `src/lib/regulatory-truth/watchdog/health-monitors.ts` - Add drift detection

**Tests to write:**

- `src/lib/regulatory-truth/utils/__tests__/structural-fingerprint.test.ts`
  - Test: generates fingerprint from HTML
  - Test: calculates drift percentage correctly
  - Test: alerts when drift >30%
  - Test: stores baseline with audit fields
  - Test: baseline update requires human approval

**Acceptance Criteria:**

- [ ] Fingerprint generated on each scrape
- [ ] Baseline stored with audit trail
- [ ] Drift >30% triggers immediate alert
- [ ] Baseline update workflow implemented

---

### Task 3.2: LLM-Based Selector Adaptation

**Problem:** When formats change, scrapers need manual updates.

**Solution:**

1. When fingerprint drift detected + 0 items extracted
2. Queue LLM job to suggest new CSS selectors
3. Provide historical examples of what items should look like
4. Store suggestions for human approval via PR

**Critical Safeguards (from Appendix A.8):**

- **Validation:** Test selectors against fixed sample set
- **Precision Gate:** Require 90% content nodes (exclude nav/footer)
- **Yield Range:** Enforce minimum/maximum yield expectations
- **Human Approval:** Block auto-merge, require PR review

**New files:**

- `src/lib/regulatory-truth/agents/selector-adapter.ts`
- `src/lib/regulatory-truth/workers/selector-adaptation.worker.ts`

**Tests to write:**

- `src/lib/regulatory-truth/agents/__tests__/selector-adapter.test.ts`
  - Test: generates selector suggestions from LLM
  - Test: validates selectors against sample set
  - Test: rejects selectors with <90% precision
  - Test: rejects selectors that capture nav/footer
  - Test: creates PR for human approval

**Acceptance Criteria:**

- [ ] LLM suggests selectors when format drift + 0 items
- [ ] Selectors validated against sample set
- [ ] 90% precision gate enforced
- [ ] PR created for human approval

---

## Phase 4: Continuous Validation (Week 7-8)

### Task 4.1: User Feedback Loop

**Problem:** No way to know if rules produce correct answers in practice.

**Solution:**

1. Track which rules answer user queries
2. Add thumbs up/down to AI assistant responses
3. Correlate feedback to specific rules
4. Rules with >30% negative feedback queued for review

**Critical Safeguards (from Appendix A.4):**

- **Minimal Data:** Store only `ruleId`, `sentiment`, `timestamp`, `appVersion`, optional `reasonCode`
- **No PII:** Do not store user identifiers by default
- **Hashed ID:** If needed, use one-way salted hash with consent
- **Retention:** 12-month retention policy
- **UI Opt-in:** Update privacy policy and add UI opt-in

**New files:**

- `src/lib/regulatory-truth/utils/user-feedback.ts`

**UI changes:**

- Add feedback buttons to assistant responses
- Create rule feedback dashboard

**Tests to write:**

- `src/lib/regulatory-truth/utils/__tests__/user-feedback.test.ts`
  - Test: stores minimal feedback data
  - Test: does not store user identifiers
  - Test: applies retention policy (12 months)
  - Test: correlates feedback to rules
  - Test: flags rules with >30% negative feedback

**Acceptance Criteria:**

- [ ] Feedback collected with minimal data
- [ ] No PII stored without consent
- [ ] 12-month retention enforced
- [ ] Rules with negative feedback queued for review

---

### Task 4.2: Continuous Re-Validation

**Problem:** Rules only validated once at publish time.

**Solution:**
Scheduled re-validation based on risk tier:

- T0: Weekly
- T1: Every 2 weeks
- T2: Monthly
- T3: Quarterly

Re-run full validation suite (quote-in-evidence, conflict detection, etc.)

**New file:**

- `src/lib/regulatory-truth/workers/revalidation.worker.ts`

**Tests to write:**

- `src/lib/regulatory-truth/workers/__tests__/revalidation.test.ts`
  - Test: T0 rules revalidated weekly
  - Test: T1 rules revalidated bi-weekly
  - Test: T2 rules revalidated monthly
  - Test: T3 rules revalidated quarterly
  - Test: failed revalidation triggers alert

**Acceptance Criteria:**

- [ ] Risk-tier-based revalidation schedule
- [ ] Full validation suite re-run
- [ ] Failed revalidation triggers alert

---

### Task 4.3: Confidence Calibration

**Problem:** LLM confidence scores are uncalibrated (0.9 doesn't mean 90% accurate).

**Solution:**

1. Collect human review outcomes for 3-6 months
2. Build calibration curves: raw confidence → calibrated confidence
3. Apply Platt scaling to confidence scores

**New file:**

- `src/lib/regulatory-truth/utils/confidence-calibrator.ts`

**Tests to write:**

- `src/lib/regulatory-truth/utils/__tests__/confidence-calibrator.test.ts`
  - Test: collects calibration data from reviews
  - Test: builds calibration curve correctly
  - Test: applies Platt scaling
  - Test: handles cold-start (no data yet)

**Acceptance Criteria:**

- [ ] Calibration data collected from human reviews
- [ ] Calibration curve built from historical data
- [ ] Platt scaling applied to confidence scores

---

## Implementation Priority Matrix

| Solution                     | Impact | Effort | Dependencies | Task |
| ---------------------------- | ------ | ------ | ------------ | ---- |
| DLQ Self-Healing             | High   | Low    | None         | 1.1  |
| Scheduler Catch-up           | High   | Low    | None         | 1.2  |
| Deterministic Pre-Resolution | High   | Low    | None         | 1.3  |
| Evidence Aggregation         | Medium | Low    | None         | 2.1  |
| Regression Testing           | High   | Medium | None         | 2.2  |
| Precedent Resolution         | Medium | Medium | 1.3          | 2.3  |
| Structural Fingerprinting    | High   | Medium | None         | 3.1  |
| Selector Adaptation          | Medium | High   | 3.1          | 3.2  |
| User Feedback Loop           | High   | Medium | UI work      | 4.1  |
| Continuous Re-Validation     | Medium | Low    | None         | 4.2  |
| Confidence Calibration       | Medium | Medium | 3mo data     | 4.3  |

---

## Success Metrics

**Before (Current):**

- Human review queue: ~50 items/day
- DLQ manual investigation: ~15 items/day
- Missed run incidents: 2-3/month
- Format change recovery: 3-7 days
- Average conflict resolution: 2-4 hours

**After (Target):**

- Human review queue: ~15 items/day (70% reduction)
- DLQ manual investigation: ~5 items/day (67% reduction)
- Missed run incidents: ~0/month (automated catch-up)
- Format change recovery: <24 hours (immediate alert + LLM suggestions)
- Average conflict resolution: <30 minutes (precedent + deterministic)

---

## Risk Mitigations

| Risk                       | Mitigation                                                 |
| -------------------------- | ---------------------------------------------------------- |
| False auto-approvals       | T0/T1 rules NEVER auto-approved, shadow mode for new logic |
| Precedent errors           | Require 70%+ agreement from 3+ precedents                  |
| Self-healing loops         | Max 3 auto-retries, then permanent DLQ                     |
| Selector adaptation errors | Human approval via PR required                             |
| Regression false positives | Alert, don't auto-revert                                   |
| DLQ double-processing      | Idempotency key prevents duplicate replays                 |
| Concurrent discoveries     | Distributed lock prevents overlap                          |
| Confidence inflation       | Independence definition prevents duplicate source bonus    |
| Snapshot growth            | 90-day TTL with archiving                                  |
| Privacy exposure           | Minimal data, no PII, 12-month retention                   |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LAYER A: DISCOVERY                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐   │
│  │  Scheduler  │────▶│   Sentinel  │────▶│ Structural          │   │
│  │  +Catch-up  │     │   Worker    │     │ Fingerprint Check   │   │
│  │  +Locking   │     │             │     │ +Baseline Gov.      │   │
│  └─────────────┘     └─────────────┘     └─────────────────────┘   │
│         │                   │                      │                │
│         ▼                   ▼                      ▼                │
│  [SchedulerRun         [Evidence           [FORMAT_DRIFT           │
│   persistence]          created]            alert if >30%]         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        LAYER B: PROCESSING                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────┐   ┌───────────┐   ┌────────────────────────────┐   │
│  │ Extractor │──▶│ Composer  │──▶│       Reviewer             │   │
│  │           │   │ +Evidence │   │ +Regression Check          │   │
│  │           │   │  Aggreg.  │   │ +User Feedback Integration │   │
│  │           │   │ +Indep.   │   │ +Revalidation              │   │
│  └───────────┘   └───────────┘   └────────────────────────────┘   │
│        │               │                      │                    │
│        ▼               ▼                      ▼                    │
│  [Multi-pass     [Corroboration       [Auto-approve if            │
│   for T0/T1]      bonus applied]       confidence passes]         │
│                                                                     │
│  ┌────────────────────────────────────────┐                        │
│  │             Arbiter                     │                        │
│  │  1. Tier Gate (T0/T1 = recommend only) │                        │
│  │  2. Deterministic Pre-Resolution       │                        │
│  │  3. Precedent Lookup                   │                        │
│  │  4. LLM Only If Needed                 │                        │
│  │  5. Confidence-Weighted Tiebreak       │                        │
│  └────────────────────────────────────────┘                        │
│                        │                                            │
│                        ▼                                            │
│              ┌─────────────────┐                                   │
│              │    Releaser     │                                   │
│              │  +Daily Snapshot│                                   │
│              │  +90d Retention │                                   │
│              └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SELF-HEALING LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐  │
│  │ DLQ Healer    │  │ Revalidation  │  │ Selector Adapter      │  │
│  │ (5-min cycle) │  │ (per tier)    │  │ (on format drift)     │  │
│  │ +Idempotency  │  │               │  │ +90% precision gate   │  │
│  │ +Max 3 retry  │  │               │  │ +Human PR approval    │  │
│  └───────────────┘  └───────────────┘  └───────────────────────┘  │
│         │                  │                      │                │
│         ▼                  ▼                      ▼                │
│  [Auto-replay        [Flag stale         [Generate PR            │
│   transient]          rules]              with new selectors]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Audit Findings and Exact Corrections

1. **DLQ auto-replay needs idempotency + dedupe**
   - Risk: Auto-replay can double-apply side effects or create conflicting records.
   - Correction: Add an idempotency key (e.g., `jobId + payloadHash`) stored with each DLQ entry and on success records. Before replay, check `success_by_key` or `in_progress_by_key`. Add `attemptCount`, `lastAttemptAt`, and cap retries (e.g., max 3). Use exponential backoff per class (NETWORK/TIMEOUT/QUOTA). Do not replay if an equivalent job already succeeded.
   - **Integrated into:** Task 1.1

2. **Scheduler catch-up needs run locking to prevent overlaps**
   - Risk: Catch-up and stale watchdog can trigger concurrent discoveries.
   - Correction: Add a distributed lock (DB row or Redis) keyed by `jobType`, acquired before start. Use a transaction to transition `SchedulerRun` from `EXPECTED` to `RUNNING` and fail if another is `RUNNING`. If locked, set current run to `MISSED` and log.
   - **Integrated into:** Task 1.2

3. **Tier gating required for auto-resolution**
   - Risk: Plan says T0/T1 never auto-approved but deterministic/precedent steps could bypass this.
   - Correction: Add explicit tier checks before deterministic/precedent actions. For T0/T1: only produce a recommendation payload; require human approval. For T2/T3: allow auto-resolution with audit trail.
   - **Integrated into:** Task 1.3, Task 2.3

4. **User feedback loop needs privacy + retention controls**
   - Risk: Feedback collection adds personal data exposure without governance.
   - Correction: Store only minimal data (`ruleId`, `sentiment`, `timestamp`, `appVersion`, optional `reasonCode`). Do not store user identifiers by default; if needed, use one-way salted hash with clear consent. Add retention policy (e.g., 12 months), and update privacy policy + UI opt-in.
   - **Integrated into:** Task 4.1

5. **Independence definition required for confidence boosts**
   - Risk: Corroboration bonus can inflate confidence for duplicate sources.
   - Correction: Define independence as unique combination of `publisherDomain + legalReference + evidenceType`. Only apply corroboration bonus across independent clusters.
   - **Integrated into:** Task 2.1

6. **Snapshot growth needs retention policy**
   - Risk: Daily `RuleSnapshot` across all rules will grow unbounded.
   - Correction: Add TTL cleanup job (e.g., keep 90 days) or store diffs only after initial baseline. Add index on `snapshotAt` and a monthly archiving strategy.
   - **Integrated into:** Task 2.2

7. **Structural fingerprinting needs baseline governance**
   - Risk: Legitimate site changes will trigger persistent alerts.
   - Correction: Add a baseline update workflow: alert -> human validation -> approve new baseline. Store `baselineUpdatedAt`, `baselineUpdatedBy`, and the approved diff.
   - **Integrated into:** Task 3.1

8. **Selector adaptation needs automated validation**
   - Risk: LLM-suggested selectors can over-capture irrelevant content.
   - Correction: Validate selectors against a fixed sample set; enforce minimum precision (e.g., 90% content nodes), minimum yield range, and exclude nav/footer. Block PR creation if validation fails. Require human approval for merge.
   - **Integrated into:** Task 3.2

9. **Error classification list mismatch**
   - Risk: Escalation list includes `EMPTY` but classification set omits it.
   - Correction: Add `EMPTY` to classification rules with clear criteria (e.g., zero extracted items after successful fetch), or remove it from escalation criteria.
   - **Integrated into:** Task 1.1

10. **Tooling note should be implementer-agnostic**
    - Risk: "For Claude" instruction does not apply to all implementers.
    - Correction: Move the note into a tooling section that says "If using Claude, apply skill X," and add a generic step for other agents.
    - **Integrated into:** Document header
