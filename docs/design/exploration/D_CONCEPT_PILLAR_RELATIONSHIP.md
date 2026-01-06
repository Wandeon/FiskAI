# Document D: Concept ↔ Pillar Relationship

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: Mapping facts to concepts and the 8 content pillars

---

## Overview

FiskAI organizes regulatory content through a hierarchical taxonomy of **Concepts** that map to broader **Content Pillars**. This document explores how extracted facts (SourcePointers) connect to Concepts and ultimately to the 8 content pillars.

---

## Concept Model

### Schema Definition

**Location**: `prisma/schema.prisma`

```prisma
model Concept {
  id          String   @id @default(cuid())
  slug        String   @unique           // kebab-case identifier
  nameHr      String                     // Croatian name
  nameEn      String?                    // English name
  aliases     String[]                   // Alternative names
  tags        String[]                   // Categorization tags
  description String?  @db.Text          // Concept definition
  parentId    String?                    // Self-referential hierarchy

  parent      Concept?          @relation("ConceptHierarchy", ...)
  children    Concept[]         @relation("ConceptHierarchy")
  rules       RegulatoryRule[]
  embedding   ConceptEmbedding?
}
```

### Concept Hierarchy

Concepts form a tree structure via `parentId`:

```
Root Concept (pillar level)
└── Domain Concept
    └── Specific Concept
        └── Sub-concept
```

---

## Extraction Domain → Concept Mapping

### Current Domains

From `src/lib/regulatory-truth/schemas/common.ts`:

| Domain        | Description          | Example Concepts                                  |
| ------------- | -------------------- | ------------------------------------------------- |
| pausalni      | Flat-rate taxation   | pausalni-revenue-threshold, pausalni-tax-rate     |
| pdv           | VAT                  | pdv-standard-rate, pdv-reduced-rate               |
| porez_dohodak | Income tax           | income-tax-rate, income-tax-bracket               |
| doprinosi     | Social contributions | health-contribution, pension-contribution         |
| fiskalizacija | Fiscal registers     | fiscal-device-requirement, fiscal-receipt-content |
| rokovi        | Deadlines            | filing-deadline, payment-deadline                 |
| obrasci       | Forms                | form-pdv-k, form-joppd                            |

### Concept Slug Convention

Format: `{domain}-{specific-identifier}`

Examples:

- `pausalni-revenue-threshold` → Flat-rate revenue threshold
- `pdv-standard-rate` → Standard VAT rate
- `doprinosi-health-rate` → Health contribution rate

---

## Content Pillars (8 Pillars)

Based on the FiskAI Product Bible and architecture documentation:

### Pillar 1: Pausalni Obrt (Flat-Rate Business)

**Root Concept**: `pausalni`

**Child Concepts**:

- `pausalni-revenue-threshold` - Revenue limit for flat-rate eligibility
- `pausalni-tax-rate` - Fixed tax rate
- `pausalni-contribution-base` - Base for social contributions
- `pausalni-exemptions` - Exemption conditions

**Mapped Domains**: pausalni, doprinosi (when pausalni-specific)

---

### Pillar 2: PDV (Value Added Tax)

**Root Concept**: `pdv`

**Child Concepts**:

- `pdv-standard-rate` - Standard VAT rate (25%)
- `pdv-reduced-rate-13` - Reduced rate (13%)
- `pdv-reduced-rate-5` - Super-reduced rate (5%)
- `pdv-zero-rate` - Zero rate (0%)
- `pdv-registration-threshold` - VAT registration threshold
- `pdv-filing-deadline` - Monthly/quarterly filing

**Mapped Domains**: pdv, rokovi (when PDV-related)

---

### Pillar 3: Doprinosi (Social Contributions)

**Root Concept**: `doprinosi`

**Child Concepts**:

- `doprinosi-health` - Health insurance contribution
- `doprinosi-pension-1` - First pillar pension
- `doprinosi-pension-2` - Second pillar pension
- `doprinosi-unemployment` - Unemployment insurance
- `doprinosi-base` - Contribution base amounts

**Mapped Domains**: doprinosi

---

### Pillar 4: Porez na Dohodak (Income Tax)

**Root Concept**: `porez-dohodak`

**Child Concepts**:

- `porez-dohodak-rate-lower` - Lower bracket rate
- `porez-dohodak-rate-higher` - Higher bracket rate
- `porez-dohodak-bracket-threshold` - Bracket cutoff amount
- `porez-dohodak-personal-allowance` - Personal deduction
- `porez-dohodak-surtax` - Prirez (local surtax)

**Mapped Domains**: porez_dohodak

---

### Pillar 5: Fiskalizacija (Fiscal Registers)

**Root Concept**: `fiskalizacija`

**Child Concepts**:

- `fiskalizacija-device-requirements` - Technical specifications
- `fiskalizacija-receipt-content` - Required receipt fields
- `fiskalizacija-zki-calculation` - Protective code calculation
- `fiskalizacija-jir-format` - Unique identification number

**Mapped Domains**: fiskalizacija

---

### Pillar 6: Rokovi (Deadlines)

**Root Concept**: `rokovi`

**Child Concepts**:

- `rokovi-pdv-filing` - VAT filing deadlines
- `rokovi-joppd-filing` - JOPPD submission
- `rokovi-annual-return` - Annual tax return
- `rokovi-payment` - Tax payment deadlines
- `rokovi-retention` - Document retention periods

**Mapped Domains**: rokovi

---

### Pillar 7: Obrasci (Forms)

**Root Concept**: `obrasci`

**Child Concepts**:

- `obrazac-pdv-k` - VAT return form
- `obrazac-joppd` - Payroll form
- `obrazac-doh` - Income tax return
- `obrazac-pos` - POS fiscal form
- `obrazac-gfi-pod` - Annual financial statement

**Mapped Domains**: obrasci

---

### Pillar 8: E-Računi (E-Invoicing)

**Root Concept**: `e-racuni`

**Child Concepts**:

- `e-racuni-format` - Invoice XML format (UBL 2.1)
- `e-racuni-routing` - ePoslovanje routing
- `e-racuni-b2g` - Government invoicing requirements
- `e-racuni-b2b` - Business-to-business requirements

**Mapped Domains**: fiskalizacija, obrasci (when e-invoice related)

---

## Fact → Concept → Pillar Chain

### Data Flow

```
SourcePointer (extracted fact)
    │
    │ domain: "pausalni"
    │ valueType: "threshold"
    │ extractedValue: "40000"
    │
    ▼
RegulatoryRule
    │
    │ conceptSlug: "pausalni-revenue-threshold"
    │
    ▼
Concept
    │
    │ slug: "pausalni-revenue-threshold"
    │ parentId: → "pausalni"
    │
    ▼
Root Concept (Pillar)
    │
    │ slug: "pausalni"
    │ nameHr: "Paušalni Obrt"
    │ parentId: null (root)
    │
    ▼
Content Pillar: Pausalni Obrt
```

### Query: Find Pillar for SourcePointer

```typescript
async function findPillarForPointer(pointerId: string): Promise<string | null> {
  const pointer = await db.sourcePointer.findUnique({
    where: { id: pointerId },
    include: {
      rules: {
        include: {
          concept: true,
        },
      },
    },
  })

  if (!pointer?.rules.length) return null

  const concept = pointer.rules[0].concept
  if (!concept) return pointer.rules[0].conceptSlug.split("-")[0]

  // Traverse to root
  let current = concept
  while (current.parentId) {
    current = await db.concept.findUnique({ where: { id: current.parentId } })
  }

  return current.slug // Pillar slug
}
```

---

## Concept Embedding for Semantic Search

### ConceptEmbedding Model

```prisma
model ConceptEmbedding {
  id            String  @id @default(cuid())
  conceptId     String  @unique
  embedding     vector(768)
  embeddingText String  @db.Text  // nameHr + aliases
}
```

### Embedding Generation

**Location**: `src/lib/assistant/scripts/generate-concept-embeddings.ts`

```typescript
async function generateConceptEmbeddings() {
  const concepts = await db.concept.findMany({
    select: { id: true, slug: true, nameHr: true, aliases: true },
  })

  for (const batch of chunk(concepts, 50)) {
    const texts = batch.map((c) => [c.nameHr, ...c.aliases].join(" "))

    const embeddings = await embedBatch(texts)

    for (let i = 0; i < batch.length; i++) {
      await db.conceptEmbedding.upsert({
        where: { conceptId: batch[i].id },
        create: {
          conceptId: batch[i].id,
          embeddingText: texts[i],
          embedding: embeddings[i],
        },
        update: {
          embeddingText: texts[i],
          embedding: embeddings[i],
        },
      })
    }
  }
}
```

### Semantic Concept Matching

**Location**: `src/lib/assistant/query-engine/semantic-search.ts`

```sql
SELECT
  c.id as "conceptId",
  c.slug,
  c."nameHr",
  1 - (ce.embedding <=> ${queryVector}::vector) as similarity
FROM "Concept" c
INNER JOIN "ConceptEmbedding" ce ON ce."conceptId" = c.id
WHERE ce.embedding IS NOT NULL
ORDER BY ce.embedding <=> ${queryVector}::vector
LIMIT 10
```

---

## Pillar Assignment in Rules

### RegulatoryRule → Concept Link

```prisma
model RegulatoryRule {
  conceptSlug String        // Always set
  conceptId   String?       // FK when formal Concept exists

  concept     Concept?      @relation(...)
}
```

### Assignment Logic

**In Composer Agent** (`agents/composer.ts`):

```typescript
// 1. Determine concept slug from domain + value type
const conceptSlug = deriveConceptSlug(pointer.domain, pointer.valueType, pointer.extractedValue)

// 2. Find or create formal Concept
let concept = await db.concept.findFirst({
  where: { slug: conceptSlug },
})

// 3. Create rule with concept link
const rule = await db.regulatoryRule.create({
  data: {
    conceptSlug,
    conceptId: concept?.id,
    // ... other fields
  },
})
```

### Concept Slug Derivation

```typescript
function deriveConceptSlug(domain: string, valueType: string, value: string): string {
  // Pattern: {domain}-{specific-identifier}

  switch (domain) {
    case "pausalni":
      if (valueType === "threshold") return "pausalni-revenue-threshold"
      if (valueType === "percentage") return "pausalni-tax-rate"
      break

    case "pdv":
      if (value === "25") return "pdv-standard-rate"
      if (value === "13") return "pdv-reduced-rate-13"
      if (value === "5") return "pdv-reduced-rate-5"
      break

    case "rokovi":
      // Requires additional context
      return `rokovi-${normalizeToSlug(extractionNotes)}`

    // ... other domains
  }

  return `${domain}-${valueType}`
}
```

---

## Tags for Cross-Pillar Classification

### Tag Usage

Concepts can have multiple tags for cross-pillar relationships:

```prisma
model Concept {
  tags String[]  // e.g., ["pausalni", "doprinosi", "self-employed"]
}
```

### Example Cross-Pillar Concept

**Concept**: `pausalni-contribution-base`

```json
{
  "slug": "pausalni-contribution-base",
  "nameHr": "Osnovica doprinosa za paušaliste",
  "parentId": "pausalni-contributions",
  "tags": ["pausalni", "doprinosi", "self-employed"]
}
```

This concept belongs to **Pillar 1 (Pausalni)** hierarchy but is tagged for **Pillar 3 (Doprinosi)** discovery.

---

## UNKNOWN Items

The following aspects are **UNKNOWN** in current implementation:

1. **Pillar Table**: No explicit `Pillar` model exists; pillars are implicit root concepts
2. **Pillar Assignment**: No `pillarId` field on rules or concepts
3. **Cross-Pillar Rules**: Rules can only have one `conceptSlug`, limiting multi-pillar placement
4. **Concept Versioning**: No version tracking when concepts are modified
5. **Alias Normalization**: No automated synonym expansion during query
6. **Tag-Based Search**: Tags exist but are not indexed for efficient filtering
7. **Pillar Statistics**: No aggregation of rule counts per pillar

---

## Concept Graph Visualization

```
pausalni (Pillar 1)
├── pausalni-revenue-threshold
│   └── Rules: 3 PUBLISHED
├── pausalni-tax-rate
│   └── Rules: 2 PUBLISHED
└── pausalni-contributions
    └── pausalni-contribution-base
        └── Rules: 1 DRAFT

pdv (Pillar 2)
├── pdv-standard-rate
│   └── Rules: 1 PUBLISHED
├── pdv-reduced-rate-13
│   └── Rules: 1 PUBLISHED
└── pdv-reduced-rate-5
    └── Rules: 0

doprinosi (Pillar 3)
├── doprinosi-health
│   └── Rules: 2 PUBLISHED
├── doprinosi-pension-1
│   └── Rules: 1 PUBLISHED
└── doprinosi-pension-2
    └── Rules: 1 DRAFT
```

---

## References

- Concept Model: `prisma/schema.prisma`
- Composer Agent: `src/lib/regulatory-truth/agents/composer.ts`
- Concept Embeddings: `src/lib/assistant/scripts/generate-concept-embeddings.ts`
- Semantic Search: `src/lib/assistant/query-engine/semantic-search.ts`
- Product Bible: `docs/product-bible/00-INDEX.md`
