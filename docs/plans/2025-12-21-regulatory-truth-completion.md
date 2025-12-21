# Regulatory Truth Layer Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all audit findings and complete missing features to make the Regulatory Truth Layer production-ready.

**Architecture:** Fix 10 audit findings (3 HIGH, 4 MEDIUM, 3 LOW), add AuditLog model for legal defense, create Rules Query API for LLM access, wire conflict detection to Arbiter agent, and ensure correct authority level derivation from sources.

**Tech Stack:** Next.js 15, Prisma 7, PostgreSQL, TypeScript, Zod

---

## Phase 1: HIGH Priority Fixes

### Task 1: Fix runExtractor Argument Type

**Files:**

- Modify: `src/app/api/regulatory/trigger/route.ts:33-41`
- Modify: `src/lib/regulatory-truth/agents/extractor.ts` (add batch function)

**Step 1: Add batch extractor function**

Add to `src/lib/regulatory-truth/agents/extractor.ts` at the end:

```typescript
/**
 * Run extractor on multiple unprocessed evidence records
 */
export async function runExtractorBatch(limit: number = 20): Promise<{
  processed: number
  failed: number
  sourcePointerIds: string[]
  errors: string[]
}> {
  // Find evidence without source pointers
  const unprocessedEvidence = await db.evidence.findMany({
    where: {
      sourcePointers: { none: {} },
    },
    take: limit,
    orderBy: { fetchedAt: "asc" },
  })

  let processed = 0
  let failed = 0
  const allPointerIds: string[] = []
  const errors: string[] = []

  for (const evidence of unprocessedEvidence) {
    try {
      const result = await runExtractor(evidence.id)
      if (result.success) {
        processed++
        allPointerIds.push(...result.sourcePointerIds)
      } else {
        failed++
        errors.push(`${evidence.id}: ${result.error}`)
      }
    } catch (error) {
      failed++
      errors.push(`${evidence.id}: ${error}`)
    }
  }

  return { processed, failed, sourcePointerIds: allPointerIds, errors }
}
```

**Step 2: Update extractor exports**

In `src/lib/regulatory-truth/agents/index.ts`, add to exports:

```typescript
export { runExtractor, runExtractorBatch } from "./extractor"
```

**Step 3: Fix trigger route**

Replace lines 33-41 in `src/app/api/regulatory/trigger/route.ts`:

```typescript
if (phase === "extraction") {
  const { runExtractorBatch } = await import("@/lib/regulatory-truth/agents/extractor")
  const result = await runExtractorBatch(20)

  return NextResponse.json({
    success: true,
    phase: "extraction",
    result,
  })
}
```

**Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/app/api/regulatory/trigger/route.ts src/lib/regulatory-truth/agents/extractor.ts src/lib/regulatory-truth/agents/index.ts
git commit -m "fix: use runExtractorBatch instead of runExtractor(number)"
```

---

### Task 2: Fix Release Content Hash

**Files:**

- Modify: `src/lib/regulatory-truth/agents/releaser.ts:57-65`

**Step 1: Update computeContentHash function**

Replace the function at lines 57-65:

```typescript
/**
 * Compute deterministic content hash for rules including full content
 */
function computeContentHash(
  rules: Array<{
    id: string
    conceptSlug: string
    appliesWhen: string
    value: string
    effectiveFrom: Date
    effectiveUntil: Date | null
  }>
): string {
  // Sort by conceptSlug for deterministic hashing
  const sortedRules = [...rules].sort((a, b) => a.conceptSlug.localeCompare(b.conceptSlug))

  // Include all meaningful content in hash
  const content = sortedRules.map((r) => ({
    conceptSlug: r.conceptSlug,
    appliesWhen: r.appliesWhen,
    value: r.value,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveUntil: r.effectiveUntil?.toISOString() || null,
  }))

  return createHash("sha256").update(JSON.stringify(content), "utf8").digest("hex")
}
```

**Step 2: Update the call site**

At line 167, update to pass full rule data:

```typescript
// Compute content hash with full rule content
const contentHash = computeContentHash(
  rules.map((r) => ({
    id: r.id,
    conceptSlug: r.conceptSlug,
    appliesWhen: r.appliesWhen,
    value: r.value,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
  }))
)
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/agents/releaser.ts
git commit -m "fix: include full rule content in release hash"
```

---

### Task 3: Fix Overnight Runner SQL

**Files:**

- Modify: `src/lib/regulatory-truth/scripts/overnight-run.ts:186-234`

**Step 1: Fix release query (line 188-194)**

Replace the approvedRules query:

```typescript
// Phase 4: Release approved rules
console.log("\n=== PHASE 4: RELEASE ===")
const approvedRules = await client.query(
  `SELECT r.id, r."conceptSlug"
       FROM "RegulatoryRule" r
       WHERE r.status = 'APPROVED'
       AND NOT EXISTS (
         SELECT 1 FROM "_RuleReleases" rr WHERE rr."A" = r.id
       )
       LIMIT 20`
)
```

**Step 2: Fix final status query (lines 215-224)**

Replace the status query:

```typescript
const status = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM "RegulatorySource" WHERE "isActive" = true) as sources,
        (SELECT COUNT(*) FROM "Evidence") as evidence,
        (SELECT COUNT(*) FROM "SourcePointer") as pointers,
        (SELECT COUNT(*) FROM "RegulatoryRule" WHERE status = 'DRAFT') as draft_rules,
        (SELECT COUNT(*) FROM "RegulatoryRule" WHERE status = 'APPROVED') as approved_rules,
        (SELECT COUNT(*) FROM "RegulatoryRule" WHERE status = 'PUBLISHED') as published_rules,
        (SELECT COUNT(*) FROM "RuleRelease") as releases
    `)
```

**Step 3: Fix console output (line 232)**

Change:

```typescript
console.log(`Published Rules: ${s.published_rules}`)
```

**Step 4: Verify syntax**

```bash
npx tsc --noEmit src/lib/regulatory-truth/scripts/overnight-run.ts
```

**Step 5: Commit**

```bash
git add src/lib/regulatory-truth/scripts/overnight-run.ts
git commit -m "fix: correct SQL table names and status enums in overnight runner"
```

---

### Task 4: Fix Status API Enum Values

**Files:**

- Modify: `src/app/api/admin/regulatory-truth/status/route.ts:138-142`

**Step 1: Fix conflict count query**

Replace lines 138-142:

```typescript
const totalConflicts = await db.regulatoryConflict.count({
  where: {
    status: { in: ["OPEN", "ESCALATED"] },
  },
})
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/admin/regulatory-truth/status/route.ts
git commit -m "fix: use correct ConflictStatus enum values in status API"
```

---

### Task 5: Wire Conflict Creation in Composer

**Files:**

- Modify: `src/lib/regulatory-truth/agents/composer.ts:87-98`

**Step 1: Update conflict handling**

Replace lines 87-98:

```typescript
// Check if conflicts were detected
if (result.output.conflicts_detected) {
  // Create a conflict record for Arbiter to resolve later
  const conflict = await db.regulatoryConflict.create({
    data: {
      conflictType: "SOURCE_CONFLICT",
      status: "OPEN",
      description:
        result.output.conflicts_detected.description ||
        "Conflicting values detected in source pointers",
      metadata: {
        sourcePointerIds: sourcePointerIds,
        detectedBy: "COMPOSER",
        conflictDetails: result.output.conflicts_detected,
      },
    },
  })

  console.log(`[composer] Created conflict ${conflict.id} for Arbiter resolution`)

  return {
    success: false,
    output: result.output,
    ruleId: null,
    error: `Conflict detected (${conflict.id}) - queued for Arbiter`,
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/composer.ts
git commit -m "fix: create RegulatoryConflict when composer detects conflicts"
```

---

### Task 6: Wire Conflict Creation in Reviewer

**Files:**

- Modify: `src/lib/regulatory-truth/agents/reviewer.ts:111-116`

**Step 1: Add conflict detection helper**

Add before the runReviewer function:

```typescript
/**
 * Find existing rules that might conflict with this one
 */
async function findConflictingRules(rule: {
  id: string
  conceptSlug: string
  effectiveFrom: Date
}): Promise<Array<{ id: string; conceptSlug: string }>> {
  return db.regulatoryRule.findMany({
    where: {
      id: { not: rule.id },
      conceptSlug: rule.conceptSlug,
      status: { in: ["PUBLISHED", "APPROVED"] },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: rule.effectiveFrom } }],
    },
    select: { id: true, conceptSlug: true },
  })
}
```

**Step 2: Update ESCALATE_ARBITER handling**

Replace lines 111-116:

```typescript
    case "ESCALATE_HUMAN":
      newStatus = "PENDING_REVIEW"
      break

    case "ESCALATE_ARBITER":
      // Find potentially conflicting rules
      const conflictingRules = await findConflictingRules(rule)

      if (conflictingRules.length > 0) {
        // Create conflict for Arbiter
        const conflict = await db.regulatoryConflict.create({
          data: {
            conflictType: "SCOPE_CONFLICT",
            status: "OPEN",
            itemAId: rule.id,
            itemBId: conflictingRules[0].id,
            description: reviewOutput.human_review_reason || "Potential conflict detected during review",
            metadata: {
              detectedBy: "REVIEWER",
              allConflictingRuleIds: conflictingRules.map(r => r.id)
            }
          }
        })
        console.log(`[reviewer] Created conflict ${conflict.id} for Arbiter`)
      }

      newStatus = "PENDING_REVIEW"
      break
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/agents/reviewer.ts
git commit -m "fix: create RegulatoryConflict when reviewer escalates to Arbiter"
```

---

### Task 7: Add Arbiter Phase to Overnight Runner

**Files:**

- Modify: `src/lib/regulatory-truth/scripts/overnight-run.ts`

**Step 1: Import Arbiter**

At line 36, add:

```typescript
const { runArbiter } = await import("../agents/arbiter")
```

**Step 2: Add Phase 3.5 after Review phase (after line 182)**

Insert:

```typescript
// Phase 3.5: Resolve open conflicts
console.log("\n=== PHASE 3.5: CONFLICT RESOLUTION ===")
const openConflicts = await client.query(
  `SELECT id, "conflictType", description
       FROM "RegulatoryConflict"
       WHERE status = 'OPEN'
       LIMIT 5`
)

if (openConflicts.rows.length > 0) {
  console.log(`Found ${openConflicts.rows.length} open conflicts to resolve`)

  let arbiterSuccess = 0
  let arbiterFailed = 0

  for (const conflict of openConflicts.rows) {
    console.log(`\n[arbiter] Processing: ${conflict.conflictType} (${conflict.id})`)
    try {
      const result = await runArbiter(conflict.id)
      if (result.success) {
        arbiterSuccess++
        console.log(`[arbiter] ✓ Resolution: ${result.resolution}`)
      } else {
        arbiterFailed++
        console.log(`[arbiter] ✗ ${result.error}`)
      }
    } catch (error) {
      arbiterFailed++
      console.error(`[arbiter] ✗ ${error}`)
    }
    await sleep(RATE_LIMIT_DELAY)
  }

  console.log(`\n[arbiter] Complete: ${arbiterSuccess} success, ${arbiterFailed} failed`)
} else {
  console.log("No open conflicts to resolve")
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/scripts/overnight-run.ts
git commit -m "feat: add Arbiter conflict resolution phase to overnight runner"
```

---

## Phase 2: MEDIUM Priority Fixes

### Task 8: Add AuditLog Model

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add AuditLog model**

Add at the end of the schema:

```prisma
// =============================================================================
// AUDIT LOG - Legal Defense Layer
// =============================================================================

model AuditLog {
  id           String   @id @default(cuid())
  action       String   // RULE_CREATED, RULE_APPROVED, RULE_REJECTED, CONFLICT_RESOLVED, RELEASE_PUBLISHED
  entityType   String   // RULE, CONFLICT, RELEASE, EVIDENCE
  entityId     String
  performedBy  String?  // User ID or "SYSTEM"
  performedAt  DateTime @default(now())
  metadata     Json?    // Additional context

  @@index([entityType, entityId])
  @@index([performedAt])
  @@index([action])
}
```

**Step 2: Generate and push schema**

```bash
npx prisma db push
npx prisma generate
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add AuditLog model for legal defense tracking"
```

---

### Task 9: Create Audit Logging Utility

**Files:**

- Create: `src/lib/regulatory-truth/utils/audit-log.ts`

**Step 1: Create audit log utility**

```typescript
// src/lib/regulatory-truth/utils/audit-log.ts

import { db } from "@/lib/db"

export type AuditAction =
  | "RULE_CREATED"
  | "RULE_APPROVED"
  | "RULE_REJECTED"
  | "RULE_PUBLISHED"
  | "CONFLICT_CREATED"
  | "CONFLICT_RESOLVED"
  | "RELEASE_PUBLISHED"
  | "EVIDENCE_FETCHED"

export type EntityType = "RULE" | "CONFLICT" | "RELEASE" | "EVIDENCE"

interface LogParams {
  action: AuditAction
  entityType: EntityType
  entityId: string
  performedBy?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an audit event for legal defense tracking
 */
export async function logAuditEvent(params: LogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        performedBy: params.performedBy || "SYSTEM",
        metadata: params.metadata || null,
      },
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("[audit] Failed to log event:", error)
  }
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(
  entityType: EntityType,
  entityId: string
): Promise<
  Array<{
    action: string
    performedBy: string | null
    performedAt: Date
    metadata: unknown
  }>
> {
  return db.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { performedAt: "asc" },
    select: {
      action: true,
      performedBy: true,
      performedAt: true,
      metadata: true,
    },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/audit-log.ts
git commit -m "feat: add audit logging utility"
```

---

### Task 10: Add Audit Logging to Agents

**Files:**

- Modify: `src/lib/regulatory-truth/agents/composer.ts`
- Modify: `src/lib/regulatory-truth/agents/reviewer.ts`
- Modify: `src/lib/regulatory-truth/agents/releaser.ts`
- Modify: `src/lib/regulatory-truth/agents/arbiter.ts`

**Step 1: Add logging to Composer**

Add import at top:

```typescript
import { logAuditEvent } from "../utils/audit-log"
```

After rule creation (line ~124), add:

```typescript
await logAuditEvent({
  action: "RULE_CREATED",
  entityType: "RULE",
  entityId: rule.id,
  metadata: {
    conceptSlug: rule.conceptSlug,
    riskTier: draftRule.risk_tier,
    confidence: draftRule.confidence,
    sourcePointerCount: sourcePointerIds.length,
  },
})
```

**Step 2: Add logging to Reviewer**

Add import at top:

```typescript
import { logAuditEvent } from "../utils/audit-log"
```

After rule update (line ~137), add:

```typescript
await logAuditEvent({
  action:
    newStatus === "APPROVED"
      ? "RULE_APPROVED"
      : newStatus === "REJECTED"
        ? "RULE_REJECTED"
        : "RULE_CREATED",
  entityType: "RULE",
  entityId: rule.id,
  metadata: {
    decision: reviewOutput.decision,
    newStatus,
    confidence: reviewOutput.computed_confidence,
  },
})
```

**Step 3: Add logging to Releaser**

Add import at top:

```typescript
import { logAuditEvent } from "../utils/audit-log"
```

After release creation (line ~216), add:

```typescript
await logAuditEvent({
  action: "RELEASE_PUBLISHED",
  entityType: "RELEASE",
  entityId: release.id,
  metadata: {
    version: finalVersion,
    ruleCount: approvedRuleIds.length,
    contentHash,
  },
})

// Also log each rule as published
for (const ruleId of approvedRuleIds) {
  await logAuditEvent({
    action: "RULE_PUBLISHED",
    entityType: "RULE",
    entityId: ruleId,
    metadata: { releaseId: release.id, version: finalVersion },
  })
}
```

**Step 4: Add logging to Arbiter**

Add import at top of arbiter.ts:

```typescript
import { logAuditEvent } from "../utils/audit-log"
```

After conflict resolution, add:

```typescript
await logAuditEvent({
  action: "CONFLICT_RESOLVED",
  entityType: "CONFLICT",
  entityId: conflictId,
  metadata: {
    resolution,
    strategy: result.output.arbitration.resolution.resolution_strategy,
    confidence: result.output.arbitration.confidence,
  },
})
```

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add src/lib/regulatory-truth/agents/composer.ts src/lib/regulatory-truth/agents/reviewer.ts src/lib/regulatory-truth/agents/releaser.ts src/lib/regulatory-truth/agents/arbiter.ts
git commit -m "feat: add audit logging to all pipeline agents"
```

---

### Task 11: Create Rules Search API

**Files:**

- Create: `src/app/api/rules/search/route.ts`

**Step 1: Create the search endpoint**

```typescript
// src/app/api/rules/search/route.ts

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * GET /api/rules/search
 *
 * Search published regulatory rules by keyword
 * Query params:
 * - q: search query (searches conceptSlug, titleHr, titleEn)
 * - limit: max results (default 20)
 * - riskTier: filter by risk tier (T0, T1, T2, T3)
 * - authorityLevel: filter by authority (LAW, GUIDANCE, PROCEDURE, PRACTICE)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const riskTier = searchParams.get("riskTier")
    const authorityLevel = searchParams.get("authorityLevel")

    const where: Record<string, unknown> = {
      status: "PUBLISHED",
    }

    if (q) {
      where.OR = [
        { conceptSlug: { contains: q, mode: "insensitive" } },
        { titleHr: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
      ]
    }

    if (riskTier) {
      where.riskTier = riskTier
    }

    if (authorityLevel) {
      where.authorityLevel = authorityLevel
    }

    const rules = await db.regulatoryRule.findMany({
      where,
      take: limit,
      orderBy: [{ authorityLevel: "asc" }, { effectiveFrom: "desc" }],
      select: {
        id: true,
        conceptSlug: true,
        titleHr: true,
        titleEn: true,
        riskTier: true,
        authorityLevel: true,
        appliesWhen: true,
        value: true,
        valueType: true,
        effectiveFrom: true,
        effectiveUntil: true,
        confidence: true,
        sourcePointers: {
          select: {
            id: true,
            exactQuote: true,
            evidence: {
              select: {
                url: true,
                source: {
                  select: { name: true, slug: true },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      query: q,
      count: rules.length,
      rules,
    })
  } catch (error) {
    console.error("[api/rules/search] Error:", error)
    return NextResponse.json({ error: "Failed to search rules" }, { status: 500 })
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/rules/search/route.ts
git commit -m "feat: add rules search API endpoint"
```

---

### Task 12: Create Rules Evaluate API

**Files:**

- Create: `src/app/api/rules/evaluate/route.ts`

**Step 1: Create the evaluate endpoint**

```typescript
// src/app/api/rules/evaluate/route.ts

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  parseAppliesWhen,
  evaluateAppliesWhen,
  type EvaluationContext,
} from "@/lib/regulatory-truth/dsl/applies-when"

/**
 * POST /api/rules/evaluate
 *
 * Evaluate which published rules apply to a given context
 * Body: { context: EvaluationContext }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context } = body as { context: EvaluationContext }

    if (!context) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 })
    }

    // Ensure asOf is set
    if (!context.asOf) {
      context.asOf = new Date().toISOString()
    }

    // Get all published rules
    const allRules = await db.regulatoryRule.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        conceptSlug: true,
        titleHr: true,
        titleEn: true,
        riskTier: true,
        authorityLevel: true,
        automationPolicy: true,
        appliesWhen: true,
        value: true,
        valueType: true,
        outcome: true,
        effectiveFrom: true,
        effectiveUntil: true,
        confidence: true,
      },
    })

    // Filter to currently effective rules
    const asOfDate = new Date(context.asOf)
    const effectiveRules = allRules.filter((rule) => {
      const from = new Date(rule.effectiveFrom)
      const until = rule.effectiveUntil ? new Date(rule.effectiveUntil) : null
      return from <= asOfDate && (!until || until >= asOfDate)
    })

    // Evaluate appliesWhen for each rule
    const applicableRules = []
    const evaluationResults = []

    for (const rule of effectiveRules) {
      try {
        const predicate = parseAppliesWhen(rule.appliesWhen)
        const applies = evaluateAppliesWhen(predicate, context)

        evaluationResults.push({
          ruleId: rule.id,
          conceptSlug: rule.conceptSlug,
          applies,
        })

        if (applies) {
          applicableRules.push(rule)
        }
      } catch (error) {
        // Skip rules with invalid appliesWhen
        console.warn(`[evaluate] Invalid appliesWhen for rule ${rule.id}:`, error)
      }
    }

    // Sort by authority level (LAW first)
    const authorityOrder = { LAW: 1, GUIDANCE: 2, PROCEDURE: 3, PRACTICE: 4 }
    applicableRules.sort(
      (a, b) => (authorityOrder[a.authorityLevel] || 99) - (authorityOrder[b.authorityLevel] || 99)
    )

    return NextResponse.json({
      context,
      evaluatedAt: new Date().toISOString(),
      totalRulesEvaluated: effectiveRules.length,
      applicableCount: applicableRules.length,
      applicableRules,
      evaluationDetails: evaluationResults,
    })
  } catch (error) {
    console.error("[api/rules/evaluate] Error:", error)
    return NextResponse.json({ error: "Failed to evaluate rules" }, { status: 500 })
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/rules/evaluate/route.ts
git commit -m "feat: add rules evaluate API endpoint for context-based filtering"
```

---

### Task 13: Add Authority Level Derivation

**Files:**

- Create: `src/lib/regulatory-truth/utils/authority.ts`
- Modify: `src/lib/regulatory-truth/agents/composer.ts`

**Step 1: Create authority utility**

```typescript
// src/lib/regulatory-truth/utils/authority.ts

import { AuthorityLevel } from "@prisma/client"

/**
 * Derive authority level from source slugs
 * Higher authority wins when multiple sources
 */
export function deriveAuthorityLevel(sources: Array<{ slug: string } | string>): AuthorityLevel {
  const slugs = sources.map((s) => (typeof s === "string" ? s : s.slug)).map((s) => s.toLowerCase())

  // LAW: Narodne novine (official gazette)
  if (slugs.some((s) => s.includes("narodne-novine") || s.includes("nn"))) {
    return "LAW"
  }

  // GUIDANCE: Tax authority and Ministry of Finance interpretations
  if (
    slugs.some((s) => s.includes("porezna") || s.includes("mfin") || s.includes("ministarstvo"))
  ) {
    return "GUIDANCE"
  }

  // PROCEDURE: Institutional procedures (FINA, HZMO, HZZO)
  if (
    slugs.some(
      (s) =>
        s.includes("fina") || s.includes("hzmo") || s.includes("hzzo") || s.includes("mirovinsko")
    )
  ) {
    return "PROCEDURE"
  }

  // Default to PRACTICE
  return "PRACTICE"
}

/**
 * Get authority level priority (lower = higher authority)
 */
export function getAuthorityPriority(level: AuthorityLevel): number {
  switch (level) {
    case "LAW":
      return 1
    case "GUIDANCE":
      return 2
    case "PROCEDURE":
      return 3
    case "PRACTICE":
      return 4
    default:
      return 99
  }
}
```

**Step 2: Update Composer to use authority derivation**

Add import at top of composer.ts:

```typescript
import { deriveAuthorityLevel } from "../utils/authority"
```

Update rule creation (around line 103) to include:

```typescript
// Derive authority level from sources
const sourceSlugs = sourcePointers
  .filter((sp) => sp.evidence?.source?.slug)
  .map((sp) => sp.evidence.source.slug)
const authorityLevel = deriveAuthorityLevel(sourceSlugs)

// Store the draft rule in database
const rule = await db.regulatoryRule.create({
  data: {
    conceptSlug: draftRule.concept_slug,
    titleHr: draftRule.title_hr,
    titleEn: draftRule.title_en,
    riskTier: draftRule.risk_tier,
    authorityLevel, // Now derived from source
    // ... rest of fields
  },
})
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/utils/authority.ts src/lib/regulatory-truth/agents/composer.ts
git commit -m "feat: derive authorityLevel from source hierarchy"
```

---

### Task 14: Fix Audit Trail Key Mismatch

**Files:**

- Modify: `src/lib/regulatory-truth/agents/releaser.ts:206-211`

**Step 1: Change to camelCase keys**

Replace lines 206-211:

```typescript
      auditTrail: {
        sourceEvidenceCount: evidenceIds.size,
        sourcePointerCount: sourcePointerIds.size,
        reviewCount: reviewCount,
        humanApprovals: humanApprovals,
      },
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/releaser.ts
git commit -m "fix: use camelCase for auditTrail keys to match UI"
```

---

## Phase 3: LOW Priority Fixes

### Task 15: Fix Reject Route

**Files:**

- Modify: `src/app/api/admin/regulatory-truth/rules/[id]/reject/route.ts`

**Step 1: Fix rejection recording**

Find where `approvedBy` and `approvedAt` are set and change to use `reviewerNotes`:

```typescript
// Update rule status to REJECTED
const updatedRule = await db.regulatoryRule.update({
  where: { id },
  data: {
    status: "REJECTED",
    reviewerNotes: JSON.stringify({
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      reason: reason,
      previousNotes: existingRule.reviewerNotes,
    }),
  },
})
```

Remove any `approvedBy` or `approvedAt` being set on rejection.

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/admin/regulatory-truth/rules/[id]/reject/route.ts
git commit -m "fix: record rejections in reviewerNotes instead of approval fields"
```

---

### Task 16: Fix Sentinel Tests

**Files:**

- Modify: `src/lib/regulatory-truth/__tests__/sentinel.test.ts`

**Step 1: Update imports from Vitest to Node test**

Replace Vitest imports:

```typescript
// Change from:
import { describe, it, expect, vi } from "vitest"

// To:
import { describe, it, mock } from "node:test"
import assert from "node:assert"
```

**Step 2: Update assertions**

Replace `expect(x).toBe(y)` with `assert.strictEqual(x, y)`
Replace `expect(x).toEqual(y)` with `assert.deepStrictEqual(x, y)`

**Step 3: Verify tests run**

```bash
npx tsx --test src/lib/regulatory-truth/__tests__/sentinel.test.ts
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/__tests__/sentinel.test.ts
git commit -m "fix: convert sentinel tests from Vitest to Node test runner"
```

---

## Phase 4: Final Verification

### Task 17: Full Build and Test

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds

**Step 2: Run all regulatory tests**

```bash
npx tsx --test src/lib/regulatory-truth/__tests__/arbiter.test.ts
npx tsx --test src/lib/regulatory-truth/__tests__/sentinel.test.ts
```

Expected: All tests pass

**Step 3: Verify database schema**

```bash
npx prisma db push
```

Expected: Schema synced

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: regulatory truth layer completion - all fixes applied"
git push origin main
```

---

## Summary

| Phase | Tasks       | Priority                           |
| ----- | ----------- | ---------------------------------- |
| 1     | Tasks 1-7   | HIGH - Core data flow fixes        |
| 2     | Tasks 8-14  | MEDIUM - AuditLog, APIs, authority |
| 3     | Tasks 15-16 | LOW - Test and UI fixes            |
| 4     | Task 17     | Verification                       |

**Total: 17 tasks across ~15 files**

**Estimated time: 2-3 hours with subagent-driven development**
