# Multi-Company Test Coverage Gap Analysis

**Date:** 2026-01-08
**Author:** Claude (Automated Audit)
**Status:** Review Required

## Executive Summary

The test suite has **strong tenant isolation tests** at the Prisma middleware level and basic company switching coverage, but **lacks integration tests for complex multi-company scenarios**. A broken system could pass CI while still having critical bugs in user-facing multi-company workflows.

---

## Current Test Coverage (Strengths)

| Area | Coverage | Files |
|------|----------|-------|
| Tenant isolation (AsyncLocalStorage) | Good | `src/lib/__tests__/tenant-isolation.test.ts` (652 lines) |
| Company switching DB operations | Basic | `src/__tests__/company-defaults-actions.test.ts` |
| Legal form validation | Good | `src/domain/identity/__tests__/LegalForm.test.ts` |
| Worker tenant enforcement | Good | `src/lib/integration/__tests__/worker-lockdown.test.ts` |
| Admin tenant health metrics | Good | `src/__tests__/admin/tenant-health.db.test.ts` |
| Module access control | Good | `src/lib/modules/__tests__/access.test.ts`, `src/__tests__/integration/multi-role.db.test.ts` |

**Total multi-company related test files:** 24
**Total lines of multi-company tests:** ~5,000+

---

## Critical Missing Test Cases

### 1. One User, Two Companies, Different Legal Forms

**Gap:** No tests verify a single user managing two companies with different legal forms (e.g., OBRT_PAUSAL + DOO) where business logic differs significantly.

#### Missing Tests

| Test Case | Risk | Description |
|-----------|------|-------------|
| Cross-company threshold isolation | HIGH | User with Company A (OBRT_PAUSAL, 60k limit) and Company B (DOO, no limit). Switching from A to B should NOT apply 60k threshold warnings. |
| Module entitlement per legal form | HIGH | `pausalni` module only available for OBRT_PAUSAL, not DOO. No test verifies this enforcement across companies. |
| VAT calculation per legal form | MEDIUM | OBRT_PAUSAL is always non-VAT payer. DOO may or may not be. Invoice creation must respect per-company settings. |
| Invoice creation across companies | HIGH | Creating invoice in Company A, switching to B, creating invoice in B. Each invoice must have correct `companyId`. |
| Dashboard metrics isolation | MEDIUM | Viewing A shows A's revenue/limits, not B's. No cross-company metric bleed. |
| Onboarding flow per legal form | LOW | OBRT_PAUSAL requires Step 5 (pausalni profile). DOO does NOT require Step 5. |

#### Example Test Scenario

```typescript
describe("One user, two companies, different legal forms", () => {
  it("does not apply pausalni 60k threshold to DOO company", async () => {
    // Setup: User owns both OBRT_PAUSAL (Company A) and DOO (Company B)
    // Company A has 55k revenue (approaching 60k limit)
    // Company B has 200k revenue (no limit for DOO)

    // Switch to Company B
    await switchCompany(companyB.id)

    // Verify: No threshold warning for Company B
    const health = await getTenantDetail(companyB.id)
    expect(health.flags).not.toContain("approaching-limit")
    expect(health.flags).not.toContain("critical-limit")
  })
})
```

---

### 2. Rapid Company Switching

**Gap:** Only one basic `switchCompany` test exists in `company-defaults-actions.test.ts`. No tests for race conditions, rapid switching, or mid-operation switches.

#### Missing Tests

| Test Case | Risk | Description |
|-----------|------|-------------|
| Rapid sequential switches | HIGH | Switch company twice in <100ms. Only final company should be active. No stale `companyId` references. |
| Concurrent switch calls (race condition) | CRITICAL | Two parallel switch requests: A→B and A→C. Must result in exactly one `isDefault=true` per user. |
| Switch during in-flight API request | HIGH | Request started with Company A context. User switches to B before response. Response must still be scoped to A (snapshot at request start). |
| Switch with pending form state | MEDIUM | Form editing invoice for Company A. Switch to Company B. Submit should fail or warn (stale company context). |
| isDefault integrity after N switches | HIGH | Verify exactly ONE `CompanyUser.isDefault=true` per user after N rapid switches. |

#### Example Test Scenario

```typescript
describe("Rapid company switching", () => {
  it("handles concurrent switch requests without corrupting isDefault", async () => {
    // Setup: User has access to companies A, B, C
    // Currently on A (isDefault=true)

    // Trigger two concurrent switches
    const [result1, result2] = await Promise.all([
      switchCompany(companyB.id),
      switchCompany(companyC.id),
    ])

    // Verify: Exactly one default
    const companyUsers = await db.companyUser.findMany({
      where: { userId: user.id, isDefault: true }
    })
    expect(companyUsers).toHaveLength(1)
  })
})
```

---

### 3. Background Job Execution After Switching

**Gap:** Worker tests (`worker-lockdown.test.ts`) verify tenant enforcement but don't test job continuity when user switches companies.

#### Missing Tests

| Test Case | Risk | Description |
|-----------|------|-------------|
| Job executes with queued company context | CRITICAL | Job queued for Company A, user switches to B, job executes. Job MUST execute with Company A context (snapshot at queue time). |
| Fiscal job isolation after switch | CRITICAL | Queue fiscalization job for Company A. Switch to Company B. Job success writes to Company A's records, not B's. |
| Backup job isolation | HIGH | Schedule backup for Company A. Switch to Company B. Backup exports A's data, not B's. |
| E-invoice polling isolation | HIGH | `eposlovanje-inbound-poller` runs for Company A. User switched to B hours ago. Poller only fetches A's invoices. |
| Job failure scoping | MEDIUM | Job for Company A fails. Error metrics/alerts are scoped to A. Company B's health metrics unchanged. |

#### Example Test Scenario

```typescript
describe("Background job company isolation", () => {
  it("executes job with original company context after user switches", async () => {
    // Setup: Queue backup job for Company A
    const job = await backupQueue.add("backup", {
      companyId: companyA.id,
      userId: user.id
    })

    // User switches to Company B
    await switchCompany(companyB.id)

    // Process the job
    await processBackupJob(job)

    // Verify: Backup contains Company A data, not B
    const backup = await getBackupResult(job.id)
    expect(backup.company.id).toBe(companyA.id)
    expect(backup.invoices.every(i => i.companyId === companyA.id)).toBe(true)
  })
})
```

---

### 4. Additional Critical Gaps

#### Session Context Persistence

| Test Case | Risk |
|-----------|------|
| Browser refresh preserves active company | MEDIUM |
| New tab inherits correct company context | MEDIUM |
| Session expiry doesn't corrupt company state | LOW |

#### Multi-Company Permission Matrix

| Test Case | Risk |
|-----------|------|
| User is OWNER of A, VIEWER of B - permissions enforced per company | HIGH |
| Actions available differ after switching to lower-permission company | HIGH |
| Audit logs show correct actor+company pairs | MEDIUM |

#### Data Integrity Across Companies

| Test Case | Risk |
|-----------|------|
| Contact created in A is NOT visible in B | CRITICAL |
| Product SKU uniqueness is per-company, not global | HIGH |
| Invoice number sequence is per-company | HIGH |
| Bank account ownership is per-company | HIGH |

---

## Scenarios That Would Pass CI But Fail in Production

1. **Global state corruption:** A singleton caching `currentCompanyId` would work in tests (single company per test) but fail with real users switching companies.

2. **Async context loss:** Using `setTimeout` or `setImmediate` without `runWithTenant` wrapper loses tenant context. Not currently tested.

3. **Job payload missing companyId:** If a job payload relies on session context instead of explicit ID stored at queue time, switching mid-job breaks isolation.

4. **Legal form module mismatch:** Enabling `pausalni` module for a DOO company should be rejected. No test verifies this constraint.

5. **Threshold calculation across companies:** If revenue threshold code accidentally sums invoices without company filter, pausalni users see wrong limits.

6. **Prisma middleware bypass:** Raw SQL queries or `$queryRaw` bypass tenant isolation middleware. No test verifies these paths are blocked or properly filtered.

---

## Recommended Test File Structure

```
src/__tests__/
├── multi-company/
│   ├── legal-form-differences.db.test.ts    # P1
│   ├── rapid-switching.db.test.ts           # P0
│   ├── permission-matrix.db.test.ts         # P1
│   └── data-isolation.db.test.ts            # P0
├── background-jobs/
│   ├── job-company-isolation.db.test.ts     # P0
│   └── job-switch-resilience.test.ts        # P1
└── e2e/
    ├── multi-company-workflow.spec.ts       # P2
    └── company-switch-ui.spec.ts            # P2
```

---

## Priority Matrix

| Priority | Test Suite | Risk Level | Effort |
|----------|------------|------------|--------|
| **P0** | Background job company isolation | Data corruption | Medium |
| **P0** | Rapid switching race conditions | Database integrity | Medium |
| **P0** | Cross-company data isolation | Data leak | Low |
| **P1** | One user, two legal forms | Wrong business logic | Medium |
| **P1** | Permission matrix across companies | Security | Medium |
| **P2** | Session persistence | UX | Low |
| **P2** | E2E multi-company workflows | Confidence | High |

---

## Acceptance Criteria for Closure

- [ ] P0 test suites implemented and passing
- [ ] P1 test suites implemented and passing
- [ ] No flaky tests in multi-company suite
- [ ] CI runs multi-company DB tests in isolated tenant contexts
- [ ] Documentation updated with multi-company testing patterns

---

## References

- `src/lib/__tests__/tenant-isolation.test.ts` - Current tenant isolation tests
- `src/__tests__/company-defaults-actions.test.ts` - Current company switching tests
- `src/lib/integration/__tests__/worker-lockdown.test.ts` - Worker tenant enforcement
- `src/lib/actions/company-switch.ts` - Production company switch implementation
- `CLAUDE.md` - Agent operating contract and test taxonomy
