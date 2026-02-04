# E-Invoice Lab - File Manifest

> Review status of each salvaged file.

## Status Legend
- ✅ PHASE 1 - E-Invoice (e-Poslovanje) - CURRENT PRIORITY
- 📦 PHASE 2 - Fiscalization (CIS/Porezna) - LATER
- 📖 REFERENCE - Documentation/examples only
- ❌ DISCARD - Not needed

---

## Providers (`src/providers/`)

| File | Phase | Notes |
|------|-------|-------|
| `eposlovanje.ts` | ✅ PHASE 1 | **NEW** - E-Poslovanje provider, connection verified |
| `mock.ts` | ✅ PHASE 1 | Mock for e-invoices (testing) |
| `factory.ts` | 📖 REFERENCE | Old factory, needs update for e-poslovanje |
| `ie-racuni.ts` | ❌ DISCARD | Was never the working provider |
| `mock-fiscal.ts` | 📦 PHASE 2 | Mock for fiscalization |
| `fiscal-factory.ts` | 📦 PHASE 2 | Fiscal provider factory |

---

## Fiscal - Direct CIS (`src/fiscal/`) - PHASE 2

All fiscalization code is for **Phase 2** (requires FINA certificate).

| File | Phase | Notes |
|------|-------|-------|
| `zki.ts` | 📦 PHASE 2 | ZKI calculation - **TESTED, WORKING** |
| `xml-builder.ts` | 📦 PHASE 2 | Builds RacunZahtjev XML |
| `xml-signer.ts` | 📦 PHASE 2 | Signs XML with P12 certificate |
| `porezna-client.ts` | 📦 PHASE 2 | SOAP submission to CIS |
| `certificate-parser.ts` | 📦 PHASE 2 | Parses P12/PFX files |
| `fiscal-pipeline.ts` | 📦 PHASE 2 | Orchestrates full flow |
| `pos-fiscalize.ts` | 📦 PHASE 2 | POS-specific entry point |
| `should-fiscalize.ts` | 📦 PHASE 2 | Decision logic |
| `qr-generator.ts` | 📦 PHASE 2 | QR code for receipts |
| `utils.ts` | 📦 PHASE 2 | Helpers (formatAmount, etc.) |

**Note:** E-Poslovanje does NOT handle fiscalization. Direct CIS integration is required for cash/card payments.

---

## UBL (`src/ubl/`) - PHASE 1

| File | Phase | Notes |
|------|-------|-------|
| `ubl-generator.ts` | ✅ PHASE 1 | Generates UBL 2.1. **Must validate against golden fixture** |

**Action Required:** Compare output against `fixtures/golden-invoice-194571.xml` to ensure CIUS-2025 compliance.

---

## Crypto (`src/crypto/`)

| File | Phase | Notes |
|------|-------|-------|
| `secrets.ts` | ✅ PHASE 1 | AES-256-GCM for API key encryption |
| `envelope-encryption.ts` | 📦 PHASE 2 | Two-layer encryption for P12 certificates |

---

## Queue (`src/queue/`) - PHASE 2

| File | Phase | Notes |
|------|-------|-------|
| `fiscal-processor.ts` | 📦 PHASE 2 | FOR UPDATE SKIP LOCKED pattern |
| `fiscal-retry.ts` | 📦 PHASE 2 | Exponential backoff retry |

**Note:** Queue processing is for fiscalization (Phase 2). E-invoice sending is synchronous.

---

## Types (`src/types/`)

| File | Status | Notes |
|------|--------|-------|
| `e-invoice.ts` | ⚠️ REVIEW | EInvoice DTOs and interfaces |
| `fiscal.ts` | ⚠️ REVIEW | Fiscal types (FiscalInvoice, FiscalResponse, etc.) |

---

## Tests (`src/__tests__/`)

| File | Status | Notes |
|------|--------|-------|
| `zki.test.ts` | ✅ KEEP | **Only proven test. Run with `node --test`** |
| `pos-fiscalize.test.ts` | ⚠️ REVIEW | May not run, check imports |

---

## Reference Files (not for production)

| File | Status | Notes |
|------|--------|-------|
| `index.ts` | ⚠️ REVIEW | Old exports, may have broken imports |
| `invoice.ts` | 📖 REFERENCE | Full sendEInvoice action - shows complete flow |
| `actions-company.ts` | 📖 REFERENCE | Company settings update with encryption |
| `validations-company.ts` | 📖 REFERENCE | Zod schemas for company settings |
| `ui-reference-settings-form.tsx` | 📖 REFERENCE | React form for provider selection |

---

## Documentation

| File | Status | Notes |
|------|--------|-------|
| `README.md` | ✅ KEEP | This documentation |
| `MANIFEST.md` | ✅ KEEP | This file |
| `FISCALIZATION.md` | 📖 REFERENCE | Old docs, may be outdated |
| `fiscalization-example.ts` | 📖 REFERENCE | Usage examples |
| `.env.fiscalization.example` | 📖 REFERENCE | Environment variable reference |

---

---

## Phase 1 Action Items (E-Invoice)

1. **Validate UBL Generator**
   ```bash
   # Compare our output against golden fixture
   npx tsx scripts/validate-ubl.ts
   ```

2. **Add E-Poslovanje to FiskAI-App**
   - Copy `src/providers/eposlovanje.ts` to `packages/trpc/src/`
   - Add Company.eInvoiceApiKeyEncrypted field
   - Create settings UI

3. **Implement Send Flow**
   - Generate UBL from Invoice
   - Send via e-Poslovanje
   - Store providerRef

4. **Implement Receive Flow**
   - Poll for incoming invoices
   - Parse UBL
   - Create EInvoice records

---

## Phase 2 Action Items (Fiscalization) - LATER

1. Obtain FINA test certificate
2. Set up FISCAL_CERT_KEY
3. Test certificate upload
4. Test full fiscalization pipeline
5. Integrate into FiskAI-App
