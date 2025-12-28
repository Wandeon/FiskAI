# Implementation Status Registry

> **Purpose:** Declare documentation as executable contracts, not marketing artifacts.
>
> **Last Audit:** 2025-12-28 | **Auditor:** Claude Opus 4.5
>
> **Policy:** PRs that mark features "done" MUST update this file. CI should fail otherwise.

---

## Status Definitions

| Status          | Symbol | Meaning                                                       |
| --------------- | ------ | ------------------------------------------------------------- |
| **Implemented** | `[I]`  | Production-ready. Tests passing. Documentation accurate.      |
| **Partial**     | `[P]`  | Core happy path works. Missing edge cases, tests, or polish.  |
| **Scaffold**    | `[S]`  | Route/component exists but functionality is stub/placeholder. |
| **Designed**    | `[D]`  | Documented specification exists. No code yet.                 |
| **Deprecated**  | `[X]`  | Code exists but scheduled for removal.                        |

---

## Module Implementation Matrix

### Core Modules (Company.entitlements[])

| Module             | Code Status | Routes | Tests   | API | Docs    | Notes                            |
| ------------------ | ----------- | ------ | ------- | --- | ------- | -------------------------------- |
| `invoicing`        | [I]         | 3/3    | Yes     | Yes | Yes     | Fully functional                 |
| `e-invoicing`      | [I]         | 3/3    | Yes     | Yes | Yes     | UBL/XML generation complete      |
| `fiscalization`    | [I]         | 2/2    | Yes     | Yes | Yes     | CIS integration tested           |
| `contacts`         | [I]         | 4/4    | Yes     | Yes | Yes     | OIB lookup integrated            |
| `products`         | [I]         | 3/3    | Yes     | Yes | Yes     | CSV import works                 |
| `expenses`         | [I]         | 4/4    | Yes     | Yes | Yes     | Receipt scanning works           |
| `banking`          | [I]         | 5/5    | Yes     | Yes | Yes     | GoCardless/SaltEdge integrated   |
| `reconciliation`   | [I]         | 1/1    | Yes     | Yes | Yes     | Auto-matching functional         |
| `reports-basic`    | [I]         | 4/4    | Yes     | Yes | Yes     | KPR, P&L, Aging complete         |
| `reports-advanced` | [I]         | 2/2    | Yes     | Yes | Yes     | VAT threshold, export            |
| `pausalni`         | [I]         | 4/4    | Yes     | Yes | Yes     | Full tax management              |
| `vat`              | [P]         | 1/1    | Partial | Yes | Partial | Report only, no submission       |
| `corporate-tax`    | [S]         | 0/1    | No      | No  | No      | Route defined, no implementation |
| `pos`              | [P]         | 1/1    | Partial | Yes | Partial | Stripe Terminal basic only       |
| `documents`        | [I]         | 2/2    | Yes     | Yes | Yes     | R2 storage integrated            |
| `ai-assistant`     | [I]         | 2/2    | Yes     | Yes | Partial | 90+ files, docs outdated         |

### Portal Implementation

| Portal                         | Status | Routes | Navigation | Auth   | Notes                                             |
| ------------------------------ | ------ | ------ | ---------- | ------ | ------------------------------------------------- |
| Marketing `fiskai.hr`          | [I]    | 15+    | Complete   | Public | All landing pages functional                      |
| Client App `app.fiskai.hr`     | [I]    | 60+    | Complete   | USER   | Primary application                               |
| Staff Portal `staff.fiskai.hr` | [P]    | 3      | Basic      | STAFF  | **Dashboard only, missing multi-client features** |
| Admin Portal `admin.fiskai.hr` | [I]    | 15+    | Complete   | ADMIN  | Full regulatory management                        |

---

## System Implementation Status

### Regulatory Truth Layer

| Component             | Status | Code Location           | Tests | Documentation                       |
| --------------------- | ------ | ----------------------- | ----- | ----------------------------------- |
| Evidence Store        | [I]    | `lib/regulatory-truth/` | Yes   | `05_REGULATORY/`                    |
| Sentinel Agent        | [I]    | `agents/sentinel/`      | Yes   | Partial                             |
| OCR Worker            | [I]    | `workers/ocr/`          | Yes   | Partial                             |
| Extractor Agent       | [I]    | `agents/extractor/`     | Yes   | Partial                             |
| Composer Agent        | [I]    | `agents/composer/`      | Yes   | Partial                             |
| Reviewer Agent        | [I]    | `agents/reviewer/`      | Yes   | Partial                             |
| Arbiter Agent         | [I]    | `agents/arbiter/`       | Yes   | Partial                             |
| Releaser Agent        | [I]    | `agents/releaser/`      | Yes   | Partial                             |
| Graph Cycle Detection | [I]    | `graph/`                | Yes   | **Missing**                         |
| DSL AppliesWhen       | [I]    | `dsl/`                  | Yes   | **Missing**                         |
| **Overall RTL**       | [I]    | 22 subdirs              | Yes   | **Fragmented, needs consolidation** |

### AI Assistant System

| Component             | Status | Code Location                      | Tests | Documentation                     |
| --------------------- | ------ | ---------------------------------- | ----- | --------------------------------- |
| Query Engine          | [I]    | `lib/assistant/query-engine/`      | Yes   | **Missing architecture doc**      |
| Text Utils            | [I]    | `query-engine/text-utils.ts`       | Yes   | None                              |
| Concept Matcher       | [I]    | `query-engine/concept-matcher.ts`  | Yes   | None                              |
| Rule Selector         | [I]    | `query-engine/rule-selector.ts`    | Yes   | None                              |
| Answer Builder        | [I]    | `query-engine/answer-builder.ts`   | Yes   | None                              |
| Citation Builder      | [I]    | `query-engine/citation-builder.ts` | Yes   | None                              |
| Reasoning Pipeline    | [I]    | `reasoning/`                       | Yes   | **Missing**                       |
| Shadow Runner         | [I]    | `reasoning/shadow-runner.ts`       | Yes   | None                              |
| Refusal Policy        | [I]    | `reasoning/refusal-policy.ts`      | Yes   | None                              |
| Streaming             | [I]    | `streaming.ts`                     | Yes   | None                              |
| **Overall Assistant** | [I]    | 90+ files                          | Yes   | **CRITICAL: No architecture doc** |

### Guidance System

| Component            | Status | Code Location                  | Tests   | Documentation                  |
| -------------------- | ------ | ------------------------------ | ------- | ------------------------------ |
| Preferences          | [I]    | `lib/guidance/preferences.ts`  | Yes     | **Missing**                    |
| Checklist            | [I]    | `lib/guidance/checklist.ts`    | Yes     | **Missing**                    |
| Help Density         | [I]    | `lib/guidance/help-density.ts` | No      | **Missing**                    |
| Patterns             | [I]    | `lib/guidance/patterns.ts`     | No      | **Missing**                    |
| **Overall Guidance** | [I]    | 9 files                        | Partial | **CRITICAL: No specification** |

### Visibility System

| Component              | Status | Code Location     | Tests | Documentation  |
| ---------------------- | ------ | ----------------- | ----- | -------------- |
| Element Rules          | [I]    | `lib/visibility/` | Yes   | Product Bible  |
| Competence Levels      | [I]    | Integrated        | Yes   | Product Bible  |
| Components             | [I]    | `components/`     | Yes   | Product Bible  |
| **Overall Visibility** | [I]    | Complete          | Yes   | **Documented** |

---

## API Route Coverage

| Category      | Routes | Documented | Tests   | Notes                             |
| ------------- | ------ | ---------- | ------- | --------------------------------- |
| Auth          | 8      | Yes        | Yes     | WebAuthn, OAuth, Passkeys         |
| Admin         | 5      | Partial    | Partial | Support dashboard needs docs      |
| AI            | 4      | Yes        | Yes     | Extract, suggest, usage, feedback |
| Banking       | 8      | Yes        | Yes     | Import, reconciliation, sync      |
| Billing       | 3      | Yes        | Yes     | Stripe integration                |
| Compliance    | 1      | Yes        | Yes     | EN16931 validation                |
| Cron          | 6      | Partial    | Partial | Some jobs undocumented            |
| E-Invoices    | 2      | Yes        | Yes     | Inbox, receive                    |
| Email         | 6      | Yes        | Yes     | Connect, rules, disconnect        |
| Exports       | 4      | Yes        | Yes     | Company, expenses, invoices       |
| Guidance      | 3      | **No**     | Yes     | **Missing docs**                  |
| Health        | 2      | Yes        | Yes     | Health, ready                     |
| Import        | 6      | Yes        | Yes     | Jobs, upload, process             |
| News          | 5      | Partial    | Yes     | Admin news management             |
| Notifications | 2      | Yes        | Yes     | List, mark read                   |
| Pausalni      | 6      | Yes        | Yes     | Full tax support                  |
| Reports       | 4      | Yes        | Yes     | KPR, VAT, export                  |
| Staff         | 2      | **No**     | Partial | **Staff APIs need docs**          |
| Support       | 4      | Yes        | Yes     | Tickets, messages                 |
| Terminal      | 3      | Yes        | Yes     | Stripe Terminal                   |
| WebAuthn      | 4      | Yes        | Yes     | Passkey management                |
| **Total**     | 90+    | ~80%       | ~85%    |                                   |

---

## Critical Divergences

### 1. Staff Portal Gap

**Documentation Claims:** "Staff Portal Implemented - Multi-client workspace for accountants"

**Reality:**

- Only 3 routes exist: `layout.tsx`, `clients/page.tsx`, `staff-dashboard/page.tsx`
- Missing: Client switching, batch operations, multi-company views
- Status: `[P]` Partially Implemented

**Impact:** High - External accountants cannot effectively use portal

**Resolution:** Either implement missing features or update docs to reflect "Basic Dashboard Only"

---

### 2. AI Assistant Architecture Gap

**Documentation Claims:** Brief mention in `AI_FEATURES.md`, listed as module

**Reality:**

- 90+ TypeScript files
- Sophisticated query engine with concept matching, rule selection, citation building
- Reasoning pipeline with shadow runner, refusal policy, decision coverage
- Streaming infrastructure with SSE

**Impact:** Critical - New engineers cannot understand system architecture

**Resolution:** Create `docs/03_ARCHITECTURE/AI_ASSISTANT.md` with:

- Query processing pipeline diagram
- Reasoning stage flow
- Component responsibilities
- Integration points

---

### 3. Guidance System Gap

**Documentation Claims:** Not mentioned in Product Bible

**Reality:**

- 9 files in `lib/guidance/`
- Preferences, checklist, help density, patterns
- API routes: `/api/guidance/preferences`, `/api/guidance/checklist`, `/api/guidance/insights`
- Integrated with visibility system

**Impact:** High - Feature exists but is undiscoverable

**Resolution:** Add `docs/product-bible/09-GUIDANCE-SYSTEM.md` or section in existing chapter

---

### 4. Regulatory Truth Layer Documentation Fragmentation

**Documentation Claims:** Multiple scattered files in `05_REGULATORY/`

**Reality:**

- 22 subdirectories in `lib/regulatory-truth/`
- Complex agent pipeline: Sentinel → OCR → Extractor → Composer → Reviewer → Arbiter → Releaser
- DSL for rule predicates
- Graph cycle detection
- Worker orchestration

**Impact:** Medium - System works but onboarding is difficult

**Resolution:** Create consolidated `docs/03_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md` with:

- Complete agent state machine
- Worker deployment architecture
- DSL reference
- Graph analysis explanation

---

### 5. Feature Registry Binary Status

**Documentation Claims:** 108 features, all marked "✅"

**Reality:** Status is gradient:

- `corporate-tax`: Route exists, no implementation
- `vat`: Report only, no submission capability
- `pos`: Basic Stripe Terminal only

**Impact:** Medium - Misleading completeness perception

**Resolution:** Update `FEATURE_REGISTRY.md` to use `[I]`/`[P]`/`[S]` status markers

---

## Documentation Debt Inventory

| Item                                | Priority | Effort | Owner |
| ----------------------------------- | -------- | ------ | ----- |
| AI Assistant architecture doc       | P0       | 4h     | -     |
| Guidance system specification       | P0       | 2h     | -     |
| Staff portal honest status          | P1       | 1h     | -     |
| RTL consolidated architecture       | P1       | 4h     | -     |
| Feature Registry status granularity | P2       | 2h     | -     |
| API route documentation gaps        | P2       | 3h     | -     |
| Component library inventory         | P3       | 4h     | -     |

---

## Audit Trail

| Date       | Auditor         | Scope         | Findings               | PRs               |
| ---------- | --------------- | ------------- | ---------------------- | ----------------- |
| 2025-12-28 | Claude Opus 4.5 | Full codebase | 5 critical divergences | This file created |

---

## Enforcement Policy

### PR Requirements

Before marking a feature as "Implemented":

1. [ ] Route/component exists and is functional
2. [ ] Tests exist and pass
3. [ ] API endpoints documented (if applicable)
4. [ ] This STATUS.md updated with accurate status
5. [ ] Feature Registry updated (if feature-level change)

### CI Integration (Proposed)

```yaml
# .github/workflows/docs-check.yml
- name: Check STATUS.md updated
  run: |
    # Fail if src/ changed but docs/STATUS.md not updated
    git diff --name-only origin/main | grep -q "^src/" && \
    git diff --name-only origin/main | grep -q "^docs/STATUS.md" || \
    echo "::warning::Consider updating docs/STATUS.md"
```

---

## Quick Reference

**Find implementation status:**

```bash
grep -E "^\| \`[a-z-]+\`" docs/STATUS.md
```

**Find critical gaps:**

```bash
grep -E "\*\*Missing\*\*|\*\*CRITICAL\*\*" docs/STATUS.md
```

**Count by status:**

```bash
grep -c "\[I\]" docs/STATUS.md  # Implemented
grep -c "\[P\]" docs/STATUS.md  # Partial
grep -c "\[S\]" docs/STATUS.md  # Scaffold
grep -c "\[D\]" docs/STATUS.md  # Designed
```
