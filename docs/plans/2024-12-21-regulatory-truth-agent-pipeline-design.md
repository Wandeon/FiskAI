# Croatian Regulatory Truth Layer - AI Agent Pipeline Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a trustworthy, auditable system where AI agents handle the operational burden of maintaining Croatian regulatory compliance data while preserving institution-grade trust guarantees.

**Architecture:** Multi-agent pipeline with risk-tiered authority, strict schema validation, and continuous monitoring. Agents propose, validate, and release regulatory rules with human oversight for critical items.

**Tech Stack:** Ollama cloud models, PostgreSQL, Next.js 15, Prisma, Zod validation

---

## Table of Contents

1. [Risk Classification & Authority Model](#section-1-risk-classification--authority-model)
2. [Agent Roles & Pipeline Architecture](#section-2-agent-roles--pipeline-architecture)
3. [Agent Prompt Templates & Output Schemas](#section-3-agent-prompt-templates--output-schemas)
4. [Schema Validation & Confidence Calibration](#section-4-schema-validation--confidence-calibration)
5. [Bootstrap Process](#section-5-bootstrap-process)
6. [Continuous Monitoring Pipeline](#section-6-continuous-monitoring-pipeline)

---

## Section 1: Risk Classification & Authority Model

Every piece of regulatory data is classified by risk tier, which determines agent authority levels.

### Risk Tiers

| Tier   | Name     | Examples                                                            | Agent Authority                   | Human Review         |
| ------ | -------- | ------------------------------------------------------------------- | --------------------------------- | -------------------- |
| **T0** | Critical | Tax rates, legal deadlines, FINA identifiers, penalty amounts       | Propose only                      | Always required      |
| **T1** | High     | Thresholds (PDV, paušalni limits), contribution bases, form schemas | Propose + flag                    | Required for publish |
| **T2** | Medium   | Bank codes, procedural steps, field validations                     | Auto-approve if confidence ≥ 0.95 | On exception         |
| **T3** | Low      | UI labels, help text, non-binding guidance                          | Auto-approve if confidence ≥ 0.90 | Quarterly audit      |

### Authority Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHORITY MATRIX                            │
├─────────────┬───────────┬───────────┬───────────┬───────────────┤
│ Action      │ T0        │ T1        │ T2        │ T3            │
├─────────────┼───────────┼───────────┼───────────┼───────────────┤
│ Propose     │ Agent ✓   │ Agent ✓   │ Agent ✓   │ Agent ✓       │
│ Validate    │ Agent ✓   │ Agent ✓   │ Agent ✓   │ Agent ✓       │
│ Approve     │ Human     │ Human     │ Agent*    │ Agent*        │
│ Publish     │ Human     │ Human     │ Agent     │ Agent         │
│ Rollback    │ Human     │ Human     │ Human     │ Agent         │
├─────────────┴───────────┴───────────┴───────────┴───────────────┤
│ * Auto-approve only if confidence ≥ threshold                   │
└─────────────────────────────────────────────────────────────────┘
```

### Escalation Triggers

Regardless of tier, escalate to human review when:

- Confidence score < 0.90
- Conflicting sources detected
- Value differs from previous version by > 20%
- Novel rule type not seen before
- Any agent flags uncertainty

---

## Section 2: Agent Roles & Pipeline Architecture

Six specialized agents form the processing pipeline.

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT PIPELINE FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐                  │
│  │ SENTINEL │───▶│ EXTRACTOR │───▶│ COMPOSER │                  │
│  │ Monitor  │    │ Parse     │    │ Draft    │                  │
│  │ sources  │    │ & cite    │    │ rules    │                  │
│  └──────────┘    └───────────┘    └────┬─────┘                  │
│                                        │                         │
│                                        ▼                         │
│                  ┌───────────┐    ┌──────────┐                  │
│                  │ RELEASER  │◀───│ REVIEWER │                  │
│                  │ Version   │    │ Validate │                  │
│                  │ & publish │    │ & approve│                  │
│                  └───────────┘    └────┬─────┘                  │
│                                        │                         │
│                       ┌────────────────┘                         │
│                       ▼                                          │
│                  ┌──────────┐                                    │
│                  │ ARBITER  │ (invoked on conflicts)            │
│                  │ Resolve  │                                    │
│                  │ disputes │                                    │
│                  └──────────┘                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Responsibilities

| Agent         | Input                  | Output                        | Invocation               |
| ------------- | ---------------------- | ----------------------------- | ------------------------ |
| **Sentinel**  | Source URLs, schedules | Evidence records              | Scheduled (hourly/daily) |
| **Extractor** | Evidence (HTML/PDF)    | SourcePointers with citations | On new evidence          |
| **Composer**  | SourcePointers         | Draft Rules with AppliesWhen  | On new/updated pointers  |
| **Reviewer**  | Draft Rules            | Approval/Rejection/Escalation | On new drafts            |
| **Releaser**  | Approved Rules         | Versioned Release bundle      | On approval batch        |
| **Arbiter**   | Conflicting items      | Resolution decision           | On conflict detection    |

### Data Flow Objects

```typescript
// Evidence - Raw snapshot from source
interface Evidence {
  id: string
  source_id: string
  fetched_at: Date
  content_hash: string
  raw_content: string // HTML or extracted PDF text
  content_type: "html" | "pdf" | "xml"
  url: string
}

// SourcePointer - Extracted citation
interface SourcePointer {
  id: string
  evidence_id: string
  xpath_or_selector: string
  extracted_text: string
  extracted_value: any
  context_before: string
  context_after: string
  confidence: number
}

// Rule - The regulatory fact
interface Rule {
  id: string
  concept_slug: string
  risk_tier: "T0" | "T1" | "T2" | "T3"
  applies_when: string // AppliesWhen DSL
  value: any
  source_pointer_ids: string[]
  effective_from: Date
  effective_until: Date | null
  status: "draft" | "approved" | "published" | "deprecated"
}
```

---

## Section 3: Agent Prompt Templates & Output Schemas

### 3.1 Sentinel Agent

**Purpose:** Monitor official sources for changes and store evidence snapshots.

```
SENTINEL AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface SentinelOutput {
  source_url: string
  fetch_timestamp: string
  content_hash: string
  has_changed: boolean
  previous_hash: string | null
  extracted_content: string
  content_type: "html" | "pdf" | "xml"
  change_summary: string | null
  sections_changed: string[]
  fetch_status: "success" | "error"
  error_message: string | null
}
```

---

### 3.2 Extractor Agent

**Purpose:** Parse evidence and create SourcePointers with exact citations.

```
EXTRACTOR AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface ExtractorOutput {
  evidence_id: string
  extractions: Array<{
    id: string
    domain:
      | "pausalni"
      | "pdv"
      | "porez_dohodak"
      | "doprinosi"
      | "fiskalizacija"
      | "rokovi"
      | "obrasci"
    value_type: "currency" | "percentage" | "date" | "threshold" | "text"
    extracted_value: string | number
    display_value: string
    exact_quote: string
    context_before: string
    context_after: string
    selector: string
    confidence: number
    extraction_notes: string
  }>
  extraction_metadata: {
    total_extractions: number
    by_domain: Record<string, number>
    low_confidence_count: number
    processing_notes: string
  }
}
```

---

### 3.3 Composer Agent

**Purpose:** Transform SourcePointers into Draft Rules with machine-evaluable AppliesWhen predicates.

```
COMPOSER AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface ComposerOutput {
  draft_rule: {
    concept_slug: string
    title_hr: string
    title_en: string
    risk_tier: "T0" | "T1" | "T2" | "T3"
    applies_when: string // AppliesWhen DSL
    value: string | number
    value_type: "percentage" | "currency_hrk" | "currency_eur" | "count" | "date" | "text"
    explanation_hr: string
    explanation_en: string
    source_pointer_ids: string[]
    effective_from: string // ISO date
    effective_until: string | null
    supersedes: string | null
    confidence: number
    composer_notes: string
  }
  conflicts_detected?: {
    description: string
    conflicting_sources: string[]
    escalate_to_arbiter: true
  }
}
```

---

### 3.4 Reviewer Agent

**Purpose:** Validate Draft Rules against sources, apply risk-tier authority limits, approve or escalate.

```
REVIEWER AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface ReviewerOutput {
  review_result: {
    draft_rule_id: string
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

---

### 3.5 Releaser Agent

**Purpose:** Bundle approved rules into versioned releases with integrity guarantees.

```
RELEASER AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface ReleaserOutput {
  release: {
    version: string
    release_type: "major" | "minor" | "patch"
    released_at: string
    effective_from: string
    rules_included: Array<{
      rule_id: string
      concept_slug: string
      action: "add" | "update" | "deprecate"
      supersedes: string | null
    }>
    content_hash: string
    changelog_hr: string
    changelog_en: string
    approved_by: string[]
    audit_trail: {
      source_evidence_count: number
      source_pointer_count: number
      review_count: number
      human_approvals: number
    }
  }
}
```

---

### 3.6 Arbiter Agent

**Purpose:** Resolve conflicts between sources, rules, or interpretations.

```
ARBITER AGENT PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
```

**Output Schema:**

```typescript
interface ArbiterOutput {
  arbitration: {
    conflict_id: string
    conflict_type:
      | "SOURCE_CONFLICT"
      | "TEMPORAL_CONFLICT"
      | "SCOPE_CONFLICT"
      | "INTERPRETATION_CONFLICT"
    conflicting_items: Array<{
      item_id: string
      item_type: "source" | "rule"
      claim: string
    }>
    resolution: {
      winning_item_id: string
      resolution_strategy: "hierarchy" | "temporal" | "specificity" | "conservative"
      rationale_hr: string
      rationale_en: string
    }
    confidence: number
    requires_human_review: boolean
    human_review_reason: string | null
  }
}
```

---

## Section 4: Schema Validation & Confidence Calibration

Every agent output passes through strict validation before being accepted into the pipeline.

### Validation Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    VALIDATION PIPELINE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Agent Output                                            │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────────┐                                        │
│  │ JSON Schema │ ← Structural validation (Zod)          │
│  │ Validation  │   Required fields, types, formats      │
│  └──────┬──────┘                                        │
│         │ PASS                                          │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  Semantic   │ ← Business rule validation             │
│  │ Validation  │   AppliesWhen syntax, date logic       │
│  └──────┬──────┘                                        │
│         │ PASS                                          │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │ Cross-Ref   │ ← Referential integrity                │
│  │ Validation  │   IDs exist, no orphans                │
│  └──────┬──────┘                                        │
│         │ PASS                                          │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │ Confidence  │ ← Risk-adjusted thresholds             │
│  │  Gate       │   T0: ≥0.99, T1: ≥0.95, T2: ≥0.90     │
│  └──────┬──────┘                                        │
│         │ PASS                                          │
│         ▼                                               │
│    Accepted into Pipeline                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Confidence Calibration

Confidence scores are calibrated against historical accuracy:

```typescript
interface ConfidenceCalibration {
  // Agent reports 0.95 confidence
  // If historically 95% of 0.95-confidence outputs are correct,
  // calibration factor = 1.0 (well-calibrated)

  agent_id: string
  confidence_bucket: "0.9-0.95" | "0.95-0.98" | "0.98-1.0"
  historical_accuracy: number // Actual accuracy in this bucket
  calibration_factor: number // Adjustment multiplier
  sample_size: number // How many samples in bucket
}

// Calibrated confidence = raw_confidence * calibration_factor
// If agent over-confident: calibration_factor < 1.0
// If agent under-confident: calibration_factor > 1.0
```

### Risk-Tier Thresholds

| Tier | Min Confidence | Auto-Approve | Human Review |
| ---- | -------------- | ------------ | ------------ |
| T0   | 0.99           | Never        | Always       |
| T1   | 0.95           | Never        | ≥0.98        |
| T2   | 0.90           | ≥0.95        | <0.95        |
| T3   | 0.85           | ≥0.90        | <0.90        |

---

## Section 5: Bootstrap Process

The bootstrap process replaces the current unverified fiscal data with trustworthy, evidence-backed rules.

### Bootstrap Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOOTSTRAP PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: Source Registry (Day 1-2)                             │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Catalog all authoritative Croatian regulatory sources │     │
│  │ • Classify by hierarchy (Zakon → Pravilnik → Uputa)    │     │
│  │ • Record URLs, update frequencies, access methods       │     │
│  │ • Output: sources.json with 50+ registered sources      │     │
│  └────────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  PHASE 2: Evidence Collection (Day 3-5)                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Sentinel crawls each registered source                │     │
│  │ • Stores raw HTML/PDF snapshots as Evidence             │     │
│  │ • Computes content hashes for change detection          │     │
│  │ • Output: ~200 Evidence records with snapshots          │     │
│  └────────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  PHASE 3: Extraction (Day 6-10)                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Extractor processes each Evidence record              │     │
│  │ • Creates SourcePointers with exact citations           │     │
│  │ • Human spot-checks 20% of extractions                  │     │
│  │ • Output: ~500 SourcePointers linked to Evidence        │     │
│  └────────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  PHASE 4: Rule Composition (Day 11-15)                          │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Composer creates Draft Rules from SourcePointers      │     │
│  │ • Groups related pointers into coherent rules           │     │
│  │ • Assigns risk tiers, writes AppliesWhen predicates     │     │
│  │ • Output: ~150 Draft Rules covering all fiscal areas    │     │
│  └────────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  PHASE 5: Review & Approval (Day 16-20)                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Reviewer validates each Draft Rule                    │     │
│  │ • T2/T3 auto-approved if confidence ≥ 0.95             │     │
│  │ • T0/T1 queued for human review (you review ~40 rules) │     │
│  │ • Arbiter resolves any detected conflicts               │     │
│  │ • Output: ~150 Approved Rules                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  PHASE 6: Initial Release (Day 21)                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ • Releaser bundles all approved rules                   │     │
│  │ • Version 1.0.0 released                                │     │
│  │ • Old fiscal-data module deprecated                     │     │
│  │ • Application switches to Regulatory Truth Layer        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Priority Order for Bootstrap

Based on FiskAI's paušalni focus, bootstrap in this order:

```
PRIORITY 1 - Paušalni Core (T0/T1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Paušalni revenue threshold (€40,000 → HRK equivalent)
□ Paušalni tax rate (10% flat)
□ Paušalni contribution bases (health, pension)
□ Paušalni quarterly payment deadlines
□ Paušalni annual declaration deadline

PRIORITY 2 - Fiscalization (T0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ FINA certificate requirements
□ JIR/ZKI generation rules
□ Fiscalization XML schema version
□ Mandatory receipt fields
□ Fiscalization deadlines (48h rule)

PRIORITY 3 - VAT Thresholds (T0/T1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ VAT registration threshold (€40,000)
□ VAT rates (25%, 13%, 5%, 0%)
□ VAT exemptions by activity
□ VAT return deadlines

PRIORITY 4 - General Business (T1/T2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Corporate tax rates
□ Dividend withholding
□ Employment contribution rates
□ Minimum wage
□ Bank holiday calendar
```

### Validation Against Current Data

Each bootstrapped rule is compared against existing `fiscal-data` values:

```typescript
interface BootstrapValidation {
  existing_value: {
    source_file: "thresholds.ts" | "tax-rates.ts" | ...
    key: string
    value: any
  }
  bootstrapped_rule: {
    rule_id: string
    value: any
    confidence: number
    source_count: number
  }
  comparison: {
    matches: boolean
    difference: string | null  // "42000 vs 40000"
    action: "CONFIRM" | "REPLACE" | "INVESTIGATE"
  }
}
```

**If values match:** Existing value confirmed with evidence chain.
**If values differ:** Human review required - which is correct?
**If no existing value:** New rule added to knowledge base.

---

## Section 6: Continuous Monitoring Pipeline

After bootstrap, the system must continuously monitor for regulatory changes and keep rules current.

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONTINUOUS MONITORING PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SCHEDULED JOBS                         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  HOURLY: Critical Source Check                           │   │
│  │  ├─ Narodne novine RSS feed                              │   │
│  │  ├─ Porezna uprava announcements                         │   │
│  │  └─ FINA technical bulletins                             │   │
│  │                                                           │   │
│  │  DAILY: Full Source Scan (02:00 UTC)                     │   │
│  │  ├─ All 50+ registered sources                           │   │
│  │  ├─ Content hash comparison                              │   │
│  │  └─ New evidence collection for changes                  │   │
│  │                                                           │   │
│  │  WEEKLY: Deep Validation (Sunday 03:00 UTC)              │   │
│  │  ├─ Re-verify all T0/T1 rules against sources            │   │
│  │  ├─ Check for superseded rules still active              │   │
│  │  └─ Confidence recalibration                             │   │
│  │                                                           │   │
│  │  MONTHLY: Comprehensive Audit                            │   │
│  │  ├─ Full evidence refresh for all rules                  │   │
│  │  ├─ Dead link detection                                  │   │
│  │  └─ Coverage gap analysis                                │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   CHANGE DETECTION                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  Content Hash Changed?                                    │   │
│  │       │                                                   │   │
│  │       ├─ NO → Log "no change", update last_checked       │   │
│  │       │                                                   │   │
│  │       └─ YES → Trigger Change Pipeline:                  │   │
│  │                │                                          │   │
│  │                ▼                                          │   │
│  │         ┌─────────────┐                                  │   │
│  │         │  Sentinel   │ Store new Evidence               │   │
│  │         └──────┬──────┘                                  │   │
│  │                ▼                                          │   │
│  │         ┌─────────────┐                                  │   │
│  │         │  Extractor  │ Diff old vs new                  │   │
│  │         └──────┬──────┘                                  │   │
│  │                ▼                                          │   │
│  │         ┌─────────────┐                                  │   │
│  │         │  Composer   │ Update/create rules              │   │
│  │         └──────┬──────┘                                  │   │
│  │                ▼                                          │   │
│  │         ┌─────────────┐                                  │   │
│  │         │  Reviewer   │ Validate + approve/escalate      │   │
│  │         └─────────────┘                                  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Alert System

```typescript
interface MonitoringAlert {
  id: string
  created_at: string
  severity: "critical" | "high" | "medium" | "low"
  type:
    | "SOURCE_CHANGED" // Official source content changed
    | "SOURCE_UNAVAILABLE" // Source URL returning errors
    | "RULE_SUPERSEDED" // New law supersedes existing rule
    | "CONFLICT_DETECTED" // Two sources now disagree
    | "DEADLINE_APPROACHING" // Regulatory deadline within 30 days
    | "CONFIDENCE_DEGRADED" // Rule confidence dropped below threshold
    | "COVERAGE_GAP" // Area with no rules detected

  affected_rules: string[] // Rule IDs impacted
  source_id: string
  description: string

  auto_action?: {
    action: "DRAFT_UPDATE" | "FLAG_REVIEW" | "DEPRECATE_RULE"
    executed: boolean
    result?: string
  }

  human_action_required: boolean
  acknowledged_by?: string
  resolved_at?: string
}
```

### Notification Channels

```
CRITICAL (Immediate)
━━━━━━━━━━━━━━━━━━━━
• T0 rule source changed
• Fiscalization schema update
• Tax rate change detected
→ Email + SMS + Dashboard alert

HIGH (Within 4 hours)
━━━━━━━━━━━━━━━━━━━━
• T1 rule source changed
• New law published in NN
• Source conflict detected
→ Email + Dashboard alert

MEDIUM (Daily digest)
━━━━━━━━━━━━━━━━━━━━
• T2/T3 rule changes
• Source temporarily unavailable
• Confidence score changes
→ Daily email digest

LOW (Weekly report)
━━━━━━━━━━━━━━━━━━━━
• Coverage gap suggestions
• Performance metrics
• Calibration adjustments
→ Weekly admin digest
```

### Human Review Dashboard

The existing admin digest page (`/admin/digest`) extends to include:

```
┌─────────────────────────────────────────────────────────────┐
│  REGULATORY TRUTH DASHBOARD                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PENDING REVIEWS                        SYSTEM HEALTH        │
│  ┌────────────────────────┐            ┌─────────────────┐  │
│  │ 3 T0 rules awaiting    │            │ Sources: 52/52 ✓│  │
│  │ 5 T1 rules awaiting    │            │ Last scan: 2h   │  │
│  │ 2 Conflicts to resolve │            │ Rules: 147      │  │
│  └────────────────────────┘            │ Coverage: 94%   │  │
│                                         └─────────────────┘  │
│  RECENT CHANGES                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • NN 142/2024 published - 3 rules affected           │   │
│  │ • PDV threshold confirmed at €40,000                 │   │
│  │ • FINA certificate spec v2.1 detected                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Review Queue]  [Source Status]  [Audit Log]  [Settings]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Operational Metrics

Track pipeline health with:

```typescript
interface PipelineMetrics {
  // Volume
  sources_monitored: number
  evidence_collected_24h: number
  rules_updated_7d: number

  // Quality
  auto_approve_rate: number // T2/T3 rules auto-approved
  human_review_backlog: number // Pending T0/T1 reviews
  avg_review_time_hours: number

  // Reliability
  source_availability: number // % of sources reachable
  extraction_success_rate: number
  conflict_rate: number // Conflicts per 100 rules

  // Calibration
  confidence_accuracy: {
    bucket: string
    predicted: number
    actual: number
  }[]
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- Database schema (Prisma models for Evidence, SourcePointer, Rule, etc.)
- Agent infrastructure (Ollama integration, prompt management)
- Zod validation schemas for all agent outputs

### Phase 2: Bootstrap (Week 3-4)

- Source registry with 50+ Croatian regulatory sources
- Sentinel + Extractor agents operational
- Initial evidence collection

### Phase 3: Rule Engine (Week 5-6)

- Composer + Reviewer agents operational
- AppliesWhen DSL parser and evaluator
- Human review UI in admin dashboard

### Phase 4: Production (Week 7-8)

- Releaser + Arbiter agents operational
- Continuous monitoring jobs
- Alert system integration
- v1.0.0 release of regulatory truth layer

---

## Design Decisions Summary

| Decision     | Choice          | Rationale                                          |
| ------------ | --------------- | -------------------------------------------------- |
| Scope        | Values + Rules  | Need both for complete compliance                  |
| Rule Logic   | Hybrid          | Human-defined for T0/T1, agent-proposed for T2/T3  |
| Risk Tiers   | 4-tier (T0-T3)  | Matches financial/legal impact                     |
| Agent Count  | 6 specialized   | Clear separation of concerns                       |
| Auto-approve | T2/T3 only      | Reduce human burden while protecting critical data |
| Confidence   | Calibrated      | Historical accuracy adjustment                     |
| Monitoring   | Multi-frequency | Hourly for critical, daily full scan               |

---

_Design created: 2024-12-21_
_Status: Ready for implementation planning_
