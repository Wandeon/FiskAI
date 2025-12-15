# Feature: Data Export (F062)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 18

## Purpose

The Data Export feature enables users to export comprehensive financial data for accountants in CSV and ZIP formats with date range filtering. The feature includes separate exports for invoices, expenses, KPR (Knjiga Primitaka i Izdataka), and summary reports, as well as a unified "Tax Season Pack" ZIP bundle. All CSV files use UTF-8 BOM encoding with semicolon separators for Excel compatibility, supporting Croatian paušalni obrt accounting handoff requirements.

## User Entry Points

| Type      | Path                           | Evidence                                               |
| --------- | ------------------------------ | ------------------------------------------------------ |
| Page      | /reports/export                | `src/app/(dashboard)/reports/export/page.tsx:6`        |
| Component | AccountingExportForm           | `src/components/reports/accounting-export-form.tsx:11` |
| API       | /api/exports/invoices          | `src/app/api/exports/invoices/route.ts:39`             |
| API       | /api/exports/expenses          | `src/app/api/exports/expenses/route.ts:39`             |
| API       | /api/reports/accountant-export | `src/app/api/reports/accountant-export/route.ts:24`    |
| API       | /api/exports/season-pack       | `src/app/api/exports/season-pack/route.ts:25`          |

## Core Flow

### Export Page Flow

1. User navigates to /reports page → `src/app/(dashboard)/reports/page.tsx:19`
2. System validates user authentication with requireAuth() → `src/app/(dashboard)/reports/page.tsx:20`
3. System retrieves current company via requireCompany() → `src/app/(dashboard)/reports/page.tsx:21`
4. System checks reports module capability → `src/app/(dashboard)/reports/page.tsx:23`
5. User clicks "Izvoz za knjigovođu" card → `src/app/(dashboard)/reports/page.tsx:15`
6. System navigates to /reports/export page → `src/app/(dashboard)/reports/export/page.tsx:6`
7. System renders AccountingExportForm component → `src/app/(dashboard)/reports/export/page.tsx:28`
8. Form initializes with current year start date and today → `src/components/reports/accounting-export-form.tsx:13-19`
9. User selects date range via date inputs → `src/components/reports/accounting-export-form.tsx:34-48`
10. User clicks export button for desired format → `src/components/reports/accounting-export-form.tsx:53-99`
11. System builds download URL with query parameters → `src/components/reports/accounting-export-form.tsx:21-27`
12. Browser initiates file download from API endpoint
13. API validates authentication and company → `src/app/api/exports/invoices/route.ts:40-48`
14. API parses and validates date parameters → `src/app/api/exports/invoices/route.ts:50-63`
15. API fetches filtered data from database → `src/app/api/exports/invoices/route.ts:81-95`
16. API generates CSV with UTF-8 BOM encoding → `src/app/api/exports/invoices/route.ts:133`
17. System returns file with content-disposition header → `src/app/api/exports/invoices/route.ts:140-145`

### Invoice Export Flow

1. User clicks "Izvoz računa (CSV)" button → `src/components/reports/accounting-export-form.tsx:54`
2. System constructs URL with from/to parameters → `src/components/reports/accounting-export-form.tsx:54`
3. API receives GET request to /api/exports/invoices → `src/app/api/exports/invoices/route.ts:39`
4. API validates query parameters with Zod schema → `src/app/api/exports/invoices/route.ts:50`
5. API parses from/to dates → `src/app/api/exports/invoices/route.ts:55-56`
6. API creates inclusive date filter → `src/app/api/exports/invoices/route.ts:65-79`
7. API fetches invoices with buyer/seller relations → `src/app/api/exports/invoices/route.ts:81-95`
8. API orders invoices by issue date ascending → `src/app/api/exports/invoices/route.ts:94`
9. API maps invoice data to CSV rows → `src/app/api/exports/invoices/route.ts:115-131`
10. API escapes CSV special characters → `src/app/api/exports/invoices/route.ts:27-33`
11. API builds CSV with semicolon separators → `src/app/api/exports/invoices/route.ts:35-37`
12. API prepends UTF-8 BOM marker → `src/app/api/exports/invoices/route.ts:133`
13. API generates filename with date range → `src/app/api/exports/invoices/route.ts:134-138`
14. Browser downloads CSV file → `src/app/api/exports/invoices/route.ts:140-145`

### Expense Export Flow

1. User clicks "Izvoz troškova (CSV)" button → `src/components/reports/accounting-export-form.tsx:62`
2. API receives GET request to /api/exports/expenses → `src/app/api/exports/expenses/route.ts:39`
3. API validates and parses date parameters → `src/app/api/exports/expenses/route.ts:50-63`
4. API fetches expenses with vendor and category relations → `src/app/api/exports/expenses/route.ts:81-91`
5. API orders expenses by date ascending → `src/app/api/exports/expenses/route.ts:90`
6. API maps expense data including receipt URLs → `src/app/api/exports/expenses/route.ts:110-125`
7. API generates CSV with UTF-8 BOM → `src/app/api/exports/expenses/route.ts:127`
8. Browser downloads CSV file → `src/app/api/exports/expenses/route.ts:134-139`

### KPR Export Flow

1. User clicks "KPR izvoz (CSV)" button → `src/components/reports/accounting-export-form.tsx:73`
2. API receives GET with format=kpr parameter → `src/app/api/reports/accountant-export/route.ts:24`
3. API validates format enum with Zod → `src/app/api/reports/accountant-export/route.ts:15`
4. API fetches all accountant export data → `src/app/api/reports/accountant-export/route.ts:54`
5. Library fetches paid invoices only → `src/lib/reports/accountant-export.ts:187-196`
6. Library filters by paidAt date field → `src/lib/reports/accountant-export.ts:190`
7. Library orders KPR rows by paidAt ascending → `src/lib/reports/accountant-export.ts:195`
8. API generates KPR CSV with totals row → `src/app/api/reports/accountant-export/route.ts:65`
9. Library calculates total net, VAT, and gross → `src/lib/reports/accountant-export.ts:346-358`
10. Browser downloads KPR CSV file → `src/app/api/reports/accountant-export/route.ts:66-72`

### Tax Season Pack Flow

1. User clicks "Tax Season Paket (ZIP)" button → `src/components/reports/accounting-export-form.tsx:92`
2. API receives GET request to /api/exports/season-pack → `src/app/api/exports/season-pack/route.ts:25`
3. API fetches comprehensive accountant export data → `src/app/api/exports/season-pack/route.ts:54`
4. API creates ZIP archive with maximum compression → `src/app/api/exports/season-pack/route.ts:63-65`
5. API appends summary CSV as 00-SAZETAK.csv → `src/app/api/exports/season-pack/route.ts:79`
6. API appends invoices CSV as 01-RACUNI.csv → `src/app/api/exports/season-pack/route.ts:80`
7. API appends expenses CSV as 02-TROSKOVI.csv → `src/app/api/exports/season-pack/route.ts:81`
8. API appends KPR CSV as 03-KPR.csv → `src/app/api/exports/season-pack/route.ts:82`
9. API generates README with instructions → `src/app/api/exports/season-pack/route.ts:85-86`
10. README includes company info and totals → `src/app/api/exports/season-pack/route.ts:132-191`
11. API finalizes archive → `src/app/api/exports/season-pack/route.ts:89`
12. API collects ZIP chunks into buffer → `src/app/api/exports/season-pack/route.ts:68-97`
13. Browser downloads ZIP file → `src/app/api/exports/season-pack/route.ts:102-109`

## Key Modules

| Module                | Purpose                                                | Location                                                |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| ExportPage            | Server page for export UI                              | `src/app/(dashboard)/reports/export/page.tsx`           |
| AccountingExportForm  | Client form with date pickers and buttons              | `src/components/reports/accounting-export-form.tsx`     |
| InvoicesExportRoute   | API endpoint for invoice CSV export                    | `src/app/api/exports/invoices/route.ts:39-146`          |
| ExpensesExportRoute   | API endpoint for expense CSV export                    | `src/app/api/exports/expenses/route.ts:39-140`          |
| AccountantExportRoute | API endpoint for KPR/summary CSV export                | `src/app/api/reports/accountant-export/route.ts:24-107` |
| SeasonPackRoute       | API endpoint for ZIP bundle export                     | `src/app/api/exports/season-pack/route.ts:25-199`       |
| accountant-export     | Library functions for data fetching and CSV generation | `src/lib/reports/accountant-export.ts`                  |

## Export Formats

### CSV Format

**Separator**: Semicolon (;) → `src/app/api/exports/invoices/route.ts:36`

**Encoding**: UTF-8 with BOM (\\uFEFF) → `src/app/api/exports/invoices/route.ts:133`

**Line Breaks**: LF (\\n) → `src/app/api/exports/invoices/route.ts:36`

**Escaping Rules** → `src/app/api/exports/invoices/route.ts:27-33`:

- Values containing semicolons wrapped in double quotes
- Values containing double quotes escaped as ""
- Values containing newlines wrapped in double quotes

**Number Format**: Fixed 2 decimal places → `src/app/api/exports/invoices/route.ts:22-25`

**Date Format**: ISO 8601 (YYYY-MM-DD) → `src/app/api/exports/invoices/route.ts:17-20`

**Boolean Format**: "DA" / "NE" (Croatian) → `src/app/api/exports/invoices/route.ts:128`

### Invoice CSV Columns

**Headers** → `src/app/api/exports/invoices/route.ts:97-113`:

1. Broj računa (Invoice Number)
2. Datum izdavanja (Issue Date)
3. Dospijeće (Due Date)
4. Kupac (Buyer Name)
5. OIB kupca (Buyer Tax ID)
6. Email kupca (Buyer Email)
7. Smjer (Direction: OUTBOUND/INBOUND)
8. Vrsta (Type: E_INVOICE/PROFORMA/etc)
9. Status (Status: DRAFT/SENT/PAID/etc)
10. Osnovica (Net Amount EUR)
11. PDV (VAT Amount EUR)
12. Ukupno (Total Amount EUR)
13. Plaćeno (Paid: DA/NE)
14. Datum plaćanja (Payment Date)
15. Referenca (Reference)

**Data Source**: EInvoice model → `prisma/schema.prisma:191-259`

### Expense CSV Columns

**Headers** → `src/app/api/exports/expenses/route.ts:93-108`:

1. Datum (Date)
2. Opis (Description)
3. Dobavljač (Vendor Name)
4. OIB dobavljača (Vendor Tax ID)
5. Kategorija (Category Name)
6. Status (Status: DRAFT/PAID/etc)
7. Osnovica (Net Amount EUR)
8. PDV (VAT Amount EUR)
9. Ukupno (Total Amount EUR)
10. Plaćeno (Paid: DA/NE)
11. Datum plaćanja (Payment Date)
12. Način plaćanja (Payment Method)
13. Link na račun/sliku (Receipt URL)
14. Napomena (Notes)

**Data Source**: Expense model → `prisma/schema.prisma:345-374`

### KPR CSV Columns

**Headers** → `src/lib/reports/accountant-export.ts:323-331`:

1. Datum plaćanja (Payment Date)
2. Datum izdavanja (Issue Date)
3. Broj računa (Invoice Number)
4. Kupac (Buyer Name)
5. Osnovica (EUR) (Net Amount)
6. PDV (EUR) (VAT Amount)
7. Ukupno (EUR) (Total Amount)

**Special Features**:

- Only includes paid invoices → `src/lib/reports/accountant-export.ts:190`
- Includes totals row at end → `src/lib/reports/accountant-export.ts:350-358`
- Totals show "UKUPNO" in Kupac column → `src/lib/reports/accountant-export.ts:354`

### Summary CSV Format

**Format**: Key-value pairs with semicolons → `src/lib/reports/accountant-export.ts:363-397`

**Sections**:

1. Company Information (Name, OIB, VAT Number)
2. Period and Export Date
3. Income Summary (Count, Net, VAT, Total)
4. Expenses Summary (Count, Net, VAT, Total)
5. Net Profit/Loss
6. KPR Count

**Example** → `src/lib/reports/accountant-export.ts:366-396`:

```
Sažetak izvoza za knjigovođu
Tvrtka: Example d.o.o.
OIB: 12345678901
Razdoblje: 2025-01-01 - 2025-12-31
...
```

### ZIP Format

**Archive Format**: ZIP with level 9 compression → `src/app/api/exports/season-pack/route.ts:63-65`

**Library**: archiver npm package → `package.json:48`

**File Structure** → `src/app/api/exports/season-pack/route.ts:79-86`:

```
fiskai-tax-season-pack-{date-range}.zip
├── 00-SAZETAK.csv
├── 01-RACUNI.csv
├── 02-TROSKOVI.csv
├── 03-KPR.csv
└── PROCITAJ-ME.txt
```

**README Contents** → `src/app/api/exports/season-pack/route.ts:119-199`:

- Company details and period
- Package contents description
- File counts and totals
- CSV format notes
- Result summary with calculations

## Date Range Filtering

### Client-Side Date Selection

**Default From Date**: Start of current year → `src/components/reports/accounting-export-form.tsx:13-16`

**Default To Date**: Current date → `src/components/reports/accounting-export-form.tsx:12`

**Input Type**: HTML5 date inputs → `src/components/reports/accounting-export-form.tsx:36, 44`

**Date State**: React useState hooks → `src/components/reports/accounting-export-form.tsx:18-19`

**URL Construction** → `src/components/reports/accounting-export-form.tsx:21-27`:

- URLSearchParams with from/to keys
- Empty params omitted from URL
- Query string appended to API path

### Server-Side Date Parsing

**Query Schema** → `src/app/api/exports/invoices/route.ts:6-9`:

- from: optional string
- to: optional string

**Date Parsing** → `src/app/api/exports/invoices/route.ts:11-15`:

- Converts string to Date object
- Returns undefined for invalid dates
- NaN check prevents invalid date bugs

**Validation** → `src/app/api/exports/invoices/route.ts:58-63`:

- Returns 400 for invalid date format
- Error message: "Neispravan datum 'from'" or 'to'

**Inclusive End Date** → `src/app/api/exports/invoices/route.ts:65-71`:

- Sets time to 23:59:59.999
- Ensures full day included in filter
- Applied to 'to' parameter only

### Database Filtering

**Invoice Filter** → `src/app/api/exports/invoices/route.ts:73-84`:

- Field: issueDate
- Filter: { gte: fromDate, lte: toDateInclusive }
- Conditional: only if from or to provided

**Expense Filter** → `src/app/api/exports/expenses/route.ts:73-84`:

- Field: date
- Filter: { gte: fromDate, lte: toDateInclusive }
- Conditional: only if from or to provided

**KPR Filter** → `src/lib/reports/accountant-export.ts:179-190`:

- Field: paidAt
- Filter: { not: null, ...dateFilter }
- Ensures only paid invoices included

**Accountant Export** → `src/lib/reports/accountant-export.ts:100-114`:

- Separate filters for invoices and expenses
- Same inclusive end date logic
- Optional filtering if no dates provided

## Data Fetching

### Invoice Data Fetching

**Query** → `src/app/api/exports/invoices/route.ts:81-95`:

- Model: eInvoice
- Where: companyId + optional issueDate filter
- Include: buyer (name, oib, vatNumber, email), seller (same)
- OrderBy: issueDate ascending

**Fields Retrieved** → `src/app/api/exports/invoices/route.ts:115-131`:

- invoiceNumber, issueDate, dueDate
- buyer.name, buyer.oib, buyer.email
- direction, type, status
- netAmount, vatAmount, totalAmount
- paidAt (converted to boolean isPaid)
- providerRef || internalReference

### Expense Data Fetching

**Query** → `src/app/api/exports/expenses/route.ts:81-91`:

- Model: expense
- Where: companyId + optional date filter
- Include: vendor (name, oib), category (name, code)
- OrderBy: date ascending

**Fields Retrieved** → `src/app/api/exports/expenses/route.ts:110-125`:

- date, description
- vendor.name, vendor.oib
- category.name || category.code
- status, netAmount, vatAmount, totalAmount
- paymentDate, paymentMethod
- receiptUrl, notes
- isPaid (derived from status or paymentDate)

### Comprehensive Export Data

**Function**: fetchAccountantExportData() → `src/lib/reports/accountant-export.ts:72-238`

**Company Info** → `src/lib/reports/accountant-export.ts:78-89`:

- Fetches: name, oib, vatNumber
- Throws error if company not found

**Invoices** → `src/lib/reports/accountant-export.ts:117-145`:

- All invoices in date range
- Includes buyer relation
- Maps to InvoiceSummaryRow type

**Expenses** → `src/lib/reports/accountant-export.ts:148-176`:

- All expenses in date range
- Includes vendor and category
- Maps to ExpenseSummaryRow type

**KPR Rows** → `src/lib/reports/accountant-export.ts:178-206`:

- Only paid invoices (paidAt not null)
- Filtered by paidAt date field
- Maps to KprRow type with 7 fields

**Totals Calculation** → `src/lib/reports/accountant-export.ts:208-217`:

- Sum of invoice netAmount, vatAmount, totalAmount
- Sum of expense netAmount, vatAmount, totalAmount
- Net profit = total income - total expenses

## CSV Generation

### Invoice CSV Generation

**Function**: invoicesToCsv() → `src/lib/reports/accountant-export.ts:242-280`

**Header Row** → `src/lib/reports/accountant-export.ts:243-258`:

- 14 columns with Croatian labels
- Joined with semicolons

**Data Rows** → `src/lib/reports/accountant-export.ts:260-277`:

- Maps each invoice to array of values
- formatDate() for date fields
- toFixed(2) for money fields
- escapeCsv() for text fields
- "DA"/"NE" for isPaid boolean

**Final Output** → `src/lib/reports/accountant-export.ts:279`:

- UTF-8 BOM (\\uFEFF) prefix
- Header + rows joined with \\n

### Expense CSV Generation

**Function**: expensesToCsv() → `src/lib/reports/accountant-export.ts:282-320`

**Header Row** → `src/lib/reports/accountant-export.ts:283-298`:

- 14 columns with Croatian labels
- Includes "Link na račun" for receipt URLs

**Data Rows** → `src/lib/reports/accountant-export.ts:300-317`:

- Maps each expense to array of values
- escapeCsv() for description, vendor, category
- receiptUrl included as direct URL

**Final Output** → `src/lib/reports/accountant-export.ts:319`:

- UTF-8 BOM prefix
- Header + rows joined with \\n

### KPR CSV Generation

**Function**: kprToCsv() → `src/lib/reports/accountant-export.ts:322-361`

**Header Row** → `src/lib/reports/accountant-export.ts:323-331`:

- 7 columns (payment date, issue date, number, buyer, amounts)

**Data Rows** → `src/lib/reports/accountant-export.ts:333-343`:

- Maps paid invoices to array of values

**Totals Row** → `src/lib/reports/accountant-export.ts:345-358`:

- Empty strings for date/number columns
- "UKUPNO" for buyer column
- Sum of netAmount, vatAmount, totalAmount
- Appended after data rows

**Final Output** → `src/lib/reports/accountant-export.ts:360`:

- UTF-8 BOM prefix
- Header + data rows + totals row

### Summary CSV Generation

**Function**: summaryToCsv() → `src/lib/reports/accountant-export.ts:363-398`

**Format**: Plain text with key-value pairs → `src/lib/reports/accountant-export.ts:364-396`

**Sections**:

1. Header with company info (lines 1-5)
2. Income section with counts and amounts (lines 7-11)
3. Expenses section with counts and amounts (lines 13-17)
4. Result with net profit/loss (line 20)
5. KPR count (line 23)

**No Column Headers**: Free-form text format optimized for readability

## Utility Functions

### CSV Escaping

**Function**: escapeCsv() → `src/app/api/exports/invoices/route.ts:27-33`

**Logic**:

1. Convert to string (handle null/undefined)
2. Check if contains semicolon, quote, or newline
3. If yes: wrap in quotes and escape quotes as ""
4. If no: return as-is

**Example**:

- Input: `John "The Boss" Doe`
- Output: `"John ""The Boss"" Doe"`

### Date Formatting

**Function**: formatDate() → `src/app/api/exports/invoices/route.ts:17-20`

**Logic**:

1. Return empty string for null/undefined
2. Convert to ISO string (YYYY-MM-DDTHH:MM:SS.SSSZ)
3. Slice first 10 characters (YYYY-MM-DD)

**Example**: 2025-12-15T10:30:00.000Z → "2025-12-15"

### Money Formatting

**Function**: money() → `src/app/api/exports/invoices/route.ts:22-25`

**Logic**:

1. Convert to number (handle Decimal type)
2. Default to 0 if null/undefined
3. Check if finite number
4. Return toFixed(2) or empty string

**Example**: Decimal(123.456) → "123.46"

### Decimal Conversion

**Function**: numberFromDecimal() → `src/lib/reports/accountant-export.ts:402-406`

**Purpose**: Convert Prisma Decimal to JavaScript number

**Logic**:

1. Return 0 for null/undefined
2. Return as-is if already number
3. Convert Decimal to string then to number

**Rationale**: Prisma uses Decimal type for precise currency values

## Validation

### Query Parameter Validation

**Schema** → `src/app/api/exports/invoices/route.ts:6-9`:

```typescript
z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})
```

**Zod SafeParse** → `src/app/api/exports/invoices/route.ts:50`:

- Returns success boolean + data or error
- Does not throw exception

**Date Validation** → `src/app/api/exports/invoices/route.ts:58-63`:

- Checks if parsed date is NaN
- Returns 400 error for invalid dates
- Separate checks for from and to

### Format Parameter Validation

**Schema** → `src/app/api/reports/accountant-export/route.ts:12-16`:

```typescript
z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(["csv", "summary", "kpr"]).optional().default("csv"),
})
```

**Enum Validation**: Only allows 3 specific format values

**Default Value**: Falls back to "csv" if not provided

**Error Handling** → `src/app/api/reports/accountant-export/route.ts:36-41`:

- Returns 400 with error details
- Zod provides formatted validation errors

### Authentication Validation

**User Check** → `src/app/api/exports/invoices/route.ts:40-43`:

- Calls getCurrentUser() from auth-utils
- Returns 401 if no user session
- Error message: "Unauthorized"

**Company Check** → `src/app/api/exports/invoices/route.ts:45-48`:

- Calls getCurrentCompany(userId)
- Returns 404 if company not found
- Error message: "Company not found"

**requireAuth/requireCompany** → `src/app/api/reports/accountant-export/route.ts:26-27`:

- Alternative pattern using exceptions
- Automatically returns 401/404 responses

## Error Handling

### Client-Side Errors

**Date Input Validation**: Browser native HTML5 validation → `src/components/reports/accounting-export-form.tsx:36, 44`

**Download Failure**: Browser handles failed downloads with default error UI

**No JavaScript Errors**: All links are static anchor tags, no try/catch needed

### Server-Side Errors

**Invalid Query** → `src/app/api/exports/invoices/route.ts:51-53`:

- Status: 400 Bad Request
- Message: "Neispravan upit"
- Trigger: Zod validation failure

**Invalid From Date** → `src/app/api/exports/invoices/route.ts:58-60`:

- Status: 400 Bad Request
- Message: "Neispravan datum 'from'"
- Trigger: NaN after Date parsing

**Invalid To Date** → `src/app/api/exports/invoices/route.ts:61-63`:

- Status: 400 Bad Request
- Message: "Neispravan datum 'to'"
- Trigger: NaN after Date parsing

**Unauthorized** → `src/app/api/exports/invoices/route.ts:41-43`:

- Status: 401 Unauthorized
- Message: "Unauthorized"
- Trigger: No user session

**Company Not Found** → `src/app/api/exports/invoices/route.ts:46-48`:

- Status: 404 Not Found
- Message: "Company not found"
- Trigger: Company lookup fails

**Accountant Export Error** → `src/app/api/reports/accountant-export/route.ts:100-106`:

- Status: 500 Internal Server Error
- Message: "Neuspješan izvoz za knjigovođu"
- Console: Error logged
- Trigger: Database or CSV generation error

**Season Pack Error** → `src/app/api/exports/season-pack/route.ts:110-116`:

- Status: 500 Internal Server Error
- Message: "Neuspješan izvoz tax season paketa"
- Console: Error logged
- Trigger: ZIP creation or archive error

## User Interface

### Export Page Layout

**Page Structure** → `src/app/(dashboard)/reports/export/page.tsx:11-49`:

- Breadcrumb text: "Paušalni obrt — handoff za knjigovođu"
- Main heading: "Izvoz podataka"
- Description paragraph explaining CSV/ZIP formats
- Grid layout: 1.2fr main card + 0.8fr info card

### Main Export Card

**Title**: "Izvoz za knjigovođu" → `src/app/(dashboard)/reports/export/page.tsx:24`

**Description**: "CSV za račune i troškove s filterom datuma" → `src/app/(dashboard)/reports/export/page.tsx:25`

**Content**: AccountingExportForm component → `src/app/(dashboard)/reports/export/page.tsx:28`

### Info Card

**Title**: "Što je uključeno" → `src/app/(dashboard)/reports/export/page.tsx:34`

**Description**: "Kompletni izvoz za 'tax season' handoff" → `src/app/(dashboard)/reports/export/page.tsx:35`

**Content** → `src/app/(dashboard)/reports/export/page.tsx:37-45`:

- Bullet list explaining each export type
- Invoices: number, dates, buyer, amounts, references
- Expenses: vendor, category, amounts, receipt links
- KPR: paid invoices only (paušalni obrt)
- Summary: totals and net result
- Tax Season ZIP: all files with README

### Date Range Inputs

**Layout**: 2-column grid on sm+ screens → `src/components/reports/accounting-export-form.tsx:31`

**From Input** → `src/components/reports/accounting-export-form.tsx:32-39`:

- Label: "Od datuma"
- Type: date
- Value: Start of current year
- OnChange: Updates from state

**To Input** → `src/components/reports/accounting-export-form.tsx:41-48`:

- Label: "Do datuma"
- Type: date
- Value: Current date
- OnChange: Updates to state

### Export Buttons

**Invoice Button** → `src/components/reports/accounting-export-form.tsx:53-60`:

- Color: Blue (bg-blue-600)
- Icon: FileSpreadsheet
- Text: "Izvoz računa (CSV)"
- Href: /api/exports/invoices?from=...&to=...

**Expense Button** → `src/components/reports/accounting-export-form.tsx:61-68`:

- Color: Gray (bg-gray-600)
- Icon: Receipt
- Text: "Izvoz troškova (CSV)"
- Href: /api/exports/expenses?from=...&to=...

**KPR Button** → `src/components/reports/accounting-export-form.tsx:72-79`:

- Color: Green (bg-green-600)
- Icon: BookOpen
- Text: "KPR izvoz (CSV)"
- Href: /api/reports/accountant-export?format=kpr&from=...&to=...

**Summary Button** → `src/components/reports/accounting-export-form.tsx:80-87`:

- Color: Purple (bg-purple-600)
- Icon: FileText
- Text: "Sažetak (CSV)"
- Href: /api/reports/accountant-export?format=summary&from=...&to=...

**Tax Season Pack Button** → `src/components/reports/accounting-export-form.tsx:91-98`:

- Color: Primary with border (border-2 border-primary)
- Background: Subtle (bg-primary/5)
- Icon: Archive (h-5 w-5, larger)
- Text: "Tax Season Paket (ZIP) - SVE ZAJEDNO" (larger font)
- Href: /api/exports/season-pack?from=...&to=...

### Help Text

**Footer Note** → `src/components/reports/accounting-export-form.tsx:101-104`:

- Text size: sm
- Color: Muted foreground
- Content: Explains CSV includes basic data, VAT, payment status, receipt links, and ZIP contains all files

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/(dashboard)/reports/export/page.tsx:7`
  - [[company-management]] - Company must exist → `src/app/(dashboard)/reports/export/page.tsx:8`
  - [[invoicing-view]] - Invoice data source → `src/app/api/exports/invoices/route.ts:81`
  - [[expenses-view]] - Expense data source → `src/app/api/exports/expenses/route.ts:81`
  - [[contacts-view]] - Buyer/vendor data for exports → `src/app/api/exports/invoices/route.ts:87-92`

- **Depended by**:
  - None (export feature is terminal, not used by other features)

## Integrations

### Zod Validation

**Library**: zod (npm package)

**Schemas** → `src/app/api/exports/invoices/route.ts:6-9`:

- Query parameter validation
- Optional date strings
- Enum validation for format parameter

**SafeParse Pattern** → `src/app/api/exports/invoices/route.ts:50`:

- Non-throwing validation
- Success boolean with data or error
- Error formatting for API responses

### Prisma ORM

**Models Used**:

- EInvoice → `prisma/schema.prisma:191-259`
- Expense → `prisma/schema.prisma:345-374`
- Contact (buyer/vendor) → `prisma/schema.prisma:148-171`
- ExpenseCategory → `prisma/schema.prisma:376-390`

**Decimal Type**: Prisma.Decimal for precise currency values → `src/lib/reports/accountant-export.ts:5`

**Aggregation**: Not used (manual JavaScript sum instead) → `src/lib/reports/accountant-export.ts:209-217`

**Tenant Isolation**: Automatic via companyId filter → `src/app/api/exports/invoices/route.ts:83`

### Archiver Library

**Library**: archiver npm package → `package.json:48`

**Version**: ^7.0.1

**Usage** → `src/app/api/exports/season-pack/route.ts:11-12`:

- Import from 'archiver'
- Stream-based ZIP creation

**Configuration** → `src/app/api/exports/season-pack/route.ts:63-65`:

- Format: "zip"
- Compression: zlib level 9 (maximum)

**Append Method** → `src/app/api/exports/season-pack/route.ts:79-86`:

- append(data, { name: filename })
- Supports string data (CSV content)

**Finalize** → `src/app/api/exports/season-pack/route.ts:89`:

- Triggers completion event
- Writes remaining data

**Event Handling** → `src/app/api/exports/season-pack/route.ts:70-76, 92-94`:

- 'data' event: Collect chunks
- 'error' event: Throw exception
- 'end' event: Promise resolution

### Next.js Response

**NextResponse.json()**: For error responses → `src/app/api/exports/invoices/route.ts:42`

**NextResponse()**: For file downloads → `src/app/api/exports/invoices/route.ts:140`

**Headers**:

- Content-Type: text/csv; charset=utf-8 → `src/app/api/exports/invoices/route.ts:142`
- Content-Disposition: attachment; filename="..." → `src/app/api/exports/invoices/route.ts:143`
- Content-Length: For ZIP files → `src/app/api/exports/season-pack/route.ts:107`

## Verification Checklist

- [ ] User can access /reports/export page with authentication
- [ ] Date inputs default to current year start and today
- [ ] All export buttons visible and styled correctly
- [ ] Invoice CSV export downloads with correct columns
- [ ] Expense CSV export includes receipt URL column
- [ ] KPR CSV export contains only paid invoices
- [ ] KPR CSV includes totals row at bottom
- [ ] Summary CSV contains company info and period totals
- [ ] Tax Season Pack ZIP contains all 5 files
- [ ] ZIP README has correct company info and totals
- [ ] CSV files open correctly in Excel with Croatian characters
- [ ] Semicolon separator works in Excel
- [ ] Date range filtering works for from and to parameters
- [ ] Inclusive end date includes full day (23:59:59)
- [ ] CSV escaping handles quotes and semicolons correctly
- [ ] UTF-8 BOM marker ensures Excel compatibility
- [ ] Invalid date parameters return 400 error
- [ ] Unauthenticated requests return 401 error
- [ ] Missing company returns 404 error
- [ ] Database errors return 500 error
- [ ] ZIP compression level is maximum (9)
- [ ] File download triggers browser save dialog
- [ ] Filename includes date range label

## Evidence Links

1. Export page entry point → `src/app/(dashboard)/reports/export/page.tsx:6`
2. AccountingExportForm component → `src/components/reports/accounting-export-form.tsx:11`
3. Invoice export API route → `src/app/api/exports/invoices/route.ts:39`
4. Expense export API route → `src/app/api/exports/expenses/route.ts:39`
5. Accountant export API route → `src/app/api/reports/accountant-export/route.ts:24`
6. Season pack ZIP route → `src/app/api/exports/season-pack/route.ts:25`
7. Date range query schema → `src/app/api/exports/invoices/route.ts:6`
8. CSV escaping function → `src/app/api/exports/invoices/route.ts:27`
9. UTF-8 BOM encoding → `src/app/api/exports/invoices/route.ts:133`
10. fetchAccountantExportData function → `src/lib/reports/accountant-export.ts:72`
11. invoicesToCsv generator → `src/lib/reports/accountant-export.ts:242`
12. expensesToCsv generator → `src/lib/reports/accountant-export.ts:282`
13. kprToCsv with totals → `src/lib/reports/accountant-export.ts:322`
14. ZIP archive creation → `src/app/api/exports/season-pack/route.ts:63`
15. README generator → `src/app/api/exports/season-pack/route.ts:119`
16. Date input defaults → `src/components/reports/accounting-export-form.tsx:13`
17. EInvoice model schema → `prisma/schema.prisma:191`
18. Expense model schema → `prisma/schema.prisma:345`
