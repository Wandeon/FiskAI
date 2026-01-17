# FiskAI Repo Split - Detailed Execution Plan (No-Surprises)

> Created: 2026-01-17
> Status: Draft (proposed for review)
> Goal: Split the monorepo into `fiskai-app` and `fiskai-workers` without breaking hidden dependencies.

---

## 0) Goals and Non-Goals

### Goals

- Split without runtime regressions (no missing workers, no broken imports, no queue drift).
- Clear ownership boundaries: app vs RTL workers.
- Deterministic build/deploy pipelines for each repo.
- Maintain regulatory correctness and auditability during and after split.

### Non-Goals

- No functional redesign of RTL pipeline beyond what is required to split.
- No DB schema changes unless required for ownership boundaries.

---

## 1) Current Dependency Map (Must Be Verified)

The repo contains RTL references outside `src/lib/regulatory-truth/`. These must be inventoried and either moved or refactored:

### Known cross-dependencies (examples to validate)

- App uses RTL queues, watchdogs, audit logging:
  - `src/lib/article-agent/queue.ts` -> `@/lib/regulatory-truth/workers/queues`
  - `src/lib/news/pipeline/ollama-client.ts` -> `@/lib/regulatory-truth/watchdog/llm-circuit-breaker`
  - `src/lib/admin/circuit-breaker-audit.ts` -> `@/lib/regulatory-truth/utils/audit-log`
- System registry references RTL code for governance:
  - `src/lib/system-registry/*` includes `lib-regulatory-truth` as a hard dependency
- Fiscal data validator uses RTL content-sync types and sources:
  - `src/lib/fiscal-data/validator/rtl-bridge.ts` depends on RTL content-sync/types and sources
- Backup worker references RTL worker base/metrics:
  - `src/lib/backup/backup.worker.ts` imports RTL worker utilities
- RTL itself uses app-level modules:
  - `src/lib/regulatory-truth/utils/evidence-embedder.ts` imports article-agent embedder
  - RTL monitoring uses Drizzle content-sync schema and app DB adapters

**Action:** Create a complete dependency inventory (imports + runtime usage) and assign each to app/workers. This is a hard gate for split readiness.

---

## 2) Repository Boundary Definition

### fiskai-app (Next.js)

Owns:

- All UI, API routes, server actions
- Core business domains (invoicing, banking, fiscalization, compliance)
- Assistant query layer and read-only access to RTL outputs
- E-invoice inbound polling (unless explicitly moved)

### fiskai-workers (RTL)

Owns:

- Regulatory Truth Layer (sentinel, extractor, composer, apply, reviewer, arbiter, releaser)
- Worker orchestration, queues, watchdogs, health monitoring
- Content sync worker (if retained in RTL domain)
- RTL-specific scripts, audits, and backfills

### Hard boundary rule

- App must never import from RTL worker code directly after split.
- Workers must not import from app UI or app-specific domains.

---

## 3) Data Ownership and DB Access Strategy

### Current reality

- RTL uses both `public` schema and `regulatory` schema via `db` and `dbReg`.
- App uses `public` schema and reads regulatory outputs.

### Required decisions

1. **Regulatory schema owner:** `fiskai-workers` (write). App gets read-only credentials.
2. **Core schema owner:** `fiskai-app` (write). Workers get limited read/write as needed.
3. **DiscoveredItem + queue tracking:** decide ownership:
   - Option A: keep in `public` (workers need write)
   - Option B: migrate to `regulatory` (app reads only)

### Prisma client strategy (required)

- `fiskai-app`: core Prisma client only (`DATABASE_URL`), optional read-only `dbRegRead` client.
- `fiskai-workers`: dual clients (`DATABASE_URL` + `REGULATORY_DATABASE_URL`) with explicit ownership rules.
- Ensure credentials enforce least privilege (read-only where required).

**Hard gate:** Document every table each repo writes to, and enforce via DB roles.

---

## 4) Queue Contracts and Versioning

### Problem

Queue payloads are shared at runtime but not versioned. Post-split, payload drift becomes a hidden failure mode.

### Required contract

- Define a minimal `rtl-queue-contracts` package or generated file that both repos consume.
- All job payloads include:
  - `version: number`
  - `runId: string`
  - `createdAt: string`
- Workers accept at least N-1 version for backward compatibility.

### Queue prefix

- Ensure `BULLMQ_PREFIX` is identical in both repos.
- Document explicitly in both `.env` and deployment manifests.

---

## 5) Shared Code Strategy (Choose Explicitly)

### Option A: Shared Package (Recommended for safety)

- Create `@fiskai/rtl-contracts` with types + payloads + minimal constants.
- Versioned and published internally (GitHub Packages).
- App and workers depend on the same contract version.

### Option B: Copy (Higher risk)

- Requires manual sync and increases drift risk.
- Only acceptable if combined with strict tests and a compatibility check in CI.

**Recommendation:** Use a minimal contracts package for queue payloads and rule selection DTOs.

---

## 6) Pre-Split Inventory (Non-Negotiable)

### A. Import graph audit

- List every import from `@/lib/regulatory-truth/*` used outside RTL.
- Tag each as: move to workers, refactor into app, or replace with API call.

### B. Runtime dependency audit

- Identify scripts/cron tasks used in production and where they run.
- List worker containers that depend on app code.

### C. CI & Build audit

- Determine which workflows assume monorepo layout.
- Ensure each repo has independent lint/test/build.

### D. Secrets and env audit

- Map env vars to repo ownership (app vs workers).
- Remove unused secrets from each repo to reduce blast radius.

---

## 7) Migration Phases (Detailed)

### Phase 1: Preparation (No code movement yet)

- Produce full dependency inventory (import + runtime).
- Decide DB ownership and roles, create read-only credentials.
- Create shared contracts package or compatibility tests.
- Add CI job in current repo that enforces queue payload versions.

**Exit criteria:**

- Inventory complete and approved.
- Queue contract strategy chosen and implemented.
- DB role plan approved.

### Phase 2: Dual-Repo Skeletons

- Create `fiskai-workers` repo with:
  - `src/lib/regulatory-truth/` + dependencies
  - worker Dockerfiles and compose
  - regulatory Prisma schema + generated client
- Create `fiskai-app` repo with:
  - Next.js app + public Prisma schema
  - read-only regulatory client or API adapter

**Exit criteria:**

- Both repos build independently with stubbed integration points.

### Phase 3: Dependency Refactor

- Refactor app files that import RTL internals:
  - Replace with API calls or new contracts package.
  - Move RTL-only utilities to workers repo.
- Refactor RTL imports that rely on app modules:
  - Move minimal shared utilities to workers or contracts package.

**Exit criteria:**

- No app import of RTL modules.
- No worker import of app UI or app-specific logic.

### Phase 4: Parallel Run (Shadow Mode)

- Deploy workers repo against production DB/Redis in shadow mode:
  - Process queues but do not publish (RTL_PIPELINE_MODE=OFF or sandbox queue prefix).
- Compare outputs:
  - CandidateFacts created
  - Rule counts and deltas
  - Conflicts and error rates

**Exit criteria:**

- Shadow output matches baseline within agreed thresholds.

### Phase 5: Cutover

- Freeze queues.
- Drain legacy workers.
- Switch Redis prefix (or flip traffic) to new workers.
- Enable pipeline mode (PHASE_D) in workers repo.
- App uses read-only regulatory client or API endpoint.

**Exit criteria:**

- New workers process queues end-to-end.
- App reads regulatory data with no errors.

### Phase 6: Cleanup

- Remove RTL code from app repo.
- Remove worker build files from app repo.
- Update documentation, runbooks, and CI.

---

## 8) Cutover Checklist (Operational)

1. Queue freeze + drain
2. Snapshot database (pre-cutover backup)
3. Deploy workers repo (pipeline OFF)
4. Run smoke tests on worker pipelines
5. Flip pipeline ON
6. Switch app read path to new regulatory read client/API
7. Monitor metrics for 24 hours

---

## 9) Rollback Plan

- Freeze queues.
- Repoint Redis prefix or redeploy legacy workers.
- Repoint app to legacy data source.
- Restore DB snapshot if needed.

Rollback must be rehearsed at least once in staging.

---

## 10) Validation and Test Matrix

### Build/CI

- `fiskai-app`: lint, typecheck, build, unit tests
- `fiskai-workers`: lint, typecheck, worker tests, queue contract tests

### Runtime

- Sentinel -> Evidence -> Extract -> Compose -> Apply -> Review -> Release
- Assistant query path returns published rule with citations
- Revalidation and regression workers still function

### Data Integrity

- Rule counts match within tolerance after cutover
- No orphaned evidence or candidate facts
- No queue payload parsing errors

---

## 11) Deliverables

- Dependency inventory (import graph + runtime usage)
- Queue contract package or compatibility tests
- DB role/permission matrix
- Dual-repo CI/CD pipelines
- Cutover + rollback runbooks

---

## 12) Open Decisions (Must Resolve)

1. Where to host content-sync logic (workers or app)?
2. Whether to keep app direct DB access to regulatory schema or build an API.
3. How to handle system-registry dependencies referencing RTL.
4. Whether to migrate DiscoveredItem to regulatory schema.

---

## Appendix: Required Inventory Tables

### A. Import Inventory (app -> RTL)

- File
- Import path
- Runtime usage
- Proposed new location

### B. Worker Runtime Dependencies

- Service
- Required env vars
- DB schemas used
- External service dependencies

### C. Queue Contract Inventory

- Queue name
- Payload schema (v1)
- Producer
- Consumer
- Backward compatibility strategy
