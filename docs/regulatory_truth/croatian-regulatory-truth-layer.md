# Croatian Regulatory Truth Layer

## Institution-Grade Architecture for a Time-Aware, Explainable Compliance System

---

## 0. What This System Is (and Is Not)

### What it IS

A **living regulatory operating system** for Croatia that:

- Synthesizes law, interpretation, procedure, and enforcement reality
- Is time-aware, versioned, and explainable
- Can safely power automation and AI
- Provides a _defensible_ “best current enforceable truth”

### What it IS NOT

- Not a static knowledge base
- Not “just RAG”
- Not a single dataset
- Not guaranteed legal certainty

There is no single source of truth in Croatia.  
This system **constructs one responsibly**.

---

## 1. The Core Reality (Non-Negotiable)

Croatian compliance truth is **layered**:

1. **Law (Narodne novine)**  
   Legally binding, raw, fragmented, hard to interpret.

2. **Interpretation (Porezna uprava)**  
   Not law, but enforcement reality.

3. **Institutional procedures (FINA, HZMO, HZZO)**  
   Technical and operational requirements.

4. **Practice**  
   What actually passes inspections.

Two things can be “correct” at the same time:

- Literal law
- Current enforcement interpretation

When they diverge, **enforcement usually wins**.

---

## 2. Architectural Principle

> **Truth is not retrieved.  
> Truth is synthesized, versioned, and governed.**

RAG is a tool.  
Knowledge graphs are structure.  
**Governance is the moat.**

---

## 3. High-Level Architecture

The system consists of **three foundational stores** plus governance:

1. **Immutable Evidence Store (Append-Only)**  
   Raw source snapshots. Never edited. Never deleted.

2. **Time-Aware Rule & Knowledge Graph**  
   The synthesized truth layer.

3. **Vector Store**  
   Recall and explanation only. Never authority.

4. **Regulatory CI/CD Pipeline**  
   Daily ingestion, diffing, review, release, rollback.

---

## 4. Core Data Objects (Canonical)

### 4.1 Evidence (Immutable Source Archive)

```ts
type Evidence = {
  id: string
  source: "NARODNE_NOVINE" | "POREZNA_UPRAVA" | "FINA" | "HZMO" | "HZZO"
  url: string
  publisher: string
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
- Hash everything
- Keep every version forever

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

No pointer = no claim.

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
  parseConfidence: number
  ruleStability: "STABLE" | "VOLATILE"

  derivedFromPointers: string[]
  humanVerifiedBy: string | null
  verifiedAt: string | null

  automationPolicy: "ALLOW" | "CONFIRM" | "BLOCK"
  status: "DRAFT" | "ACTIVE" | "DEPRECATED"
}
```

---

### 4.5 Conflict (First-Class Citizen)

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

### 4.7 Release (Truth Bundle)

```ts
type Release = {
  version: string
  publishedAt: string
  changelog: string[]
  ruleIds: string[]
  approvedBy: string
}
```

---

## 5. Regulatory CI/CD Pipeline (Daily)

- Ingest
- Diff
- Impact Mapping
- Draft Rules
- Human Review
- Release
- Regression Tests

---

## 6. Retrieval & Answering (Safe RAG)

- Context resolution
- Graph query
- Evidence retrieval
- Constrained generation

LLM explains. It never decides truth.

---

## 7. Mandatory Answer Format

Every answer must include provenance, confidence, and validity.

---

## 8. Safety Contract

Never:

- Hide uncertainty
- Execute with conflicts
- Answer without citations
- Silently update rules

---

## 9. Final Truth

This is an infinite system.

The promise is not certainty.  
The promise is **clarity with accountability**.
