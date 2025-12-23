# Regulatory Truth Layer Issue Backlog (2025-12-22)

## Context

- Environment: local staging container on `http://localhost:3002`
- DB: `postgresql://fiskai@localhost:5434/fiskai`
- Evidence artifacts: `docs/regulatory-truth/audit-artifacts/2025-12-22/`

---

## RTL-001

- Severity: P0
- Component: Assistant
- Title: Assistant answers lack rule/evidence citations (INV-9)
- Steps to reproduce:
  1. Run: `curl -s -N -m 15 http://localhost:3002/api/assistant/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Koja je stopa PDV-a?"}]}'`
- Expected: Answer cites rule ID + evidence URL + exact quote + fetch timestamp.
- Actual: Free-text answer with no rule/evidence citations.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/assistant_vat_response.txt`
- Root cause hypothesis: `/api/assistant/chat` uses static system prompt and does not query regulatory rules or enforce citation format.
- Fix suggestion: Route assistant through regulatory rule retrieval + citation renderer; block responses without citations.
- Acceptance criteria: 95%+ assistant responses include rule ID + evidence URL + exact quote + fetch timestamp; automated test suite verifies this.

## RTL-002

- Severity: P0
- Component: Releaser
- Title: Release content hash not reproducible (INV-8)
- Steps to reproduce:
  1. Run: `DATABASE_URL=... npx tsx /home/admin/FiskAI/tmp/release-hash-check.ts`
- Expected: Stored release `contentHash` matches computed hash from release rules.
- Actual: Stored hash != computed hash.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/release_hash_check.json` (releaseId `cmjh8of2o002bfgwaym3i0dz6`)
- Root cause hypothesis: Release hash computed from mutable rules; no snapshot stored.
- Fix suggestion: Store immutable release bundle (rules snapshot) and compute hash from that snapshot.
- Acceptance criteria: Recompute hash from snapshot matches stored hash; repeatable across reruns.

## RTL-003

- Severity: P0
- Component: Extractor / Traceability
- Title: Published rules reference quotes not present in evidence rawContent (INV-2, INV-3)
- Steps to reproduce:
  1. Run query in `docs/regulatory-truth/audit-artifacts/2025-12-22/published_quote_not_in_rawcontent.txt`.
- Expected: `exactQuote` is literal substring of stored `rawContent` or canonicalization is stored and referenced.
- Actual: 14 published rule pointers have quotes not present in rawContent.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/published_quote_not_in_rawcontent.txt`
- Root cause hypothesis: Quotes are constructed from JSON fields (e.g., exchange rates) without storing canonicalized evidence or extraction path.
- Fix suggestion: Store canonicalized evidence for JSON sources or include JSON path + raw field value; validate quote containment before publish.
- Acceptance criteria: 0 published pointers fail quote-in-rawContent check OR canonicalization metadata is stored and verified.

## RTL-004

- Severity: P0
- Component: Reviewer / Releaser
- Title: T0 rules published without approvedBy or approvedAt (INV-7)
- Steps to reproduce:
  1. Run query in `docs/regulatory-truth/audit-artifacts/2025-12-22/t0_published_no_approver.txt`.
- Expected: T0 rules require human approval or auto-approval attribution before publish.
- Actual: T0 rules are PUBLISHED with `approvedBy` null.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/t0_published_no_approver.txt`
- Root cause hypothesis: Review gate not enforced in publish path; `runReviewer` does not set `approvedBy` on approval.
- Fix suggestion: Enforce approval gate in releaser and database constraint; require `approvedBy` for T0/T1 rules.
- Acceptance criteria: No T0/T1 PUBLISHED rules without `approvedBy`; release rejects rules lacking approval metadata.

## RTL-005

- Severity: P0
- Component: Composer / DSL
- Title: Invalid appliesWhen DSL for 13 rules; evaluation fails
- Steps to reproduce:
  1. Run: `DATABASE_URL=... npx tsx /home/admin/FiskAI/tmp/check-applies-when.ts`
- Expected: All rules parse with `parseAppliesWhen`.
- Actual: 13 rules fail parsing (legacy DSL format).
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/applieswhen_check.json`
- Root cause hypothesis: Composer emits legacy DSL (`{"and":[{"eq":[...]}]}`) instead of current `{op: ...}` format.
- Fix suggestion: Migrate legacy DSL to current schema; enforce schema validation at write time.
- Acceptance criteria: Invalid count = 0; evaluation endpoint applies all PUBLISHED rules without parse errors.

## RTL-006

- Severity: P1
- Component: Monitoring / Redis
- Title: `/api/regulatory/status` and `/api/regulatory/metrics` hang (Redis misconfig)
- Steps to reproduce:
  1. `timeout 8s curl -s http://localhost:3002/api/regulatory/status`
  2. `timeout 8s curl -s http://localhost:3002/api/regulatory/metrics`
- Expected: JSON/text responses within 2s.
- Actual: Requests time out.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/regulatory_status_response.exitcode`, `docs/regulatory-truth/audit-artifacts/2025-12-22/regulatory_metrics_response.exitcode`, `docs/regulatory-truth/audit-artifacts/2025-12-22/app_container_tail.log`
- Root cause hypothesis: App container uses default `REDIS_URL=redis://localhost:6379`, which is incorrect inside container.
- Fix suggestion: Set `REDIS_URL=redis://fiskai-redis:6379` in container env; add request timeouts.
- Acceptance criteria: Endpoints return queue status in <2s and no ECONNREFUSED logs.

## RTL-007

- Severity: P1
- Component: Releaser
- Title: Release type/version mismatch vs risk tiers
- Steps to reproduce:
  1. Review `docs/regulatory-truth/audit-artifacts/2025-12-22/release_risk_tiers.txt`.
- Expected: T2-only releases bump PATCH (e.g., 1.0.1) and `releaseType=patch`.
- Actual: T2-only release recorded as `minor` (version 1.1.0).
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/release_risk_tiers.txt`
- Root cause hypothesis: Releaser trusts LLM `release_type` without validating risk-tier rule.
- Fix suggestion: Override LLM release_type if it conflicts with risk-tier policy.
- Acceptance criteria: ReleaseType matches computed policy for all releases.

## RTL-008

- Severity: P1
- Component: Sentinel / Evidence
- Title: Evidence idempotency failure (duplicate URL+hash rows)
- Steps to reproduce:
  1. Check `docs/regulatory-truth/audit-artifacts/2025-12-22/evidence_dupes.txt`.
- Expected: No duplicate evidence rows for unchanged content.
- Actual: Duplicate for `Misljenja_Upute.aspx` with identical `contentHash`.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/evidence_dupes.txt`, `docs/regulatory-truth/audit-artifacts/2025-12-22/evidence_dedup_rate.txt`
- Root cause hypothesis: Sentinel inserts without dedup check for URL+hash.
- Fix suggestion: Enforce unique constraint on `(url, contentHash)` or pre-insert dedup logic.
- Acceptance criteria: Duplicate_rows = 0 on rerun; idempotency test passes.

## RTL-009

- Severity: P1
- Component: Composer / Reviewer
- Title: Rule in PENDING_REVIEW without source pointers
- Steps to reproduce:
  1. Review `docs/regulatory-truth/audit-artifacts/2025-12-22/rules_without_pointers.txt`.
- Expected: Rules must have source pointers before review.
- Actual: `fiskalizacija-datum-primjene` has no pointers.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/rules_without_pointers.txt`
- Root cause hypothesis: Rule created manually or composer not validating pointer linkage.
- Fix suggestion: Block review/publish if rule has 0 pointers; add DB constraint or validation.
- Acceptance criteria: 0 rules with missing pointers.

## RTL-010

- Severity: P1
- Component: Sentinel / Scheduler
- Title: Discovery latency extremely high; all sources overdue (freshness risk)
- Steps to reproduce:
  1. Check `docs/regulatory-truth/audit-artifacts/2025-12-22/discovery_latency.txt`.
  2. Check `docs/regulatory-truth/audit-artifacts/2025-12-22/sources_needing_check.txt`.
- Expected: Mean latency within scheduled interval; only a subset overdue.
- Actual: Mean latency ~290k minutes; all sources due.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/discovery_latency.txt`, `docs/regulatory-truth/audit-artifacts/2025-12-22/sources_needing_check.txt`
- Root cause hypothesis: Scheduler/cron not running or `lastFetchedAt` not updated correctly.
- Fix suggestion: Verify cron service and update `lastFetchedAt` per run; add alert when overdue >20%.
- Acceptance criteria: sources_needing_check < 10% and latency within SLA.

## RTL-011

- Severity: P2
- Component: Knowledge Graph
- Title: Knowledge graph edges not populated
- Steps to reproduce:
  1. Check `docs/regulatory-truth/audit-artifacts/2025-12-22/graph_edges_count.txt`.
- Expected: Graph edges exist for supersedes/conflicts/exceptions.
- Actual: `GraphEdge` count = 0, supersedes = 0.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/graph_edges_count.txt`
- Root cause hypothesis: Edge creation not implemented or disabled.
- Fix suggestion: Create edges during composer/reviewer/arbiter flows; add tests.
- Acceptance criteria: Graph edges exist for at least 1 published rule with version lineage.

## RTL-012

- Severity: P2
- Component: Arbiter / Conflict Handling
- Title: Conflict handling unverified (no conflicts recorded)
- Steps to reproduce:
  1. Review `docs/regulatory-truth/audit-artifacts/2025-12-22/conflict_rate.txt`.
- Expected: Conflicting rules create `RegulatoryConflict` and escalation to Arbiter.
- Actual: 0 conflicts recorded; behavior unverified.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/conflict_rate.txt`
- Root cause hypothesis: Conflict detection not triggered or missing test fixtures.
- Fix suggestion: Add synthetic conflict tests and conflict monitors; log Arbiter decisions.
- Acceptance criteria: Automated tests create conflicts with stored rationale + graph edges.

## RTL-013

- Severity: P2
- Component: Extractor / Composer
- Title: Elevated agent failure rates in last 24h
- Steps to reproduce:
  1. Review `docs/regulatory-truth/audit-artifacts/2025-12-22/agent_runs_24h.txt`.
- Expected: Failure rate under 5% per agent.
- Actual: Extractor failed 6/52; Composer failed 8/22 in last 24h.
- Evidence: `docs/regulatory-truth/audit-artifacts/2025-12-22/agent_runs_24h.txt`
- Root cause hypothesis: Model prompt brittleness or input format mismatch (sitemap/listing pages).
- Fix suggestion: Filter non-doc evidence before extraction; add retries and fallback model.
- Acceptance criteria: Failure rate < 5% sustained over 7 days.
