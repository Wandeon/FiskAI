# Feature: E-Invoice Compliance Check (F028)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 15

## Purpose

The E-Invoice Compliance Check feature validates invoices against the EN 16931 European standard and Croatian-specific fiscalization requirements. It performs comprehensive validation including required fields verification, data type checking, business rule validation, and calculation accuracy, ensuring invoices meet legal requirements before fiscalization or transmission to trading partners.

## User Entry Points

| Type     | Path                       | Evidence                                      |
| -------- | -------------------------- | --------------------------------------------- |
| API POST | /api/compliance/en16931    | `src/app/api/compliance/en16931/route.ts:15`  |
| API GET  | /api/compliance/en16931    | `src/app/api/compliance/en16931/route.ts:87`  |
| Function | validateEN16931Compliance  | `src/lib/compliance/en16931-validator.ts:26`  |
| Function | validateCroatianCompliance | `src/lib/compliance/en16931-validator.ts:170` |
| Function | getComplianceSummary       | `src/lib/compliance/en16931-validator.ts:218` |

## Core Flow

### Single Invoice Validation (POST)

1. User submits POST request with invoiceId → `src/app/api/compliance/en16931/route.ts:15`
2. System validates user authentication via requireAuth() → `src/app/api/compliance/en16931/route.ts:17`
3. System retrieves company context via requireCompany() → `src/app/api/compliance/en16931/route.ts:18`
4. System validates request schema using Zod → `src/app/api/compliance/en16931/route.ts:21-28`
5. System fetches invoice with relations (lines, buyer, seller) → `src/app/api/compliance/en16931/route.ts:33-43`
6. System enforces tenant isolation (companyId filter) → `src/app/api/compliance/en16931/route.ts:36`
7. System performs compliance checks via getComplianceSummary() → `src/app/api/compliance/en16931/route.ts:53`
8. System logs compliance result with structured data → `src/app/api/compliance/en16931/route.ts:55-63`
9. System returns JSON response with compliance status and details → `src/app/api/compliance/en16931/route.ts:65-74`

### Bulk Invoice Validation (GET)

1. User submits GET request with optional status filter → `src/app/api/compliance/en16931/route.ts:87`
2. System authenticates and retrieves company context → `src/app/api/compliance/en16931/route.ts:89-90`
3. System parses query parameters (status, limit, offset) → `src/app/api/compliance/en16931/route.ts:92-95`
4. System fetches invoices with pagination (max 1000) → `src/app/api/compliance/en16931/route.ts:106-115`
5. System validates each invoice and collects results → `src/app/api/compliance/en16931/route.ts:117-131`
6. System calculates aggregate compliance statistics → `src/app/api/compliance/en16931/route.ts:134-136`
7. System logs bulk validation summary → `src/app/api/compliance/en16931/route.ts:138-145`
8. System returns results with statistics and pagination → `src/app/api/compliance/en16931/route.ts:147-162`

## Key Modules

| Module                     | Purpose                                     | Location                                      |
| -------------------------- | ------------------------------------------- | --------------------------------------------- |
| EN16931ComplianceRoute     | API endpoint for compliance validation      | `src/app/api/compliance/en16931/route.ts`     |
| validateEN16931Compliance  | Core EN 16931 validation logic              | `src/lib/compliance/en16931-validator.ts:26`  |
| validateCroatianCompliance | Croatian-specific validation rules          | `src/lib/compliance/en16931-validator.ts:170` |
| getComplianceSummary       | Aggregates EN 16931 and Croatian compliance | `src/lib/compliance/en16931-validator.ts:218` |
| UBL Generator              | Generates EN 16931 compliant UBL 2.1 XML    | `src/lib/e-invoice/ubl-generator.ts:97`       |
| Sandbox Testing            | Integration with sandbox e-invoice testing  | `src/app/api/sandbox/e-invoice/route.ts:10`   |

## Validation Rules

### EN 16931 Core Validation

#### Required Fields Validation

- **Invoice Number** → `src/lib/compliance/en16931-validator.ts:38-41`
  - Must be present and non-empty
  - Error: "Invoice number is required"

- **Issue Date** → `src/lib/compliance/en16931-validator.ts:43-46`
  - Must be present
  - Error: "Issue date is required"

- **Company ID** → `src/lib/compliance/en16931-validator.ts:48-51`
  - Must be present for tenant isolation
  - Error: "Company ID is required"

- **Invoice Direction** → `src/lib/compliance/en16931-validator.ts:53-56`
  - Must be INBOUND or OUTBOUND
  - Error: "Invoice direction (INBOUND/OUTBOUND) is required"

- **Buyer Information** → `src/lib/compliance/en16931-validator.ts:141-144`
  - Required for OUTBOUND invoices
  - Buyer name must be present
  - Error: "Buyer information is required for outbound invoices"

- **Invoice Lines** → `src/lib/compliance/en16931-validator.ts:88-91`
  - At least one line item required
  - Error: "Invoice must have at least one line item"

#### Data Type Validation

- **Amount Fields** → `src/lib/compliance/en16931-validator.ts:59-72`
  - Net amount must be non-negative
  - VAT amount must be non-negative
  - Total amount must be non-negative
  - Error: "[Field] amount cannot be negative"

- **Line Item Quantities** → `src/lib/compliance/en16931-validator.ts:98-101`
  - Quantity must be positive (> 0)
  - Error: "Line X: Quantity must be positive"

- **Line Item Prices** → `src/lib/compliance/en16931-validator.ts:103-106`
  - Unit price cannot be negative
  - Error: "Line X: Unit price cannot be negative"

- **VAT Rate Range** → `src/lib/compliance/en16931-validator.ts:108-111`
  - VAT rate must be between 0 and 100
  - Error: "Line X: VAT rate must be between 0 and 100"

#### Business Rule Validation

- **Total Amount Calculation** → `src/lib/compliance/en16931-validator.ts:75-85`
  - Total must equal net amount + VAT amount
  - Tolerance: 0.01 (rounding differences allowed)
  - Uses Decimal precision for accuracy
  - Error: "Total amount (X) doesn't match net amount + VAT (Y)"

- **Line Amount Calculation** → `src/lib/compliance/en16931-validator.ts:114-124`
  - Net amount must equal quantity × unit price
  - Tolerance: 0.01 (rounding differences allowed)
  - Error: "Line X: Net amount doesn't match quantity × unit price"

- **Due Date Logic** → `src/lib/compliance/en16931-validator.ts:129-133`
  - Due date should not be before issue date
  - Warning: "Due date is before issue date"

- **Currency Validation** → `src/lib/compliance/en16931-validator.ts:136-138`
  - Expected currencies: EUR, HRK, USD
  - Warning: "Unusual currency: X. Expected EUR for Croatia."

#### Line Item Validation

- **Description** → `src/lib/compliance/en16931-validator.ts:93-96`
  - Must be present and non-empty
  - Error: "Line X: Description is required"

- **All line items validated** → `src/lib/compliance/en16931-validator.ts:92-126`
  - Iterates through all lines
  - Each line validated independently
  - Line number reported in errors (1-indexed)

### Croatian-Specific Validation

#### Fiscalization Fields

- **JIR (Jedinstveni Identifikator Računa)** → `src/lib/compliance/en16931-validator.ts:176-179`
  - Must be UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  - Length: 36 characters with hyphens
  - Error: "JIR format doesn't match Croatian standard (should be UUID format)"

- **ZKI (Zaštitni Kod Izdavatelja)** → `src/lib/compliance/en16931-validator.ts:181-183`
  - Must be exactly 32 characters long
  - Error: "ZKI should be 32 characters long"

- **Fiscalized Invoice Requirements** → `src/lib/compliance/en16931-validator.ts:195-202`
  - Status must be "FISCALIZED"
  - JIR is required for fiscalized invoices
  - ZKI is required for fiscalized invoices
  - Errors: "JIR is required for fiscalized invoices" / "ZKI is required for fiscalized invoices"

#### OIB Validation

- **Company OIB** → `src/lib/compliance/en16931-validator.ts:186-188`
  - Must be exactly 11 digits
  - Regex pattern: /^\d{11}$/
  - Error: "Company OIB should be 11 digits"

- **Buyer OIB** → `src/lib/compliance/en16931-validator.ts:190-192`
  - Must be exactly 11 digits
  - Regex pattern: /^\d{11}$/
  - Error: "Buyer OIB should be 11 digits"

### Compliance Summary

- **Dual Validation** → `src/lib/compliance/en16931-validator.ts:225-226`
  - Runs both EN 16931 and Croatian validation
  - Returns combined results with unique errors

- **Critical Error Classification** → `src/lib/compliance/en16931-validator.ts:229-239`
  - JIR/ZKI errors
  - Required field errors
  - Currency errors
  - VAT errors
  - Amount calculation errors
  - Critical errors prevent fiscalization

- **Result Structure** → `src/lib/compliance/en16931-validator.ts:241-247`
  - en16931Compliant: boolean
  - croatianCompliant: boolean
  - errors: string[] (all unique errors)
  - warnings: string[] (all unique warnings)
  - criticalErrors: string[] (blocking errors)

## UBL Integration

### EN 16931 Compliant XML Generation

- **Customization ID** → `src/lib/e-invoice/ubl-generator.ts:10-11`
  - Value: "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0"
  - Declares EN 16931 compliance
  - PEPPOL BIS Billing 3.0 profile

- **Profile ID** → `src/lib/e-invoice/ubl-generator.ts:12`
  - Value: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"
  - PEPPOL billing profile version

- **UBL Namespaces** → `src/lib/e-invoice/ubl-generator.ts:4-8`
  - Invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  - CAC: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  - CBC: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

- **VAT Tax Subtotals** → `src/lib/e-invoice/ubl-generator.ts:104-129`
  - Groups lines by VAT rate
  - Calculates taxable amount per rate
  - Calculates tax amount per rate
  - Generates TaxSubtotal elements

## Error Handling

### Validation Error Types

- **Schema Validation** → `src/lib/compliance/en16931-validator.ts:31`
  - Checks XML/data structure validity
  - Part of compliance result details

- **Business Rules** → `src/lib/compliance/en16931-validator.ts:32`
  - Validates calculation logic
  - Ensures arithmetic correctness

- **Required Fields** → `src/lib/compliance/en16931-validator.ts:33`
  - Verifies mandatory data presence
  - EN 16931 required elements

- **Data Types** → `src/lib/compliance/en16931-validator.ts:34`
  - Validates data format and ranges
  - Type safety enforcement

### API Error Responses

- **Invalid Request Data** → `src/app/api/compliance/en16931/route.ts:24-27`
  - Status: 400
  - Returns Zod validation errors
  - Response: { error, details }

- **Invoice Not Found** → `src/app/api/compliance/en16931/route.ts:46-49`
  - Status: 404
  - Tenant-filtered query (automatic security)
  - Response: { error: "Invoice not found" }

- **Server Error** → `src/app/api/compliance/en16931/route.ts:76-82`
  - Status: 500
  - Logs error with context
  - Response: { error: "Failed to perform compliance check" }

### Structured Logging

- **Single Validation Log** → `src/app/api/compliance/en16931/route.ts:55-63`
  - Logs: userId, companyId, invoiceId
  - Logs: en16931Compliant, croatianCompliant
  - Logs: criticalErrorCount
  - Operation: "compliance_check"
  - Message includes invoice number

- **Bulk Validation Log** → `src/app/api/compliance/en16931/route.ts:138-145`
  - Logs: totalChecked, en16931Compliant, croatianCompliant
  - Operation: "bulk_compliance_check"
  - Message includes total count

- **Validation Result Log** → `src/lib/compliance/en16931-validator.ts:156-162`
  - Logs: invoiceId, compliant, errorCount, warningCount
  - Operation: "en16931_validation"
  - Message includes invoice number

## Data

### Database Schema

- **EInvoice Model** → `prisma/schema.prisma:191-259`
  - Primary invoice entity
  - Key fields for compliance:
    - invoiceNumber: String (required)
    - issueDate: DateTime (required)
    - netAmount: Decimal(10,2)
    - vatAmount: Decimal(10,2)
    - totalAmount: Decimal(10,2)
    - direction: OUTBOUND/INBOUND
    - jir: String? (fiscal identifier)
    - zki: String? (security code)
    - status: EInvoiceStatus (including FISCALIZED)
    - ublXml: String? (generated XML)

- **EInvoiceLine Model** → `prisma/schema.prisma:261-276`
  - Invoice line items
  - Key fields for compliance:
    - lineNumber: Int (sequential)
    - description: String (required)
    - quantity: Decimal(10,3)
    - unitPrice: Decimal(10,2)
    - netAmount: Decimal(10,2)
    - vatRate: Decimal(5,2)
    - vatCategory: String (default 'S' for standard)
    - vatAmount: Decimal(10,2)

- **Contact Model** → Referenced in buyer/seller
  - Buyer information validation
  - OIB validation (11 digits)
  - Required for OUTBOUND invoices

- **Company Model** → Referenced via companyId
  - Seller information validation
  - OIB validation (11 digits)
  - Tenant isolation

### TypeScript Interfaces

- **ComplianceResult** → `src/lib/compliance/en16931-validator.ts:7-17`

  ```typescript
  {
    compliant: boolean
    errors: string[]
    warnings: string[]
    details: {
      schemaValidation: boolean
      businessRules: boolean
      requiredFields: boolean
      dataTypes: boolean
    }
  }
  ```

- **EN16931Invoice** → `src/lib/compliance/en16931-validator.ts:19-21`
  - Extends EInvoice with lines array
  - Used throughout validation functions

## Integration Points

### Sandbox E-Invoice Testing

- **Compliance Validation** → `src/app/api/sandbox/e-invoice/route.ts:10`
  - Imports validateCroatianCompliance
  - Tests invoices before fiscalization
  - Returns compliance errors to user

- **Pre-Fiscalization Check** → `src/app/api/sandbox/e-invoice/route.ts:171`
  - Validates invoice data before sending to fiscal provider
  - Blocks fiscalization if not compliant
  - Returns detailed error messages

- **Test Flow** → `src/app/api/sandbox/e-invoice/route.ts:134-191`
  1. Creates temporary invoice object
  2. Runs validateCroatianCompliance()
  3. Returns errors if validation fails
  4. Only proceeds to fiscalization if compliant

### E-Invoice Creation Flow

- **Invoice Generation** → `src/app/actions/e-invoice.ts:16-126`
  - Creates invoice with calculated totals
  - Uses Decimal precision for amounts
  - Generates sequential invoice numbers
  - Ready for compliance validation

- **UBL XML Generation** → `src/app/actions/e-invoice.ts:152`
  - Generates EN 16931 compliant UBL
  - Uses validated invoice data
  - Includes all required elements

### Fiscal Request Queue

- **Pre-Queue Validation** (implicit requirement)
  - Invoices should be validated before queueing
  - Ensures fiscal requests will succeed
  - Reduces failed fiscalization attempts

## API Response Examples

### Single Invoice Validation Response

```json
{
  "invoiceId": "clx123abc",
  "invoiceNumber": "2025/43-1-1",
  "compliant": {
    "en16931": true,
    "croatian": false
  },
  "summary": {
    "en16931Compliant": true,
    "croatianCompliant": false,
    "errors": ["JIR is required for fiscalized invoices"],
    "warnings": [],
    "criticalErrors": ["JIR is required for fiscalized invoices"]
  },
  "timestamp": "2025-12-15T12:00:00.000Z"
}
```

### Bulk Validation Response

```json
{
  "results": [
    {
      "invoiceId": "clx123abc",
      "invoiceNumber": "2025/43-1-1",
      "issueDate": "2025-12-15T00:00:00.000Z",
      "status": "FISCALIZED",
      "compliant": {
        "en16931": true,
        "croatian": true
      },
      "errorCount": 0,
      "criticalErrorCount": 0
    }
  ],
  "statistics": {
    "totalInvoices": 100,
    "en16931Compliant": 95,
    "croatianCompliant": 90,
    "en16931ComplianceRate": 95.0,
    "croatianComplianceRate": 90.0
  },
  "pagination": {
    "limit": 100,
    "offset": 0,
    "hasMore": false
  },
  "timestamp": "2025-12-15T12:00:00.000Z"
}
```

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/api/compliance/en16931/route.ts:17`
  - [[company-management]] - Company context required → `src/app/api/compliance/en16931/route.ts:18`
  - [[invoicing-create]] - Invoices must exist to validate → API validates EInvoice records
  - [[e-invoice-ubl]] - UBL generation follows EN 16931 → `src/lib/e-invoice/ubl-generator.ts`
  - **Pino Logger** - Structured logging → `src/app/api/compliance/en16931/route.ts:9`
  - **Zod** - Request validation → `src/app/api/compliance/en16931/route.ts:5`
  - **Prisma** - Database queries → `src/app/api/compliance/en16931/route.ts:6`

- **Depended by**:
  - [[e-invoice-sending]] - Validates before sending → `src/app/api/sandbox/e-invoice/route.ts:171`
  - [[fiscalization]] - Validates before fiscalization → Sandbox testing integration
  - [[sandbox-testing]] - Integration testing → `src/app/api/sandbox/e-invoice/route.ts`
  - **Reporting/Analytics** - Compliance rate tracking → Bulk validation provides statistics

## Verification Checklist

- [ ] User can validate single invoice via POST /api/compliance/en16931
- [ ] User can validate multiple invoices via GET /api/compliance/en16931
- [ ] Authentication required for all endpoints
- [ ] Tenant isolation enforced (company-specific invoices only)
- [ ] EN 16931 required fields validated (invoice number, issue date, direction)
- [ ] Buyer information required for OUTBOUND invoices
- [ ] Line items validated (at least one required)
- [ ] Amount calculations verified (net + VAT = total)
- [ ] Line amount calculations verified (quantity × price = net)
- [ ] VAT rates validated (0-100 range)
- [ ] Negative amounts rejected
- [ ] Croatian JIR format validated (UUID format, 36 chars)
- [ ] Croatian ZKI length validated (32 chars)
- [ ] OIB format validated (11 digits)
- [ ] Fiscalized invoices require JIR and ZKI
- [ ] Due date logic validated (warning if before issue date)
- [ ] Currency validation (EUR expected for Croatia)
- [ ] Compliance summary includes both EN 16931 and Croatian results
- [ ] Critical errors identified and flagged
- [ ] Structured logging captures validation events
- [ ] Error responses include detailed validation issues
- [ ] Bulk validation calculates compliance statistics
- [ ] Pagination supported for bulk operations (max 1000 invoices)
- [ ] Sandbox testing integrates compliance validation
- [ ] UBL generation follows EN 16931 standard
- [ ] Validation prevents invalid invoices from fiscalization

## Evidence Links

1. POST endpoint handler → `src/app/api/compliance/en16931/route.ts:15`
2. GET endpoint handler → `src/app/api/compliance/en16931/route.ts:87`
3. EN 16931 validation function → `src/lib/compliance/en16931-validator.ts:26`
4. Croatian validation function → `src/lib/compliance/en16931-validator.ts:170`
5. Compliance summary function → `src/lib/compliance/en16931-validator.ts:218`
6. Required fields validation → `src/lib/compliance/en16931-validator.ts:38-56`
7. Amount validation → `src/lib/compliance/en16931-validator.ts:59-85`
8. Line item validation → `src/lib/compliance/en16931-validator.ts:88-126`
9. JIR/ZKI validation → `src/lib/compliance/en16931-validator.ts:176-202`
10. OIB validation → `src/lib/compliance/en16931-validator.ts:186-192`
11. UBL generator with EN 16931 compliance → `src/lib/e-invoice/ubl-generator.ts:10-12`
12. Sandbox integration → `src/app/api/sandbox/e-invoice/route.ts:171`
13. EInvoice schema → `prisma/schema.prisma:191-259`
14. EInvoiceLine schema → `prisma/schema.prisma:261-276`
15. Structured logging → `src/app/api/compliance/en16931/route.ts:55-63`
