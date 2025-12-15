# Feature: Create Invoice (F015)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 27

## Purpose

The Create Invoice feature enables users to generate new invoices (INVOICE, E_INVOICE, QUOTE, PROFORMA, CREDIT_NOTE, or DEBIT_NOTE) with multiple line items, automatic totals calculation, VAT computation, and sequential invoice numbering. The feature includes subscription limit enforcement, tenant isolation, product quick-add functionality, and multi-currency support, forming the core of the invoicing workflow in FiskAI.

## User Entry Points

| Type     | Path                        | Evidence                                                |
| -------- | --------------------------- | ------------------------------------------------------- |
| Page     | /invoices/new               | `src/app/(dashboard)/invoices/new/page.tsx:17`          |
| Dropdown | New Document Dropdown       | `src/components/documents/new-document-dropdown.tsx:12` |
| Action   | createInvoice server action | `src/app/actions/invoice.ts:35`                         |

## Core Flow

1. User navigates to /invoices/new?type=INVOICE → `src/app/(dashboard)/invoices/new/page.tsx:17-21`
2. System validates user authentication with requireAuth() → `src/app/(dashboard)/invoices/new/page.tsx:22`
3. System retrieves current company via requireCompany() → `src/app/(dashboard)/invoices/new/page.tsx:23`
4. System sets tenant context for data isolation → `src/app/(dashboard)/invoices/new/page.tsx:26-29`
5. System fetches contacts and products in parallel → `src/app/(dashboard)/invoices/new/page.tsx:31-43`
6. System renders InvoiceForm with pre-populated data → `src/app/(dashboard)/invoices/new/page.tsx:60-64`
7. User fills invoice details (buyer, dates, line items) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:87-119`
8. User submits form, triggering client-side validation → `src/app/(dashboard)/invoices/new/invoice-form.tsx:90-98`
9. System calls createInvoice server action with tenant context → `src/app/actions/invoice.ts:35-115`
10. System validates subscription limits via canCreateInvoice() → `src/app/actions/invoice.ts:41-48`
11. System generates sequential invoice number → `src/app/actions/invoice.ts:60`
12. System calculates line totals with Decimal precision → `src/app/actions/invoice.ts:63-86`
13. System creates EInvoice with nested EInvoiceLines → `src/app/actions/invoice.ts:88-106`
14. System revalidates /invoices route cache → `src/app/actions/invoice.ts:108`
15. User redirected to /invoices with success notification → `src/app/(dashboard)/invoices/new/invoice-form.tsx:114-115`

## Key Modules

| Module                    | Purpose                                            | Location                                             |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| NewInvoicePage            | Server component for invoice creation page         | `src/app/(dashboard)/invoices/new/page.tsx`          |
| InvoiceForm               | Client form with line items and totals calculation | `src/app/(dashboard)/invoices/new/invoice-form.tsx`  |
| createInvoice             | Server action for invoice creation with validation | `src/app/actions/invoice.ts:35-115`                  |
| getNextInvoiceNumber      | Sequential number generation with database locking | `src/lib/invoice-numbering.ts:37-126`                |
| canCreateInvoice          | Subscription limit enforcement                     | `src/lib/billing/stripe.ts:294-337`                  |
| requireCompanyWithContext | Tenant-isolated database operations wrapper        | `src/lib/auth-utils.ts:75-89`                        |
| NewDocumentDropdown       | Entry point dropdown in documents hub              | `src/components/documents/new-document-dropdown.tsx` |

## Invoice Form Features

### Basic Information Fields

- **Buyer Selection** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:131-146`
  - Dropdown populated from Contact table → `src/app/(dashboard)/invoices/new/page.tsx:32-36`
  - Displays contact name and OIB → `src/app/(dashboard)/invoices/new/invoice-form.tsx:142-144`
  - Required field validation → `src/app/(dashboard)/invoices/new/invoice-form.tsx:90-92`

- **Date Fields** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:148-168`
  - Issue Date (defaults to today) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:32`
  - Due Date (optional) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:33`

### Line Items Management

- **Dynamic Line Items Array** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:35-37`
  - Initial line with default values (qty=1, unit=C62, VAT=25%) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:36`
  - Add line functionality → `src/app/(dashboard)/invoices/new/invoice-form.tsx:39-41`
  - Remove line (minimum 1 line required) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:43-46`
  - Update line fields → `src/app/(dashboard)/invoices/new/invoice-form.tsx:48-52`

- **Line Item Fields** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:196-282`
  - Description (text input, required) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:212-217`
  - Quantity (number, min=0.001, step=0.001) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:219-227`
  - Unit (dropdown: kom, sat, dan, mjesec, kg, m, L) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:229-242`
  - Unit Price (number, min=0, step=0.01) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:244-252`
  - VAT Rate (dropdown: 25%, 13%, 5%, 0%) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:254-264`
  - Total display (auto-calculated) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:266-268`
  - Remove button → `src/app/(dashboard)/invoices/new/invoice-form.tsx:270-277`

### Product Quick-Add

- **Product Dropdown** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:175-192`
  - Populated from Product table → `src/app/(dashboard)/invoices/new/page.tsx:39-43`
  - Shows product name and price → `src/app/(dashboard)/invoices/new/invoice-form.tsx:187-189`
  - Auto-adds line item on selection → `src/app/(dashboard)/invoices/new/invoice-form.tsx:54-71`
  - Handles Decimal price conversion → `src/app/(dashboard)/invoices/new/invoice-form.tsx:58-59`

### Totals Calculation

- **Client-Side Calculation** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:74-85`
  - Net amount: sum of (quantity × unit price) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:76`
  - VAT amount: sum of (net × VAT rate) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:77`
  - Total amount: net + VAT → `src/app/(dashboard)/invoices/new/invoice-form.tsx:81`
  - Real-time updates on line changes → `src/app/(dashboard)/invoices/new/invoice-form.tsx:74`

- **Totals Display** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:290-309`
  - Net amount (Osnovica) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:295-297`
  - VAT amount (PDV) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:298-300`
  - Total amount (Ukupno) with bold styling → `src/app/(dashboard)/invoices/new/invoice-form.tsx:302-305`
  - Croatian currency formatting (EUR) → `src/app/(dashboard)/invoices/new/invoice-form.tsx:121-122`

### Notes Field

- **Optional Notes Textarea** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:312-324`
  - 3 rows, unlimited length → `src/app/(dashboard)/invoices/new/invoice-form.tsx:321`
  - Stored in EInvoice.notes → `src/app/actions/invoice.ts:98`

## Invoice Numbering

### Sequential Number Generation

- **Croatian Format Implementation** → `src/lib/invoice-numbering.ts:3-26`
  - Legal format: `{broj}-{poslovni_prostor}-{naplatni_uređaj}` → `src/lib/invoice-numbering.ts:5-6`
  - Internal reference: `{year}/{broj}-{poslovni_prostor}-{naplatni_uređaj}` → `src/lib/invoice-numbering.ts:8-10`
  - Example: "2025/43-1-1" → `src/lib/invoice-numbering.ts:10`

- **Atomic Increment with Database Locking** → `src/lib/invoice-numbering.ts:90-108`
  - Upsert operation prevents race conditions → `src/lib/invoice-numbering.ts:92`
  - Auto-creates sequence for new year → `src/lib/invoice-numbering.ts:102-107`
  - Increments lastNumber atomically → `src/lib/invoice-numbering.ts:100`

- **Business Premises & Device Setup** → `src/lib/invoice-numbering.ts:44-88`
  - Auto-creates default premises if missing → `src/lib/invoice-numbering.ts:52-62`
  - Auto-creates default device if missing → `src/lib/invoice-numbering.ts:76-88`
  - Uses default or specified premises/device → `src/lib/invoice-numbering.ts:45-62`

## Server-Side Processing

### Authentication & Tenant Isolation

- **Multi-Layer Security** → `src/app/actions/invoice.ts:36-39`
  - requireAuth() validates session → `src/lib/auth-utils.ts:12-18`
  - requireCompanyWithContext() enforces tenant scope → `src/lib/auth-utils.ts:75-89`
  - runWithTenant() wraps database operations → `src/lib/auth-utils.ts:86-88`
  - All queries auto-filtered by companyId → `src/lib/prisma-extensions.ts:52-76`

### Subscription Limit Enforcement

- **Pre-Creation Validation** → `src/app/actions/invoice.ts:41-48`
  - canCreateInvoice() checks plan limits → `src/lib/billing/stripe.ts:294-337`
  - Counts invoices created this month → `src/lib/billing/stripe.ts:319-328`
  - Unlimited plan check (invoiceLimit === -1) → `src/lib/billing/stripe.ts:300-302`
  - Trial expiration check → `src/lib/billing/stripe.ts:305-310`
  - Active subscription validation → `src/lib/billing/stripe.ts:313-316`
  - Returns error with usage stats if limit reached → `src/app/actions/invoice.ts:44-47`

### Line Items Calculation

- **Decimal Precision Arithmetic** → `src/app/actions/invoice.ts:63-86`
  - Uses Prisma Decimal for financial accuracy → `src/app/actions/invoice.ts:10`
  - Per-line calculation:
    - quantity × unitPrice = netAmount → `src/app/actions/invoice.ts:67`
    - netAmount × (vatRate / 100) = vatAmount → `src/app/actions/invoice.ts:68`
  - Line number assignment (1-indexed) → `src/app/actions/invoice.ts:71`
  - Default VAT category 'S' (Standard) → `src/app/actions/invoice.ts:78`
  - Aggregate totals with reduce() → `src/app/actions/invoice.ts:84-86`

### Database Transaction

- **Nested Create Operation** → `src/app/actions/invoice.ts:88-106`
  - Creates EInvoice with embedded lines → `src/app/actions/invoice.ts:88`
  - Sets direction to OUTBOUND → `src/app/actions/invoice.ts:91`
  - Assigns generated invoice number → `src/app/actions/invoice.ts:92-93`
  - Links to buyer contact → `src/app/actions/invoice.ts:94`
  - Defaults to DRAFT status → `src/app/actions/invoice.ts:102`
  - Creates all EInvoiceLines in single transaction → `src/app/actions/invoice.ts:103`
  - Returns invoice with relations → `src/app/actions/invoice.ts:105`

## Validation

### Client-Side Validation

1. **Required Fields** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:90-98`
   - Buyer must be selected → `src/app/(dashboard)/invoices/new/invoice-form.tsx:90-92`
   - All line descriptions required → `src/app/(dashboard)/invoices/new/invoice-form.tsx:95`
   - All line prices must be > 0 → `src/app/(dashboard)/invoices/new/invoice-form.tsx:95`

2. **Input Constraints** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:219-252`
   - Quantity: min=0.001, step=0.001 → `src/app/(dashboard)/invoices/new/invoice-form.tsx:222-223`
   - Unit price: min=0, step=0.01 → `src/app/(dashboard)/invoices/new/invoice-form.tsx:247-248`
   - At least 1 line item required → `src/app/(dashboard)/invoices/new/invoice-form.tsx:44`

### Server-Side Validation

1. **Authentication** → `src/app/actions/invoice.ts:37`
   - Session validation via requireAuth()

2. **Tenant Verification** → `src/app/actions/invoice.ts:51-56`
   - Buyer belongs to company (tenant-filtered query)
   - Returns error if buyer not found

3. **Subscription Limits** → `src/app/actions/invoice.ts:41-48`
   - Monthly invoice count vs plan limit
   - Trial expiration check
   - Subscription status validation

## Data

### Database Tables

- **EInvoice** → `prisma/schema.prisma:191-259`
  - Primary invoice record with financial totals
  - Key fields:
    - type: InvoiceType (INVOICE, E_INVOICE, etc.) → `prisma/schema.prisma:228`
    - direction: OUTBOUND/INBOUND → `prisma/schema.prisma:194`
    - invoiceNumber: "43-1-1" format → `prisma/schema.prisma:197`
    - internalReference: "2025/43-1-1" format → `prisma/schema.prisma:229`
    - buyerId: Foreign key to Contact → `prisma/schema.prisma:196`
    - issueDate, dueDate: DateTime fields → `prisma/schema.prisma:198-199`
    - netAmount, vatAmount, totalAmount: Decimal(10,2) → `prisma/schema.prisma:202-204`
    - status: Default DRAFT → `prisma/schema.prisma:205`
    - currency: Default EUR → `prisma/schema.prisma:200`
    - notes: Optional text → `prisma/schema.prisma:230`

- **EInvoiceLine** → `prisma/schema.prisma:261-276`
  - Individual line items within invoice
  - Key fields:
    - lineNumber: Sequential position → `prisma/schema.prisma:264`
    - description: Item description → `prisma/schema.prisma:265`
    - quantity: Decimal(10,3) → `prisma/schema.prisma:266`
    - unit: UN/CEFACT code (C62, HUR, etc.) → `prisma/schema.prisma:267`
    - unitPrice: Decimal(10,2) → `prisma/schema.prisma:268`
    - netAmount: Decimal(10,2) → `prisma/schema.prisma:269`
    - vatRate: Decimal(5,2) → `prisma/schema.prisma:270`
    - vatCategory: Default 'S' → `prisma/schema.prisma:271`
    - vatAmount: Decimal(10,2) → `prisma/schema.prisma:272`

- **Contact** → `prisma/schema.prisma:148-171`
  - Buyer/seller information
  - Used in buyer dropdown → `src/app/(dashboard)/invoices/new/page.tsx:32-36`
  - Displays name and OIB

- **Product** → `prisma/schema.prisma:173-189`
  - Product catalog for quick-add
  - Fields: name, price, vatRate, unit → `src/app/(dashboard)/invoices/new/page.tsx:41`
  - isActive filter applied → `src/app/(dashboard)/invoices/new/page.tsx:40`

- **InvoiceSequence** → `prisma/schema.prisma:331-343`
  - Tracks sequential numbering per year/premises
  - Key fields:
    - businessPremisesId: Link to premises → `prisma/schema.prisma:334`
    - year: Current year → `prisma/schema.prisma:335`
    - lastNumber: Atomic counter → `prisma/schema.prisma:336`
    - Unique constraint on (businessPremisesId, year) → `prisma/schema.prisma:341`

- **BusinessPremises** → `prisma/schema.prisma:296-312`
  - Physical location for Croatian fiscalization
  - Auto-created with code=1 if missing → `src/lib/invoice-numbering.ts:52-62`

- **PaymentDevice** → `prisma/schema.prisma:314-329`
  - Cash register/device for fiscalization
  - Auto-created with code=1 if missing → `src/lib/invoice-numbering.ts:76-88`

### Data Flow

1. **Page Load** → `src/app/(dashboard)/invoices/new/page.tsx:31-43`
   - Fetch contacts (id, name, oib) ordered by name
   - Fetch active products (id, name, price, vatRate, unit) ordered by name
   - Pass to InvoiceForm component

2. **Form Submission** → `src/app/(dashboard)/invoices/new/invoice-form.tsx:102-109`
   - Collect form state (buyer, dates, lines, notes)
   - Convert string dates to Date objects
   - Send to createInvoice action

3. **Server Processing** → `src/app/actions/invoice.ts:35-115`
   - Validate subscription limits
   - Generate invoice number
   - Calculate line totals with Decimal precision
   - Create invoice + lines in single transaction
   - Revalidate route cache

## Type Support

### Document Types

- **TYPE_LABELS Mapping** → `src/app/(dashboard)/invoices/new/page.tsx:8-15`
  - INVOICE: "Račun"
  - E_INVOICE: "E-Račun"
  - QUOTE: "Ponuda"
  - PROFORMA: "Predračun"
  - CREDIT_NOTE: "Odobrenje"
  - DEBIT_NOTE: "Terećenje"

- **Type Selection** → `src/app/(dashboard)/invoices/new/page.tsx:45-46`
  - Passed via ?type= query parameter
  - Defaults to INVOICE if not specified
  - Determines page title and document behavior

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/(dashboard)/invoices/new/page.tsx:22`
  - [[company-management]] - Company must exist → `src/app/(dashboard)/invoices/new/page.tsx:23`
  - [[contacts]] - Buyer selection requires contacts → `src/app/(dashboard)/invoices/new/page.tsx:32-36`
  - [[products]] - Optional product quick-add → `src/app/(dashboard)/invoices/new/page.tsx:39-43`
  - [[business-premises]] - Required for invoice numbering → `src/lib/invoice-numbering.ts:45-62`
  - [[billing-subscription]] - Enforces plan limits → `src/app/actions/invoice.ts:41-48`

- **Depended by**:
  - [[invoices-list]] - Redirects to invoice list on success → `src/app/(dashboard)/invoices/new/invoice-form.tsx:115`
  - [[invoice-detail]] - Created invoices viewable at /invoices/:id
  - [[fiscalization]] - Draft invoices can be fiscalized
  - [[e-invoice-sending]] - E-invoices can be sent to buyers

## Integrations

### Billing Integration

- **Stripe Subscription Limits** → `src/lib/billing/stripe.ts:294-337`
  - Checks plan-based invoice limits
  - Enforces monthly invoice caps
  - Validates trial/subscription status
  - Returns detailed usage statistics

### Fiscal System Integration

- **Invoice Numbering Compliance** → `src/lib/invoice-numbering.ts:3-11`
  - Follows Croatian fiscalization format
  - Sequential numbering per year
  - Business premises and device codes
  - Prepares invoices for CRS fiscalization

### Toast Notifications

- **Sonner Integration** → `src/lib/toast.ts:1-32`
  - Success: "Dokument je kreiran" → `src/app/(dashboard)/invoices/new/invoice-form.tsx:114`
  - Error: Validation messages → `src/app/(dashboard)/invoices/new/invoice-form.tsx:91,96,117`
  - Error: Server-side errors → `src/app/actions/invoice.ts:46,56,113`

## Verification Checklist

- [ ] User can access /invoices/new with authentication
- [ ] Contacts dropdown populates from database
- [ ] Products dropdown shows active products only
- [ ] Line items can be added/removed (minimum 1)
- [ ] Totals calculate correctly in real-time
- [ ] Product quick-add populates line item fields
- [ ] Client validation prevents submission of invalid data
- [ ] Subscription limit enforced before creation
- [ ] Invoice number generated sequentially
- [ ] Line totals calculated with Decimal precision
- [ ] Invoice and lines created in single transaction
- [ ] User redirected to /invoices on success
- [ ] Toast notification displayed on success/error
- [ ] Tenant isolation prevents cross-company access
- [ ] Business premises auto-created if missing
- [ ] Payment device auto-created if missing
- [ ] Multiple invoice types supported (INVOICE, E_INVOICE, QUOTE, etc.)
- [ ] Currency defaults to EUR
- [ ] Status defaults to DRAFT
- [ ] Notes field optional

## Evidence Links

1. Entry point page component → `src/app/(dashboard)/invoices/new/page.tsx:17`
2. Invoice form client component → `src/app/(dashboard)/invoices/new/invoice-form.tsx:28`
3. Server action for creation → `src/app/actions/invoice.ts:35`
4. Invoice numbering logic → `src/lib/invoice-numbering.ts:37`
5. Subscription limit check → `src/lib/billing/stripe.ts:294`
6. Tenant context wrapper → `src/lib/auth-utils.ts:75`
7. EInvoice schema definition → `prisma/schema.prisma:191`
8. EInvoiceLine schema definition → `prisma/schema.prisma:261`
9. Contact model for buyer → `prisma/schema.prisma:148`
10. Product model for quick-add → `prisma/schema.prisma:173`
11. InvoiceSequence for numbering → `prisma/schema.prisma:331`
12. Type labels mapping → `src/app/(dashboard)/invoices/new/page.tsx:8`
13. Line items state management → `src/app/(dashboard)/invoices/new/invoice-form.tsx:35`
14. Totals calculation logic → `src/app/(dashboard)/invoices/new/invoice-form.tsx:74`
15. Product quick-add handler → `src/app/(dashboard)/invoices/new/invoice-form.tsx:54`
16. Client validation → `src/app/(dashboard)/invoices/new/invoice-form.tsx:90`
17. Server-side line calculation → `src/app/actions/invoice.ts:63`
18. Database create transaction → `src/app/actions/invoice.ts:88`
19. Buyer verification → `src/app/actions/invoice.ts:51`
20. Route revalidation → `src/app/actions/invoice.ts:108`
21. Success redirect → `src/app/(dashboard)/invoices/new/invoice-form.tsx:115`
22. New document dropdown entry → `src/components/documents/new-document-dropdown.tsx:12`
23. Business premises auto-create → `src/lib/invoice-numbering.ts:52`
24. Payment device auto-create → `src/lib/invoice-numbering.ts:76`
25. Atomic sequence increment → `src/lib/invoice-numbering.ts:92`
26. Currency formatting → `src/app/(dashboard)/invoices/new/invoice-form.tsx:121`
27. Toast integration → `src/lib/toast.ts:3`
