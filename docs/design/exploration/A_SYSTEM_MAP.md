# Document A: System Map

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: Single trace from web content to assistant answer

---

## Overview

This document traces how a single piece of regulatory content flows through the FiskAI pipeline, from discovery on the public internet to becoming a grounded answer in the AI Assistant.

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER A: DISCOVERY                                 │
│                         (Scheduled - 06:00 Croatia)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SENTINEL AGENT                                                           │
│     Location: src/lib/regulatory-truth/agents/sentinel.ts                    │
│                                                                              │
│     Input: DiscoveryEndpoint (URL, listingStrategy, priority)                │
│     Actions:                                                                 │
│       • Scans endpoints via SITEMAP_XML, RSS_FEED, HTML_LIST, CRAWL         │
│       • Creates DiscoveredItem records (status: PENDING)                     │
│       • Detects binary type (PDF, DOC, HTML, JSON)                          │
│     Output: DiscoveredItem → Evidence record                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. EVIDENCE CREATION                                                        │
│     Location: src/lib/regulatory-truth/agents/sentinel.ts:1020-1442          │
│     Table: regulatory.Evidence                                               │
│                                                                              │
│     Immutable Fields:                                                        │
│       • rawContent - Full HTML/PDF content (base64 for binaries)            │
│       • contentHash - SHA256 of content                                     │
│       • fetchedAt - Timestamp of capture                                    │
│                                                                              │
│     Classification:                                                          │
│       • contentClass: HTML | PDF_TEXT | PDF_SCANNED | DOC | JSON            │
│       • If PDF_SCANNED → queue for OCR                                      │
│       • If PDF_TEXT → create PDF_TEXT artifact                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER B: PROCESSING                                │
│                           (24/7 Continuous)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ (if PDF_SCANNED)              │
                    ▼                               │
┌───────────────────────────────────────────┐      │
│  3. OCR WORKER                            │      │
│     Location: workers/ocr.worker.ts       │      │
│                                           │      │
│     Processing:                           │      │
│       • Tesseract + Vision fallback       │      │
│       • Creates OCR_TEXT artifact         │      │
│       • Stores ocrMetadata (confidence)   │      │
│       • Sets primaryTextArtifactId        │      │
│                                           │      │
│     Output: EvidenceArtifact (OCR_TEXT)   │      │
└────────────────┬──────────────────────────┘      │
                 │                                  │
                 └────────────────┬─────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. EXTRACTOR AGENT                                                          │
│     Location: src/lib/regulatory-truth/agents/extractor.ts                   │
│                                                                              │
│     Input: Evidence + Artifact (text content)                                │
│     Processing:                                                              │
│       • LLM extracts regulatory facts from text                             │
│       • Each fact = exactQuote + extractedValue + domain                    │
│       • Validates: quote exists in source, value appears in quote           │
│       • Rejected extractions → ExtractionRejected (DLQ)                     │
│                                                                              │
│     Output: SourcePointer records                                           │
│       • evidenceId (soft ref to Evidence)                                   │
│       • domain: pausalni, pdv, doprinosi, fiskalizacija, rokovi             │
│       • exactQuote: Verbatim text from source (immutable)                   │
│       • extractedValue: Parsed regulatory value                             │
│       • startOffset/endOffset: UTF-16 indices into rawContent               │
│       • confidence: 0.0-1.0                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. COMPOSER AGENT                                                           │
│     Location: src/lib/regulatory-truth/agents/composer.ts                    │
│                                                                              │
│     Input: SourcePointer[] (grouped by domain/concept)                       │
│     Processing:                                                              │
│       • Synthesizes RegulatoryRule from extracted facts                     │
│       • Assigns riskTier: T0 (critical) | T1 | T2 | T3 (low)               │
│       • Assigns authorityLevel: LAW | GUIDANCE | PROCEDURE | PRACTICE       │
│       • Creates appliesWhen DSL expression                                  │
│       • Detects source conflicts → escalates to Arbiter                     │
│                                                                              │
│     Output: RegulatoryRule (status: DRAFT)                                  │
│       • conceptSlug: e.g., "pausalni-revenue-threshold"                     │
│       • value: The regulatory value (threshold, rate, date)                 │
│       • sourcePointers[]: Links to evidence-backed facts                    │
│       • derivedConfidence: Computed from pointer quality                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. REVIEWER AGENT                                                           │
│     Location: src/lib/regulatory-truth/agents/reviewer.ts                    │
│                                                                              │
│     Input: RegulatoryRule (DRAFT)                                           │
│     Processing:                                                              │
│       • Validates: value matches source, dates correct, no conflicts        │
│       • Computes confidence score                                           │
│       • T0/T1: ALWAYS escalates to human review (never auto-approve)        │
│       • T2/T3: Auto-approve if confidence >= 0.95 + 24h grace period        │
│                                                                              │
│     Output:                                                                  │
│       • APPROVE → status: APPROVED                                          │
│       • REJECT → status: REJECTED                                           │
│       • ESCALATE_HUMAN → status: PENDING_REVIEW                             │
│       • ESCALATE_ARBITER → create RegulatoryConflict                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ (if conflicts)                │
                    ▼                               │
┌───────────────────────────────────────────┐      │
│  7. ARBITER AGENT                         │      │
│     Location: agents/arbiter.ts           │      │
│                                           │      │
│     Resolution Strategies:                │      │
│       1. Authority hierarchy              │      │
│       2. Source hierarchy                 │      │
│       3. Lex posterior (newer wins)       │      │
│                                           │      │
│     Output:                               │      │
│       • RULE_A_PREVAILS                   │      │
│       • RULE_B_PREVAILS                   │      │
│       • MERGE_RULES                       │      │
│       • ESCALATE_TO_HUMAN                 │      │
└────────────────┬──────────────────────────┘      │
                 │                                  │
                 └────────────────┬─────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  8. RELEASER AGENT                                                           │
│     Location: src/lib/regulatory-truth/agents/releaser.ts                    │
│                                                                              │
│     Pre-Publication Gates:                                                   │
│       • T0/T1 must have approvedBy set                                      │
│       • No unresolved conflicts                                             │
│       • All rules have source pointers                                      │
│       • Evidence chain verification (quote exists in rawContent)            │
│                                                                              │
│     Processing:                                                              │
│       • Creates RuleRelease with semantic version                           │
│       • T0 change → major bump (2.0.0)                                      │
│       • T1 change → minor bump (1.1.0)                                      │
│       • T2/T3 change → patch bump (1.0.1)                                   │
│       • Computes contentHash (SHA256)                                       │
│                                                                              │
│     Output: RegulatoryRule (status: PUBLISHED)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VECTOR STORE (EMBEDDINGS)                              │
│                                                                              │
│  Parallel Processes:                                                         │
│                                                                              │
│  A. Evidence Embedding                                                       │
│     Worker: workers/evidence-embedding.worker.ts                             │
│     Input: Evidence.rawContent (max 4000 chars)                              │
│     Output: 768-dim vector (nomic-embed-text)                               │
│     Purpose: Semantic duplicate detection                                    │
│                                                                              │
│  B. SourcePointer Embedding                                                  │
│     Location: utils/rtl-embedder.ts                                          │
│     Input: exactQuote + contextBefore + contextAfter                         │
│     Output: 768-dim vector                                                   │
│     Purpose: Semantic search for regulatory content                          │
│                                                                              │
│  C. Concept Embedding                                                        │
│     Location: assistant/scripts/generate-concept-embeddings.ts               │
│     Input: Concept.nameHr + aliases                                          │
│     Output: 768-dim vector in ConceptEmbedding table                         │
│     Purpose: AI Assistant query matching                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ASSISTANT QUERY FLOW                                 │
│                                                                              │
│  Entry Point: /api/assistant/chat (POST)                                     │
│  Location: src/lib/assistant/query-engine/answer-builder.ts                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: QUERY INTERPRETATION                                               │
│     Location: query-engine/query-interpreter.ts                              │
│                                                                              │
│     Processing:                                                              │
│       • Classifies: topic, intent, jurisdiction                             │
│       • Detects: personalization needs, nonsense, foreign jurisdiction      │
│       • Computes: confidence score                                          │
│                                                                              │
│     Gate:                                                                    │
│       • confidence < 0.6 → NEEDS_CLARIFICATION (refuse)                     │
│       • confidence >= 0.6 → proceed to retrieval                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: RETRIEVAL                                                          │
│                                                                              │
│  A. Keyword Extraction                                                       │
│     Location: query-engine/concept-matcher.ts                                │
│     • Removes Croatian stopwords                                            │
│     • Normalizes diacritics (č→c, š→s, ž→z)                                 │
│                                                                              │
│  B. Hybrid Search                                                            │
│     Location: query-engine/semantic-search.ts                                │
│     • Semantic: pgvector <=> cosine similarity                              │
│     • Keyword: Pattern matching on conceptSlug, titleHr                     │
│     • Weights: 70% semantic, 30% keyword                                    │
│                                                                              │
│  C. Rule Selection                                                           │
│     Location: query-engine/rule-selector.ts                                  │
│     • Temporal filter: effectiveFrom <= now < effectiveUntil               │
│     • Conditional filter: evaluate appliesWhen DSL                          │
│     • Sort: Authority (LAW > GUIDANCE) → Quality → Confidence               │
│                                                                              │
│  Gate:                                                                       │
│     • No eligible rules → buildNoCitableRulesRefusal()                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: ANSWER ELIGIBILITY                                                 │
│                                                                              │
│  A. Conflict Detection                                                       │
│     Location: query-engine/conflict-detector.ts                              │
│     • Groups rules by concept + valueType                                   │
│     • Checks for conflicting values                                         │
│     • Authority-based resolution (if possible)                              │
│                                                                              │
│  B. Citation Building                                                        │
│     Location: query-engine/citation-builder.ts                               │
│     • Primary source: highest authority rule                                │
│     • Supporting sources: max 3 additional                                  │
│     • Freshness penalty applied to confidence                               │
│                                                                              │
│  Gate:                                                                       │
│     • Unresolvable conflicts → refuse                                       │
│     • No citations → refuse                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LLM SYNTHESIS                                                               │
│     Location: query-engine/answer-synthesizer.ts                             │
│                                                                              │
│     Security:                                                                │
│       • sanitizeRuleContent() - prevents prompt injection                   │
│       • sanitizePII() - removes phone/email/IDs from query                  │
│       • Rule content marked as "DATA, NOT INSTRUCTIONS"                     │
│                                                                              │
│     Model: gpt-4o-mini                                                       │
│     Temperature: 0.3 (factual)                                              │
│     Max tokens: 600-700                                                      │
│                                                                              │
│     Output:                                                                  │
│       • headline (max 120 chars)                                            │
│       • directAnswer (max 240 chars)                                        │
│       • explanation (max 300 chars)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FINAL RESPONSE: AssistantResponse                                           │
│                                                                              │
│  {                                                                           │
│    kind: "ANSWER",                                                           │
│    headline: "Prag prihoda za paušalni obrt je 40.000 EUR",                 │
│    directAnswer: "...",                                                      │
│    citations: {                                                              │
│      primary: {                                                              │
│        title: "Zakon o porezu na dohodak",                                  │
│        authority: "LAW",                                                     │
│        quote: "...40.000 EUR...",                                           │
│        url: "https://narodne-novine.nn.hr/...",                             │
│        effectiveFrom: "2024-01-01",                                         │
│        confidence: 0.95,                                                     │
│        freshnessStatus: "fresh"                                             │
│      },                                                                      │
│      supporting: [...]                                                       │
│    },                                                                        │
│    confidence: { level: "HIGH", score: 0.92, breakdown: {...} }             │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Single Trace Example

**Starting Point**: HZZO job vacancy PDF at `https://hzzo.hr/sites/default/files/2025-05/Područni uredi Osijek i Šibenik.pdf`

### Step 0: Discovery

**Time**: 06:00 (scheduled)
**Agent**: Sentinel
**Code Path**: `sentinel.ts:runSentinel()` → `processEndpoint()` → `processSingleItem()`

```
DiscoveryEndpoint: hzzo-hr
URL: https://hzzo.hr/sites/default/files/2025-05/...pdf
Status: PENDING → FETCHED
```

### Step 1: Evidence Creation

**Table**: `regulatory.Evidence`
**ID**: `cmk1ouag80018atwa2mn6wf3p`

| Field           | Value                                                            |
| --------------- | ---------------------------------------------------------------- |
| sourceId        | hzzo-hr                                                          |
| url             | https://hzzo.hr/.../Područni uredi Osijek i Šibenik.pdf          |
| contentClass    | PDF_TEXT                                                         |
| rawContent      | base64-encoded PDF (270,832 bytes)                               |
| contentHash     | 8a236a58b35892109aff84acba5f3d9722c8ebb65f589ea0fc19ba2823ef3a3b |
| fetchedAt       | 2026-01-05T21:44:07Z                                             |
| stalenessStatus | FRESH                                                            |
| embeddingStatus | COMPLETED                                                        |

### Step 2: Artifact Creation (PDF Text Extraction)

**Table**: `regulatory.EvidenceArtifact`
**ID**: `cmk1ouahx0019atwa7yro574o`

| Field       | Value                                                            |
| ----------- | ---------------------------------------------------------------- |
| evidenceId  | cmk1ouag80018atwa2mn6wf3p                                        |
| kind        | PDF_TEXT                                                         |
| content     | HRVATSKI ZAVOD ZA ZDRAVSTVENO OSIGURANJE... (6,553 chars)        |
| contentHash | ac3f9195bcfd0a74716650e7c2a4f7db3f2f57551cf2804a9e0dc1ea79a102a9 |

### Step 3: LLM Extraction

**Agent**: Extractor
**Code Path**: `extractor.ts:runExtractor()`

**Accepted Extraction**:

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| domain         | rokovi                                                                      |
| valueType      | threshold                                                                   |
| extractedValue | 5                                                                           |
| exactQuote     | čuvat će se u roku od 5 godina od isteka godine u kojoj je postupak završen |
| confidence     | 1.0                                                                         |

**SourcePointer Created**: `cmk2spucj000i15wadwxcad8d`

**Rejected Extractions**: 9

- 1x NO_QUOTE_MATCH (value "8" not found in quote)
- 7x VALIDATION_FAILED (unknown domain: references)
- 1x VALIDATION_FAILED (unknown domain: exemptions)

### Step 4: Grounding Verification

**Check**: Does exactQuote exist in artifact content?

```
Normalized quote: "čuvat će se u roku od 5 godina od isteka godine u kojoj je postupak završen"
Normalized content: [artifact PDF_TEXT content]
Result: FOUND (GROUNDED)
Grounding Rate: 100% (1/1)
```

### Step 5: Current Pipeline State (Orphan)

```
Evidence (FRESH)
    ↓
Artifact (PDF_TEXT, 6553 chars)
    ↓
SourcePointer (1 accepted, 9 rejected)
    ↓
    X (no RegulatoryRule linked)
    ↓
    X (not queryable by Assistant)
```

**Status**: WARN - SourcePointer is orphan (no linked RegulatoryRule)

---

## Key Code Paths

| Stage       | File                                 | Key Function                                                |
| ----------- | ------------------------------------ | ----------------------------------------------------------- |
| Discovery   | `agents/sentinel.ts`                 | `runSentinel()`, `processEndpoint()`, `processSingleItem()` |
| OCR         | `workers/ocr.worker.ts`              | `processOcrJob()`                                           |
| Extraction  | `agents/extractor.ts`                | `runExtractor()`                                            |
| Composition | `agents/composer.ts`                 | `runComposer()`                                             |
| Review      | `agents/reviewer.ts`                 | `runReviewer()`, `canAutoApprove()`                         |
| Conflict    | `agents/arbiter.ts`                  | `runArbiter()`                                              |
| Release     | `agents/releaser.ts`                 | `runReleaser()`, `verifyEvidenceChain()`                    |
| Query       | `query-engine/answer-builder.ts`     | `buildAnswer()`                                             |
| Search      | `query-engine/semantic-search.ts`    | `semanticSearch()`, `hybridSearch()`                        |
| Rules       | `query-engine/rule-selector.ts`      | `selectRules()`                                             |
| Synthesis   | `query-engine/answer-synthesizer.ts` | `synthesizeAnswer()`                                        |

---

## Trust Guarantees

1. **Immutability**: Evidence.rawContent, contentHash, fetchedAt never modified after creation
2. **Grounding**: Every SourcePointer.exactQuote must exist in Evidence.rawContent
3. **Provenance**: UTF-16 offsets enable programmatic relocation of quotes
4. **No Hallucination**: LLM outputs validated against source text
5. **Fail-Closed**: Ambiguous or low-confidence content → refusal (not guess)
6. **Audit Trail**: AgentRun + RegulatoryAuditLog track all state changes

---

## Infrastructure

| Component          | Container                        | Purpose                           |
| ------------------ | -------------------------------- | --------------------------------- |
| redis              | fiskai-redis                     | BullMQ job queues                 |
| scheduler          | fiskai-worker-scheduler          | 06:00 daily discovery trigger     |
| sentinel           | fiskai-worker-sentinel           | Endpoint scanning                 |
| ocr                | fiskai-worker-ocr                | Tesseract + Vision OCR            |
| extractor          | fiskai-worker-extractor          | LLM fact extraction (x2 replicas) |
| composer           | fiskai-worker-composer           | Rule synthesis                    |
| reviewer           | fiskai-worker-reviewer           | Quality gates                     |
| arbiter            | fiskai-worker-arbiter            | Conflict resolution               |
| releaser           | fiskai-worker-releaser           | Publication                       |
| embedding          | fiskai-worker-embedding          | Rule embeddings (x2)              |
| evidence-embedding | fiskai-worker-evidence-embedding | Evidence embeddings (x2)          |
| continuous-drainer | fiskai-worker-continuous-drainer | Queue orchestration               |

---

## References

- Pipeline Trace Audit: `docs/audits/PIPELINE_SINGLE_TRACE_2026-01-06.md`
- RTL Architecture: `docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md`
- Pipeline trace script: `scripts/pipeline-trace.ts`
