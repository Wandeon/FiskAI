# Regulatory Truth Layer - Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build the database schema, agent infrastructure, and validation schemas for the Croatian Regulatory Truth Layer agent pipeline.

**Architecture:** Prisma models for Evidence/SourcePointer/Rule/Release, reusable Ollama agent runner with typed prompts, Zod schemas for all agent I/O validation.

**Tech Stack:** Prisma 7, PostgreSQL, Zod, TypeScript, Ollama API

---

## Phase 1 Tasks Overview

| #   | Task                                     | Files                                               | Est. |
| --- | ---------------------------------------- | --------------------------------------------------- | ---- |
| 1   | Create RiskTier and AgentType enums      | prisma/schema.prisma                                | 3m   |
| 2   | Create RegulatorySource model            | prisma/schema.prisma                                | 3m   |
| 3   | Create Evidence model                    | prisma/schema.prisma                                | 3m   |
| 4   | Create SourcePointer model               | prisma/schema.prisma                                | 3m   |
| 5   | Create RegulatoryRule model              | prisma/schema.prisma                                | 5m   |
| 6   | Create RuleRelease model                 | prisma/schema.prisma                                | 3m   |
| 7   | Create AgentRun model                    | prisma/schema.prisma                                | 3m   |
| 8   | Create RegulatoryConflict model          | prisma/schema.prisma                                | 3m   |
| 9   | Create MonitoringAlert model             | prisma/schema.prisma                                | 3m   |
| 10  | Run migration                            | CLI                                                 | 2m   |
| 11  | Create base Zod schemas for common types | src/lib/regulatory-truth/schemas/common.ts          | 5m   |
| 12  | Create Sentinel agent schemas            | src/lib/regulatory-truth/schemas/sentinel.ts        | 5m   |
| 13  | Create Extractor agent schemas           | src/lib/regulatory-truth/schemas/extractor.ts       | 5m   |
| 14  | Create Composer agent schemas            | src/lib/regulatory-truth/schemas/composer.ts        | 5m   |
| 15  | Create Reviewer agent schemas            | src/lib/regulatory-truth/schemas/reviewer.ts        | 5m   |
| 16  | Create Releaser agent schemas            | src/lib/regulatory-truth/schemas/releaser.ts        | 5m   |
| 17  | Create Arbiter agent schemas             | src/lib/regulatory-truth/schemas/arbiter.ts         | 5m   |
| 18  | Create schema index with exports         | src/lib/regulatory-truth/schemas/index.ts           | 2m   |
| 19  | Create agent prompt templates            | src/lib/regulatory-truth/prompts/index.ts           | 10m  |
| 20  | Create agent runner infrastructure       | src/lib/regulatory-truth/agents/runner.ts           | 10m  |
| 21  | Create Sentinel agent implementation     | src/lib/regulatory-truth/agents/sentinel.ts         | 8m   |
| 22  | Create Extractor agent implementation    | src/lib/regulatory-truth/agents/extractor.ts        | 8m   |
| 23  | Create agent index with exports          | src/lib/regulatory-truth/agents/index.ts            | 2m   |
| 24  | Create module index                      | src/lib/regulatory-truth/index.ts                   | 2m   |
| 25  | Add test for Sentinel schema validation  | src/lib/regulatory-truth/**tests**/sentinel.test.ts | 5m   |

---

## Task 1: Create RiskTier and AgentType enums

**Files:**

- Modify: `prisma/schema.prisma` (append at end)

**Step 1: Add the enums to Prisma schema**

Add at the end of `prisma/schema.prisma`:

```prisma
// =============================================================================
// REGULATORY TRUTH LAYER
// =============================================================================

enum RiskTier {
  T0  // Critical: Tax rates, legal deadlines, penalties
  T1  // High: Thresholds, contribution bases
  T2  // Medium: Procedural requirements, form fields
  T3  // Low: UI labels, help text
}

enum AgentType {
  SENTINEL
  EXTRACTOR
  COMPOSER
  REVIEWER
  RELEASER
  ARBITER
}

enum RuleStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  PUBLISHED
  DEPRECATED
  REJECTED
}

enum ConflictType {
  SOURCE_CONFLICT
  TEMPORAL_CONFLICT
  SCOPE_CONFLICT
  INTERPRETATION_CONFLICT
}

enum ConflictStatus {
  OPEN
  RESOLVED
  ESCALATED
}

enum AlertSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum AlertType {
  SOURCE_CHANGED
  SOURCE_UNAVAILABLE
  RULE_SUPERSEDED
  CONFLICT_DETECTED
  DEADLINE_APPROACHING
  CONFIDENCE_DEGRADED
  COVERAGE_GAP
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add enums for risk tiers, agents, and statuses"
```

---

## Task 2: Create RegulatorySource model

**Files:**

- Modify: `prisma/schema.prisma` (append after enums)

**Step 1: Add RegulatorySource model**

```prisma
model RegulatorySource {
  id                String    @id @default(cuid())
  slug              String    @unique  // e.g., "porezna-pausalni"
  name              String               // "Porezna uprava - Paušalno oporezivanje"
  url               String
  hierarchy         Int       @default(5)  // 1=Ustav, 2=Zakon, 3=Podzakonski, 4=Pravilnik, 5=Uputa, 6=Mišljenje, 7=Praksa
  fetchIntervalHours Int      @default(24)
  lastFetchedAt     DateTime?
  lastContentHash   String?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  evidence          Evidence[]

  @@index([isActive])
  @@index([lastFetchedAt])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add RegulatorySource model"
```

---

## Task 3: Create Evidence model

**Files:**

- Modify: `prisma/schema.prisma` (append after RegulatorySource)

**Step 1: Add Evidence model**

```prisma
model Evidence {
  id              String   @id @default(cuid())
  sourceId        String
  fetchedAt       DateTime @default(now())
  contentHash     String
  rawContent      String   // Full HTML/PDF text
  contentType     String   @default("html")  // html, pdf, xml
  url             String
  hasChanged      Boolean  @default(false)
  changeSummary   String?

  source          RegulatorySource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  sourcePointers  SourcePointer[]
  agentRuns       AgentRun[]

  @@index([sourceId])
  @@index([fetchedAt])
  @@index([contentHash])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add Evidence model"
```

---

## Task 4: Create SourcePointer model

**Files:**

- Modify: `prisma/schema.prisma` (append after Evidence)

**Step 1: Add SourcePointer model**

```prisma
model SourcePointer {
  id              String   @id @default(cuid())
  evidenceId      String
  domain          String   // pausalni, pdv, doprinosi, fiskalizacija, etc.
  valueType       String   // currency, percentage, date, threshold, text
  extractedValue  String   // Stored as string, parsed by application
  displayValue    String   // Human-readable format
  exactQuote      String   // Exact text from source
  contextBefore   String?  // Previous sentence/paragraph
  contextAfter    String?  // Following sentence/paragraph
  selector        String?  // CSS selector or XPath
  confidence      Float    @default(0.8)
  extractionNotes String?
  createdAt       DateTime @default(now())

  evidence        Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  rules           RegulatoryRule[] @relation("RuleSourcePointers")

  @@index([evidenceId])
  @@index([domain])
  @@index([confidence])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add SourcePointer model"
```

---

## Task 5: Create RegulatoryRule model

**Files:**

- Modify: `prisma/schema.prisma` (append after SourcePointer)

**Step 1: Add RegulatoryRule model**

```prisma
model RegulatoryRule {
  id                String     @id @default(cuid())
  conceptSlug       String     // e.g., "pausalni-revenue-threshold"
  titleHr           String
  titleEn           String?
  riskTier          RiskTier
  appliesWhen       String     // AppliesWhen DSL expression
  value             String     // The regulatory value (stored as string)
  valueType         String     // percentage, currency_hrk, currency_eur, count, date, text
  explanationHr     String?
  explanationEn     String?
  effectiveFrom     DateTime
  effectiveUntil    DateTime?
  supersedesId      String?    // Previous rule this supersedes
  status            RuleStatus @default(DRAFT)
  confidence        Float      @default(0.8)
  composerNotes     String?
  reviewerNotes     String?
  approvedBy        String?    // User ID who approved (for T0/T1)
  approvedAt        DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  supersedes        RegulatoryRule?  @relation("RuleSupersession", fields: [supersedesId], references: [id])
  supersededBy      RegulatoryRule[] @relation("RuleSupersession")
  sourcePointers    SourcePointer[]  @relation("RuleSourcePointers")
  releases          RuleRelease[]    @relation("ReleaseRules")
  conflictsA        RegulatoryConflict[] @relation("ConflictItemA")
  conflictsB        RegulatoryConflict[] @relation("ConflictItemB")
  agentRuns         AgentRun[]

  @@unique([conceptSlug, effectiveFrom])
  @@index([status])
  @@index([riskTier])
  @@index([conceptSlug])
  @@index([effectiveFrom])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add RegulatoryRule model"
```

---

## Task 6: Create RuleRelease model

**Files:**

- Modify: `prisma/schema.prisma` (append after RegulatoryRule)

**Step 1: Add RuleRelease model**

```prisma
model RuleRelease {
  id              String   @id @default(cuid())
  version         String   // semver: "1.0.0"
  releaseType     String   // major, minor, patch
  releasedAt      DateTime @default(now())
  effectiveFrom   DateTime
  contentHash     String   // SHA-256 of rule content
  changelogHr     String?
  changelogEn     String?
  approvedBy      String[] // List of approver user IDs
  auditTrail      Json?    // { sourceEvidenceCount, sourcePointerCount, reviewCount, humanApprovals }

  rules           RegulatoryRule[] @relation("ReleaseRules")

  @@unique([version])
  @@index([releasedAt])
  @@index([effectiveFrom])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add RuleRelease model"
```

---

## Task 7: Create AgentRun model

**Files:**

- Modify: `prisma/schema.prisma` (append after RuleRelease)

**Step 1: Add AgentRun model**

```prisma
model AgentRun {
  id              String    @id @default(cuid())
  agentType       AgentType
  status          String    @default("running")  // running, completed, failed
  input           Json      // The input provided to the agent
  output          Json?     // The output from the agent (null if failed)
  error           String?   // Error message if failed
  tokensUsed      Int?
  durationMs      Int?
  confidence      Float?
  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  // Optional relations based on what the agent processed
  evidenceId      String?
  ruleId          String?

  evidence        Evidence?       @relation(fields: [evidenceId], references: [id])
  rule            RegulatoryRule? @relation(fields: [ruleId], references: [id])

  @@index([agentType])
  @@index([status])
  @@index([startedAt])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add AgentRun model"
```

---

## Task 8: Create RegulatoryConflict model

**Files:**

- Modify: `prisma/schema.prisma` (append after AgentRun)

**Step 1: Add RegulatoryConflict model**

```prisma
model RegulatoryConflict {
  id                String         @id @default(cuid())
  conflictType      ConflictType
  status            ConflictStatus @default(OPEN)
  itemAId           String
  itemBId           String
  description       String
  resolution        Json?          // { winningItemId, strategy, rationaleHr, rationaleEn }
  confidence        Float?
  requiresHumanReview Boolean      @default(false)
  humanReviewReason String?
  resolvedBy        String?        // User ID
  resolvedAt        DateTime?
  createdAt         DateTime       @default(now())

  itemA             RegulatoryRule @relation("ConflictItemA", fields: [itemAId], references: [id])
  itemB             RegulatoryRule @relation("ConflictItemB", fields: [itemBId], references: [id])

  @@index([status])
  @@index([conflictType])
  @@index([createdAt])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add RegulatoryConflict model"
```

---

## Task 9: Create MonitoringAlert model

**Files:**

- Modify: `prisma/schema.prisma` (append after RegulatoryConflict)

**Step 1: Add MonitoringAlert model**

```prisma
model MonitoringAlert {
  id                  String        @id @default(cuid())
  severity            AlertSeverity
  type                AlertType
  affectedRuleIds     String[]
  sourceId            String?
  description         String
  autoAction          Json?         // { action, executed, result }
  humanActionRequired Boolean       @default(false)
  acknowledgedBy      String?
  acknowledgedAt      DateTime?
  resolvedAt          DateTime?
  createdAt           DateTime      @default(now())

  @@index([severity])
  @@index([type])
  @@index([createdAt])
  @@index([resolvedAt])
}
```

**Step 2: Verify syntax**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(regulatory-truth): add MonitoringAlert model"
```

---

## Task 10: Run migration

**Files:**

- Creates: `prisma/migrations/YYYYMMDDHHMMSS_add_regulatory_truth_layer/migration.sql`

**Step 1: Generate and run migration**

Run: `cd /home/admin/FiskAI && npx prisma migrate dev --name add_regulatory_truth_layer`
Expected: "Your database is now in sync with your schema."

**Step 2: Verify generation**

Run: `cd /home/admin/FiskAI && npx prisma generate`
Expected: "✔ Generated Prisma Client"

**Step 3: Commit migration**

```bash
git add prisma/migrations
git commit -m "feat(regulatory-truth): add database migration for regulatory truth layer"
```

---

## Task 11: Create base Zod schemas for common types

**Files:**

- Create: `src/lib/regulatory-truth/schemas/common.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/common.ts
import { z } from "zod"

// =============================================================================
// ENUMS (matching Prisma)
// =============================================================================

export const RiskTierSchema = z.enum(["T0", "T1", "T2", "T3"])
export type RiskTier = z.infer<typeof RiskTierSchema>

export const AgentTypeSchema = z.enum([
  "SENTINEL",
  "EXTRACTOR",
  "COMPOSER",
  "REVIEWER",
  "RELEASER",
  "ARBITER",
])
export type AgentType = z.infer<typeof AgentTypeSchema>

export const RuleStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "DEPRECATED",
  "REJECTED",
])
export type RuleStatus = z.infer<typeof RuleStatusSchema>

export const ConflictTypeSchema = z.enum([
  "SOURCE_CONFLICT",
  "TEMPORAL_CONFLICT",
  "SCOPE_CONFLICT",
  "INTERPRETATION_CONFLICT",
])
export type ConflictType = z.infer<typeof ConflictTypeSchema>

// =============================================================================
// DOMAIN TYPES
// =============================================================================

export const DomainSchema = z.enum([
  "pausalni",
  "pdv",
  "porez_dohodak",
  "doprinosi",
  "fiskalizacija",
  "rokovi",
  "obrasci",
])
export type Domain = z.infer<typeof DomainSchema>

export const ValueTypeSchema = z.enum([
  "currency",
  "percentage",
  "date",
  "threshold",
  "text",
  "currency_hrk",
  "currency_eur",
  "count",
])
export type ValueType = z.infer<typeof ValueTypeSchema>

export const ContentTypeSchema = z.enum(["html", "pdf", "xml"])
export type ContentType = z.infer<typeof ContentTypeSchema>

// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================

export const CONFIDENCE_THRESHOLDS = {
  T0: 0.99,
  T1: 0.95,
  T2: 0.9,
  T3: 0.85,
} as const

export const AUTO_APPROVE_THRESHOLDS = {
  T0: Infinity, // Never auto-approve
  T1: Infinity, // Never auto-approve
  T2: 0.95,
  T3: 0.9,
} as const

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const ConfidenceSchema = z.number().min(0).max(1)

export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date format YYYY-MM-DD")

export const ISOTimestampSchema = z.string().datetime()

export const URLSchema = z.string().url()
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/common.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/common.ts
git commit -m "feat(regulatory-truth): add common Zod schemas"
```

---

## Task 12: Create Sentinel agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/sentinel.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/sentinel.ts
import { z } from "zod"
import { ContentTypeSchema, URLSchema, ISOTimestampSchema } from "./common"

// =============================================================================
// SENTINEL INPUT
// =============================================================================

export const SentinelInputSchema = z.object({
  sourceUrl: URLSchema,
  previousHash: z.string().nullable(),
  sourceId: z.string(),
})
export type SentinelInput = z.infer<typeof SentinelInputSchema>

// =============================================================================
// SENTINEL OUTPUT
// =============================================================================

export const SentinelOutputSchema = z.object({
  source_url: URLSchema,
  fetch_timestamp: ISOTimestampSchema,
  content_hash: z.string().min(64).max(64), // SHA-256 hex
  has_changed: z.boolean(),
  previous_hash: z.string().nullable(),
  extracted_content: z.string(),
  content_type: ContentTypeSchema,
  change_summary: z.string().nullable(),
  sections_changed: z.array(z.string()),
  fetch_status: z.enum(["success", "error"]),
  error_message: z.string().nullable(),
})
export type SentinelOutput = z.infer<typeof SentinelOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateSentinelOutput(data: unknown): SentinelOutput {
  return SentinelOutputSchema.parse(data)
}

export function isSentinelOutputValid(data: unknown): data is SentinelOutput {
  return SentinelOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/sentinel.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/sentinel.ts
git commit -m "feat(regulatory-truth): add Sentinel agent Zod schemas"
```

---

## Task 13: Create Extractor agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/extractor.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/extractor.ts
import { z } from "zod"
import { DomainSchema, ValueTypeSchema, ConfidenceSchema } from "./common"

// =============================================================================
// EXTRACTOR INPUT
// =============================================================================

export const ExtractorInputSchema = z.object({
  evidenceId: z.string(),
  content: z.string(),
  contentType: z.enum(["html", "pdf", "xml"]),
  sourceUrl: z.string().url(),
})
export type ExtractorInput = z.infer<typeof ExtractorInputSchema>

// =============================================================================
// EXTRACTION ITEM
// =============================================================================

export const ExtractionItemSchema = z.object({
  id: z.string(),
  domain: DomainSchema,
  value_type: ValueTypeSchema,
  extracted_value: z.union([z.string(), z.number()]),
  display_value: z.string(),
  exact_quote: z.string().min(1),
  context_before: z.string(),
  context_after: z.string(),
  selector: z.string(),
  confidence: ConfidenceSchema,
  extraction_notes: z.string(),
})
export type ExtractionItem = z.infer<typeof ExtractionItemSchema>

// =============================================================================
// EXTRACTOR OUTPUT
// =============================================================================

export const ExtractorOutputSchema = z.object({
  evidence_id: z.string(),
  extractions: z.array(ExtractionItemSchema),
  extraction_metadata: z.object({
    total_extractions: z.number().int().min(0),
    by_domain: z.record(z.string(), z.number()),
    low_confidence_count: z.number().int().min(0),
    processing_notes: z.string(),
  }),
})
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateExtractorOutput(data: unknown): ExtractorOutput {
  return ExtractorOutputSchema.parse(data)
}

export function isExtractorOutputValid(data: unknown): data is ExtractorOutput {
  return ExtractorOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/extractor.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/extractor.ts
git commit -m "feat(regulatory-truth): add Extractor agent Zod schemas"
```

---

## Task 14: Create Composer agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/composer.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/composer.ts
import { z } from "zod"
import { RiskTierSchema, ValueTypeSchema, ConfidenceSchema, ISODateSchema } from "./common"

// =============================================================================
// COMPOSER INPUT
// =============================================================================

export const ComposerInputSchema = z.object({
  sourcePointerIds: z.array(z.string()).min(1),
  sourcePointers: z.array(
    z.object({
      id: z.string(),
      domain: z.string(),
      extractedValue: z.string(),
      exactQuote: z.string(),
      confidence: z.number(),
    })
  ),
})
export type ComposerInput = z.infer<typeof ComposerInputSchema>

// =============================================================================
// DRAFT RULE
// =============================================================================

export const DraftRuleSchema = z.object({
  concept_slug: z.string().regex(/^[a-z0-9-]+$/, "Must be kebab-case"),
  title_hr: z.string().min(1),
  title_en: z.string().min(1),
  risk_tier: RiskTierSchema,
  applies_when: z.string().min(1), // AppliesWhen DSL expression
  value: z.union([z.string(), z.number()]),
  value_type: ValueTypeSchema,
  explanation_hr: z.string(),
  explanation_en: z.string(),
  source_pointer_ids: z.array(z.string()).min(1),
  effective_from: ISODateSchema,
  effective_until: ISODateSchema.nullable(),
  supersedes: z.string().nullable(),
  confidence: ConfidenceSchema,
  composer_notes: z.string(),
})
export type DraftRule = z.infer<typeof DraftRuleSchema>

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

export const ConflictDetectedSchema = z.object({
  description: z.string(),
  conflicting_sources: z.array(z.string()),
  escalate_to_arbiter: z.literal(true),
})
export type ConflictDetected = z.infer<typeof ConflictDetectedSchema>

// =============================================================================
// COMPOSER OUTPUT
// =============================================================================

export const ComposerOutputSchema = z.object({
  draft_rule: DraftRuleSchema,
  conflicts_detected: ConflictDetectedSchema.optional(),
})
export type ComposerOutput = z.infer<typeof ComposerOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateComposerOutput(data: unknown): ComposerOutput {
  return ComposerOutputSchema.parse(data)
}

export function isComposerOutputValid(data: unknown): data is ComposerOutput {
  return ComposerOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/composer.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/composer.ts
git commit -m "feat(regulatory-truth): add Composer agent Zod schemas"
```

---

## Task 15: Create Reviewer agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/reviewer.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/reviewer.ts
import { z } from "zod"
import { ConfidenceSchema } from "./common"

// =============================================================================
// REVIEWER INPUT
// =============================================================================

export const ReviewerInputSchema = z.object({
  draftRuleId: z.string(),
  draftRule: z.object({
    conceptSlug: z.string(),
    titleHr: z.string(),
    riskTier: z.enum(["T0", "T1", "T2", "T3"]),
    appliesWhen: z.string(),
    value: z.union([z.string(), z.number()]),
    confidence: z.number(),
  }),
  sourcePointers: z.array(
    z.object({
      id: z.string(),
      exactQuote: z.string(),
      extractedValue: z.string(),
      confidence: z.number(),
    })
  ),
})
export type ReviewerInput = z.infer<typeof ReviewerInputSchema>

// =============================================================================
// VALIDATION CHECKS
// =============================================================================

export const ValidationChecksSchema = z.object({
  value_matches_source: z.boolean(),
  applies_when_correct: z.boolean(),
  risk_tier_appropriate: z.boolean(),
  dates_correct: z.boolean(),
  sources_complete: z.boolean(),
  no_conflicts: z.boolean(),
  translation_accurate: z.boolean(),
})
export type ValidationChecks = z.infer<typeof ValidationChecksSchema>

// =============================================================================
// ISSUE FOUND
// =============================================================================

export const IssueFoundSchema = z.object({
  severity: z.enum(["critical", "major", "minor"]),
  description: z.string(),
  recommendation: z.string(),
})
export type IssueFound = z.infer<typeof IssueFoundSchema>

// =============================================================================
// REVIEWER OUTPUT
// =============================================================================

export const ReviewerOutputSchema = z.object({
  review_result: z.object({
    draft_rule_id: z.string(),
    decision: z.enum(["APPROVE", "REJECT", "ESCALATE_HUMAN", "ESCALATE_ARBITER"]),
    validation_checks: ValidationChecksSchema,
    computed_confidence: ConfidenceSchema,
    issues_found: z.array(IssueFoundSchema),
    human_review_reason: z.string().nullable(),
    reviewer_notes: z.string(),
  }),
})
export type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateReviewerOutput(data: unknown): ReviewerOutput {
  return ReviewerOutputSchema.parse(data)
}

export function isReviewerOutputValid(data: unknown): data is ReviewerOutput {
  return ReviewerOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/reviewer.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/reviewer.ts
git commit -m "feat(regulatory-truth): add Reviewer agent Zod schemas"
```

---

## Task 16: Create Releaser agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/releaser.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/releaser.ts
import { z } from "zod"
import { ISODateSchema, ISOTimestampSchema } from "./common"

// =============================================================================
// RELEASER INPUT
// =============================================================================

export const ReleaserInputSchema = z.object({
  approvedRuleIds: z.array(z.string()).min(1),
  previousVersion: z.string().nullable(), // e.g., "1.0.0"
})
export type ReleaserInput = z.infer<typeof ReleaserInputSchema>

// =============================================================================
// RULE INCLUSION
// =============================================================================

export const RuleInclusionSchema = z.object({
  rule_id: z.string(),
  concept_slug: z.string(),
  action: z.enum(["add", "update", "deprecate"]),
  supersedes: z.string().nullable(),
})
export type RuleInclusion = z.infer<typeof RuleInclusionSchema>

// =============================================================================
// AUDIT TRAIL
// =============================================================================

export const AuditTrailSchema = z.object({
  source_evidence_count: z.number().int().min(0),
  source_pointer_count: z.number().int().min(0),
  review_count: z.number().int().min(0),
  human_approvals: z.number().int().min(0),
})
export type AuditTrail = z.infer<typeof AuditTrailSchema>

// =============================================================================
// RELEASER OUTPUT
// =============================================================================

export const ReleaserOutputSchema = z.object({
  release: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver format"),
    release_type: z.enum(["major", "minor", "patch"]),
    released_at: ISOTimestampSchema,
    effective_from: ISODateSchema,
    rules_included: z.array(RuleInclusionSchema),
    content_hash: z.string().min(64).max(64), // SHA-256 hex
    changelog_hr: z.string(),
    changelog_en: z.string(),
    approved_by: z.array(z.string()),
    audit_trail: AuditTrailSchema,
  }),
})
export type ReleaserOutput = z.infer<typeof ReleaserOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateReleaserOutput(data: unknown): ReleaserOutput {
  return ReleaserOutputSchema.parse(data)
}

export function isReleaserOutputValid(data: unknown): data is ReleaserOutput {
  return ReleaserOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/releaser.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/releaser.ts
git commit -m "feat(regulatory-truth): add Releaser agent Zod schemas"
```

---

## Task 17: Create Arbiter agent schemas

**Files:**

- Create: `src/lib/regulatory-truth/schemas/arbiter.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/arbiter.ts
import { z } from "zod"
import { ConflictTypeSchema, ConfidenceSchema } from "./common"

// =============================================================================
// ARBITER INPUT
// =============================================================================

export const ConflictingItemSchema = z.object({
  item_id: z.string(),
  item_type: z.enum(["source", "rule"]),
  claim: z.string(),
})
export type ConflictingItem = z.infer<typeof ConflictingItemSchema>

export const ArbiterInputSchema = z.object({
  conflictId: z.string(),
  conflictType: ConflictTypeSchema,
  conflictingItems: z.array(ConflictingItemSchema).min(2),
})
export type ArbiterInput = z.infer<typeof ArbiterInputSchema>

// =============================================================================
// RESOLUTION
// =============================================================================

export const ResolutionStrategySchema = z.enum([
  "hierarchy",
  "temporal",
  "specificity",
  "conservative",
])
export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>

export const ResolutionSchema = z.object({
  winning_item_id: z.string(),
  resolution_strategy: ResolutionStrategySchema,
  rationale_hr: z.string(),
  rationale_en: z.string(),
})
export type Resolution = z.infer<typeof ResolutionSchema>

// =============================================================================
// ARBITER OUTPUT
// =============================================================================

export const ArbiterOutputSchema = z.object({
  arbitration: z.object({
    conflict_id: z.string(),
    conflict_type: ConflictTypeSchema,
    conflicting_items: z.array(ConflictingItemSchema),
    resolution: ResolutionSchema,
    confidence: ConfidenceSchema,
    requires_human_review: z.boolean(),
    human_review_reason: z.string().nullable(),
  }),
})
export type ArbiterOutput = z.infer<typeof ArbiterOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateArbiterOutput(data: unknown): ArbiterOutput {
  return ArbiterOutputSchema.parse(data)
}

export function isArbiterOutputValid(data: unknown): data is ArbiterOutput {
  return ArbiterOutputSchema.safeParse(data).success
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/arbiter.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/arbiter.ts
git commit -m "feat(regulatory-truth): add Arbiter agent Zod schemas"
```

---

## Task 18: Create schema index with exports

**Files:**

- Create: `src/lib/regulatory-truth/schemas/index.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/schemas/index.ts

// Common types and enums
export * from "./common"

// Agent-specific schemas
export * from "./sentinel"
export * from "./extractor"
export * from "./composer"
export * from "./reviewer"
export * from "./releaser"
export * from "./arbiter"
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/schemas/index.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/schemas/index.ts
git commit -m "feat(regulatory-truth): add schema index exports"
```

---

## Task 19: Create agent prompt templates

**Files:**

- Create: `src/lib/regulatory-truth/prompts/index.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/prompts/index.ts

import type { AgentType } from "../schemas"

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export const SENTINEL_PROMPT = `
ROLE: You are the Sentinel Agent for Croatian regulatory compliance monitoring.
Your job is to fetch and analyze official regulatory sources.

INPUT: A source URL and the previous content hash (if any).

TASK:
1. Fetch the current content from the URL
2. Extract the main regulatory content (ignore navigation, ads, footers)
3. Compute a content hash of the regulatory text
4. Compare with previous hash to detect changes
5. If changed, identify what sections changed

OUTPUT FORMAT:
{
  "source_url": "the URL fetched",
  "fetch_timestamp": "ISO 8601 timestamp",
  "content_hash": "SHA-256 of extracted content",
  "has_changed": true/false,
  "previous_hash": "previous hash or null",
  "extracted_content": "the main regulatory text",
  "content_type": "html" | "pdf" | "xml",
  "change_summary": "brief description of what changed (if applicable)",
  "sections_changed": ["list of section identifiers that changed"],
  "fetch_status": "success" | "error",
  "error_message": "if fetch failed, why"
}

CONSTRAINTS:
- Always preserve exact text, never paraphrase
- Include surrounding context for changed sections
- Flag if source structure changed significantly
- Report any access errors immediately
`.trim()

export const EXTRACTOR_PROMPT = `
ROLE: You are the Extractor Agent. You parse regulatory documents and
extract specific data points with precise citations.

INPUT: An Evidence record containing regulatory content.

TASK:
1. Identify all regulatory values, thresholds, rates, and deadlines
2. For each, extract:
   - The exact value (number, date, percentage, etc.)
   - The exact quote containing this value
   - Surrounding context (sentence before and after)
   - A CSS selector or XPath to locate this in the original
3. Classify each extraction by regulatory domain

DOMAINS:
- pausalni: Paušalni obrt thresholds, rates, deadlines
- pdv: VAT rates, thresholds, exemptions
- porez_dohodak: Income tax brackets, deductions
- doprinosi: Contribution rates (health, pension)
- fiskalizacija: Fiscalization rules, schemas
- rokovi: Deadlines, calendars
- obrasci: Form requirements, field specs

OUTPUT FORMAT:
{
  "evidence_id": "ID of the input evidence",
  "extractions": [
    {
      "id": "unique extraction ID",
      "domain": "one of the domains above",
      "value_type": "currency" | "percentage" | "date" | "threshold" | "text",
      "extracted_value": "the value (e.g., 40000, 0.25, 2024-01-31)",
      "display_value": "human readable (e.g., €40,000, 25%, 31. siječnja 2024.)",
      "exact_quote": "the exact text from source containing this value",
      "context_before": "previous sentence or paragraph",
      "context_after": "following sentence or paragraph",
      "selector": "CSS selector or XPath to locate",
      "confidence": 0.0-1.0,
      "extraction_notes": "any ambiguity or concerns"
    }
  ],
  "extraction_metadata": {
    "total_extractions": number,
    "by_domain": { "domain": count },
    "low_confidence_count": number,
    "processing_notes": "any issues encountered"
  }
}

CONFIDENCE SCORING:
- 1.0: Explicit, unambiguous value in clear context
- 0.9: Clear value but context could apply to multiple scenarios
- 0.8: Value present but requires interpretation
- 0.7: Inferred from surrounding text
- <0.7: Flag for human review

CONSTRAINTS:
- NEVER infer values not explicitly stated
- Quote EXACTLY, preserve Croatian characters
- Include enough context to verify extraction
- Flag any ambiguous language
`.trim()

export const COMPOSER_PROMPT = `
ROLE: You are the Composer Agent for Croatian regulatory compliance.
Your job is to create Draft Rules from verified SourcePointers.

INPUT: One or more SourcePointers with citations and values.

TASK:
1. Analyze the SourcePointer(s) to understand the regulatory requirement
2. Determine the risk tier (T0-T3) based on financial/legal impact
3. Create an AppliesWhen predicate that captures WHEN this rule applies
4. Write a human-readable explanation
5. Link to all supporting SourcePointers

APPLIES_WHEN DSL REFERENCE:
- date_range(start, end) - effective date window
- entity_type(types...) - "pausalni" | "jdoo" | "doo" | "obrt"
- annual_revenue(op, amount) - "<" | "<=" | ">" | ">=" | "between"
- activity_code(codes...) - NKD 2007 codes
- has_employees(bool) - true/false
- registered_for_vat(bool) - true/false
- AND(...), OR(...), NOT(...) - combinators

RISK TIER CRITERIA:
- T0 (Critical): Tax rates, legal deadlines, penalties, FINA identifiers
- T1 (High): Thresholds that trigger obligations, contribution bases
- T2 (Medium): Procedural requirements, form fields, bank codes
- T3 (Low): UI labels, help text, non-binding guidance

OUTPUT FORMAT:
{
  "draft_rule": {
    "concept_slug": "string (kebab-case identifier)",
    "title_hr": "string (Croatian title)",
    "title_en": "string (English title)",
    "risk_tier": "T0" | "T1" | "T2" | "T3",
    "applies_when": "AppliesWhen DSL expression",
    "value": "the regulatory value/threshold/rate",
    "value_type": "percentage" | "currency_hrk" | "currency_eur" | "count" | "date" | "text",
    "explanation_hr": "string (Croatian explanation)",
    "explanation_en": "string (English explanation)",
    "source_pointer_ids": ["array of SourcePointer IDs"],
    "effective_from": "ISO date",
    "effective_until": "ISO date or null",
    "supersedes": "previous rule ID or null",
    "confidence": 0.0-1.0,
    "composer_notes": "any uncertainties or edge cases"
  }
}

CONSTRAINTS:
- Never invent values not present in SourcePointers
- If multiple sources conflict, flag for Arbiter (do not resolve yourself)
- Mark confidence < 0.8 if any ambiguity exists
- Include all relevant source_pointer_ids
`.trim()

export const REVIEWER_PROMPT = `
ROLE: You are the Reviewer Agent. You validate Draft Rules for accuracy
and determine if they can be auto-approved or require human review.

INPUT: A Draft Rule with linked SourcePointers and Evidence.

VALIDATION CHECKLIST:
1. □ Value matches source exactly (character-for-character for numbers)
2. □ AppliesWhen predicate correctly captures conditions from source
3. □ Risk tier is appropriately assigned
4. □ Effective dates are correct
5. □ All relevant sources are linked
6. □ No conflicts with existing active rules
7. □ Translation accuracy (HR ↔ EN)

AUTHORITY MATRIX:
- T2/T3 rules with confidence ≥ 0.95: AUTO-APPROVE
- T1 rules with confidence ≥ 0.98: FLAG for expedited human review
- T0 rules: ALWAYS require human approval (never auto-approve)
- Any rule with confidence < 0.9: ESCALATE with concerns

OUTPUT FORMAT:
{
  "review_result": {
    "draft_rule_id": "string",
    "decision": "APPROVE" | "REJECT" | "ESCALATE_HUMAN" | "ESCALATE_ARBITER",
    "validation_checks": {
      "value_matches_source": boolean,
      "applies_when_correct": boolean,
      "risk_tier_appropriate": boolean,
      "dates_correct": boolean,
      "sources_complete": boolean,
      "no_conflicts": boolean,
      "translation_accurate": boolean
    },
    "computed_confidence": 0.0-1.0,
    "issues_found": [
      {
        "severity": "critical" | "major" | "minor",
        "description": "string",
        "recommendation": "string"
      }
    ],
    "human_review_reason": "string or null",
    "reviewer_notes": "string"
  }
}

REJECTION CRITERIA:
- Value does not match source: REJECT
- AppliesWhen has logical errors: REJECT
- Wrong risk tier (T0 marked as T2): REJECT
- Missing critical source: REJECT

ESCALATION CRITERIA:
- T0 or T1 rules: ESCALATE_HUMAN
- Confidence < 0.9: ESCALATE_HUMAN with concerns
- Conflicting sources detected: ESCALATE_ARBITER
- Novel rule type not seen before: ESCALATE_HUMAN
`.trim()

export const RELEASER_PROMPT = `
ROLE: You are the Releaser Agent. You create versioned release bundles
from approved rules, ensuring integrity and traceability.

INPUT: Set of approved rules ready for release.

TASK:
1. Group rules by effective date
2. Check for supersession chains (rule A supersedes rule B)
3. Generate release manifest
4. Compute content hash for integrity
5. Create human-readable changelog

VERSIONING:
- Major: T0 rule changes (e.g., tax rate change)
- Minor: T1 rule changes (e.g., new threshold)
- Patch: T2/T3 changes (e.g., corrections, clarifications)

OUTPUT FORMAT:
{
  "release": {
    "version": "semver string",
    "release_type": "major" | "minor" | "patch",
    "released_at": "ISO timestamp",
    "effective_from": "ISO date (when rules take effect)",
    "rules_included": [
      {
        "rule_id": "string",
        "concept_slug": "string",
        "action": "add" | "update" | "deprecate",
        "supersedes": "previous rule_id or null"
      }
    ],
    "content_hash": "SHA-256 of rule content",
    "changelog_hr": "string (Croatian changelog)",
    "changelog_en": "string (English changelog)",
    "approved_by": ["list of approver IDs"],
    "audit_trail": {
      "source_evidence_count": number,
      "source_pointer_count": number,
      "review_count": number,
      "human_approvals": number
    }
  }
}

CONSTRAINTS:
- Never release rules without approval chain
- Always include supersession information
- Content hash must be deterministic (sorted JSON)
- Changelog must list all user-visible changes
`.trim()

export const ARBITER_PROMPT = `
ROLE: You are the Arbiter Agent. You resolve conflicts in the regulatory
knowledge base using the Croatian legal hierarchy.

INPUT: Conflict report with conflicting sources/rules.

LEGAL HIERARCHY (highest to lowest):
1. Ustav RH (Constitution)
2. Zakon (Parliamentary law - Narodne novine)
3. Podzakonski akt (Government regulations)
4. Pravilnik (Ministry rules)
5. Uputa (Tax authority guidance - Porezna uprava)
6. Mišljenje (Official interpretations)
7. Praksa (Established practice)

CONFLICT TYPES:
- SOURCE_CONFLICT: Two official sources state different values
- TEMPORAL_CONFLICT: Unclear which rule applies at what time
- SCOPE_CONFLICT: Overlapping AppliesWhen conditions
- INTERPRETATION_CONFLICT: Ambiguous source language

RESOLUTION STRATEGIES:
1. Hierarchy: Higher authority source wins
2. Temporal: Later effective date wins (lex posterior)
3. Specificity: More specific rule wins (lex specialis)
4. Conservative: When uncertain, choose stricter interpretation

OUTPUT FORMAT:
{
  "arbitration": {
    "conflict_id": "string",
    "conflict_type": "SOURCE_CONFLICT" | "TEMPORAL_CONFLICT" | "SCOPE_CONFLICT" | "INTERPRETATION_CONFLICT",
    "conflicting_items": [
      {
        "item_id": "string",
        "item_type": "source" | "rule",
        "claim": "string (what it claims)"
      }
    ],
    "resolution": {
      "winning_item_id": "string",
      "resolution_strategy": "hierarchy" | "temporal" | "specificity" | "conservative",
      "rationale_hr": "string",
      "rationale_en": "string"
    },
    "confidence": 0.0-1.0,
    "requires_human_review": boolean,
    "human_review_reason": "string or null"
  }
}

ESCALATION:
- Constitutional questions: ALWAYS escalate
- Equal hierarchy sources in conflict: ESCALATE
- Novel conflict patterns: ESCALATE
- Financial impact > €10,000: ESCALATE
`.trim()

// =============================================================================
// PROMPT GETTER
// =============================================================================

export function getAgentPrompt(agentType: AgentType): string {
  switch (agentType) {
    case "SENTINEL":
      return SENTINEL_PROMPT
    case "EXTRACTOR":
      return EXTRACTOR_PROMPT
    case "COMPOSER":
      return COMPOSER_PROMPT
    case "REVIEWER":
      return REVIEWER_PROMPT
    case "RELEASER":
      return RELEASER_PROMPT
    case "ARBITER":
      return ARBITER_PROMPT
    default:
      throw new Error(`Unknown agent type: ${agentType}`)
  }
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/prompts/index.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/prompts/index.ts
git commit -m "feat(regulatory-truth): add agent prompt templates"
```

---

## Task 20: Create agent runner infrastructure

**Files:**

- Create: `src/lib/regulatory-truth/agents/runner.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/agents/runner.ts

import { z } from "zod"
import { db } from "@/lib/db"
import type { AgentType } from "../schemas"
import { getAgentPrompt } from "../prompts"

// =============================================================================
// OLLAMA CLIENT (reuse existing pattern)
// =============================================================================

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://ollama.com"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1"
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY

function getOllamaHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (OLLAMA_API_KEY) {
    headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`
  }
  return headers
}

// =============================================================================
// AGENT RUNNER
// =============================================================================

export interface AgentRunOptions<TInput, TOutput> {
  agentType: AgentType
  input: TInput
  inputSchema: z.ZodType<TInput>
  outputSchema: z.ZodType<TOutput>
  temperature?: number
  maxRetries?: number
  evidenceId?: string
  ruleId?: string
}

export interface AgentRunResult<TOutput> {
  success: boolean
  output: TOutput | null
  error: string | null
  runId: string
  durationMs: number
  tokensUsed: number | null
}

/**
 * Run an agent with full validation and logging
 */
export async function runAgent<TInput, TOutput>(
  options: AgentRunOptions<TInput, TOutput>
): Promise<AgentRunResult<TOutput>> {
  const startTime = Date.now()
  const {
    agentType,
    input,
    inputSchema,
    outputSchema,
    temperature = 0.1,
    maxRetries = 3,
    evidenceId,
    ruleId,
  } = options

  // Validate input
  const inputValidation = inputSchema.safeParse(input)
  if (!inputValidation.success) {
    const errorMsg = `Invalid input: ${inputValidation.error.message}`
    const run = await db.agentRun.create({
      data: {
        agentType,
        status: "failed",
        input: input as object,
        error: errorMsg,
        durationMs: Date.now() - startTime,
        evidenceId,
        ruleId,
      },
    })
    return {
      success: false,
      output: null,
      error: errorMsg,
      runId: run.id,
      durationMs: Date.now() - startTime,
      tokensUsed: null,
    }
  }

  // Create run record
  const run = await db.agentRun.create({
    data: {
      agentType,
      status: "running",
      input: input as object,
      evidenceId,
      ruleId,
    },
  })

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get prompt template
      const systemPrompt = getAgentPrompt(agentType)

      // Build user message with input
      const userMessage = `INPUT:\n${JSON.stringify(input, null, 2)}\n\nPlease process this input and return the result in the specified JSON format.`

      // Call Ollama
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
        method: "POST",
        headers: getOllamaHeaders(),
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
          format: "json",
          options: {
            temperature,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.message?.content || "{}"

      // Parse JSON from response
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        throw new Error(`Failed to parse JSON response: ${content.slice(0, 200)}`)
      }

      // Validate output
      const outputValidation = outputSchema.safeParse(parsed)
      if (!outputValidation.success) {
        throw new Error(`Invalid output: ${outputValidation.error.message}`)
      }

      // Success - update run record
      const durationMs = Date.now() - startTime
      await db.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          output: outputValidation.data as object,
          durationMs,
          confidence: (outputValidation.data as { confidence?: number }).confidence,
          completedAt: new Date(),
        },
      })

      return {
        success: true,
        output: outputValidation.data,
        error: null,
        runId: run.id,
        durationMs,
        tokensUsed: data.eval_count || null,
      }
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // All retries failed
  const durationMs = Date.now() - startTime
  const errorMsg = `Agent failed after ${maxRetries} attempts: ${lastError?.message}`

  await db.agentRun.update({
    where: { id: run.id },
    data: {
      status: "failed",
      error: errorMsg,
      durationMs,
      completedAt: new Date(),
    },
  })

  return {
    success: false,
    output: null,
    error: errorMsg,
    runId: run.id,
    durationMs,
    tokensUsed: null,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/agents/runner.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/runner.ts
git commit -m "feat(regulatory-truth): add agent runner infrastructure"
```

---

## Task 21: Create Sentinel agent implementation

**Files:**

- Create: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/agents/sentinel.ts

import crypto from "crypto"
import { db } from "@/lib/db"
import {
  SentinelInputSchema,
  SentinelOutputSchema,
  type SentinelInput,
  type SentinelOutput,
} from "../schemas"
import { runAgent } from "./runner"

// =============================================================================
// FETCH HELPERS
// =============================================================================

async function fetchSourceContent(url: string): Promise<{
  content: string
  contentType: "html" | "pdf" | "xml"
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "FiskAI-Sentinel/1.0 (regulatory monitoring)",
      Accept: "text/html,application/xhtml+xml,application/xml,application/pdf",
      "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const contentTypeHeader = response.headers.get("content-type") || ""
  let contentType: "html" | "pdf" | "xml" = "html"

  if (contentTypeHeader.includes("pdf")) {
    contentType = "pdf"
  } else if (contentTypeHeader.includes("xml")) {
    contentType = "xml"
  }

  const text = await response.text()

  // Basic HTML cleanup
  const content = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()

  return { content, contentType }
}

function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

// =============================================================================
// SENTINEL AGENT
// =============================================================================

export interface SentinelResult {
  success: boolean
  output: SentinelOutput | null
  evidenceId: string | null
  hasChanged: boolean
  error: string | null
}

/**
 * Run the Sentinel agent to monitor a regulatory source
 */
export async function runSentinel(sourceId: string): Promise<SentinelResult> {
  // Get source from database
  const source = await db.regulatorySource.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    return {
      success: false,
      output: null,
      evidenceId: null,
      hasChanged: false,
      error: `Source not found: ${sourceId}`,
    }
  }

  try {
    // Fetch the source content
    const { content, contentType } = await fetchSourceContent(source.url)
    const contentHash = computeContentHash(content)
    const hasChanged = source.lastContentHash !== contentHash

    // Build input for agent
    const input: SentinelInput = {
      sourceUrl: source.url,
      previousHash: source.lastContentHash,
      sourceId: source.id,
    }

    // Run the agent to analyze changes
    const result = await runAgent<SentinelInput, SentinelOutput>({
      agentType: "SENTINEL",
      input,
      inputSchema: SentinelInputSchema,
      outputSchema: SentinelOutputSchema,
      temperature: 0.1,
    })

    if (!result.success || !result.output) {
      return {
        success: false,
        output: null,
        evidenceId: null,
        hasChanged: false,
        error: result.error,
      }
    }

    // Store evidence
    const evidence = await db.evidence.create({
      data: {
        sourceId: source.id,
        contentHash,
        rawContent: content,
        contentType,
        url: source.url,
        hasChanged,
        changeSummary: result.output.change_summary,
      },
    })

    // Update source last checked
    await db.regulatorySource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastContentHash: contentHash,
      },
    })

    return {
      success: true,
      output: result.output,
      evidenceId: evidence.id,
      hasChanged,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      output: null,
      evidenceId: null,
      hasChanged: false,
      error: `Sentinel error: ${error}`,
    }
  }
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/agents/sentinel.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(regulatory-truth): add Sentinel agent implementation"
```

---

## Task 22: Create Extractor agent implementation

**Files:**

- Create: `src/lib/regulatory-truth/agents/extractor.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/agents/extractor.ts

import { db } from "@/lib/db"
import {
  ExtractorInputSchema,
  ExtractorOutputSchema,
  type ExtractorInput,
  type ExtractorOutput,
} from "../schemas"
import { runAgent } from "./runner"

// =============================================================================
// EXTRACTOR AGENT
// =============================================================================

export interface ExtractorResult {
  success: boolean
  output: ExtractorOutput | null
  sourcePointerIds: string[]
  error: string | null
}

/**
 * Run the Extractor agent to extract data points from evidence
 */
export async function runExtractor(evidenceId: string): Promise<ExtractorResult> {
  // Get evidence from database
  const evidence = await db.evidence.findUnique({
    where: { id: evidenceId },
    include: { source: true },
  })

  if (!evidence) {
    return {
      success: false,
      output: null,
      sourcePointerIds: [],
      error: `Evidence not found: ${evidenceId}`,
    }
  }

  // Build input for agent
  const input: ExtractorInput = {
    evidenceId: evidence.id,
    content: evidence.rawContent,
    contentType: evidence.contentType as "html" | "pdf" | "xml",
    sourceUrl: evidence.url,
  }

  // Run the agent
  const result = await runAgent<ExtractorInput, ExtractorOutput>({
    agentType: "EXTRACTOR",
    input,
    inputSchema: ExtractorInputSchema,
    outputSchema: ExtractorOutputSchema,
    temperature: 0.1,
    evidenceId: evidence.id,
  })

  if (!result.success || !result.output) {
    return {
      success: false,
      output: null,
      sourcePointerIds: [],
      error: result.error,
    }
  }

  // Store source pointers
  const sourcePointerIds: string[] = []

  for (const extraction of result.output.extractions) {
    const pointer = await db.sourcePointer.create({
      data: {
        evidenceId: evidence.id,
        domain: extraction.domain,
        valueType: extraction.value_type,
        extractedValue: String(extraction.extracted_value),
        displayValue: extraction.display_value,
        exactQuote: extraction.exact_quote,
        contextBefore: extraction.context_before,
        contextAfter: extraction.context_after,
        selector: extraction.selector,
        confidence: extraction.confidence,
        extractionNotes: extraction.extraction_notes,
      },
    })
    sourcePointerIds.push(pointer.id)
  }

  return {
    success: true,
    output: result.output,
    sourcePointerIds,
    error: null,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/agents/extractor.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/extractor.ts
git commit -m "feat(regulatory-truth): add Extractor agent implementation"
```

---

## Task 23: Create agent index with exports

**Files:**

- Create: `src/lib/regulatory-truth/agents/index.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/agents/index.ts

export { runAgent, type AgentRunOptions, type AgentRunResult } from "./runner"
export { runSentinel, type SentinelResult } from "./sentinel"
export { runExtractor, type ExtractorResult } from "./extractor"
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/agents/index.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/index.ts
git commit -m "feat(regulatory-truth): add agent index exports"
```

---

## Task 24: Create module index

**Files:**

- Create: `src/lib/regulatory-truth/index.ts`

**Step 1: Create the file**

```typescript
// src/lib/regulatory-truth/index.ts
// Croatian Regulatory Truth Layer - Main Entry Point

// Schemas and types
export * from "./schemas"

// Prompt templates
export { getAgentPrompt } from "./prompts"

// Agent implementations
export {
  runAgent,
  runSentinel,
  runExtractor,
  type AgentRunOptions,
  type AgentRunResult,
  type SentinelResult,
  type ExtractorResult,
} from "./agents"
```

**Step 2: Verify it compiles**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/regulatory-truth/index.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/index.ts
git commit -m "feat(regulatory-truth): add module index"
```

---

## Task 25: Add test for Sentinel schema validation

**Files:**

- Create: `src/lib/regulatory-truth/__tests__/sentinel.test.ts`

**Step 1: Create the test file**

```typescript
// src/lib/regulatory-truth/__tests__/sentinel.test.ts

import { describe, it, expect } from "vitest"
import { SentinelOutputSchema, validateSentinelOutput, isSentinelOutputValid } from "../schemas"

describe("Sentinel Schema", () => {
  const validOutput = {
    source_url: "https://porezna.hr/pausalno",
    fetch_timestamp: "2024-12-21T10:00:00.000Z",
    content_hash: "a".repeat(64),
    has_changed: true,
    previous_hash: "b".repeat(64),
    extracted_content: "Some regulatory text about paušalni obrt...",
    content_type: "html",
    change_summary: "Updated threshold from €35,000 to €40,000",
    sections_changed: ["section-thresholds"],
    fetch_status: "success",
    error_message: null,
  }

  it("should validate correct sentinel output", () => {
    const result = SentinelOutputSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
  })

  it("should reject invalid content_hash length", () => {
    const invalid = { ...validOutput, content_hash: "tooshort" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid content_type", () => {
    const invalid = { ...validOutput, content_type: "docx" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid fetch_status", () => {
    const invalid = { ...validOutput, fetch_status: "pending" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should accept null previous_hash for first fetch", () => {
    const firstFetch = { ...validOutput, previous_hash: null, has_changed: false }
    const result = SentinelOutputSchema.safeParse(firstFetch)
    expect(result.success).toBe(true)
  })

  it("validateSentinelOutput should throw on invalid input", () => {
    expect(() => validateSentinelOutput({ invalid: true })).toThrow()
  })

  it("isSentinelOutputValid should return false for invalid input", () => {
    expect(isSentinelOutputValid({ invalid: true })).toBe(false)
  })

  it("isSentinelOutputValid should return true for valid input", () => {
    expect(isSentinelOutputValid(validOutput)).toBe(true)
  })
})
```

**Step 2: Run the test**

Run: `cd /home/admin/FiskAI && npx vitest run src/lib/regulatory-truth/__tests__/sentinel.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/__tests__/sentinel.test.ts
git commit -m "test(regulatory-truth): add Sentinel schema tests"
```

---

## Summary

Phase 1 creates the foundation for the Regulatory Truth Layer:

- **9 Prisma models** for storing regulatory data pipeline
- **7 Zod schema files** for validating agent I/O
- **Prompt templates** for all 6 agents
- **Agent runner** infrastructure with Ollama integration
- **Sentinel and Extractor** agent implementations
- **Test coverage** for schema validation

After completing these 25 tasks, the system is ready for:

- Phase 2: Bootstrap (source registry, evidence collection)
- Phase 3: Rule Engine (Composer, Reviewer implementations)
- Phase 4: Production (Releaser, Arbiter, monitoring)
