# Repo Split Inventory - Imports and Runtime Dependencies

> Created: 2026-01-17
> Scope: fiskai-repo
> Purpose: Enumerate code-level dependencies and runtime touch points before splitting `fiskai-app` and `fiskai-workers`.

## A) App -> RTL imports (code dependencies)

| File                                                              | Import/Reference                                     | Runtime usage                         | Proposed split action                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| src/lib/news/pipeline/ollama-client.ts                            | @/lib/regulatory-truth/watchdog/llm-circuit-breaker  | LLM circuit breaker for news pipeline | Move circuit breaker to shared AI infra package (or app-owned module) used by both repos. |
| src/lib/ai/ollama-client.ts                                       | @/lib/regulatory-truth/watchdog/llm-circuit-breaker  | LLM circuit breaker for app AI calls  | Same as above; avoid app importing RTL internals.                                         |
| src/lib/article-agent/queue.ts                                    | @/lib/regulatory-truth/workers/queues (articleQueue) | Enqueue article jobs                  | Move queue names + payload types to shared contracts; app uses queue client package.      |
| src/lib/backup/export.ts                                          | @/lib/regulatory-truth/workers/queues (backupQueue)  | Enqueue backup jobs                   | Move queue names + payload types to shared contracts; app uses queue client package.      |
| src/lib/system-status/worker.ts                                   | @/lib/regulatory-truth/workers/redis + queues        | System status worker infra            | Move Redis/queue helpers to shared infra (app repo).                                      |
| src/lib/outbox/outbox-worker.ts                                   | @/lib/regulatory-truth/workers/redis                 | Outbox worker Redis connection        | Move Redis helper into app infra module.                                                  |
| src/lib/security/rate-limit.ts                                    | @/lib/regulatory-truth/workers/redis                 | Rate limiting Redis client            | Move Redis helper into app infra module.                                                  |
| src/lib/email-sync/sync-service.ts                                | @/lib/regulatory-truth/workers/redis                 | Email sync Redis client               | Move Redis helper into app infra module.                                                  |
| src/lib/outbox/handlers/webhook-handler.ts                        | @/lib/regulatory-truth/webhooks/processor            | Webhook event processing              | Move webhook processor to workers repo and expose API/queue for app.                      |
| src/lib/admin/circuit-breaker-audit.ts                            | @/lib/regulatory-truth/utils/audit-log               | Audit logging for resets              | Move audit-log to app/shared module; keep cross-repo audit schema stable.                 |
| src/lib/fiscal-data/validator/rtl-bridge.ts                       | RTL content-sync types + sources                     | Fiscal validator -> RTL bridge        | Move content-sync types/event-id/sources to shared contracts package.                     |
| src/lib/vat/output-calculator.ts                                  | @/lib/regulatory-truth/agents/arbiter                | Rule precedence resolution            | Move precedence resolver into shared library (no LLM).                                    |
| src/lib/vat/input-vat.ts                                          | @/lib/regulatory-truth/dsl/applies-when              | DSL evaluation for VAT rules          | Move DSL into shared contracts package.                                                   |
| src/lib/assistant/reasoning/reasoning-pipeline.ts                 | @/lib/regulatory-truth/retrieval/query-router        | Assistant rule retrieval              | Move query router into app (read-only) or expose API in workers.                          |
| src/lib/assistant/query-engine/semantic-concept-matcher.ts        | @/lib/regulatory-truth/retrieval/semantic-search     | Assistant concept matching            | Same as above.                                                                            |
| src/lib/assistant/query-engine/rule-eligibility.ts                | @/lib/regulatory-truth/dsl/applies-when              | Rule eligibility evaluation           | Move DSL to shared package.                                                               |
| src/lib/**tests**/rate-limit-fail-closed.test.ts                  | ../regulatory-truth/workers/redis                    | Test-only import                      | Update to new infra module path after split.                                              |
| src/lib/**tests**/evidence-immutability.test.ts                   | ../regulatory-truth/utils/content-hash               | Test-only import                      | Move test utility into shared package or relocate test to workers repo.                   |
| src/lib/assistant/reasoning/_tests_                               | mocks for RTL circuit breaker                        | Test-only import                      | Update mock path once circuit breaker moves.                                              |
| src/lib/assistant/query-engine/**tests**/rule-eligibility.test.ts | RTL DSL types                                        | Test-only import                      | Update import path after DSL moves.                                                       |
| src/lib/security/rate-limit.ts.orig                               | RTL redis                                            | Legacy file                           | Delete or update; not used in production.                                                 |

## B) RTL -> App imports (code dependencies)

| RTL file                                                           | Import path                                      | Usage                          | Proposed split action                                        |
| ------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------ | ------------------------------------------------------------ |
| src/lib/regulatory-truth/agents/selector-adapter.ts                | @/lib/ai/ollama-client + @/lib/ai/usage-tracking | LLM calls + usage tracking     | Move AI client + usage tracking into workers/shared package. |
| src/lib/regulatory-truth/workers/article.worker.ts                 | @/lib/article-agent/orchestrator                 | Article generation             | Move article agent into workers repo or shared package.      |
| src/lib/regulatory-truth/utils/evidence-embedder.ts                | @/lib/article-agent/verification/embedder        | Embedding generation           | Move embedder into shared embeddings package.                |
| src/lib/regulatory-truth/watchdog/types.ts                         | @/lib/config/features                            | Watchdog config                | Move feature config to shared package or duplicate.          |
| src/lib/regulatory-truth/monitoring/metrics.ts                     | @/lib/db/drizzle + schema/content-sync           | Metrics storage                | Move Drizzle schema to workers repo.                         |
| src/lib/regulatory-truth/services/embedding-service.ts             | @/lib/db/drizzle + schema/embeddings             | Embedding storage              | Move Drizzle schema to workers repo.                         |
| src/lib/regulatory-truth/content-sync/\*                           | @/lib/db/drizzle + schema/content-sync           | Content sync event storage     | Move Drizzle schema to workers repo.                         |
| src/lib/regulatory-truth/workers/content-sync.worker.ts            | @/lib/db/drizzle + schema/content-sync           | Content sync worker            | Move Drizzle schema to workers repo.                         |
| src/lib/regulatory-truth/watchdog/resend-email.tsx                 | @/lib/email                                      | Alert email sending            | Move email sender to shared package or call app API.         |
| src/lib/regulatory-truth/scripts/verify-fiscal-data.ts             | @/lib/fiscal-data/data/\*                        | Cross-check RTL vs fiscal data | Move fiscal data constants into shared data package.         |
| src/lib/regulatory-truth/utils/rtl-embedder.ts                     | @/lib/prisma                                     | Prisma client alias            | Use workers-owned Prisma client (avoid app alias).           |
| src/lib/regulatory-truth/retrieval/semantic-search.ts              | @/lib/prisma                                     | Prisma client alias            | Use workers-owned Prisma client (avoid app alias).           |
| src/lib/regulatory-truth/**tests**/regulatory-status-gates.test.ts | @/lib/prisma-extensions                          | Test utilities                 | Move test helpers into workers repo or shared package.       |

## C) Path/string references to RTL (non-import)

| File                                                   | Reference                                         | Impact                              | Proposed action                                      |
| ------------------------------------------------------ | ------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| src/lib/system-registry/declarations.ts                | codeRef entries under src/lib/regulatory-truth/\* | System registry points at old paths | Update codeRefs to new repo path(s).                 |
| src/lib/system-registry/harvesters/harvest-libs.ts     | comment references                                | Documentation drift                 | Update comments after split.                         |
| src/lib/system-registry/governance.ts                  | comment references                                | Documentation drift                 | Update comments after split.                         |
| src/lib/db/index.ts                                    | comment path refs                                 | Documentation drift                 | Update after split.                                  |
| src/lib/**tests**/system-registry-blast-radius.test.ts | path strings                                      | Test breakage after split           | Update to new codeRefs or move test to workers repo. |

## D) Runtime dependency inventory

### D1) RTL workers (deployed via docker-compose.workers.yml)

| Worker             | Queues (consume -> produce)                                  | DB access           | External dependencies  | Notes                                     |
| ------------------ | ------------------------------------------------------------ | ------------------- | ---------------------- | ----------------------------------------- |
| orchestrator       | scheduled -> sentinel, arbiter, release, regression-detector | public + regulatory | None                   | Drives scheduled pipeline tasks.          |
| sentinel           | sentinel -> scout                                            | public + regulatory | None                   | Discovery only.                           |
| content-scout      | scout -> router                                              | regulatory          | None                   | Deterministic content assessment.         |
| router             | router -> ocr/extract                                        | regulatory          | None                   | Budget + health-based routing.            |
| ocr                | ocr -> extract                                               | regulatory          | OCR stack + vision LLM | Uses Tesseract + optional vision model.   |
| extractor          | extract -> compose                                           | public + regulatory | OLLAMA*EXTRACT*\*      | Produces CandidateFacts.                  |
| composer           | compose -> apply                                             | public              | OLLAMA\_\*             | Generates proposals only.                 |
| apply              | apply -> review                                              | public              | None                   | Persists rules + pointers.                |
| reviewer           | review -> release                                            | public              | OLLAMA\_\*             | Auto-approval + review.                   |
| arbiter            | arbiter -> (none)                                            | public              | OLLAMA\_\*             | Resolves conflicts.                       |
| releaser           | release -> (none)                                            | public              | None                   | Publishes rules + builds knowledge graph. |
| continuous-drainer | (loop) -> extract/compose/review                             | public + regulatory | OLLAMA*EMBED*\*        | Backstop for orphaned items.              |
| scheduler          | cron -> sentinel                                             | regulatory          | None                   | Daily discovery + catch-up.               |
| content-sync       | content-sync -> (git)                                        | public (drizzle)    | GitHub API             | Writes MDX patches.                       |
| article            | article -> (none)                                            | public              | OLLAMA\_\*             | Runs article pipeline.                    |
| evidence-embedding | evidence-embedding -> (none)                                 | regulatory          | OLLAMA*EMBED*\*        | Embeddings for evidence.                  |
| embedding          | embedding -> (none)                                          | public              | OLLAMA*EMBED*\*        | Embeddings for published rules.           |
| einvoice-inbound   | (poller) -> app tables                                       | public              | ePoslovanje API        | Non-RTL worker; confirm repo ownership.   |

### D2) App background services using RTL infra

| Service              | Purpose                    | Dependencies                           | Notes                                  |
| -------------------- | -------------------------- | -------------------------------------- | -------------------------------------- |
| outbox-worker        | Outbox delivery            | Redis (currently via RTL redis helper) | Move Redis helper into app infra.      |
| system-status worker | System status refresh      | Redis + deadletter queue               | Move queue helpers into app infra.     |
| backup worker        | Scheduled backups          | Redis queues + db                      | Currently uses RTL worker base.        |
| email sync           | Email attachment ingestion | Redis + R2 + db                        | Redis helper should move to app infra. |
| rate-limit           | Security rate limiting     | Redis                                  | Redis helper should move to app infra. |

### D3) Shared infra / env vars (must stay consistent across repos)

- Redis: REDIS_URL, BULLMQ_PREFIX
- Databases: DATABASE_URL, REGULATORY_DATABASE_URL
- LLM providers: OLLAMA*\* (extract, embed, vision), OPENAI*_, DEEPSEEK\__
- GitHub: GITHUB_TOKEN (content sync)
- E-invoice: EPOSLOVANJE\_\* (if worker remains in workers repo)

## E) Deployment gaps to resolve before split

- `content-scout.worker.ts` and `router.worker.ts` exist in code but are not defined in docker-compose.workers.yml.
- `regression-detector.worker.ts`, `selector-adaptation.worker.ts`, `revalidation.worker.ts`, `consolidator.worker.ts` exist in code but are not deployed in docker-compose.workers.yml.
- If these queues are used in production, the split must include explicit worker services for them.
