# Trust Guarantees

> Canonical document - reviewed 2024-12-24

## Overview

FiskAI's Regulatory Truth Layer provides legally defensible regulatory information through strict trust guarantees. These are non-negotiable system invariants.

## Core Guarantees

### 1. Evidence-Backed Claims

**Guarantee:** Every regulatory claim links to source evidence.

**Implementation:**

- `RuleSourcePointer` links rules to `Evidence` records
- `Evidence.rawContent` contains immutable source material
- `EvidenceArtifact` stores derived text (OCR, parsed)
- Citations include source URL, fetch timestamp, content hash

**Verification:**

- No rule can be published without at least one source pointer
- Orphaned rules trigger arbiter review

### 2. No Hallucination

**Guarantee:** LLM-extracted content is verified against source.

**Implementation:**

- Extractor compares output against evidence text
- Confidence scores below threshold trigger re-extraction
- Vision fallback for low-confidence OCR
- Human review queue for ambiguous content

**Verification:**

- Extraction includes confidence metadata
- Failed confidence checks → NEEDS_REVIEW status

### 3. Fail-Closed Operation

**Guarantee:** System fails safely when uncertain.

**Implementation:**

- Unresolvable conflicts → human arbiter queue
- Missing evidence → extraction blocked
- Low confidence OCR → vision fallback → human review
- Parser errors → retry with backoff → manual escalation

**Verification:**

- `needsManualReview` flag on rules
- Arbiter queue for conflict resolution
- Error logging with full context

### 4. Immutable Evidence

**Guarantee:** Source evidence cannot be modified after capture.

**Implementation:**

- `Evidence.rawContent` is never updated after creation
- Derived text stored in separate `EvidenceArtifact` table
- Content hash computed at fetch time
- Re-fetch creates new evidence record if content changed

**Verification:**

- `contentHash` field for deduplication
- `hasChanged` flag for version tracking

### 5. Deterministic Processing

**Guarantee:** Same input produces same output.

**Implementation:**

- Idempotent job processing
- Content hash for deduplication
- Stable LLM prompts with structured output
- Deterministic conflict detection

**Verification:**

- Replay capability for debugging
- Hash-based change detection

## Trust Metrics

| Metric            | Target | Description                         |
| ----------------- | ------ | ----------------------------------- |
| Source Coverage   | 100%   | All rules have evidence             |
| Citation Accuracy | 100%   | Citations resolve to valid URLs     |
| Confidence Floor  | 70%    | Minimum OCR/extraction confidence   |
| Human Review Rate | <5%    | Items requiring manual intervention |

## Enforcement

### Build-Time

- Schema enforces required relationships
- TypeScript types prevent orphaned records

### Runtime

- Extractor validates evidence exists
- Composer verifies source pointers
- Reviewer checks citation validity
- Arbiter resolves conflicts

### Monitoring

- Alert on orphaned rules
- Alert on low confidence batches
- Dashboard for review queue depth

## Related Documentation

- [System Overview](./overview.md)
- [Evidence Rules](../_meta/evidence-rules.md)
- [System Invariants](../_meta/invariants.md)
- [Regulatory Truth Pipeline](../05_REGULATORY/PIPELINE.md)
