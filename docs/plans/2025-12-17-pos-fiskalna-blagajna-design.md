# POS Fiskalna Blagajna - Design Document

**Created:** 2025-12-17
**Branch:** feature/pos-fiskalna-blagajna
**GitHub Issue:** #58

---

## Overview

A Point-of-Sale system for Croatian businesses to process in-person card/cash payments and issue fiscalized A4 invoices as receipts. The "computer shop" model - a PC at the sales desk with a card reader.

### Key Decisions

| Decision       | Choice                  | Rationale                                          |
| -------------- | ----------------------- | -------------------------------------------------- |
| Payment method | Stripe Terminal         | Physical card reader, professional POS experience  |
| Fiscalization  | TEST environment first  | User needs to register with FINA, mock until ready |
| UI flexibility | Products + custom items | Supports retail and service businesses             |
| Receipt format | A4 PDF                  | Uses existing template, no thermal printer needed  |

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     QUICK SALE UI (/pos)                    │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │ Product Grid │  │           Cart / Line Items          │ │
│  │ + Search     │  │  • Product items (from grid)         │ │
│  │ + Categories │  │  • Custom items (manual entry)       │ │
│  │              │  │  • Quantity +/- buttons              │ │
│  │  [Add Custom]│  │  • Running total with VAT            │ │
│  └──────────────┘  └──────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Payment Bar: [Cash] [Card via Terminal] [Total: €XXX]  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Transaction Sequence

```
1. Validate input + calculate totals
         ↓
2. If CARD: Verify Stripe PaymentIntent succeeded
         ↓
3. BEGIN DATABASE TRANSACTION
   ├─ Create EInvoice (status: PENDING_FISCALIZATION)
   ├─ Create EInvoiceLine records
   ├─ Calculate ZKI
   └─ Queue FiscalRequest (or call mock)
         ↓
4. Call fiscalization (sync for POS, async fallback)
   ├─ Success: Update invoice with JIR, status: FISCALIZED
   └─ Failure: Keep invoice, mark fiscal error (can retry)
         ↓
5. COMMIT TRANSACTION
         ↓
6. Return invoice + PDF URL
```

**Key principle:** Invoice is created even if fiscalization fails - Croatian law requires attempting fiscalization within 48 hours, so we queue retries rather than blocking the sale.

---

## Server Action

### processPosSale()

```typescript
// src/app/actions/pos.ts
async function processPosSale(input: {
  items: Array<{
    productId?: string      // From product grid
    description: string     // Required for custom items
    quantity: number
    unitPrice: number
    vatRate: number         // 25%, 13%, 5%, 0%
  }>
  paymentMethod: 'CASH' | 'CARD'
  stripePaymentIntentId?: string  // From Terminal, if card
  buyerId?: string          // Optional - anonymous sale OK for POS
}) => Promise<{
  success: boolean
  invoice?: EInvoice
  jir?: string
  zki?: string
  pdfUrl?: string
  error?: string
}>
```

---

## Stripe Terminal Integration

### Hardware

- Stripe Terminal BBPOS WisePOS E or similar
- Connects via Internet (no local drivers needed)
- Register reader in Stripe Dashboard → Get `reader_id`

### Backend Functions

```typescript
// src/lib/stripe/terminal.ts

// 1. Create connection token (reader auth)
async function createConnectionToken(companyId: string): Promise<string>

// 2. Create payment intent for terminal
async function createTerminalPaymentIntent(input: {
  amount: number // In cents (€10.00 = 1000)
  currency: "eur"
  companyId: string
  metadata: { invoiceRef: string }
}): Promise<{ clientSecret: string; paymentIntentId: string }>

// 3. Process payment on reader
async function processPaymentOnReader(input: {
  readerId: string
  paymentIntentId: string
}): Promise<{ success: boolean; error?: string }>

// 4. Capture after successful tap/insert
async function capturePayment(paymentIntentId: string): Promise<boolean>
```

### Frontend Flow

```
[Charge Card] button clicked
        ↓
1. Call createTerminalPaymentIntent() → get paymentIntentId
        ↓
2. Call processPaymentOnReader() → reader shows "Insert Card"
        ↓
3. Customer taps/inserts card on physical reader
        ↓
4. Stripe returns success → call processPosSale() with paymentIntentId
        ↓
5. Show receipt / Print button
```

### Database Changes

Add to Company model:

```prisma
stripeTerminalLocationId  String?   // Stripe location for reader
stripeTerminalReaderId    String?   // Connected reader ID
```

---

## UI Components

### Route Structure

```
src/app/(dashboard)/pos/
├── page.tsx           # Main POS page (client component)
├── layout.tsx         # Full-width layout, no sidebar
└── components/
    ├── ProductGrid.tsx
    ├── Cart.tsx
    ├── PaymentBar.tsx
    ├── CashModal.tsx
    ├── CardPaymentFlow.tsx
    └── ReceiptModal.tsx
```

### ProductGrid.tsx

- Search bar (instant filter by name/SKU)
- Category tabs (if products have categories, else skip)
- Product cards in grid (name, price, click to add)
- "Custom Item" button → opens modal for manual entry

### Cart.tsx

- List of line items (product name, qty, line total)
- Quantity controls: [-] [qty] [+] [×] (remove)
- Subtotal (net)
- VAT breakdown by rate (25%: €XX, 13%: €XX)
- Total (bold, large)

### PaymentBar.tsx

- [Cash] button → opens cash drawer modal
- [Card] button → triggers Stripe Terminal flow
- Total display (large, always visible)
- [Clear] button → reset cart

### CashModal.tsx

- Shows total due
- Input for amount received
- Calculates change
- [Complete Sale] → calls processPosSale({ paymentMethod: 'CASH' })

### ReceiptModal.tsx

- ✅ Success checkmark
- Invoice number
- JIR code (or "Pending" if queued)
- ZKI code
- Total amount
- [Print Receipt] → opens PDF in new tab
- [Email Receipt] → sends to buyer (if buyerId provided)
- [New Sale] → clears and returns to POS

---

## Fiscalization

### POS Fiscalization Flow

```typescript
// src/lib/fiscal/pos-fiscalize.ts

async function fiscalizePosSale(invoice: EInvoice): Promise<{
  success: boolean
  jir?: string
  zki: string
  error?: string
}> {
  // 1. Calculate ZKI (always - using existing zki.ts)
  const zki = calculateZKI({
    oib: company.oib,
    dateTime: invoice.issueDate,
    invoiceNumber: invoice.invoiceNumber,
    premisesCode: company.premisesCode,
    deviceCode: company.deviceCode,
    amount: invoice.totalAmount,
  })

  // 2. Check if real fiscalization enabled
  if (!company.fiscalEnabled || !hasActiveCertificate(company)) {
    // Mock mode - return demo JIR
    return {
      success: true,
      jir: `DEMO-${Date.now()}`,
      zki,
    }
  }

  // 3. Real fiscalization via FINA
  try {
    const result = await submitToFINA(invoice, zki)
    return { success: true, jir: result.jir, zki }
  } catch (error) {
    // Queue for retry, but don't block sale
    await queueFiscalRetry(invoice.id)
    return {
      success: true, // Sale succeeds
      zki,
      error: "Fiscalization queued for retry",
    }
  }
}
```

### Invoice Status Flow

```
DRAFT → (POS skips this)
PENDING_FISCALIZATION → (created in processPosSale)
FISCALIZED → (after JIR received)
ERROR → (if fiscalization fails, queued for retry)
```

---

## QR Code Payment

### Croatian HUB-3 Standard

```typescript
// src/lib/barcode/payment-qr.ts
async function generatePaymentQR(invoice: EInvoice): Promise<string>
```

**QR Content:**

```
HRVHUB30
EUR
{amount}
{buyerName}
{buyerAddress}
{buyerCity}
{sellerName}
{sellerAddress}
{sellerCity}
{sellerIBAN}
HR00
{invoiceNumber}
{description}
```

Returns data URL for QR image, passed to InvoicePDFDocument.

---

## Error Handling

### Payment Failures

- Card declined / Terminal error → Show error, offer [Retry Card] or [Switch to Cash]
- Terminal disconnected → Show "Reader offline", disable Card button
- Invoice NOT created until payment succeeds

### Fiscalization Failures

- FINA timeout / error → Sale COMPLETES (legal requirement)
- Invoice saved with status: PENDING_FISCALIZATION
- Background job retries every 5 minutes (max 48 hours)
- Admin notification if retries exhausted

### Network/Offline

- MVP requires network connection
- Show offline banner if disconnected
- Disable all payment buttons
- Future: offline queue with sync

### Invoice Number Collision

- getNextInvoiceNumber() uses database sequence
- Wrapped in transaction with row-level lock
- Format: {year}-{premises}-{device}-{sequence}
- Example: 2025-1-1-00001

---

## Implementation Tasks

### Phase 1: Core Infrastructure

1. Database schema updates (Terminal fields)
2. `processPosSale` server action
3. `fiscalizePosSale` function (with mock fallback)
4. QR code generation utility

### Phase 2: Stripe Terminal

5. Terminal backend functions (connection token, payment intent)
6. Terminal webhook handlers
7. Reader management in settings

### Phase 3: UI

8. POS layout and route
9. ProductGrid component
10. Cart component
11. PaymentBar component
12. CashModal component
13. CardPaymentFlow component
14. ReceiptModal component

### Phase 4: Polish

15. Error handling and edge cases
16. Loading states and animations
17. Keyboard shortcuts (for speed)
18. Testing with Stripe test mode

---

## Dependencies

**Existing (no changes):**

- `@react-pdf/renderer` - PDF generation
- `qrcode` - QR code generation
- `stripe` - Stripe API
- `node-forge` - ZKI calculation

**New:**

- `@stripe/terminal-js` - Stripe Terminal SDK (frontend)

---

## Open Questions (Future)

1. **Offline mode** - Queue sales locally when network down?
2. **Thermal printing** - Add 80mm receipt support later?
3. **Barcode scanner** - USB scanner for product lookup?
4. **Multi-device** - Multiple POS terminals per company?

These are out of scope for MVP.
