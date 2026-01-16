# RTL System Worker Deep Dive

Generated: 2026-01-16
Scope: Full worker pipeline review (Layer A discovery, Layer B processing, scheduled maintenance, and supporting infrastructure). This review maps how each worker operates individually, how they interact through queues and shared state, and where the system currently diverges from the intended end-to-end flow.

---

## System Flow Overview

Primary queues and intended flow (current code includes multiple overlapping paths):

1. Scheduler (cron) -> Scheduled queue -> Orchestrator
2. Sentinel discovery -> Evidence creation -> Scout/Router OR direct Extract/OCR
3. OCR (for PDF_SCANNED) -> Extract
4. Extract -> CandidateFacts
5. Compose -> Apply -> Review -> Release
6. Post-release: Embedding, Knowledge Graph, Revalidation, Regression checks

Key stores:

- DiscoveredItem (core DB) tracks discovery fetch status
- Evidence + EvidenceArtifact (regulatory DB) are immutable source snapshots
- CandidateFact (core DB) stores extraction results (Phase-D)
- SourcePointer (core DB) historically linked evidence to rules
- RegulatoryRule (core DB) drafts, reviews, releases
- RuleFact (regulatory DB) published rule facts (revalidation/regression)

---

## Worker-by-Worker Analysis

### Base Worker Framework

File: src/lib/regulatory-truth/workers/base.ts

- Wraps BullMQ worker execution, handles DLQ routing after retries.
- Uses error classification and idempotency keys for DLQ entries.
- Registers worker version, logs startup environment, uses Redis for queue connection.

### Scheduler Service (Layer A)

File: src/lib/regulatory-truth/workers/scheduler.service.ts

- Schedules daily discovery, endpoint health checks, staleness watchdogs, and maintenance tasks.
- Writes scheduled jobs to the scheduled queue (handled by orchestrator).
- Implements catch-up logic and distributed locking via scheduler-catchup.

### Scheduler Catch-up

File: src/lib/regulatory-truth/workers/scheduler-catchup.ts

- Tracks SchedulerRun rows, detects missed runs, acquires locks, marks run transitions.
- Ensures discovery is not skipped due to cron failure or multi-instance contention.

### Orchestrator (Scheduled Queue)

File: src/lib/regulatory-truth/workers/orchestrator.worker.ts

- Processes scheduled jobs: pipeline-run, auto-approve, arbiter sweep, release batch.
- Also runs confidence decay, E2E validation, truth consolidation audit, DLQ healing.
- Schedules regression detection and user feedback governance tasks.

### Sentinel Worker (Discovery)

File: src/lib/regulatory-truth/workers/sentinel.worker.ts

- Runs runSentinel() to discover new sources and fetchDiscoveredItems().
- Uses SourcePointer presence to filter out previously processed evidence.
- Queues scout jobs for new evidence (scout -> router path).

### Sentinel Agent (Direct Queueing)

File: src/lib/regulatory-truth/agents/sentinel.ts

- For PDFs: creates Evidence and EvidenceArtifact, queues OCR or Extract directly.
- For HTML/XML/binary: queues Extract directly.
- This bypasses scout/router and overlaps with sentinel.worker routing.

### Content Scout Worker

File: src/lib/regulatory-truth/workers/content-scout.worker.ts

- Deterministic quality checks (language, boilerplate, doc type, OCR need).
- Records progress events and queues router jobs.

### Router Worker

File: src/lib/regulatory-truth/workers/router.worker.ts

- Uses budget governor + source health to choose routing.
- Routes to OCR or Extract; can skip based on low worth-it score.
- Records progress events and can open circuits on auth/quota errors.

### OCR Worker

File: src/lib/regulatory-truth/workers/ocr.worker.ts

- Validates PDF_SCANNED evidence, runs OCR, creates OCR_TEXT artifact.
- Updates evidence metadata and queues extraction.
- Triggers human review if OCR fails or confidence is low.

### Extractor Worker

File: src/lib/regulatory-truth/workers/extractor.worker.ts

- Ensures evidence readiness, calls runExtractor (LLM).
- Writes CandidateFacts (Phase-D), updates AgentRun outcomes.
- Compose queueing is disabled; no downstream job is queued.

### Extractor Agent

File: src/lib/regulatory-truth/agents/extractor.ts

- Cleans content, runs LLM via runner, validates extractions.
- Enforces domain validation and quote checks, stores CandidateFacts.

### Composer Worker (Proposal Stage)

File: src/lib/regulatory-truth/workers/composer.worker.ts

- Expects candidateFactIds; generates proposal only.
- Queues apply job for persistence.
- Rejects jobs missing candidateFactIds.

### Apply Worker (Persistence Stage)

File: src/lib/regulatory-truth/workers/apply.worker.ts

- Applies proposal: creates SourcePointers + RegulatoryRule, updates CandidateFacts.
- Queues review job for newly created rules.

### Reviewer Worker

File: src/lib/regulatory-truth/workers/reviewer.worker.ts

- Runs runReviewer, and queues release if auto-approved.

### Arbiter Worker

File: src/lib/regulatory-truth/workers/arbiter.worker.ts

- Runs runArbiter to resolve conflicts, using deterministic + LLM arbitration.

### Releaser Worker

File: src/lib/regulatory-truth/workers/releaser.worker.ts

- Runs runReleaser and rebuilds the knowledge graph on success.

### Continuous Drainer (Layer B)

File: src/lib/regulatory-truth/workers/continuous-drainer.worker.ts

- Polls for pending discovery, OCR work, extracted evidence, draft rules, conflicts, approvals.
- Queues extract jobs for evidence lacking SourcePointers.
- Queues compose jobs based on SourcePointers not linked to rules.
- Maintains per-stage heartbeats and uses circuit breakers.

### Continuous Pipeline (Legacy)

File: src/lib/regulatory-truth/workers/continuous-pipeline.ts

- Legacy loop that runs runExtractorBatch/runComposerBatch and approvals.
- Uses SourcePointer-based flow and overlaps with drainer pipeline.

### Consolidator Worker

File: src/lib/regulatory-truth/workers/consolidator.worker.ts

- Runs rule consolidation (dedup/merge/quarantine), used in audits.

### Regression Detector Worker

File: src/lib/regulatory-truth/workers/regression-detector.worker.ts

- Creates daily snapshots of published rules and detects unexplained changes.
- Creates monitoring alerts for regressions and purges old snapshots.

### Revalidation Worker

File: src/lib/regulatory-truth/workers/revalidation.worker.ts

- Re-runs quote-in-evidence, source availability, conflict checks on published rules.
- Escalates failed validations and creates revalidation alerts.

### Selector Adaptation Worker

File: src/lib/regulatory-truth/workers/selector-adaptation.worker.ts

- Uses LLM to suggest selector updates for structural drift.
- Validates and creates a human review alert (no auto-merge).

### Embedding Workers

Files:

- src/lib/regulatory-truth/workers/embedding.worker.ts
- src/lib/regulatory-truth/workers/evidence-embedding.worker.ts
- Generate embeddings for published rules and evidence; retries and state tracking included.

### Content Sync Worker

File: src/lib/regulatory-truth/workers/content-sync.worker.ts

- Patches content repository and creates PRs for rule updates.
- Uses Drizzle to claim, process, and mark events.

### Article Worker

File: src/lib/regulatory-truth/workers/article.worker.ts

- Generates regulatory news articles via an LLM pipeline.

### Supporting Infrastructure

Files:

- src/lib/regulatory-truth/workers/queues.ts (queue definitions + defaults)
- src/lib/regulatory-truth/workers/redis.ts (Redis + heartbeat)
- src/lib/regulatory-truth/workers/metrics.ts (Prometheus)
- src/lib/regulatory-truth/workers/rate-limiter.ts (Bottleneck limits)
- src/lib/regulatory-truth/workers/budget-governor.ts (token budgets, circuit, cooldowns)
- src/lib/regulatory-truth/workers/source-health.ts (adaptive thresholds)
- src/lib/regulatory-truth/workers/progress-tracker.ts (stage telemetry)
- src/lib/regulatory-truth/workers/circuit-breaker.ts (opossum breakers)
- src/lib/regulatory-truth/workers/dlq-healer.ts + dlq-utils.ts (DLQ replay and analysis)
- src/lib/regulatory-truth/workers/bull-board.server.ts (queue dashboard)

---

## System-Level Findings (Cross-Worker)

1. Pipeline fragmentation and conflicting paths

- Sentinel agent queues OCR/Extract directly while sentinel.worker also queues scout -> router -> extract.
- Continuous-drainer queues extraction and composition based on SourcePointer state.
- Continuous-pipeline is a parallel legacy loop.
- Result: duplicate processing, inconsistent skips, and unclear single source of truth.

2. Phase-D migration is incomplete

- Extractor stores CandidateFacts and disables compose queueing.
- Composer worker requires candidateFactIds; drainer queues compose jobs with pointerIds.
- Evidence processed detection is still SourcePointer-based.
- Result: CandidateFacts are created but never promoted into rules.

3. Router budget/health decisions are not enforced by Extractor

- Router passes llmProvider in extract job data, but extractor ignores it.
- Budget governor does not record token spend or enforce concurrency slots.
- Result: cost/routing controls are no-ops and do not reflect actual LLM usage.

4. Health and progress telemetry are incomplete

- Only scout/router emit progress events; extract/compose/apply/review/release do not.
- Source health is updated only via progress events for LLM stages.
- Result: health-driven routing/budget decisions are based on stale or empty data.

5. Classification kill switch can stall extraction

- When CLASSIFICATION_ENABLED=true, drainer routes to a stub that queues nothing.
- Result: pipeline halts at classification stage if enabled.

6. Multiple queues use in-memory, process-local state

- Budget governor, scout hash cache, and LLM limiter are process-local.
- Result: limits are not global across worker replicas.

---

## Summary

The RTL worker ecosystem includes complete building blocks for discovery, extraction, composition, review, release, and governance. However, the active pipeline is fragmented across multiple overlapping routes, and the Phase-D CandidateFact transition is only partially integrated. The current system can discover and extract data, but it does not reliably advance extractions into composed rules or enforce router-level budget/health decisions. The highest-risk issues are pipeline fragmentation, incomplete Phase-D integration, and non-functional routing/budget enforcement.
