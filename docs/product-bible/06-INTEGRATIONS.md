# Integrations

[← Back to Index](./00-INDEX.md)

---

## 12. Integration Ecosystem

### 12.1 External Systems

| System        | Purpose                 | Status        | Notes                   |
| ------------- | ----------------------- | ------------- | ----------------------- |
| FINA CIS      | Fiscalization (JIR/ZKI) | ⚠️ 60%        | Core logic ready        |
| IE-Računi     | E-invoice intermediary  | ⚠️ Planned    | API integration pending |
| Gocardless    | PSD2 bank sync          | ✅ Production | Primary bank provider   |
| SaltEdge      | PSD2 bank sync          | ⚠️ Planned    | Secondary provider      |
| Stripe        | Payments + Terminal     | ✅ Production | Subscriptions active    |
| Resend        | Transactional email     | ✅ Production | All email flows         |
| Cloudflare R2 | Document storage        | ✅ Production | 11-year archive         |

### 12.2 E-Invoice Providers

| Provider   | Type         | Status     | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| Mock       | Testing      | ✅ Full    | Development/testing only |
| IE-Računi  | Intermediary | ⚠️ Planned | Q1 2025 target           |
| FINA       | Direct       | ⚠️ Planned | Requires certification   |
| Moj-eRačun | Intermediary | ❌ Not yet | Low priority             |

### 12.3 Bank Import Formats

| Format         | Extension | Status | Notes                  |
| -------------- | --------- | ------ | ---------------------- |
| CSV (generic)  | .csv      | ✅     | Manual column mapping  |
| CAMT.053       | .xml      | ✅     | ISO 20022 standard     |
| Erste CSV      | .csv      | ✅     | Pre-configured mapping |
| Raiffeisen CSV | .csv      | ✅     | Pre-configured mapping |
| PBZ Export     | .csv      | ⚠️ WIP | Parser in development  |
| MT940          | .sta      | ❌     | Not yet implemented    |

### 12.4 Proactive AI Agents

FiskAI uses AI agents that **act proactively**, not just respond to queries.

#### Agent: The Watchdog (Regulatory Guardian)

**Trigger:** Daily cron job + every invoice creation

**Purpose:** Monitor revenue limits and warn before thresholds are breached

**Algorithm:**

```typescript
1. current_revenue = Sum(Invoices.total) WHERE year = current
2. proximity = current_revenue / 60000  // 2025 threshold for paušalni
3. If proximity > 0.85 → Level 1 Warning (Dashboard Banner)
4. If proximity > 0.95 → Level 2 Emergency (Email to User + Accountant)
5. Action: Display link to "Prijelaz na D.O.O." guide
```

**UI Components:**

- `card:pausalni-status` - Shows limit progress bar
- `card:insights-widget` - Displays proactive warnings

**Implementation:**

```typescript
// Runs in /api/cron/deadline-reminders
const revenue = await getYearlyRevenue(companyId)
const threshold = 60000 // EUR
const percentage = (revenue / threshold) * 100

if (percentage > 95) {
  await sendEmail({
    template: "threshold-emergency",
    to: [user.email, accountant?.email],
    data: { revenue, threshold, percentage },
  })
  await createNotification({
    type: "warning",
    priority: "high",
    message: "HITNO: Približavate se limitu paušalnog obrta",
  })
} else if (percentage > 85) {
  await createNotification({
    type: "warning",
    priority: "medium",
    message: `Ostvarili ste ${percentage.toFixed(0)}% paušalnog limita`,
  })
}
```

#### Agent: The Clerk (OCR & Categorization)

**Trigger:** Document upload to Expense Vault

**Purpose:** Extract invoice data and auto-categorize expenses

**Algorithm:**

```typescript
1. Input: JPEG/PNG/PDF from expense upload
2. Extract: Use Claude-3-Haiku via /api/ai/extract for text extraction
3. Parse: Date, Amount, Vendor OIB, VAT amount, Line items
4. Lookup: Check vendor OIB against Contact database
5. If unknown vendor: Search official register (OIB API) → auto-create Contact
6. Categorize: Match description to expense categories using AI
7. VAT check: Verify deductibility via VIES if vendor has VAT ID
8. If amount > 665 EUR: Suggest asset capitalization
```

**Confidence Thresholds:**

- **High (>0.9):** Auto-fill fields, minimal review required
- **Medium (0.7-0.9):** Auto-fill with "Please verify" prompt
- **Low (<0.7):** Manual entry required, show extracted text

**Implementation:**

```typescript
// /api/ai/extract
const extraction = await claude.extract(imageBuffer, {
  fields: ["vendor", "date", "total", "oib", "items"],
  language: "hr",
})

if (extraction.confidence > 0.9) {
  // Auto-create expense draft
  await createExpense({
    vendorId: await findOrCreateVendor(extraction.oib),
    amount: extraction.total,
    date: extraction.date,
    category: await suggestCategory(extraction.items),
    needsReview: false,
  })
} else {
  // Queue for manual review
  await createImportJob({
    status: "NEEDS_REVIEW",
    extractedData: extraction,
    confidence: extraction.confidence,
  })
}
```

#### Agent: The Matcher (Bank Reconciliation)

**Trigger:** Bank transaction import (daily PSD2 sync or manual upload)

**Purpose:** Auto-match bank transactions to invoices

**Algorithm:**

```typescript
1. Input: BankTransaction row from sync
2. Extract: pozivNaBroj (payment reference number) from description
3. Match strategies (in order):
   a. Exact match: transaction.pozivNaBroj === invoice.invoiceNumber
   b. Fuzzy match: transaction.amount === invoice.total (±0.05 EUR tolerance)
   c. Vendor match: transaction.counterparty contains invoice.customer.name
4. If match confidence > 0.9: Auto-mark invoice as PAID
5. Else: Add to reconciliation queue for manual review
6. Create reconciliation record with match confidence
```

**Match Statuses:**

- `UNMATCHED` - New transaction, no invoice found
- `AUTO_MATCHED` - High confidence (>0.9), pending confirmation
- `MANUAL_MATCHED` - User-confirmed match
- `IGNORED` - User marked as non-invoice (e.g., expense, transfer)

**Implementation:**

```typescript
// /api/banking/reconciliation/match
async function autoMatchTransaction(transaction: BankTransaction) {
  // Strategy 1: Reference number match
  if (transaction.reference) {
    const invoice = await findInvoiceByNumber(transaction.reference)
    if (invoice && Math.abs(invoice.total - transaction.amount) < 0.05) {
      return { invoice, confidence: 0.95, method: "reference" }
    }
  }

  // Strategy 2: Amount + date proximity
  const candidates = await findInvoicesByAmount(transaction.amount, 0.05)
  for (const invoice of candidates) {
    const daysDiff = Math.abs(differenceInDays(transaction.date, invoice.issueDate))
    if (daysDiff <= 30) {
      return { invoice, confidence: 0.75, method: "amount-date" }
    }
  }

  // Strategy 3: Vendor name fuzzy match
  const vendorMatch = await fuzzyMatchVendor(transaction.counterparty)
  if (vendorMatch.confidence > 0.8) {
    const invoice = await findRecentInvoice(vendorMatch.vendorId)
    return { invoice, confidence: 0.7, method: "vendor" }
  }

  return { invoice: null, confidence: 0, method: "none" }
}
```

**UI Flow:**

1. User imports bank statement
2. System auto-matches transactions
3. Dashboard shows:
   - Green: X auto-matched (ready to confirm)
   - Yellow: Y suggestions (manual review)
   - Red: Z unmatched (action needed)
4. User reviews suggestions, confirms or rejects
5. Confirmed matches update invoice status to PAID
