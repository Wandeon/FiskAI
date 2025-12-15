# Feature: Fiscal Status Check (F067)

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 24

## Purpose

The Fiscal Status Check feature provides comprehensive monitoring and verification of invoice fiscalization status, including real-time JIR lookup, retry logic for failed fiscalizations, and detailed request tracking. It enables users to monitor fiscalization queue status, manually trigger fiscalizations, retry failed requests, and view detailed error information with automatic recovery mechanisms.

## User Entry Points

| Type     | Path                              | Evidence                                                                |
| -------- | --------------------------------- | ----------------------------------------------------------------------- |
| UI Page  | /settings/fiscalisation           | `src/app/(dashboard)/settings/fiscalisation/page.tsx:7`                 |
| UI Badge | /invoices/:id (FiscalStatusBadge) | `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:19`          |
| UI Panel | FiscalStatusPanel component       | `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:77` |
| Action   | checkFiscalStatus                 | `src/app/actions/fiscalize.ts:210`                                      |
| Action   | retryFiscalRequestAction          | `src/app/actions/fiscal-certificate.ts:200`                             |
| Action   | manualFiscalizeAction             | `src/app/actions/fiscal-certificate.ts:253`                             |
| Cron     | GET /api/cron/fiscal-processor    | `src/app/api/cron/fiscal-processor/route.ts:10`                         |

## Core Flow

### Invoice Fiscal Status Display

1. User navigates to invoice detail page → `src/app/(dashboard)/invoices/[id]/page.tsx:32`
2. System fetches invoice with fiscal requests → `src/app/(dashboard)/invoices/[id]/page.tsx:54-57`
3. System checks for active fiscal certificate → `src/app/(dashboard)/invoices/[id]/page.tsx:66-72`
4. System renders FiscalStatusBadge with status → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:19`
5. Badge displays JIR if fiscalized → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:26-45`
6. Badge shows request status (QUEUED/PROCESSING/FAILED/DEAD) → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:49-106`
7. Badge offers manual fiscalize button if applicable → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:110-133`

### Fiscal Status Panel Monitoring

1. User navigates to fiscalisation settings → `src/app/(dashboard)/settings/fiscalisation/page.tsx:7`
2. System fetches recent fiscal requests (last 20) → `src/app/(dashboard)/settings/fiscalisation/page.tsx:18-23`
3. System groups requests by status for statistics → `src/app/(dashboard)/settings/fiscalisation/page.tsx:24-28`
4. Panel displays status summary cards → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:119-141`
5. Panel renders recent requests table → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:154-235`
6. User can retry failed/dead requests → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:80-94`

### Manual Fiscalization Request

1. User clicks "Fiskaliziraj" button on invoice → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:122-130`
2. System confirms user action → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:153`
3. System validates invoice eligibility → `src/app/actions/fiscal-certificate.ts:260-274`
4. System checks for active certificate → `src/app/actions/fiscal-certificate.ts:278-289`
5. System creates or updates FiscalRequest → `src/app/actions/fiscal-certificate.ts:291-316`
6. Request status set to QUEUED → `src/app/actions/fiscal-certificate.ts:304`
7. Invoice fiscal status updated to PENDING → `src/app/actions/fiscal-certificate.ts:318-321`
8. Audit log created → `src/app/actions/fiscal-certificate.ts:323-335`
9. Page revalidated to show new status → `src/app/actions/fiscal-certificate.ts:337`

### Fiscal Request Processing (Cron)

1. Cron job triggers fiscal processor → `src/app/api/cron/fiscal-processor/route.ts:10`
2. System verifies cron secret → `src/app/api/cron/fiscal-processor/route.ts:12-15`
3. System recovers stale locks → `src/app/api/cron/fiscal-processor/route.ts:25`
4. System acquires batch of pending requests (max 10) → `src/app/api/cron/fiscal-processor/route.ts:28-45`
5. Requests with QUEUED/FAILED status selected → `src/app/api/cron/fiscal-processor/route.ts:36`
6. Only requests ready for retry (nextRetryAt <= now) → `src/app/api/cron/fiscal-processor/route.ts:37`
7. Under max attempts limit → `src/app/api/cron/fiscal-processor/route.ts:38`
8. Row-level locking with SKIP LOCKED → `src/app/api/cron/fiscal-processor/route.ts:41`
9. Status updated to PROCESSING → `src/app/api/cron/fiscal-processor/route.ts:33`
10. Each job processed via executeFiscalRequest → `src/app/api/cron/fiscal-processor/route.ts:51`

### Successful Fiscalization Flow

1. System executes fiscal request → `src/app/api/cron/fiscal-processor/route.ts:73`
2. Pipeline loads certificate and invoice → `src/lib/fiscal/fiscal-pipeline.ts:19-64`
3. XML built, signed, and submitted → `src/lib/fiscal/fiscal-pipeline.ts:66-101`
4. Response received with JIR → `src/lib/fiscal/fiscal-pipeline.ts:115-121`
5. FiscalRequest updated to COMPLETED → `src/app/api/cron/fiscal-processor/route.ts:76-85`
6. Invoice updated with JIR and ZKI → `src/app/api/cron/fiscal-processor/route.ts:88-98`
7. Invoice fiscalStatus set to COMPLETED → `src/app/api/cron/fiscal-processor/route.ts:95`
8. Lock released → `src/app/api/cron/fiscal-processor/route.ts:82-84`

### Failed Fiscalization with Retry

1. Fiscalization fails with error → `src/app/api/cron/fiscal-processor/route.ts:101`
2. Error classified by type → `src/app/api/cron/fiscal-processor/route.ts:102`
3. Network errors marked retriable → `src/app/api/cron/fiscal-processor/route.ts:144-150`
4. Server errors (5xx) marked retriable → `src/app/api/cron/fiscal-processor/route.ts:157-163`
5. Rate limits (429) marked retriable → `src/app/api/cron/fiscal-processor/route.ts:166-172`
6. Porezna temporary errors (t-codes) retriable → `src/app/api/cron/fiscal-processor/route.ts:184-194`
7. Attempt count incremented → `src/app/api/cron/fiscal-processor/route.ts:103`
8. Status set to FAILED or DEAD based on retriability → `src/app/api/cron/fiscal-processor/route.ts:108`
9. Next retry time calculated with exponential backoff → `src/app/api/cron/fiscal-processor/route.ts:113-115`
10. Error details stored → `src/app/api/cron/fiscal-processor/route.ts:110-112`
11. Invoice fiscalStatus updated accordingly → `src/app/api/cron/fiscal-processor/route.ts:122-128`

### Manual Retry of Failed Request

1. User clicks retry button on failed request → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:208`
2. System calls retryFiscalRequestAction → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:83`
3. System validates request exists and is failed → `src/app/actions/fiscal-certificate.ts:207-217`
4. Request status reset to QUEUED → `src/app/actions/fiscal-certificate.ts:222`
5. Attempt count reset to 0 → `src/app/actions/fiscal-certificate.ts:223`
6. Next retry time set to now → `src/app/actions/fiscal-certificate.ts:224`
7. Errors cleared → `src/app/actions/fiscal-certificate.ts:225-226`
8. Lock released → `src/app/actions/fiscal-certificate.ts:227-228`
9. Audit log created → `src/app/actions/fiscal-certificate.ts:232-243`
10. Will be picked up by next cron run → Automatic via cron job

### Check Fiscal Status via Action

1. User initiates status check → `src/app/actions/fiscalize.ts:210`
2. System authenticates and authorizes → `src/app/actions/fiscalize.ts:211-212`
3. Invoice fetched with JIR verification → `src/app/actions/fiscalize.ts:215-227`
4. Returns error if not fiscalized → `src/app/actions/fiscalize.ts:233-235`
5. Provider getStatus called with JIR → `src/app/actions/fiscalize.ts:237-238`
6. Status returned with fiscalization details → `src/app/actions/fiscalize.ts:240-246`

## Key Modules

| Module                   | Purpose                                  | Location                                                             |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------- |
| FiscalStatusBadge        | Invoice-level status indicator           | `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx`          |
| FiscalStatusPanel        | Settings panel for monitoring            | `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx` |
| FiscalisationSettings    | Certificate and status management page   | `src/app/(dashboard)/settings/fiscalisation/page.tsx`                |
| checkFiscalStatus        | Action to verify JIR status              | `src/app/actions/fiscalize.ts:210`                                   |
| retryFiscalRequestAction | Action to manually retry failed requests | `src/app/actions/fiscal-certificate.ts:200`                          |
| manualFiscalizeAction    | Action to manually queue fiscalization   | `src/app/actions/fiscal-certificate.ts:253`                          |
| FiscalProcessor          | Cron job for processing queue            | `src/app/api/cron/fiscal-processor/route.ts`                         |
| executeFiscalRequest     | Pipeline for request execution           | `src/lib/fiscal/fiscal-pipeline.ts:19`                               |
| submitToPorezna          | HTTP client for Porezna API              | `src/lib/fiscal/porezna-client.ts:25`                                |

## Fiscal Request States

### Status Lifecycle

**QUEUED** → `prisma/schema.prisma:994`

- Request created and waiting for processing
- Shown with yellow clock icon → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:40-46`
- Message: "Čeka fiskalizaciju..." → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:58`

**PROCESSING** → `prisma/schema.prisma:995`

- Currently being processed by worker
- Shown with blue spinning loader → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:47-53`
- Message: "Fiskalizacija u tijeku..." → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:72`
- Lock acquired with worker ID → `src/app/api/cron/fiscal-processor/route.ts:32`

**COMPLETED** → `prisma/schema.prisma:996`

- Successfully fiscalized with JIR received
- Shown with green checkmark → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:54-60`
- JIR and ZKI stored → `src/app/api/cron/fiscal-processor/route.ts:80-81`
- Invoice updated with fiscalization data → `src/app/api/cron/fiscal-processor/route.ts:88-97`

**FAILED** → `prisma/schema.prisma:997`

- Temporary failure, will retry
- Shown with red X icon → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:61-67`
- Retry button available → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:96-104`
- Next retry scheduled → `src/app/api/cron/fiscal-processor/route.ts:113-115`

**DEAD** → `prisma/schema.prisma:998`

- Permanent failure, max attempts exceeded or non-retriable error
- Shown with gray skull icon → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:68-75`
- Manual retry required → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:203-223`
- Error details preserved → `src/app/api/cron/fiscal-processor/route.ts:110-112`

## Error Classification

### Retriable Errors (Will Auto-Retry)

**Network Errors** → `src/app/api/cron/fiscal-processor/route.ts:144-150`

- ECONNREFUSED: Connection refused
- ETIMEDOUT: Connection timeout
- ENOTFOUND: DNS resolution failure
- "timeout" in message
- Classification: `{ code: 'NETWORK_ERROR', retriable: true }`

**Server Errors (5xx)** → `src/app/api/cron/fiscal-processor/route.ts:157-163`

- HTTP 500-599 status codes
- Classification: `{ code: 'SERVER_ERROR', retriable: true }`

**Rate Limiting** → `src/app/api/cron/fiscal-processor/route.ts:166-172`

- HTTP 429 status code
- Classification: `{ code: 'RATE_LIMITED', retriable: true }`

**Porezna Temporary Errors** → `src/app/api/cron/fiscal-processor/route.ts:184-194`

- Error codes starting with 't' (t001-t099)
- Temporary Porezna system issues
- Classification: `{ code: poreznaCode, retriable: true }`

### Non-Retriable Errors (Require Manual Fix)

**Validation Errors** → `src/app/api/cron/fiscal-processor/route.ts:175-180`

- HTTP 4xx status codes (except 429)
- Invalid invoice data
- Classification: `{ code: 'VALIDATION_ERROR', retriable: false }`

**Porezna Permanent Errors** → `src/app/api/cron/fiscal-processor/route.ts:184-194`

- Error codes not starting with 't'
- Business rule violations
- Classification: `{ code: poreznaCode, retriable: false }`

**Certificate Issues** → `src/lib/fiscal/fiscal-pipeline.ts:23-37`

- Certificate not found: `{ poreznaCode: 'p001' }`
- Certificate not active: `{ poreznaCode: 'p002' }`
- Certificate expired: `{ poreznaCode: 'p003' }`
- Invoice not found: `{ poreznaCode: 'p004' }`

## Retry Logic

### Exponential Backoff Strategy → `src/app/api/cron/fiscal-processor/route.ts:200-210`

```
Attempt 1: 30 seconds
Attempt 2: 2 minutes (30s × 4¹)
Attempt 3: 8 minutes (30s × 4²)
Attempt 4: 32 minutes (30s × 4³)
Attempt 5: 2 hours (max cap, 30s × 4⁴ = 128m capped at 120m)
```

**Formula**: `delaySeconds = baseDelaySeconds * Math.pow(4, attemptCount - 1)`

- Base delay: 30 seconds
- Multiplier: 4x per attempt
- Maximum delay: 2 hours (7200 seconds)
- Jitter: ±10% random variation to prevent thundering herd

**Jitter Calculation**: `jitter = actualDelay * 0.1 * (Math.random() * 2 - 1)`

### Max Attempts → `prisma/schema.prisma:1041`

- Default: 5 attempts
- Configurable per request
- After max attempts, status becomes DEAD
- Can be manually reset via retry action

### Stale Lock Recovery → `src/app/api/cron/fiscal-processor/route.ts:212-227`

**Threshold**: 5 minutes

- Requests stuck in PROCESSING for >5 minutes marked as FAILED
- Lock released: `lockedAt = null, lockedBy = null`
- Error message: "Lock expired - worker may have crashed"
- Prevents zombie locks from blocking queue

### Batch Processing → `src/app/api/cron/fiscal-processor/route.ts:17-45`

**Configuration**:

- Batch size: 10 requests per run
- Lock duration: 60 seconds (1 minute)
- Cron timeout: 60 seconds maximum
- Worker ID: `worker-${randomUUID().slice(0, 8)}`

**Selection Criteria**:

- Status: QUEUED or FAILED
- Next retry: `nextRetryAt <= NOW()`
- Attempts: `attemptCount < maxAttempts`
- Not locked: `lockedAt IS NULL OR lockedAt < staleCutoff`
- Order: `nextRetryAt ASC` (oldest first)
- Locking: `FOR UPDATE SKIP LOCKED` (prevent conflicts)

## UI Components

### Fiscal Status Badge States

**Fiscalized (Success)** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:26-45`

- Badge: Green with checkmark "Fiskalizirano"
- Shows JIR (full UUID)
- Shows ZKI (truncated if long)
- Shows fiscalizedAt timestamp

**Queued** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:50-62`

- Badge: Gray with clock "U redu čekanja"
- Message: "Čeka fiskalizaciju..."

**Processing** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:64-76`

- Badge: Gray with spinning clock "Procesira se"
- Message: "Fiskalizacija u tijeku..."

**Failed** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:78-106`

- Badge: Red with X "Neuspjela fiskalizacija"
- Shows error message and error code
- Shows attempt count (e.g., "3/5")
- Retry button: "Pokušaj ponovno"

**Not Fiscalized (Ready)** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:115-133`

- Badge: Outline with alert "Nije fiskalizirano"
- Fiscalize button: "Fiskaliziraj" with send icon
- Only shown if certificate configured and invoice not draft

**Not Fiscalized (No Certificate)** → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:136-148`

- Badge: Outline with alert "Nije fiskalizirano"
- Message: "Certifikat nije konfiguriran"

### Fiscal Status Panel Components

**Status Summary Cards** → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:119-141`

- 5 cards: QUEUED, PROCESSING, COMPLETED, FAILED, DEAD
- Each card shows:
  - Status icon with color
  - Count of requests in that status
  - Status label

**Recent Requests Table** → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:154-235`

Columns:

1. Invoice: Invoice number or "N/A"
2. Type: Message type (RACUN, STORNO, PROVJERA)
3. Status: Icon + badge
4. JIR: First 8 characters (truncated) or "-"
5. Attempts: X/Y format (current/max)
6. Updated: Formatted timestamp
7. Actions: Retry button for FAILED/DEAD requests

**Retry Button** → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:205-223`

- Only visible for FAILED or DEAD status
- Shows "Retrying..." with spinner when clicked
- Disabled while retry in progress
- Toast notification on success/error

## Data

### Database Schema

**FiscalRequest Model** → `prisma/schema.prisma:1033-1064`

```prisma
model FiscalRequest {
  id             String            @id @default(cuid())
  companyId      String
  certificateId  String
  invoiceId      String?
  messageType    FiscalMessageType  // RACUN, STORNO, PROVJERA
  status         FiscalStatus       @default(QUEUED)
  attemptCount   Int                @default(0)
  maxAttempts    Int                @default(5)
  nextRetryAt    DateTime           @default(now())
  lockedAt       DateTime?
  lockedBy       String?            // Worker ID
  jir            String?            // Jedinstveni Identifikator Računa
  zki            String?            // Zaštitni Kod Izdavatelja
  errorCode      String?
  errorMessage   String?
  lastHttpStatus Int?
  requestXml     String?            @db.Text
  signedXml      String?            @db.Text
  responseXml    String?            @db.Text
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  company     Company           @relation(...)
  certificate FiscalCertificate @relation(...)
  invoice     EInvoice?         @relation(...)

  @@unique([companyId, invoiceId, messageType])
  @@index([status, nextRetryAt])
  @@index([companyId])
  @@index([invoiceId])
}
```

**Key Fields**:

- **lockedAt/lockedBy**: Distributed locking for concurrent workers
- **attemptCount/maxAttempts**: Retry tracking
- **nextRetryAt**: When to retry next (exponential backoff)
- **requestXml/signedXml/responseXml**: Full audit trail
- **jir/zki**: Fiscalization identifiers from Porezna

**Indexes**:

- `[status, nextRetryAt]`: Efficient queue processing
- `[companyId, invoiceId, messageType]`: Prevent duplicate requests

**EInvoice.fiscalStatus** → `prisma/schema.prisma:209`

- Type: String? (optional)
- Values: "PENDING", "COMPLETED", "FAILED"
- Separate from invoice status
- Updated by fiscal processor

## Integration Points

### Fiscal Certificate System

**Certificate Validation** → `src/app/actions/fiscal-certificate.ts:278-289`

- Manual fiscalization requires active certificate
- Environment-specific (TEST/PROD)
- Certificate status must be ACTIVE

**Certificate Loading** → `src/lib/fiscal/fiscal-pipeline.ts:23-48`

- P12 certificate decrypted from database
- Private key extracted for signing
- Expiry date validated before use

### Invoice Management

**Invoice Detail Page** → `src/app/(dashboard)/invoices/[id]/page.tsx:54-72`

- Fetches latest fiscal request
- Checks certificate availability
- Displays fiscal status badge

**Invoice Status Updates** → `src/app/api/cron/fiscal-processor/route.ts:88-97`

- JIR and ZKI written to invoice on success
- fiscalizedAt timestamp set
- fiscalStatus updated (PENDING/COMPLETED/FAILED)

### Audit Logging

**Manual Fiscalization** → `src/app/actions/fiscal-certificate.ts:323-335`

- Operation: "MANUAL_FISCALIZE"
- Entity: "EInvoice"
- Changes include requestId

**Retry Action** → `src/app/actions/fiscal-certificate.ts:232-243`

- Operation: "REQUEST_RETRY"
- Entity: "FiscalRequest"

### Cron Job System

**Endpoint**: `GET /api/cron/fiscal-processor`
**Authentication**: Bearer token via CRON_SECRET
**Timeout**: 60 seconds maximum
**Schedule**: Configured via Vercel cron or external scheduler

**Environment Variables**:

- `CRON_SECRET`: Required for authentication

## Error Handling

### HTTP Timeout → `src/lib/fiscal/porezna-client.ts:32-70`

- Timeout: 30 seconds
- AbortController used for cancellation
- Throws: `{ message: 'Request timeout after 30s' }`
- Classified as retriable network error

### SOAP Fault → `src/lib/fiscal/porezna-client.ts:94-101`

- Parsed from SOAP envelope
- Error code from `Fault.Code.Value`
- Error message from `Fault.Reason.Text`
- Returns: `{ success: false, errorCode, errorMessage }`

### Porezna Business Errors → `src/lib/fiscal/porezna-client.ts:116-126`

- Errors in `RacunOdgovor.Greske.Greska`
- Multiple errors possible (array)
- First error returned
- Fields: `SifraGreske`, `PorukaGreske`

### Parse Errors → `src/lib/fiscal/porezna-client.ts:147-154`

- XML parsing failures
- Returns: `{ success: false, errorCode: 'PARSE_ERROR' }`
- Raw response preserved for debugging

### Lock Expiry → `src/app/api/cron/fiscal-processor/route.ts:212-227`

- Stale locks detected (>5 minutes)
- Status changed to FAILED
- Lock released automatically
- Error: "Lock expired - worker may have crashed"

## API Response Examples

### Successful Manual Fiscalization

```json
{
  "success": true,
  "requestId": "clx123abc"
}
```

### Failed Manual Fiscalization

```json
{
  "success": false,
  "error": "No active certificate configured"
}
```

### Fiscal Request Retry

```json
{
  "success": true
}
```

### Check Fiscal Status

```json
{
  "success": true,
  "status": "ACTIVE",
  "jir": "12345678-1234-1234-1234-123456789012",
  "zki": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "fiscalizedAt": "2025-12-15T10:30:00.000Z"
}
```

### Cron Processor Response

```json
{
  "processed": 5,
  "results": [
    { "id": "clx1", "success": true },
    { "id": "clx2", "success": false, "error": "Certificate expired" },
    { "id": "clx3", "success": true },
    { "id": "clx4", "success": false, "error": "HTTP 500" },
    { "id": "clx5", "success": true }
  ]
}
```

## Dependencies

- **Depends on**:
  - [[auth-login]] - User authentication required → `src/app/actions/fiscalize.ts:211`
  - [[company-management]] - Company context required → `src/app/actions/fiscalize.ts:212`
  - [[fiscal-certificates]] - Certificate system required → `src/app/actions/fiscal-certificate.ts:278`
  - [[invoicing]] - Invoice data required → `src/lib/fiscal/fiscal-pipeline.ts:51`
  - [[fiscal-xml-signing]] - XML signing pipeline → `src/lib/fiscal/fiscal-pipeline.ts:92`
  - [[porezna-client]] - HTTP communication → `src/lib/fiscal/fiscal-pipeline.ts:101`
  - **Database** - FiscalRequest and EInvoice models → `prisma/schema.prisma`
  - **Cron Scheduler** - Automated queue processing → External (Vercel cron)

- **Depended by**:
  - [[invoice-detail-page]] - Displays fiscal status → `src/app/(dashboard)/invoices/[id]/page.tsx`
  - [[fiscalisation-settings]] - Management interface → `src/app/(dashboard)/settings/fiscalisation/page.tsx`
  - [[audit-logging]] - Tracks fiscal operations → `src/app/actions/fiscal-certificate.ts`
  - **Reporting** - Fiscal status analytics → Potential future feature

## Verification Checklist

- [ ] User can view fiscal status on invoice detail page
- [ ] Badge shows different states (QUEUED/PROCESSING/COMPLETED/FAILED/DEAD)
- [ ] JIR and ZKI displayed when fiscalized
- [ ] Manual fiscalization button appears when applicable
- [ ] Manual fiscalization creates QUEUED request
- [ ] Fiscal status panel displays recent requests
- [ ] Status summary cards show accurate counts
- [ ] Retry button available for FAILED/DEAD requests
- [ ] Retry action resets request to QUEUED
- [ ] Retry action clears error messages
- [ ] Cron job processes batched requests
- [ ] Cron job authenticates with CRON_SECRET
- [ ] Successful fiscalization stores JIR and ZKI
- [ ] Failed requests classified as retriable or not
- [ ] Network errors trigger retry with backoff
- [ ] Server errors (5xx) trigger retry
- [ ] Rate limiting (429) triggers retry
- [ ] Validation errors (4xx) marked as DEAD
- [ ] Exponential backoff calculated correctly
- [ ] Jitter applied to prevent thundering herd
- [ ] Max attempts enforced (default 5)
- [ ] Stale locks recovered after 5 minutes
- [ ] Row-level locking prevents concurrent processing
- [ ] SKIP LOCKED prevents lock contention
- [ ] Invoice fiscalStatus updated on completion
- [ ] Invoice fiscalStatus updated on failure
- [ ] Error codes and messages stored
- [ ] HTTP status codes captured
- [ ] Request/signed/response XML preserved
- [ ] Audit logs created for manual actions
- [ ] Certificate expiry validated before use
- [ ] Certificate not found error handled
- [ ] Invoice not found error handled
- [ ] Timeout errors classified as retriable
- [ ] SOAP faults parsed correctly
- [ ] Porezna business errors extracted
- [ ] Parse errors handled gracefully
- [ ] UI updates after manual fiscalization
- [ ] UI shows loading states during actions
- [ ] Toast notifications for user feedback

## Evidence Links

1. Fiscalisation settings page → `src/app/(dashboard)/settings/fiscalisation/page.tsx:7`
2. Fiscal status badge component → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:19`
3. Fiscal status panel component → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:77`
4. Check fiscal status action → `src/app/actions/fiscalize.ts:210`
5. Retry fiscal request action → `src/app/actions/fiscal-certificate.ts:200`
6. Manual fiscalize action → `src/app/actions/fiscal-certificate.ts:253`
7. Fiscal processor cron job → `src/app/api/cron/fiscal-processor/route.ts:10`
8. Execute fiscal request pipeline → `src/lib/fiscal/fiscal-pipeline.ts:19`
9. Submit to Porezna client → `src/lib/fiscal/porezna-client.ts:25`
10. FiscalRequest schema → `prisma/schema.prisma:1033-1064`
11. FiscalStatus enum → `prisma/schema.prisma:993-999`
12. FiscalMessageType enum → `prisma/schema.prisma:1001-1005`
13. Error classification logic → `src/app/api/cron/fiscal-processor/route.ts:142-197`
14. Exponential backoff calculation → `src/app/api/cron/fiscal-processor/route.ts:200-210`
15. Stale lock recovery → `src/app/api/cron/fiscal-processor/route.ts:212-227`
16. Status badge states → `src/app/(dashboard)/invoices/[id]/fiscal-status-badge.tsx:26-148`
17. Status panel table → `src/app/(dashboard)/settings/fiscalisation/fiscal-status-panel.tsx:154-235`
18. Invoice detail page integration → `src/app/(dashboard)/invoices/[id]/page.tsx:54-72`
19. Successful fiscalization flow → `src/app/api/cron/fiscal-processor/route.ts:76-98`
20. Failed fiscalization flow → `src/app/api/cron/fiscal-processor/route.ts:101-132`
21. Batch processing query → `src/app/api/cron/fiscal-processor/route.ts:28-45`
22. Certificate validation → `src/lib/fiscal/fiscal-pipeline.ts:23-37`
23. Porezna response parsing → `src/lib/fiscal/porezna-client.ts:82-155`
24. Audit log creation → `src/app/actions/fiscal-certificate.ts:232-243`
