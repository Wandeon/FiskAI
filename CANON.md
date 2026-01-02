# FiskAI Canon Documents

> **Status:** FROZEN as of 2026-01-02
> **Authority:** Reference Implementation
> **Mode:** Maintenance with Controlled Evolution

---

## Binding Documents

The following documents define the canonical behavior of FiskAI. Any deviation is a **policy violation**, not a refactor choice.

| Document                                          | Purpose                           | Last Verified |
| ------------------------------------------------- | --------------------------------- | ------------- |
| `docs/adr/001-ddd-clean-architecture.md`          | Domain-Driven Design architecture | 2026-01-02    |
| `docs/adr/002-worker-tsconfig-split.md`           | TypeScript configuration strategy | 2026-01-02    |
| `docs/adr/003-pre-existing-ci-failures-waiver.md` | CI waiver for compliance merge    | 2026-01-02    |
| `docs/07_AUDITS/COMPLIANCE_REPORT_2026-01-02.md`  | Final compliance status           | 2026-01-02    |
| `.eslintrc.json`                                  | Architectural enforcement rules   | 2026-01-02    |
| `vitest.config.ts`                                | Coverage thresholds               | 2026-01-02    |
| `.github/workflows/ci.yml`                        | CI blocking gates                 | 2026-01-02    |

---

## AI Agent Safety Rules

**MANDATORY:** All AI agents MUST read and comply with these rules before generating code.

### Absolute Prohibitions

```
1. NEVER bypass coverage thresholds
   - Domain modules require 80% statements, 75% branches
   - Do not lower thresholds to make tests pass

2. NEVER add VAT calculations to UI
   - Use InvoiceDisplayAdapter.calculateLineDisplay()
   - Use InvoiceDisplayAdapter.calculateInvoiceTotals()

3. NEVER use floats for money
   - Use Money.fromCents(), Money.fromString()
   - Use Decimal for intermediate calculations

4. NEVER skip Zod validation
   - Every API route must call parseBody/parseQuery/parseParams
   - Every server action must validate input

5. NEVER use fire-and-forget for critical events
   - Use OutboxService.publishEvent()
   - Ensure events have handlers registered

6. NEVER push directly to main
   - Create feature branch
   - Create PR
   - Pre-push hook will block violations

7. NEVER import infrastructure in domain
   - No Prisma in src/domain/
   - No Next.js in src/domain/
   - Use repository interfaces

8. NEVER lower ESLint rule severity
   - "error" rules must stay "error"
   - Do not add eslint-disable for money/VAT rules
```

### Verification Before Commit

AI agents MUST run these commands before claiming work is complete:

```bash
# TypeScript
npx tsc --noEmit

# ESLint
npx eslint src/ --max-warnings 0

# Tests with coverage
npm test -- --coverage

# No VAT in UI
grep -r "vatRate\s*\*\|taxRate\s*\*" src/components/ src/app/ | grep -v node_modules
```

### Policy Violation Handling

If an AI agent detects a policy violation:

1. **STOP** - Do not proceed with the violating change
2. **REPORT** - Inform the user of the specific rule violated
3. **REFUSE** - Do not implement workarounds that circumvent the rule
4. **ESCALATE** - Request ADR review if the rule genuinely needs modification

---

## Controlled Evolution Process

Changes to canon documents require:

1. **ADR Proposal**: Document the change rationale in `docs/adr/`
2. **Review Period**: Minimum 24 hours for human review
3. **Explicit Approval**: Written approval from repository owner
4. **Version Update**: Update the "Last Verified" date in this file

**Emergency changes** (security fixes) may bypass the review period but must be documented retroactively within 24 hours.

---

## Reference Implementation Status

FiskAI is now a **reference implementation** demonstrating:

- Domain-Driven Design with Clean Architecture
- Money-safe financial calculations
- Transactional outbox pattern
- Fail-closed compliance verification
- AI-assisted development with guardrails

This status means:

- The architecture is considered correct and complete
- Changes should be minimal and targeted
- New features must conform to established patterns
- Deviations require explicit justification

---

_Frozen by Claude Opus 4.5 on 2026-01-02_
