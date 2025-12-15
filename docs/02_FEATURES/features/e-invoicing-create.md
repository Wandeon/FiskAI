# Feature: Create E-Invoice (F023)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 31

## Purpose

The Create E-Invoice feature enables users to generate compliant electronic invoices following the UBL 2.1 and PEPPOL BIS Billing 3.0 standards (EN 16931). The feature includes a multi-step wizard with autosave, real-time validation, automatic invoice numbering, UBL XML generation, and integration with Croatian fiscalization requirements. It forms the core of the e-invoicing workflow in FiskAI, enabling businesses to create, validate, and transmit legally compliant electronic invoices.

## User Entry Points

| Type   | Path            | Evidence                                          |
| ------ | --------------- | ------------------------------------------------- |
| Page   | /e-invoices/new | `src/app/(dashboard)/e-invoices/new/page.tsx:11`  |
| Button | E-Invoices List | `src/app/(dashboard)/e-invoices/page.tsx:165-167` |
| Action | createEInvoice  | `src/app/actions/e-invoice.ts:16`                 |

## Core Flow

1. User navigates to /e-invoices/new → `src/app/(dashboard)/e-invoices/new/page.tsx:11`
2. System validates user authentication → `src/app/(dashboard)/e-invoices/new/page.tsx:12-16`
3. System retrieves company information → `src/app/(dashboard)/e-invoices/new/page.tsx:18`
4. System loads contacts, products, and next invoice number in parallel → `src/app/(dashboard)/e-invoices/new/page.tsx:19-23`
5. System derives company capabilities and field visibility → `src/app/(dashboard)/e-invoices/new/page.tsx:25`
6. System renders multi-step InvoiceForm with preloaded data → `src/app/(dashboard)/e-invoices/new/page.tsx:38-46`
7. **Step 1: Buyer Information** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:298-400`
   - User selects buyer from contact dropdown → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:309-316`
   - System auto-populates issue date and due date → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:85-87`
   - System displays sequential invoice number (read-only) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:355-362`
   - User optionally adds buyer reference and IBAN for QR code → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:366-384`
8. **Step 2: Line Items** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:403-439`
   - User adds line items manually or from product catalog → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:410-417`
   - System validates each line with real-time calculation → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:220-226`
   - System allows add/remove lines (minimum 1 required) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:418-435`
9. **Step 3: Review & Preview** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:442-474`
   - System displays PDF preview of invoice → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:458-466`
   - User can download PDF preview → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:228-249`
10. **Autosave Throughout** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:164-170`
    - System saves draft to localStorage every 1 second → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:165-168`
    - System restores draft on page reload → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:122-146`
11. User submits form from review step → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:192-212`
12. System validates subscription limits → `src/app/actions/e-invoice.ts:20-33`
13. System validates form data with zod schema → `src/app/actions/e-invoice.ts:35-39`
14. System verifies buyer belongs to company → `src/app/actions/e-invoice.ts:43-51`
15. System generates sequential invoice number → `src/app/actions/e-invoice.ts:53-61`
16. System calculates line totals with Decimal precision → `src/app/actions/e-invoice.ts:63-95`
17. System creates EInvoice with nested lines in transaction → `src/app/actions/e-invoice.ts:97-122`
18. System clears localStorage draft → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:205`
19. System tracks analytics event → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:206-209`
20. User redirected to /e-invoices with success notification → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:210-211`

## Key Modules

| Module                    | Purpose                                             | Location                                              |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| NewEInvoicePage           | Server component for e-invoice creation page        | `src/app/(dashboard)/e-invoices/new/page.tsx`         |
| InvoiceForm               | Multi-step wizard with autosave and validation      | `src/app/(dashboard)/e-invoices/new/invoice-form.tsx` |
| createEInvoice            | Server action for e-invoice creation                | `src/app/actions/e-invoice.ts:16-127`                 |
| eInvoiceSchema            | Zod validation schema for e-invoices                | `src/lib/validations/e-invoice.ts:12-22`              |
| generateUBLInvoice        | UBL 2.1 XML generator (PEPPOL compliant)            | `src/lib/e-invoice/ubl-generator.ts:97-190`           |
| validateEN16931Compliance | EN 16931 compliance validation                      | `src/lib/compliance/en16931-validator.ts:26-165`      |
| previewNextInvoiceNumber  | Preview next sequential number without incrementing | `src/lib/invoice-numbering.ts:132-184`                |
| InvoiceSummary            | Real-time sidebar summary with totals               | `src/components/invoice/invoice-summary.tsx:20-134`   |
| LineItemTable             | Dynamic line items table with product suggestions   | `src/components/invoice/line-item-table.tsx`          |
| InvoicePdfPreview         | Client-side PDF preview component                   | `src/components/invoice/invoice-pdf-preview.tsx`      |
| StepIndicator             | Multi-step wizard navigation                        | `src/components/invoice/invoice-step-indicator.tsx`   |

## Multi-Step Wizard Features

### Step 1: Buyer Information

- **Buyer Selection** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:306-320`
  - Combobox with search functionality → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:309-316`
  - Displays contact name and OIB → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:217`
  - Required field validation → `src/lib/validations/e-invoice.ts:13`

- **Date Fields** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:322-349`
  - Issue Date (defaults to today) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:85`
  - Due Date (auto-calculated from payment terms) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:86-87`
  - Auto-adjustment based on buyer's payment terms → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:155-162`

- **Invoice Number** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:351-363`
  - Read-only field with auto-generated number → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:356-357`
  - Croatian format preview (e.g., "2025/43-1-1") → `src/lib/invoice-numbering.ts:132-184`

- **Optional Fields** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:365-396`
  - Buyer Reference (purchase order number) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:366-370`
  - IBAN for QR code (defaults to company IBAN) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:372-384`
  - Include QR code checkbox → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:386-396`

### Step 2: Line Items

- **Dynamic Line Items Table** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:410-417`
  - Initial line with default values → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:91-100`
  - Add line button → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:418-435`
  - Remove line (minimum 1 required) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:414`
  - Product suggestions from catalog → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:416`

- **Line Item Fields** → `src/lib/validations/e-invoice.ts:3-10`
  - Description (text, required) → `src/lib/validations/e-invoice.ts:4`
  - Quantity (positive number) → `src/lib/validations/e-invoice.ts:5`
  - Unit (UN/CEFACT code, default C62) → `src/lib/validations/e-invoice.ts:6`
  - Unit Price (non-negative) → `src/lib/validations/e-invoice.ts:7`
  - VAT Rate (0-100%, default 25%) → `src/lib/validations/e-invoice.ts:8`
  - VAT Category (S/AA/E/Z/O, default S) → `src/lib/validations/e-invoice.ts:9`

- **Real-Time Totals** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:220-226`
  - Recalculated on every field change
  - Displayed in sidebar summary → `src/components/invoice/invoice-summary.tsx:28-39`

### Step 3: Review & Preview

- **PDF Preview** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:458-466`
  - Full invoice preview with company and buyer details
  - Line items table with calculations
  - QR code for payment (if enabled)

- **Download PDF** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:228-249`
  - Opens preview in new window for printing
  - Client-side rendering without server call

- **Final Validation** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:192-203`
  - All required fields present
  - At least one line item
  - Valid IBAN format (if provided) → `src/lib/validations/e-invoice.ts:19`

### Step Navigation

- **Progress Indicator** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:266-287`
  - Shows current step (Kupac → Stavke → Pregled)
  - Clickable to jump between steps → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:270`
  - Contextual helper text → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:273-279`

- **Navigation Buttons** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:477-510`
  - Previous button (disabled on first step) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:478-486`
  - Next button (with validation) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:172-184`
  - Submit button (final step only) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:495-507`

- **Mobile Sticky Controls** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:527-560`
  - Fixed bottom navigation on mobile
  - Responsive layout for small screens

### Autosave Features

- **Draft Persistence** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:164-170`
  - Saves to localStorage every 1 second → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:165`
  - Key: 'einvoice-draft' → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:123`
  - Timestamp displayed to user → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:280-285`

- **Draft Restoration** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:122-146`
  - Loads draft on component mount
  - Preserves all form fields including line items
  - Handles date field conversion → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:128-132`

- **Draft Cleanup** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:205`
  - Removed after successful submission
  - User can manually clear by navigating away

## UBL/PEPPOL E-Invoice Format

### UBL 2.1 Generation

- **Standard Compliance** → `src/lib/e-invoice/ubl-generator.ts:4-12`
  - UBL namespace: `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2` → `src/lib/e-invoice/ubl-generator.ts:5`
  - Customization ID: `urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0` → `src/lib/e-invoice/ubl-generator.ts:10-11`
  - Profile ID: `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0` → `src/lib/e-invoice/ubl-generator.ts:12`

- **Invoice Header** → `src/lib/e-invoice/ubl-generator.ts:131-142`
  - Invoice number → `src/lib/e-invoice/ubl-generator.ts:137`
  - Issue date and due date → `src/lib/e-invoice/ubl-generator.ts:138-139`
  - Invoice type code: 380 (commercial invoice) → `src/lib/e-invoice/ubl-generator.ts:140`
  - Currency code → `src/lib/e-invoice/ubl-generator.ts:141`
  - Buyer reference → `src/lib/e-invoice/ubl-generator.ts:142`

- **Party Information** → `src/lib/e-invoice/ubl-generator.ts:31-73`
  - Supplier and customer party blocks → `src/lib/e-invoice/ubl-generator.ts:144-145`
  - OIB as endpoint ID (scheme 0191) → `src/lib/e-invoice/ubl-generator.ts:41`
  - Postal address (street, city, postal code, country) → `src/lib/e-invoice/ubl-generator.ts:48-54`
  - VAT number with tax scheme → `src/lib/e-invoice/ubl-generator.ts:57-64`
  - Legal entity registration → `src/lib/e-invoice/ubl-generator.ts:67-70`

- **Payment Information** → `src/lib/e-invoice/ubl-generator.ts:147-157`
  - Payment means code: 30 (bank transfer) → `src/lib/e-invoice/ubl-generator.ts:151`
  - Payee financial account (IBAN) → `src/lib/e-invoice/ubl-generator.ts:152-154`

- **Tax Totals** → `src/lib/e-invoice/ubl-generator.ts:104-129`
  - Groups lines by VAT rate → `src/lib/e-invoice/ubl-generator.ts:105-129`
  - Tax subtotals with category, rate, and amounts → `src/lib/e-invoice/ubl-generator.ts:164-174`
  - Total VAT amount → `src/lib/e-invoice/ubl-generator.ts:160`

- **Monetary Totals** → `src/lib/e-invoice/ubl-generator.ts:179-184`
  - Line extension amount (net) → `src/lib/e-invoice/ubl-generator.ts:180`
  - Tax exclusive amount → `src/lib/e-invoice/ubl-generator.ts:181`
  - Tax inclusive amount → `src/lib/e-invoice/ubl-generator.ts:182`
  - Payable amount → `src/lib/e-invoice/ubl-generator.ts:183`

- **Invoice Lines** → `src/lib/e-invoice/ubl-generator.ts:75-95`
  - Line ID (sequence number) → `src/lib/e-invoice/ubl-generator.ts:78`
  - Invoiced quantity with unit code → `src/lib/e-invoice/ubl-generator.ts:79`
  - Line extension amount → `src/lib/e-invoice/ubl-generator.ts:80`
  - Item description → `src/lib/e-invoice/ubl-generator.ts:82`
  - Tax category with percent and scheme → `src/lib/e-invoice/ubl-generator.ts:83-88`
  - Unit price → `src/lib/e-invoice/ubl-generator.ts:91-93`

### XML Utilities

- **XML Escaping** → `src/lib/e-invoice/ubl-generator.ts:14-21`
  - Escapes special characters (&, <, >, ", ')
  - Prevents XML injection attacks

- **Date Formatting** → `src/lib/e-invoice/ubl-generator.ts:23-25`
  - ISO 8601 format (YYYY-MM-DD)

- **Decimal Formatting** → `src/lib/e-invoice/ubl-generator.ts:27-29`
  - Fixed decimal places (default 2 for currency)
  - Handles Prisma Decimal type

## Validation & Compliance

### Client-Side Validation

1. **Form-Level Validation** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:82-83`
   - Zod resolver integration → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:83`
   - Real-time error display → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:81`

2. **Step Validation** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:172-184`
   - Step 1: Validates buyerId and issueDate → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:176`
   - Step 2: Validates all line items → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:178`
   - Step 3: Final submission validation → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:192`

3. **Input Constraints** → `src/lib/validations/e-invoice.ts:3-10`
   - Description: minimum 1 character → `src/lib/validations/e-invoice.ts:4`
   - Quantity: must be positive → `src/lib/validations/e-invoice.ts:5`
   - Unit price: non-negative → `src/lib/validations/e-invoice.ts:7`
   - VAT rate: 0-100% range → `src/lib/validations/e-invoice.ts:8`
   - IBAN: Croatian format regex → `src/lib/validations/e-invoice.ts:19`

### Server-Side Validation

1. **Authentication & Authorization** → `src/app/actions/e-invoice.ts:17-19`
   - User authentication check → `src/app/actions/e-invoice.ts:17`
   - Tenant context enforcement → `src/app/actions/e-invoice.ts:19`

2. **Subscription Limits** → `src/app/actions/e-invoice.ts:20-33`
   - Monthly invoice count check → `src/app/actions/e-invoice.ts:21`
   - Returns usage statistics if limit reached → `src/app/actions/e-invoice.ts:23-32`

3. **Schema Validation** → `src/app/actions/e-invoice.ts:35-39`
   - Zod schema validation with detailed errors → `src/app/actions/e-invoice.ts:35`
   - Flattened error structure for client display → `src/app/actions/e-invoice.ts:38`

4. **Business Rules** → `src/app/actions/e-invoice.ts:43-51`
   - Buyer must belong to company (tenant-filtered) → `src/app/actions/e-invoice.ts:44-47`
   - Buyer existence verification → `src/app/actions/e-invoice.ts:49-51`

5. **Calculation Validation** → `src/app/actions/e-invoice.ts:63-95`
   - Line totals: quantity × unit price → `src/app/actions/e-invoice.ts:70`
   - VAT amount: net × (rate / 100) → `src/app/actions/e-invoice.ts:71`
   - Aggregate totals verification → `src/app/actions/e-invoice.ts:87-95`

### EN 16931 Compliance

- **Required Fields Check** → `src/lib/compliance/en16931-validator.ts:37-56`
  - Invoice number, issue date, company ID, direction
  - At least one line item → `src/lib/compliance/en16931-validator.ts:88-91`
  - Buyer information for outbound invoices → `src/lib/compliance/en16931-validator.ts:141-144`

- **Data Type Validation** → `src/lib/compliance/en16931-validator.ts:58-72`
  - Non-negative amounts (net, VAT, total)
  - Quantity must be positive → `src/lib/compliance/en16931-validator.ts:98-101`
  - VAT rate within 0-100% → `src/lib/compliance/en16931-validator.ts:108-111`

- **Business Rules** → `src/lib/compliance/en16931-validator.ts:74-85`
  - Total = Net + VAT (with rounding tolerance) → `src/lib/compliance/en16931-validator.ts:78-84`
  - Line net amount = quantity × unit price → `src/lib/compliance/en16931-validator.ts:114-124`

- **Croatian-Specific Validation** → `src/lib/compliance/en16931-validator.ts:170-213`
  - JIR format (UUID) → `src/lib/compliance/en16931-validator.ts:176-179`
  - ZKI length (32 characters) → `src/lib/compliance/en16931-validator.ts:181-183`
  - OIB format (11 digits) → `src/lib/compliance/en16931-validator.ts:185-192`
  - Fiscalized invoice requirements → `src/lib/compliance/en16931-validator.ts:194-202`

## Server-Side Processing

### Invoice Number Generation

- **Sequential Numbering** → `src/app/actions/e-invoice.ts:53-61`
  - Uses Croatian fiscalization format
  - Format: `{year}/{broj}-{premises}-{device}` → `src/lib/invoice-numbering.ts:132-184`
  - Auto-increments per year and premises
  - Preview mode doesn't increment counter → `src/lib/invoice-numbering.ts:132`

- **Preview on Page Load** → `src/app/(dashboard)/e-invoices/new/page.tsx:22`
  - Shows next number without reservation
  - Actual number generated on submission → `src/app/actions/e-invoice.ts:58-60`

### Line Items Calculation

- **Decimal Precision** → `src/app/actions/e-invoice.ts:64-84`
  - Uses Prisma Decimal type → `src/app/actions/e-invoice.ts:14`
  - Per-line calculations:
    - Quantity and unit price to Decimal → `src/app/actions/e-invoice.ts:66-68`
    - Net amount = quantity × unit price → `src/app/actions/e-invoice.ts:70`
    - VAT amount = net × (rate / 100) → `src/app/actions/e-invoice.ts:71`
  - Line number assignment (1-indexed) → `src/app/actions/e-invoice.ts:74`
  - Default VAT category 'S' (Standard) → `src/app/actions/e-invoice.ts:81`

- **Aggregate Totals** → `src/app/actions/e-invoice.ts:87-95`
  - Net amount: sum of all line net amounts → `src/app/actions/e-invoice.ts:87-90`
  - VAT amount: sum of all line VAT amounts → `src/app/actions/e-invoice.ts:91-94`
  - Total amount: net + VAT → `src/app/actions/e-invoice.ts:95`

### Database Transaction

- **Nested Create** → `src/app/actions/e-invoice.ts:97-122`
  - Creates EInvoice with embedded lines in one transaction
  - Direction: OUTBOUND → `src/app/actions/e-invoice.ts:99`
  - Buyer ID link → `src/app/actions/e-invoice.ts:100`
  - Invoice number assignment → `src/app/actions/e-invoice.ts:101`
  - Issue and due dates → `src/app/actions/e-invoice.ts:102-103`
  - Currency (defaults to EUR) → `src/app/actions/e-invoice.ts:104`
  - Buyer reference and bank account → `src/app/actions/e-invoice.ts:105-106`
  - QR code inclusion flag → `src/app/actions/e-invoice.ts:107`
  - Calculated totals → `src/app/actions/e-invoice.ts:108-110`
  - Default status: DRAFT → `src/app/actions/e-invoice.ts:111`
  - Line items creation → `src/app/actions/e-invoice.ts:112-114`

- **Relation Loading** → `src/app/actions/e-invoice.ts:116-121`
  - Includes lines, buyer, seller, company for downstream processing

### Post-Creation Actions

- **Cache Revalidation** → `src/app/actions/e-invoice.ts:124`
  - Revalidates /e-invoices list page
  - Ensures fresh data on redirect

- **Success Response** → `src/app/actions/e-invoice.ts:125`
  - Returns created invoice with all relations
  - Client receives data for confirmation

## Data

### Database Tables

- **EInvoice** → `prisma/schema.prisma:191-259`
  - Primary e-invoice record with financial totals
  - Key fields:
    - id: Unique identifier (cuid) → `prisma/schema.prisma:192`
    - companyId: Tenant isolation → `prisma/schema.prisma:193`
    - direction: OUTBOUND/INBOUND → `prisma/schema.prisma:194`
    - buyerId: Foreign key to Contact → `prisma/schema.prisma:196`
    - invoiceNumber: "43-1-1" format → `prisma/schema.prisma:197`
    - internalReference: "2025/43-1-1" format → `prisma/schema.prisma:229`
    - issueDate, dueDate: DateTime → `prisma/schema.prisma:198-199`
    - currency: Default EUR → `prisma/schema.prisma:200`
    - netAmount, vatAmount, totalAmount: Decimal(10,2) → `prisma/schema.prisma:202-204`
    - status: Default DRAFT → `prisma/schema.prisma:205`
    - bankAccount: IBAN for QR code → `prisma/schema.prisma:233`
    - includeBarcode: Boolean flag → `prisma/schema.prisma:234`
    - ublXml: Generated UBL XML → `prisma/schema.prisma:211`
    - jir, zki: Fiscalization codes → `prisma/schema.prisma:206-207`

- **EInvoiceLine** → `prisma/schema.prisma:261-276`
  - Individual line items within invoice
  - Key fields:
    - eInvoiceId: Parent invoice → `prisma/schema.prisma:263`
    - lineNumber: Sequential position → `prisma/schema.prisma:264`
    - description: Item description → `prisma/schema.prisma:265`
    - quantity: Decimal(10,3) → `prisma/schema.prisma:266`
    - unit: UN/CEFACT code → `prisma/schema.prisma:267`
    - unitPrice: Decimal(10,2) → `prisma/schema.prisma:268`
    - netAmount: Calculated line total → `prisma/schema.prisma:269`
    - vatRate: Decimal(5,2) → `prisma/schema.prisma:270`
    - vatCategory: Default 'S' → `prisma/schema.prisma:271`
    - vatAmount: Calculated VAT → `prisma/schema.prisma:272`

- **Contact** → `src/app/(dashboard)/e-invoices/new/page.tsx:20`
  - Buyer/customer information
  - Used in buyer selection dropdown
  - Filter: type=CUSTOMER
  - Displays name and OIB

- **Product** → `src/app/(dashboard)/e-invoices/new/page.tsx:21`
  - Product catalog for quick-add
  - Fields: name, price, VAT rate, unit
  - Converted to plain objects for client → `src/app/(dashboard)/e-invoices/new/page.tsx:27-36`

- **Company** → `src/app/(dashboard)/e-invoices/new/page.tsx:18`
  - Current company information
  - IBAN for default bank account
  - Capabilities and feature flags

### Data Flow

1. **Page Load** → `src/app/(dashboard)/e-invoices/new/page.tsx:19-23`
   - Fetch contacts with type=CUSTOMER filter
   - Fetch active products
   - Preview next invoice number (no increment)
   - Load in parallel for performance

2. **Form State Management** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:74-102`
   - React Hook Form for form state
   - useFieldArray for dynamic line items → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:104-107`
   - Watched values for real-time updates → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:109`

3. **Form Submission** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:192-212`
   - Collect all form fields
   - Call createEInvoice server action → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:196`
   - Handle success/error responses → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:198-212`

4. **Server Processing** → `src/app/actions/e-invoice.ts:16-127`
   - Validate and calculate
   - Generate invoice number
   - Create database records
   - Return success with data

## Capabilities & Field Visibility

### Capability-Based Features

- **VAT Fields Visibility** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:71`
  - Derived from company capabilities → `src/lib/field-visibility.ts:8-13`
  - VAT payer companies see VAT rate fields
  - Non-VAT companies default to 0% VAT → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:97`

- **Module Access** → `src/app/(dashboard)/e-invoices/page.tsx:56-59`
  - eInvoicing module must be enabled
  - Redirects to settings if disabled
  - Plan-based feature gating

### Payment Terms Integration

- **Automatic Due Date** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:111`
  - Reads buyer's payment terms (days) → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:111`
  - Default: 15 days → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:55`
  - Auto-adjusts when buyer changes → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:155-162`
  - User can override by manual edit → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:338-348`

## Integrations

### Billing & Subscription

- **Limit Enforcement** → `src/app/actions/e-invoice.ts:20-33`
  - Checks monthly invoice limit before creation
  - Returns usage statistics if limit reached
  - Prevents creation if over limit

### Fiscalization (Optional)

- **Fiscalization Decision** → `src/app/actions/e-invoice.ts:198-215`
  - Evaluated after invoice is sent (not during creation)
  - Based on payment method (CASH/CARD require fiscalization)
  - Queued as background job if needed
  - Does not block invoice creation

### Provider Integration

- **E-Invoice Providers** → `src/lib/e-invoice/provider.ts:29-45`
  - Mock provider for testing → `src/lib/e-invoice/provider.ts:34-37`
  - IE Računi (planned) → `src/lib/e-invoice/provider.ts:38-39`
  - Fina (planned) → `src/lib/e-invoice/provider.ts:40-41`
  - Provider selected at send time, not creation

### Analytics Tracking

- **Event Tracking** → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:206-209`
  - Tracks INVOICE_CREATED event
  - Metadata: line count, has product description
  - Used for usage analytics and insights

## Security Features

### Authentication & Tenant Isolation

- **Multi-Layer Security** → `src/app/actions/e-invoice.ts:17-19`
  - requireAuth() validates user session
  - requireCompanyWithContext() enforces tenant scope
  - All database queries auto-filtered by companyId
  - Buyer verification ensures cross-tenant data access prevention → `src/app/actions/e-invoice.ts:44-47`

### Input Sanitization

- **XML Escaping** → `src/lib/e-invoice/ubl-generator.ts:14-21`
  - Escapes all user input in UBL XML
  - Prevents XML injection attacks
  - Handles special characters (&, <, >, ", ')

### IBAN Validation

- **Croatian IBAN Format** → `src/lib/validations/e-invoice.ts:19`
  - Regex: `^HR\d{2}\d{17}$`
  - Validates 21-character Croatian IBAN
  - Optional field (can be empty string)

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/(dashboard)/e-invoices/new/page.tsx:12-16`
  - [[company-management]] - Company must exist → `src/app/(dashboard)/e-invoices/new/page.tsx:18`
  - [[contacts]] - Buyer selection requires contacts → `src/app/(dashboard)/e-invoices/new/page.tsx:20`
  - [[products]] - Optional product catalog → `src/app/(dashboard)/e-invoices/new/page.tsx:21`
  - [[business-premises]] - Invoice numbering requires premises → `src/lib/invoice-numbering.ts:139-154`
  - [[billing-subscription]] - Enforces plan limits → `src/app/actions/e-invoice.ts:20-33`

- **Depended by**:
  - [[e-invoices-list]] - Redirects to list on success → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:211`
  - [[e-invoice-send]] - Created invoices can be sent → `src/app/actions/e-invoice.ts:129-220`
  - [[e-invoice-fiscalize]] - Invoices can be fiscalized → `src/app/actions/e-invoice.ts:198-215`
  - [[invoice-pdf]] - PDF generation for preview/download

## Verification Checklist

- [ ] User can access /e-invoices/new with authentication
- [ ] Multi-step wizard displays 3 steps (Buyer → Items → Review)
- [ ] Buyer dropdown populates from contacts
- [ ] Invoice number preview displays correctly
- [ ] Issue date defaults to today
- [ ] Due date auto-calculates from buyer payment terms
- [ ] Due date can be manually overridden
- [ ] IBAN field validates Croatian format
- [ ] Line items can be added (with minimum 1 enforced)
- [ ] Line items can be removed (keeping minimum 1)
- [ ] Product suggestions populate from catalog
- [ ] Real-time totals calculate correctly (net, VAT, total)
- [ ] Sidebar summary updates on field changes
- [ ] PDF preview displays on review step
- [ ] PDF can be downloaded for printing
- [ ] Step validation prevents advancing with errors
- [ ] Autosave persists draft every 1 second
- [ ] Draft restores on page reload
- [ ] Draft clears after successful submission
- [ ] Subscription limit checked before creation
- [ ] Invoice number generated sequentially on submit
- [ ] Line totals calculated with Decimal precision
- [ ] Invoice and lines created in single transaction
- [ ] User redirected to /e-invoices on success
- [ ] Success toast notification displayed
- [ ] Analytics event tracked
- [ ] Tenant isolation prevents cross-company access
- [ ] VAT fields shown/hidden based on capabilities
- [ ] EN 16931 compliance validation passes
- [ ] UBL XML generation succeeds
- [ ] Mobile sticky controls functional
- [ ] Error messages clear and actionable

## Evidence Links

1. Entry point page → `src/app/(dashboard)/e-invoices/new/page.tsx:11`
2. Multi-step invoice form → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:64`
3. Server action for creation → `src/app/actions/e-invoice.ts:16`
4. E-invoice validation schema → `src/lib/validations/e-invoice.ts:12`
5. UBL XML generator → `src/lib/e-invoice/ubl-generator.ts:97`
6. EN 16931 compliance validator → `src/lib/compliance/en16931-validator.ts:26`
7. Invoice number preview → `src/lib/invoice-numbering.ts:132`
8. Subscription limit check → `src/app/actions/e-invoice.ts:21`
9. EInvoice schema definition → `prisma/schema.prisma:191`
10. EInvoiceLine schema definition → `prisma/schema.prisma:261`
11. Step indicator component → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:49`
12. Autosave logic → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:164`
13. Draft restoration → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:122`
14. Line items calculation → `src/app/actions/e-invoice.ts:63`
15. Database transaction → `src/app/actions/e-invoice.ts:97`
16. Buyer verification → `src/app/actions/e-invoice.ts:43`
17. Field visibility logic → `src/lib/field-visibility.ts:8`
18. Capabilities derivation → `src/lib/capabilities.ts:28`
19. Invoice summary sidebar → `src/components/invoice/invoice-summary.tsx:20`
20. PDF preview component → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:228`
21. Step validation → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:172`
22. Mobile sticky controls → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:527`
23. Payment terms integration → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:155`
24. UBL namespaces → `src/lib/e-invoice/ubl-generator.ts:4`
25. PEPPOL customization → `src/lib/e-invoice/ubl-generator.ts:10`
26. Party XML generation → `src/lib/e-invoice/ubl-generator.ts:31`
27. Tax totals grouping → `src/lib/e-invoice/ubl-generator.ts:104`
28. XML escaping → `src/lib/e-invoice/ubl-generator.ts:14`
29. Analytics tracking → `src/app/(dashboard)/e-invoices/new/invoice-form.tsx:206`
30. E-invoices list page → `src/app/(dashboard)/e-invoices/page.tsx:53`
31. Cache revalidation → `src/app/actions/e-invoice.ts:124`
