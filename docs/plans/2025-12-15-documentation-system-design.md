# Evidence-Based Feature Audit System - Design Document

**Created**: 2025-12-15
**Status**: Approved
**Goal**: Systematically document FiskAI codebase with full evidence rigor

## Design Decisions

| Decision           | Choice                         | Rationale                                                    |
| ------------------ | ------------------------------ | ------------------------------------------------------------ |
| Primary goal       | Feature audit (test & present) | Need to know each feature to test and present it             |
| Navigation         | Feature-first                  | Start from "What can users do?" → drill into code            |
| Verification rigor | Heavy                          | Evidence links, verification steps, reviewer agent validates |
| Prioritization     | Breadth-first                  | Stub everything first, then deepen                           |
| Workflow           | Batch with review gates        | Batches of 5-10 features, human review each batch            |

## Core Philosophy

Three principles govern this approach:

1. **Scripts decide what exists, agents describe what it does** - No agent decides the inventory. Scripts mechanically extract routes, components, jobs, tables. Agents only document from these facts.

2. **Every claim needs evidence** - No feature doc is valid without file:line references. If an agent can't point to code, it marks "UNVERIFIED" explicitly.

3. **Separation of Worker and Auditor** - The agent that writes a doc is never the agent that validates it.

## Target Folder Structure

```
docs/
├── 00_INDEX.md                    # Master navigation
├── 01_ARCHITECTURE/
│   ├── tech-stack.md
│   ├── app-structure.md
│   └── data-flow.md
├── 02_FEATURES/
│   ├── FEATURE_REGISTRY.md        # Central tracker (✅/🟡/❌)
│   └── features/
│       ├── auth-login.md
│       ├── auth-registration.md
│       ├── invoicing-create.md
│       └── ...
├── 03_CODEMAP/
│   ├── routes.md
│   ├── components.md
│   ├── api-endpoints.md
│   └── database-schema.md
├── 04_OPERATIONS/
│   ├── deployment.md
│   ├── environment-vars.md
│   └── runbooks.md
└── _meta/
    ├── inventory/                 # Script-generated artifacts
    │   ├── routes.json
    │   ├── components.json
    │   ├── api-endpoints.json
    │   ├── db-tables.json
    │   └── jobs.json
    ├── coverage.md                # What's documented vs not
    └── evidence-rules.md          # Definition of Done
```

## Five-Phase Workflow

### Phase A: Inventory Generation (Scripts Only)

No AI involved. Scripts mechanically extract:

| Artifact       | Source                                  | Output               |
| -------------- | --------------------------------------- | -------------------- |
| Routes         | `src/app/**/page.tsx`, `src/app/api/**` | `routes.json`        |
| Components     | `src/components/**/*.tsx`               | `components.json`    |
| API Endpoints  | `src/app/api/**/route.ts`               | `api-endpoints.json` |
| Database       | `prisma/schema.prisma`                  | `db-tables.json`     |
| Server Actions | `src/app/actions/**`                    | `actions.json`       |
| Jobs/Cron      | Any scheduled tasks, workers            | `jobs.json`          |
| Integrations   | Env vars + import analysis              | `integrations.json`  |

### Phase B: Feature Discovery (Agent + Human)

One agent reads all inventory artifacts and proposes a feature clustering:

- Groups related routes/components/APIs into candidate features
- Creates `FEATURE_REGISTRY.md` with ~50-150 feature stubs
- Each stub has: name, status (❌ Not documented), entry points, estimated complexity
- **Human reviews and adjusts** the feature list before proceeding

### Phase C: Batch Documentation (Worker Agents)

Features documented in batches of 5-10:

- Each feature assigned to a worker agent
- Agent writes doc following strict template
- Reviewer agent validates each doc against evidence rules
- **Human reviews the batch** before next batch starts

### Phase D: Cross-Linking & Dependencies

After all features have stub docs:

- Agent scans all docs and creates dependency graph
- Each feature doc gets "Depends on" and "Depended by" sections populated
- Mermaid diagrams generated for visual flows

### Phase E: Deepening (Priority Features)

Human selects critical features for full treatment:

- Complete verification checklists
- Failure modes documented
- Edge cases identified

## Feature Documentation Template

```markdown
# Feature: [Name]

## Status

- Documentation: ✅ Complete | 🟡 Partial | ❌ Stub
- Last verified: [date]
- Evidence count: [N] (minimum 5 required)

## Purpose

[1-2 sentences: what user problem does this solve?]

## User Entry Points

| Type | Path                | Evidence                                  |
| ---- | ------------------- | ----------------------------------------- |
| Page | /dashboard/invoices | `src/app/(dashboard)/invoices/page.tsx:1` |
| API  | POST /api/invoices  | `src/app/api/invoices/route.ts:45`        |

## Core Flow

1. User does X → [file:line]
2. System calls Y → [file:line]
3. Data saved to Z → [file:line]

## Key Modules

| Module        | Purpose         | Location                                  |
| ------------- | --------------- | ----------------------------------------- |
| InvoiceForm   | Input component | `src/components/invoices/InvoiceForm.tsx` |
| createInvoice | Server action   | `src/app/actions/invoices.ts:23`          |

## Data

- **Tables**: `invoices`, `invoice_items` → [schema reference]
- **Key fields**: status, total, due_date

## Dependencies

- **Depends on**: [[auth-session]], [[customers-list]]
- **Depended by**: [[payments-process]], [[reports-revenue]]

## Integrations

- Stripe (payment) → `src/lib/stripe/client.ts:12`
- Email (notification) → `src/lib/email/send.ts:34`

## Verification Checklist

- [ ] Can create new invoice
- [ ] Can edit draft invoice
- [ ] PDF generation works
- [ ] Email sends on finalization

## Evidence Links

1. `src/app/(dashboard)/invoices/page.tsx:1-45`
2. `src/app/api/invoices/route.ts:23-89`
3. `src/components/invoices/InvoiceForm.tsx:1-120`
4. `src/app/actions/invoices.ts:20-85`
5. `prisma/schema.prisma:145-167` (Invoice model)
```

## Definition of Done (Evidence Rules)

| Rule                | Check                                                   |
| ------------------- | ------------------------------------------------------- |
| File exists         | `docs/02_FEATURES/features/{name}.md` exists            |
| Minimum size        | > 200 bytes                                             |
| Required sections   | Has "Purpose", "Entry Points", "Evidence Links"         |
| Evidence count      | ≥ 5 file:line references                                |
| Evidence valid      | All referenced files exist                              |
| Dependencies listed | Has at least 1 "Depends on" OR explicitly states "None" |
| Status marked       | Has documentation status badge                          |

If any check fails, doc is marked 🟡 Partial and sent back for revision.

## Agent Architecture

| Agent                 | Role                                  | Input                    | Output                           |
| --------------------- | ------------------------------------- | ------------------------ | -------------------------------- |
| **Inventory Builder** | Runs scripts, extracts facts          | Codebase                 | `_meta/inventory/*.json`         |
| **Feature Mapper**    | Clusters inventory into features      | Inventory JSONs          | `FEATURE_REGISTRY.md` with stubs |
| **Feature Writer**    | Documents one feature fully           | Feature stub + inventory | Feature doc with evidence        |
| **Reviewer**          | Validates docs against evidence rules | Feature doc              | Pass/Fail + specific failures    |

### Batch Workflow

```
PHASE A: Inventory
  Inventory Builder Agent
  └─> Generates all _meta/inventory/*.json
  └─> Creates docs scaffold
  └─> HUMAN REVIEWS inventory artifacts
                    ↓
PHASE B: Feature Discovery
  Feature Mapper Agent
  └─> Reads inventory, proposes feature list
  └─> Creates FEATURE_REGISTRY.md with stubs
  └─> HUMAN REVIEWS and adjusts feature groupings
                    ↓
PHASE C: Batch Documentation (repeats N times)
  For each batch of 5-10 features:
  ┌─────────────────────────────────────────┐
  │ Feature Writer Agents (parallel)        │
  │ └─> Each writes one feature doc         │
  └─────────────────────────────────────────┘
                    ↓
  ┌─────────────────────────────────────────┐
  │ Reviewer Agent                          │
  │ └─> Validates each doc                  │
  │ └─> Failed docs → retry once            │
  └─────────────────────────────────────────┘
                    ↓
  ┌─────────────────────────────────────────┐
  │ HUMAN REVIEWS BATCH                     │
  │ └─> Approve to continue OR revise       │
  └─────────────────────────────────────────┘
                    ↓
PHASE D: Cross-Linking
  Dependency Mapper Agent
  └─> Populates dependency sections
  └─> Generates Mermaid diagrams
```

### Retry Logic

1. Reviewer fails doc with specific reason: "Missing evidence for API endpoint"
2. Same Feature Writer agent gets one retry with the failure feedback
3. If still fails → marked 🟡 Partial, flagged for human attention
4. Never more than one retry (prevents infinite loops)

## Coverage Tracking

### coverage.md Structure

```markdown
# Documentation Coverage

Last updated: 2024-12-15
Total features: 87
Documented: 45 (52%)
Partial: 12 (14%)
Pending: 30 (34%)

## By Category

| Category  | Total | ✅  | 🟡  | ❌  |
| --------- | ----- | --- | --- | --- |
| Auth      | 6     | 4   | 1   | 1   |
| Invoicing | 12    | 8   | 2   | 2   |
| ...       | ...   | ... | ... | ... |

## Evidence Coverage

| Metric                 | Count |
| ---------------------- | ----- |
| Total evidence links   | 342   |
| Verified (file exists) | 338   |
| Broken (file missing)  | 4     |
```

### FEATURE_REGISTRY.md Structure

```markdown
# Feature Registry

| ID   | Feature        | Category | Status | Entry Point      | Complexity | Doc                                  |
| ---- | -------------- | -------- | ------ | ---------------- | ---------- | ------------------------------------ |
| F001 | Login          | Auth     | ✅     | /login           | Low        | [→](features/auth-login.md)          |
| F002 | Registration   | Auth     | ✅     | /register        | Medium     | [→](features/auth-register.md)       |
| F003 | Password Reset | Auth     | 🟡     | /forgot-password | Low        | [→](features/auth-password-reset.md) |

...
```

## Completion Criteria

| Milestone                      | Criteria                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| **Scaffold complete**          | All folders exist, templates in place, inventory generated   |
| **Feature discovery complete** | FEATURE_REGISTRY has all features identified, human approved |
| **Breadth complete**           | Every feature has at least a stub doc                        |
| **Documentation complete**     | 100% features at ✅, zero ❌ remaining                       |
| **Cross-linking complete**     | All dependency sections populated, graph generated           |
| **Verification complete**      | All evidence links validated, broken links = 0               |

## Feature Status Definitions

| Status      | Criteria                                     |
| ----------- | -------------------------------------------- |
| ❌ Stub     | Only name and entry point exist              |
| 🟡 Partial  | Has content but fails ≥1 evidence rule       |
| ✅ Complete | Passes all evidence rules, reviewer approved |
