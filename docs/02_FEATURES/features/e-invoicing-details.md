# Feature: E-Invoice Details

## Status

- Documentation: Complete
- Last verified: 2025-12-15
- Evidence count: 15

## Purpose

Provides a comprehensive detail view for individual e-invoices, displaying all invoice information including buyer/seller details, line items, totals, fiscalization data, status tracking, and payment history. Users can view the complete invoice lifecycle from draft creation through fiscalization, delivery, and payment, with contextual actions available based on the current invoice status.

## User Entry Points

| Type | Path            | Evidence                                              |
| ---- | --------------- | ----------------------------------------------------- |
| Page | /e-invoices/:id | `src/app/(dashboard)/e-invoices/[id]/page.tsx:36-299` |
| API  | getEInvoice     | `src/app/actions/e-invoice.ts:269-283`                |

## Core Flow

### Invoice Detail View Flow

1. User navigates to e-invoices list at /e-invoices → `src/app/(dashboard)/e-invoices/page.tsx:61`
2. User clicks on an invoice to view details → `src/app/(dashboard)/e-invoices/[id]/page.tsx:36`
3. System authenticates user and verifies company access → `src/app/(dashboard)/e-invoices/[id]/page.tsx:38-39`
4. System fetches invoice with related data (buyer, seller, lines) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:41-53`
5. System renders 404 if invoice not found or doesn't belong to company → `src/app/(dashboard)/e-invoices/[id]/page.tsx:55-57`
6. Page displays invoice header with number and status badge → `src/app/(dashboard)/e-invoices/[id]/page.tsx:69,72-78`
7. InvoiceDetailActions component renders based on status → `src/app/(dashboard)/e-invoices/[id]/page.tsx:79-85`
8. System displays seller (company) and buyer party information → `src/app/(dashboard)/e-invoices/[id]/page.tsx:92-128`
9. Line items table shows all invoice lines with calculations → `src/app/(dashboard)/e-invoices/[id]/page.tsx:131-171`
10. Sidebar displays summary totals and invoice details → `src/app/(dashboard)/e-invoices/[id]/page.tsx:177-224`
11. Fiscalization card shows JIR/ZKI if fiscalized → `src/app/(dashboard)/e-invoices/[id]/page.tsx:227-253`
12. Error card displays provider errors if present → `src/app/(dashboard)/e-invoices/[id]/page.tsx:256-265`
13. Timeline card shows creation, sent, updated, and payment timestamps → `src/app/(dashboard)/e-invoices/[id]/page.tsx:268-294`

### Status-Based Actions

1. System determines available actions based on invoice status → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95-98`
2. DRAFT invoices show Edit, Send, and Delete buttons → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95-97,102-133`
3. ERROR status invoices can be resent → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95,108-112`
4. FISCALIZED/SENT/DELIVERED invoices show "Mark as Paid" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98,114-123`
5. User clicks action button, triggering confirmation dialog → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:29,52,75`
6. Action executes with loading state and toast notification → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:33-48,56-71,79-92`
7. Page refreshes to reflect updated status → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:46,69,92`

## Key Modules

| Module                | Purpose                                       | Location                                                 |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- |
| E-Invoice Detail Page | Server component rendering invoice details    | `src/app/(dashboard)/e-invoices/[id]/page.tsx`           |
| InvoiceDetailActions  | Client component with status-based actions    | `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx` |
| getEInvoice action    | Server action to fetch invoice with relations | `src/app/actions/e-invoice.ts:269-283`                   |
| sendEInvoice action   | Server action to send invoice via provider    | `src/app/actions/e-invoice.ts:128-221`                   |
| deleteEInvoice action | Server action to delete draft invoices        | `src/app/actions/e-invoice.ts:285-307`                   |
| markInvoiceAsPaid     | Server action to mark invoice as paid         | `src/app/actions/e-invoice.ts:309-346`                   |
| UBL Generator         | Generates UBL 2.1 XML for e-invoicing         | `src/lib/e-invoice/ubl-generator.ts:97-190`              |

## Data

### Database Tables

- **EInvoice**: Main invoice table → `prisma/schema.prisma:191-259`
  - Key fields: id, invoiceNumber, status, direction, buyerId, sellerId
  - Financial fields: netAmount, vatAmount, totalAmount, currency
  - Fiscal fields: jir, zki, fiscalizedAt, operatorOib → `prisma/schema.prisma:206-210`
  - UBL storage: ublXml → `prisma/schema.prisma:211`
  - Provider fields: providerRef, providerStatus, providerError → `prisma/schema.prisma:212-214`
  - Timeline fields: createdAt, updatedAt, sentAt, paidAt, fiscalizedAt → `prisma/schema.prisma:217-219,232`
  - Email tracking: emailMessageId, emailDeliveredAt, emailOpenedAt → `prisma/schema.prisma:222-227`

- **EInvoiceLine**: Invoice line items → `prisma/schema.prisma:261-276`
  - Key fields: lineNumber, description, quantity, unit, unitPrice
  - Amount fields: netAmount, vatAmount, vatRate, vatCategory
  - Ordered by lineNumber → `src/app/(dashboard)/e-invoices/[id]/page.tsx:50`

- **Contact**: Buyer and seller information → `prisma/schema.prisma`
  - Relations: buyer (via buyerId), seller (via sellerId)
  - Key fields: name, oib, vatNumber, address, city, postalCode, email

### Status Enum

```typescript
enum EInvoiceStatus {
  DRAFT                 // Editable, can be sent or deleted
  PENDING_FISCALIZATION // Awaiting fiscal registration
  FISCALIZED            // Fiscally registered with JIR/ZKI
  SENT                  // Sent to customer via provider
  DELIVERED             // Email delivered (webhook confirmation)
  ACCEPTED              // Customer accepted / marked as paid
  REJECTED              // Customer rejected
  ARCHIVED              // Archived for long-term storage
  ERROR                 // Provider error, can retry send
}
```

Source: `prisma/schema.prisma:803-813`

### Direction Enum

- **OUTBOUND**: Issued invoices (sales) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:221`
- **INBOUND**: Received invoices (purchases) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:221`

## Display Sections

### Header Section

- Invoice number with back link → `src/app/(dashboard)/e-invoices/[id]/page.tsx:63-69`
- Status badge with localized labels and color coding → `src/app/(dashboard)/e-invoices/[id]/page.tsx:72-78`
- Status colors mapped to visual states → `src/app/(dashboard)/e-invoices/[id]/page.tsx:24-34`
- Action buttons based on status → `src/app/(dashboard)/e-invoices/[id]/page.tsx:79-85`

### Party Information Cards

- **Seller Card** (Company) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:93-105`
  - Name, OIB, VAT number, address, postal code, city, email

- **Buyer Card** (Contact) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:107-127`
  - Name, OIB, VAT number, address, postal code, city, email
  - Handles missing buyer gracefully → `src/app/(dashboard)/e-invoices/[id]/page.tsx:123-124`

### Line Items Table

- Columns: #, Description, Quantity, Unit Price, VAT Rate, Amount → `src/app/(dashboard)/e-invoices/[id]/page.tsx:138-146`
- Calculated gross amount per line (net + VAT) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:162-164`
- Monospace font for numeric values → `src/app/(dashboard)/e-invoices/[id]/page.tsx:153-164`
- Responsive overflow handling → `src/app/(dashboard)/e-invoices/[id]/page.tsx:136`

### Summary Card

- Net amount, VAT amount, and total → `src/app/(dashboard)/e-invoices/[id]/page.tsx:177-194`
- Currency display → `src/app/(dashboard)/e-invoices/[id]/page.tsx:184,188,192`
- Visual separation with border → `src/app/(dashboard)/e-invoices/[id]/page.tsx:190`

### Details Card

- Issue date (formatted Croatian locale) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:203-206`
- Due date (conditional) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:207-212`
- Buyer reference → `src/app/(dashboard)/e-invoices/[id]/page.tsx:213-218`
- Direction (Outbound/Inbound) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:219-222`

### Fiscalization Card

- Conditional display (only if JIR or ZKI present) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:227-253`
- JIR (Jedinstveni identifikator računa) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:233-237`
- ZKI (Zaštitni kod izdavatelja) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:239-243`
- Fiscalized timestamp → `src/app/(dashboard)/e-invoices/[id]/page.tsx:245-250`
- Monospace font for codes with word break → `src/app/(dashboard)/e-invoices/[id]/page.tsx:236,242`

### Error Card

- Conditional display if provider error exists → `src/app/(dashboard)/e-invoices/[id]/page.tsx:256-265`
- Red border and text styling → `src/app/(dashboard)/e-invoices/[id]/page.tsx:257,259,262`
- Full error message display → `src/app/(dashboard)/e-invoices/[id]/page.tsx:262`

### Timeline/History Card

- Created timestamp → `src/app/(dashboard)/e-invoices/[id]/page.tsx:273-276`
- Sent timestamp (conditional) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:277-282`
- Updated timestamp → `src/app/(dashboard)/e-invoices/[id]/page.tsx:283-286`
- Paid timestamp (conditional) → `src/app/(dashboard)/e-invoices/[id]/page.tsx:287-292`
- Croatian locale formatting → `src/app/(dashboard)/e-invoices/[id]/page.tsx:275,280,285,290`

## Actions Available

### Edit Action

- **Condition**: status === "DRAFT" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:96`
- **UI**: "Uredi" button with outline variant → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:102-106`
- **Navigation**: `/e-invoices/:id/edit` → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:103`
- **Note**: Edit page route does not exist yet (planned feature)

### Send Action

- **Condition**: status === "DRAFT" OR status === "ERROR" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95`
- **Server Action**: sendEInvoice → `src/app/actions/e-invoice.ts:128-221`
- **Flow**:
  1. Validates invoice is DRAFT/ERROR and OUTBOUND → `src/app/actions/e-invoice.ts:132-144`
  2. Generates UBL 2.1 XML from invoice data → `src/app/actions/e-invoice.ts:151-152`
  3. Decrypts provider API key → `src/app/actions/e-invoice.ts:157-163`
  4. Sends via configured provider → `src/app/actions/e-invoice.ts:165-168`
  5. Updates status to SENT or ERROR → `src/app/actions/e-invoice.ts:170-192`
  6. Stores JIR/ZKI if fiscalized → `src/app/actions/e-invoice.ts:188-190`
  7. Queues fiscal request if needed → `src/app/actions/e-invoice.ts:198-215`
- **UI Feedback**: Loading state "Slanje...", success/error toast → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:38-46`

### Delete Action

- **Condition**: status === "DRAFT" → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:97`
- **Server Action**: deleteEInvoice → `src/app/actions/e-invoice.ts:285-307`
- **Validation**: Only DRAFT invoices can be deleted → `src/app/actions/e-invoice.ts:289-298`
- **Cascade**: Line items deleted automatically (onDelete: Cascade) → `prisma/schema.prisma:273`
- **Navigation**: Redirects to /e-invoices after deletion → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:92`
- **UI**: Destructive variant button, confirmation dialog → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:125-133,75`

### Mark as Paid Action

- **Condition**: (status === "FISCALIZED" OR "SENT" OR "DELIVERED") AND !paidAt → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:98`
- **Server Action**: markInvoiceAsPaid → `src/app/actions/e-invoice.ts:309-346`
- **Updates**: Sets paidAt timestamp and status to ACCEPTED → `src/app/actions/e-invoice.ts:334-340`
- **UI**: Green button with CheckCircle icon → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:114-123`
- **Cache**: Revalidates both list and detail pages → `src/app/actions/e-invoice.ts:342-343`

## UBL/XML Capabilities

### UBL Generation

- **Generator**: generateUBLInvoice function → `src/lib/e-invoice/ubl-generator.ts:97`
- **Standard**: UBL 2.1 with PEPPOL BIS 3.0 compliance → `src/lib/e-invoice/ubl-generator.ts:9-11`
- **Namespaces**: invoice, cac, cbc → `src/lib/e-invoice/ubl-generator.ts:3-7`
- **Escaping**: XML entity escaping for safety → `src/lib/e-invoice/ubl-generator.ts:13-20`
- **Storage**: UBL XML stored in ublXml field after send → `src/app/actions/e-invoice.ts:186`

### Provider Integration

- **Mock Provider**: Development/testing provider → `src/lib/e-invoice/providers/mock.ts:18-45`
- **Provider Interface**: sendInvoice(invoice, ublXml) → `src/lib/e-invoice/provider.ts:15`
- **Configuration**: company.eInvoiceProvider and eInvoiceApiKeyEncrypted → `src/app/actions/e-invoice.ts:155-165`

### Display Features

- **No Direct XML View**: Current UI does not display raw UBL XML
- **Fiscal Codes Shown**: JIR and ZKI displayed in fiscal card → `src/app/(dashboard)/e-invoices/[id]/page.tsx:233-243`
- **Provider Reference**: Stored but not displayed in UI → `prisma/schema.prisma:212`

## Security Features

### Authentication & Authorization

- Requires authenticated user → `src/app/(dashboard)/e-invoices/[id]/page.tsx:38`
- Company ownership validation → `src/app/(dashboard)/e-invoices/[id]/page.tsx:39,44`
- Tenant context isolation (RLS) → `src/app/actions/e-invoice.ts:4,272`

### Data Access Controls

- Invoice filtered by companyId → `src/app/(dashboard)/e-invoices/[id]/page.tsx:44`
- 404 response if invoice not found or unauthorized → `src/app/(dashboard)/e-invoices/[id]/page.tsx:55-57`
- Buyer verification during send → `src/app/actions/e-invoice.ts:43-50`

### API Key Security

- Encrypted storage of provider API keys → `prisma/schema.prisma` (eInvoiceApiKeyEncrypted)
- Decryption with error handling → `src/app/actions/e-invoice.ts:157-163`
- Error message on decryption failure → `src/app/actions/e-invoice.ts:162`

## Dependencies

- **Depends on**:
  - Create E-Invoice (F024) - Creates invoices viewed in this feature
  - View E-Invoices (list) - Entry point to detail page
  - Contact Management - Buyer/seller information
  - Company Settings - Provider configuration

- **Depended by**:
  - Mark Invoice as Paid (F027) - Action triggered from detail page
  - Send E-Invoice - Action triggered from detail page
  - E-Invoice Email - Email sending functionality
  - Fiscalization (F064) - Fiscal registration process

## Integrations

### Prisma ORM

- Complex includes for relations → `src/app/(dashboard)/e-invoices/[id]/page.tsx:46-52`
- Decimal type for monetary values → `prisma/schema.prisma:202-204`
- Ordered line items → `src/app/(dashboard)/e-invoices/[id]/page.tsx:49-51`

### Next.js Features

- Server component for data fetching → `src/app/(dashboard)/e-invoices/[id]/page.tsx:36`
- Dynamic routing with params → `src/app/(dashboard)/e-invoices/[id]/page.tsx:8-10,37`
- notFound() for 404 handling → `src/app/(dashboard)/e-invoices/[id]/page.tsx:56`
- revalidatePath for cache invalidation → `src/app/actions/e-invoice.ts:123,217,304,342-343`

### UI Components

- Card components for layout → `src/app/(dashboard)/e-invoices/[id]/page.tsx:5`
- Link for navigation → `src/app/(dashboard)/e-invoices/[id]/page.tsx:4,63-68`
- Client component for actions → `src/app/(dashboard)/e-invoices/[id]/page.tsx:6,79-85`

### E-Invoice Provider System

- Provider factory → `src/app/actions/e-invoice.ts:6,165`
- UBL generation → `src/app/actions/e-invoice.ts:6,152`
- Mock provider for development → `src/lib/e-invoice/providers/mock.ts`

## UI Components

### Layout Components

- **Card, CardHeader, CardTitle, CardContent**: Structure containers → `src/app/(dashboard)/e-invoices/[id]/page.tsx:5`
- **Grid layout**: Responsive 3-column layout → `src/app/(dashboard)/e-invoices/[id]/page.tsx:88,92`
- **Space utilities**: Consistent spacing → `src/app/(dashboard)/e-invoices/[id]/page.tsx:60,90,175`

### Status Badge

- Dynamic color mapping → `src/app/(dashboard)/e-invoices/[id]/page.tsx:24-34`
- Localized status labels → `src/app/(dashboard)/e-invoices/[id]/page.tsx:12-22`
- Rounded pill design → `src/app/(dashboard)/e-invoices/[id]/page.tsx:73`

### Action Buttons

- Variant styles (outline, destructive, default) → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:104,127,109`
- Loading states with text changes → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:110,121,131`
- Disabled state during loading → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:109,117,129`
- Icon integration (CheckCircle) → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:9,120`

### Table Components

- Responsive overflow container → `src/app/(dashboard)/e-invoices/[id]/page.tsx:136-137`
- Header row with gray background → `src/app/(dashboard)/e-invoices/[id]/page.tsx:138`
- Monospace font for numbers → `src/app/(dashboard)/e-invoices/[id]/page.tsx:153,156,159,162`
- Right-aligned numeric columns → `src/app/(dashboard)/e-invoices/[id]/page.tsx:142-145`

## Error Handling

- **Invoice not found**: Returns 404 via notFound() → `src/app/(dashboard)/e-invoices/[id]/page.tsx:55-57`
- **Not DRAFT status**: Error when attempting to delete → `src/app/actions/e-invoice.ts:296-298`
- **Already sent**: Error when invoice already sent → `src/app/actions/e-invoice.ts:146-148`
- **Provider errors**: Displayed in error card → `src/app/(dashboard)/e-invoices/[id]/page.tsx:256-265`
- **API key decryption**: Error message on failure → `src/app/actions/e-invoice.ts:162`
- **Send failure**: Status set to ERROR with error message → `src/app/actions/e-invoice.ts:170-178`
- **Toast notifications**: User feedback for all actions → `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:38-45,61-68,84-91`

## Verification Checklist

- [x] User can view invoice details at /e-invoices/:id
- [x] Status badge displays correct label and color
- [x] Buyer and seller information shown correctly
- [x] Line items table displays all invoice lines
- [x] Summary card shows correct totals
- [x] Fiscalization card shows JIR/ZKI when present
- [x] Timeline shows all relevant timestamps
- [x] DRAFT invoices show Edit, Send, Delete actions
- [x] FISCALIZED invoices show Mark as Paid action
- [x] Send action generates UBL XML and calls provider
- [x] Delete action only works for DRAFT status
- [x] Mark as Paid updates status and paidAt
- [x] Error messages displayed in dedicated card
- [x] Provider errors handled gracefully
- [x] 404 shown for non-existent or unauthorized invoices
- [x] Tenant isolation prevents cross-company access
- [x] Cache revalidation refreshes UI after actions

## Related Features

- **Create E-Invoice**: `src/app/actions/e-invoice.ts:15-126` (F024)
- **View E-Invoices**: `src/app/(dashboard)/e-invoices/page.tsx` (list view)
- **Mark Invoice as Paid**: `src/app/actions/e-invoice.ts:309-346` (F027)
- **Send Invoice Email**: `src/app/actions/e-invoice.ts:348-445`
- **Fiscalization**: `src/lib/fiscal/should-fiscalize.ts` (F064)

## Evidence Links

1. `src/app/(dashboard)/e-invoices/[id]/page.tsx:36-299` - Main e-invoice detail page component
2. `src/app/(dashboard)/e-invoices/[id]/page.tsx:41-53` - Invoice data fetching with relations
3. `src/app/(dashboard)/e-invoices/[id]/page.tsx:69-78` - Invoice header with status badge
4. `src/app/(dashboard)/e-invoices/[id]/page.tsx:92-128` - Buyer and seller party cards
5. `src/app/(dashboard)/e-invoices/[id]/page.tsx:131-171` - Line items table rendering
6. `src/app/(dashboard)/e-invoices/[id]/page.tsx:177-224` - Summary and details sidebar
7. `src/app/(dashboard)/e-invoices/[id]/page.tsx:227-253` - Fiscalization card with JIR/ZKI
8. `src/app/(dashboard)/e-invoices/[id]/page.tsx:268-294` - Timeline/history card
9. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:95-98` - Status-based action logic
10. `src/app/(dashboard)/e-invoices/[id]/detail-actions.tsx:114-123` - Mark as paid button
11. `src/app/actions/e-invoice.ts:269-283` - getEInvoice server action
12. `src/app/actions/e-invoice.ts:128-221` - sendEInvoice with UBL generation
13. `src/app/actions/e-invoice.ts:285-307` - deleteEInvoice server action
14. `src/lib/e-invoice/ubl-generator.ts:97` - UBL 2.1 XML generator
15. `prisma/schema.prisma:191-259` - EInvoice model with all fields
