# Feature: View E-Invoices (F024)

## Status

- Documentation: Complete
- Last verified: 2025-12-15
- Evidence count: 14

## Purpose

Provides a dedicated view for electronic invoices (e-invoices) with a comprehensive table-based listing, summary statistics, and detail pages. The feature operates both as a standalone route at `/e-invoices` and integrates with the unified documents hub at `/documents?category=e-invoice`, enabling users to manage e-invoices separately from regular invoices while maintaining access through the unified document ecosystem. E-invoices support full fiscalization, UBL XML generation, and provider-based delivery.

## User Entry Points

| Type       | Path                            | Evidence                                                 |
| ---------- | ------------------------------- | -------------------------------------------------------- |
| Direct     | `/e-invoices`                   | `src/app/(dashboard)/e-invoices/page.tsx:53`             |
| Navigation | `/documents?category=e-invoice` | `src/lib/navigation.ts:47`                               |
| Detail     | `/e-invoices/:id`               | `src/app/(dashboard)/e-invoices/[id]/page.tsx:36`        |
| Dashboard  | `/dashboard` (Action Cards)     | Via Quick Actions widget                                 |
| Contact    | From contact detail page        | `src/app/(dashboard)/contacts/[id]/page.tsx:162,347,372` |

## Core Flow

### List View Flow

1. User accesses `/e-invoices` route -> `src/app/(dashboard)/e-invoices/page.tsx:53-227`
2. System checks e-invoicing module capability -> `src/app/(dashboard)/e-invoices/page.tsx:56-59`
3. Redirects to settings if module disabled -> `src/app/(dashboard)/e-invoices/page.tsx:58`
4. Fetches e-invoices via server action -> `src/app/actions/e-invoice.ts:222-267`
5. Query filters by company and optional status/direction -> `src/app/actions/e-invoice.ts:233-237`
6. System calculates summary statistics (total, drafts, sent, amount) -> `src/app/(dashboard)/e-invoices/page.tsx:63-69`
7. Four summary cards display key metrics -> `src/app/(dashboard)/e-invoices/page.tsx:170-196`
8. DataTable component renders invoice list with columns -> `src/app/(dashboard)/e-invoices/page.tsx:72-159`
9. Each row displays invoice number, buyer, dates, amount, status, actions -> `src/app/(dashboard)/e-invoices/page.tsx:73-146`
10. Action buttons provide inline access to details, edit, send, delete -> `src/app/(dashboard)/e-invoices/invoice-actions.tsx:74-111`

### Detail View Flow

1. User clicks invoice number or "Detalji" button -> `src/app/(dashboard)/e-invoices/page.tsx:79`
2. System routes to `/e-invoices/:id` -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:36`
3. Invoice data fetched with full relationships -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:41-53`
4. Header displays invoice number and status badge -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:60-86`
5. Seller and buyer information cards show party details -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:91-128`
6. Line items table displays products/services with calculations -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:130-171`
7. Sidebar summary card shows net, VAT, and total amounts -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:176-195`
8. Details card shows issue date, due date, buyer reference, direction -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:197-224`
9. Fiscalization card displays JIR, ZKI, and timestamp when fiscalized -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:226-253`
10. Action buttons enable send, mark as paid, edit, delete operations -> `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:100-135`

### Unified Documents Integration Flow

1. User navigates to `/documents?category=e-invoice` -> `src/lib/navigation.ts:47`
2. Documents page fetches unified documents -> `src/lib/documents/unified-query.ts:106-237`
3. EInvoice records with `type=E_INVOICE` are normalized -> `src/lib/documents/unified-query.ts:156-167`
4. Category filter shows "e-invoice" with count badge -> `src/components/documents/category-cards.tsx:26,36`
5. Filtered documents display with purple "E-Račun" badge -> `src/lib/documents/unified-query.ts:24,158`
6. Clicking detail link routes to `/e-invoices/:id` -> `src/lib/documents/unified-query.ts:166`
7. Document detail redirect ensures correct route -> `src/app/(dashboard)/documents/[id]/page.tsx:30`

### Send and Fiscalization Flow

1. User clicks "Pošalji" (Send) button on draft invoice -> `src/app/(dashboard)/e-invoices/invoice-actions.tsx:21-47`
2. System validates e-invoice provider is configured -> `src/app/(dashboard)/e-invoices/invoice-actions.tsx:22-25`
3. Confirmation dialog prompts user -> `src/app/(dashboard)/e-invoices/invoice-actions.tsx:27-29`
4. Server action generates UBL XML -> `src/app/actions/e-invoice.ts:152`
5. Provider sends invoice and returns fiscalization data -> `src/app/actions/e-invoice.ts:165-178`
6. Invoice updated with status SENT, JIR, ZKI, fiscalization timestamp -> `src/app/actions/e-invoice.ts:182-196`
7. System checks if fiscalization needed and queues request -> `src/app/actions/e-invoice.ts:199-215`
8. Success message displays and page refreshes -> `src/app/(dashboard)/e-invoices/invoice-actions.tsx:43-46`

## Key Modules

| Module                | Purpose                                  | Location                                                 |
| --------------------- | ---------------------------------------- | -------------------------------------------------------- |
| EInvoicesPage         | Main e-invoice list with table and stats | `src/app/(dashboard)/e-invoices/page.tsx`                |
| EInvoiceDetailPage    | Individual e-invoice detail view         | `src/app/(dashboard)/e-invoices/[id]/page.tsx`           |
| EInvoiceActions       | List view action buttons (inline)        | `src/app/(dashboard)/e-invoices/invoice-actions.tsx`     |
| InvoiceDetailActions  | Detail view action toolbar               | `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx` |
| DataTable             | Reusable table component for list view   | `src/components/ui/data-table.tsx`                       |
| getEInvoices          | Server action to fetch e-invoice list    | `src/app/actions/e-invoice.ts:222-267`                   |
| getEInvoice           | Server action to fetch single e-invoice  | `src/app/actions/e-invoice.ts:269-283`                   |
| sendEInvoice          | Server action to send and fiscalize      | `src/app/actions/e-invoice.ts:129-220`                   |
| deleteEInvoice        | Server action to delete draft invoices   | `src/app/actions/e-invoice.ts:285-307`                   |
| markInvoiceAsPaid     | Server action to mark invoice as paid    | `src/app/actions/e-invoice.ts:309-346`                   |
| queryUnifiedDocuments | Unified query including e-invoices       | `src/lib/documents/unified-query.ts:106-237`             |
| CategoryCards         | Filter pills for document categories     | `src/components/documents/category-cards.tsx`            |

## Data

### Database Tables

#### EInvoice Table

Primary e-invoice storage table -> `prisma/schema.prisma:191-259`

Key fields:

- `id` (String, CUID): Unique identifier
- `companyId` (String): Tenant isolation
- `type` (InvoiceType): INVOICE, E_INVOICE, QUOTE, PROFORMA, CREDIT_NOTE, DEBIT_NOTE -> `prisma/schema.prisma:228,815-822`
- `direction` (EInvoiceDirection): OUTBOUND or INBOUND -> `prisma/schema.prisma:194`
- `status` (EInvoiceStatus): DRAFT, PENDING_FISCALIZATION, FISCALIZED, SENT, DELIVERED, ACCEPTED, REJECTED, ARCHIVED, ERROR -> `prisma/schema.prisma:205,803-813`
- `invoiceNumber` (String): Display number -> `prisma/schema.prisma:197`
- `issueDate` (DateTime): Invoice date -> `prisma/schema.prisma:198`
- `dueDate` (DateTime?): Payment due date -> `prisma/schema.prisma:199`
- `buyerId` (String?): Contact relation -> `prisma/schema.prisma:196`
- `sellerId` (String?): Contact relation -> `prisma/schema.prisma:195`
- `netAmount` (Decimal): Base amount before VAT -> `prisma/schema.prisma:202`
- `vatAmount` (Decimal): Total VAT -> `prisma/schema.prisma:203`
- `totalAmount` (Decimal): Final amount -> `prisma/schema.prisma:204`
- `currency` (String): Currency code, default EUR -> `prisma/schema.prisma:200`
- `jir` (String?): Fiscal identifier (JIR) -> `prisma/schema.prisma:206`
- `zki` (String?): Protective code (ZKI) -> `prisma/schema.prisma:207`
- `fiscalizedAt` (DateTime?): Fiscalization timestamp -> `prisma/schema.prisma:208`
- `ublXml` (String?): UBL invoice XML content -> `prisma/schema.prisma:211`
- `providerRef` (String?): E-invoice provider reference -> `prisma/schema.prisma:212`
- `providerError` (String?): Error message from provider -> `prisma/schema.prisma:214`
- `sentAt` (DateTime?): Timestamp when sent via provider -> `prisma/schema.prisma:219`
- `paidAt` (DateTime?): Payment timestamp -> `prisma/schema.prisma:232`
- `buyerReference` (String?): Buyer's reference code -> `prisma/schema.prisma:201`
- `bankAccount` (String?): Payment bank account -> `prisma/schema.prisma:233`

Relations:

- `buyer` (Contact): Invoice recipient -> `prisma/schema.prisma:244`
- `seller` (Contact): Invoice issuer -> `prisma/schema.prisma:248`
- `company` (Company): Owner company -> `prisma/schema.prisma:245`
- `lines` (EInvoiceLine[]): Line items -> `prisma/schema.prisma:250`
- `fiscalRequests` (FiscalRequest[]): Fiscalization attempts -> `prisma/schema.prisma:251`

Indexes:

- `companyId`: Tenant filtering -> `prisma/schema.prisma:253`
- `status`: Status-based queries -> `prisma/schema.prisma:254`
- `invoiceNumber`: Number lookups -> `prisma/schema.prisma:255`
- `direction`: Inbound/outbound filtering -> `prisma/schema.prisma:256`
- `type`: Document type filtering (E_INVOICE vs INVOICE) -> `prisma/schema.prisma:257`

#### EInvoiceLine Table

E-invoice line items -> `prisma/schema.prisma:261-276`

Key fields:

- `lineNumber` (Int): Sequential order
- `description` (String): Item description
- `quantity` (Decimal): Item quantity
- `unit` (String): Unit of measure (default C62)
- `unitPrice` (Decimal): Price per unit
- `netAmount` (Decimal): Line subtotal
- `vatRate` (Decimal): VAT percentage
- `vatAmount` (Decimal): Line VAT

### Query Patterns

#### E-Invoice List Query

Fetches e-invoices with cursor-based pagination -> `src/app/actions/e-invoice.ts:233-259`

```typescript
const invoices = await db.eInvoice.findMany({
  where: {
    ...(options?.direction && { direction: options.direction }),
    ...(options?.status && { status: options.status }),
  },
  select: {
    id: true,
    invoiceNumber: true,
    status: true,
    totalAmount: true,
    vatAmount: true,
    issueDate: true,
    dueDate: true,
    jir: true,
    currency: true,
    createdAt: true,
    buyer: { select: { name: true, oib: true } },
  },
  orderBy: { createdAt: "desc" },
  take: limit + 1,
  ...(options?.cursor && { cursor: { id: options.cursor }, skip: 1 }),
})
```

#### E-Invoice Detail Query

Fetches single e-invoice with full relationships -> `src/app/(dashboard)/e-invoices/[id]/page.tsx:41-53`

```typescript
const invoice = await db.eInvoice.findFirst({
  where: {
    id,
    companyId: company.id,
  },
  include: {
    buyer: true,
    seller: true,
    lines: {
      orderBy: { lineNumber: "asc" },
    },
  },
})
```

#### Unified Documents Query

Fetches all invoices including e-invoices for unified view -> `src/lib/documents/unified-query.ts:112-124`

```typescript
db.eInvoice.findMany({
  where: {
    companyId,
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { buyer: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  },
  include: { buyer: { select: { name: true } } },
  orderBy: { createdAt: "desc" },
})
```

### Data Normalization

E-Invoices transformed into unified format -> `src/lib/documents/unified-query.ts:156-167`

```typescript
const normalizedInvoices: UnifiedDocument[] = invoices.map((inv) => ({
  id: inv.id,
  category: inv.type === "E_INVOICE" ? "e-invoice" : "invoice",
  date: inv.issueDate,
  number: inv.invoiceNumber || "Bez broja",
  counterparty: inv.buyer?.name || null,
  amount: Number(inv.totalAmount),
  currency: inv.currency,
  status: INVOICE_STATUS_LABELS[inv.status] || inv.status,
  statusColor: getInvoiceStatusColor(inv.status),
  detailUrl: inv.type === "E_INVOICE" ? `/e-invoices/${inv.id}` : `/invoices/${inv.id}`,
}))
```

### Statistics Calculation

Summary stats derived from invoice list -> `src/app/(dashboard)/e-invoices/page.tsx:63-69`

```typescript
const stats = {
  total: eInvoices.length,
  drafts: eInvoices.filter((i) => i.status === "DRAFT").length,
  sent: eInvoices.filter((i) => ["SENT", "DELIVERED", "ACCEPTED"].includes(i.status)).length,
  totalAmount: eInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0),
}
```

## Dependencies

### Depends On

- **Authentication System**: User and company context -> `src/lib/auth-utils.ts:requireAuth, requireCompany`
- **Tenant Context**: Multi-tenant data isolation -> `src/lib/prisma-extensions.ts:setTenantContext`
- **Capability System**: E-invoicing module check -> `src/lib/capabilities.ts:deriveCapabilities`
- **Contact Management**: Buyer/seller information -> `prisma/schema.prisma:Contact`
- **E-Invoice Provider**: Provider configuration and API -> `src/lib/e-invoice/index.ts`
- **UBL Generation**: XML invoice format -> `src/lib/e-invoice/index.ts:generateUBLInvoice`
- **Fiscal System**: Fiscalization queueing and checks -> `src/lib/fiscal/should-fiscalize.ts`

### Depended By

- **Dashboard**: Shows e-invoice counts and recent activity
- **Contact Detail Pages**: Links to create e-invoices for specific contacts
- **Unified Documents Hub**: Includes e-invoices in combined document view
- **Reports**: E-invoice data for financial reports
- **Banking Reconciliation**: E-invoice matching with transactions
- **Accountant Portal**: E-invoice access for accountants

## Integrations

### Internal Integrations

#### Navigation System

Sidebar navigation with e-invoice submenu -> `src/lib/navigation.ts:39-51`

```typescript
{
  name: "Dokumenti",
  href: "/documents",
  icon: FileText,
  module: "invoicing",
  children: [
    { name: "Svi dokumenti", href: "/documents" },
    { name: "Računi", href: "/documents?category=invoice" },
    { name: "E-Računi", href: "/documents?category=e-invoice" },
    // ...
  ]
}
```

#### Unified Documents Hub

E-invoices appear in unified document listing -> `src/lib/documents/unified-query.ts:5,24,158,166,207`

- Category type: `e-invoice`
- Purple badge: "E-Račun"
- Filtered by `category=e-invoice` parameter
- Separate count from regular invoices
- Detail URL routes to `/e-invoices/:id`

#### Contact Integration

E-invoices linked to contacts as buyers -> `src/app/(dashboard)/contacts/[id]/page.tsx:162,347,372`

- Quick create button with pre-filled buyer
- Filter by contact on e-invoices page
- Display e-invoice history on contact detail page

#### Fiscal System Integration

E-invoices support fiscalization -> `src/app/actions/e-invoice.ts:199-215`

- Automatic fiscalization check after sending
- JIR (Jedinstveni Identifikator Računa) storage
- ZKI (Zaštitni Kod Izdavatelja) storage
- Fiscalization timestamp tracking
- Fiscal request queueing

### External Integrations

#### E-Invoice Provider

Integration with Croatian e-invoice providers -> `src/app/actions/e-invoice.ts:154-178`

- Provider configuration: `company.eInvoiceProvider`
- API key encryption: `company.eInvoiceApiKeyEncrypted`
- UBL XML generation and submission
- Provider reference tracking
- Error handling and status updates

#### Croatian Tax Authority (CIS)

Fiscalization for tax compliance -> Fiscal certificate feature

- Generates JIR and ZKI codes
- Submits to Croatian Tax Authority
- Tracks fiscalization requests
- Supports cash/card payment methods requiring immediate fiscalization

## User Experience

### Status Labels (Croatian)

Status badges use localized Croatian labels -> `src/app/(dashboard)/e-invoices/page.tsx:13-35`

| Status                | Label              | Color  |
| --------------------- | ------------------ | ------ |
| DRAFT                 | Nacrt              | Gray   |
| PENDING_FISCALIZATION | Čeka fiskalizaciju | Yellow |
| FISCALIZED            | Fiskalizirano      | Blue   |
| SENT                  | Poslano            | Blue   |
| DELIVERED             | Dostavljeno        | Green  |
| ACCEPTED              | Prihvaćeno         | Green  |
| REJECTED              | Odbijeno           | Red    |
| ARCHIVED              | Arhivirano         | Gray   |
| ERROR                 | Greška             | Red    |

### Action Availability

Actions are context-sensitive based on invoice status -> `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95-98`

| Action       | Available When                                    | Requires Provider |
| ------------ | ------------------------------------------------- | ----------------- |
| Send         | DRAFT or ERROR                                    | Yes               |
| Edit         | DRAFT                                             | No                |
| Delete       | DRAFT                                             | No                |
| Mark as Paid | FISCALIZED, SENT, or DELIVERED (not already paid) | No                |

### Empty States

User-friendly messaging when no e-invoices exist -> `src/app/(dashboard)/e-invoices/page.tsx:201-214`

- Icon: FileText
- Title: "Nemate još nijedan e-račun"
- Description: Explains e-invoice benefits and encourages creation
- Action button: "Kreiraj prvi e-račun"

### Summary Statistics

Four key metric cards displayed above table -> `src/app/(dashboard)/e-invoices/page.tsx:170-196`

1. **Ukupno računa**: Total count of all e-invoices
2. **Nacrti**: Count of draft e-invoices
3. **Poslano**: Count of sent/delivered/accepted e-invoices
4. **Ukupni iznos**: Sum of all e-invoice amounts in EUR

### Currency Formatting

Croatian locale formatting throughout -> `src/app/(dashboard)/e-invoices/page.tsx:125,128,193`

- Format: `hr-HR` locale
- Default currency: EUR
- Decimal precision: 2 places
- Amounts displayed with currency symbol

### Date Formatting

Croatian date format -> `src/app/(dashboard)/e-invoices/page.tsx:108,115`

- Format: `hr-HR` locale (DD.MM.YYYY)
- Issue date always displayed
- Due date optional with fallback to dash

## Verification Checklist

### List View

- [ ] User can access e-invoices at `/e-invoices`
- [ ] Module capability check redirects to settings if disabled
- [ ] Summary cards display correct totals, drafts, sent counts
- [ ] Total amount card shows sum in EUR with 2 decimals
- [ ] Table displays invoice number (with JIR preview if fiscalized)
- [ ] Table shows buyer name and OIB
- [ ] Table displays issue date and due date in hr-HR format
- [ ] Table shows total amount and VAT amount
- [ ] Status badges use correct colors and Croatian labels
- [ ] Action buttons appear contextually (Details, Edit, Send, Delete)
- [ ] Empty state displays when no e-invoices exist
- [ ] "Kreiraj prvi e-račun" button navigates to `/e-invoices/new`

### Detail View

- [ ] Invoice header shows invoice number
- [ ] Status badge displays current status with correct color
- [ ] Back link navigates to `/e-invoices`
- [ ] Seller card shows company information (name, OIB, address)
- [ ] Buyer card shows contact information or "not specified"
- [ ] Line items table displays all products/services
- [ ] Line items show quantity, unit, unit price, VAT rate, total
- [ ] Summary sidebar shows net amount, VAT, and total
- [ ] Details card shows issue date, due date, buyer reference, direction
- [ ] Fiscalization card appears when JIR/ZKI exist
- [ ] Fiscalization card shows JIR, ZKI, and fiscalization timestamp
- [ ] Error card displays if provider error exists
- [ ] History card shows created, sent, updated, paid timestamps

### Actions

- [ ] Send button appears only for DRAFT or ERROR status
- [ ] Send button checks for provider configuration
- [ ] Send confirmation dialog prompts user
- [ ] Send action generates UBL XML and submits to provider
- [ ] Send action updates status, JIR, ZKI, timestamps
- [ ] Send action queues fiscalization if needed
- [ ] Edit button appears only for DRAFT status
- [ ] Edit navigates to `/e-invoices/:id/edit`
- [ ] Delete button appears only for DRAFT status
- [ ] Delete requires confirmation
- [ ] Delete removes invoice and returns to list
- [ ] Mark as Paid button appears for FISCALIZED/SENT/DELIVERED
- [ ] Mark as Paid disabled if already paid
- [ ] Mark as Paid updates paidAt timestamp and status to ACCEPTED

### Unified Documents Integration

- [ ] E-invoices appear at `/documents?category=e-invoice`
- [ ] Navigation sidebar includes "E-Računi" link
- [ ] Category filter shows separate count for e-invoices
- [ ] E-invoice badge displays as purple "E-Račun"
- [ ] Detail links route to `/e-invoices/:id`
- [ ] Document detail page redirects E_INVOICE type correctly
- [ ] Search filters e-invoices by number and buyer name
- [ ] E-invoices sort by creation date descending

### Data Integrity

- [ ] All queries filter by companyId (tenant isolation)
- [ ] E-invoices have type = E_INVOICE in database
- [ ] Invoice totals match sum of line items
- [ ] VAT calculations are accurate
- [ ] Status transitions follow valid state machine
- [ ] JIR and ZKI only set when fiscalized
- [ ] Provider ref and error tracked correctly
- [ ] Sent/fiscalized timestamps align with status changes

## Evidence Links

1. `src/app/(dashboard)/e-invoices/page.tsx:53-227` - Main e-invoices list page with stats and table
2. `src/app/(dashboard)/e-invoices/[id]/page.tsx:36-299` - E-invoice detail page with full information
3. `src/app/actions/e-invoice.ts:222-267` - Server action to fetch e-invoice list with pagination
4. `src/app/actions/e-invoice.ts:269-283` - Server action to fetch single e-invoice with relations
5. `src/app/actions/e-invoice.ts:129-220` - Server action to send e-invoice via provider with fiscalization
6. `src/app/(dashboard)/e-invoices/invoice-actions.tsx:16-112` - List view action buttons component
7. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:18-136` - Detail view action toolbar component
8. `src/lib/documents/unified-query.ts:106-237` - Unified query including e-invoices with normalization
9. `src/lib/navigation.ts:39-51` - Navigation structure with e-invoice category link
10. `src/components/documents/category-cards.tsx:19-117` - Category filter pills including e-invoices
11. `src/components/ui/data-table.tsx:21-77` - Reusable data table component for list view
12. `prisma/schema.prisma:191-259` - EInvoice table schema with all fields and relations
13. `prisma/schema.prisma:803-813` - EInvoiceStatus enum definition with all states
14. `prisma/schema.prisma:815-822` - InvoiceType enum including E_INVOICE type
