# E-Invoice Lab

> Salvaged e-invoice code from old FiskAI for validation and testing.
> **Goal:** Find what actually worked, create golden fixtures, discard the rest.

## Status: ✅ E-POSLOVANJE CONNECTION VERIFIED

**Connection test passed:** 2026-02-04

```
Test 1: Ping endpoint           ✅ PASS
Test 2: Get outgoing documents  ✅ PASS (1 document found from 2026-01-04)
Test 3: Get incoming documents  ✅ PASS (0 documents)
Test 4: Validate endpoint       ✅ PASS
```

**Golden fixture saved:** `fixtures/golden-invoice-194571.xml` - A real, signed UBL 2.1 invoice

This package contains code extracted from `/home/admin/issue-781-fix/`.
Most of this code is untested or incomplete. Review each file before using.

---

## What Was Found

### ✅ E-Poslovanje - THE WORKING PROVIDER

**The e-Poslovanje connection was stored under Coolify env vars (NOT in code):**

```bash
EPOSLOVANJE_API_BASE=https://test.eposlovanje.hr
EPOSLOVANJE_API_URL=https://api.eposlovanje.si/v1  # (legacy, not used)
EPOSLOVANJE_API_KEY=52c8b6f4...
```

**API Documentation:** https://doc.eposlovanje.hr
**OpenAPI Spec:** Saved to `eposlovanje-api-v2.yaml`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/ping` | GET | Health check |
| `/api/v2/document/send` | POST | Send UBL invoice |
| `/api/v2/document/get/{id}` | GET | Get document XML |
| `/api/v2/document/status/{id}` | GET | Get document status |
| `/api/v2/document/incoming` | GET | List incoming invoices |
| `/api/v2/document/outgoing` | GET | List outgoing invoices |
| `/api/v2/document/validate` | POST | Validate without sending |

**Authentication:** `Authorization: <api_key>` (no Bearer prefix!)

### Other Providers (NOT the working path)

| Provider ID | Name | Status |
|-------------|------|--------|
| `ie-racuni` | IE Računi | Code exists but was NOT the working provider |
| `fina` | Fina | Throws "not implemented" |
| `ddd-invoices` | DDD Invoices | No code |
| `mock` | Mock | For testing |
| **`e-poslovanje`** | **E-Poslovanje** | **✅ WORKING - NEW PROVIDER CREATED** |

---

## Directory Structure

```
packages/einvoice-lab/
├── src/
│   ├── providers/           # Provider implementations
│   │   ├── factory.ts       # createEInvoiceProvider() - only mock works
│   │   ├── fiscal-factory.ts
│   │   ├── ie-racuni.ts     # IE-Računi provider (UNTESTED)
│   │   ├── mock.ts          # Mock e-invoice provider
│   │   └── mock-fiscal.ts   # Mock fiscal provider
│   │
│   ├── fiscal/              # Croatian fiscalization (direct CIS)
│   │   ├── zki.ts           # ZKI calculation ✅ TESTED
│   │   ├── porezna-client.ts # Direct SOAP to Porezna
│   │   ├── xml-builder.ts   # CIS XML builder
│   │   ├── xml-signer.ts    # XML digital signature
│   │   ├── certificate-parser.ts
│   │   ├── fiscal-pipeline.ts
│   │   ├── pos-fiscalize.ts
│   │   ├── should-fiscalize.ts
│   │   ├── qr-generator.ts
│   │   └── utils.ts
│   │
│   ├── ubl/                 # UBL 2.1 XML generation
│   │   └── ubl-generator.ts # EN 16931 / PEPPOL BIS 3.0
│   │
│   ├── crypto/              # Encryption utilities
│   │   ├── secrets.ts       # AES-256-GCM for API keys
│   │   └── envelope-encryption.ts # Two-layer encryption for certs
│   │
│   ├── queue/               # Queue processing (needs adaptation)
│   │   ├── fiscal-processor.ts # FOR UPDATE SKIP LOCKED pattern
│   │   └── fiscal-retry.ts  # Exponential backoff retry
│   │
│   ├── types/               # Type definitions
│   │   ├── e-invoice.ts
│   │   └── fiscal.ts
│   │
│   ├── __tests__/           # Tests
│   │   └── zki.test.ts      # ✅ Only proven test
│   │
│   ├── index.ts             # Exports
│   ├── invoice.ts           # sendEInvoice action (reference)
│   ├── actions-company.ts   # Company settings actions
│   └── validations-company.ts
│
├── fixtures/                # TODO: Add golden fixtures
│   └── (empty)
│
├── FISCALIZATION.md         # Old docs
├── fiscalization-example.ts # Example usage
├── .env.fiscalization.example
└── README.md                # This file
```

---

## Code Flow (from old invoice.ts)

```typescript
// 1. Get provider name and decrypt API key
const providerName = company.eInvoiceProvider || "mock"
const apiKey = decryptOptionalSecret(company.eInvoiceApiKeyEncrypted)

// 2. Create provider
const provider = createEInvoiceProvider(providerName, { apiKey })

// 3. Generate UBL XML
const ublXml = generateUBLInvoice(eInvoice)

// 4. Send via provider
const result = await provider.sendInvoice(eInvoice, ublXml)

// 5. Check if needs fiscalization (separate from e-invoice)
if (shouldFiscalize(invoice)) {
  await queueFiscalRequest(invoiceId, companyId)
}
```

---

## What Needs Validation

### Priority 1: Find "e-poslovanje" Connection
User confirms e-poslovanje was connected with API key. Candidates:
- IE-Računi? (has code, matches flow)
- DDD Invoices? (listed in UI, NO code found)
- Different name? Search for actual API calls

### Priority 2: Golden Fixtures
Need to create from scratch or find in logs:
- [ ] Invoice input DTO
- [ ] Outbound request payload
- [ ] Request headers (especially auth format)
- [ ] Successful response

### Priority 3: Test What Works
- [x] ZKI calculation (zki.test.ts passes)
- [ ] UBL generation (no tests)
- [ ] Provider calls (no tests)
- [ ] Response parsing (no tests)

---

## Environment Variables

From `.env.fiscalization.example`:
```bash
# IE Računi provider
IE_RACUNI_API_KEY=your_api_key_here
IE_RACUNI_API_URL=https://api.ie-racuni.hr/v1
IE_RACUNI_SANDBOX=true

# Fina provider (not implemented)
# FINA_API_KEY=your_api_key_here
# FINA_API_URL=https://api.fina.hr/v1

# Encryption key for API keys (32+ chars)
EINVOICE_KEY_SECRET=dev_einvoice_secret_32_chars_minimum
```

---

## Next Steps

1. **Find the actual e-poslovanje provider code** (or confirm it's IE-Računi)
2. **Create golden fixtures** from real API calls
3. **Write golden proof tests**:
   - invoice → payload equals expected
   - payload → mock server receives correct headers/body
   - response → parser extracts providerRef/jir/status correctly
4. **Discard** anything not on the working path
5. **Move validated code** to `packages/einvoice/` when ready

---

## Origin

Extracted from: `/home/admin/issue-781-fix/`
Date: 2026-02-04
