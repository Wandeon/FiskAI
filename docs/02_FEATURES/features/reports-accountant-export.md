# Feature: Accountant Export (F063)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 15

## Purpose

The Accountant Export feature enables users to generate comprehensive structured data packages for external accountants, supporting Croatian paušalni obrt (flat-rate business) tax season handoffs. The feature provides multiple CSV export formats (invoices, expenses, KPR, summary) and a complete ZIP archive containing all financial data, optimized for Excel consumption with proper UTF-8 encoding, semicolon separators, and date range filtering.

## User Entry Points

| Type      | Path                           | Evidence                                               |
| --------- | ------------------------------ | ------------------------------------------------------ |
| Page      | /reports/export                | `src/app/(dashboard)/reports/export/page.tsx:6`        |
| Component | AccountingExportForm           | `src/components/reports/accounting-export-form.tsx:11` |
| API       | /api/reports/accountant-export | `src/app/api/reports/accountant-export/route.ts:24`    |
| API       | /api/exports/invoices          | `src/app/api/exports/invoices/route.ts:39`             |
| API       | /api/exports/expenses          | `src/app/api/exports/expenses/route.ts:39`             |
| API       | /api/exports/season-pack       | `src/app/api/exports/season-pack/route.ts:25`          |

## Core Flow

### Export Page Flow

1. User navigates to /reports page → `src/app/(dashboard)/reports/page.tsx:19`
2. System validates user authentication → `src/app/(dashboard)/reports/page.tsx:20`
3. System validates company association → `src/app/(dashboard)/reports/page.tsx:21`
4. System displays "Izvoz za knjigovođu" report card → `src/app/(dashboard)/reports/page.tsx:15`
5. User clicks on export card → redirects to `/reports/export`
6. System loads export page → `src/app/(dashboard)/reports/export/page.tsx:6`
7. System validates authentication and company → `src/app/(dashboard)/reports/export/page.tsx:7-8`
8. System renders AccountingExportForm component → `src/app/(dashboard)/reports/export/page.tsx:28`

### Date Range Selection Flow

1. Component initializes with default date range → `src/components/reports/accounting-export-form.tsx:13-19`
2. Default "from" date set to start of current year → `src/components/reports/accounting-export-form.tsx:13-16`
3. Default "to" date set to current date → `src/components/reports/accounting-export-form.tsx:12`
4. User modifies date inputs → `src/components/reports/accounting-export-form.tsx:34-48`
5. Component rebuilds download URLs with date parameters → `src/components/reports/accounting-export-form.tsx:21-27`

### CSV Export Flow - Invoices

1. User clicks "Izvoz računa (CSV)" button → `src/components/reports/accounting-export-form.tsx:54-60`
2. Browser navigates to /api/exports/invoices with date params → `src/app/api/exports/invoices/route.ts:39`
3. API validates authentication → `src/app/api/exports/invoices/route.ts:40-43`
4. API validates company → `src/app/api/exports/invoices/route.ts:45-48`
5. API parses and validates date range → `src/app/api/exports/invoices/route.ts:50-63`
6. API constructs date filter with inclusive end date → `src/app/api/exports/invoices/route.ts:65-79`
7. API fetches invoices with buyer/seller relations → `src/app/api/exports/invoices/route.ts:81-95`
8. API formats data as CSV with UTF-8 BOM → `src/app/api/exports/invoices/route.ts:97-133`
9. API returns CSV file with download headers → `src/app/api/exports/invoices/route.ts:140-145`

### CSV Export Flow - Expenses

1. User clicks "Izvoz troškova (CSV)" button → `src/components/reports/accounting-export-form.tsx:62-68`
2. Browser navigates to /api/exports/expenses with date params → `src/app/api/exports/expenses/route.ts:39`
3. API validates authentication and company → `src/app/api/exports/expenses/route.ts:40-48`
4. API parses and validates date range → `src/app/api/exports/expenses/route.ts:50-79`
5. API fetches expenses with vendor and category relations → `src/app/api/exports/expenses/route.ts:81-91`
6. API formats data including receipt URL → `src/app/api/exports/expenses/route.ts:93-125`
7. API returns CSV file with download headers → `src/app/api/exports/expenses/route.ts:127-139`

### KPR Export Flow

1. User clicks "KPR izvoz (CSV)" button → `src/components/reports/accounting-export-form.tsx:73-79`
2. Browser navigates to /api/reports/accountant-export?format=kpr → `src/app/api/reports/accountant-export/route.ts:24`
3. API validates authentication and company → `src/app/api/reports/accountant-export/route.ts:26-27`
4. API parses query parameters including format → `src/app/api/reports/accountant-export/route.ts:29-44`
5. API fetches comprehensive export data → `src/app/api/reports/accountant-export/route.ts:54`
6. System calls fetchAccountantExportData → `src/lib/reports/accountant-export.ts:72`
7. System fetches paid invoices only → `src/lib/reports/accountant-export.ts:187-196`
8. System filters by paidAt date field → `src/lib/reports/accountant-export.ts:179-185`
9. System generates KPR CSV with totals row → `src/lib/reports/accountant-export.ts:322-361`
10. API returns CSV with kpr filename → `src/app/api/reports/accountant-export/route.ts:64-72`

### Summary Export Flow

1. User clicks "Sažetak (CSV)" button → `src/components/reports/accounting-export-form.tsx:81-87`
2. Browser navigates to /api/reports/accountant-export?format=summary → `src/app/api/reports/accountant-export/route.ts:24`
3. API fetches comprehensive export data → `src/app/api/reports/accountant-export/route.ts:54`
4. System calculates totals for period → `src/lib/reports/accountant-export.ts:208-217`
5. System generates summary CSV → `src/lib/reports/accountant-export.ts:363-398`
6. API returns CSV with summary filename → `src/app/api/reports/accountant-export/route.ts:75-83`

### Tax Season Pack Flow

1. User clicks "Tax Season Paket (ZIP)" button → `src/components/reports/accounting-export-form.tsx:92-98`
2. Browser navigates to /api/exports/season-pack → `src/app/api/exports/season-pack/route.ts:25`
3. API validates authentication and company → `src/app/api/exports/season-pack/route.ts:27-28`
4. API parses date range → `src/app/api/exports/season-pack/route.ts:30-51`
5. API fetches comprehensive export data → `src/app/api/exports/season-pack/route.ts:54`
6. API creates ZIP archive with archiver → `src/app/api/exports/season-pack/route.ts:63-65`
7. API adds 4 CSV files to archive → `src/app/api/exports/season-pack/route.ts:79-82`
8. API generates and adds README file → `src/app/api/exports/season-pack/route.ts:85-86`
9. API finalizes archive → `src/app/api/exports/season-pack/route.ts:89`
10. API returns ZIP buffer with download headers → `src/app/api/exports/season-pack/route.ts:102-109`

## Key Modules

| Module                  | Purpose                               | Location                                            |
| ----------------------- | ------------------------------------- | --------------------------------------------------- |
| AccountingExportForm    | Date range picker and export buttons  | `src/components/reports/accounting-export-form.tsx` |
| ExportPage              | Main export page with description     | `src/app/(dashboard)/reports/export/page.tsx`       |
| accountant-export route | Multi-format export API (KPR/summary) | `src/app/api/reports/accountant-export/route.ts`    |
| invoices export route   | Invoice CSV export API                | `src/app/api/exports/invoices/route.ts`             |
| expenses export route   | Expense CSV export API                | `src/app/api/exports/expenses/route.ts`             |
| season-pack route       | ZIP archive generation API            | `src/app/api/exports/season-pack/route.ts`          |
| accountant-export lib   | Core export data fetching and CSV gen | `src/lib/reports/accountant-export.ts`              |

## Export Formats

### 1. Invoice Export (CSV)

**Columns** → `src/app/api/exports/invoices/route.ts:97-113`

- Broj računa (Invoice number)
- Datum izdavanja (Issue date)
- Dospijeće (Due date)
- Kupac (Buyer name)
- OIB kupca (Buyer tax ID)
- Email kupca (Buyer email)
- Smjer (Direction: INBOUND/OUTBOUND)
- Vrsta (Type)
- Status (Invoice status)
- Osnovica (Net amount EUR)
- PDV (VAT amount EUR)
- Ukupno (Total amount EUR)
- Plaćeno (Paid: DA/NE)
- Datum plaćanja (Payment date)
- Referenca (Reference number)

**Data Source** → `src/app/api/exports/invoices/route.ts:81-95`

- Table: EInvoice
- Includes: buyer, seller relations
- Filter: issueDate in range
- Order: issueDate ascending

### 2. Expense Export (CSV)

**Columns** → `src/app/api/exports/expenses/route.ts:93-108`

- Datum (Expense date)
- Opis (Description)
- Dobavljač (Vendor name)
- OIB dobavljača (Vendor tax ID)
- Kategorija (Category name)
- Status (Expense status)
- Osnovica (Net amount EUR)
- PDV (VAT amount EUR)
- Ukupno (Total amount EUR)
- Plaćeno (Paid: DA/NE)
- Datum plaćanja (Payment date)
- Način plaćanja (Payment method)
- Link na račun/sliku (Receipt URL)
- Napomena (Notes)

**Data Source** → `src/app/api/exports/expenses/route.ts:81-91`

- Table: Expense
- Includes: vendor, category relations
- Filter: date in range
- Order: date ascending

### 3. KPR Export (CSV)

**Purpose**: Knjiga Primitaka i Izdataka (Cash Register Book) for Croatian paušalni obrt

**Columns** → `src/lib/reports/accountant-export.ts:323-331`

- Datum plaćanja (Payment date)
- Datum izdavanja (Issue date)
- Broj računa (Invoice number)
- Kupac (Buyer name)
- Osnovica (EUR) (Net amount)
- PDV (EUR) (VAT amount)
- Ukupno (EUR) (Total amount)

**Special Features**:

- Only includes paid invoices → `src/lib/reports/accountant-export.ts:187-196`
- Filters by paidAt date field → `src/lib/reports/accountant-export.ts:190`
- Includes totals row → `src/lib/reports/accountant-export.ts:346-358`
- Ordered by paidAt date → `src/lib/reports/accountant-export.ts:195`

**Data Source** → `src/lib/reports/accountant-export.ts:187-206`

- Table: EInvoice
- Filter: paidAt NOT NULL and in date range
- Includes: buyer relation
- Order: paidAt ascending

### 4. Summary Export (CSV)

**Purpose**: Executive summary of period financial results

**Content** → `src/lib/reports/accountant-export.ts:363-398`

- Company information (name, OIB, VAT number)
- Period range
- Export date
- Income summary (count, net, VAT, gross)
- Expense summary (count, net, VAT, gross)
- Net profit/loss calculation
- KPR row count

**Calculations** → `src/lib/reports/accountant-export.ts:208-217`

- totalIncome: Sum of invoice net amounts
- totalIncomeVat: Sum of invoice VAT amounts
- totalIncomeGross: Sum of invoice total amounts
- totalExpenses: Sum of expense net amounts
- totalExpensesVat: Sum of expense VAT amounts
- totalExpensesGross: Sum of expense total amounts
- netProfit: totalIncomeGross - totalExpensesGross

### 5. Tax Season Pack (ZIP)

**Contents** → `src/app/api/exports/season-pack/route.ts:79-86`

- 00-SAZETAK.csv (Summary)
- 01-RACUNI.csv (Invoices)
- 02-TROSKOVI.csv (Expenses)
- 03-KPR.csv (Cash register book)
- PROCITAJ-ME.txt (README with instructions)

**README Content** → `src/app/api/exports/season-pack/route.ts:119-199`

- Company details
- Period and export date
- File descriptions with counts
- Technical notes (encoding, separators, formats)
- Result summary (income, expenses, profit)

**Compression** → `src/app/api/exports/season-pack/route.ts:63-65`

- Format: ZIP
- Compression level: 9 (maximum)
- Library: archiver (npm package)

## Data Fetching

### fetchAccountantExportData Function

**Purpose**: Central data aggregation function for all export formats

**Location** → `src/lib/reports/accountant-export.ts:72-238`

**Parameters**:

- companyId: string (required)
- from: Date (optional - start of range)
- to: Date (optional - end of range)

**Fetches**:

1. **Company Info** → `src/lib/reports/accountant-export.ts:78-85`
   - name, oib, vatNumber
   - Throws error if company not found

2. **Invoices** → `src/lib/reports/accountant-export.ts:117-128`
   - Filter: issueDate in range
   - Includes: buyer relation
   - Order: issueDate ascending

3. **Expenses** → `src/lib/reports/accountant-export.ts:148-158`
   - Filter: date in range
   - Includes: vendor, category relations
   - Order: date ascending

4. **KPR Rows** → `src/lib/reports/accountant-export.ts:187-196`
   - Filter: paidAt NOT NULL and in range
   - Includes: buyer relation
   - Order: paidAt ascending

**Date Handling** → `src/lib/reports/accountant-export.ts:92-114`

- "to" date made inclusive (23:59:59.999)
- Both dates optional (fetches all if omitted)
- Applied to issueDate, date, and paidAt fields

**Returns**: AccountantExportData object with invoices, expenses, kprRows, and totals

## CSV Generation

### Common CSV Features

**Encoding** → All CSV files use UTF-8 BOM

- BOM character: `\uFEFF` prepended to output
- Invoice: `src/app/api/exports/invoices/route.ts:133`
- Expense: `src/app/api/exports/expenses/route.ts:127`
- KPR: `src/lib/reports/accountant-export.ts:360`
- Summary: `src/lib/reports/accountant-export.ts:366`

**Separator**: Semicolon (;)

- Croatian Excel default
- Invoice: `src/app/api/exports/invoices/route.ts:36`
- Expense: `src/app/api/exports/expenses/route.ts:36`
- KPR: `src/lib/reports/accountant-export.ts:331`
- Summary: `src/lib/reports/accountant-export.ts:377`

**CSV Escaping** → `src/app/api/exports/invoices/route.ts:27-33`

- Values containing `;`, `"`, or `\n` are wrapped in quotes
- Double quotes inside values escaped as `""`
- Applied to all string fields

**Number Formatting**:

- Money: 2 decimal places → `src/app/api/exports/invoices/route.ts:22-25`
- Decimal conversion: Prisma Decimal → JavaScript Number → `src/lib/reports/accountant-export.ts:402-406`

**Date Formatting** → `src/app/api/exports/invoices/route.ts:17-20`

- Format: ISO 8601 (YYYY-MM-DD)
- Empty dates return empty string
- Croatian accountant standard

**Boolean Formatting**:

- TRUE → "DA" (Croatian for "yes")
- FALSE → "NE" (Croatian for "no")
- Invoice paid: `src/app/api/exports/invoices/route.ts:128`
- Expense paid: `src/app/api/exports/expenses/route.ts:120`

## Validation

### Date Range Validation

**Client-Side** → `src/components/reports/accounting-export-form.tsx:34-48`

- Uses HTML5 date inputs
- Browser native validation
- Real-time URL rebuilding on change

**Server-Side** → `src/app/api/reports/accountant-export/route.ts:29-51`

1. Query schema validation with Zod → `src/app/api/reports/accountant-export/route.ts:12-16`
   - from: string optional
   - to: string optional
   - format: enum ["csv", "summary", "kpr"] default "csv"

2. Date parsing validation → `src/app/api/reports/accountant-export/route.ts:18-22`
   - Empty string → undefined
   - Invalid date → undefined
   - Valid date → Date object

3. Date format validation → `src/app/api/reports/accountant-export/route.ts:46-51`
   - Returns 400 if "from" provided but invalid
   - Returns 400 if "to" provided but invalid

**Same validation in all export routes**:

- invoices route → `src/app/api/exports/invoices/route.ts:50-63`
- expenses route → `src/app/api/exports/expenses/route.ts:50-63`
- season-pack route → `src/app/api/exports/season-pack/route.ts:30-51`

### Authentication & Authorization

**Authentication Required** → All export routes

1. User must be authenticated
   - Invoice: `src/app/api/exports/invoices/route.ts:40-43`
   - Expense: `src/app/api/exports/expenses/route.ts:40-43`
   - Accountant: `src/app/api/reports/accountant-export/route.ts:26`
   - Season pack: `src/app/api/exports/season-pack/route.ts:27`

2. Company association required
   - Invoice: `src/app/api/exports/invoices/route.ts:45-48`
   - Expense: `src/app/api/exports/expenses/route.ts:45-48`
   - Accountant: `src/app/api/reports/accountant-export/route.ts:27`
   - Season pack: `src/app/api/exports/season-pack/route.ts:28`

**RBAC Permissions** → `src/lib/rbac.ts:50-51`

- reports:read: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER']
- reports:export: ['OWNER', 'ADMIN', 'ACCOUNTANT']

**Tenant Isolation**:

- All queries scoped to companyId
- Prisma tenant context applied
- No cross-company data leakage

## Error Handling

### Client Errors

1. **Invalid Date Format** → `src/app/api/reports/accountant-export/route.ts:46-51`
   - Status: 400 Bad Request
   - Response: `{ error: "Neispravan datum 'from'" }`
   - Response: `{ error: "Neispravan datum 'to'" }`

2. **Invalid Query Parameters** → `src/app/api/reports/accountant-export/route.ts:36-41`
   - Status: 400 Bad Request
   - Response: `{ error: "Neispravan upit", details: ZodError }`

3. **Authentication Failure** → `src/app/api/exports/invoices/route.ts:41-43`
   - Status: 401 Unauthorized
   - Response: `{ error: "Unauthorized" }`

4. **Company Not Found** → `src/app/api/exports/invoices/route.ts:46-48`
   - Status: 404 Not Found
   - Response: `{ error: "Company not found" }`

### Server Errors

1. **Data Fetch Error** → `src/app/api/reports/accountant-export/route.ts:100-106`
   - Status: 500 Internal Server Error
   - Response: `{ error: "Neuspješan izvoz za knjigovođu" }`
   - Error logged to console

2. **Season Pack Generation Error** → `src/app/api/exports/season-pack/route.ts:110-116`
   - Status: 500 Internal Server Error
   - Response: `{ error: "Neuspješan izvoz tax season paketa" }`
   - Error logged to console

3. **Company Not Found During Fetch** → `src/lib/reports/accountant-export.ts:87-89`
   - Throws Error: "Company not found"
   - Caught by API error handler

## Database Schema

### EInvoice Model

**Relevant Fields** → `prisma/schema.prisma:191-228`

- id: String (CUID)
- companyId: String (tenant isolation)
- direction: EInvoiceDirection (INBOUND/OUTBOUND)
- sellerId: String (nullable)
- buyerId: String (nullable)
- invoiceNumber: String
- issueDate: DateTime (for date range filtering)
- dueDate: DateTime (nullable)
- netAmount: Decimal(10,2)
- vatAmount: Decimal(10,2)
- totalAmount: Decimal(10,2)
- status: EInvoiceStatus
- paidAt: DateTime (nullable, for KPR filtering)
- providerRef: String (nullable)
- internalReference: String (nullable)

**Relations Used**:

- buyer: Contact (via buyerId)
- seller: Contact (via sellerId)

### Expense Model

**Relevant Fields** → `prisma/schema.prisma:345-373`

- id: String (CUID)
- companyId: String (tenant isolation)
- vendorId: String (nullable)
- categoryId: String
- description: String
- date: DateTime (for date range filtering)
- dueDate: DateTime (nullable)
- netAmount: Decimal(10,2)
- vatAmount: Decimal(10,2)
- totalAmount: Decimal(10,2)
- status: ExpenseStatus
- paymentDate: DateTime (nullable)
- paymentMethod: String (nullable)
- receiptUrl: String (nullable, important for accountants)
- notes: String (nullable)

**Relations Used**:

- vendor: Contact (via vendorId)
- category: ExpenseCategory (via categoryId)

## UI Components

### AccountingExportForm Component

**Location** → `src/components/reports/accounting-export-form.tsx:11-107`

**State Management**:

- from: string (default: start of year)
- to: string (default: today)
- useState hooks for controlled inputs

**Date Initialization** → `src/components/reports/accounting-export-form.tsx:12-19`

- Uses useMemo for stable date values
- Converts Date to input format (YYYY-MM-DD)

**URL Building** → `src/components/reports/accounting-export-form.tsx:21-27`

- Constructs query string with from/to params
- Skips empty parameters
- Applied to all export links

**Layout** → `src/components/reports/accounting-export-form.tsx:30-105`

- Date inputs in 2-column grid
- Export buttons in 2x2 grid
- Season pack button full width
- Help text at bottom

**Button Styling**:

- Invoices: Blue (primary financial data)
- Expenses: Gray (secondary data)
- KPR: Green (regulatory compliance)
- Summary: Purple (executive overview)
- Season pack: Bordered with background (special emphasis)

**Icons** → `src/components/reports/accounting-export-form.tsx:4`

- FileSpreadsheet (invoices)
- Receipt (expenses)
- BookOpen (KPR)
- FileText (summary)
- Archive (season pack)

### Export Page

**Location** → `src/app/(dashboard)/reports/export/page.tsx:6-51`

**Layout**:

1. Header with breadcrumb and title → `src/app/(dashboard)/reports/export/page.tsx:12-18`
2. Two-column grid (desktop) → `src/app/(dashboard)/reports/export/page.tsx:21`
3. Export form card (left/main) → `src/app/(dashboard)/reports/export/page.tsx:22-30`
4. Help card (right/sidebar) → `src/app/(dashboard)/reports/export/page.tsx:32-47`

**Help Content** → `src/app/(dashboard)/reports/export/page.tsx:37-42`

- Description of each export type
- Technical details (CSV format, date filtering)
- Use case explanation (tax season handoff)

## Cache Management

**No Caching**: Export APIs are read-only and stateless

- Fresh data fetched on each request
- No revalidation needed
- No cache headers set
- Direct file download response

**Reason**: Export data should always reflect current database state at time of request

## Dependencies

**Depends on**:

- [[auth-login]] - User authentication required → All export routes
- [[company-management]] - Company must exist → All export routes
- [[e-invoicing-create]] - Provides invoice data → `src/lib/reports/accountant-export.ts:117`
- [[expenses-create]] - Provides expense data → `src/lib/reports/accountant-export.ts:148`
- [[contacts-management]] - Buyer/seller/vendor relations → `src/app/api/exports/invoices/route.ts:86`

**Depended by**:

- [[reports-view]] - Export linked from reports page → `src/app/(dashboard)/reports/page.tsx:15`
- [[accountant-dashboard]] - Export linked from accountant page → `src/app/(dashboard)/accountant/page.tsx:367`

## Integrations

### Zod Validation

**Library**: zod (npm package)

**Schemas**:

- querySchema → `src/app/api/reports/accountant-export/route.ts:12-16`
  - Validates from/to dates and format parameter
  - Used in all export routes
- SafeParse used for graceful error handling

### Prisma ORM

**Database Access**:

- db.company.findUnique → Company details
- db.eInvoice.findMany → Invoice data with relations
- db.expense.findMany → Expense data with relations
- Automatic tenant isolation via companyId filter
- Decimal field conversion to numbers

### Archiver Library

**Library**: archiver (npm package)

**Usage** → `src/app/api/exports/season-pack/route.ts:11-12, 63-89`

- Creates ZIP archives
- Appends CSV files and README
- Maximum compression (level 9)
- Stream-based processing

### Node.js Streams

**Usage** → `src/app/api/exports/season-pack/route.ts:12, 68-94`

- Readable stream import
- Archive data collection in chunks
- Buffer concatenation for response

## Verification Checklist

- [ ] User can access /reports/export page with authentication
- [ ] Date range defaults to current year (Jan 1 - today)
- [ ] Date inputs are functional and update URLs
- [ ] Invoice export button downloads CSV with correct columns
- [ ] Expense export button downloads CSV with receiptUrl
- [ ] KPR export only includes paid invoices
- [ ] KPR export includes totals row
- [ ] Summary export shows company info and period totals
- [ ] Tax season pack downloads ZIP file
- [ ] ZIP contains all 4 CSV files plus README
- [ ] CSV files use UTF-8 BOM encoding
- [ ] CSV files use semicolon separator
- [ ] Decimal values formatted with 2 decimal places
- [ ] Dates formatted as YYYY-MM-DD
- [ ] Boolean values show DA/NE (Croatian)
- [ ] Date range filtering works correctly
- [ ] End date is inclusive (23:59:59.999)
- [ ] Empty date range fetches all data
- [ ] Authentication required for all exports
- [ ] Company isolation enforced
- [ ] RBAC permissions enforced (reports:export)
- [ ] Invalid dates return 400 error
- [ ] Filenames include date range label
- [ ] CSV escaping handles semicolons and quotes
- [ ] Archives use maximum compression

## Evidence Links

1. Export page entry point → `src/app/(dashboard)/reports/export/page.tsx:6`
2. AccountingExportForm component → `src/components/reports/accounting-export-form.tsx:11`
3. Accountant export API route → `src/app/api/reports/accountant-export/route.ts:24`
4. Invoice export API route → `src/app/api/exports/invoices/route.ts:39`
5. Expense export API route → `src/app/api/exports/expenses/route.ts:39`
6. Season pack API route → `src/app/api/exports/season-pack/route.ts:25`
7. Core export data fetching → `src/lib/reports/accountant-export.ts:72`
8. KPR CSV generation → `src/lib/reports/accountant-export.ts:322`
9. Summary CSV generation → `src/lib/reports/accountant-export.ts:363`
10. ZIP archive creation → `src/app/api/exports/season-pack/route.ts:63`
11. Date range validation → `src/app/api/reports/accountant-export/route.ts:46`
12. RBAC permissions → `src/lib/rbac.ts:50`
13. Reports page link → `src/app/(dashboard)/reports/page.tsx:15`
14. EInvoice schema → `prisma/schema.prisma:191`
15. Expense schema → `prisma/schema.prisma:345`
