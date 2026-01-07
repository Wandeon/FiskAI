# Phase 1 Proof-Run Audit

**Date:** 2026-01-07
**Auditor:** Claude (Automated)
**Status:** CRITICAL FINDINGS - NOT READY FOR PRODUCTION

---

## Executive Summary

Phase 1 implemented validators, schemas, and type definitions for the Canonical & Exploratory Design system. However, **these components are not integrated into the production system**. The validators work correctly in isolation but are never called during actual extraction or query operations.

**Key Finding:** RuleFact and CandidateFact tables exist in the database but contain **0 rows**. The system continues to use the legacy RegulatoryRule + SourcePointer flow.

---

## Section 1: Single-Item Trace (MANDATORY)

### Selected Evidence Record

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **Evidence ID**    | `cmjlpg1mq00640tr1g7gailyg`                           |
| **Source**         | Porezna uprava (Tax Administration)                   |
| **URL**            | https://porezna-uprava.gov.hr/Misljenja/Detaljno/2651 |
| **Content Type**   | HTML                                                  |
| **Content Length** | 212,048 bytes                                         |
| **Fetched At**     | 2025-12-25 17:16:43                                   |

### Raw Content Excerpt (Regulatory Opinion)

```
Sukladno članku 38. Zakona o fiskalizaciji, obvezu izdavanja eRačuna ima:

1. porezni obveznik sa sjedištem, prebivalištem ili uobičajenim boravištem u tuzemstvu
   koji je upisan u registar obveznika PDV-a;
2. obveznik poreza na dohodak od samostalne djelatnosti prema propisu kojim se uređuje
   porez na dohodak i obveznik poreza na dobit prema propisu kojim se uređuje porez na
   dobit koji nije upisan u registar obveznika PDV-a...

Prema Zakonu o fiskalizaciji, primatelji eRačuna... od 1. siječnja 2026. godine obvezni
su zaprimati eRačune od izdavatelja eRačuna.

...obvezan je izdavati eRačune i iste fiskalizirati u Fiskalizaciji 2.0, od 1. siječnja
2027. godine.
```

### Extraction Output

**SourcePointers Created:** 134 total

- fiskalizacija: 95
- rokovi: 20
- obrasci: 14
- pdv: 5

**Sample Extracted Values:**

| Domain        | Value Type | Extracted Value | Display Value     | Quote                                                      |
| ------------- | ---------- | --------------- | ----------------- | ---------------------------------------------------------- |
| fiskalizacija | date       | 2026-01-01      | 1. siječnja 2026. | "od 1. siječnja 2026. godine obvezni su zaprimati eRačune" |
| fiskalizacija | date       | 2027-01-01      | 1. siječnja 2027. | "od 1. siječnja 2027. godine"                              |
| fiskalizacija | text       | 38              | članak 38         | "Sukladno članku 38. Zakona o fiskalizaciji"               |
| fiskalizacija | text       | 89/25           | NN 89/25          | "Zakon o fiskalizaciji (Narodne novine, br. 89/25)"        |

### RegulatoryRule Created

| Field              | Value                       |
| ------------------ | --------------------------- |
| **Rule ID**        | `cmjmfhi81000rc8wa49ijgkj5` |
| **Concept Slug**   | `einvoice-receipt-deadline` |
| **Value**          | `2026-01-01`                |
| **Status**         | `DRAFT`                     |
| **Effective From** | 2026-01-01                  |

### Grounding Verification

**Quotes Found in Source:** YES
The extracted quotes exist in the raw HTML content at offset ~201756.

**Match Type:** `PENDING_VERIFICATION` (all 134 SourcePointers)
**Offsets Populated:** NO (startOffset/endOffset are NULL)

### Mode Classification

**COULD NOT DETERMINE** - Phase 1 mode classification is not integrated.

The existing system does not classify facts as Mode 1 or Mode 2. All extracted content goes into SourcePointer → RegulatoryRule with status `DRAFT`.

**What Would Cause Mode 2:**

- Confidence < 0.90
- Missing grounding quotes
- No temporal validity

**What Would Block Promotion:**

- RegulatoryRule status is DRAFT (not PUBLISHED)
- No human review record
- matchType is PENDING_VERIFICATION

---

## Section 2: Batch Yield & Blockage Metrics

### Data Sources

| Schema     | Table          | Record Count |
| ---------- | -------------- | ------------ |
| public     | Evidence       | 2,022        |
| public     | SourcePointer  | 2,177        |
| public     | RegulatoryRule | 615          |
| regulatory | Evidence       | 169          |
| public     | RuleFact       | **0**        |
| public     | CandidateFact  | **0**        |

### Extraction Yield

| Metric                         | Value     |
| ------------------------------ | --------- |
| Total Evidence (public schema) | 2,022     |
| Evidence with SourcePointers   | 221       |
| **Extraction Yield**           | **10.9%** |
| Total SourcePointers           | 2,177     |
| Avg Pointers per Evidence      | 9.85      |

### Domain Distribution

| Domain                     | Count | %     |
| -------------------------- | ----- | ----- |
| rokovi (deadlines)         | 1,139 | 52.3% |
| obrasci (forms)            | 605   | 27.8% |
| fiskalizacija              | 198   | 9.1%  |
| doprinosi (contributions)  | 99    | 4.5%  |
| pdv (VAT)                  | 52    | 2.4%  |
| porez_dohodak (income tax) | 40    | 1.8%  |
| Other                      | 44    | 2.1%  |

### RegulatoryRule Status Distribution

| Status         | Count  | %        |
| -------------- | ------ | -------- |
| DRAFT          | 509    | 82.8%    |
| REJECTED       | 65     | 10.6%    |
| PENDING_REVIEW | 28     | 4.6%     |
| **PUBLISHED**  | **12** | **2.0%** |
| APPROVED       | 1      | 0.2%     |

### SourcePointer Verification Status

| Match Type           | Count | %        |
| -------------------- | ----- | -------- |
| PENDING_VERIFICATION | 2,177 | **100%** |
| EXACT                | 0     | 0%       |
| NORMALIZED           | 0     | 0%       |
| NOT_FOUND            | 0     | 0%       |

### Confidence Distribution

| Metric             | Value |
| ------------------ | ----- |
| Average Confidence | 0.998 |
| Minimum Confidence | 0.8   |
| Maximum Confidence | 1.0   |

### Interpretation

**Mode 1 Status:** UNKNOWN - Phase 1 not integrated
**Mode 2 Capture:** NOT ACTIVE - CandidateFact table empty

The existing system extracts values into SourcePointers at high confidence but:

1. Only 2% of rules reach PUBLISHED status
2. 100% of SourcePointers remain unverified (PENDING_VERIFICATION)
3. 82.8% of rules remain in DRAFT status indefinitely

**Top Blockage Reasons:**

1. No automated verification pipeline running
2. No human review workflow active
3. Rules created but never promoted to PUBLISHED

---

## Section 3: SourcePointer Bridge Audit

### Current Architecture

```
Evidence → Extractor → SourcePointer → RegulatoryRule → Assistant
                              ↑
                              │
                       (EXISTING FLOW)


                       NOT CONNECTED
                              ↓

Evidence → Extractor → CandidateFact → RuleFact → Assistant
                              ↑
                              │
                       (PHASE 1 DESIGN)
```

### What Happens to Existing SourcePointers?

**Status:** COEXISTING (parallel systems)

SourcePointers are NOT transformed or deprecated. They remain the primary grounding mechanism:

| System  | Grounding Mechanism           | Status   |
| ------- | ----------------------------- | -------- |
| Legacy  | SourcePointer.exactQuote      | ACTIVE   |
| Phase 1 | RuleFact.groundingQuotes      | NOT USED |
| Phase 1 | CandidateFact.groundingQuotes | NOT USED |

### Assistant Query Preference

The assistant queries **RegulatoryRule only**, not RuleFact:

```typescript
// From src/lib/assistant/query-engine/rule-selector.ts
const rules = await db.regulatoryRule.findMany({
  where: { conceptSlug: { in: conceptSlugs }, status: "PUBLISHED" },
  include: { sourcePointers: true },
})
```

**RuleFact is never queried.**

### Conflict Resolution

Not applicable - the systems do not interact.

### Example: Same Concept, Two Systems

**Concept:** e-Invoice deadline (fiskalizacija)

| System  | Table          | Has Data        | Queryable by Assistant |
| ------- | -------------- | --------------- | ---------------------- |
| Legacy  | RegulatoryRule | YES (615 rules) | YES                    |
| Phase 1 | RuleFact       | NO (0 rows)     | NO                     |

---

## Section 4: Invariant Enforcement Proof

### Test Results

```
=== TEST 1: RuleFact creation without grounding quotes ===
Valid: false
Errors: [
  {
    field: 'groundingQuotes',
    message: 'Mode 1 facts require at least 1 grounding quote',
    code: 'MISSING_GROUNDING'
  }
]

=== TEST 2: RuleFact with confidence < 0.90 ===
Valid: false
Errors: [
  {
    field: 'confidence',
    message: 'Mode 1 facts require confidence >= 0.9. Got: 0.85',
    code: 'CONFIDENCE_TOO_LOW'
  }
]

=== TEST 3: Promotion approval checks ===
SYSTEM can approve T0: NO
REVIEWER can approve T0: NO
SENIOR_REVIEWER can approve T0: YES
ADMIN can approve T0: YES

=== TEST 4: Grounding quote validation ===
Empty quotes valid: false
Errors: [
  {
    field: 'groundingQuotes',
    message: 'RuleFact must have at least 1 grounding quote',
    code: 'NO_GROUNDING_QUOTES'
  }
]
```

### Invariant Enforcement Summary

| Invariant                             | Validator Exists | Enforced at Runtime     |
| ------------------------------------- | ---------------- | ----------------------- |
| RuleFact requires grounding quotes    | YES              | **NO** - not called     |
| RuleFact requires confidence >= 0.90  | YES              | **NO** - not called     |
| RuleFact requires temporal validity   | YES              | **NO** - not called     |
| Promotion requires approval for T0/T1 | YES              | **NO** - not called     |
| Assistant disclaimers for Mode 2      | YES              | **NO** - not integrated |

### CRITICAL: Runtime Enforcement Gap

**The validators work correctly but are never invoked in production.**

- **Extraction Pipeline:** Outputs to SourcePointer, not CandidateFact
- **Persistence Layer:** RuleFact/CandidateFact tables unused
- **Query Layer:** Queries RegulatoryRule, not RuleFact

This means:

1. Facts can exist without grounding (via SourcePointer)
2. Facts can have any confidence (no threshold enforced)
3. Facts can lack temporal validity
4. Promotion happens via RegulatoryRule.status, not approval records

---

## Section 5: Findings & Go/No-Go

### What Works as Intended

| Component                   | Status | Notes                                 |
| --------------------------- | ------ | ------------------------------------- |
| Phase 1 TypeScript schemas  | PASS   | Zod schemas validate correctly        |
| Phase 1 validators          | PASS   | 630 tests pass                        |
| Phase 1 eligibility checker | PASS   | Correctly blocks invalid promotions   |
| Phase 1 approval records    | PASS   | Role-based permissions enforced       |
| Phase 1 conflict detector   | PASS   | Detects value/temporal conflicts      |
| Prisma models exist         | PASS   | RuleFact/CandidateFact tables created |

### What Is Blocked or Fragile

| Component                  | Status            | Impact                |
| -------------------------- | ----------------- | --------------------- |
| Extraction → CandidateFact | **NOT CONNECTED** | No Mode 2 capture     |
| CandidateFact → RuleFact   | **NOT CONNECTED** | No promotion workflow |
| RuleFact → Assistant       | **NOT CONNECTED** | No Mode 1 answers     |
| SourcePointer verification | BLOCKED           | 100% unverified       |
| Rule publication           | BLOCKED           | 82.8% stuck in DRAFT  |
| Human review               | NOT ACTIVE        | No review workflow    |

### Integration Gaps

```
PHASE 1 MODULES (IMPLEMENTED):         PRODUCTION SYSTEM (ACTIVE):
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ types/                      │        │                             │
│ registry/                   │        │ Evidence                    │
│ validation/                 │   ─┬─  │    ↓                        │
│ capture/                    │   │X│  │ Extractor                   │
│ policy/                     │   │ │  │    ↓                        │
│ promotion/                  │   ─┴─  │ SourcePointer               │
│                             │        │    ↓                        │
│ (630 tests pass)            │        │ RegulatoryRule              │
│ (0 production calls)        │        │    ↓                        │
└─────────────────────────────┘        │ Assistant                   │
                                       └─────────────────────────────┘

              ↑ NO CONNECTION ↑
```

### Go/No-Go Decision

## NOT READY FOR PRODUCTION

**Reason:** Phase 1 is a standalone module with no integration into the active system.

| Criterion                        | Status   |
| -------------------------------- | -------- |
| End-to-end truth flow verified   | **FAIL** |
| Invariants enforced at runtime   | **FAIL** |
| RuleFact/CandidateFact populated | **FAIL** |
| Assistant queries Phase 1 models | **FAIL** |
| SourcePointer bridge defined     | **FAIL** |

### Recommended Next Steps

1. **Bridge Implementation (Required)**
   - Modify extractor to output CandidateFact instead of SourcePointer
   - Connect CandidateFact → RuleFact promotion workflow
   - Update assistant to query RuleFact with fallback to RegulatoryRule

2. **Migration Path (Required)**
   - Define SourcePointer → GroundingQuote transformation
   - Backfill existing verified SourcePointers to RuleFact
   - Preserve existing RegulatoryRules during transition

3. **Verification Pipeline (Required)**
   - Implement quote verification (EXACT/NORMALIZED/NOT_FOUND)
   - Populate startOffset/endOffset in SourcePointers
   - Block unverified facts from PUBLISHED status

4. **Human Review Workflow (Required)**
   - Connect approval records to actual review UI
   - Implement T0/T1 escalation to senior reviewers
   - Track promotion decisions with audit trail

---

## Appendix: Raw Query Results

### Evidence Sources

```
slug                  | name                        | evidence_count
----------------------+-----------------------------+----------------
hzzo-hr               | Auto: hzzo.hr               | 126
vlada-gov-hr          | Auto: vlada.gov.hr          | 24
porezna-uprava-gov-hr | Auto: porezna-uprava.gov.hr | 14
sabor-hr              | Auto: sabor.hr              | 3
hanfa-hr              | Auto: hanfa.hr              | 2
```

### Phase 1 Test Coverage

```
Test Files: 31 passed
Tests: 630 passed
Duration: 13.07s
```

### Database Schema Verification

```sql
SELECT COUNT(*) FROM "RuleFact";      -- 0 rows
SELECT COUNT(*) FROM "CandidateFact"; -- 0 rows
SELECT COUNT(*) FROM "SourcePointer"; -- 2,177 rows
SELECT COUNT(*) FROM "RegulatoryRule"; -- 615 rows
```

---

**Audit Complete:** 2026-01-07
**Next Review:** After bridge implementation
