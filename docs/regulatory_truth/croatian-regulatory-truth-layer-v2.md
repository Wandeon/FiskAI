# Croatian Regulatory Truth Layer – v2

## Institution-Grade Architecture for a Time-Aware, Explainable Compliance System

This document defines the **second iteration (v2)** of the Croatian Regulatory Truth Layer.
It incorporates architectural, governance, and operational refinements identified during review.

This is **not** a product spec.
It is an **institutional system design**.

---

## 0. Purpose and Design Contract

The purpose of this system is to deliver:

> **The best currently enforceable regulatory truth, at time T,  
> with explicit sources, confidence, risk, and known uncertainty.**

The system explicitly rejects:

- absolute certainty
- silent assumptions
- uncited answers
- hidden conflicts

---

## 1. Reality Model (Non-Negotiable)

Regulatory truth in Croatia is **layered and mutable**:

1. **Law (Narodne novine)** – legally binding
2. **Interpretation (Porezna uprava)** – enforcement reality
3. **Procedures (FINA, HZMO, HZZO)** – technical execution
4. **Practice** – what passes inspections

Conflicts are normal.
The system must **model them, not erase them**.

---

## 2. Architectural Principle

Truth is not retrieved.
Truth is **synthesized, versioned, and governed**.

- RAG = retrieval assistant
- Knowledge Graph = structure
- Governance + CI/CD = trust

---

## 3. High-Level Architecture

The system consists of:

1. Immutable Evidence Store (append-only)
2. Time-aware Rule + Knowledge Graph
3. Vector Store (recall and explanation only)
4. Regulatory CI/CD Pipeline
5. Governance & Audit Layer

---

## 4. Core Data Objects

### 4.1 Evidence (Immutable Source Archive)

```ts
type Evidence = {
  id: string
  source: "NARODNE_NOVINE" | "POREZNA_UPRAVA" | "FINA" | "HZMO" | "HZZO"
  publisher: string
  url: string
  fetchedAt: string
  contentHash: string
  rawContentPath: string
  extractedTextPath: string
  contentType: "PDF" | "HTML"
  effectiveDate: string | null
  status: "PENDING" | "PROCESSED" | "IGNORED"
}
```

Rules:

- Append only
- Never overwrite
- Hash everything
- Keep every historical version

---

### 4.2 SourcePointer (Precise Citation)

```ts
type SourcePointer = {
  id: string
  evidenceId: string
  type: "PDF_PAGE_SPAN" | "HTML_SELECTOR" | "ARTICLE_REF"
  locator: any
  excerpt: string
}
```

Every user-facing claim **must** reference at least one SourcePointer.

---

### 4.3 Concept (Semantic Anchor)

```ts
type Concept = {
  id: string
  name: string
  aliases: string[]
  tags: string[]
}
```

Used for:

- impact analysis
- dependency tracking
- change propagation

---

### 4.4 Rule (Atomic Logic Unit)

```ts
type Rule = {
  id: string
  topic: string
  ruleType: "THRESHOLD" | "DEADLINE" | "OBLIGATION" | "DEFINITION" | "PROCEDURE"

  statement: string
  appliesWhen: any
  outcome: any

  effectiveFrom: string
  effectiveUntil: string | null

  authorityLevel: "LAW" | "GUIDANCE" | "PROCEDURE" | "PRACTICE"
  parseConfidence: number // 0–1
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  ruleStability: "STABLE" | "VOLATILE"

  derivedFromPointers: string[]
  humanVerifiedBy: string | null
  verifiedAt: string | null

  automationPolicy: "ALLOW" | "CONFIRM" | "BLOCK"
  status: "DRAFT" | "ACTIVE" | "DEPRECATED" | "STALE"
}
```

---

### 4.5 Conflict (First-Class Object)

```ts
type Conflict = {
  id: string
  ruleIds: string[]
  description: string
  severity: "CRITICAL" | "WARNING"
  resolutionPolicy: "LAW_WINS" | "GUIDANCE_WINS" | "NEEDS_JUDGMENT"
  recommendedAction: string
  automationBlocked: boolean
  status: "OPEN" | "RESOLVED"
}
```

Conflicts are surfaced to users and **never hidden**.

---

### 4.6 Knowledge Graph Edge

```ts
type GraphEdge = {
  fromId: string
  toId: string
  relation: "AMENDS" | "INTERPRETS" | "REQUIRES" | "EXEMPTS" | "DEPENDS_ON"
  validFrom: string
  validTo: string | null
}
```

---

### 4.7 Release (Versioned Truth Bundle)

```ts
type Release = {
  version: string // YYYY.MM.DD
  publishedAt: string
  changelog: string[]
  ruleIds: string[]
  approvedBy: string
}
```

---

### 4.8 AuditLog (Legal Defense Layer)

```ts
type AuditLog = {
  id: string
  action: string
  entityType: "RULE" | "RELEASE" | "CONFLICT"
  entityId: string
  performedBy: string
  performedAt: string
  metadata: any
}
```

Every approval, rejection, and release is logged.

---

## 5. Regulatory CI/CD Pipeline

### Step 0: Monitor & Snapshot

- Daily scraping
- Hash comparison
- Append-only storage

### Step 1: Change Detection & Classification

Changes are classified as:

- editorial
- procedural
- definition change
- threshold change
- deadline change
- new obligation
- exception change

### Step 2: Impact Analysis

- Traverse knowledge graph
- Mark dependent rules as STALE
- Block automation if risk is HIGH

### Step 3: Draft Rule Synthesis (AI-Assisted)

- Propose rule updates
- Attach SourcePointers
- Assign confidence + risk

### Step 4: Human Review Gate

Tiered review:

- Tier 0: editorial
- Tier 1: procedural
- Tier 2: obligations, penalties, thresholds

### Step 5: Release

- Versioned publish
- Changelog
- Rollback support

### Step 6: Regression Tests

Scenario-based compliance tests.

---

## 6. User Role Model

- **SME User**: consumes answers, no authority
- **Accountant**: validates correctness, sees conflicts
- **Reviewer**: approves rules and releases
- **System Automation**: executes only LOW-risk, HIGH-confidence rules

Permissions are role-scoped.

---

## 7. Retrieval & Answering Contract

Retrieval order:

1. Resolve context (entity, date, transaction)
2. Query active rules
3. Attach SourcePointers
4. Generate explanation

LLMs **never decide truth**.

---

## 8. Mandatory Answer Format

```json
{
  "answer": "...",
  "metadata": {
    "ruleId": "...",
    "authority": "LAW | GUIDANCE | PROCEDURE",
    "confidence": "HIGH | MEDIUM | LOW",
    "risk": "LOW | MEDIUM | HIGH",
    "validAsOf": "YYYY-MM-DD",
    "sources": [...],
    "conflict": null,
    "warning": null
  }
}
```

---

## 9. Refusal and Degradation Strategy

The system must refuse when:

- rule is STALE + HIGH risk
- conflict unresolved + automation requested
- no valid sources exist

Degradation behavior:

- mark rules stale
- disable automation
- increase warnings

---

## 10. Final Design Truth

This is an infinite system.

You will never finish it.
You will never be perfect.

Your advantage is:

- discipline
- transparency
- explainability
- trust

This system does not promise certainty.
It promises **clarity with accountability**.
