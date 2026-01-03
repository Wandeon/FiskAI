# PR#5A FK → Soft Ref Conversion Analysis

> **Status:** Review Required
> **Created:** 2026-01-03
> **PR:** #1297

## Summary

PR#5A moved 6 models to `regulatory.prisma`. This required converting 10 FK relations to soft refs (string IDs without FK constraints) because Prisma cannot enforce FK across separate schemas/databases.

**Critical question:** Are these soft refs acceptable or do they break integrity?

---

## The 10 FK → Soft Ref Conversions

| #   | Model                   | Field        | Old Relation Target                    | New Type  | Batch Migration   | Justification                                    | Enforcement       |
| --- | ----------------------- | ------------ | -------------------------------------- | --------- | ----------------- | ------------------------------------------------ | ----------------- |
| 1   | `SourcePointer`         | `evidenceId` | `Evidence` (onDelete: SetNull)         | `String`  | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 2   | `AtomicClaim`           | `evidenceId` | `Evidence`                             | `String`  | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 3   | `RegulatoryProcess`     | `evidenceId` | `Evidence`                             | `String?` | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 4   | `ReferenceTable`        | `evidenceId` | `Evidence`                             | `String?` | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 5   | `RegulatoryAsset`       | `evidenceId` | `Evidence`                             | `String?` | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 6   | `TransitionalProvision` | `evidenceId` | `Evidence`                             | `String`  | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 7   | `AgentRun`              | `evidenceId` | `Evidence`                             | `String?` | TBD               | Audit trail only, optional link                  | None (audit-only) |
| 8   | `CoverageReport`        | `evidenceId` | `Evidence` (onDelete: Cascade)         | `String`  | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 9   | `ComparisonMatrix`      | `evidenceId` | `Evidence`                             | `String?` | Batch 2           | RTL-only model, will have FK restored when moved | Integrity checker |
| 10  | `WebhookSubscription`   | `sourceId`   | `RegulatorySource` (onDelete: Cascade) | `String?` | **STAYS IN CORE** | Mixed use (RTL + outbox), optional link          | Code validation   |

---

## Risk Assessment

### Low Risk (8 conversions) - RTL-only models migrating in Batch 2

Models 1-6, 8-9 are **RTL-only** and will move to `regulatory.prisma` in Batch 2. When they move, FK relations will be restored within the regulatory schema.

**Temporary state:** Soft refs for ~1-2 weeks until Batch 2 merges.

**Mitigation:** Integrity checker runs daily to catch orphaned refs.

### Medium Risk (1 conversion) - AgentRun.evidenceId

`AgentRun` is an audit/logging table that tracks agent executions. The `evidenceId` is optional and used only for tracing which evidence an agent processed.

**Assessment:** Acceptable as audit-only trail. No business logic depends on this FK.

**Mitigation:** None required (orphaned refs don't break functionality).

### Higher Risk (1 conversion) - WebhookSubscription.sourceId

`WebhookSubscription` is used by both:

- RTL (for regulatory source webhooks)
- Outbox system (for general webhook delivery)

This model will **stay in core** because it's not RTL-only.

**Assessment:** The FK was optional (`String?`) with `onDelete: Cascade`. Removing FK means:

- If a `RegulatorySource` is deleted, orphan `WebhookSubscription` records may remain
- No automatic cascade cleanup

**Mitigation required:**

1. Code validation when creating subscriptions
2. Periodic cleanup job for orphaned subscriptions
3. OR: Keep WebhookSubscription in core but add code-level cascade

---

## Cascade Behavior Changes

| Model                 | Old onDelete | New Behavior      | Risk                                     |
| --------------------- | ------------ | ----------------- | ---------------------------------------- |
| `SourcePointer`       | SetNull      | Manual (soft ref) | Low - SetNull was already lenient        |
| `CoverageReport`      | Cascade      | Manual (soft ref) | **Medium** - must implement code cascade |
| `WebhookSubscription` | Cascade      | Manual (soft ref) | **Medium** - must implement code cascade |

**Action required:** Add code-level cascade for Evidence/RegulatorySource deletion that cleans up dependent records.

---

## Recommendations

### Before Merge

1. **Add integrity checker** (see `/scripts/check-regulatory-integrity.ts`)
2. **Confirm Evidence is append-only** (no hard deletes)
3. **Document cascade replacement** for CoverageReport and WebhookSubscription

### After Batch 2 Migration

1. FKs 1-6, 8-9 will be restored when models move to regulatory schema
2. Only AgentRun and WebhookSubscription remain as permanent soft refs

---

## Evidence Delete Semantics Analysis

**Finding: Evidence is effectively append-only**

| Check                        | Result                            |
| ---------------------------- | --------------------------------- |
| Has `deletedAt` field        | ✅ Yes (soft-delete design)       |
| Production hard-delete calls | ✅ None found                     |
| Production soft-delete calls | ✅ None found                     |
| Test cleanup hard-deletes    | ⚠️ 2 files (acceptable for tests) |

**Conclusion:** Evidence and EvidenceArtifact are append-only in production. The `deletedAt` field exists for future soft-delete capability but is not currently used.

**Recommendation:** Add a guard in code to prevent accidental hard deletes:

```typescript
// In dbReg wrapper or Evidence repository
export async function deleteEvidence(id: string) {
  throw new Error("Hard delete of Evidence is prohibited. Use soft delete via deletedAt.")
}
```

---

## Decisions Made

### WebhookSubscription: Keep in Core with Soft Ref

**Decision:** Keep `WebhookSubscription` in core schema. Keep `sourceId` as a soft ref with validation and cleanup.

**Rationale:**

- Webhook subscriptions are **integration plumbing**, not regulatory truth
- Moving to regulatory DB would mix "integration config" into the evidence vault
- Would complicate access control and operations

**Implementation:**

1. ✅ Creation-time validation: `src/lib/regulatory-truth/webhooks/subscription-validation.ts`
   - `validateAndCreateWebhookSubscription()` checks sourceId exists in dbReg before creating
2. ✅ Orphan cleanup job: `scripts/cleanup-orphan-subscriptions.ts`
   - Run periodically to clean up subscriptions referencing deleted sources

### CoverageReport Cascade: Defer to Batch 2

**Decision:** Do NOT implement code-level cascade now. Defer until CoverageReport moves to regulatory DB.

**Rationale:**

- App-level cascades are error-prone and hard to maintain
- Evidence is append-only in practice, reducing immediate risk
- FK + cascade will be restored when model moves to regulatory schema

**Implementation:**

1. ✅ Integrity checker flags CoverageReport orphans as non-fixable
2. ✅ Treat orphans as release-blockers in staging
3. Evidence deletes are blocked (append-only)

### Integrity Checker: Made Safer

**Changes:**

- `--fix` now requires `--confirm` flag
- Added `--dry-run` mode to preview changes
- Issues categorized as fixable (optional fields) vs non-fixable (required fields)
- Non-fixable orphans require manual review
- Exit code 1 on any orphans found (fails CI)
