# E-Invoice Lab Roadmap

## Phase 1: E-Invoice Flow (E-Poslovanje) ← CURRENT PRIORITY

**Goal:** Complete B2B e-invoice sending and receiving via e-Poslovanje

### Status
- [x] API connection verified
- [x] Provider created (`src/providers/eposlovanje.ts`)
- [x] Golden fixture saved (real signed UBL invoice)
- [x] API spec saved (`eposlovanje-api-v2.yaml`)
- [ ] UBL generator validation against golden fixture
- [ ] Integration into FiskAI-App
- [ ] Send invoice flow
- [ ] Receive invoice flow (polling)
- [ ] Status tracking

### What's Working
```
✅ Ping API          - Connection confirmed
✅ List outgoing     - Found 1 existing invoice
✅ List incoming     - Works (empty)
✅ Validate document - Endpoint works
✅ Get document      - Retrieved golden UBL XML
```

### What Needs Building

#### 1. UBL Generator Validation
Compare our `ubl-generator.ts` output against the golden fixture to ensure compliance with:
- CIUS-2025 specification
- Required namespaces
- Croatian OIB scheme (9934)

#### 2. Database Schema (in FiskAI-App)
```prisma
model Company {
  // Add to existing
  eInvoiceProvider        String?   // "e-poslovanje" | "mock"
  eInvoiceApiKeyEncrypted String?   // AES-256-GCM encrypted
}

model EInvoice {
  // Already exists in packages/db/prisma/schema/invoice.prisma
  // May need: providerRef, providerStatus fields
}
```

#### 3. Settings UI
- Provider selection (e-Poslovanje / Mock)
- API key input (encrypted storage)
- Connection test button

#### 4. Send Invoice Flow
```
Invoice created → Generate UBL → Send to e-Poslovanje → Store providerRef → Track status
```

#### 5. Receive Invoice Flow (Background Worker)
```
Poll /api/v2/document/incoming → Parse UBL → Create EInvoice record → Notify user
```

---

## Phase 2: Fiscalization (CIS/Porezna) ← LATER

**Goal:** Real-time tax reporting for cash/card transactions

### Status
- [x] Code complete (xml-builder, xml-signer, porezna-client)
- [x] Certificate upload UI exists
- [x] Queue processing logic exists
- [ ] FINA test certificate needed
- [ ] End-to-end testing
- [ ] Integration into FiskAI-App

### Prerequisites
1. Obtain FINA test certificate (P12/PFX)
2. Set up `FISCAL_CERT_KEY` for envelope encryption
3. Test with CIS test environment (cistest.apis-it.hr)

### What's Built (Ready to Use)
```
src/fiscal/
├── zki.ts              ✅ Tested - ZKI calculation
├── xml-builder.ts      ⚠️ Untested - Builds RacunZahtjev
├── xml-signer.ts       ⚠️ Untested - Signs with P12
├── porezna-client.ts   ⚠️ Untested - SOAP submission
├── certificate-parser.ts ⚠️ Untested - Parses P12
├── envelope-encryption.ts ⚠️ Untested - Secure storage
└── fiscal-pipeline.ts  ⚠️ Untested - Orchestration

src/queue/
├── fiscal-processor.ts ⚠️ Untested - Queue worker
└── fiscal-retry.ts     ⚠️ Untested - Retry logic
```

### Documentation
- `ARCHITECTURE.md` - Full system diagram
- `src/actions-fiscal-certificate.ts` - Server actions reference
- `src/ui-reference/` - Settings UI components

---

## Integration Order

```
Week 1-2: E-Invoice (Phase 1)
├── Day 1-2: Validate UBL generator
├── Day 3-4: Add e-Poslovanje settings to FiskAI-App
├── Day 5-6: Implement send invoice flow
├── Day 7-8: Implement receive invoice polling
└── Day 9-10: Testing and polish

Week 3-4: Fiscalization (Phase 2) - WHEN CERTIFICATE AVAILABLE
├── Obtain FINA test certificate
├── Test certificate upload
├── Test XML building and signing
├── Test CIS submission
└── Integrate queue processing
```

---

## Environment Variables Summary

### Phase 1 (E-Poslovanje)
```bash
# Required
EPOSLOVANJE_API_KEY=your_api_key

# Optional (defaults to test)
EPOSLOVANJE_API_BASE=https://test.eposlovanje.hr

# For production
# EPOSLOVANJE_API_BASE=https://eracun.eposlovanje.hr
```

### Phase 2 (Fiscalization) - Later
```bash
# Required for certificate encryption
FISCAL_CERT_KEY=your_32_char_master_key

# Optional (for development without real CIS)
FISCAL_DEMO_MODE=true
```
