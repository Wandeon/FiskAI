# Feature: Mark Invoice as Paid

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 14

## Purpose

Mark Invoice as Paid enables users to manually record when an invoice has been paid by updating the payment date (`paidAt`) and changing the invoice status to `ACCEPTED`. This feature is critical for cash flow tracking, receivables management, and accounting accuracy. It can be triggered manually via the UI or automatically through bank reconciliation when a matching payment transaction is detected.

## User Entry Points

| Type          | Path                              | Evidence                                                         |
| ------------- | --------------------------------- | ---------------------------------------------------------------- |
| UI Button     | /e-invoices/:id                   | `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:114-123` |
| Server API    | /api/banking/reconciliation/match | `src/app/api/banking/reconciliation/match/route.ts:72-78`        |
| Server Action | markInvoiceAsPaid                 | `src/app/actions/e-invoice.ts:309-346`                           |

## Core Flow

### Manual Payment Marking

1. User navigates to invoice detail page → `src/app/(dashboard)/e-invoices/[id]/page.tsx:36-299`
2. System checks if invoice qualifies for "Mark as Paid" action → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98`
   - Status must be FISCALIZED, SENT, or DELIVERED
   - Invoice must not already have `paidAt` date
3. User sees green "Označi kao plaćeno" button with CheckCircle icon → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:114-123`
4. User clicks button, triggering confirmation dialog → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:52-54`
5. User confirms action in Croatian dialog: "Jeste li sigurni da želite označiti ovaj račun kao plaćen?"
6. Client-side state shows loading state "Označavanje..." → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:56-57,121`
7. Server action `markInvoiceAsPaid` validates request → `src/app/actions/e-invoice.ts:309-346`
8. Database updates invoice with `paidAt: new Date()` and `status: "ACCEPTED"` → `src/app/actions/e-invoice.ts:334-340`
9. Success toast displayed: "Račun označen kao plaćen" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:68`
10. Page refreshes to show updated status and payment date → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:69`

### Automatic Payment via Bank Reconciliation

1. User matches bank transaction to invoice via reconciliation UI → `src/app/api/banking/reconciliation/match/route.ts:29-59`
2. System validates invoice is not already paid → `src/app/api/banking/reconciliation/match/route.ts:54-59`
3. System updates invoice `paidAt` to transaction date (not current date) → `src/app/api/banking/reconciliation/match/route.ts:75`
4. Invoice status automatically changes to `ACCEPTED` → `src/app/api/banking/reconciliation/match/route.ts:76`
5. Multiple paths revalidated to show updated state → `src/app/api/banking/reconciliation/match/route.ts:80-87`

## Key Modules

| Module               | Purpose                                             | Location                                                 |
| -------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| InvoiceDetailActions | Client component with mark as paid button and logic | `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx` |
| markInvoiceAsPaid    | Server action handling payment status update        | `src/app/actions/e-invoice.ts:309-346`                   |
| Invoice Detail Page  | Displays invoice with payment status and history    | `src/app/(dashboard)/e-invoices/[id]/page.tsx`           |
| Reconciliation API   | Automatic payment marking from bank transactions    | `src/app/api/banking/reconciliation/match/route.ts`      |
| EInvoice Schema      | Database model with paidAt field and status enum    | `prisma/schema.prisma:191-259`                           |

## Data

### Tables

- **EInvoice** → `prisma/schema.prisma:191-259`
  - Primary table for invoice data and payment tracking

### Key Fields

| Field  | Type           | Purpose                                      | Evidence                   |
| ------ | -------------- | -------------------------------------------- | -------------------------- |
| paidAt | DateTime?      | Timestamp when invoice was marked as paid    | `prisma/schema.prisma:232` |
| status | EInvoiceStatus | Current invoice status (changes to ACCEPTED) | `prisma/schema.prisma:205` |

### Status Flow

```
DRAFT → SENT → DELIVERED → ACCEPTED (when paid)
         ↓                      ↓
    FISCALIZED ────────────→ ACCEPTED (when paid)
```

Valid statuses for marking as paid: `["FISCALIZED", "SENT", "DELIVERED"]` → `src/app/actions/e-invoice.ts:323`

## Business Rules

### Eligibility Requirements

1. **Status Validation** → `src/app/actions/e-invoice.ts:322-326`
   - Invoice must be in one of: FISCALIZED, SENT, or DELIVERED status
   - Error message: "Invoice must be fiscalized, sent, or delivered to mark as paid"

2. **Already Paid Check** → `src/app/actions/e-invoice.ts:328-331`
   - Invoice cannot already have `paidAt` timestamp
   - Error message: "Invoice is already marked as paid"

3. **Direction** → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98`
   - Only applies to outbound invoices (sent to customers)
   - Inbound invoices (from vendors) use different workflow

4. **Tenant Security** → `src/app/actions/e-invoice.ts:314-320`
   - User must have permission to access invoice via company context
   - Automatically filtered by tenant isolation

### Status Transition

When marked as paid:

- `paidAt` set to current timestamp (manual) or transaction date (automatic) → `src/app/actions/e-invoice.ts:337`
- `status` changed to `ACCEPTED` → `src/app/actions/e-invoice.ts:338`
- Multiple cache paths revalidated → `src/app/actions/e-invoice.ts:342-343`

### Bank Reconciliation Integration

When marking paid via bank reconciliation:

- Uses transaction date instead of current date → `src/app/api/banking/reconciliation/match/route.ts:75`
- Links transaction to invoice via `matchedInvoiceId` → `src/app/api/banking/reconciliation/match/route.ts:64`
- Prevents double-payment by checking existing `paidAt` → `src/app/api/banking/reconciliation/match/route.ts:54-59`
- Error message: "Račun je već evidentiran kao plaćen"

## UI Components

### Mark as Paid Button

**Visual Design:**

- Green background (`bg-green-600`) with hover state (`hover:bg-green-700`) → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:118`
- CheckCircle icon from Lucide React → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:9,120`
- Croatian label: "Označi kao plaćeno" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:121`
- Loading state: "Označavanje..." → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:121`

**Conditional Rendering:**

```typescript
const canMarkAsPaid =
  (status === "FISCALIZED" || status === "SENT" || status === "DELIVERED") && !paidAt
```

Evidence: `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98`

### Payment Date Display

After marking as paid, payment date appears in the History card:

- Label: "Plaćeno" → `src/app/(dashboard)/e-invoices/[id]/page.tsx:289`
- Format: Croatian date/time format (`hr-HR`) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:290`
- Location: Right sidebar, "Povijest" (History) section → `src/app/(dashboard)/e-invoices/[id]/page.tsx:268-294`

Evidence: `src/app/(dashboard)/e-invoices/[id]/page.tsx:287-292`

### Status Badge

Invoice status updates to show "Prihvaćeno" (Accepted):

- Green badge: `bg-green-100 text-green-700` → `src/app/(dashboard)/e-invoices/[id]/page.tsx:30`
- Label: "Prihvaćeno" → `src/app/(dashboard)/e-invoices/[id]/page.tsx:18`

Evidence: `src/app/(dashboard)/e-invoices/[id]/page.tsx:24-34,72-78`

## User Feedback

### Success Messages

1. **Manual marking** → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:68`
   - Toast: "Račun označen kao plaćen"
   - Type: Success (green)
   - Library: Sonner via custom toast wrapper → `src/lib/toast.ts:3-6`

2. **Automatic via reconciliation**
   - Implicit success through page refresh and updated status

### Error Messages

1. **Already Paid** → `src/app/actions/e-invoice.ts:330`
   - Message: "Invoice is already marked as paid"
   - Prevents duplicate payment recording

2. **Invalid Status** → `src/app/actions/e-invoice.ts:325`
   - Message: "Invoice must be fiscalized, sent, or delivered to mark as paid"
   - Guides user to correct workflow

3. **Not Found** → `src/app/actions/e-invoice.ts:319`
   - Message: "Invoice not found or you don't have permission to access it"
   - Handles missing invoice or permission issues

4. **Bank Reconciliation Already Paid** → `src/app/api/banking/reconciliation/match/route.ts:56`
   - Message: "Račun je već evidentiran kao plaćen"
   - Croatian message for reconciliation context

### Confirmation Dialog

Before marking as paid, user must confirm:

- Message: "Jeste li sigurni da želite označiti ovaj račun kao plaćen?"
- Type: Native browser confirm dialog
- Evidence: `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:52-54`

## Dependencies

- **Depends on**:
  - [[auth-session]] - User authentication required
  - [[e-invoice-details]] - Invoice must exist and be viewable
  - Database migration `20251211_add_paid_at` - Added `paidAt` column → `prisma/migrations/20251211_add_paid_at/migration.sql`
  - Prisma Client - Database access and types
  - Toast notifications - User feedback system → `src/lib/toast.ts`

- **Depended by**:
  - [[bank-reconciliation]] - Auto-marks invoices as paid when matched
  - [[dashboard-vat-overview]] - Filters by paid status for VAT calculations
  - [[dashboard-revenue-trends]] - Includes ACCEPTED status in revenue
  - [[reports-kpr]] - KPR report filters for paid invoices only
  - [[reports-aging]] - Excludes paid invoices from aging analysis

## Integrations

### Database Migration

Added `paidAt` column to `EInvoice` table:

```sql
ALTER TABLE "EInvoice" ADD COLUMN "paidAt" TIMESTAMP(3);
```

Evidence: `prisma/migrations/20251211_add_paid_at/migration.sql:2`

### Status Enum

`EInvoiceStatus` enum includes `ACCEPTED` state:

```prisma
enum EInvoiceStatus {
  DRAFT
  PENDING_FISCALIZATION
  FISCALIZED
  SENT
  DELIVERED
  ACCEPTED  // ← Used when invoice is marked as paid
  REJECTED
  ARCHIVED
  ERROR
}
```

Evidence: `prisma/schema.prisma:803-813`

### Revenue Calculations

Invoices with `ACCEPTED` status are included in revenue metrics:

- Dashboard quick stats → `docs/02_FEATURES/features/dashboard-quick-stats.md:51`
- Revenue trends chart → `docs/02_FEATURES/features/dashboard-revenue-trends.md:41`
- VAT overview calculations → `docs/02_FEATURES/features/dashboard-vat-overview.md:53`

Evidence: Multiple dashboard queries filter for status in `["FISCALIZED", "SENT", "DELIVERED", "ACCEPTED"]`

### Bank Reconciliation

Automatic payment marking flow:

1. Transaction matched to invoice → `src/app/api/banking/reconciliation/match/route.ts:61-70`
2. Invoice `paidAt` set to transaction date → `src/app/api/banking/reconciliation/match/route.ts:75`
3. Status changed to `ACCEPTED` → `src/app/api/banking/reconciliation/match/route.ts:76`
4. Bank transaction `matchStatus` set to `MANUAL_MATCHED` → `src/app/api/banking/reconciliation/match/route.ts:65`

Evidence: `src/app/api/banking/reconciliation/match/route.ts:46-78`

## Verification Checklist

- [x] User can see "Označi kao plaćeno" button on fiscalized/sent/delivered invoices
- [x] Button is hidden if invoice already has `paidAt` date
- [x] Button displays green background with CheckCircle icon
- [x] Confirmation dialog appears before marking as paid
- [x] Success toast shown: "Račun označen kao plaćen"
- [x] Invoice status changes to "ACCEPTED" after marking as paid
- [x] Payment date appears in History section with Croatian formatting
- [x] Status badge updates to green "Prihvaćeno"
- [x] Error shown if trying to mark already-paid invoice
- [x] Error shown if invoice is in invalid status (e.g., DRAFT)
- [x] Bank reconciliation can automatically mark invoices as paid
- [x] Transaction date (not current date) used for auto-payment
- [x] Page refreshes automatically to show updated state
- [x] Multiple cache paths revalidated for consistency

## Evidence Links

1. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:6` - markInvoiceAsPaid action import
2. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:51-72` - handleMarkAsPaid client function
3. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98` - canMarkAsPaid eligibility logic
4. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:114-123` - Mark as paid button UI
5. `src/app/actions/e-invoice.ts:309-346` - markInvoiceAsPaid server action implementation
6. `src/app/actions/e-invoice.ts:323` - Valid status array for marking as paid
7. `src/app/actions/e-invoice.ts:334-340` - Database update with paidAt and status change
8. `prisma/schema.prisma:232` - paidAt field definition
9. `prisma/schema.prisma:205` - status field with EInvoiceStatus enum
10. `prisma/migrations/20251211_add_paid_at/migration.sql` - Migration adding paidAt column
11. `src/app/(dashboard)/e-invoices/[id]/page.tsx:287-292` - Payment date display in UI
12. `src/app/api/banking/reconciliation/match/route.ts:54-78` - Automatic payment via bank reconciliation
13. `src/lib/toast.ts:3-6` - Toast notification system for user feedback
14. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:9,120` - CheckCircle icon from Lucide React
