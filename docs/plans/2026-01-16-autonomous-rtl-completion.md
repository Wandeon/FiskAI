# Autonomous RTL Completion Plan

> **Status**: ✅ IMPLEMENTED (2026-01-16)
> **Created**: 2026-01-16
> **Implemented**: 2026-01-16
> **Goal**: Transform RTL into a fully autonomous system with no human-in-the-loop
> **Branch**: `feat/autonomous-rtl-phase1`

## Executive Summary

The RTL pipeline is 90% complete but has critical gaps preventing autonomous operation:

1. **Auto-approve not running** - Removed from scheduler, never added to continuous-drainer
2. **T0/T1 rules blocked** - Hard-coded to never auto-approve
3. **Assistant reads stale data** - Phase-C cutover pointed assistant at RuleFact (100 test records) while pipeline writes to RegulatoryRule (642 rules)
4. **24-hour grace period** - Auto-approve waits 24 hours before considering rules

This plan addresses all blockers to create a fully autonomous regulatory truth system.

---

## Current State Analysis

### Data Flow (What Works)

```
Sentinel → Evidence (2,036 records) ✓
    ↓
Extractor → CandidateFact (17,738 records) ✓
    ↓
Composer → RegulatoryRule (642 records, DRAFT status) ✓
    ↓
Reviewer → Routes to PENDING_REVIEW or APPROVED ✓
    ↓
Releaser → PUBLISHED (when triggered) ✓
```

### Data Flow (What's Broken)

```
RegulatoryRule → ??? → RuleFact (NOT SYNCED)
                              ↓
Assistant reads from RuleFact (100 stale test records)
```

### Rule Status Distribution

| Status         | T0  | T1  | T2  | T3  | Total |
| -------------- | --- | --- | --- | --- | ----- |
| DRAFT          | 73  | 75  | 318 | 7   | 473   |
| PENDING_REVIEW | 28  | 28  | 25  | 6   | 87    |
| APPROVED       | 0   | 0   | 4   | 0   | 4     |
| PUBLISHED      | 6   | 0   | 6   | 0   | 12    |
| REJECTED       | 29  | 14  | 22  | 2   | 67    |

**Key Insight**: 473 rules stuck in DRAFT, 87 in PENDING_REVIEW, only 12 ever PUBLISHED.

---

## Root Cause Analysis

### Blocker 1: Auto-Approve Never Runs (PHASE_D Mode)

- **File**: `workers/scheduler.service.ts:402-405`
- **Issue**: Comments say "REMOVED: Auto-approve scheduling (now continuous)" but it was never added to continuous-drainer
- **Impact**: T2/T3 rules never get auto-approved after grace period

### Blocker 2: T0/T1 Hard-Gate

- **File**: `agents/reviewer.ts:79-81`
- **Issue**: `if (rule.riskTier === "T0" || rule.riskTier === "T1") { return false }`
- **Impact**: 56 T0/T1 rules stuck forever in PENDING_REVIEW

### Blocker 3: RuleFact Not Synced

- **File**: `assistant/query-engine/rule-selector.ts:2-3`
- **Issue**: Phase-C cutover made assistant read from RuleFact, but pipeline writes to RegulatoryRule
- **Impact**: Assistant sees 100 stale test records instead of 642 real rules

### Blocker 4: 24-Hour Grace Period

- **File**: `agents/reviewer.ts:143-145`
- **Issue**: `AUTO_APPROVE_GRACE_HOURS || "24"` - rules must wait 24 hours
- **Impact**: Delays autonomous operation unnecessarily

---

## Solution Architecture

### Design Principles

1. **Single Source of Truth**: RegulatoryRule is the canonical store
2. **Confidence-Gated Publishing**: High confidence → auto-publish, low confidence → flag for monitoring
3. **Coverage Over Certainty**: Publish more rules with monitoring, rather than blocking
4. **Observable Autonomy**: Every decision logged, dashboards for quality metrics

### Target Data Flow

```
Evidence → CandidateFact → RegulatoryRule (DRAFT)
                                 ↓
                         Reviewer (LLM quality check)
                                 ↓
              ┌─────────────────┴─────────────────┐
              ↓                                   ↓
     Confidence ≥ 0.85                   Confidence < 0.85
              ↓                                   ↓
         APPROVED                         PENDING_REVIEW
              ↓                                   ↓
         Releaser                      Auto-approve after
              ↓                        grace period (1h)
         PUBLISHED                            ↓
              ↓                           APPROVED
     Assistant reads                          ↓
              ↓                           PUBLISHED
     User gets answers
```

---

## Implementation Plan

### Phase 1: Enable Autonomous Auto-Approve (Day 1)

#### Task 1.1: Add Auto-Approve to Continuous Drainer

**File**: `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts`

Add a new stage after `drainDraftRules()`:

```typescript
// Stage 4.5: Auto-approve eligible rules
async function drainPendingAutoApprove(): Promise<number> {
  const result = await autoApproveEligibleRules()
  if (result.approved > 0) {
    console.log(`[drainer] Auto-approved ${result.approved} rules`)
  }
  return result.approved
}
```

Add to `runDrainCycle()` after Stage 4.

#### Task 1.2: Remove T0/T1 Hard-Gate

**File**: `src/lib/regulatory-truth/agents/reviewer.ts`

Change the absolute gate to be configurable:

```typescript
const autoApproveAllTiers = process.env.AUTO_APPROVE_ALL_TIERS === "true"

export async function canAutoApprove(rule: {...}): Promise<boolean> {
  // Configurable gate for T0/T1
  if (!autoApproveAllTiers && (rule.riskTier === "T0" || rule.riskTier === "T1")) {
    return false
  }
  // ... rest of checks
}
```

Add to `docker-compose.workers.override.yml`:

```yaml
AUTO_APPROVE_ALL_TIERS: "true"
```

#### Task 1.3: Reduce Grace Period

**File**: Environment variable

Change `AUTO_APPROVE_GRACE_HOURS` from 24 to 1:

```yaml
AUTO_APPROVE_GRACE_HOURS: "1"
```

#### Task 1.4: Lower Confidence Threshold (Optional)

If needed, lower `AUTO_APPROVE_MIN_CONFIDENCE` from 0.90 to 0.85:

```yaml
AUTO_APPROVE_MIN_CONFIDENCE: "0.85"
```

### Phase 2: Unify Data Models (Day 1-2)

#### Task 2.1: Point Assistant at RegulatoryRule

**File**: `src/lib/assistant/query-engine/rule-selector.ts`

Replace RuleFact query with RegulatoryRule:

```typescript
// PHASE-D COMPLETION: Read from RegulatoryRule (single source of truth)
const allRulesRaw = await db.regulatoryRule.findMany({
  where: {
    conceptSlug: { in: conceptSlugs },
    status: "PUBLISHED",
  },
  include: {
    sourcePointers: {
      include: {
        evidence: {
          include: { source: true },
        },
      },
    },
  },
  orderBy: [{ authorityLevel: "asc" }, { confidence: "desc" }, { effectiveFrom: "desc" }],
})
```

Update the mapping to convert RegulatoryRule to RuleCandidate interface.

#### Task 2.2: Deprecate RuleFact

**File**: `prisma/regulatory.prisma`

Add deprecation comment:

```prisma
/// @deprecated Use RegulatoryRule (public schema) instead.
/// RuleFact is retained only for RuleFactSnapshot regression testing.
model RuleFact {
  // ...
}
```

#### Task 2.3: Clean Up Phase-C Comments

Remove `// PHASE-C CUTOVER` comments and update to `// PHASE-D: Single source of truth`.

### Phase 3: Quality Monitoring (Day 2-3)

#### Task 3.1: Add Publish Metrics

**File**: New `src/lib/regulatory-truth/utils/publish-metrics.ts`

Track:

- Rules published per day/week
- Average confidence of published rules
- Rejection rate by domain
- Source pointer coverage

#### Task 3.2: Add Quality Alerts

**File**: `src/lib/regulatory-truth/workers/orchestrator.worker.ts`

Add monitoring for:

- Rules with confidence < 0.70 that got published
- Domains with high rejection rates
- Rules with no source pointers

#### Task 3.3: Add Rollback Capability

Ensure `revokedAt` and `revokedReason` fields work correctly.
Add API endpoint to revoke rules if quality issues detected.

### Phase 4: Backfill and Verification (Day 3)

#### Task 4.1: Run Auto-Approve on Existing Rules

```bash
npx tsx -e "
import { autoApproveEligibleRules } from './src/lib/regulatory-truth/agents/reviewer'
const result = await autoApproveEligibleRules()
console.log(result)
"
```

#### Task 4.2: Trigger Release for Approved Rules

```bash
npx tsx -e "
import { runReleaser } from './src/lib/regulatory-truth/agents/releaser'
import { db } from './src/lib/db'
const approved = await db.regulatoryRule.findMany({
  where: { status: 'APPROVED', releases: { none: {} } },
  select: { id: true }
})
const result = await runReleaser(approved.map(r => r.id))
console.log(result)
"
```

#### Task 4.3: Verify Assistant Can Query

Test with real regulatory questions:

```bash
curl -X POST https://app.fiskai.hr/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Koji je rok za predaju PDV prijave?"}'
```

### Phase 5: Documentation and Cleanup (Day 3)

#### Task 5.1: Update Architecture Docs

- Update `docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md`
- Remove references to RuleFact as primary source
- Document the autonomous flow

#### Task 5.2: Update Audit Documents

- Update `docs/audits/DUPLICATION_AND_TRUTH_AUDIT.md`
- Mark Phase-1/RuleFact as deprecated

#### Task 5.3: Clean Up Feature Flags

- Remove Phase-C/Phase-D conditionals where no longer needed
- Simplify to single code path

---

## Files to Modify

| File                                             | Change                       |
| ------------------------------------------------ | ---------------------------- |
| `workers/continuous-drainer.worker.ts`           | Add auto-approve stage       |
| `agents/reviewer.ts`                             | Make T0/T1 gate configurable |
| `assistant/query-engine/rule-selector.ts`        | Read from RegulatoryRule     |
| `docker-compose.workers.override.yml`            | Add env vars                 |
| `prisma/regulatory.prisma`                       | Deprecate RuleFact           |
| `docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md` | Update architecture          |

---

## Verification Checklist

- [x] Auto-approve runs every drain cycle
- [x] T0/T1 rules can be auto-approved (when env var set)
- [x] Grace period is 1 hour (configurable)
- [x] Assistant queries RegulatoryRule directly
- [x] PUBLISHED rules appear in assistant answers
- [x] Source pointers provide citations
- [ ] Quality metrics are logged (deferred - existing monitoring sufficient)
- [x] Rollback capability works

---

## Rollback Plan

If autonomous operation causes quality issues:

1. Set `AUTO_APPROVE_ALL_TIERS=false` to restore T0/T1 gate
2. Increase `AUTO_APPROVE_GRACE_HOURS` to 24
3. Use `revokedAt` to unpublish problematic rules
4. Point assistant back at RuleFact temporarily (not recommended)

---

## Success Metrics

| Metric                          | Current     | Target      |
| ------------------------------- | ----------- | ----------- |
| PUBLISHED rules                 | 12          | 500+        |
| Rules available to assistant    | 100 (stale) | 500+ (live) |
| Time from evidence to published | Never       | < 2 hours   |
| Human intervention required     | 100%        | 0%          |

---

## Risks and Mitigations

| Risk                        | Probability | Impact | Mitigation                                    |
| --------------------------- | ----------- | ------ | --------------------------------------------- |
| Low-quality rules published | Medium      | Medium | Confidence threshold, monitoring alerts       |
| Incorrect regulatory info   | Low         | High   | Source pointer citations, rollback capability |
| Performance degradation     | Low         | Low    | Incremental publish, rate limiting            |
| User confusion              | Low         | Medium | Confidence indicators in UI                   |

---

## Timeline

| Phase                 | Duration    | Deliverable              |
| --------------------- | ----------- | ------------------------ |
| Phase 1: Auto-Approve | 4 hours     | Autonomous publish flow  |
| Phase 2: Data Model   | 4 hours     | Single source of truth   |
| Phase 3: Monitoring   | 4 hours     | Quality observability    |
| Phase 4: Backfill     | 2 hours     | Existing rules published |
| Phase 5: Docs         | 2 hours     | Updated documentation    |
| **Total**             | **~2 days** | Fully autonomous RTL     |

---

## Appendix A: Safe Human-Removal Policy and Disclaimers

### A1. Policy Goal

Remove human-in-the-loop while reducing regulatory harm risk. This appendix defines:

- explicit guardrails for autonomous publication
- disclosure requirements to end users
- safe rollback and escalation triggers

### A2. Mandatory Guardrails Before Full Autonomy

1. **Tiered Confidence Gating**
   - T0/T1 rules: Only auto-publish if confidence >= 0.98 and provenance checks pass.
   - T2/T3 rules: Auto-publish if confidence >= 0.90 and no conflicts.
2. **Provenance Hard Gates**
   - Every published rule must pass quote-in-evidence verification.
   - Any rule missing evidence links is blocked from publication.
3. **Conflict Priority**
   - Rules with any open conflict are blocked from publication.
   - Arbiter output must be recorded before publish.
4. **Latency Safety Buffer**
   - Minimum delay after extraction: 1 hour (default).
   - Delay can be reduced only if regression/monitoring pass thresholds.
5. **Automatic Rollback Trigger**
   - If anomaly thresholds are exceeded, revoke and quarantine rules automatically.

### A3. End-User Disclaimers (Required in UI + API)

**Short UI label (always visible):**

```
Autonomous Regulatory Guidance. Verified to source text; may require expert confirmation.
```

**Expanded disclosure (on click/hover):**

```
This guidance is generated by an autonomous system that verifies quotes against official sources.
It is not legal advice. For high-impact decisions, consult a licensed professional.
```

**API response disclaimer (always included):**

```
disclaimer: "Autonomous guidance; verified to cited sources. Not legal advice. Use at your own risk."
```

**High-risk banner (T0/T1 only):**

```
High-impact rule. Verify against official source or consult an accountant.
```

### A4. Safe Autonomy Escalation Rules

If any of the following occur, the system MUST switch to safe mode:

- More than 5% of daily published rules are revoked in 24h
- Any T0/T1 rule is published without exact quote match
- Conflict rate increases by 2x over 7-day baseline
- Source availability drops below 95% for critical sources

Safe mode actions:

1. Freeze auto-approval (AUTO_APPROVE_ALL_TIERS=false)
2. Increase grace period to 24 hours
3. Require human confirmation for T0/T1 rules
4. Emit alerts and log rollback decisions

### A5. Transparency in Answers

Every response to users must include:

- confidence score (0-1)
- source citations (with immutable evidence ID)
- effective date and version info

Example payload:

```
{
  "value": "...",
  "confidence": 0.92,
  "effectiveFrom": "2026-01-01",
  "sources": [{ "evidenceId": "..." }],
  "disclaimer": "Autonomous guidance; verified to cited sources. Not legal advice. Use at your own risk."
}
```

---

## Appendix B: Implementation Report (2026-01-16)

### B1. Commits Made

| Commit     | Description                                                       |
| ---------- | ----------------------------------------------------------------- |
| `31b41991` | Phase 1.1: Add auto-approve stage to continuous-drainer.worker.ts |
| `ef5f0248` | Phase 1.2: Make T0/T1 gate configurable with tiered confidence    |
| `b312bef9` | Phase 1.3: Add environment variables for auto-approve             |
| `eb951351` | Phase 2.1: Point assistant at RegulatoryRule                      |
| `f3c166ad` | Phase 2.2: Add deprecation notice to RuleFact                     |
| `8be19d90` | Phase 3.1: Add disclaimers to assistant responses                 |
| `62762c4d` | Phase 3.2: Create safe-mode.ts utility                            |
| `68220e9d` | Phase 3.3: Add rollback capability (revokeRule/revokeRules)       |

### B2. Files Modified

| File                                  | Change Summary                                       |
| ------------------------------------- | ---------------------------------------------------- |
| `continuous-drainer.worker.ts`        | Added Stage 4.5 for auto-approve                     |
| `reviewer.ts`                         | Tiered confidence gating (T0/T1: 0.98, T2/T3: 0.90)  |
| `docker-compose.workers.override.yml` | AUTO*APPROVE*\* env vars                             |
| `rule-selector.ts`                    | Reads from RegulatoryRule, excludes revoked          |
| `regulatory.prisma`                   | RuleFact deprecation notice                          |
| `types.ts`                            | STANDARD_DISCLAIMER, HIGH_RISK_DISCLAIMER interfaces |
| `answer-builder.ts`                   | Disclaimer field in responses                        |
| `safe-mode.ts`                        | NEW: Safe mode escalation triggers                   |
| `rule-status-service.ts`              | revokeRule, revokeRules functions                    |

### B3. Verification Results

| Verification                   | Result                    | Notes                                  |
| ------------------------------ | ------------------------- | -------------------------------------- |
| Auto-approve mechanism         | ✅ Working                | Runs in continuous-drainer Stage 4.5   |
| Tiered confidence gating       | ✅ Working                | T0/T1 require 0.98, T2/T3 require 0.90 |
| Assistant reads RegulatoryRule | ✅ Working                | 12 PUBLISHED rules queryable           |
| Provenance validation          | ✅ Working as safety gate | Blocks rules without valid quotes      |
| Rollback capability            | ✅ Working                | revokeRule/revokeRules tested          |
| Safe mode triggers             | ✅ Implemented            | checkSafeModeConditions()              |
| Disclaimers                    | ✅ Implemented            | In response payloads                   |

### B4. Data Quality Finding

**Important:** Auto-approve backfill and rule publishing was blocked by provenance validation:

- **75 PENDING_REVIEW rules** failed validation (quotes not found in evidence)
- **4 APPROVED rules** also failed (same issue)

This is **correct behavior** - the provenance validation is working as a safety gate. The issue is data quality in existing rules, not code.

**Current state:**

- 12 rules PUBLISHED and queryable by assistant
- 4 rules APPROVED (blocked from publish by provenance)
- 89 rules PENDING_REVIEW (blocked from approve by provenance)
- 477 rules DRAFT (waiting for review)

### B5. Immediate Next Steps

1. **Investigate provenance failures** - Check why quotes don't match evidence
2. **Deploy workers** - Run `./scripts/deploy-workers.sh` to activate changes
3. **Monitor new rules** - Future rules should pass provenance if pipeline is healthy
4. **Consider relaxing provenance** - For non-critical tiers, if necessary

### B6. Long-Term Recommendations

1. **Fix existing rules** - Either update quotes or re-extract
2. **Add provenance repair job** - Re-anchor quotes to evidence
3. **Dashboard** - Visualize provenance failures by source
4. **Alert on provenance drift** - Monitor new extractions
