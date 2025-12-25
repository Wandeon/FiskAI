# Documentation Coverage Map

> **Purpose:** Map every system segment to exactly one canonical documentation file.
>
> Last updated: 2024-12-24

---

## Coverage Summary

| Category         | Segments | Covered | Coverage |
| ---------------- | -------- | ------- | -------- |
| Architecture     | 6        | 6       | 100%     |
| Features         | 109      | 109     | 100%     |
| Operations       | 8        | 8       | 100%     |
| Regulatory Truth | 6        | 6       | 100%     |
| Meta             | 5        | 5       | 100%     |

---

## System Segment Coverage

### Architecture

| Segment             | Canonical Doc                              | Status  |
| ------------------- | ------------------------------------------ | ------- |
| System Overview     | `docs/01_ARCHITECTURE/overview.md`         | COVERED |
| Two-Layer Model     | `docs/01_ARCHITECTURE/two-layer-model.md`  | COVERED |
| Trust Guarantees    | `docs/01_ARCHITECTURE/trust-guarantees.md` | COVERED |
| Tech Stack          | `docs/01_ARCHITECTURE/overview.md`         | COVERED |
| Multi-Tenancy       | `docs/01_ARCHITECTURE/overview.md`         | COVERED |
| Domain Architecture | `CLAUDE.md`                                | COVERED |

**Legacy files absorbed:**

- `AGENTS.md` (deprecated)
- `docs/design/architecture.md` (referenced)

### Features (109 files)

| Segment          | Canonical Doc                                | Status  |
| ---------------- | -------------------------------------------- | ------- |
| Feature Registry | `docs/02_FEATURES/FEATURE_REGISTRY.md`       | COVERED |
| All Features     | `docs/02_FEATURES/features/*.md` (109 files) | COVERED |

**Legacy files absorbed:**

- `DASHBOARD_STRUCTURE.md` (deprecated)
- Various root-level feature notes (deprecated)

### Operations

| Segment               | Canonical Doc                              | Status  |
| --------------------- | ------------------------------------------ | ------- |
| Operations Runbook    | `docs/04_OPERATIONS/OPERATIONS_RUNBOOK.md` | COVERED |
| Deployment            | `CLAUDE.md`, `docs/DEPLOYMENT.md`          | COVERED |
| Monitoring            | `docs/04_OPERATIONS/OPERATIONS_RUNBOOK.md` | COVERED |
| Database Access       | `CLAUDE.md`                                | COVERED |
| Queue Management      | `CLAUDE.md`                                | COVERED |
| SSL/TLS               | `CLAUDE.md`                                | COVERED |
| Environment Variables | `CLAUDE.md`                                | COVERED |
| Worker Management     | `CLAUDE.md`                                | COVERED |

**Legacy files absorbed:**

- `QUICK_REFERENCE_DEPLOYMENT.md` (deprecated)
- `QUICK_START_MONITORING.md` (deprecated)
- `MONITORING_ENDPOINTS.md` (deprecated)

### Regulatory Truth Layer

| Segment         | Canonical Doc                    | Status  |
| --------------- | -------------------------------- | ------- |
| Overview        | `docs/05_REGULATORY/OVERVIEW.md` | COVERED |
| Pipeline        | `docs/05_REGULATORY/PIPELINE.md` | COVERED |
| Agents          | `docs/05_REGULATORY/OVERVIEW.md` | COVERED |
| Evidence System | `docs/05_REGULATORY/OVERVIEW.md` | COVERED |
| OCR Processing  | `docs/05_REGULATORY/PIPELINE.md` | COVERED |
| Monitoring      | `docs/regulatory-truth/`         | COVERED |

**Legacy files absorbed:**

- `docs/regulatory_truth/croatian-regulatory-truth-layer.md` (deprecated)
- `docs/regulatory_truth/croatian-regulatory-truth-layer-v2.md` (deprecated)
- `docs/regulatory_truth/croatian-regulatory-truth-layer-hard-facts.md` (deprecated)
- `docs/regulatory_truth/other_info.md` (deprecated)
- `docs/regulatory_truth/prisma_schema.md` (deprecated)
- `ARBITER_IMPLEMENTATION.md` (merged)
- `mfin_gov_hr_discovery_report.md` (kept)
- `porezna_discovery_report.md` (kept)

### Meta Documentation

| Segment             | Canonical Doc                  | Status  |
| ------------------- | ------------------------------ | ------- |
| Documentation Index | `docs/00_INDEX.md`             | COVERED |
| Documentation Map   | `docs/DOC-MAP.md`              | COVERED |
| Coverage Map        | `docs/DOC-COVERAGE-MAP.md`     | COVERED |
| Evidence Rules      | `docs/_meta/evidence-rules.md` | COVERED |
| Invariants          | `docs/_meta/invariants.md`     | COVERED |

### Audits

| Segment        | Canonical Doc                  | Status  |
| -------------- | ------------------------------ | ------- |
| Audit Archive  | `docs/07_AUDITS/`              | COVERED |
| Audit Playbook | `docs/_meta/audit-playbook.md` | COVERED |

**Legacy files absorbed:**

- `/audit/*.md` (22 files deprecated)
- `docs/audit/*.md` (deprecated)
- `docs/audits/*.md` (deprecated)

### Product

| Segment        | Canonical Doc                    | Status  |
| -------------- | -------------------------------- | ------- |
| Product Bible  | `docs/PRODUCT_BIBLE.md`          | COVERED |
| Module Matrix  | `docs/COMPLETE_MODULE_MATRIX.md` | COVERED |
| Business Types | `docs/BUSINESS_TYPE_MATRIX.md`   | COVERED |
| RBAC           | `docs/RBAC.md`                   | COVERED |

**Legacy files absorbed:**

- `PRODUCT_HIERARCHY.md` (merged)

### AI Features

| Segment           | Canonical Doc               | Status  |
| ----------------- | --------------------------- | ------- |
| AI Features       | `docs/AI_FEATURES.md`       | COVERED |
| AI Quick Start    | `docs/AI_QUICK_START.md`    | COVERED |
| AI Usage Tracking | `docs/AI_USAGE_TRACKING.md` | COVERED |

**Legacy files absorbed:**

- `TASK_8_AI_FEEDBACK_INTEGRATION.md` (deprecated)

### Specialized Features

| Segment             | Canonical Doc                                           | Status  |
| ------------------- | ------------------------------------------------------- | ------- |
| Fiscalization       | `docs/FISCALIZATION-INTEGRATION.md`, `FISCALIZATION.md` | COVERED |
| Bank Reconciliation | `docs/bank-reconciliation.md`                           | COVERED |
| Mobile              | `docs/mobile-*.md`                                      | COVERED |
| News System         | `docs/news-*.md`                                        | COVERED |
| Route Protection    | `docs/visibility-route-protection.md`                   | COVERED |

**Legacy files absorbed:**

- `README-FISCALIZATION.md` (deprecated)
- `NEXT_STEP_BANK_RECONCILIATION.md` (deprecated)
- `QUICK_START_BANK_RECONCILIATION.md` (deprecated)

---

## Archived Documents

These documents are historical and have been moved to `docs/_archive/`:

| Document                  | Archive Location               | Reason     |
| ------------------------- | ------------------------------ | ---------- |
| Phase implementation docs | `docs/_archive/phases/`        | Historical |
| Launch gaps               | `docs/_archive/LAUNCH_GAPS.md` | Historical |

---

## Deprecated Documents

These documents contain deprecation notices pointing to canonical docs:

| Document                             | Points To                                  |
| ------------------------------------ | ------------------------------------------ |
| `AGENTS.md`                          | `CLAUDE.md`                                |
| `DASHBOARD_STRUCTURE.md`             | `docs/02_FEATURES/features/dashboard-*.md` |
| `README-FISCALIZATION.md`            | `docs/FISCALIZATION-INTEGRATION.md`        |
| `NEXT_STEP_BANK_RECONCILIATION.md`   | `docs/bank-reconciliation.md`              |
| `QUICK_START_BANK_RECONCILIATION.md` | `docs/bank-reconciliation.md`              |
| `QUICK_REFERENCE_DEPLOYMENT.md`      | `CLAUDE.md`                                |
| `QUICK_START_MONITORING.md`          | `docs/04_OPERATIONS/OPERATIONS_RUNBOOK.md` |
| `MONITORING_ENDPOINTS.md`            | `docs/04_OPERATIONS/OPERATIONS_RUNBOOK.md` |
| `DESIGN_TEAM_README.md`              | `docs/design/`                             |
| `STATUS_AFTER_BARCODE.md`            | N/A (obsolete)                             |
| `GEMINI.md`                          | `docs/AI_*.md`                             |
| `TASK_8_AI_FEEDBACK_INTEGRATION.md`  | `docs/AI_FEATURES.md`                      |
| `docs/regulatory_truth/*.md`         | `docs/05_REGULATORY/`                      |
| `/audit/*.md`                        | `docs/07_AUDITS/`                          |

---

## Verification

To verify documentation coverage:

```bash
# Count canonical docs
find docs -name "*.md" -type f | grep -v "_archive" | grep -v deprecated | wc -l

# Check for orphaned docs (no deprecation notice, not canonical)
# This should return 0 for non-archived legacy docs
```

---

## Maintenance

When adding new documentation:

1. Check this map for existing coverage
2. Add to the appropriate canonical location
3. Update this coverage map
4. Do NOT create parallel documentation
