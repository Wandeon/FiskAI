# Feature: Aging Report

## Status

- Documentation: Complete
- Last verified: 2025-12-15
- Evidence count: 10

## Purpose

Provides a comprehensive accounts receivable aging report that categorizes unpaid invoices into aging buckets (Current, 1-30 days, 31-60 days, 61-90 days, 90+ days overdue). Users can monitor outstanding receivables, identify overdue payments, track cash flow risks, and prioritize collection efforts. The report displays summary metrics by aging category with color-coded visual indicators and a detailed table showing individual unpaid invoices with days overdue calculations.

## User Entry Points

| Type | Path            | Evidence                                           |
| ---- | --------------- | -------------------------------------------------- |
| Page | /reports/aging  | `src/app/(dashboard)/reports/aging/page.tsx:8-118` |
| Link | Reports Index   | `src/app/(dashboard)/reports/page.tsx:12`          |
| Link | Reports Sidebar | `src/components/documents/reports-sidebar.tsx:12`  |

## Core Flow

### Aging Report Generation Flow

1. User navigates to Reports page at /reports → `src/app/(dashboard)/reports/page.tsx:19-101`
2. User clicks "Starost potraživanja" card → `src/app/(dashboard)/reports/page.tsx:12`
3. System authenticates user and verifies company access → `src/app/(dashboard)/reports/aging/page.tsx:9-10`
4. System sets tenant context for data isolation → `src/app/(dashboard)/reports/aging/page.tsx:12`
5. System calculates aging bucket date thresholds → `src/app/(dashboard)/reports/aging/page.tsx:14-17`
   - Current date (now)
   - 30 days ago (day30)
   - 60 days ago (day60)
   - 90 days ago (day90)
6. System fetches unpaid invoices filtered by status → `src/app/(dashboard)/reports/aging/page.tsx:20-24`
7. System categorizes invoices into aging buckets → `src/app/(dashboard)/reports/aging/page.tsx:26-32`
8. System calculates totals for each bucket → `src/app/(dashboard)/reports/aging/page.tsx:34-40`
9. Page displays summary cards with aging buckets → `src/app/(dashboard)/reports/aging/page.tsx:54-90`
10. Page displays detailed invoice list with overdue days → `src/app/(dashboard)/reports/aging/page.tsx:92-115`
11. User can click invoice number to view details → `src/app/(dashboard)/reports/aging/page.tsx:103`

### Aging Bucket Categorization Logic

1. System defines date range boundaries → `src/app/(dashboard)/reports/aging/page.tsx:14-17`
   - now: current date
   - day30: 30 days before now
   - day60: 60 days before now
   - day90: 90 days before now
2. **Current bucket**: invoices where dueDate >= now → `src/app/(dashboard)/reports/aging/page.tsx:27`
3. **1-30 days**: invoices where dueDate < now AND dueDate >= day30 → `src/app/(dashboard)/reports/aging/page.tsx:28`
4. **31-60 days**: invoices where dueDate < day30 AND dueDate >= day60 → `src/app/(dashboard)/reports/aging/page.tsx:29`
5. **61-90 days**: invoices where dueDate < day60 AND dueDate >= day90 → `src/app/(dashboard)/reports/aging/page.tsx:30`
6. **90+ days**: invoices where dueDate < day90 → `src/app/(dashboard)/reports/aging/page.tsx:31`

### Days Overdue Calculation

1. For each unpaid invoice in detail table → `src/app/(dashboard)/reports/aging/page.tsx:99-110`
2. System calculates time difference between now and dueDate → `src/app/(dashboard)/reports/aging/page.tsx:100`
3. System converts milliseconds to days using floor rounding → `src/app/(dashboard)/reports/aging/page.tsx:100`
4. If daysOverdue > 0: displays "{days} dana kasni" in red → `src/app/(dashboard)/reports/aging/page.tsx:107`
5. If daysOverdue <= 0: displays "Tekući" in green → `src/app/(dashboard)/reports/aging/page.tsx:107`

## Key Modules

| Module               | Purpose                                    | Location                                       |
| -------------------- | ------------------------------------------ | ---------------------------------------------- |
| Aging Report Page    | Server component rendering aging report    | `src/app/(dashboard)/reports/aging/page.tsx`   |
| Reports Index        | Landing page listing all available reports | `src/app/(dashboard)/reports/page.tsx`         |
| Reports Sidebar      | Quick access sidebar with report links     | `src/components/documents/reports-sidebar.tsx` |
| Authentication Utils | Auth and company context utilities         | `src/lib/auth-utils.ts:12-48`                  |
| Tenant Context       | Multi-tenant data isolation                | `src/lib/prisma-extensions.ts:22-30`           |
| Format Utils         | Currency and date formatting               | `src/lib/format.ts:4-11`                       |

## Data

### Database Tables

- **EInvoice**: Main invoice table → `prisma/schema.prisma:191-259`
  - Key fields: id, companyId, invoiceNumber, issueDate, dueDate, totalAmount
  - Status field: filters for SENT, DELIVERED (unpaid invoices) → `prisma/schema.prisma:205`
  - dueDate: DateTime field used for aging calculation → `prisma/schema.prisma:199`
  - paidAt: DateTime field (null means unpaid) → `prisma/schema.prisma:232`
  - Buyer relation: links to Contact for customer name → `prisma/schema.prisma:244`
  - Indexed by: companyId, status → `prisma/schema.prisma:253-254`

- **Contact**: Customer/supplier information → `prisma/schema.prisma:148-171`
  - name field: displayed in invoice details table
  - Used for buyer relationship in invoices

### Invoice Status Enum

```typescript
enum EInvoiceStatus {
  DRAFT              // Not included in aging (draft invoices)
  PENDING_FISCALIZATION
  FISCALIZED
  SENT               // Included in aging report
  DELIVERED          // Included in aging report
  ACCEPTED
  REJECTED
  ARCHIVED
  ERROR
}
```

Source: `prisma/schema.prisma:803-813`

### Report Type Enum

```typescript
enum ReportType {
  VAT_SUMMARY
  PROFIT_LOSS
  REVENUE_BY_CUSTOMER
  EXPENSES_BY_CATEGORY
  RECEIVABLES_AGING    // This feature
  PAYABLES_AGING
  CASH_FLOW
}
```

Source: `prisma/schema.prisma:860-861`

## Display Sections

### Page Header

- Title: "Starost potraživanja" → `src/app/(dashboard)/reports/aging/page.tsx:48`
- Description: "Pregled neplaćenih računa po dospjelosti" → `src/app/(dashboard)/reports/aging/page.tsx:49`
- Back button: Links to /reports → `src/app/(dashboard)/reports/aging/page.tsx:51`

### Aging Summary Cards

Five metric cards in responsive grid (2 columns mobile, 5 columns desktop) → `src/app/(dashboard)/reports/aging/page.tsx:54`:

1. **Current (Tekući)** → `src/app/(dashboard)/reports/aging/page.tsx:55-61`
   - Color: Green (text-green-600)
   - Displays: Total amount and count of invoices
   - Criteria: Not yet due (dueDate >= now)

2. **1-30 days overdue** → `src/app/(dashboard)/reports/aging/page.tsx:62-68`
   - Color: Yellow (text-yellow-600)
   - Displays: Total amount and count of invoices
   - Criteria: Overdue by 1-30 days

3. **31-60 days overdue** → `src/app/(dashboard)/reports/aging/page.tsx:69-75`
   - Color: Orange (text-orange-600)
   - Displays: Total amount and count of invoices
   - Criteria: Overdue by 31-60 days

4. **61-90 days overdue** → `src/app/(dashboard)/reports/aging/page.tsx:76-82`
   - Color: Red (text-red-500)
   - Displays: Total amount and count of invoices
   - Criteria: Overdue by 61-90 days

5. **90+ days overdue** → `src/app/(dashboard)/reports/aging/page.tsx:83-89`
   - Color: Dark Red (text-red-700)
   - Border: Red border (border-red-500)
   - Displays: Total amount and count of invoices
   - Criteria: Overdue by more than 90 days
   - Visual emphasis: Red border to highlight critical aging

### Unpaid Invoices Detail Table

Card with detailed invoice list → `src/app/(dashboard)/reports/aging/page.tsx:92-115`:

- **Header**: "Detalji neplaćenih računa" → `src/app/(dashboard)/reports/aging/page.tsx:94`
- **Conditional display**: Only shown when unpaidInvoices.length > 0 → `src/app/(dashboard)/reports/aging/page.tsx:92`
- **Row limit**: Displays first 20 invoices → `src/app/(dashboard)/reports/aging/page.tsx:99`
- **Sorted by**: dueDate ascending (oldest first) → `src/app/(dashboard)/reports/aging/page.tsx:23`

**Table columns**:

1. **Račun** (Invoice Number): Clickable link to invoice detail page → `src/app/(dashboard)/reports/aging/page.tsx:103`
2. **Kupac** (Customer): Buyer name from Contact relation → `src/app/(dashboard)/reports/aging/page.tsx:104`
3. **Dospijeće** (Due Date): Croatian date format → `src/app/(dashboard)/reports/aging/page.tsx:105`
4. **Iznos** (Amount): EUR currency formatted, right-aligned → `src/app/(dashboard)/reports/aging/page.tsx:106`
5. **Status**: Days overdue or "Tekući" with color coding → `src/app/(dashboard)/reports/aging/page.tsx:107`

## Actions Available

### View Aging Report

- **Entry**: Navigate to /reports/aging from reports index
- **Access Control**: Requires authentication and company context → `src/app/(dashboard)/reports/aging/page.tsx:9-10`
- **Data Filtering**: Automatically filtered by companyId for tenant isolation → `src/app/(dashboard)/reports/aging/page.tsx:21`

### Navigate to Invoice Detail

- **Action**: Click invoice number in table → `src/app/(dashboard)/reports/aging/page.tsx:103`
- **Destination**: /invoices/:id
- **Purpose**: View full invoice details and take payment actions

### Return to Reports Index

- **Button**: "← Natrag" in header → `src/app/(dashboard)/reports/aging/page.tsx:51`
- **Destination**: /reports
- **Purpose**: Access other available reports

## Metrics & Calculations

### Aging Bucket Totals

For each aging category → `src/app/(dashboard)/reports/aging/page.tsx:34-40`:

- **Current**: Sum of totalAmount for invoices not yet due
- **1-30 days**: Sum of totalAmount for invoices 1-30 days overdue
- **31-60 days**: Sum of totalAmount for invoices 31-60 days overdue
- **61-90 days**: Sum of totalAmount for invoices 61-90 days overdue
- **90+ days**: Sum of totalAmount for invoices over 90 days overdue
- Uses reduce() to sum Decimal values converted to number

### Days Overdue Calculation

Formula: `Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))`

- Source: `src/app/(dashboard)/reports/aging/page.tsx:100`
- Returns: Integer number of days
- Positive: Invoice is overdue
- Zero or negative: Invoice is current (not overdue)

### Currency Formatting

Croatian EUR formatting → `src/app/(dashboard)/reports/aging/page.tsx:42`:

- Locale: hr-HR
- Currency: EUR
- Format: "123.456,78 €"
- Source utility: `src/lib/format.ts:4-11`

## Security Features

### Authentication & Authorization

- Requires authenticated user → `src/app/(dashboard)/reports/aging/page.tsx:9`
- Company ownership validation → `src/app/(dashboard)/reports/aging/page.tsx:10`
- Tenant context isolation → `src/app/(dashboard)/reports/aging/page.tsx:12`
- No authentication redirects to /login → `src/lib/auth-utils.ts:15`
- No company redirects to /onboarding → `src/lib/auth-utils.ts:46`

### Data Access Controls

- Invoices filtered by companyId → `src/app/(dashboard)/reports/aging/page.tsx:21`
- Tenant context set before database queries → `src/app/(dashboard)/reports/aging/page.tsx:12`
- Multi-tenant isolation prevents cross-company data access → `src/lib/prisma-extensions.ts:22-30`

### Query Filtering

Unpaid invoice criteria → `src/app/(dashboard)/reports/aging/page.tsx:21`:

- companyId: Ensures tenant isolation
- status: Only SENT or DELIVERED invoices (excludes DRAFT, ACCEPTED/paid)
- dueDate: Must have due date (not null)
- Ordered by: dueDate ascending (oldest first)

## Dependencies

- **Depends on**:
  - Invoice Management - Source of invoice data
  - Contact Management - Buyer information for display
  - Company Settings - Tenant context and authentication
  - Authentication System - User session and access control

- **Depended by**:
  - Cash Flow Management - Uses aging data for forecasting
  - Collections Process - Identifies overdue invoices for follow-up
  - Financial Reporting - Aging as component of financial health

## Integrations

### Prisma ORM

- findMany with where clause → `src/app/(dashboard)/reports/aging/page.tsx:20-24`
- Include relations (buyer) → `src/app/(dashboard)/reports/aging/page.tsx:22`
- Decimal type for monetary values → `prisma/schema.prisma:202-204`
- Ordered by dueDate ascending → `src/app/(dashboard)/reports/aging/page.tsx:23`
- Status enum filtering → `src/app/(dashboard)/reports/aging/page.tsx:21`

### Next.js Features

- Server component for data fetching → `src/app/(dashboard)/reports/aging/page.tsx:8`
- Link component for navigation → `src/app/(dashboard)/reports/aging/page.tsx:4`
- Async/await for database operations → `src/app/(dashboard)/reports/aging/page.tsx:8`

### UI Components

- Card components for layout → `src/app/(dashboard)/reports/aging/page.tsx:5`
- Button component for actions → `src/app/(dashboard)/reports/aging/page.tsx:6`
- Responsive grid layout → `src/app/(dashboard)/reports/aging/page.tsx:54`
- Color-coded text utilities (Tailwind CSS)

## UI Components

### Layout Components

- **Card, CardContent, CardHeader, CardTitle**: Structure containers → `src/components/ui/card.tsx:4-58`
- **Grid layout**: Responsive 2/5 column grid for aging buckets → `src/app/(dashboard)/reports/aging/page.tsx:54`
- **Table layout**: Full-width responsive table → `src/app/(dashboard)/reports/aging/page.tsx:96-112`

### Color Coding System

Progressive severity indicators:

- **Green** (text-green-600): Current/on-time invoices → `src/app/(dashboard)/reports/aging/page.tsx:58,107`
- **Yellow** (text-yellow-600): 1-30 days overdue → `src/app/(dashboard)/reports/aging/page.tsx:65`
- **Orange** (text-orange-600): 31-60 days overdue → `src/app/(dashboard)/reports/aging/page.tsx:72`
- **Red** (text-red-500): 61-90 days overdue → `src/app/(dashboard)/reports/aging/page.tsx:79`
- **Dark Red** (text-red-700 + border-red-500): 90+ days overdue → `src/app/(dashboard)/reports/aging/page.tsx:83,86`

### Button Styles

- **Outline variant**: Back button → `src/app/(dashboard)/reports/aging/page.tsx:51`
- **Link wrapper**: Navigation to /reports → `src/components/ui/button.tsx:17`

### Typography

- **Font mono**: Invoice numbers and amounts → `src/app/(dashboard)/reports/aging/page.tsx:103,106`
- **Text sizes**: xl for totals, sm for labels, xs for counts
- **Font weights**: bold for totals and headings

## Error Handling

- **No authentication**: Redirects to /login → `src/lib/auth-utils.ts:14-16`
- **No company**: Redirects to /onboarding → `src/lib/auth-utils.ts:45-47`
- **Empty state**: Conditional rendering when no unpaid invoices → `src/app/(dashboard)/reports/aging/page.tsx:92`
- **Missing due dates**: Filtered out in query (dueDate: { not: null }) → `src/app/(dashboard)/reports/aging/page.tsx:21`
- **Missing buyer**: Shows "-" placeholder → `src/app/(dashboard)/reports/aging/page.tsx:104`

## Verification Checklist

- [x] User can view aging report at /reports/aging
- [x] Report accessible from Reports index and sidebar
- [x] Aging buckets calculated correctly (Current, 1-30, 31-60, 61-90, 90+)
- [x] Color coding reflects severity (green to dark red)
- [x] Summary cards display totals and counts
- [x] Detail table shows unpaid invoices
- [x] Days overdue calculated and displayed correctly
- [x] Invoice numbers link to detail pages
- [x] Buyer names displayed from Contact relation
- [x] Currency formatted in Croatian EUR format
- [x] Dates formatted in Croatian locale
- [x] Only unpaid invoices included (SENT/DELIVERED status)
- [x] Tenant isolation prevents cross-company data access
- [x] Invoices filtered by companyId
- [x] Sorted by due date ascending (oldest first)
- [x] Back button navigates to Reports index

## Related Features

- **Reports Index**: `src/app/(dashboard)/reports/page.tsx:12` - Entry point
- **Invoice Details**: Linked from invoice number column
- **Contact Details**: `src/app/(dashboard)/contacts/[id]/page.tsx:116-121` - Overdue invoice tracking
- **Payment Tracking**: `src/app/(dashboard)/contacts/[id]/page.tsx:91-110` - Payment behavior analytics
- **Financial Reports**: Part of broader reporting suite

## Evidence Links

1. `src/app/(dashboard)/reports/aging/page.tsx:8-118` - Main aging report page component
2. `src/app/(dashboard)/reports/aging/page.tsx:14-17` - Aging bucket date threshold calculations
3. `src/app/(dashboard)/reports/aging/page.tsx:20-24` - Unpaid invoices query with filtering
4. `src/app/(dashboard)/reports/aging/page.tsx:26-32` - Invoice categorization into aging buckets
5. `src/app/(dashboard)/reports/aging/page.tsx:34-40` - Aging bucket total calculations
6. `src/app/(dashboard)/reports/aging/page.tsx:54-90` - Summary cards with color-coded metrics
7. `src/app/(dashboard)/reports/aging/page.tsx:92-115` - Detailed invoice table with overdue days
8. `src/app/(dashboard)/reports/aging/page.tsx:100` - Days overdue calculation formula
9. `src/app/(dashboard)/reports/page.tsx:12` - Reports index entry point
10. `src/components/documents/reports-sidebar.tsx:12` - Reports sidebar quick access link
