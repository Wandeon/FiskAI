# TypeScript Debt Tracking

> **Status**: Active debt reduction in progress
> **Last Updated**: 2024-12-15
> **Current Error Count**: 118

## Overview

This document tracks TypeScript errors that currently exist in the codebase. The CI has been configured to run type checking as a non-blocking job to allow deployments while we systematically fix these issues.

**Important**: The `next build` step catches actual compilation errors that would break the app. The TypeScript errors tracked here are stricter type checking issues that don't prevent the app from running but should be fixed for long-term maintainability.

## Current Error Count

| Date       | Error Count | Change | Notes            |
| ---------- | ----------- | ------ | ---------------- |
| 2024-12-15 | 118         | -      | Initial tracking |

## Root Causes (by frequency)

### 1. Enum Mismatches (8 errors)

```
6x Type '"PAID"' is not assignable to type 'EInvoiceStatus'
2x Type '"APPROVED"' is not assignable to type 'ExpenseStatus'
```

**Root cause**: Code uses status values that don't exist in Prisma enums.

- `EInvoiceStatus` doesn't have `PAID` - should use `paidAt` timestamp instead
- `ExpenseStatus` doesn't have `APPROVED` - should use `PENDING` or `PAID`

**Fix**: Update queries to use correct enum values or add enums to schema.

### 2. Missing Prisma Includes (12+ errors)

```
Property 'buyer' does not exist (use buyerId or include buyer)
Property 'createdBy' does not exist (use createdById or include createdBy)
Property 'assignedTo' does not exist (use assignedToId or include assignedTo)
Property 'messages' does not exist (need to include messages relation)
```

**Root cause**: Accessing relations without including them in Prisma queries.

**Fix**: Create query helpers that explicitly include needed relations.

### 3. Decimal Type Mismatches (5+ errors)

```
Operator '<' cannot be applied to types 'Decimal' and 'number'
```

**Root cause**: Prisma returns `Decimal` objects, code tries to compare with numbers.

**Fix**: Convert to number with `Number(decimal)` or use Decimal comparison methods.

### 4. Missing Type Declarations (6+ errors)

```
Cannot find module '@prisma/client/runtime/library'
Could not find a declaration file for module 'pdf-parse'
Cannot find name 'vi' (Vitest)
```

**Fix**: Install missing `@types/*` packages, configure test globals.

### 5. Tenant Isolation Pattern (20+ errors)

```
Property 'companyId' is missing in type...
Property 'company' is missing in type...
```

**Root cause**: The Prisma extension injects `companyId` at runtime, but TypeScript can't verify this.

**Fix**: Choose and standardize on Option A (tenant-scoped wrapper) or Option B (typed helpers).

### 6. EN16931 Validator Types (13 errors)

File: `src/lib/compliance/en16931-validator.ts`
**Root cause**: Using invoice properties that don't exist on the type.

### 7. Report Generator Types (24 errors)

Files: `posd-generator.ts`, `kpr-generator.ts`, `kpr.ts`
**Root cause**: GroupBy results and aggregate types not properly typed.

## Files with Most Errors

| File                                       | Errors | Priority |
| ------------------------------------------ | ------ | -------- |
| src/lib/compliance/en16931-validator.ts    | 13     | Medium   |
| src/lib/reports/posd-generator.ts          | 11     | Low      |
| src/lib/reports/kpr-generator.ts           | 7      | Low      |
| src/lib/banking/import/processor.ts        | 7      | Medium   |
| src/lib/reports/kpr.ts                     | 6      | Low      |
| src/lib/documents/unified-query.ts         | 6      | Medium   |
| src/lib/auth.ts                            | 5      | High     |
| tests/lib/tenant-isolation.test.ts         | 5      | Low      |
| src/app/api/reports/vat-threshold/route.ts | 3      | Medium   |

## Fix Plan

### Phase 1: Quick Wins (Week 1)

- [ ] Fix enum mismatches (`PAID`, `APPROVED` status values)
- [ ] Install missing type declarations (`@types/pdf-parse`, etc.)
- [ ] Configure Vitest globals in tsconfig

### Phase 2: Query Helpers (Week 2)

- [ ] Create `src/lib/queries/ticket-queries.ts` with typed helpers
- [ ] Create `src/lib/queries/invoice-queries.ts` with typed helpers
- [ ] Replace direct Prisma calls with query helpers

### Phase 3: Decimal Handling (Week 2)

- [ ] Create decimal utility functions
- [ ] Update report generators to use proper Decimal handling

### Phase 4: Tenant Isolation (Week 3-4)

- [ ] Document chosen pattern in `docs/_meta/invariants.md`
- [ ] Implement tenant-scoped repository pattern
- [ ] Migrate action files to use repositories

### Phase 5: EN16931 Validator (Week 4)

- [ ] Update EN16931 types to match actual data shape
- [ ] Add proper type guards

## Progress Tracking

Each PR fixing TypeScript errors should:

1. Update the error count in this document
2. Note which category of errors was fixed
3. Include before/after error counts

## Related Documents

- [Tenant Isolation Pattern](../05_API/tenant-isolation.md)
- [Prisma Extensions](../03_BACKEND/prisma-extensions.md)
- [CI/CD Configuration](../.github/workflows/ci.yml)
