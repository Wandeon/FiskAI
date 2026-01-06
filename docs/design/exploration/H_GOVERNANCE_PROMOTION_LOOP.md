# Document H: Governance & Promotion Loop

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: How Mode 2 (candidate) becomes Mode 1 (classified), approval workflows

---

## Overview

FiskAI implements a **governance pipeline** that ensures regulatory rules progress through defined quality gates before publication. The system enforces:

- **Risk-tier-based approval policies** (T0/T1 require human approval)
- **Conflict resolution** via Arbiter agent with escalation
- **Immutable audit trail** for regulatory compliance
- **Evidence chain verification** to prevent hallucinations
- **Versioned releases** with rollback capability

---

## RuleStatus State Machine

### State Definitions

**Location**: `prisma/schema.prisma` (lines 3571-3578)

```typescript
enum RuleStatus {
  DRAFT           // Initial state after Composer creates rule
  PENDING_REVIEW  // Awaiting human or automated review
  APPROVED        // Passed review, awaiting publication
  PUBLISHED       // Released to production, immutable
  DEPRECATED      // Superseded by newer rule
  REJECTED        // Failed review, will not be published
}
```

### State Transitions

```
Primary Flow:
  DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED

Rejection:
  PENDING_REVIEW → REJECTED

Deprecation:
  PUBLISHED → DEPRECATED

Rollback:
  PUBLISHED → APPROVED (via rollback function)
```

### Transition Requirements

| From           | To             | Required                                  | Actor          |
| -------------- | -------------- | ----------------------------------------- | -------------- |
| DRAFT          | PENDING_REVIEW | Initial quality checks                    | Reviewer agent |
| PENDING_REVIEW | APPROVED       | T2/T3 + high confidence OR human approval | Human/Auto     |
| PENDING_REVIEW | REJECTED       | Validation failure                        | Reviewer/Human |
| APPROVED       | PUBLISHED      | Provenance validation, no conflicts       | Releaser agent |
| PUBLISHED      | DEPRECATED     | Conflict resolution                       | Arbiter agent  |

---

## Risk Tier Enforcement

### Risk Tier Definitions

**Location**: `prisma/schema.prisma` (lines 3546-3551)

```typescript
enum RiskTier {
  T0  // Critical: Tax rates, legal deadlines, penalties
  T1  // High: Thresholds, contribution bases
  T2  // Medium: Procedural requirements, form fields
  T3  // Low: UI labels, help text
}
```

### Approval Policies by Tier

| Tier | Auto-Approval | Grace Period | Confidence Threshold |
| ---- | ------------- | ------------ | -------------------- |
| T0   | **NEVER**     | N/A          | N/A                  |
| T1   | **NEVER**     | N/A          | N/A                  |
| T2   | Allowed       | 24 hours     | >= 0.90              |
| T3   | Allowed       | 24 hours     | >= 0.90              |

### T0/T1 Enforcement (Issue #845)

**Location**: `src/lib/regulatory-truth/agents/reviewer.ts`

```typescript
// ABSOLUTE GATE: T0/T1 NEVER auto-approve
if (rule.riskTier === "T0" || rule.riskTier === "T1") {
  return false // No further checks needed
}
```

This gate:

- Executes FIRST before any other logic
- Cannot be overridden by confidence or any other factor
- Is enforced again at publication time (defense-in-depth)

---

## Reviewer Agent

### Purpose

Validates DRAFT rules and determines whether to APPROVE, REJECT, or ESCALATE.

**Location**: `src/lib/regulatory-truth/agents/reviewer.ts`

### Review Input

```typescript
interface ReviewerInput {
  draftRuleId: string
  draftRule: {
    conceptSlug: string
    titleHr: string
    riskTier: "T0" | "T1" | "T2" | "T3"
    appliesWhen: string
    value: string | number
    confidence: number
  }
  sourcePointers: Array<{
    id: string
    exactQuote: string
    extractedValue: string
    confidence: number
  }>
}
```

### Review Output

```typescript
interface ReviewerOutput {
  review_result: {
    decision: "APPROVE" | "REJECT" | "ESCALATE_HUMAN" | "ESCALATE_ARBITER"
    validation_checks: {
      value_matches_source: boolean
      applies_when_correct: boolean
      risk_tier_appropriate: boolean
      dates_correct: boolean
      sources_complete: boolean
      no_conflicts: boolean
      translation_accurate: boolean
    }
    computed_confidence: number
    issues_found: Array<{
      severity: "critical" | "major" | "minor"
      description: string
      recommendation: string
    }>
    human_review_reason: string | null
    reviewer_notes: string
  }
}
```

### Decision Logic

| Condition                        | Decision         | Resulting Status |
| -------------------------------- | ---------------- | ---------------- |
| Any critical issue OR T0/T1 rule | ESCALATE_HUMAN   | PENDING_REVIEW   |
| Conflicting rules detected       | ESCALATE_ARBITER | PENDING_REVIEW   |
| T2/T3 + confidence >= 0.95       | APPROVE          | APPROVED         |
| T2/T3 + confidence < 0.95        | ESCALATE_HUMAN   | PENDING_REVIEW   |
| Validation fails                 | REJECT           | REJECTED         |

### Auto-Approval Eligibility

```typescript
export async function canAutoApprove(rule): Promise<boolean> {
  // 1. ABSOLUTE GATE: T0/T1 never auto-approve
  if (rule.riskTier === "T0" || rule.riskTier === "T1") {
    return false
  }

  // 2. Check remaining criteria for T2/T3
  // - Grace period: 24 hours elapsed
  // - Min confidence: >= 0.90
  // - No open conflicts
  // - Has source pointers (evidence)
}
```

### Grace Period Auto-Approval

**Location**: `src/lib/regulatory-truth/agents/reviewer.ts:129-254`

```typescript
export async function autoApproveEligibleRules(): Promise<{
  approved: number
  skipped: number
  errors: string[]
}> {
  // Find T2/T3 rules in PENDING_REVIEW for > 24 hours
  // With confidence >= 0.90 and no open conflicts
  // Auto-approve and log audit event
}
```

---

## Arbiter Agent (Conflict Resolution)

### Purpose

Resolves conflicts between rules automatically, with escalation for complex cases.

**Location**: `src/lib/regulatory-truth/agents/arbiter.ts`

### Conflict Types

```typescript
enum ConflictType {
  SOURCE_CONFLICT          // Multiple sources have contradictory values
  TEMPORAL_CONFLICT        // Rules' effective dates overlap but values differ
  SCOPE_CONFLICT           // Rules' applicability conditions overlap
  INTERPRETATION_CONFLICT  // Same rule interpreted differently
}
```

### Resolution Strategies

#### 1. Authority Hierarchy

```
LAW (score: 1) > GUIDANCE (score: 2) > PROCEDURE (score: 3) > PRACTICE (score: 4)
```

Higher authority prevails.

#### 2. Source Hierarchy

When authority levels are equal:

```
1. Ustav (Constitution)
2. Zakon (Law)
3. Podzakonski akt (Regulation)
4. Pravilnik (Ordinance)
5. Uputa (Instruction)
6. Mišljenje (Opinion)
7. Praksa (Practice)
```

#### 3. Lex Posterior (Temporal)

When authority and source are equal:

- More recent `effectiveFrom` date wins
- If identical dates → deterministic ID ordering

### Escalation Criteria

Auto-escalate to human review if ANY:

- Confidence < 0.8
- Both rules are T0 (critical)
- Authority levels are equal AND strategy is "hierarchy"
- Effective dates are identical AND strategy is "temporal"
- Either rule has confidence < 0.85

### Resolution Recording

```typescript
{
  resolution: {
    winningItemId: string      // ID of prevailing rule
    strategy: string           // "hierarchy", "temporal", "source_authority"
    rationaleHr: string        // Croatian explanation
    rationaleEn: string        // English explanation
  },
  status: "RESOLVED" | "ESCALATED",
  confidence: number,
  resolvedBy: string,          // User ID or "ARBITER"
  resolvedAt: DateTime
}
```

### Losing Rule Handling

When conflict is resolved:

```typescript
// Mark losing rule as DEPRECATED
await db.regulatoryRule.update({
  where: { id: losingRuleId },
  data: {
    status: "DEPRECATED",
    reviewerNotes: JSON.stringify({
      deprecated_reason: "Conflict resolution - Rule X prevails",
      conflict_id: conflictId,
      superseded_by: winningRuleId,
      arbiter_rationale: rationaleHr,
    }),
  },
})
```

---

## Releaser Agent (Publication)

### Purpose

Publishes approved rules after verifying evidence chain integrity.

**Location**: `src/lib/regulatory-truth/agents/releaser.ts`

### Publication Hard Gates

```typescript
// 1. T0/T1 rules MUST have approvedBy set
const unapprovedCritical = rules.filter(
  (r) => (r.riskTier === "T0" || r.riskTier === "T1") && !r.approvedBy
)
if (unapprovedCritical.length > 0) {
  return { success: false, error: "T0/T1 rules must have human approval" }
}

// 2. No unresolved conflicts
const rulesWithConflicts = await findRulesWithOpenConflicts(ruleIds)
if (rulesWithConflicts.length > 0) {
  return { success: false, error: "Cannot release rules with open conflicts" }
}

// 3. All rules must have source pointers
const rulesWithoutPointers = rulesWithPointers.filter((r) => r.sourcePointers.length === 0)
if (rulesWithoutPointers.length > 0) {
  return { success: false, error: "Cannot release rules without source pointers" }
}

// 4. Evidence chain integrity (HARD GATE)
const evidenceChainCheck = verifyEvidenceChain(rules)
if (!evidenceChainCheck.valid) {
  return { success: false, error: "Evidence chain verification failed" }
}
```

### Evidence Chain Verification

For each rule, verify:

1. **All pointers reference existing Evidence** (orphaned_pointer)
2. **Evidence hash integrity** (hash_mismatch)
3. **Quote provenance** (quote_not_found) - exactQuote exists in Evidence.rawContent
4. **Tier-based acceptance** (quote_match_unacceptable)

```typescript
export function verifyEvidenceChain(rules): EvidenceChainVerificationResult {
  for (const rule of rules) {
    for (const pointer of rule.sourcePointers) {
      // Check 1: Evidence exists
      if (!pointer.evidence) {
        errors.push({ errorType: "orphaned_pointer", ... })
        continue
      }

      // Check 2: Content hash matches
      const integrityCheck = verifyEvidenceIntegrity(pointer.evidence)
      if (!integrityCheck.valid) {
        errors.push({ errorType: "hash_mismatch", ... })
        continue
      }

      // Check 3: Quote exists in evidence
      const quoteMatch = findQuoteInEvidence(pointer.evidence.rawContent, pointer.exactQuote)
      if (!quoteMatch.found) {
        errors.push({ errorType: "quote_not_found", ... })
        continue
      }

      // Check 4: Match type acceptable for tier
      const matchAcceptable = isMatchTypeAcceptableForTier(quoteMatch.matchType, rule.riskTier)
      if (!matchAcceptable.acceptable) {
        errors.push({ errorType: "quote_match_unacceptable", ... })
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

---

## Release Versioning

### Semantic Versioning

Version bumps based on **highest risk tier** in batch:

| Tier          | Version Bump | Example       |
| ------------- | ------------ | ------------- |
| T0 (critical) | MAJOR        | 1.0.0 → 2.0.0 |
| T1 (high)     | MINOR        | 1.0.0 → 1.1.0 |
| T2/T3 (low)   | PATCH        | 1.0.0 → 1.0.1 |

### RuleRelease Model

**Location**: `prisma/schema.prisma` (lines 4256-4273)

```typescript
model RuleRelease {
  id            String   @id @default(cuid())
  version       String   @unique    // semver: "1.0.0"
  releaseType   String              // "major", "minor", "patch"
  releasedAt    DateTime @default(now())
  effectiveFrom DateTime
  contentHash   String              // SHA-256 of rule content
  changelogHr   String?  @db.Text
  changelogEn   String?  @db.Text
  approvedBy    String[]            // List of approver user IDs
  auditTrail    Json?               // { sourceEvidenceCount, sourcePointerCount, ... }

  rules RegulatoryRule[] @relation("ReleaseRules")
}
```

### Content Hash

SHA256 of normalized rule snapshots ensures integrity:

```typescript
const ruleSnapshots = rules.map((r) => ({
  conceptSlug: r.conceptSlug,
  appliesWhen: r.appliesWhen,
  value: r.value,
  valueType: r.valueType,
  effectiveFrom: normalizeDate(r.effectiveFrom),
  effectiveUntil: normalizeDate(r.effectiveUntil),
}))

const contentHash = computeReleaseHash(ruleSnapshots)
```

### Rollback Support

```typescript
export async function rollbackRelease(
  releaseVersion: string,
  performedBy?: string,
  dryRun = false
): Promise<RollbackResult> {
  // 1. Validate rollback is possible
  // 2. Revert rules from PUBLISHED → APPROVED
  // 3. Log RELEASE_ROLLED_BACK audit event
  // 4. Log RULE_ROLLBACK per affected rule
}
```

---

## Mode 2 → Mode 1 Promotion

### Current Process (Manual)

1. **Identify Candidate**: Query DLQ for frequent unknown domains

   ```sql
   SELECT errorDetails, COUNT(*)
   FROM "ExtractionRejected"
   WHERE rejectionType = 'VALIDATION_FAILED'
     AND errorDetails LIKE 'Unknown domain:%'
   GROUP BY errorDetails
   ORDER BY COUNT(*) DESC
   ```

2. **Analyze Extractions**: Review raw LLM outputs in `ExtractionRejected.rawOutput`

3. **Define Domain**: Add to `DomainSchema` in `src/lib/regulatory-truth/schemas/common.ts`

   ```typescript
   export const DomainSchema = z.enum([
     "pausalni",
     "pdv",
     "porez_dohodak",
     "doprinosi",
     "fiskalizacija",
     "rokovi",
     "obrasci",
     "references", // NEW
     "exemptions", // NEW
   ])
   ```

4. **Configure Ranges**: Add validation ranges in `src/lib/regulatory-truth/utils/deterministic-validators.ts`

5. **Re-process**: Re-run extractor on affected evidence IDs

6. **Validate**: Verify new extractions pass validation

### Promotion Triggers

High-frequency unknown domains become candidates when:

- Rejection count exceeds threshold (configurable)
- Multiple evidence sources attempt same domain
- Domain appears in official regulatory taxonomy

---

## Audit Trail

### AgentRun Model

**Location**: `prisma/schema.prisma` (lines 4275-4298)

Tracks every agent execution:

```typescript
model AgentRun {
  id          String    @id @default(cuid())
  agentType   AgentType // REVIEWER, ARBITER, RELEASER, etc.
  status      String    // "running", "completed", "failed"
  input       Json      // Agent input
  output      Json?     // Agent output
  error       String?   // Error message
  tokensUsed  Int?      // LLM tokens
  durationMs  Int?      // Execution time
  confidence  Float?    // Output confidence
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  evidenceId  String?   // Soft ref to Evidence
  ruleId      String?   // Soft ref to RegulatoryRule
}
```

### RegulatoryAuditLog Model

**Location**: `prisma/schema.prisma` (lines 4330-4342)

Legal defense layer:

```typescript
model RegulatoryAuditLog {
  id          String   @id @default(cuid())
  action      String   // RULE_CREATED, RULE_APPROVED, etc.
  entityType  String   // RULE, CONFLICT, RELEASE, EVIDENCE
  entityId    String
  performedBy String?  // User ID or "SYSTEM"
  performedAt DateTime @default(now())
  metadata    Json?    // Additional context
}
```

### Audit Actions

Key actions tracked:

| Action              | Trigger                   |
| ------------------- | ------------------------- |
| RULE_CREATED        | Composer creates new rule |
| RULE_APPROVED       | Human or auto-approval    |
| RULE_PUBLISHED      | Releaser publishes rule   |
| RULE_REJECTED       | Review failure            |
| RULE_ROLLBACK       | Release rollback          |
| CONFLICT_CREATED    | Conflict detected         |
| CONFLICT_RESOLVED   | Arbiter resolves          |
| CONFLICT_ESCALATED  | Escalated to human        |
| RELEASE_PUBLISHED   | New release created       |
| RELEASE_ROLLED_BACK | Release reverted          |

### Audit Logging Pattern

**Location**: `src/lib/regulatory-truth/utils/audit-log.ts`

```typescript
export async function logAuditEvent(params: {
  action: AuditAction
  entityType: EntityType
  entityId: string
  performedBy?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await db.regulatoryAuditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      performedBy: params.performedBy || "SYSTEM",
      metadata: params.metadata ?? null,
    },
  })
}
```

---

## Governance Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE PIPELINE                          │
└──────────────────────────────────────────────────────────────────┘

Evidence (extracted facts)
    │
    ▼
┌─────────────────────────────────────┐
│           COMPOSER AGENT            │
│  • Creates DRAFT rule               │
│  • Aggregates source pointers       │
│  • Sets conceptSlug, riskTier       │
│  • Logs: RULE_CREATED               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│           REVIEWER AGENT            │
│                                     │
│  T0/T1 rules:                       │
│  → ALWAYS ESCALATE_HUMAN            │
│  → Never auto-approve               │
│                                     │
│  T2/T3 rules:                       │
│  → confidence >= 0.95: APPROVE      │
│  → confidence < 0.95: ESCALATE      │
│  → validation fails: REJECT         │
│                                     │
│  Conflict detected:                 │
│  → ESCALATE_ARBITER                 │
│                                     │
│  Logs: RULE_APPROVED/REJECTED       │
└─────────────────────────────────────┘
    │
    ├── ESCALATE_HUMAN ───────────────────────┐
    │                                         │
    │                                         ▼
    │                          ┌──────────────────────────┐
    │                          │     HUMAN REVIEW         │
    │                          │  • Staff dashboard       │
    │                          │  • Approve/Reject        │
    │                          │  • Set approvedBy        │
    │                          └──────────────────────────┘
    │                                         │
    ├── ESCALATE_ARBITER ─────────────────────┤
    │                                         │
    │                                         ▼
    │                          ┌──────────────────────────┐
    │                          │     ARBITER AGENT        │
    │                          │  • Authority hierarchy   │
    │                          │  • Source hierarchy      │
    │                          │  • Lex posterior         │
    │                          │  • May ESCALATE human    │
    │                          │  Logs: CONFLICT_RESOLVED │
    │                          └──────────────────────────┘
    │                                         │
    │                                         │
    ▼                                         │
┌─────────────────────────────────────────────┴─────────────────────┐
│                        APPROVED RULES                             │
│  • status = APPROVED                                              │
│  • T0/T1 have approvedBy set                                      │
│  • No open conflicts                                              │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│          RELEASER AGENT             │
│                                     │
│  Hard Gates:                        │
│  1. T0/T1 must have approvedBy      │
│  2. No unresolved conflicts         │
│  3. All rules have source pointers  │
│  4. Evidence chain verified         │
│                                     │
│  Version bump:                      │
│  • T0 → MAJOR                       │
│  • T1 → MINOR                       │
│  • T2/T3 → PATCH                    │
│                                     │
│  Logs: RULE_PUBLISHED               │
│        RELEASE_PUBLISHED            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         PUBLISHED RULES             │
│  • status = PUBLISHED               │
│  • Linked to RuleRelease            │
│  • Available to Assistant           │
│  • Immutable (can only DEPRECATE)   │
└─────────────────────────────────────┘
```

---

## UNKNOWN Items

1. **Human Review UI**: No dedicated staff dashboard for rule approval
2. **Batch Approval**: No bulk approval for T2/T3 rules
3. **Notification System**: No alerts when rules need human review
4. **Approval SLA**: No tracking of review queue age or SLA breaches
5. **Automated Re-processing**: No trigger to re-process after domain addition
6. **Confidence Decay**: Weekly decay scheduled but impact on status unclear

---

## References

- Reviewer Agent: `src/lib/regulatory-truth/agents/reviewer.ts`
- Arbiter Agent: `src/lib/regulatory-truth/agents/arbiter.ts`
- Releaser Agent: `src/lib/regulatory-truth/agents/releaser.ts`
- Rule Status Service: `src/lib/regulatory-truth/services/rule-status-service.ts`
- Audit Log: `src/lib/regulatory-truth/utils/audit-log.ts`
- Schema: `prisma/schema.prisma` (lines 3546-3578, 4256-4342)
