# Document F: Knowledge Graph Role

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: Nodes, edges, relationships, temporal validity, conflict resolution

---

## Overview

FiskAI implements a **Knowledge Graph** structure using PostgreSQL with the following core entities:

- **RegulatoryRule** - The primary node representing regulatory facts
- **Concept** - Taxonomy hierarchy for organizing rules
- **GraphEdge** - Explicit relationships between rules
- **SourcePointer** - Evidence attribution (provenance)
- **RegulatoryConflict** - Conflict tracking and resolution

---

## Node Types

### 1. RegulatoryRule (Primary Node)

**Location**: `prisma/schema.prisma` (lines 3849-3903)

| Field             | Type                  | Purpose                                                                 |
| ----------------- | --------------------- | ----------------------------------------------------------------------- |
| id                | String (cuid)         | Unique identifier                                                       |
| conceptSlug       | String                | Machine-readable concept reference (e.g., "pausalni-revenue-threshold") |
| conceptId         | String?               | FK to Concept model                                                     |
| titleHr           | String                | Human-readable title (Croatian)                                         |
| titleEn           | String?               | English translation                                                     |
| riskTier          | RiskTier enum         | T0/T1/T2/T3 criticality level                                           |
| authorityLevel    | AuthorityLevel enum   | LAW, GUIDANCE, PROCEDURE, PRACTICE                                      |
| automationPolicy  | AutomationPolicy enum | ALLOW, CONFIRM, BLOCK                                                   |
| ruleStability     | RuleStability enum    | STABLE, VOLATILE                                                        |
| appliesWhen       | String (Text)         | AppliesWhen DSL expression (JSON)                                       |
| value             | String                | Regulatory value (stored as string)                                     |
| valueType         | String                | percentage, currency_hrk, currency_eur, count, date, text               |
| obligationType    | ObligationType enum   | OBLIGATION, NO_OBLIGATION, CONDITIONAL, INFORMATIONAL                   |
| outcome           | Json?                 | Structured outcome: {VALUE, OBLIGATION, PROCEDURE}                      |
| explanationHr     | String? (Text)        | Detailed explanation (Croatian)                                         |
| explanationEn     | String? (Text)        | English explanation                                                     |
| effectiveFrom     | DateTime              | Start date of rule validity                                             |
| effectiveUntil    | DateTime?             | End date (null = ongoing)                                               |
| supersedesId      | String?               | FK to previous RegulatoryRule                                           |
| status            | RuleStatus enum       | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, DEPRECATED, REJECTED        |
| confidence        | Float                 | DEPRECATED - Use derivedConfidence                                      |
| llmConfidence     | Float                 | LLM's self-assessed confidence                                          |
| derivedConfidence | Float                 | Confidence derived from SourcePointer quality                           |
| meaningSignature  | String?               | SHA256 hash for deduplication                                           |
| createdAt         | DateTime              | Creation timestamp                                                      |
| updatedAt         | DateTime              | Last modification                                                       |

**Unique Constraint**:

```prisma
@@unique([conceptSlug, effectiveFrom, status])
```

### 2. Concept (Taxonomy Node)

**Location**: `prisma/schema.prisma` (lines 3816-3834)

| Field       | Type           | Purpose                                       |
| ----------- | -------------- | --------------------------------------------- |
| id          | String (cuid)  | Unique identifier                             |
| slug        | String @unique | kebab-case identifier (e.g., "pausalni-obrt") |
| nameHr      | String         | Croatian name                                 |
| nameEn      | String?        | English name                                  |
| aliases     | String[]       | Alternative names/synonyms                    |
| tags        | String[]       | Cross-pillar categorization                   |
| description | String? (Text) | Concept definition                            |
| parentId    | String?        | FK to parent Concept (hierarchical)           |

**Self-Referential Hierarchy**:

```prisma
parent   Concept?  @relation("ConceptHierarchy", fields: [parentId], references: [id])
children Concept[] @relation("ConceptHierarchy")
```

### 3. SourcePointer (Attribution Node)

**Location**: `prisma/schema.prisma` (lines 3769-3814)

| Field           | Type                   | Purpose                                            |
| --------------- | ---------------------- | -------------------------------------------------- |
| id              | String (cuid)          | Unique identifier                                  |
| evidenceId      | String                 | Soft reference to Evidence (regulatory schema)     |
| domain          | String                 | e.g., "pausalni", "pdv", "doprinosi"               |
| valueType       | String                 | currency, percentage, date, threshold, text        |
| extractedValue  | String                 | Parsed value from source                           |
| displayValue    | String                 | Human-readable formatted value                     |
| exactQuote      | String (Text)          | Verbatim text from source                          |
| contextBefore   | String? (Text)         | Previous sentence/paragraph                        |
| contextAfter    | String? (Text)         | Following sentence/paragraph                       |
| selector        | String?                | CSS selector or XPath                              |
| articleNumber   | String?                | e.g., "38", "12a"                                  |
| paragraphNumber | String?                | e.g., "1", "2"                                     |
| lawReference    | String?                | e.g., "Zakon o PDV-u (NN 73/13)"                   |
| confidence      | Float                  | Extraction confidence (0.0-1.0)                    |
| startOffset     | Int?                   | UTF-16 index into Evidence.rawContent              |
| endOffset       | Int?                   | UTF-16 end index                                   |
| matchType       | SourcePointerMatchType | EXACT, NORMALIZED, NOT_FOUND, PENDING_VERIFICATION |

---

## Edge Types

### 1. GraphEdge (Explicit Rule Relationships)

**Location**: `prisma/schema.prisma` (lines 4238-4254)

| Field      | Type          | Purpose                            |
| ---------- | ------------- | ---------------------------------- |
| id         | String (cuid) | Unique identifier                  |
| fromRuleId | String        | FK to source RegulatoryRule        |
| toRuleId   | String        | FK to target RegulatoryRule        |
| relation   | GraphEdgeType | Type of relationship               |
| validFrom  | DateTime      | Edge validity start                |
| validTo    | DateTime?     | Edge validity end (null = ongoing) |
| notes      | String?       | Additional context                 |
| createdAt  | DateTime      | Creation timestamp                 |

**GraphEdgeType Enum**:

```typescript
enum GraphEdgeType {
  AMENDS              // Rule A amends Rule B
  INTERPRETS          // Rule A interprets Rule B
  REQUIRES            // Rule A requires Rule B (prerequisite)
  EXEMPTS             // Rule A exempts from Rule B
  DEPENDS_ON          // Rule A depends on Rule B
  SUPERSEDES          // Rule A supersedes Rule B
  OVERRIDES           // Lex specialis - Rule A overrides Rule B
}
```

**Unique Constraint**:

```prisma
@@unique([fromRuleId, toRuleId, relation])
```

### 2. RuleSourcePointers (Many-to-Many)

**Implicit join table** connecting:

- `RegulatoryRule` ← `@relation("RuleSourcePointers")` → `SourcePointer[]`
- `SourcePointer` ← `@relation("RuleSourcePointers")` → `RegulatoryRule[]`

### 3. Supersession Chain (Self-Reference)

```prisma
supersedesId  String?
supersedes    RegulatoryRule?    @relation("RuleSupersession", fields: [supersedesId], references: [id])
supersededBy  RegulatoryRule[]   @relation("RuleSupersession")
```

---

## Temporal Validity

### Rule Effective Period

```prisma
effectiveFrom     DateTime       // Start of rule validity (INCLUSIVE)
effectiveUntil    DateTime?      // End of rule validity (EXCLUSIVE, null = ongoing)
```

**Temporal Query Pattern**:

```sql
SELECT * FROM "RegulatoryRule"
WHERE "effectiveFrom" <= :asOfDate
  AND ("effectiveUntil" IS NULL OR "effectiveUntil" > :asOfDate)
  AND "status" = 'PUBLISHED'
```

### Edge Temporal Validity

GraphEdges also have temporal bounds:

```prisma
validFrom  DateTime   // When relationship becomes active
validTo    DateTime?  // When relationship ends (null = ongoing)
```

### Supersession Timeline

```
Rule A (effectiveFrom: 2024-01-01, effectiveUntil: 2025-01-01)
    ↓ supersedesId
Rule B (effectiveFrom: 2025-01-01, effectiveUntil: null)
    └→ Rule B supersedes Rule A
```

---

## Conflict Tracking

### RegulatoryConflict Model

**Location**: `prisma/schema.prisma` (lines 4300-4322)

| Field               | Type                | Purpose                                                                           |
| ------------------- | ------------------- | --------------------------------------------------------------------------------- |
| id                  | String (cuid)       | Unique identifier                                                                 |
| conflictType        | ConflictType enum   | Type of conflict                                                                  |
| status              | ConflictStatus enum | OPEN, RESOLVED, ESCALATED                                                         |
| itemAId             | String?             | FK to first RegulatoryRule                                                        |
| itemBId             | String?             | FK to second RegulatoryRule                                                       |
| description         | String (Text)       | Human-readable conflict description                                               |
| metadata            | Json?               | { sourcePointerIds, strategy, sourceComparison, temporalAnalysis, aiArbitration } |
| resolution          | Json?               | { winningItemId, strategy, rationaleHr, rationaleEn }                             |
| confidence          | Float?              | Arbiter's confidence in resolution                                                |
| requiresHumanReview | Boolean             | true if Arbiter cannot resolve                                                    |
| humanReviewReason   | String?             | Why human review was needed                                                       |
| resolvedBy          | String?             | User ID or SYSTEM/ARBITER                                                         |
| resolvedAt          | DateTime?           | Resolution timestamp                                                              |
| createdAt           | DateTime            | Creation timestamp                                                                |

### ConflictType Enum

```typescript
enum ConflictType {
  SOURCE_CONFLICT          // Multiple sources have contradictory values
  TEMPORAL_CONFLICT        // Rules' effective dates overlap but values differ
  SCOPE_CONFLICT           // Rules' applicability conditions overlap with different outcomes
  INTERPRETATION_CONFLICT  // Same rule interpreted differently (authority divergence)
}
```

### ConflictStatus Enum

```typescript
enum ConflictStatus {
  OPEN       // Detected, awaiting resolution
  RESOLVED   // Resolved automatically or by human
  ESCALATED  // Escalated to Arbiter, then human
}
```

---

## Conflict Resolution

### Resolution Strategies

**Location**: `src/lib/regulatory-truth/agents/arbiter.ts`

#### 1. Authority Hierarchy

```typescript
enum AuthorityLevel {
  LAW         // Legally binding (score: 1) - Highest
  GUIDANCE    // Interpretation (score: 2)
  PROCEDURE   // Technical execution (score: 3)
  PRACTICE    // What passes inspections (score: 4) - Lowest
}
```

When rules conflict, higher authority prevails.

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

```prisma
resolution: {
  winningItemId: String      // ID of prevailing rule
  strategy: String           // "hierarchy", "temporal", "source_authority"
  rationaleHr: String        // Croatian explanation
  rationaleEn: String        // English explanation
}
```

---

## Graph Traversal Patterns

### Find All Rules for Concept

```sql
SELECT r.*
FROM "RegulatoryRule" r
WHERE r."conceptSlug" = :slug
  AND r."status" = 'PUBLISHED'
  AND r."effectiveFrom" <= :asOfDate
  AND (r."effectiveUntil" IS NULL OR r."effectiveUntil" > :asOfDate)
ORDER BY r."authorityLevel" ASC, r."effectiveFrom" DESC
```

### Find Supersession Chain

```typescript
async function findSupersessionChain(ruleId: string): Promise<RegulatoryRule[]> {
  const chain: RegulatoryRule[] = []
  let current = await db.regulatoryRule.findUnique({ where: { id: ruleId } })

  while (current) {
    chain.push(current)
    if (current.supersedesId) {
      current = await db.regulatoryRule.findUnique({ where: { id: current.supersedesId } })
    } else {
      current = null
    }
  }

  return chain.reverse() // Oldest first
}
```

### Find Related Rules via GraphEdge

```sql
SELECT r.*, ge."relation"
FROM "GraphEdge" ge
INNER JOIN "RegulatoryRule" r ON r."id" = ge."toRuleId"
WHERE ge."fromRuleId" = :ruleId
  AND (ge."validTo" IS NULL OR ge."validTo" > :asOfDate)
  AND r."status" = 'PUBLISHED'
```

### Find Concept Hierarchy Path

```typescript
async function findConceptPath(conceptId: string): Promise<Concept[]> {
  const path: Concept[] = []
  let current = await db.concept.findUnique({ where: { id: conceptId } })

  while (current) {
    path.push(current)
    if (current.parentId) {
      current = await db.concept.findUnique({ where: { id: current.parentId } })
    } else {
      current = null
    }
  }

  return path.reverse() // Root first
}
```

---

## Relationship Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONCEPT HIERARCHY                         │
│                                                                  │
│   pausalni (Pillar Root)                                        │
│   ├── pausalni-revenue-threshold                                │
│   │       └── [RegulatoryRule: 40,000 EUR limit]                │
│   ├── pausalni-tax-rate                                         │
│   │       └── [RegulatoryRule: 10% rate]                        │
│   └── pausalni-contributions                                     │
│           └── pausalni-contribution-base                         │
│                   └── [RegulatoryRule: Base calculation]         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      RULE RELATIONSHIPS                          │
│                                                                  │
│   [Rule A: VAT Rate 25%]                                        │
│           │                                                      │
│           ├── AMENDS ──────→ [Rule B: VAT Reduced 13%]          │
│           │                                                      │
│           ├── REQUIRES ────→ [Rule C: VAT Registration]          │
│           │                                                      │
│           └── SUPERSEDES ──→ [Rule D: Old VAT Rate 23%]         │
│                   │                                              │
│                   └── status: DEPRECATED                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     EVIDENCE ATTRIBUTION                         │
│                                                                  │
│   [RegulatoryRule: pausalni-threshold]                          │
│           │                                                      │
│           ├── SourcePointer #1                                   │
│           │       ├── evidenceId: "abc123"                       │
│           │       ├── exactQuote: "Prag prihoda za..."          │
│           │       └── lawReference: "Zakon o PDV-u (NN 73/13)"   │
│           │                                                      │
│           └── SourcePointer #2                                   │
│                   ├── evidenceId: "def456"                       │
│                   ├── exactQuote: "Paušalisti ne smiju..."      │
│                   └── lawReference: "Pravilnik (NN 1/20)"        │
└─────────────────────────────────────────────────────────────────┘
```

---

## UNKNOWN Items

1. **Cycle Detection**: No explicit cycle detection in GraphEdge relationships
2. **Transitive Closure**: No pre-computed transitive relationship cache
3. **Version History**: No full version history for rules (only supersession chain)
4. **Edge Weights**: No weight/strength field on GraphEdge relationships
5. **Bidirectional Edges**: GraphEdges are unidirectional; inverse queries require separate lookups
6. **Graph Visualization**: No built-in graph visualization tooling

---

## References

- RegulatoryRule Model: `prisma/schema.prisma:3849-3903`
- Concept Model: `prisma/schema.prisma:3816-3834`
- GraphEdge Model: `prisma/schema.prisma:4238-4254`
- SourcePointer Model: `prisma/schema.prisma:3769-3814`
- RegulatoryConflict Model: `prisma/schema.prisma:4300-4322`
- Arbiter Agent: `src/lib/regulatory-truth/agents/arbiter.ts`
- Composer Agent: `src/lib/regulatory-truth/agents/composer.ts`
