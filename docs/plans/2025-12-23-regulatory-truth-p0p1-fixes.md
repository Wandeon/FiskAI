# Regulatory Truth P0/P1 Fixes + Persistence Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve all P0/P1 blockers from audit findings, implement refinements from review, and add persistence layer to prevent regression.

**Architecture:** Fixes are grouped by priority. Each phase can be deployed independently. All changes are additive (no breaking changes to existing pipeline).

**Tech Stack:** TypeScript, Prisma/PostgreSQL, BullMQ, Ollama LLM, Next.js API routes

---

## Phase 1: P0 Critical Blockers (Must Fix First)

### Task 1: Assistant citations - Add rule context retrieval

**Files:**

- Modify: `src/app/api/assistant/chat/route.ts`
- Create: `src/lib/regulatory-truth/utils/rule-context.ts`

**Problem:** Assistant returns LLM responses without any RegulatoryRule citations.

**Step 1: Create rule context retrieval utility**

```typescript
// src/lib/regulatory-truth/utils/rule-context.ts
import { db } from "@/lib/db"

export interface RuleContext {
  ruleId: string
  conceptSlug: string
  value: string
  exactQuote: string
  sourceUrl: string
  fetchedAt: Date
  articleNumber?: string
  lawReference?: string
}

/**
 * Find published rules relevant to a user query.
 * Returns rules with their source evidence for citations.
 */
export async function findRelevantRules(query: string, limit: number = 5): Promise<RuleContext[]> {
  // Search by concept keywords in query
  const keywords = extractKeywords(query)

  const rules = await db.regulatoryRule.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { conceptSlug: { contains: keywords[0] || "", mode: "insensitive" } },
        { titleHr: { contains: keywords[0] || "", mode: "insensitive" } },
        { Concept: { aliases: { hasSome: keywords } } },
      ],
    },
    include: {
      sourcePointers: {
        include: {
          evidence: true,
        },
        take: 1,
      },
    },
    take: limit,
    orderBy: { confidence: "desc" },
  })

  return rules.map((rule) => {
    const pointer = rule.sourcePointers[0]
    return {
      ruleId: rule.id,
      conceptSlug: rule.conceptSlug,
      value: rule.value,
      exactQuote: pointer?.exactQuote || "",
      sourceUrl: pointer?.evidence?.url || "",
      fetchedAt: pointer?.evidence?.fetchedAt || new Date(),
      articleNumber: pointer?.articleNumber || undefined,
      lawReference: pointer?.lawReference || undefined,
    }
  })
}

function extractKeywords(query: string): string[] {
  // Croatian keyword extraction for regulatory terms
  const stopwords = ["što", "koja", "koji", "kako", "koliko", "je", "su", "za", "od", "do"]
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.includes(w))
    .slice(0, 3)
}

/**
 * Format rule context for LLM system prompt injection.
 */
export function formatRulesForPrompt(rules: RuleContext[]): string {
  if (rules.length === 0) return ""

  return `
RELEVANT REGULATORY RULES (cite these in your answer):
${rules
  .map(
    (r, i) => `
[${i + 1}] ${r.conceptSlug}
    Value: ${r.value}
    Quote: "${r.exactQuote}"
    Source: ${r.sourceUrl}
    ${r.articleNumber ? `Article: ${r.articleNumber}` : ""}
    ${r.lawReference ? `Law: ${r.lawReference}` : ""}
`
  )
  .join("\n")}

CITATION INSTRUCTIONS:
- Reference rules by number [1], [2], etc.
- Include the exact quote when stating values
- Mention the source URL for verification
`.trim()
}
```

**Step 2: Modify assistant chat to include citations**

```typescript
// In src/app/api/assistant/chat/route.ts
// Add import at top
import { findRelevantRules, formatRulesForPrompt } from "@/lib/regulatory-truth/utils/rule-context"

// Before calling Ollama, add rule context
export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()

  // Fetch relevant rules for context
  const rules = await findRelevantRules(lastUserMessage?.content || "")
  const ruleContext = formatRulesForPrompt(rules)

  // Inject rules into system prompt
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${ruleContext}`

  // ... rest of Ollama call with enhanced system prompt

  // Add citation metadata to response
  return new Response(
    JSON.stringify({
      content: assistantResponse,
      citations: rules.map((r) => ({
        ruleId: r.ruleId,
        conceptSlug: r.conceptSlug,
        sourceUrl: r.sourceUrl,
        exactQuote: r.exactQuote,
        fetchedAt: r.fetchedAt.toISOString(),
      })),
    }),
    { headers: { "Content-Type": "application/json" } }
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/rule-context.ts src/app/api/assistant/chat/route.ts
git commit -m "feat(assistant): add regulatory rule citations

- findRelevantRules() queries PUBLISHED rules by keyword
- formatRulesForPrompt() injects context into LLM system prompt
- Response includes citation metadata (ruleId, sourceUrl, exactQuote)

Fixes RTL-001"
```

---

### Task 2: Release hash verification - Fix deterministic computation

**Files:**

- Modify: `src/lib/regulatory-truth/agents/releaser.ts`
- Create: `src/lib/regulatory-truth/utils/release-hash.ts`

**Problem:** Recomputed hash doesn't match stored hash.

**Step 1: Create standalone hash utility**

```typescript
// src/lib/regulatory-truth/utils/release-hash.ts
import { createHash } from "crypto"

export interface RuleSnapshot {
  conceptSlug: string
  appliesWhen: unknown
  value: string
  valueType: string
  effectiveFrom: string | null
  effectiveUntil: string | null
}

/**
 * Compute deterministic hash for a set of rules.
 * CRITICAL: This must match exactly for verification.
 */
export function computeReleaseHash(rules: RuleSnapshot[]): string {
  // Sort by conceptSlug for determinism
  const sorted = [...rules].sort((a, b) => a.conceptSlug.localeCompare(b.conceptSlug))

  // Create canonical JSON (sorted keys, no whitespace variance)
  const canonical = sorted.map((r) => ({
    conceptSlug: r.conceptSlug,
    appliesWhen: typeof r.appliesWhen === "string" ? JSON.parse(r.appliesWhen) : r.appliesWhen,
    value: r.value,
    valueType: r.valueType,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
  }))

  // Stable stringify with sorted keys
  const json = JSON.stringify(canonical, Object.keys(canonical[0] || {}).sort())

  return createHash("sha256").update(json).digest("hex")
}

/**
 * Verify a release hash matches its rules.
 */
export async function verifyReleaseHash(
  releaseId: string,
  db: any
): Promise<{ valid: boolean; stored: string; computed: string }> {
  const release = await db.ruleRelease.findUnique({
    where: { id: releaseId },
    include: {
      rules: {
        select: {
          conceptSlug: true,
          appliesWhen: true,
          value: true,
          valueType: true,
          effectiveFrom: true,
          effectiveUntil: true,
        },
      },
    },
  })

  if (!release) throw new Error(`Release not found: ${releaseId}`)

  const computed = computeReleaseHash(release.rules)

  return {
    valid: computed === release.contentHash,
    stored: release.contentHash,
    computed,
  }
}
```

**Step 2: Update releaser to use new hash function**

```typescript
// In src/lib/regulatory-truth/agents/releaser.ts
// Replace computeContentHash with import
import { computeReleaseHash, type RuleSnapshot } from "../utils/release-hash"

// Update the hash computation call (around line 186)
const ruleSnapshots: RuleSnapshot[] = rules.map((r) => ({
  conceptSlug: r.conceptSlug,
  appliesWhen: r.appliesWhen,
  value: r.value,
  valueType: r.valueType,
  effectiveFrom: r.effectiveFrom?.toISOString().split("T")[0] || null,
  effectiveUntil: r.effectiveUntil?.toISOString().split("T")[0] || null,
}))

const contentHash = computeReleaseHash(ruleSnapshots)
```

**Step 3: Add verification endpoint**

```typescript
// src/app/api/admin/regulatory-truth/releases/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyReleaseHash } from "@/lib/regulatory-truth/utils/release-hash"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await verifyReleaseHash(params.id, db)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    )
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/utils/release-hash.ts src/lib/regulatory-truth/agents/releaser.ts src/app/api/admin/regulatory-truth/releases/
git commit -m "fix(releaser): deterministic hash computation

- Canonical JSON with sorted keys
- Standalone verifyReleaseHash() function
- GET /api/admin/regulatory-truth/releases/[id]/verify endpoint

Fixes RTL-002"
```

---

### Task 3: T0/T1 approval gate - Hard block without approvedBy

**Files:**

- Modify: `src/lib/regulatory-truth/agents/releaser.ts`
- Modify: `src/lib/regulatory-truth/agents/reviewer.ts`

**Problem:** T0 rules published without approvedBy field set.

**Step 1: Add hard gate in releaser**

```typescript
// In src/lib/regulatory-truth/agents/releaser.ts
// Add validation before publishing (around line 260)

// HARD GATE: T0/T1 rules MUST have approvedBy
const unapprovedCritical = rules.filter(
  (r) => (r.riskTier === "T0" || r.riskTier === "T1") && !r.approvedBy
)

if (unapprovedCritical.length > 0) {
  console.error(
    `[releaser] BLOCKED: ${unapprovedCritical.length} T0/T1 rules without approval:`,
    unapprovedCritical.map((r) => r.conceptSlug)
  )
  return {
    success: false,
    output: null,
    releaseId: null,
    error: `Cannot release ${unapprovedCritical.length} T0/T1 rules without approvedBy: ${unapprovedCritical.map((r) => r.conceptSlug).join(", ")}`,
  }
}
```

**Step 2: Update auto-approve to NEVER approve T0/T1**

```typescript
// In src/lib/regulatory-truth/agents/reviewer.ts
// Update autoApproveEligibleRules function (around line 52)

const rules = await db.regulatoryRule.findMany({
  where: {
    status: "PENDING_REVIEW",
    // NEVER auto-approve T0/T1
    riskTier: { in: ["T2", "T3"] },
    confidence: { gte: minConfidence },
    // ... rest of conditions
  },
})

// Add explicit log for skipped T0/T1
const skippedCritical = await db.regulatoryRule.count({
  where: {
    status: "PENDING_REVIEW",
    riskTier: { in: ["T0", "T1"] },
  },
})

if (skippedCritical > 0) {
  console.log(`[reviewer] ${skippedCritical} T0/T1 rules awaiting human approval`)
}
```

**Step 3: Add human approval endpoint**

```typescript
// src/app/api/admin/regulatory-truth/rules/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { approver } = await req.json()

  if (!approver) {
    return NextResponse.json({ error: "approver required" }, { status: 400 })
  }

  const rule = await db.regulatoryRule.findUnique({
    where: { id: params.id },
  })

  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  if (rule.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: `Cannot approve rule in ${rule.status} status` },
      { status: 400 }
    )
  }

  const updated = await db.regulatoryRule.update({
    where: { id: params.id },
    data: {
      status: "APPROVED",
      approvedBy: approver,
      approvedAt: new Date(),
    },
  })

  // Log audit event
  await db.auditEvent.create({
    data: {
      eventType: "RULE_APPROVED",
      entityType: "RegulatoryRule",
      entityId: params.id,
      actor: approver,
      details: {
        riskTier: rule.riskTier,
        conceptSlug: rule.conceptSlug,
      },
    },
  })

  return NextResponse.json({
    success: true,
    rule: {
      id: updated.id,
      conceptSlug: updated.conceptSlug,
      status: updated.status,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt,
    },
  })
}
```

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/agents/releaser.ts src/lib/regulatory-truth/agents/reviewer.ts src/app/api/admin/regulatory-truth/rules/
git commit -m "feat(approval): hard gate T0/T1 rules require human approval

- Releaser blocks release of T0/T1 without approvedBy
- Auto-approve excludes T0/T1 entirely
- POST /api/admin/regulatory-truth/rules/[id]/approve for human approval

Fixes RTL-004"
```

---

### Task 4: Fix invalid AppliesWhen DSL on existing rules

**Files:**

- Modify: `src/lib/regulatory-truth/agents/composer.ts`
- Create: `src/app/api/admin/regulatory-truth/rules/fix-dsl/route.ts`

**Problem:** 13 rules have invalid appliesWhen DSL.

**Step 1: Add DSL validation to composer**

```typescript
// In src/lib/regulatory-truth/agents/composer.ts
// Add import at top
import { validateAppliesWhen } from "../dsl/applies-when"

// After parsing LLM output, validate DSL (around line 150)
for (const draft of result.output.draft_rules) {
  const dslValidation = validateAppliesWhen(draft.applies_when)

  if (!dslValidation.valid) {
    console.warn(`[composer] Invalid DSL for ${draft.concept_slug}: ${dslValidation.error}`)
    // Replace with safe default
    draft.applies_when = { op: "true" }
    draft.composer_notes = `${draft.composer_notes || ""}\n[AUTO-FIX] Original appliesWhen was invalid: ${dslValidation.error}`
  }
}
```

**Step 2: Create migration endpoint to fix existing rules**

```typescript
// src/app/api/admin/regulatory-truth/rules/fix-dsl/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { validateAppliesWhen } from "@/lib/regulatory-truth/dsl/applies-when"

export async function GET(req: NextRequest) {
  // Find invalid rules
  const rules = await db.regulatoryRule.findMany({
    select: { id: true, conceptSlug: true, appliesWhen: true },
  })

  const invalid = rules.filter((r) => {
    try {
      const parsed = typeof r.appliesWhen === "string" ? JSON.parse(r.appliesWhen) : r.appliesWhen
      return !validateAppliesWhen(parsed).valid
    } catch {
      return true
    }
  })

  return NextResponse.json({
    total: rules.length,
    invalid: invalid.length,
    invalidRules: invalid.map((r) => ({
      id: r.id,
      conceptSlug: r.conceptSlug,
      appliesWhen: r.appliesWhen,
    })),
  })
}

export async function POST(req: NextRequest) {
  const { dryRun = true } = await req.json()

  const rules = await db.regulatoryRule.findMany({
    select: { id: true, conceptSlug: true, appliesWhen: true, composerNotes: true },
  })

  const fixes: Array<{ id: string; conceptSlug: string; oldDsl: unknown; newDsl: unknown }> = []

  for (const rule of rules) {
    try {
      const parsed =
        typeof rule.appliesWhen === "string" ? JSON.parse(rule.appliesWhen) : rule.appliesWhen

      if (!validateAppliesWhen(parsed).valid) {
        fixes.push({
          id: rule.id,
          conceptSlug: rule.conceptSlug,
          oldDsl: rule.appliesWhen,
          newDsl: { op: "true" },
        })

        if (!dryRun) {
          await db.regulatoryRule.update({
            where: { id: rule.id },
            data: {
              appliesWhen: { op: "true" },
              composerNotes: `${rule.composerNotes || ""}\n[MIGRATION] Original invalid DSL replaced with { op: "true" }`,
            },
          })
        }
      }
    } catch {
      fixes.push({
        id: rule.id,
        conceptSlug: rule.conceptSlug,
        oldDsl: rule.appliesWhen,
        newDsl: { op: "true" },
      })
    }
  }

  return NextResponse.json({
    dryRun,
    fixed: fixes.length,
    fixes,
  })
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/composer.ts src/app/api/admin/regulatory-truth/rules/fix-dsl/
git commit -m "fix(dsl): validate AppliesWhen in composer + migration endpoint

- Composer validates DSL before storing, replaces invalid with { op: 'true' }
- GET /api/admin/regulatory-truth/rules/fix-dsl lists invalid rules
- POST /api/admin/regulatory-truth/rules/fix-dsl fixes them (dryRun option)

Fixes RTL-005"
```

---

### Task 5: Fix quote-not-in-evidence for HNB exchange rates (RTL-003)

**Files:**

- Modify: `src/lib/regulatory-truth/agents/extractor.ts`

**Problem:** 14 published pointers have exactQuote not in rawContent (JSON API sources).

**Step 1: Add JSON-aware quote extraction**

```typescript
// In src/lib/regulatory-truth/agents/extractor.ts
// Add helper function for JSON content

function extractQuoteFromJson(content: string, value: string): string | null {
  try {
    const json = JSON.parse(content)
    // For HNB API responses, find the field containing the value
    const jsonStr = JSON.stringify(json, null, 2)

    // Find a line containing the value
    const lines = jsonStr.split("\n")
    for (const line of lines) {
      if (line.includes(value)) {
        return line.trim()
      }
    }

    // Fallback: return the key-value pair
    for (const [key, val] of Object.entries(json)) {
      if (String(val).includes(value)) {
        return `"${key}": ${JSON.stringify(val)}`
      }
    }

    return null
  } catch {
    return null
  }
}

// In the extraction validation section, add JSON handling
if (evidence.contentType === "json" || evidence.url.includes("api.hnb.hr")) {
  const jsonQuote = extractQuoteFromJson(evidence.rawContent, String(extraction.extracted_value))
  if (jsonQuote && !extraction.exact_quote.includes(extraction.extracted_value)) {
    extraction.exact_quote = jsonQuote
    extraction.extraction_notes = `${extraction.extraction_notes || ""} [AUTO: Quote extracted from JSON response]`
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/extractor.ts
git commit -m "fix(extractor): handle JSON API sources for quote extraction

- extractQuoteFromJson() finds value in JSON responses
- Auto-corrects exactQuote for HNB exchange rate API
- Preserves original extraction notes

Fixes RTL-003"
```

---

## Phase 2: P1 Issues (High Priority)

### Task 6: Fix Redis timeout on /api/regulatory/status

**Files:**

- Modify: `src/lib/regulatory-truth/workers/redis.ts`
- Modify: `src/app/api/regulatory/status/route.ts`

**Step 1: Add connection timeout to Redis**

```typescript
// In src/lib/regulatory-truth/workers/redis.ts
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ requirement
  enableReadyCheck: false,
  connectTimeout: 5000, // 5 second connection timeout
  commandTimeout: 3000, // 3 second command timeout
  lazyConnect: true, // Don't connect until first command
})

// Add connection state check
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout")), 2000)),
    ])
    return result === "PONG"
  } catch {
    return false
  }
}
```

**Step 2: Update status endpoint with timeout protection**

```typescript
// In src/app/api/regulatory/status/route.ts
import { isRedisHealthy } from "@/lib/regulatory-truth/workers/redis"

export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Quick health check with timeout
    const redisHealthy = await isRedisHealthy()

    if (!redisHealthy) {
      return NextResponse.json(
        {
          status: "degraded",
          redis: { connected: false, error: "Connection failed or timed out" },
          responseTime: Date.now() - startTime,
        },
        { status: 503 }
      )
    }

    // Get queue stats with timeout protection
    const queueStats = await Promise.race([
      getQueueStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Queue stats timeout")), 5000)),
    ])

    return NextResponse.json({
      status: "healthy",
      redis: { connected: true },
      queues: queueStats,
      responseTime: Date.now() - startTime,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/workers/redis.ts src/app/api/regulatory/status/route.ts
git commit -m "fix(redis): add timeout protection to status endpoint

- 5s connection timeout, 3s command timeout
- isRedisHealthy() with 2s ping timeout
- Status endpoint returns 503 on Redis failure

Fixes RTL-006"
```

---

### Task 7: Fix release type mismatch vs risk tiers (RTL-007)

**Files:**

- Modify: `src/lib/regulatory-truth/agents/releaser.ts`

**Step 1: Fix version calculation logic**

```typescript
// In src/lib/regulatory-truth/agents/releaser.ts
// Replace calculateNextVersion function (around line 29)

function calculateNextVersion(
  currentVersion: string | null,
  rules: Array<{ riskTier: string }>
): { version: string; releaseType: "major" | "minor" | "patch" } {
  const [major, minor, patch] = (currentVersion || "0.0.0").split(".").map(Number)

  // Determine release type from HIGHEST risk tier in batch
  const tiers = rules.map((r) => r.riskTier)

  let releaseType: "major" | "minor" | "patch"
  let newVersion: string

  if (tiers.includes("T0")) {
    releaseType = "major"
    newVersion = `${major + 1}.0.0`
  } else if (tiers.includes("T1")) {
    releaseType = "minor"
    newVersion = `${major}.${minor + 1}.0`
  } else {
    // T2, T3 are patches
    releaseType = "patch"
    newVersion = `${major}.${minor}.${patch + 1}`
  }

  return { version: newVersion, releaseType }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/releaser.ts
git commit -m "fix(releaser): release type determined by highest risk tier

- T0 rules → major version bump
- T1 rules → minor version bump
- T2/T3 rules → patch version bump

Fixes RTL-007"
```

---

### Task 8: Fix evidence idempotency - dedupe by URL+hash (RTL-008)

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`
- Modify: `prisma/schema.prisma`

**Step 1: Add unique constraint to schema**

```prisma
// In prisma/schema.prisma, update Evidence model
model Evidence {
  // ... existing fields ...

  @@unique([url, contentHash])  // Add this line
}
```

**Step 2: Add upsert logic to sentinel**

```typescript
// In src/lib/regulatory-truth/agents/sentinel.ts
// Replace evidence creation with upsert (around line 180)

const evidence = await db.evidence.upsert({
  where: {
    url_contentHash: {
      url: result.output.source_url,
      contentHash: result.output.content_hash,
    },
  },
  create: {
    sourceId: source.id,
    url: result.output.source_url,
    contentHash: result.output.content_hash,
    rawContent: result.output.extracted_content,
    contentType: result.output.content_type,
    fetchedAt: new Date(result.output.fetch_timestamp),
  },
  update: {
    // Only update fetchedAt if we re-encounter same content
    fetchedAt: new Date(result.output.fetch_timestamp),
  },
})

console.log(
  `[sentinel] Evidence ${evidence.id} (${evidence.url.slice(0, 50)}...) - ${evidence.id === existingEvidence?.id ? "existing" : "new"}`
)
```

**Step 3: Run migration**

```bash
npx prisma migrate dev --name add_evidence_unique_constraint
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "fix(sentinel): evidence idempotency with URL+hash unique constraint

- Added @@unique([url, contentHash]) to Evidence model
- Sentinel uses upsert instead of create
- Prevents duplicate evidence records

Fixes RTL-008"
```

---

### Task 9: Fix rules pending review without source pointers (RTL-009)

**Files:**

- Modify: `src/lib/regulatory-truth/agents/composer.ts`

**Step 1: Add validation before creating rule**

```typescript
// In src/lib/regulatory-truth/agents/composer.ts
// Before creating rule (around line 160)

// Validate source pointers exist
if (!sourcePointerIds || sourcePointerIds.length === 0) {
  console.error(`[composer] Cannot create rule without source pointers: ${draft.concept_slug}`)
  continue // Skip this rule
}

// Verify pointers exist in DB
const existingPointers = await db.sourcePointer.findMany({
  where: { id: { in: sourcePointerIds } },
  select: { id: true },
})

if (existingPointers.length !== sourcePointerIds.length) {
  console.error(
    `[composer] Missing source pointers for ${draft.concept_slug}: expected ${sourcePointerIds.length}, found ${existingPointers.length}`
  )
  continue
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/agents/composer.ts
git commit -m "fix(composer): validate source pointers before creating rules

- Skip rule creation if no source pointers provided
- Verify all pointer IDs exist in database
- Log errors for debugging

Fixes RTL-009"
```

---

## Phase 3: Refinements from Review

### Task 10: Create ExtractionRejected dead-letter table

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `src/lib/regulatory-truth/agents/extractor.ts`

**Step 1: Add schema**

```prisma
// Add to prisma/schema.prisma
model ExtractionRejected {
  id            String   @id @default(cuid())
  evidenceId    String
  reasonCode    String   // OUT_OF_RANGE, INVALID_DATE, NO_QUOTE_MATCH, etc.
  rawValue      String
  rawExtraction Json     // Full extraction object
  errorDetails  String?
  createdAt     DateTime @default(now())

  evidence      Evidence @relation(fields: [evidenceId], references: [id])

  @@index([evidenceId])
  @@index([reasonCode])
  @@index([createdAt])
}
```

**Step 2: Update extractor to log rejections**

```typescript
// In src/lib/regulatory-truth/agents/extractor.ts
// Update the validation rejection block

if (!validation.valid) {
  console.log(`[extractor] Rejected extraction: ${validation.errors.join(", ")}`)

  // Store in dead-letter table
  await db.extractionRejected.create({
    data: {
      evidenceId: evidence.id,
      reasonCode: validation.errors[0]?.includes("percentage")
        ? "OUT_OF_RANGE"
        : validation.errors[0]?.includes("currency")
          ? "INVALID_CURRENCY"
          : validation.errors[0]?.includes("date")
            ? "INVALID_DATE"
            : validation.errors[0]?.includes("not found")
              ? "NO_QUOTE_MATCH"
              : "VALIDATION_FAILED",
      rawValue: String(extraction.extracted_value),
      rawExtraction: extraction as any,
      errorDetails: validation.errors.join("; "),
    },
  })

  rejectedExtractions.push({ extraction, errors: validation.errors })
  continue
}
```

**Step 3: Run migration and commit**

```bash
npx prisma migrate dev --name add_extraction_rejected
git add prisma/schema.prisma prisma/migrations/ src/lib/regulatory-truth/agents/extractor.ts
git commit -m "feat(extractor): dead-letter table for rejected extractions

- ExtractionRejected model stores failed extractions
- Reason codes: OUT_OF_RANGE, INVALID_DATE, NO_QUOTE_MATCH, etc.
- Preserves signal for debugging and prompt improvement"
```

---

### Task 11: Domain-aware validators (VAT 0-30, contributions 0-50)

**Files:**

- Modify: `src/lib/regulatory-truth/utils/deterministic-validators.ts`

**Step 1: Add domain-specific ranges**

```typescript
// In deterministic-validators.ts, add domain config

const DOMAIN_RANGES: Record<string, { percentageMax?: number; currencyMax?: number }> = {
  pdv: { percentageMax: 30 }, // VAT max 30%
  doprinosi: { percentageMax: 50 }, // Contributions max 50%
  porez_dohodak: { percentageMax: 60 }, // Income tax max 60%
  pausalni: { currencyMax: 1_000_000 }, // Pausalni threshold max 1M EUR
}

// Update validateExtraction to use domain ranges
export function validateExtraction(extraction: {
  domain: string
  value_type: string
  extracted_value: string | number
  exact_quote: string
  confidence: number
}): ExtractionValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const domainConfig = DOMAIN_RANGES[extraction.domain] || {}

  // Type-specific validation with domain awareness
  const value = extraction.extracted_value
  const numValue = typeof value === "number" ? value : parseFloat(String(value))

  switch (extraction.value_type) {
    case "percentage": {
      const maxPct = domainConfig.percentageMax || 100
      const result = validatePercentage(numValue, maxPct)
      if (!result.valid) errors.push(result.error!)
      break
    }
    case "currency_eur":
    case "currency": {
      const maxCurrency = domainConfig.currencyMax || 100_000_000_000
      const result = validateCurrency(numValue, "eur", maxCurrency)
      if (!result.valid) errors.push(result.error!)
      break
    }
    // ... rest of cases
  }

  // ... rest of function
}

// Update validatePercentage to accept max
export function validatePercentage(value: number, max: number = 100): ValidationResult {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: "Percentage must be a number" }
  }
  if (value < 0) {
    return { valid: false, error: "Percentage cannot be negative" }
  }
  if (value > max) {
    return { valid: false, error: `Percentage cannot exceed ${max}` }
  }
  return { valid: true }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/deterministic-validators.ts
git commit -m "feat(validators): domain-aware validation ranges

- PDV: max 30%
- Doprinosi: max 50%
- Porez dohodak: max 60%
- Pausalni currency: max 1M EUR

Tighter bounds for high-risk domains"
```

---

### Task 12: Deterministic conflict seeding

**Files:**

- Create: `src/lib/regulatory-truth/utils/conflict-detector.ts`
- Modify: `src/lib/regulatory-truth/agents/composer.ts`

**Step 1: Create structural conflict detector**

```typescript
// src/lib/regulatory-truth/utils/conflict-detector.ts
import { db } from "@/lib/db"

export interface ConflictSeed {
  type: "VALUE_MISMATCH" | "DATE_OVERLAP" | "AUTHORITY_SUPERSEDE"
  existingRuleId: string
  newRuleId: string
  reason: string
}

/**
 * Check for structural conflicts when a new rule is created.
 * These are deterministic checks, not AI-based.
 */
export async function detectStructuralConflicts(newRule: {
  id: string
  conceptSlug: string
  value: string
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  authorityLevel: number
  articleNumber?: string | null
}): Promise<ConflictSeed[]> {
  const conflicts: ConflictSeed[] = []

  // Find existing rules for same concept
  const existingRules = await db.regulatoryRule.findMany({
    where: {
      conceptSlug: newRule.conceptSlug,
      status: { in: ["PUBLISHED", "APPROVED", "PENDING_REVIEW"] },
      id: { not: newRule.id },
    },
  })

  for (const existing of existingRules) {
    // Check 1: Same concept, different value, overlapping dates
    if (existing.value !== newRule.value) {
      const datesOverlap = checkDateOverlap(
        existing.effectiveFrom,
        existing.effectiveUntil,
        newRule.effectiveFrom,
        newRule.effectiveUntil
      )

      if (datesOverlap) {
        conflicts.push({
          type: "VALUE_MISMATCH",
          existingRuleId: existing.id,
          newRuleId: newRule.id,
          reason: `Same concept "${newRule.conceptSlug}" with different values: "${existing.value}" vs "${newRule.value}" during overlapping period`,
        })
      }
    }

    // Check 2: Higher authority supersedes
    if (newRule.authorityLevel < existing.authorityLevel) {
      conflicts.push({
        type: "AUTHORITY_SUPERSEDE",
        existingRuleId: existing.id,
        newRuleId: newRule.id,
        reason: `New rule from higher authority (level ${newRule.authorityLevel}) may supersede existing (level ${existing.authorityLevel})`,
      })
    }
  }

  // Check 3: Same article reference, different value
  if (newRule.articleNumber) {
    const sameArticle = await db.regulatoryRule.findMany({
      where: {
        id: { not: newRule.id },
        status: { in: ["PUBLISHED", "APPROVED"] },
        sourcePointers: {
          some: { articleNumber: newRule.articleNumber },
        },
      },
    })

    for (const existing of sameArticle) {
      if (existing.value !== newRule.value) {
        conflicts.push({
          type: "VALUE_MISMATCH",
          existingRuleId: existing.id,
          newRuleId: newRule.id,
          reason: `Same article "${newRule.articleNumber}" with different values`,
        })
      }
    }
  }

  return conflicts
}

function checkDateOverlap(
  start1: Date | null,
  end1: Date | null,
  start2: Date | null,
  end2: Date | null
): boolean {
  const s1 = start1?.getTime() || 0
  const e1 = end1?.getTime() || Infinity
  const s2 = start2?.getTime() || 0
  const e2 = end2?.getTime() || Infinity

  return s1 <= e2 && s2 <= e1
}

/**
 * Create conflict records for detected structural conflicts.
 */
export async function seedConflicts(conflicts: ConflictSeed[]): Promise<number> {
  let created = 0

  for (const conflict of conflicts) {
    // Check if conflict already exists
    const existing = await db.regulatoryConflict.findFirst({
      where: {
        OR: [
          { ruleAId: conflict.existingRuleId, ruleBId: conflict.newRuleId },
          { ruleAId: conflict.newRuleId, ruleBId: conflict.existingRuleId },
        ],
        status: "OPEN",
      },
    })

    if (!existing) {
      await db.regulatoryConflict.create({
        data: {
          conflictType:
            conflict.type === "AUTHORITY_SUPERSEDE" ? "TEMPORAL_CONFLICT" : "SOURCE_CONFLICT",
          ruleAId: conflict.existingRuleId,
          ruleBId: conflict.newRuleId,
          description: conflict.reason,
          status: "OPEN",
          detectedAt: new Date(),
          detectionMethod: "STRUCTURAL",
        },
      })
      created++
      console.log(`[conflict] Created ${conflict.type}: ${conflict.reason}`)
    }
  }

  return created
}
```

**Step 2: Integrate into composer**

```typescript
// In src/lib/regulatory-truth/agents/composer.ts
// After creating rule, check for conflicts
import { detectStructuralConflicts, seedConflicts } from "../utils/conflict-detector"

// After rule creation (around line 190)
const conflicts = await detectStructuralConflicts({
  id: rule.id,
  conceptSlug: rule.conceptSlug,
  value: rule.value,
  effectiveFrom: rule.effectiveFrom,
  effectiveUntil: rule.effectiveUntil,
  authorityLevel: rule.authorityLevel,
  articleNumber: sourcePointer?.articleNumber,
})

if (conflicts.length > 0) {
  const created = await seedConflicts(conflicts)
  console.log(`[composer] Detected ${conflicts.length} potential conflicts, created ${created} new`)
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/conflict-detector.ts src/lib/regulatory-truth/agents/composer.ts
git commit -m "feat(conflicts): deterministic structural conflict detection

- VALUE_MISMATCH: same concept, different value, overlapping dates
- AUTHORITY_SUPERSEDE: higher authority source
- Same article reference with different values

Conflicts created automatically, not dependent on AI"
```

---

### Task 13: Soft-fail wrapper for AI outputs

**Files:**

- Modify: `src/lib/regulatory-truth/agents/runner.ts`
- Modify: `prisma/schema.prisma`

**Step 1: Add soft-fail to runner**

```typescript
// In src/lib/regulatory-truth/agents/runner.ts
// Update runAgent function

export async function runAgent<I, O>({
  agentType,
  input,
  inputSchema,
  outputSchema,
  temperature,
  evidenceId,
  softFail = true, // NEW: default to soft-fail
}: RunAgentOptions<I, O>): Promise<AgentResult<O>> {
  const start = Date.now()

  try {
    // ... existing LLM call logic ...

    // Parse output
    const parseResult = outputSchema.safeParse(llmOutput)

    if (!parseResult.success) {
      // SOFT FAIL: Store error but don't throw
      await db.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "failed",
          errorMessage: `Schema validation failed: ${parseResult.error.message}`,
          rawOutput: llmOutput, // Store raw for debugging
        },
      })

      // Increment failure metric
      agentFailures.inc({ agent: agentType, reason: "schema_validation" })

      if (softFail) {
        return {
          success: false,
          output: null,
          error: `Schema validation failed: ${parseResult.error.message}`,
          rawOutput: llmOutput,
        }
      } else {
        throw new Error(`Schema validation failed: ${parseResult.error.message}`)
      }
    }

    // ... success path ...
  } catch (error) {
    // Store failure with full context
    await db.agentRun.update({
      where: { id: agentRunId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      },
    })

    agentFailures.inc({ agent: agentType, reason: "exception" })

    if (softFail) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    throw error
  }
}
```

**Step 2: Add rawOutput column to AgentRun**

```prisma
// In prisma/schema.prisma, update AgentRun model
model AgentRun {
  // ... existing fields ...
  rawOutput     Json?    // Store raw LLM output on failure for debugging
}
```

**Step 3: Run migration and commit**

```bash
npx prisma migrate dev --name add_agent_run_raw_output
git add prisma/schema.prisma prisma/migrations/ src/lib/regulatory-truth/agents/runner.ts
git commit -m "feat(runner): soft-fail mode preserves failed AI outputs

- softFail=true by default (doesn't kill pipeline)
- Failed outputs stored in AgentRun.rawOutput for debugging
- Metrics incremented on failure
- Pipeline continues with degraded state"
```

---

### Task 14: Health gates tied to improvements

**Files:**

- Create: `src/lib/regulatory-truth/utils/health-gates.ts`
- Modify: `src/app/api/regulatory/status/route.ts`

**Step 1: Create health gate checks**

```typescript
// src/lib/regulatory-truth/utils/health-gates.ts
import { db } from "@/lib/db"

export interface HealthGate {
  name: string
  status: "healthy" | "degraded" | "critical"
  value: number
  threshold: number
  message: string
}

export async function checkHealthGates(): Promise<HealthGate[]> {
  const gates: HealthGate[] = []
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Gate 1: Extractor failure rate
  const extractorRuns = await db.agentRun.groupBy({
    by: ["status"],
    where: {
      agentType: "EXTRACTOR",
      createdAt: { gte: last24h },
    },
    _count: true,
  })

  const extractorTotal = extractorRuns.reduce((sum, r) => sum + r._count, 0)
  const extractorFailed = extractorRuns.find((r) => r.status === "failed")?._count || 0
  const extractorFailRate = extractorTotal > 0 ? (extractorFailed / extractorTotal) * 100 : 0

  gates.push({
    name: "extractor_failure_rate",
    status: extractorFailRate > 30 ? "critical" : extractorFailRate > 15 ? "degraded" : "healthy",
    value: Math.round(extractorFailRate),
    threshold: 15,
    message: `Extractor failure rate: ${extractorFailRate.toFixed(1)}% (last 24h)`,
  })

  // Gate 2: Conflict detection
  const recentRules = await db.regulatoryRule.count({
    where: { createdAt: { gte: last24h } },
  })
  const recentConflicts = await db.regulatoryConflict.count({
    where: { detectedAt: { gte: last24h } },
  })

  const conflictRatio = recentRules > 10 ? recentConflicts / recentRules : null

  gates.push({
    name: "conflict_detection",
    status: conflictRatio !== null && conflictRatio < 0.01 ? "degraded" : "healthy",
    value: recentConflicts,
    threshold: 1,
    message:
      conflictRatio === null
        ? `${recentConflicts} conflicts (insufficient rule volume)`
        : `${recentConflicts} conflicts / ${recentRules} rules`,
  })

  // Gate 3: Stale rules without review
  const staleRules = await db.regulatoryRule.count({
    where: {
      status: "PUBLISHED",
      confidence: { lte: 0.7 },
      updatedAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    },
  })

  gates.push({
    name: "stale_rules_pending",
    status: staleRules > 20 ? "critical" : staleRules > 5 ? "degraded" : "healthy",
    value: staleRules,
    threshold: 5,
    message: `${staleRules} published rules with confidence ≤0.7 and age >30 days`,
  })

  // Gate 4: Extraction rejection rate
  const rejections = await db.extractionRejected.count({
    where: { createdAt: { gte: last24h } },
  })
  const extractions = await db.sourcePointer.count({
    where: { createdAt: { gte: last24h } },
  })
  const rejectionRate = extractions > 0 ? (rejections / (extractions + rejections)) * 100 : 0

  gates.push({
    name: "extraction_rejection_rate",
    status: rejectionRate > 50 ? "critical" : rejectionRate > 25 ? "degraded" : "healthy",
    value: Math.round(rejectionRate),
    threshold: 25,
    message: `${rejections} rejected / ${extractions + rejections} total extractions`,
  })

  return gates
}

export function getOverallHealth(gates: HealthGate[]): "healthy" | "degraded" | "critical" {
  if (gates.some((g) => g.status === "critical")) return "critical"
  if (gates.some((g) => g.status === "degraded")) return "degraded"
  return "healthy"
}
```

**Step 2: Add to status endpoint**

```typescript
// In src/app/api/regulatory/status/route.ts
import { checkHealthGates, getOverallHealth } from "@/lib/regulatory-truth/utils/health-gates"

// In GET handler, add health gates
const healthGates = await checkHealthGates()
const overallHealth = getOverallHealth(healthGates)

return NextResponse.json({
  status: overallHealth,
  redis: { connected: true },
  queues: queueStats,
  healthGates,
  responseTime: Date.now() - startTime,
})
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/health-gates.ts src/app/api/regulatory/status/route.ts
git commit -m "feat(health): add health gates tied to accuracy improvements

Gates:
- extractor_failure_rate: >15% degraded, >30% critical
- conflict_detection: alert if no conflicts over N rules
- stale_rules_pending: >5 stale low-confidence rules
- extraction_rejection_rate: >25% degraded, >50% critical

Enables monitoring of accuracy system health"
```

---

## Phase 4: Final Integration & Verification

### Task 15: Run all tests

```bash
node --import tsx --test src/lib/regulatory-truth/__tests__/*.test.ts
```

### Task 16: Apply all migrations

```bash
npx prisma migrate deploy
```

### Task 17: Final commit

```bash
git add -A
git commit -m "feat(regulatory): complete P0/P1 fixes + persistence layer

P0 Fixes:
- RTL-001: Assistant citations with rule context
- RTL-002: Deterministic release hash verification
- RTL-003: JSON API quote extraction for HNB
- RTL-004: Hard gate T0/T1 approval
- RTL-005: AppliesWhen DSL validation + migration

P1 Fixes:
- RTL-006: Redis timeout protection
- RTL-007: Release type from highest risk tier
- RTL-008: Evidence idempotency constraint
- RTL-009: Source pointer validation in composer

Persistence Layer:
- ExtractionRejected dead-letter table
- Domain-aware validation ranges
- Deterministic conflict seeding
- Soft-fail AI output wrapper
- Health gates for monitoring"
```

---

## Summary

| Phase | Tasks | Impact                  |
| ----- | ----- | ----------------------- |
| 1     | 1-5   | P0 blockers resolved    |
| 2     | 6-9   | P1 issues fixed         |
| 3     | 10-14 | Persistence layer added |
| 4     | 15-17 | Verification & deploy   |

**Estimated Time:** 2-3 days

**Dependencies:**

- Phase 1 can be deployed independently (highest priority)
- Phase 2 builds on Phase 1
- Phase 3 requires Phase 1-2 complete
- Phase 4 is final verification
