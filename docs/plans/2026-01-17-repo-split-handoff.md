# Repo Split Handoff Summary

> Created: 2026-01-17
> Purpose: Single-file handoff for the agent performing the repo split.

## 1) Canonical docs to read first

- Split plan: `/home/admin/fiskai-repo/docs/plans/2026-01-17-repo-split-detailed-plan.md`
- Dependency inventory (imports + runtime): `/home/admin/fiskai-repo/docs/plans/2026-01-17-repo-split-inventory.md`
- Queue contracts + versioning rules: `/home/admin/fiskai-repo/docs/plans/2026-01-17-queue-contracts.md`
- DB ownership + access matrix: `/home/admin/fiskai-repo/docs/plans/2026-01-17-db-role-matrix.md`

## 2) Immediate tasks for the split

- Create shared `rtl-queue-contracts` package and update all queue producers/consumers to use it.
- Move shared infra out of RTL internals (redis helpers, circuit breaker, DSL, audit log) into shared/app modules.
- Resolve RTL -> app imports (article agent, embedder, drizzle schemas, email sender, fiscal data constants).
- Update app -> RTL imports (query router/semantic search, DSL, audit log, queue clients).
- Add missing workers to `docker-compose.workers.yml`:
  - `content-scout`, `router`, `regression-detector`, `selector-adaptation`, `revalidation`, `consolidator`.
- Update system-registry codeRefs + tests referencing `src/lib/regulatory-truth/*`.
- Enforce DB roles per matrix (app read-only on RTL tables; workers RW on RTL tables only).

## 3) Critical dependency hotspots (do not miss)

- `src/lib/article-agent/*` used by RTL (article worker + embedder).
- `src/lib/ai/ollama-client.ts` + `src/lib/news/pipeline/ollama-client.ts` depend on RTL circuit breaker.
- `src/lib/security/rate-limit.ts` uses RTL redis helper.
- `src/lib/system-status/worker.ts` and `src/lib/outbox/outbox-worker.ts` use RTL redis/queues.
- RTL uses Drizzle content-sync schema (`src/lib/db/schema/content-sync`) and embeddings schema.

## 4) Cutover plan (high level)

- Stand up `fiskai-workers` in shadow mode (pipeline OFF or alternate BULLMQ_PREFIX).
- Run parallel processing and compare outputs (CandidateFacts, rules, conflicts, error rates).
- Freeze queues, flip prefix/traffic to new workers, enable PHASE_D, verify app read paths.

## 5) Known deployment gaps

- `content-scout.worker.ts` and `router.worker.ts` exist in code but are not in `docker-compose.workers.yml`.
- `regression-detector.worker.ts`, `selector-adaptation.worker.ts`, `revalidation.worker.ts`, `consolidator.worker.ts` exist in code but are not deployed.

## 6) Deliverable files created for this handoff

- `/home/admin/fiskai-repo/docs/plans/2026-01-17-repo-split-detailed-plan.md`
- `/home/admin/fiskai-repo/docs/plans/2026-01-17-repo-split-inventory.md`
- `/home/admin/fiskai-repo/docs/plans/2026-01-17-queue-contracts.md`
- `/home/admin/fiskai-repo/docs/plans/2026-01-17-db-role-matrix.md`
