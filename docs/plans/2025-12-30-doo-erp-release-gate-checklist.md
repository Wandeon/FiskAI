# D.O.O. ERP Release Gate Checklist

> **Purpose:** Executable verification checklist for accountant-grade ERP readiness.
> Each gate has a test and expected failure mode. All gates must pass for release.
>
> **Principle:** Stop measuring "% complete." Measure invariants proven at boundaries.

---

## Gate Categories

| Category             | Gates | Priority |
| -------------------- | ----- | -------- |
| Immutability         | 6     | P0       |
| Audit Trail          | 3     | P0       |
| Money Handling       | 4     | P1       |
| Period Locking       | 3     | P1       |
| Reproducibility      | 3     | P1       |
| Boundary Enforcement | 2     | P2       |

---

## P0 Gates: Release Blockers

### GATE-IMM-001: JOPPD Submission Immutability

**Invariant:** Signed/submitted JOPPD records cannot be modified or deleted.

**Test Script:**

```typescript
// test/gates/joppd-immutability.test.ts
import { db } from "@/lib/db"
import { JoppdImmutabilityError } from "@/lib/prisma-extensions"

describe("JOPPD Immutability Gate", () => {
  it("blocks update of signed JOPPD", async () => {
    const submission = await db.joppdSubmission.create({
      data: {
        companyId: testCompanyId,
        periodYear: 2025,
        periodMonth: 1,
        status: "PREPARED",
        signedXmlStorageKey: "signed/2025/01/joppd-abc123.xml",
        signedXmlHash: "abc123hash",
      },
    })

    await expect(
      db.joppdSubmission.update({
        where: { id: submission.id },
        data: { periodMonth: 2 }, // Attempting to change period
      })
    ).rejects.toThrow(JoppdImmutabilityError)
  })

  it("blocks delete of submitted JOPPD", async () => {
    const submission = await db.joppdSubmission.create({
      data: {
        companyId: testCompanyId,
        periodYear: 2025,
        periodMonth: 1,
        status: "SUBMITTED",
      },
    })

    await expect(db.joppdSubmission.delete({ where: { id: submission.id } })).rejects.toThrow(
      JoppdImmutabilityError
    )
  })

  it("allows status transition on submitted JOPPD", async () => {
    const submission = await db.joppdSubmission.create({
      data: { companyId: testCompanyId, periodYear: 2025, periodMonth: 1, status: "SUBMITTED" },
    })

    // This should succeed - status transitions are allowed
    const updated = await db.joppdSubmission.update({
      where: { id: submission.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    })
    expect(updated.status).toBe("ACCEPTED")
  })

  it("blocks JOPPD line deletion on signed submission", async () => {
    const submission = await db.joppdSubmission.create({
      data: {
        companyId: testCompanyId,
        periodYear: 2025,
        periodMonth: 1,
        status: "PREPARED",
        signedXmlStorageKey: "signed/test.xml",
        lines: {
          create: [
            {
              /* line data */
            },
          ],
        },
      },
      include: { lines: true },
    })

    await expect(
      db.joppdSubmissionLine.delete({ where: { id: submission.lines[0].id } })
    ).rejects.toThrow(JoppdImmutabilityError)
  })
})
```

**Expected Failure Mode:**

- If test fails: `JoppdImmutabilityError` not thrown
- Root cause: Missing enforcement in prisma-extensions.ts
- Fix location: `enforceJoppdImmutability()`, `enforceJoppdDeleteImmutability()`

**Verification Command:**

```bash
npx jest test/gates/joppd-immutability.test.ts --verbose
```

---

### GATE-IMM-002: Invoice Immutability After Issue

**Invariant:** Invoices with JIR or non-DRAFT status cannot have core fields modified.

**Test Script:**

```typescript
describe("Invoice Immutability Gate", () => {
  it("blocks amount change on fiscalized invoice", async () => {
    const invoice = await db.eInvoice.create({
      data: {
        companyId: testCompanyId,
        status: "FISCALIZED",
        jir: "ABC-123-DEF",
        totalAmount: new Decimal(100),
        // ... other required fields
      },
    })

    await expect(
      db.eInvoice.update({
        where: { id: invoice.id },
        data: { totalAmount: new Decimal(200) },
      })
    ).rejects.toThrow(InvoiceImmutabilityError)
  })
})
```

**Expected Failure Mode:**

- If test fails: `InvoiceImmutabilityError` not thrown
- Fix location: `enforceInvoiceImmutability()` in prisma-extensions.ts

---

### GATE-IMM-003: CalculationSnapshot Immutability

**Invariant:** Calculation snapshots are immutable once created.

**Test Script:**

```typescript
describe("CalculationSnapshot Immutability Gate", () => {
  it("blocks any update to calculation snapshot", async () => {
    const snapshot = await db.calculationSnapshot.findFirst()

    await expect(
      db.calculationSnapshot.update({
        where: { id: snapshot.id },
        data: { grossAmount: new Decimal(9999) },
      })
    ).rejects.toThrow(CalculationSnapshotImmutabilityError)
  })

  it("blocks delete of calculation snapshot", async () => {
    const snapshot = await db.calculationSnapshot.findFirst()

    await expect(db.calculationSnapshot.delete({ where: { id: snapshot.id } })).rejects.toThrow(
      CalculationSnapshotImmutabilityError
    )
  })
})
```

---

### GATE-IMM-004: Payout Immutability After Lock

**Invariant:** Locked payouts cannot have lines modified or deleted.

**Test Script:**

```typescript
describe("Payout Immutability Gate", () => {
  it("blocks payout line update when payout is LOCKED", async () => {
    const payout = await createLockedPayout()
    const line = payout.lines[0]

    await expect(
      db.payoutLine.update({
        where: { id: line.id },
        data: { grossAmount: new Decimal(9999) },
      })
    ).rejects.toThrow(PayoutStatusTransitionError)
  })

  it("blocks new snapshot creation on LOCKED payout", async () => {
    const payout = await createLockedPayout()

    await expect(
      calculateAndSnapshotPayoutLine({ payoutId: payout.id, employeeId: "..." })
    ).rejects.toThrow(/Cannot create calculation snapshot/)
  })
})
```

---

### GATE-AUD-001: Audit Trail CREATE Operations

**Invariant:** CREATE operations log full after-state.

**Test Script:**

```typescript
describe("Audit CREATE Gate", () => {
  it("logs full state on create", async () => {
    const expense = await db.expense.create({
      data: { companyId: testCompanyId, amount: new Decimal(100) /* ... */ },
    })

    // Wait for async audit queue
    await new Promise((r) => setTimeout(r, 100))

    const auditLog = await db.auditLog.findFirst({
      where: { entityId: expense.id, action: "CREATE" },
    })

    expect(auditLog).not.toBeNull()
    expect(auditLog.changes).toHaveProperty("after")
    expect(auditLog.changes.after.amount).toBe("100")
  })
})
```

---

### GATE-AUD-002: Audit Trail UPDATE Operations (with before-state)

**Invariant:** UPDATE operations log both before and after states.

**Test Script:**

```typescript
describe("Audit UPDATE Gate", () => {
  it("logs before and after state on update", async () => {
    const expense = await db.expense.create({
      data: { companyId: testCompanyId, amount: new Decimal(100), description: "Original" },
    })

    await db.expense.update({
      where: { id: expense.id },
      data: { amount: new Decimal(200), description: "Modified" },
    })

    await new Promise((r) => setTimeout(r, 100))

    const auditLog = await db.auditLog.findFirst({
      where: { entityId: expense.id, action: "UPDATE" },
      orderBy: { timestamp: "desc" },
    })

    expect(auditLog).not.toBeNull()
    expect(auditLog.changes).toHaveProperty("before")
    expect(auditLog.changes).toHaveProperty("after")
    expect(auditLog.changes.before.amount).toBe("100")
    expect(auditLog.changes.after.amount).toBe("200")
    expect(auditLog.changes.before.description).toBe("Original")
    expect(auditLog.changes.after.description).toBe("Modified")
  })
})
```

**Expected Failure Mode:**

- If `changes.before` is missing: Audit middleware not capturing before-state
- Fix location: `queueAuditLog()` and update hook in prisma-extensions.ts

---

### GATE-AUD-003: Audit Trail DELETE Operations

**Invariant:** DELETE operations log full before-state.

**Test Script:**

```typescript
describe("Audit DELETE Gate", () => {
  it("logs before state on delete", async () => {
    const expense = await db.expense.create({
      data: { companyId: testCompanyId, amount: new Decimal(100), status: "DRAFT" },
    })
    const expenseId = expense.id

    await db.expense.delete({ where: { id: expenseId } })

    await new Promise((r) => setTimeout(r, 100))

    const auditLog = await db.auditLog.findFirst({
      where: { entityId: expenseId, action: "DELETE" },
    })

    expect(auditLog).not.toBeNull()
    expect(auditLog.changes).toHaveProperty("before")
    expect(auditLog.changes.before.amount).toBe("100")
  })
})
```

---

## P1 Gates: Critical Hardening

### GATE-MON-001: No Float in Money Calculations

**Invariant:** All money calculations use Prisma.Decimal, never Number/float.

**Test Script:**

```bash
# Static analysis - should return 0 matches in calculation code
grep -rn "parseFloat\|parseFloat\|toFixed" src/lib --include="*.ts" \
  | grep -v "\.test\." \
  | grep -v "// display only" \
  | grep -v "vatRate" # VAT rate is percentage, not money
```

**Expected Failure Mode:**

- If matches found in money calculation paths: Replace with Decimal operations
- Allowed: Display formatting (`toFixed` with comment `// display only`)
- Allowed: VAT rate parsing (percentage, not currency)

---

### GATE-MON-002: Decimal Precision Consistency

**Invariant:** All money fields use consistent precision (scale: 2 for EUR).

**Test Script:**

```typescript
describe("Decimal Precision Gate", () => {
  it("preserves precision through calculation chain", async () => {
    const grossAmount = new Decimal("1234.56")
    const taxRate = new Decimal("0.25")
    const taxAmount = grossAmount.times(taxRate)
    const netAmount = grossAmount.minus(taxAmount)

    // Verify no precision loss
    expect(taxAmount.toString()).toBe("308.64")
    expect(netAmount.toString()).toBe("925.92")
    expect(grossAmount.equals(netAmount.plus(taxAmount))).toBe(true)
  })
})
```

---

### GATE-MON-003: Payout Checksum Integrity

**Invariant:** Payout control sums are MD5 of deterministic line amounts.

**Test Script:**

```typescript
describe("Payout Checksum Gate", () => {
  it("produces consistent checksum for same data", async () => {
    const payout = await createPayoutWithLines()

    const checksum1 = await computePayoutChecksum(payout.id)
    const checksum2 = await computePayoutChecksum(payout.id)

    expect(checksum1).toBe(checksum2)
  })

  it("detects tampering via checksum mismatch", async () => {
    const payout = await createPayoutWithLines()
    const originalChecksum = payout.controlSum

    // Direct DB update (bypassing middleware) to simulate tampering
    await prismaBase.$executeRaw`
      UPDATE payout_line SET gross_amount = 9999 WHERE payout_id = ${payout.id}
    `

    const recomputed = await computePayoutChecksum(payout.id)
    expect(recomputed).not.toBe(originalChecksum)
  })
})
```

---

### GATE-PER-001: Period Lock Enforcement

**Invariant:** Operations on locked periods throw PeriodLockedError.

**Test Script:**

```typescript
describe("Period Lock Gate", () => {
  it("blocks expense creation in locked period", async () => {
    await lockPeriod(testCompanyId, 2025, 1)

    await expect(
      db.expense.create({
        data: {
          companyId: testCompanyId,
          date: new Date("2025-01-15"),
          amount: new Decimal(100),
        },
      })
    ).rejects.toThrow(PeriodLockedError)
  })

  it("blocks journal entry in locked period", async () => {
    await lockPeriod(testCompanyId, 2025, 1)

    await expect(
      db.journalEntry.create({
        data: {
          companyId: testCompanyId,
          periodId: lockedPeriodId,
          status: "DRAFT",
        },
      })
    ).rejects.toThrow(PeriodLockedError)
  })
})
```

---

### GATE-REP-001: Export Reproducibility

**Invariant:** Re-running export for same period produces identical artifacts.

**Test Script:**

```typescript
describe("Export Reproducibility Gate", () => {
  it("VAT register export is reproducible", async () => {
    const period = { year: 2025, month: 1 }

    const export1 = await generateVatRegister(testCompanyId, period)
    const export2 = await generateVatRegister(testCompanyId, period)

    // Compare checksums (content hashes)
    expect(export1.contentHash).toBe(export2.contentHash)
  })

  it("Payout export is reproducible", async () => {
    const payout = await getLockedPayout()

    const export1 = await generatePayoutExport(payout.id)
    const export2 = await generatePayoutExport(payout.id)

    expect(export1.contentHash).toBe(export2.contentHash)
  })
})
```

**Expected Failure Mode:**

- If checksums differ: Non-deterministic data in export (timestamps, random IDs)
- Fix: Remove/normalize non-deterministic fields before hashing

---

### GATE-REP-002: Trial Balance Regeneration

**Invariant:** Recomputed trial balance matches stored control sums.

**Test Script:**

```typescript
describe("Trial Balance Reproducibility Gate", () => {
  it("recomputed balance matches stored", async () => {
    const period = await getClosedPeriod(testCompanyId, 2025, 1)

    const storedBalance = period.closingBalance
    const recomputed = await computeTrialBalance(testCompanyId, period.id)

    expect(recomputed.totalDebits.equals(storedBalance.totalDebits)).toBe(true)
    expect(recomputed.totalCredits.equals(storedBalance.totalCredits)).toBe(true)
  })
})
```

---

## P2 Gates: Boundary Hardening

### GATE-BND-001: GL Balance at DB Boundary

**Invariant:** Unbalanced journal entries fail at database level.

**Test Script:**

```typescript
describe("GL Balance Boundary Gate", () => {
  it("blocks unbalanced entry at DB level", async () => {
    // This tests that even raw SQL cannot create unbalanced entries
    await expect(
      prismaBase.$executeRaw`
        INSERT INTO journal_entry (id, company_id, status, total_debit, total_credit)
        VALUES (gen_random_uuid(), ${testCompanyId}, 'DRAFT', 100, 50)
      `
    ).rejects.toThrow(/balance/)
  })
})
```

**Note:** If no DB constraint exists, this gate requires adding a CHECK constraint:

```sql
ALTER TABLE journal_entry
ADD CONSTRAINT journal_entry_balanced
CHECK (total_debit = total_credit OR status = 'DRAFT');
```

---

### GATE-BND-002: Storage Retention Policy

**Invariant:** Signed artifacts have immutable retention in object storage.

**Test Script:**

```typescript
describe("Storage Retention Gate", () => {
  it("JOPPD XML has retention lock", async () => {
    const submission = await db.joppdSubmission.findFirst({
      where: { signedXmlStorageKey: { not: null } },
    })

    const objectMetadata = await r2Client.headObject({
      Bucket: process.env.R2_BUCKET,
      Key: submission.signedXmlStorageKey,
    })

    expect(objectMetadata.ObjectLockRetainUntilDate).toBeDefined()
    expect(new Date(objectMetadata.ObjectLockRetainUntilDate).getFullYear()).toBeGreaterThanOrEqual(
      new Date().getFullYear() + 7
    )
  })
})
```

---

## Gate Execution Summary

Run all gates:

```bash
npx jest test/gates/ --verbose --runInBand
```

Run specific priority:

```bash
npx jest test/gates/ --testPathPattern="P0" --verbose
```

### Gate Status Template

| Gate ID      | Description                 | Status | Last Run | Notes |
| ------------ | --------------------------- | ------ | -------- | ----- |
| GATE-IMM-001 | JOPPD Immutability          |        |          |       |
| GATE-IMM-002 | Invoice Immutability        |        |          |       |
| GATE-IMM-003 | Snapshot Immutability       |        |          |       |
| GATE-IMM-004 | Payout Immutability         |        |          |       |
| GATE-AUD-001 | Audit CREATE                |        |          |       |
| GATE-AUD-002 | Audit UPDATE (before-state) |        |          |       |
| GATE-AUD-003 | Audit DELETE                |        |          |       |
| GATE-MON-001 | No Float in Calculations    |        |          |       |
| GATE-MON-002 | Decimal Precision           |        |          |       |
| GATE-MON-003 | Payout Checksum             |        |          |       |
| GATE-PER-001 | Period Lock Enforcement     |        |          |       |
| GATE-REP-001 | Export Reproducibility      |        |          |       |
| GATE-REP-002 | Trial Balance Match         |        |          |       |
| GATE-BND-001 | GL Balance at DB            |        |          |       |
| GATE-BND-002 | Storage Retention           |        |          |       |

---

## What This Checklist Does NOT Cover

1. **Feature completeness** - Features can be incomplete if invariants are enforced
2. **UI polish** - Irrelevant to accountant-grade trust
3. **Performance** - Can be optimized post-release if invariants hold
4. **Time estimates** - Measure gates passed, not time spent

---

## Release Decision Matrix

| P0 Gates | P1 Gates  | P2 Gates  | Decision                                   |
| -------- | --------- | --------- | ------------------------------------------ |
| All PASS | All PASS  | All PASS  | Release ready                              |
| All PASS | All PASS  | Some FAIL | Release with documented limitations        |
| All PASS | Some FAIL | Any       | Conditional release (document P1 failures) |
| Any FAIL | Any       | Any       | **NO RELEASE** - fix P0 first              |

---

_Generated: 2025-12-30_
_Next review: After P0 gate implementation verification_
