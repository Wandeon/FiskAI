# Next Step: Bank Reconciliation Implementation

## ✅ Barcode Complete

**2D Barcode (EPC/SEPA QR) is now live:**
- Database: `bankAccount` + `includeBarcode` fields added to `EInvoice`
- Form: IBAN input (defaults to company IBAN) + toggle checkbox
- PDF: QR code renders in footer with "Plaćanje QR kodom" label
- Helper: `src/lib/barcode.ts` generates EPC payload (EPC069-12 v2.7 standard)
- Status: ✅ Ready for testing with Croatian banking apps (mBanking, Erste, OTP, etc.)

**Next milestone:** Bank Statement Reconciliation

---

## 🎯 What's Missing (Before Customer Onboarding)

| Feature | Status | Notes |
|---------|--------|-------|
| 2D Barcode | ✅ DONE | EPC/SEPA QR format, tested with QR readers |
| FINA Real API | ⏳ BLOCKED | Waiting for government API credentials |
| **Bank Reconciliation** | ❌ NOT STARTED | This is next priority |

---

## 🏦 Bank Reconciliation: Quick Overview

**Problem:** Accountants manually match payments received in bank statements to invoices. Time-consuming, error-prone.

**Solution:**
1. Upload bank CSV export
2. System auto-matches transactions to unpaid invoices (80%+ accuracy)
3. Accountant reviews mismatches, clicks "Reconcile"
4. Invoice marked as paid with actual payment date

**Impact:** Enables cash-basis tax compliance (critical for Croatian paušalni obrtnici).

---

## 📋 Implementation Checklist (High-Level)

### Phase 1: CSV Parser (1-2 days)
- [ ] Create `src/lib/banking/csv-parser.ts`
  - Parse 5+ Croatian bank CSV formats (Erste, Raiffeisenbank, moja banka, Splitska, OTP)
  - Extract: date, reference (invoice #), amount, description
  - Handle different date formats, currency symbols, multi-column layouts
  - Return: `ParsedTransaction[]` with normalized fields
- [ ] Write unit tests (10+ CSV samples from different banks)
- [ ] Test with real bank exports from your own accounts

### Phase 2: Matching Algorithm (2-3 days)
- [ ] Create `src/lib/banking/reconciliation.ts`
  - Match transactions to unpaid invoices using:
    - **Exact match** (100 confidence): Invoice # in transaction reference
    - **Amount + date** (85 confidence): Amount matches, within 3 days
    - **Partial match** (70 confidence): Amount within ±5%, within 5 days
    - **No match** (0 confidence): No criteria met
  - Handle edge cases: Multiple invoices same day, rounding, currency conversion
  - Return: `ReconciliationResult[]` with confidence scores + reasons
- [ ] Write unit tests (30+ scenarios: exact, partial, ambiguous, no match)
- [ ] Test matching accuracy with real data (target 80%+ correct)

### Phase 3: Database & API (1-2 days)
- [ ] Create `BankTransaction` table (stores parsed + matched transactions)
- [ ] Create `BankImport` table (tracks which CSV was imported)
- [ ] Server action: `importBankStatement(file, bankName)` → parses + matches + saves
- [ ] Server action: `reconcileTransaction(transactionId, invoiceId)` → updates `EInvoice.paidAt`
- [ ] Add foreign key: `BankTransaction.matchedInvoiceId` → `EInvoice.id`

### Phase 4: Upload UI (1-2 days)
- [ ] Create/update `src/app/(dashboard)/banking/import/import-form.tsx`
  - File input (drag-drop + click)
  - Bank selector dropdown
  - Preview table (first 10 rows of CSV)
  - Submit button → calls server action
- [ ] Display results: "X matched, Y unmatched, Z partial"
- [ ] Error handling: File parse errors, invalid format

### Phase 5: Reconciliation Dashboard (2-3 days)
- [ ] Create `src/app/(dashboard)/banking/reconciliation/page.tsx`
  - Results table: Date | Reference | Amount | Matched Invoice # | Confidence | Action
  - Row coloring: Green (matched), Yellow (partial), Red (unmatched)
  - Filters: Status, date range, confidence threshold
  - Actions: "Reconcile" button (updates `EInvoice.paidAt`), "Skip", "Select different invoice"
  - Bulk action: "Reconcile all >80% confidence"
  - Pagination + sorting
- [ ] Update banking dashboard with reconciliation stats
- [ ] Display outstanding balance (sum of unpaid invoices)

---

## 🔧 Technical Requirements

### Dependencies
- No new npm packages needed (all existing)
- Uses: Prisma (ORM), TypeScript, React Hook Form (if needed for forms)

### Database Migrations
```bash
# After creating new tables, run:
npx prisma migrate dev --name add_bank_reconciliation
```

### Files to Create/Modify
**NEW:**
- `src/lib/banking/csv-parser.ts` (~200 lines)
- `src/lib/banking/reconciliation.ts` (~250 lines)
- `src/app/(dashboard)/banking/import/import-form.tsx` (or update existing)
- `src/app/(dashboard)/banking/reconciliation/page.tsx`

**MODIFY:**
- `prisma/schema.prisma` (add 2 new models + relation)
- `src/app/(dashboard)/banking/page.tsx` (add import link + stats)

---

## 📊 Acceptance Criteria (Quick)

Feature is **DONE** when:

✅ CSV Parser
- [ ] Parses 10+ real CSVs from 5+ banks correctly
- [ ] Handles edge cases: special chars, missing reference, negative amounts
- [ ] Unit tests pass

✅ Matching Algorithm
- [ ] Matches 80%+ of transactions to invoices (test with 50+ transactions)
- [ ] Exact matches: 100 confidence
- [ ] Amount+date matches: 85 confidence
- [ ] Partial matches: 70 confidence
- [ ] Unmatched clearly identified
- [ ] Unit tests pass (30+ scenarios)

✅ Upload & Results
- [ ] Upload CSV → see preview → import → see results
- [ ] Matched rows have green background + "Reconcile" button
- [ ] Unmatched rows have red background + dropdown to pick invoice
- [ ] Partial rows have yellow background + accept/reject option

✅ Reconciliation Action
- [ ] Click "Reconcile" → `EInvoice.paidAt` updates to bank transaction date
- [ ] Invoice appears in "Paid" list
- [ ] Dashboard outstanding balance decreases
- [ ] AuditLog records the reconciliation action

---

## 🧪 Testing Strategy

1. **Unit Tests:** CSV parser (10+ bank formats) + matching (30+ scenarios)
2. **Integration Tests:** Upload CSV → parse → match → save to DB
3. **E2E Test:** Upload CSV → review results → reconcile transaction → verify invoice.paidAt updated
4. **Manual Test:** Real bank CSVs from your own accounts

---

## ⏱️ Estimated Timeline

| Phase | Days | Est. Lines of Code |
|-------|------|--------------------|
| CSV Parser | 1-2 | 200 |
| Matching | 2-3 | 250 |
| Database | 1-2 | 100 |
| Upload UI | 1-2 | 150 |
| Reconciliation Page | 2-3 | 200-300 |
| **Total** | **~10 days** | **~900-1100** |

**Parallel work possible:** CSV Parser (backend) + UI design (frontend) at same time.

---

## 🚀 How to Start

### Step 1: Read the Detailed Brief (If New)
```bash
cat PHASE1_IMPLEMENTATION_CHECKLIST.md | grep -A100 "3️⃣"
```
(Skip if you already have the full checklist)

### Step 2: Create CSV Parser Skeleton
```bash
# Create the file with basic structure
touch src/lib/banking/csv-parser.ts

# Start with this outline:
interface ParsedTransaction {
  date: Date
  reference: string
  amount: Decimal
  description: string
  type: 'debit' | 'credit'
}

export function parseCSV(content: string, bankName: string): ParsedTransaction[] {
  // TODO: Implement bank-specific parsing
  return []
}
```

### Step 3: Write CSV Tests First (TDD)
```bash
# Create 5 sample CSVs:
# - test-data/erste-sample.csv
# - test-data/raiffeisenbank-sample.csv
# - test-data/moja-banka-sample.csv
# etc.

# Write tests that assert correct parsing
npm run test -- csv-parser.test.ts
```

### Step 4: Implement Parser
Parse each bank format correctly. Test against real CSVs.

### Step 5: Create Matching Algorithm
Similar TDD approach: write tests first, implement matching logic.

### Step 6: Database + API
Add tables, create server actions, wire up to frontend.

### Step 7: UI
Upload form + reconciliation dashboard.

---

## 📞 Questions Before Starting?

Clarify with product (you):

1. **Confidence threshold:** What score auto-approves reconciliation? (70%? 80%? 90%?)
2. **Amount tolerance:** Allow ±5% difference, or stricter?
3. **Currency:** How to handle invoices in EUR, payments in HRK? Use fixed rate or historical?
4. **New status:** Create `PAID_VERIFIED` status, or update existing `PAID` status?
5. **Bulk approval:** Should "Reconcile all >80%" auto-confirm, or show confirmation dialog?

---

## 🎯 Why This Matters

Without bank reconciliation, accountants can't:
- Verify cash receipts for tax compliance
- Track which payments were received & when
- Generate accurate VAT reports (need actual payment dates)
- Identify late payers

**This feature unblocks Phase 2 (accountant workflows).**

---

## 🔗 Reference Files

- Checklist: `PHASE1_IMPLEMENTATION_CHECKLIST.md` (Section 3️⃣)
- Architecture: `PHASE1_FEATURE_ARCHITECTURE.md` (Bank Reconciliation section)
- Database schema: `prisma/schema.prisma` (reference existing Contact, EInvoice models)
- Existing banking UI: `src/app/(dashboard)/banking/` (structure already exists)

---

## ✨ Ready to Start?

1. Review CSV samples from your own bank accounts
2. Sketch the matching algorithm on whiteboard
3. Create csv-parser.ts skeleton
4. Write failing tests
5. Implement until tests pass

Good luck! 🚀