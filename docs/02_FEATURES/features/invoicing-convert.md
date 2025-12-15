# Feature: Convert to Invoice

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 15

## Purpose

The Convert to Invoice feature enables users to transform quotes (QUOTE) and proforma invoices (PROFORMA) into regular invoices (INVOICE) with a single action. This streamlines the sales workflow by copying all line items, pricing, and customer information from the source document while generating a new invoice number and setting the current date as the issue date.

## User Entry Points

| Type   | Path                | Evidence                                                   |
| ------ | ------------------- | ---------------------------------------------------------- |
| Action | Invoice Detail Page | `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:27` |
| API    | Server Action       | `src/app/actions/invoice.ts:117`                           |

## Core Flow

1. User views a QUOTE or PROFORMA invoice → `src/app/(dashboard)/invoices/[id]/page.tsx:46-59`
2. System checks if conversion is allowed (canConvert = type is QUOTE or PROFORMA) → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:21`
3. User clicks "Pretvori u račun" (Convert to Invoice) button → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:124-126`
4. System shows confirmation dialog → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:28`
5. System validates authentication and company context → `src/app/actions/invoice.ts:119-121`
6. System checks invoice limit before conversion → `src/app/actions/invoice.ts:123-130`
7. System retrieves source document with all lines → `src/app/actions/invoice.ts:133-136`
8. System validates source document type (QUOTE or PROFORMA only) → `src/app/actions/invoice.ts:142-144`
9. System generates new invoice number → `src/app/actions/invoice.ts:147`
10. System creates new INVOICE with copied data and DRAFT status → `src/app/actions/invoice.ts:150-181`
11. System revalidates cache for both source and new invoice → `src/app/actions/invoice.ts:183-184`
12. User is redirected to the new invoice detail page → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:36`

## Key Modules

| Module               | Purpose                              | Location                                                |
| -------------------- | ------------------------------------ | ------------------------------------------------------- |
| convertToInvoice     | Server action for conversion         | `src/app/actions/invoice.ts:117-191`                    |
| InvoiceActions       | UI component with conversion button  | `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx` |
| getNextInvoiceNumber | Generates sequential invoice numbers | `src/lib/invoice-numbering.ts:37-126`                   |
| canCreateInvoice     | Checks invoice limits                | `src/lib/billing/stripe.ts:294-337`                     |

## Conversion Logic

### Type Validation

Only two document types can be converted to invoices → `src/app/actions/invoice.ts:142-144`:

- **QUOTE** - Sales quotes/offers
- **PROFORMA** - Proforma invoices

All other types (INVOICE, E_INVOICE, CREDIT_NOTE, DEBIT_NOTE) are rejected with error message: "Samo ponude i predračuni mogu biti pretvoreni u račune"

### Data Copying

The conversion creates a new invoice with the following data copied from source → `src/app/actions/invoice.ts:150-181`:

**Preserved Fields:**

- `buyerId` - Customer remains the same → line 156
- `dueDate` - Payment due date preserved → line 158
- `currency` - Currency (default EUR) → line 159
- `notes` - Any notes/comments → line 160
- `netAmount` - Net total before VAT → line 161
- `vatAmount` - VAT total → line 162
- `totalAmount` - Grand total → line 163
- All line items with complete details → lines 167-177

**New/Changed Fields:**

- `type` - Changed from QUOTE/PROFORMA to INVOICE → line 152
- `direction` - Set to OUTBOUND → line 153
- `invoiceNumber` - New sequential number (e.g., "43-1-1") → line 154
- `internalReference` - New reference with year (e.g., "2025/43-1-1") → line 155
- `issueDate` - Set to current date → line 157
- `status` - Always DRAFT for new invoices → line 164
- `convertedFromId` - Links back to source document → line 165

### Line Item Copying

Each line from the source is copied exactly → `src/app/actions/invoice.ts:167-177`:

```typescript
lines: {
  create: source.lines.map((line) => ({
    lineNumber: line.lineNumber,      // Sequential line number
    description: line.description,    // Product/service description
    quantity: line.quantity,          // Quantity (Decimal)
    unit: line.unit,                  // Unit code (e.g., "C62" for pieces)
    unitPrice: line.unitPrice,        // Price per unit (Decimal)
    netAmount: line.netAmount,        // Line total before VAT (Decimal)
    vatRate: line.vatRate,            // VAT percentage (Decimal)
    vatCategory: line.vatCategory,    // VAT category code (e.g., "S")
    vatAmount: line.vatAmount,        // VAT for this line (Decimal)
  })),
}
```

## Billing Integration

### Invoice Limit Check

Before conversion, the system checks if the company can create more invoices → `src/app/actions/invoice.ts:123-130`:

1. Checks unlimited plan status (invoiceLimit = -1) → `src/lib/billing/stripe.ts:300-302`
2. Validates trial hasn't expired → `src/lib/billing/stripe.ts:305-310`
3. Validates subscription is active or trialing → `src/lib/billing/stripe.ts:313-316`
4. Counts invoices created this month → `src/lib/billing/stripe.ts:323-328`
5. Compares count against plan limit → `src/lib/billing/stripe.ts:330`

**Error Message on Limit:**

```
Dostigli ste mjesečni limit računa ({used}/{limit}). Nadogradite plan za više računa.
```

→ `src/app/actions/invoice.ts:128`

### Plan Limits

| Plan     | Monthly Limit | Notes                          |
| -------- | ------------- | ------------------------------ |
| Pausalni | 50 invoices   | `src/lib/billing/stripe.ts:30` |
| Standard | 200 invoices  | `src/lib/billing/stripe.ts:37` |
| Pro      | Unlimited     | `src/lib/billing/stripe.ts:44` |

## Invoice Numbering

The system generates Croatian fiscalization-compliant invoice numbers → `src/lib/invoice-numbering.ts:1-126`:

**Format:** `{broj}-{poslovni_prostor}-{naplatni_uređaj}`

- Example: `43-1-1`

**Internal Reference:** `{year}/{broj}-{poslovni_prostor}-{naplatni_uređaj}`

- Example: `2025/43-1-1`

The numbering system:

1. Uses atomic database increment to prevent gaps → `src/lib/invoice-numbering.ts:92-108`
2. Creates default business premises (code 1) if none exists → `src/lib/invoice-numbering.ts:51-62`
3. Creates default payment device (code 1) if none exists → `src/lib/invoice-numbering.ts:64-88`
4. Maintains separate sequences per year and premises → `src/lib/invoice-numbering.ts:94-97`

## Document Linking

### Forward and Backward References

The conversion creates bidirectional links between documents:

**Backward Link (convertedFrom):**

- New invoice stores source document ID → `src/app/actions/invoice.ts:165`
- Displayed as blue info card on new invoice → `src/app/(dashboard)/invoices/[id]/page.tsx:106-116`
- Shows: "Konvertirano iz: [number] ([type])" with clickable link

**Forward Link (convertedTo):**

- Source document gets automatic relation via Prisma → `prisma/schema.prisma:247`
- Displayed as green info card on source → `src/app/(dashboard)/invoices/[id]/page.tsx:118-134`
- Shows: "Konvertirano u: [number] ([type])" with clickable link
- Supports multiple conversions (array of converted invoices)

### Database Schema

```prisma
model EInvoice {
  convertedFromId   String?
  convertedFrom     EInvoice?  @relation("InvoiceConversion", fields: [convertedFromId], references: [id])
  convertedTo       EInvoice[] @relation("InvoiceConversion")
}
```

→ `prisma/schema.prisma:231,246-247`

## Data

### Database Tables

- **EInvoice** → `prisma/schema.prisma:191-259`
  - Source: type QUOTE or PROFORMA with all fields
  - Target: new INVOICE with DRAFT status
  - Link: convertedFromId establishes relationship

- **EInvoiceLine** → `prisma/schema.prisma:261-276`
  - All lines copied with identical values
  - New line IDs generated automatically
  - Foreign key points to new invoice

- **Company** → `prisma/schema.prisma:68-130`
  - invoiceLimit field controls conversion availability
  - subscriptionStatus must be "active" or "trialing"

- **InvoiceSequence** → `prisma/schema.prisma:331-343`
  - Atomic increment ensures unique numbers
  - Tracked per business premises and year

## Security

### Authentication & Authorization

1. **User Authentication** → `src/app/actions/invoice.ts:119`
   - Requires valid session via `requireAuth()`
   - Unauthenticated requests rejected

2. **Company Context** → `src/app/actions/invoice.ts:121`
   - User must belong to company via `requireCompanyWithContext()`
   - Multi-tenant isolation via tenant context

3. **Document Ownership**
   - Source document filtered by company context → `src/app/actions/invoice.ts:133-134`
   - Prevents cross-company conversions

### Validation Rules

1. **Type Validation** → `src/app/actions/invoice.ts:142-144`
   - Only QUOTE and PROFORMA allowed
   - Other types return error

2. **Existence Check** → `src/app/actions/invoice.ts:138-140`
   - Source document must exist
   - Error if not found: "Dokument nije pronađen"

3. **Limit Validation** → `src/app/actions/invoice.ts:123-130`
   - Checks monthly invoice count
   - Respects subscription plan limits

## UI Components

### Conversion Button

Location: Invoice detail page actions bar → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:123-127`

**Visibility Logic:**

```typescript
const canConvert = invoice.type === "QUOTE" || invoice.type === "PROFORMA"
```

→ `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:21`

**Button Properties:**

- Label: "Pretvori u račun"
- Only shown when canConvert is true
- Disabled during loading state
- Requires confirmation dialog

### Confirmation Dialog

Before conversion, user must confirm → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:28`:

```javascript
if (!confirm("Pretvoriti ovaj dokument u račun?")) return
```

### Loading States

Button shows loading state during async operation → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:29-32`:

- `isLoading` state prevents double-clicks
- Button remains disabled until completion

### Success/Error Feedback

**Success:**

- Toast message: "Dokument je pretvoren u račun" → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:35`
- Automatic redirect to new invoice → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:36`

**Error:**

- Toast with error message → `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:38`
- User remains on source document page

## Cache Management

The system revalidates Next.js cache for affected pages → `src/app/actions/invoice.ts:183-184`:

1. **Invoice List** - `/invoices` path revalidated
2. **Source Document** - `/invoices/{sourceId}` path revalidated

This ensures:

- New invoice appears in list immediately
- Source document shows "converted to" link
- No stale data displayed

## Error Handling

### Common Error Cases

1. **Document Not Found** → `src/app/actions/invoice.ts:138-140`
   - Message: "Dokument nije pronađen"
   - Occurs if ID invalid or wrong company

2. **Invalid Type** → `src/app/actions/invoice.ts:142-144`
   - Message: "Samo ponude i predračuni mogu biti pretvoreni u račune"
   - Only QUOTE/PROFORMA allowed

3. **Invoice Limit Reached** → `src/app/actions/invoice.ts:126-129`
   - Message: "Dostigli ste mjesečni limit računa (X/Y). Nadogradite plan za više računa."
   - Shows current usage stats

4. **Generic Failure** → `src/app/actions/invoice.ts:187-190`
   - Message: "Greška pri pretvaranju u račun"
   - Logged to console for debugging

### Error Response Format

All errors return ActionResult type → `src/app/actions/invoice.ts:12-16`:

```typescript
interface ActionResult<T> {
  success: boolean
  error?: string
  data?: T
}
```

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required
  - [[company-management]] - Company context required
  - [[invoicing-create]] - Uses same numbering system
  - [[billing-system]] - Invoice limit enforcement

- **Depended by**:
  - [[invoicing-view]] - Shows conversion status
  - [[dashboard-recent-activity]] - Tracks converted invoices

## Integrations

### Internal Systems

1. **Billing System** → `src/lib/billing/stripe.ts`
   - Enforces subscription-based invoice limits
   - Tracks monthly usage

2. **Invoice Numbering** → `src/lib/invoice-numbering.ts`
   - Generates sequential Croatian-compliant numbers
   - Manages business premises and devices

3. **Multi-Tenancy** → `src/lib/auth-utils.ts`
   - Ensures proper company isolation
   - Validates user permissions

## Verification Checklist

- [x] QUOTE documents show "Pretvori u račun" button
- [x] PROFORMA documents show "Pretvori u račun" button
- [x] INVOICE documents hide conversion button
- [x] Conversion requires confirmation dialog
- [x] New invoice gets unique sequential number
- [x] All line items copied with exact values
- [x] Customer information preserved
- [x] New invoice starts in DRAFT status
- [x] Issue date set to current date
- [x] convertedFromId links to source document
- [x] Source document shows "converted to" badge
- [x] Invoice limit checked before conversion
- [x] Error shown when limit reached
- [x] User redirected to new invoice on success
- [x] Cache revalidated for affected pages

## Evidence Links

1. `src/app/actions/invoice.ts:117-191` - Main convertToInvoice server action
2. `src/app/(dashboard)/invoices/[id]/invoice-actions.tsx:21-40` - UI button and click handler
3. `src/app/(dashboard)/invoices/[id]/page.tsx:106-134` - Conversion status display
4. `src/lib/invoice-numbering.ts:37-126` - Invoice number generation
5. `src/lib/billing/stripe.ts:294-337` - Invoice limit checking
6. `prisma/schema.prisma:191-259` - EInvoice model with conversion fields
7. `prisma/schema.prisma:231,246-247` - convertedFrom/convertedTo relations
8. `prisma/schema.prisma:261-276` - EInvoiceLine model
9. `prisma/schema.prisma:331-343` - InvoiceSequence for numbering
10. `src/lib/auth-utils.ts:12-35` - Authentication utilities
11. `src/app/actions/invoice.ts:142-144` - Type validation logic
12. `src/app/actions/invoice.ts:167-177` - Line item copying logic
13. `src/app/actions/invoice.ts:150-165` - New invoice creation
14. `src/lib/billing/stripe.ts:26-48` - Plan limits configuration
15. `src/app/actions/invoice.ts:183-184` - Cache revalidation
