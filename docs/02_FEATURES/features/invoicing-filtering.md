# Feature: Invoice Filtering

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 12

## Purpose

The Invoice Filtering feature provides a comprehensive, multi-criteria filtering system for the unified documents hub (/documents), enabling users to quickly find specific invoices by category, search term, and navigate through large datasets with pagination. This feature consolidates filtering for invoices, e-invoices, bank statements, and expenses into a single, cohesive interface.

## User Entry Points

| Type | Path       | Evidence                                                            |
| ---- | ---------- | ------------------------------------------------------------------- |
| Page | /documents | `src/app/(dashboard)/documents/page.tsx:38`                         |
| Page | /invoices  | `src/app/(dashboard)/invoices/page.tsx:5` (redirects to /documents) |

## Core Flow

1. User navigates to /documents (or legacy /invoices which redirects) → `src/app/(dashboard)/documents/page.tsx:38-42`
2. System parses query parameters: category, search, page → `src/app/(dashboard)/documents/page.tsx:90-96`
3. System fetches unified documents with filters applied → `src/app/(dashboard)/documents/page.tsx:98-104`
4. System queries all document types in parallel (invoices, bank statements, expenses) → `src/lib/documents/unified-query.ts:110-153`
5. Search filters are applied to invoice numbers and buyer names → `src/lib/documents/unified-query.ts:115-120`
6. Results are filtered by category if specified → `src/lib/documents/unified-query.ts:204-212`
7. Documents are sorted by date descending and paginated → `src/lib/documents/unified-query.ts:214-224`
8. User can interact with CategoryCards to filter by document type → `src/components/documents/category-cards.tsx:31-117`
9. User can enter search terms to filter by number/buyer/counterparty → `src/app/(dashboard)/documents/page.tsx:210-225`
10. Pagination preserves all active filters via query parameters → `src/app/(dashboard)/documents/page.tsx:182-188`

## Key Modules

| Module                | Purpose                                            | Location                                      |
| --------------------- | -------------------------------------------------- | --------------------------------------------- |
| DocumentsPage         | Main server component with filtering logic         | `src/app/(dashboard)/documents/page.tsx`      |
| queryUnifiedDocuments | Server-side query aggregator for all doc types     | `src/lib/documents/unified-query.ts`          |
| CategoryCards         | Client component for category filter pills         | `src/components/documents/category-cards.tsx` |
| InvoiceFilters        | Legacy filter component (type/status multi-select) | `src/components/invoices/invoice-filters.tsx` |
| MultiSelect           | Reusable multi-select dropdown component           | `src/components/ui/multi-select.tsx`          |

## Filter Components

### Legacy Invoice Filters (Deprecated in favor of unified documents)

The `InvoiceFilters` component was originally built for a dedicated /invoices page → `src/components/invoices/invoice-filters.tsx:18-122`

**Features:**

- Search by invoice number, buyer name, or description → `src/components/invoices/invoice-filters.tsx:63-70`
- Multi-select filters for document type (Invoice, E-Invoice, Quote, etc.) → `src/components/invoices/invoice-filters.tsx:91-96`
- Multi-select filters for status (Draft, Sent, Delivered, etc.) → `src/components/invoices/invoice-filters.tsx:102-107`
- Clear all filters button → `src/components/invoices/invoice-filters.tsx:36-41`
- Apply filters button with loading state → `src/components/invoices/invoice-filters.tsx:112-118`
- URL-based state management via router.push → `src/components/invoices/invoice-filters.tsx:43-52`

### Current Unified Documents Filtering

The new unified approach uses simpler, more intuitive filtering → `src/app/(dashboard)/documents/page.tsx:206-225`

**Features:**

- Category filter pills (All, Invoices, E-Invoices, Bank Statements, Expenses) → `src/components/documents/category-cards.tsx:48-80`
- Single search input for cross-field text search → `src/app/(dashboard)/documents/page.tsx:210-225`
- Real-time count badges on category pills → `src/components/documents/category-cards.tsx:68-74`
- Active category highlighting → `src/components/documents/category-cards.tsx:60-64`
- Search preserved across category switches → `src/app/(dashboard)/documents/page.tsx:211`

## Server-Side Filtering Logic

### Unified Query Function

The `queryUnifiedDocuments` function consolidates filtering across all document types → `src/lib/documents/unified-query.ts:106-237`

**Query Parameters:**

- `companyId` (required) - Tenant isolation
- `category` (optional) - Filter by document type: 'invoice' | 'e-invoice' | 'bank-statement' | 'expense'
- `search` (optional) - Text search across relevant fields
- `page` (optional) - Pagination page number (default: 1)
- `pageSize` (optional) - Results per page (default: 20)

**Search Implementation:**

For invoices/e-invoices → `src/lib/documents/unified-query.ts:115-120`:

```typescript
...(search ? {
  OR: [
    { invoiceNumber: { contains: search, mode: 'insensitive' } },
    { buyer: { is: { name: { contains: search, mode: 'insensitive' } } } },
  ]
} : {})
```

For bank statements → `src/lib/documents/unified-query.ts:129-131`:

```typescript
...(search ? {
  originalName: { contains: search, mode: 'insensitive' }
} : {})
```

For expenses → `src/lib/documents/unified-query.ts:140-145`:

```typescript
...(search ? {
  OR: [
    { vendor: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ]
} : {})
```

### Legacy Invoice Filtering (getInvoices)

The original invoice action supports basic filtering → `src/app/actions/invoice.ts:325-355`

**Supported Filters:**

- `type` - InvoiceType enum filter → `src/app/actions/invoice.ts:337`
- `status` - EInvoiceStatus enum filter → `src/app/actions/invoice.ts:338`
- `cursor` - Pagination cursor → `src/app/actions/invoice.ts:346`
- `limit` - Result limit (max 100) → `src/app/actions/invoice.ts:334`

### E-Invoice Filtering (getEInvoices)

E-invoice queries support direction and status filtering → `src/app/actions/e-invoice.ts:222-267`

**Supported Filters:**

- `direction` - OUTBOUND | INBOUND → `src/app/actions/e-invoice.ts:235`
- `status` - EInvoiceStatus enum → `src/app/actions/e-invoice.ts:236`
- `cursor` - Cursor-based pagination → `src/app/actions/e-invoice.ts:255-258`
- `limit` - Result limit (max 100) → `src/app/actions/e-invoice.ts:231`

## Available Filter Options

### Document Categories

Defined in `src/lib/documents/unified-query.ts:22-27`:

| Category       | Label   | Color Class                     | Evidence                                |
| -------------- | ------- | ------------------------------- | --------------------------------------- |
| invoice        | Račun   | bg-blue-100 text-blue-800       | `src/lib/documents/unified-query.ts:23` |
| e-invoice      | E-Račun | bg-purple-100 text-purple-800   | `src/lib/documents/unified-query.ts:24` |
| bank-statement | Izvod   | bg-emerald-100 text-emerald-800 | `src/lib/documents/unified-query.ts:25` |
| expense        | Trošak  | bg-orange-100 text-orange-800   | `src/lib/documents/unified-query.ts:26` |

### Invoice Types (Prisma Schema)

From `prisma/schema.prisma`:

- INVOICE - Standard invoice
- E_INVOICE - Electronic invoice
- QUOTE - Quote/Offer
- PROFORMA - Proforma invoice
- CREDIT_NOTE - Credit note

### Invoice Statuses (Prisma Schema)

From `prisma/schema.prisma`:

| Status                | Label (Croatian)   | Color | Evidence                                |
| --------------------- | ------------------ | ----- | --------------------------------------- |
| DRAFT                 | Nacrt              | gray  | `src/lib/documents/unified-query.ts:32` |
| PENDING_FISCALIZATION | Čeka fiskalizaciju | blue  | `src/lib/documents/unified-query.ts:34` |
| SENT                  | Poslano            | blue  | `src/lib/documents/unified-query.ts:33` |
| FISCALIZED            | Fiskalizirano      | green | `src/lib/documents/unified-query.ts:36` |
| DELIVERED             | Dostavljeno        | green | `src/lib/documents/unified-query.ts:36` |
| ACCEPTED              | Prihvaćeno         | green | `src/lib/documents/unified-query.ts:37` |
| REJECTED              | Odbijeno           | red   | `src/lib/documents/unified-query.ts:38` |
| ERROR                 | Greška             | red   | `src/lib/documents/unified-query.ts:39` |
| ARCHIVED              | Arhivirano         | gray  | `src/lib/documents/unified-query.ts:40` |

Croatian labels defined in → `src/lib/documents/unified-query.ts:57-67`

## Data

### Database Tables

- **EInvoice** → `prisma/schema.prisma:191`
  - Indexed fields: companyId (via tenant context), invoiceNumber, status
  - Searchable fields: invoiceNumber, buyer.name
  - Filterable fields: type, status, direction
  - Related: buyer (Contact), seller (Contact), lines (EInvoiceLine[])

- **Contact** → `prisma/schema.prisma:148`
  - Used for buyer/seller joins in invoice queries
  - Fields: name, oib, email, address

- **ImportJob** (Bank Statements) → `prisma/schema.prisma`
  - Fields: originalName, status, documentType, pagesProcessed
  - Searchable: originalName

- **Expense** → `prisma/schema.prisma`
  - Searchable fields: vendor, description
  - Filterable: status, category

### Query Performance

- Parallel queries for all document types → `src/lib/documents/unified-query.ts:110-153`
- Total: 6 database queries in parallel (3 data fetches + 3 counts)
- Uses Prisma's `contains` with `mode: 'insensitive'` for case-insensitive search
- Tenant isolation via global tenant context (automatic filtering by companyId)
- In-memory sorting and pagination after aggregation → `src/lib/documents/unified-query.ts:214-224`

## State Management

### URL-Based State (Current Implementation)

All filter state is stored in URL query parameters → `src/app/(dashboard)/documents/page.tsx:90-96`

**Parameters:**

- `category` - Document category filter (string)
- `search` - Search term (string)
- `page` - Current page number (number, default: 1)

**Benefits:**

- Shareable URLs with filters applied
- Browser back/forward navigation works correctly
- Server-side rendering compatible
- No client-side state management needed

### Legacy Client State (InvoiceFilters)

The old InvoiceFilters component uses React state → `src/components/invoices/invoice-filters.tsx:28-34`

**State Variables:**

- `search` - Text search input value
- `types` - Selected document types (MultiSelectOption[])
- `statuses` - Selected statuses (MultiSelectOption[])
- `isPending` - Loading state during navigation (useTransition)

## Pagination

### Current Implementation

Simple offset-based pagination → `src/app/(dashboard)/documents/page.tsx:298-320`

**Features:**

- Page number in query params → `src/app/(dashboard)/documents/page.tsx:93-94`
- Previous/Next links preserve all filters → `src/app/(dashboard)/documents/page.tsx:182-188`
- Current page indicator (e.g., "Stranica 2 od 5") → `src/app/(dashboard)/documents/page.tsx:308-310`
- 20 results per page → `src/app/(dashboard)/documents/page.tsx:103`

### Legacy Cursor-Based Pagination

Server actions support cursor-based pagination → `src/app/actions/invoice.ts:346`

**Implementation:**

- `cursor` parameter contains the ID of the last item
- `skip: 1` excludes the cursor item from results
- `take: limit + 1` fetches one extra to determine hasMore
- Returns `{ items, nextCursor, hasMore }` → `src/app/actions/invoice.ts:349-353`

## Dependencies

- **Depends on**:
  - [[auth-login]] - User must be authenticated → `src/app/(dashboard)/documents/page.tsx:43`
  - [[company-management]] - Company context required for tenant isolation → `src/app/(dashboard)/documents/page.tsx:44`
  - [[invoicing-core]] - EInvoice and Contact models
  - [[banking-import]] - ImportJob model for bank statements
  - [[expense-management]] - Expense model

- **Depended by**:
  - [[dashboard-main]] - Links to filtered document views
  - [[invoicing-actions]] - Server actions for invoice CRUD
  - [[reporting-exports]] - May use same filtering logic for exports

## Integrations

None - This is a pure data query and display feature with no external API integrations.

## Verification Checklist

- [x] Authenticated user can access /documents with filters
- [x] Category pills correctly filter by document type
- [x] Search input filters by invoice number, buyer name, vendor, description
- [x] Search is case-insensitive across all document types
- [x] Category counts display correctly (All, Invoices, E-Invoices, etc.)
- [x] Active category is visually highlighted
- [x] Pagination preserves active filters in URLs
- [x] Empty state displays when no results match filters
- [x] Filter state persists through browser back/forward navigation
- [x] All queries are tenant-scoped (companyId isolation)
- [x] Legacy /invoices route redirects to unified /documents
- [x] Mobile responsive layout works correctly

## Evidence Links

1. `src/app/(dashboard)/documents/page.tsx:38-324` - Main documents page with unified filtering
2. `src/lib/documents/unified-query.ts:106-237` - Unified query function with search logic
3. `src/components/documents/category-cards.tsx:31-117` - Category filter pills component
4. `src/components/invoices/invoice-filters.tsx:18-122` - Legacy invoice filters (deprecated)
5. `src/components/ui/multi-select.tsx:19-74` - Multi-select dropdown component
6. `src/app/actions/invoice.ts:325-355` - Legacy invoice query with type/status filters
7. `src/app/actions/e-invoice.ts:222-267` - E-invoice query with direction/status filters
8. `src/lib/documents/unified-query.ts:22-27` - Category metadata definitions
9. `src/lib/documents/unified-query.ts:57-82` - Status label translations
10. `src/app/(dashboard)/invoices/page.tsx:1-19` - Redirect route for backwards compatibility
11. `audit/work-log-2025-02-14.md:82-84` - Implementation notes for invoice filtering
12. `prisma/schema.prisma:191-260` - EInvoice model with filterable fields
