# Document C: Extraction Modes Definition

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: Mode 1 (classified/planned) and Mode 2 (candidate/novel) extraction with grounding requirements

---

## Overview

The FiskAI extraction system processes regulatory content to extract evidence-backed facts. The current implementation follows a single extraction pipeline without explicit "Mode 1" vs "Mode 2" terminology. However, the system implicitly handles both classified (known domains) and candidate (novel/unknown) content.

---

## Current Extraction Architecture

### Single Pipeline Model

**Location**: `src/lib/regulatory-truth/agents/extractor.ts`

```
Evidence
    ↓
Content Provider (getExtractableContent)
    ↓
Content Cleaner (cleanContent)
    ↓
LLM Extraction (ExtractorAgent)
    ↓
Validation Layer
    ├─→ Accepted → SourcePointer
    └─→ Rejected → ExtractionRejected (DLQ)
```

---

## Domain Classification (Mode 1 Equivalent)

### Configured Domains

**Location**: `src/lib/regulatory-truth/schemas/common.ts`

```typescript
export const DomainSchema = z.enum([
  "pausalni", // Flat-rate taxation
  "pdv", // VAT
  "porez_dohodak", // Income tax
  "doprinosi", // Social contributions
  "fiskalizacija", // Fiscal registers
  "rokovi", // Deadlines
  "obrasci", // Forms
  "exemptions", // Tax exemptions (UNKNOWN - not configured)
  "references", // Cross-references (UNKNOWN - not configured)
])
```

### Domain Validation

**Location**: `src/lib/regulatory-truth/utils/deterministic-validators.ts`

```typescript
export function isValidDomain(domain: string): boolean {
  return DomainSchema.safeParse(domain).success
}
```

**Behavior**:

- Known domain → proceeds to value validation
- Unknown domain → rejection with `INVALID_DOMAIN`

---

## Candidate Extraction (Mode 2 Equivalent)

### How Unknown Domains Are Handled

When the LLM attempts to extract facts for domains not in `DomainSchema`:

1. LLM outputs extraction with `domain: "references"` or `domain: "exemptions"`
2. Validation checks `isValidDomain(domain)` → fails
3. Extraction rejected with `rejectionType: "VALIDATION_FAILED"`
4. Stored in `ExtractionRejected` table for human review

**Evidence from Pipeline Trace Audit**:

```
Rejection ID: cmk2spud1001315waug10sarr
  Type: VALIDATION_FAILED
  Error: Unknown domain: references

Rejection ID: cmk2spugw001a15wafzsdo7bf
  Type: VALIDATION_FAILED
  Error: Unknown domain: exemptions
```

### Dead Letter Queue Analysis

**Purpose**: Identify candidate domains for promotion to Mode 1

**Query Pattern**:

```sql
SELECT rejectionType, COUNT(*)
FROM "ExtractionRejected"
WHERE rejectionType = 'VALIDATION_FAILED'
GROUP BY errorDetails
ORDER BY COUNT(*) DESC
```

---

## Grounding Requirements

### Grounding Invariants

Every accepted extraction must satisfy:

1. **Quote Existence**: `exactQuote` must exist in source content
2. **Value in Quote**: Extracted value must appear in the quote
3. **Domain Validity**: Domain must be in configured schema
4. **Value in Range**: Value must pass domain-specific bounds

### Validation Pipeline

**Location**: `src/lib/regulatory-truth/agents/extractor.ts:224-259`

```typescript
export async function validateExtraction(
  extraction: ExtractionItem,
  context: { originalContent: string; cleanedContent: string }
): ValidationResult {
  // 1. Domain validation
  if (!isValidDomain(extraction.domain)) {
    return { valid: false, error: `Unknown domain: ${extraction.domain}` }
  }

  // 2. Value type validation
  if (!isValidValueType(extraction.value_type)) {
    return { valid: false, error: `Invalid value type: ${extraction.value_type}` }
  }

  // 3. Range check
  const rangeCheck = validateValueInRange(extraction.extracted_value, extraction.domain)
  if (!rangeCheck.valid) {
    return { valid: false, error: rangeCheck.error }
  }

  // 4. Value in quote check (prevents inference)
  const quoteCheck = validateValueInQuote(extraction.extracted_value, extraction.exact_quote, {
    fuzzyThreshold: 0.85,
  })
  if (!quoteCheck.valid) {
    return { valid: false, error: quoteCheck.error }
  }

  // 5. Quote in content check
  const contentCheck = validateQuoteInContent(extraction.exact_quote, context.cleanedContent)
  if (!contentCheck.valid) {
    return { valid: false, error: contentCheck.error }
  }

  return { valid: true }
}
```

### Croatian-Aware Quote Matching

**Location**: `src/lib/regulatory-truth/utils/deterministic-validators.ts`

```typescript
export function validateValueInQuote(
  value: string | number,
  quote: string,
  options?: { fuzzyThreshold?: number }
): ValidationResult {
  // 1. Date matching: ISO → Croatian formats
  // "2025-01-07" matches "7. siječnja 2025" (with diacritic variations)
  // 2. Numeric matching: Normalize separators
  // "40.000" = "40000" (thousand separators)
  // "40,5" = "40.5" (decimal comma)
  // 3. Text matching: Three-stage fallback
  //    a) Exact match (case-insensitive)
  //    b) Normalized (č→c, š→s, ž→z, đ→d)
  //    c) Fuzzy (90%+ similarity for OCR errors)
}
```

---

## Inference Detection

### What Is Inference?

LLM inference occurs when the model calculates or derives a value not explicitly stated in the source text.

**Example of Rejected Inference**:

```
Rejection ID: cmk2spubg001215wa6en8ry3c
  Type: NO_QUOTE_MATCH
  Error: Value "8" not found in quote. Possible inference detected.
```

### Detection Mechanism

```typescript
// Validator ensures extracted value appears in exact quote
const found = normalizedQuote.includes(normalizedValue)
if (!found) {
  return {
    valid: false,
    error: `Value "${value}" not found in quote. Possible inference detected.`,
  }
}
```

---

## Domain-Specific Value Ranges

### Range Configuration

| Domain         | Value Type | Min    | Max           |
| -------------- | ---------- | ------ | ------------- |
| pdv            | percentage | 0      | 30            |
| doprinosi      | percentage | 0      | 50            |
| porez_dohodak  | percentage | 0      | 60            |
| pausalni       | currency   | 0      | 1,000,000 EUR |
| interest_rates | percentage | 0      | 20            |
| exchange_rates | rate       | 0.0001 | 10,000        |
| (default)      | currency   | 0      | 100B EUR      |
| (default)      | count      | 0      | 1B            |

### Range Validation

```typescript
export function validateValueInRange(value: string | number, domain: string): ValidationResult {
  const ranges = DOMAIN_RANGES[domain] || DEFAULT_RANGES

  // Check min/max bounds
  if (numericValue < ranges.min || numericValue > ranges.max) {
    return {
      valid: false,
      error: `Value ${value} out of range for ${domain}: [${ranges.min}, ${ranges.max}]`,
    }
  }
}
```

---

## Confidence Scoring

### Extraction Confidence

**Set by**: LLM during extraction
**Range**: 0.0 to 1.0
**Storage**: `SourcePointer.confidence`

### Derived Confidence (Issue #770)

**Location**: `src/lib/regulatory-truth/utils/derived-confidence.ts`

```typescript
export function computeDerivedConfidence(pointers: SourcePointer[], llmConfidence: number): number {
  // Rule confidence bounded by weakest evidence
  const avgPointerConfidence = average(pointers.map((p) => p.confidence))
  const minPointerConfidence = min(pointers.map((p) => p.confidence))

  // 90% average + 10% minimum
  const evidenceBasedConfidence = avgPointerConfidence * 0.9 + minPointerConfidence * 0.1

  // Final = minimum of LLM and evidence-based
  return Math.min(evidenceBasedConfidence, llmConfidence)
}
```

### Confidence Thresholds by Risk Tier

| Risk Tier | Min Confidence | Auto-Approve Threshold |
| --------- | -------------- | ---------------------- |
| T0        | 0.99           | Never                  |
| T1        | 0.95           | Never                  |
| T2        | 0.90           | 0.95                   |
| T3        | 0.85           | 0.90                   |

---

## Dead Letter Queue (ExtractionRejected)

### Rejection Types

| Type               | Description                    | Example                    |
| ------------------ | ------------------------------ | -------------------------- |
| INVALID_DOMAIN     | Domain not in DomainSchema     | "references", "exemptions" |
| OUT_OF_RANGE       | Value exceeds domain bounds    | PDV rate of 150%           |
| INVALID_CURRENCY   | Unrealistic currency value     | 999 trillion EUR           |
| INVALID_DATE       | Malformed or impossible date   | "2030-13-45"               |
| NO_QUOTE_MATCH     | Value not in quote (inference) | LLM calculated "8"         |
| INVALID_PERCENTAGE | Percentage > 100               | 250% contribution rate     |
| VALIDATION_FAILED  | Generic validation error       | Schema mismatch            |

### DLQ Analysis for Mode 2 Candidates

**Purpose**: Identify patterns in rejections to expand domain coverage

**Query**:

```sql
SELECT
  errorDetails,
  COUNT(*) as count,
  array_agg(DISTINCT evidenceId) as evidence_ids
FROM "ExtractionRejected"
WHERE rejectionType = 'VALIDATION_FAILED'
  AND errorDetails LIKE 'Unknown domain:%'
GROUP BY errorDetails
ORDER BY count DESC
```

**Outcome**: High-frequency unknown domains become candidates for Mode 1 promotion

---

## Mode 1 vs Mode 2 Comparison

| Aspect         | Mode 1 (Classified)      | Mode 2 (Candidate)        |
| -------------- | ------------------------ | ------------------------- |
| Domain         | In DomainSchema          | Unknown domain            |
| Validation     | Full validation pipeline | Fails at domain check     |
| Storage        | SourcePointer            | ExtractionRejected        |
| Grounding      | Required                 | Preserved in DLQ          |
| Human Review   | Optional (T2/T3)         | Required                  |
| Promotion Path | N/A                      | DLQ analysis → add domain |

---

## Promotion Workflow (Mode 2 → Mode 1)

### Current Process (Manual)

1. **Identify Candidate**: Query DLQ for frequent unknown domains
2. **Analyze Extractions**: Review raw LLM outputs in `ExtractionRejected.rawOutput`
3. **Define Domain**: Add to `DomainSchema` with appropriate value ranges
4. **Re-process**: Re-run extractor on affected evidence IDs
5. **Validate**: Verify new extractions pass validation

### Domain Addition

**File**: `src/lib/regulatory-truth/schemas/common.ts`

```typescript
// Before
export const DomainSchema = z.enum([
  "pausalni",
  "pdv",
  "porez_dohodak",
  "doprinosi",
  "fiskalizacija",
  "rokovi",
  "obrasci",
])

// After (adding "references" and "exemptions")
export const DomainSchema = z.enum([
  "pausalni",
  "pdv",
  "porez_dohodak",
  "doprinosi",
  "fiskalizacija",
  "rokovi",
  "obrasci",
  "references", // NEW: Cross-references
  "exemptions", // NEW: Tax exemptions
])
```

### Range Configuration

**File**: `src/lib/regulatory-truth/utils/deterministic-validators.ts`

```typescript
const DOMAIN_RANGES: Record<string, DomainRanges> = {
  // ... existing domains ...
  references: {
    // No numeric validation needed - text type
  },
  exemptions: {
    // No numeric validation needed - conditional type
  },
}
```

---

## Evidence from Audit

**Source**: `docs/audits/PIPELINE_SINGLE_TRACE_2026-01-06.md`

### Extraction Summary

| Metric                       | Value               |
| ---------------------------- | ------------------- |
| Total Extractions Attempted  | 10                  |
| Accepted (Mode 1)            | 1                   |
| Rejected (Mode 2 candidates) | 9                   |
| Grounding Rate               | 100% (1/1 accepted) |

### Rejection Breakdown

| Domain      | Count | Status             |
| ----------- | ----- | ------------------ |
| references  | 7     | Mode 2 candidate   |
| exemptions  | 1     | Mode 2 candidate   |
| (inference) | 1     | Correctly rejected |

---

## UNKNOWN Items

The following aspects are **UNKNOWN** in current implementation:

1. **Explicit Mode Flag**: No `extractionMode` field exists on SourcePointer or Evidence
2. **Automatic Promotion**: No automated workflow to promote Mode 2 → Mode 1
3. **Candidate Confidence**: Rejected extractions do not have confidence tracked
4. **Domain Versioning**: No version tracking when domains are added/modified
5. **Re-extraction Trigger**: No automated trigger to re-process after domain addition

---

## References

- Extractor Agent: `src/lib/regulatory-truth/agents/extractor.ts`
- Validators: `src/lib/regulatory-truth/utils/deterministic-validators.ts`
- Domain Schema: `src/lib/regulatory-truth/schemas/common.ts`
- Pipeline Audit: `docs/audits/PIPELINE_SINGLE_TRACE_2026-01-06.md`
