# RTL System Remediation Plan

Generated: 2026-01-16
Scope: System-level remediation for the RTL worker pipeline and supporting infrastructure.

---

## Priorities

P0 = Blocks production correctness or pipeline completion.
P1 = Correctness/observability gaps that impair governance or cost control.
P2 = Hardening and cleanup items that reduce long-term risk.

---

## P0: Restore a Single, Functional Pipeline

1. Choose and enforce a single extraction -> composition path

- Decision: CandidateFact-based Phase-D (preferred) OR revert fully to SourcePointer-based pipeline.
- If Phase-D is canonical:
  - Update continuous-drainer to queue compose jobs using candidateFactIds, not pointerIds.
  - Update sentinel.worker and continuous-drainer “processed evidence” detection to check CandidateFacts, not SourcePointers.
  - Re-enable compose queueing after extraction (extractor.worker) using candidateFactIds.
  - Remove/disable continuous-pipeline legacy loop.
- If reverting to SourcePointer:
  - Restore SourcePointer creation in extractor and remove CandidateFact-based compose/apply.
  - Remove/disable Phase-D composer/apply workers.

Acceptance criteria:

- A newly discovered evidence item produces a reviewed rule with no manual queue edits.
- Compose/apply jobs are created and processed end-to-end in a single path.

2. Eliminate duplicate routing

- Sentinel agent should not queue extract/ocr directly if scout/router is active.
- Enforce one routing source of truth: either sentinel->scout->router or drainer-only.
- Add explicit evidence status transitions (e.g., SKIPPED, ROUTED) to avoid reprocessing.

Acceptance criteria:

- Each evidence item is routed exactly once and cannot be queued to extract/ocr by multiple workers.

---

## P1: Enforce Routing, Budget, and Health Controls

3. Make router decisions effective

- Extractor worker must honor llmProvider (LOCAL vs CLOUD) in its LLM calls.
- Add LLM provider selection in runAgent (endpoint/model selection based on job data).

Acceptance criteria:

- Router decision changes the actual provider used in extraction logs.

4. Record and enforce token budgets

- Call acquireSlot/releaseSlot around LLM calls.
- Record token spend via recordTokenSpend in runner or worker with actual token counts.
- Persist budget state to Redis so caps are global across worker replicas.

Acceptance criteria:

- Budget caps are enforced across multiple workers; exceed cap blocks extraction.

5. Complete progress telemetry for LLM stages

- Emit progress events for extract/compose/apply/review/arbiter/release stages.
- Ensure progress events include tokensUsed and producedCount.
- Use these events to update source health reliably.

Acceptance criteria:

- Source health tables reflect recent LLM activity and influence routing thresholds.

6. Classification kill switch safety

- If CLASSIFICATION_ENABLED is true, ensure a classification worker exists and forwards to extract.
- If not implemented, hard-disable the flag in production or add a runtime guard.

Acceptance criteria:

- Enabling classification does not stall the pipeline.

---

## P2: Hardening and Cleanup

7. Remove deprecated pipeline code paths

- Remove continuous-pipeline or guard it behind explicit feature flag.
- Remove unused queue routing paths to avoid accidental reactivation.

8. Cross-process duplication safeguards

- Persist duplicate detection hashes in DB or Redis (scout stage).
- Add evidence-level “processedAt/byStage” markers to avoid re-queue loops.

9. Observability hygiene

- Fix orchestrator metrics to avoid logging success on failed jobs.
- Add queue depth alerts tied to expected pipeline throughput.

10. Performance guardrails

- Replace runExtractorBatch’s full CandidateFact scan with indexed queries or join.
- Add pagination and time-bounded scans for large tables.

---

## Suggested Implementation Order

Phase 1 (P0):

1. Decide Phase-D vs SourcePointer pipeline.
2. Fix queue payloads and processed detection.
3. Remove duplicate routing paths.

Phase 2 (P1): 4. Enforce router provider decisions. 5. Implement budget/health telemetry integration. 6. Resolve classification kill switch behavior.

Phase 3 (P2): 7. Clean up legacy code paths. 8. Strengthen duplication safeguards. 9. Tighten observability and performance.

---

## Validation Checklist

- New evidence: discovery -> OCR (if needed) -> extraction -> compose -> apply -> review -> release.
- No duplicate jobs created across multiple routing sources.
- Router decisions change LLM provider used in practice.
- Budget caps prevent overspending across multiple worker replicas.
- Source health metrics reflect real LLM outcomes and adapt routing thresholds.
- Classification flag cannot stall extraction.
