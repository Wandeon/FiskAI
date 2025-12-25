# Legacy Documentation Inventory

> **Generated:** 2024-12-24
> **Total Files:** 363 markdown files
> **Purpose:** Classify all documentation for consolidation

---

## Summary Statistics

| Location                 | Count | Action                     |
| ------------------------ | ----- | -------------------------- |
| Root-level `.md`         | 32    | Mixed                      |
| `docs/02_FEATURES/`      | 109   | KEEP                       |
| `docs/plans/`            | 78    | ARCHIVE                    |
| `docs/07_AUDITS/`        | 32    | KEEP                       |
| `docs/_meta/`            | 14    | UPGRADE                    |
| `docs/regulatory-truth/` | 10    | MERGE                      |
| `docs/regulatory_truth/` | 5     | MERGE → regulatory-truth   |
| `docs/reports/`          | 6     | KEEP                       |
| `docs/research/`         | 5     | KEEP                       |
| `docs/audits/`           | 4     | DEPRECATE → 07_AUDITS      |
| `docs/audit/`            | 3     | DEPRECATE → 07_AUDITS      |
| `audit/` (root)          | 22    | DEPRECATE → docs/07_AUDITS |
| `src/` READMEs           | 8     | KEEP (inline)              |
| `docs/` standalone       | ~35   | Mixed                      |

---

## Root-Level Documents (32 files)

| File                                 | Purpose               | Accuracy | Overlap With                      | Action                           |
| ------------------------------------ | --------------------- | -------- | --------------------------------- | -------------------------------- |
| `README.md`                          | Project overview      | partial  | AGENTS.md, CLAUDE.md              | UPGRADE                          |
| `CLAUDE.md`                          | AI context notes      | accurate | AGENTS.md                         | KEEP (canonical for Claude)      |
| `AGENTS.md`                          | System documentation  | outdated | CLAUDE.md, docs/DEPLOYMENT.md     | DEPRECATE (merge into CLAUDE.md) |
| `ARBITER_IMPLEMENTATION.md`          | Arbiter agent details | accurate | docs/regulatory-truth/            | MERGE → regulatory-truth         |
| `DASHBOARD_STRUCTURE.md`             | Dashboard layout      | partial  | docs/02_FEATURES/dashboard-\*     | DEPRECATE                        |
| `DESIGN_BRIEF_PHASE1_MVP.md`         | Phase 1 design        | outdated | -                                 | ARCHIVE                          |
| `DESIGN_TEAM_README.md`              | Design guidelines     | partial  | -                                 | DEPRECATE                        |
| `FISCALIZATION.md`                   | Fiscalization notes   | accurate | docs/FISCALIZATION-INTEGRATION.md | MERGE                            |
| `README-FISCALIZATION.md`            | Fiscalization readme  | outdated | FISCALIZATION.md                  | DEPRECATE                        |
| `GEMINI.md`                          | AI model notes        | outdated | -                                 | DEPRECATE                        |
| `IMPLEMENTATION-TASK-1.md`           | Task notes            | outdated | -                                 | DEPRECATE                        |
| `MODAL_SYSTEM_USAGE.md`              | Modal patterns        | accurate | -                                 | KEEP                             |
| `MONITORING_ENDPOINTS.md`            | Monitoring docs       | accurate | docs/OPERATIONS_RUNBOOK.md        | MERGE                            |
| `NEXT_STEP_BANK_RECONCILIATION.md`   | Bank recon notes      | outdated | docs/bank-reconciliation.md       | DEPRECATE                        |
| `ONBOARDING_NEW_DEVELOPER.md`        | Dev onboarding        | partial  | README.md                         | UPGRADE                          |
| `PHASE-14-CHECKLIST.md`              | Phase 14 checklist    | outdated | -                                 | ARCHIVE                          |
| `PHASE-15-SUMMARY.md`                | Phase 15 summary      | outdated | -                                 | ARCHIVE                          |
| `PHASE_16_IMPLEMENTATION.md`         | Phase 16 impl         | outdated | -                                 | ARCHIVE                          |
| `PHASE1_FEATURE_ARCHITECTURE.md`     | Phase 1 arch          | outdated | -                                 | ARCHIVE                          |
| `PHASE1_IMPLEMENTATION_CHECKLIST.md` | Phase 1 checklist     | outdated | -                                 | ARCHIVE                          |
| `PRODUCT_HIERARCHY.md`               | Product structure     | partial  | docs/PRODUCT_BIBLE.md             | MERGE                            |
| `QUICK_REFERENCE_DEPLOYMENT.md`      | Deploy quick ref      | accurate | CLAUDE.md                         | MERGE                            |
| `QUICK_START_BANK_RECONCILIATION.md` | Bank recon start      | partial  | docs/bank-reconciliation.md       | MERGE                            |
| `QUICK_START_MONITORING.md`          | Monitoring start      | accurate | MONITORING_ENDPOINTS.md           | MERGE                            |
| `STATUS_AFTER_BARCODE.md`            | Status notes          | outdated | -                                 | DEPRECATE                        |
| `TASK_6_IMPLEMENTATION_SUMMARY.md`   | Task notes            | outdated | -                                 | ARCHIVE                          |
| `TASK_8_AI_FEEDBACK_INTEGRATION.md`  | AI feedback           | outdated | docs/AI_FEATURES.md               | DEPRECATE                        |
| `TENANT_ISOLATION_TESTS.md`          | Test docs             | accurate | src/lib/**tests**/README.md       | KEEP                             |
| `UNTANGLE_PLAN.md`                   | Refactor plan         | outdated | -                                 | ARCHIVE                          |
| `mfin_gov_hr_discovery_report.md`    | Discovery report      | accurate | -                                 | MERGE → regulatory-truth         |
| `porezna_discovery_report.md`        | Discovery report      | accurate | -                                 | MERGE → regulatory-truth         |

---

## Audit Directories (CONSOLIDATION NEEDED)

### Issue: 4 separate audit locations

1. `/audit/` (22 files) - Root level
2. `/docs/audit/` (3 files)
3. `/docs/audits/` (4 files)
4. `/docs/07_AUDITS/` (32 files) - Official location

### Action: Merge all into `docs/07_AUDITS/`

| Source                 | Files | Action                              |
| ---------------------- | ----- | ----------------------------------- |
| `/audit/*.md`          | 22    | DEPRECATE with pointer to 07_AUDITS |
| `/docs/audit/*.md`     | 3     | MERGE into 07_AUDITS                |
| `/docs/audits/*.md`    | 4     | MERGE into 07_AUDITS                |
| `/docs/07_AUDITS/*.md` | 32    | KEEP (canonical)                    |

---

## Regulatory Truth Directories (CONSOLIDATION NEEDED)

### Issue: 2 separate directories with underscore/hyphen naming

1. `/docs/regulatory-truth/` (10 files) - Hyphen version
2. `/docs/regulatory_truth/` (5 files) - Underscore version

### Action: Merge all into `docs/regulatory-truth/` (hyphen is standard)

| File                                            | Source            | Action                              |
| ----------------------------------------------- | ----------------- | ----------------------------------- |
| `croatian-regulatory-truth-layer.md`            | regulatory_truth/ | MERGE                               |
| `croatian-regulatory-truth-layer-v2.md`         | regulatory_truth/ | DEPRECATE (v2 supersedes)           |
| `croatian-regulatory-truth-layer-hard-facts.md` | regulatory_truth/ | MERGE                               |
| `other_info.md`                                 | regulatory_truth/ | MERGE                               |
| `prisma_schema.md`                              | regulatory_truth/ | DEPRECATE (code is source of truth) |

---

## docs/plans/ (78 files) - ARCHIVE

Implementation plans are historical records. They should be:

- Kept for reference
- Marked as ARCHIVED
- Not part of active documentation

---

## docs/02_FEATURES/ (109 files) - KEEP

Feature documentation is structured and current. Action: KEEP with minor updates.

---

## docs/\_meta/ (14 files) - UPGRADE

Meta-documentation structure:

- `audit-playbook.md` - KEEP
- `audit-task-list.md` - KEEP
- `coverage.md` - UPGRADE
- `evidence-rules.md` - KEEP
- `invariants.md` - KEEP
- `inventory/*.md` - KEEP
- `templates/*.md` - KEEP

---

## docs/ Standalone Files (35 files)

| File                                            | Purpose          | Action                           |
| ----------------------------------------------- | ---------------- | -------------------------------- |
| `00_INDEX.md`                                   | Navigation       | UPGRADE                          |
| `AI_FEATURES.md`                                | AI capabilities  | KEEP                             |
| `AI_QUICK_START.md`                             | AI quickstart    | KEEP                             |
| `AI_USAGE_TRACKING.md`                          | AI tracking      | KEEP                             |
| `APPENDIX_1.md`                                 | Appendix         | KEEP                             |
| `bank-reconciliation.md`                        | Bank recon       | KEEP                             |
| `BUSINESS_TYPE_MATRIX.md`                       | Business types   | KEEP                             |
| `COMPLETE_MODULE_MATRIX.md`                     | Module matrix    | KEEP                             |
| `content-editor-quick-reference.md`             | Editor ref       | KEEP                             |
| `DEPLOYMENT.md`                                 | Deployment       | MERGE with CLAUDE.md ops section |
| `FISCALIZATION-INTEGRATION.md`                  | Fiscalization    | KEEP                             |
| `LAUNCH_GAPS.md`                                | Launch gaps      | ARCHIVE                          |
| `MARKETING_CONTENT_AUDIT.md`                    | Marketing audit  | KEEP                             |
| `MARKETING_CONTENT_AUDIT_RUNBOOK.md`            | Audit runbook    | KEEP                             |
| `mobile-quick-reference.md`                     | Mobile ref       | KEEP                             |
| `mobile-responsiveness.md`                      | Mobile design    | KEEP                             |
| `MODULE_ANALYSIS.md`                            | Module analysis  | KEEP                             |
| `monitoring-architecture.md`                    | Monitoring arch  | MERGE with OPERATIONS_RUNBOOK    |
| `news-*.md`                                     | News system docs | KEEP                             |
| `OPERATIONS_RUNBOOK.md`                         | Operations       | KEEP (canonical)                 |
| `phase-14-summary.md`                           | Phase summary    | ARCHIVE                          |
| `PRODUCT_BIBLE.md`                              | Product bible    | UPGRADE (canonical product doc)  |
| `RBAC.md`                                       | Access control   | KEEP                             |
| `regulatory-truth-monitoring-implementation.md` | RT monitoring    | MERGE → regulatory-truth/        |
| `visibility-route-protection.md`                | Route protection | KEEP                             |

---

## src/ READMEs (8 files) - KEEP

Inline documentation in source directories. These should remain with their code.

| File                                                | Purpose           |
| --------------------------------------------------- | ----------------- |
| `src/app/(admin)/README.md`                         | Admin portal docs |
| `src/app/(staff)/README.md`                         | Staff portal docs |
| `src/app/api/health/README.md`                      | Health API docs   |
| `src/components/ui/primitives/badge-examples.md`    | Badge examples    |
| `src/lib/regulatory-truth/agents/ARBITER_README.md` | Arbiter docs      |
| `src/lib/regulatory-truth/QUICK_START.md`           | RT quickstart     |
| `src/lib/regulatory-truth/scripts/README.md`        | Scripts docs      |
| `src/lib/__tests__/README.md`                       | Tests docs        |

---

## Critical Issues Identified

### 1. AGENTS.md Contains Sensitive Credentials

- **Issue:** API tokens and login credentials are exposed inline
- **Action:** Remove credentials, move to CLAUDE.md with env var references

### 2. Outdated URLs in AGENTS.md

- **Issue:** References `metrica.hr` instead of current `fiskai.hr`
- **Action:** Update or deprecate

### 3. Duplicate Concept Explanations

- Deployment: CLAUDE.md, AGENTS.md, docs/DEPLOYMENT.md, QUICK_REFERENCE_DEPLOYMENT.md
- Fiscalization: FISCALIZATION.md, README-FISCALIZATION.md, docs/FISCALIZATION-INTEGRATION.md
- Bank Reconciliation: bank-reconciliation.md, QUICK_START_BANK_RECONCILIATION.md, NEXT_STEP_BANK_RECONCILIATION.md
- Audits: 4 directories with overlapping content

### 4. Missing Directories Referenced in 00_INDEX.md

- `01_ARCHITECTURE/` exists but may be empty
- `03_CODEMAP/` exists but may be empty

---

## Next Steps

1. Create `docs/DOC-MAP.md` defining canonical structure
2. Execute merges and deprecations
3. Update README.md as entry point
4. Reconcile CLAUDE.md and AGENTS.md
5. Build coverage map
6. Add CI guards
