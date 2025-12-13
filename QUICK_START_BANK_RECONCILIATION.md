# Bank Reconciliation: Quick Start (TDD Approach)

**Duration:** 10 days (can run in parallel with other work)
**Complexity:** ⭐⭐⭐ Hard (algorithm-heavy, data-driven)
**Priority:** 🔴 HIGH (blocks accountant workflows)

---

## Phase A: CSV Parser (Day 1-2)

### What It Does
Reads bank CSV files and converts them into normalized transactions.

**Input:** CSV file from bank
```csv
Date,Description,Debit,Credit,Balance
12.12.2024,Invoice 2024-001 payment,1234.56,,5000.00
13.12.2024,Invoice 2024-002 payment,567.89,,6567.89
```

**Output:**
```typescript
[
  {
    date: Date(2024-12-12),
    reference: "2024-001",           // Extracted from description
    amount: 1234.56,
    description: "Invoice 2024-001 payment",
    type: "debit"
  },
  ...
]
```

### Implementation (Copy-Paste Starter)

Create `src/lib/banking/csv-parser.ts`:

```typescript
import { Decimal } from "@prisma/client/runtime/library"

export interface ParsedTransaction {
  date: Date
  reference: string        // Invoice # extracted
  amount: Decimal
  description: string
  type: "debit" | "credit"
  currency?: string        // Default: HRK
}

export interface CsvParserOptions {
  skipHeaderRows?: number  // Default: 1 (skip first row)
  dateFormat?: "DD.MM.YYYY" | "YYYY-MM-DD" | "auto"  // Default: auto-detect
  decimalSeparator?: "," | "."  // Default: detect from sample
  currencySymbol?: string  // Optional: HRK, EUR
}

/**
 * Parse bank CSV export into normalized transactions
 * Supports: Erste, Raiffeisenbank, moja banka, Splitska, OTP
 */
export function parseCSV(
  content: string,
  bankName: "erste" | "raiffeisenbank" | "moja-banka" | "splitska" | "otp" | "generic",
  options: CsvParserOptions = {}
): ParsedTransaction[] {
  const lines = content.trim().split("\n")
  const skipRows = options.skipHeaderRows ?? 1

  // Remove header rows
  const dataLines = lines.slice(skipRows)

  // Parse by bank format
  const transactions = dataLines
    .filter(line => line.trim().length > 0)
    .map(line => parseRow(line, bankName, options))
    .filter(Boolean) as ParsedTransaction[]

  return transactions
}

function parseRow(
  line: string,
  bankName: string,
  options: CsvParserOptions
): ParsedTransaction | null {
  try {
    // TODO: Implement bank-specific parsing
    // Start with this skeleton for each bank:

    if (bankName === "erste") {
      return parseErste(line, options)
    } else if (bankName === "raiffeisenbank") {
      return parseRaiffeisenbank(line, options)
    } else {
      return parseGeneric(line, options)
    }
  } catch (error) {
    console.warn(`Failed to parse row: ${line}`, error)
    return null
  }
}

function parseErste(line: string, options: CsvParserOptions): ParsedTransaction | null {
  // Erste format: Date,Description,Debit,Credit,Balance
  const parts = line.split(",").map(p => p.trim())
  if (parts.length < 4) return null

  const [dateStr, description, debitStr, creditStr] = parts

  // Parse date
  const date = parseDate(dateStr, options.dateFormat)
  if (!date) return null

  // Parse amount
  const decimal = options.decimalSeparator || detectDecimalSeparator(debitStr || creditStr)
  const amount = parseAmount(debitStr || creditStr, decimal)
  if (amount === null) return null

  // Extract reference (invoice number) from description
  const reference = extractInvoiceNumber(description)

  return {
    date,
    reference: reference || description.slice(0, 20),
    amount: new Decimal(amount),
    description,
    type: debitStr ? "debit" : "credit",
    currency: options.currencySymbol || "HRK",
  }
}

function parseRaiffeisenbank(line: string, options: CsvParserOptions): ParsedTransaction | null {
  // TODO: Implement Raiffeisenbank-specific format
  return null
}

function parseGeneric(line: string, options: CsvParserOptions): ParsedTransaction | null {
  // Fallback: Try 4-column CSV (Date, Reference, Amount, Description)
  const parts = line.split(",").map(p => p.trim())
  if (parts.length < 3) return null

  const [dateStr, referenceOrDesc, amountStr, description] = parts

  const date = parseDate(dateStr, options.dateFormat)
  if (!date) return null

  const decimal = options.decimalSeparator || detectDecimalSeparator(amountStr)
  const amount = parseAmount(amountStr, decimal)
  if (amount === null) return null

  // Try to extract invoice number
  const reference = extractInvoiceNumber(referenceOrDesc || description || "")

  return {
    date,
    reference: reference || referenceOrDesc.slice(0, 20),
    amount: new Decimal(Math.abs(amount)),
    description: description || referenceOrDesc,
    type: amount < 0 ? "credit" : "debit",
    currency: options.currencySymbol || "HRK",
  }
}

// ========== HELPERS ==========

function parseDate(dateStr: string, format?: string): Date | null {
  // Try common Croatian formats first
  const formats = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
    /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
  ]

  for (const regex of formats) {
    const match = dateStr.match(regex)
    if (match) {
      let day: number, month: number, year: number

      // Detect which format matched
      if (match[3].length === 4 && match[1].length === 4) {
        // YYYY-MM-DD
        year = parseInt(match[1])
        month = parseInt(match[2])
        day = parseInt(match[3])
      } else {
        // DD.MM.YYYY or DD/MM/YYYY
        day = parseInt(match[1])
        month = parseInt(match[2])
        year = parseInt(match[3])
      }

      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}

function parseAmount(amountStr: string, decimalSeparator: "," | "."): number | null {
  if (!amountStr) return null

  // Remove currency symbols and whitespace
  let cleaned = amountStr
    .replace(/[^\d,.\-]/g, "")
    .trim()

  // Handle European format (1.234,56) vs US format (1,234.56)
  if (decimalSeparator === ",") {
    // European: 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else {
    // US: 1,234.56 → 1234.56
    cleaned = cleaned.replace(/,/g, "")
  }

  const amount = parseFloat(cleaned)
  return isFinite(amount) ? amount : null
}

function detectDecimalSeparator(sample: string): "," | "." {
  // If string contains comma but no thousands separator, it's decimal
  if (sample.includes(",") && !sample.includes(".")) {
    return ","
  }
  // If string has both, comma is usually decimal in EU format
  if (sample.includes(",") && sample.includes(".")) {
    return sample.lastIndexOf(",") > sample.lastIndexOf(".") ? "," : "."
  }
  return "."  // Default to US format
}

function extractInvoiceNumber(text: string): string {
  // Common patterns:
  // "Invoice 2024-001 payment" → "2024-001"
  // "INV-2024/123" → "2024/123"
  // "Racun br. 2024-0456" → "2024-0456"

  const patterns = [
    /(?:invoice|racun|inv)[\s#]*[:\-]*\s*([0-9\-\/]+)/i,
    /([0-9]{4}[\-\/][0-9]+)/,  // YYYY-XXX or YYYY/XXX
    /\#([0-9]+)/,               // #123
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return ""
}
```

### Testing (Day 1-2)

Create test data files:

**`test-data/erste-sample.csv`**
```csv
Date,Description,Debit,Credit,Balance
12.12.2024,Invoice 2024-001,1234.56,,5000.00
13.12.2024,Invoice 2024-002,567.89,,6567.89
14.12.2024,Deposit,,2000.00,8567.89
```

**`src/lib/banking/__tests__/csv-parser.test.ts`**
```typescript
import { parseCSV } from "../csv-parser"
import fs from "fs"

describe("CSV Parser", () => {
  test("parses Erste CSV correctly", () => {
    const csv = fs.readFileSync("test-data/erste-sample.csv", "utf-8")
    const transactions = parseCSV(csv, "erste")

    expect(transactions).toHaveLength(3)
    expect(transactions[0].reference).toBe("2024-001")
    expect(transactions[0].amount.toString()).toBe("1234.56")
    expect(transactions[0].type).toBe("debit")
  })

  test("handles missing invoice number", () => {
    const csv = `Date,Description,Debit,Credit
12.12.2024,Random transfer,100,,`
    const transactions = parseCSV(csv, "generic")
    expect(transactions[0].reference).toBeTruthy() // Falls back to description
  })

  test("handles European date format (DD.MM.YYYY)", () => {
    const csv = `Date,Description,Debit,Credit
12.12.2024,Invoice test,100,,`
    const transactions = parseCSV(csv, "generic")
    expect(transactions[0].date.getFullYear()).toBe(2024)
    expect(transactions[0].date.getMonth()).toBe(11)  // 0-indexed
    expect(transactions[0].date.getDate()).toBe(12)
  })

  test("parses amounts with comma decimal separator", () => {
    const csv = `Date,Description,Debit,Credit
12.12.2024,Test,1.234,56,,`
    const transactions = parseCSV(csv, "generic")
    expect(transactions[0].amount.toString()).toBe("1234.56")
  })
})
```

**Run tests:**
```bash
npm run test -- csv-parser.test.ts
```

---

## Phase B: Matching Algorithm (Day 3-5)

### What It Does
Compares transactions to unpaid invoices, determines match confidence.

**Scoring Rules:**

| Scenario | Score | Example |
|----------|-------|---------|
| Invoice # found in reference | 100 | Trans: "INV-2024-001", Invoice #: "2024-001" → **Match** |
| Amount matches, date within 3 days | 85 | Trans: 1000 HRK on 12.12, Invoice: 1000 on 10.12 → **Match** |
| Amount within ±5%, date within 5 days | 70 | Trans: 1050 HRK on 12.12, Invoice: 1000 on 08.12 → **Maybe** |
| Multiple invoices same amount | 50 each | (ambiguous - let user pick) |
| No match | 0 | (user must manually select) |

### Implementation

Create `src/lib/banking/reconciliation.ts`:

```typescript
import { EInvoice, EInvoiceLine } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { ParsedTransaction } from "./csv-parser"

export interface ReconciliationResult {
  transactionId: string
  matchedInvoiceId: string | null
  matchStatus: "matched" | "partial" | "unmatched"
  confidenceScore: number  // 0-100
  reason: string
}

/**
 * Match transactions to unpaid invoices using confidence scoring
 */
export function matchTransactionsToInvoices(
  transactions: (ParsedTransaction & { id: string })[],
  invoices: (EInvoice & { lines: EInvoiceLine[] })[]
): ReconciliationResult[] {
  return transactions.map(transaction => {
    const invoiceMatches = invoices.map(invoice => ({
      invoiceId: invoice.id,
      score: calculateMatchScore(transaction, invoice),
    }))

    // Sort by score descending
    invoiceMatches.sort((a, b) => b.score - a.score)

    const topMatch = invoiceMatches[0]
    const secondMatch = invoiceMatches[1]

    // Ambiguous if multiple invoices have same score
    if (topMatch.score > 0 && secondMatch?.score === topMatch.score) {
      return {
        transactionId: transaction.id,
        matchedInvoiceId: null,
        matchStatus: "unmatched",
        confidenceScore: 50,
        reason: "Multiple invoices match - user must select",
      }
    }

    // Matched if score >= 70
    if (topMatch.score >= 70) {
      return {
        transactionId: transaction.id,
        matchedInvoiceId: topMatch.invoiceId,
        matchStatus: topMatch.score >= 85 ? "matched" : "partial",
        confidenceScore: topMatch.score,
        reason: getScoreReason(topMatch.score),
      }
    }

    // Unmatched
    return {
      transactionId: transaction.id,
      matchedInvoiceId: null,
      matchStatus: "unmatched",
      confidenceScore: 0,
      reason: "No matching invoice found",
    }
  })
}

function calculateMatchScore(
  transaction: ParsedTransaction,
  invoice: EInvoice
): number {
  // Rule 1: Exact invoice number match (100)
  if (
    transaction.reference &&
    (invoice.invoiceNumber.includes(transaction.reference) ||
      transaction.reference.includes(invoice.invoiceNumber))
  ) {
    return 100
  }

  // Rule 2: Amount + date match (85)
  const amountMatches = Math.abs(
    Number(invoice.grossAmount) - Number(transaction.amount)
  ) < 1  // Allow 1 HRK rounding difference

  const daysDiff = daysBetween(transaction.date, invoice.issueDate)
  if (amountMatches && daysDiff <= 3) {
    return 85
  }

  // Rule 3: Partial match - amount within 5%, date within 5 days (70)
  const amountTolerance = Number(invoice.grossAmount) * 0.05
  const amountWithinTolerance =
    Math.abs(Number(invoice.grossAmount) - Number(transaction.amount)) <=
    amountTolerance

  if (amountWithinTolerance && daysDiff <= 5) {
    return 70
  }

  return 0
}

function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / msPerDay))
}

function getScoreReason(score: number): string {
  if (score === 100) return "Exact invoice number match"
  if (score >= 85) return "Amount & date match (within 3 days)"
  if (score >= 70) return "Partial match (amount ±5%, date within 5 days)"
  return "No match"
}
```

### Testing

```typescript
describe("Reconciliation Matching", () => {
  test("exact invoice match scores 100", () => {
    const transaction = {
      id: "t1",
      reference: "2024-001",
      amount: new Decimal("1000"),
      date: new Date("2024-12-12"),
      description: "Invoice 2024-001",
      type: "debit" as const,
    }

    const invoice = {
      id: "inv1",
      invoiceNumber: "INV-2024-001",
      grossAmount: new Decimal("1000"),
      issueDate: new Date("2024-12-10"),
      // ... other fields
    } as EInvoice & { lines: EInvoiceLine[] }

    const results = matchTransactionsToInvoices([transaction], [invoice])
    expect(results[0].confidenceScore).toBe(100)
    expect(results[0].matchedInvoiceId).toBe("inv1")
  })

  test("amount + date match scores 85", () => {
    // Amount matches exactly, date within 3 days
    // expect score 85
  })

  test("partial match scores 70", () => {
    // Amount within 5%, date within 5 days
    // expect score 70, status "partial"
  })

  test("multiple matches score 50 each (ambiguous)", () => {
    // Two invoices same amount
    // expect both score 50, status "unmatched"
  })
})
```

---

## Phase C: Database & Server Actions (Day 5-6)

### Schema

Add to `prisma/schema.prisma`:

```prisma
model BankTransaction {
  id               String   @id @default(cuid())
  companyId        String
  importId         String

  date             DateTime
  reference        String?
  amount           Decimal  @db.Decimal(10,2)
  description      String
  currency         String   @default("HRK")
  type             String   // "debit" | "credit"

  matchedInvoiceId String?
  matchStatus      String   @default("UNMATCHED")  // MATCHED | PARTIAL | UNMATCHED
  confidenceScore  Int?

  reconciledAt     DateTime?
  createdAt        DateTime @default(now())

  company          Company      @relation(fields: [companyId], references: [id])
  invoice          EInvoice?    @relation(fields: [matchedInvoiceId], references: [id])
  import           BankImport   @relation(fields: [importId], references: [id])
}

model BankImport {
  id          String   @id @default(cuid())
  companyId   String
  fileName    String
  bankName    String?
  rowCount    Int?
  matchedCount Int?
  uploadedAt  DateTime @default(now())

  company     Company            @relation(fields: [companyId], references: [id])
  transactions BankTransaction[]
}
```

Run: `npx prisma migrate dev --name add_bank_reconciliation`

### Server Action

Create `src/app/(dashboard)/banking/actions.ts`:

```typescript
"use server"

import { getCurrentUser, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { parseCSV } from "@/lib/banking/csv-parser"
import { matchTransactionsToInvoices } from "@/lib/banking/reconciliation"
import { NextResponse } from "next/server"

export async function importBankStatement(
  file: File,
  bankName: string
): Promise<{
  importId: string
  matchedCount: number
  unmatchedCount: number
}> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not authenticated")

  const company = await requireCompany(user.id)

  // Parse CSV
  const content = await file.text()
  const transactions = parseCSV(content, bankName as any)

  // Fetch unpaid invoices
  const unpaidInvoices = await db.eInvoice.findMany({
    where: {
      companyId: company.id,
      paidAt: null,
    },
    include: { lines: true },
  })

  // Match
  const transactionsWithId = transactions.map((t, i) => ({
    ...t,
    id: `temp-${i}`,
  }))
  const matches = matchTransactionsToInvoices(transactionsWithId, unpaidInvoices)

  // Save to DB
  const importRecord = await db.bankImport.create({
    data: {
      companyId: company.id,
      fileName: file.name,
      bankName,
      rowCount: transactions.length,
      matchedCount: matches.filter(m => m.matchStatus !== "unmatched").length,
    },
  })

  // Save transactions
  await db.bankTransaction.createMany({
    data: matches.map(match => ({
      companyId: company.id,
      importId: importRecord.id,
      date: transactions[matches.indexOf(match)].date,
      reference: transactions[matches.indexOf(match)].reference,
      amount: transactions[matches.indexOf(match)].amount,
      description: transactions[matches.indexOf(match)].description,
      matchedInvoiceId: match.matchedInvoiceId,
      matchStatus: match.matchStatus,
      confidenceScore: match.confidenceScore,
    })),
  })

  return {
    importId: importRecord.id,
    matchedCount: matches.filter(m => m.matchStatus !== "unmatched").length,
    unmatchedCount: matches.filter(m => m.matchStatus === "unmatched").length,
  }
}

export async function reconcileTransaction(
  transactionId: string,
  invoiceId: string
): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not authenticated")

  const company = await requireCompany(user.id)

  // Get transaction
  const transaction = await db.bankTransaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction || transaction.companyId !== company.id) {
    throw new Error("Transaction not found")
  }

  // Update transaction
  await db.bankTransaction.update({
    where: { id: transactionId },
    data: {
      matchedInvoiceId: invoiceId,
      matchStatus: "matched",
      reconciledAt: new Date(),
    },
  })

  // Update invoice
  await db.eInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAt: transaction.date,
    },
  })
}
```

---

## Phase D & E: UI (Day 6-10)

### Upload Form
- File input + bank selector
- Preview first 10 rows
- Submit → shows results

### Reconciliation Dashboard
- Table: Date | Reference | Amount | Confidence | Action
- Filter by status
- "Reconcile" button → updates invoice
- Bulk "Reconcile all >80%"

---

## 🚀 Start Today

```bash
# 1. Create the directory
mkdir -p src/lib/banking

# 2. Copy csv-parser.ts skeleton above
# 3. Create test data from your Erste/Raiffeisenbank account
# 4. Write failing tests
# 5. Implement until green

npm run test -- csv-parser.test.ts
```

**Day 1 goal:** CSV parser parses 5 bank formats correctly.

That's it. Start coding! 🎯