# Regulatory Truth Layer Overview

> Canonical document - reviewed 2024-12-24
>
> Sources merged: `docs/regulatory_truth/croatian-regulatory-truth-layer.md`, `docs/regulatory_truth/croatian-regulatory-truth-layer-v2.md`

## What This System Is

A **living regulatory operating system** for Croatia that:

- Synthesizes law, interpretation, procedure, and enforcement reality
- Is time-aware, versioned, and explainable
- Can safely power automation and AI
- Provides a _defensible_ "best current enforceable truth"

## What This System Is NOT

- Not a static knowledge base
- Not "just RAG"
- Not a single dataset
- Not guaranteed legal certainty

There is no single source of truth in Croatia. This system **constructs one responsibly**.

## The Core Reality

Croatian compliance truth is **layered**:

| Layer             | Source           | Nature                      |
| ----------------- | ---------------- | --------------------------- |
| 1. Law            | Narodne novine   | Legally binding, fragmented |
| 2. Interpretation | Porezna uprava   | Enforcement reality         |
| 3. Procedures     | FINA, HZMO, HZZO | Technical requirements      |
| 4. Practice       | Inspections      | What actually passes        |

When law and enforcement diverge, **enforcement usually wins**.

## Architectural Principle

> **Truth is not retrieved. Truth is synthesized, versioned, and governed.**

RAG is a tool. Knowledge graphs are structure. **Governance is the moat.**

## Three-Store Architecture

### 1. Immutable Evidence Store

- Raw source snapshots
- Never edited, never deleted
- Content-hashed for integrity
- Stored as `Evidence` + `EvidenceArtifact`

### 2. Time-Aware Rule Graph

- Synthesized truth layer
- Versioned with effective dates
- Conflict resolution via Arbiter
- Stored as `RegulatoryRule` + `RuleSourcePointer`

### 3. Vector Store

- Recall and explanation only
- Never authoritative
- Powers semantic search
- Stored in PostgreSQL pgvector

## Processing Pipeline

See [PIPELINE.md](./PIPELINE.md) for details.

```
Discovery → OCR → Extraction → Composition → Review → Arbiter → Release
    ↓         ↓         ↓            ↓          ↓        ↓         ↓
Endpoints  Tesseract   LLM      Rule Draft   QA Check  Conflicts  Publish
           +Vision
```

## Core Data Models

### Evidence (Immutable)

```typescript
{
  id: string
  sourceId: string           // RegulatorySource FK
  url: string
  rawContent: string         // Original fetched content
  contentHash: string        // SHA256 for deduplication
  contentClass: string       // HTML, PDF_TEXT, PDF_SCANNED
  ocrMetadata?: object       // OCR confidence, method
  artifacts: EvidenceArtifact[]
}
```

### RegulatoryRule

```typescript
{
  id: string
  conceptSlug: string        // Unique identifier
  titleHr: string
  summaryHr: string
  detailsHr: string
  effectiveFrom: Date
  effectiveUntil?: Date
  riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED"
  sourcePointers: RuleSourcePointer[]
}
```

### RuleSourcePointer

```typescript
{
  ruleId: string
  evidenceId: string
  quotedText: string // Exact text from source
  confidence: number // 0-100
  extractionMethod: string // LLM model used
}
```

## Trust Guarantees

1. **Evidence-Backed:** Every rule links to source evidence
2. **No Hallucination:** LLM outputs verified against source
3. **Fail-Closed:** Ambiguous content → human review
4. **Immutable History:** Evidence never modified
5. **Deterministic:** Same input → same output

See [Trust Guarantees](../01_ARCHITECTURE/trust-guarantees.md) for details.

## Regulatory Sources

| Source         | Domain               | Content Type            |
| -------------- | -------------------- | ----------------------- |
| Narodne novine | narodne-novine.nn.hr | Laws, regulations       |
| Porezna uprava | porezna-uprava.hr    | Tax interpretations     |
| FINA           | fina.hr              | Financial procedures    |
| HZMO           | hzmo.hr              | Pension procedures      |
| HZZO           | hzzo.hr              | Health insurance        |
| Minfin         | mfin.gov.hr          | Ministry guidance       |
| HNB            | hnb.hr               | Exchange rates, banking |

## Related Documentation

- [Pipeline Details](./PIPELINE.md)
- [Agent Architecture](./AGENTS.md)
- [Evidence System](./EVIDENCE.md)
- [Two-Layer Model](../01_ARCHITECTURE/two-layer-model.md)
- [Operations Runbook](../04_OPERATIONS/OPERATIONS_RUNBOOK.md)
