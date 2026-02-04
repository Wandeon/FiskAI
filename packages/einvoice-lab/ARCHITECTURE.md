# E-Invoice Lab Architecture

## Two Separate Systems

Croatian e-invoicing involves **two distinct integrations**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FiskAI Invoice                           │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   E-POSLOVANJE      │    │   CIS/POREZNA       │            │
│  │   (e-Račun)         │    │   (Fiskalizacija)   │            │
│  ├─────────────────────┤    ├─────────────────────┤            │
│  │ B2B invoice         │    │ Tax reporting       │            │
│  │ exchange            │    │ (cash/card sales)   │            │
│  │                     │    │                     │            │
│  │ • Send UBL invoice  │    │ • Report to CIS     │            │
│  │ • Receive invoices  │    │ • Get JIR           │            │
│  │ • Track delivery    │    │ • ZKI calculation   │            │
│  │                     │    │                     │            │
│  │ Auth: API Key       │    │ Auth: P12 Cert      │            │
│  │ Format: REST/JSON   │    │ Format: SOAP/XML    │            │
│  │ ✅ VERIFIED         │    │ ⚠️ CODE EXISTS      │            │
│  └─────────────────────┘    └─────────────────────┘            │
│           │                          │                         │
│           ▼                          ▼                         │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │ test.eposlovanje.hr │    │ cistest.apis-it.hr  │            │
│  │ eracun.eposlovanje  │    │ cis.porezna-uprava  │            │
│  └─────────────────────┘    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## System 1: E-Poslovanje (E-Invoice Exchange)

**Purpose:** Send and receive B2B e-invoices between businesses

**When used:**
- Sending invoices to other registered businesses
- Receiving invoices from suppliers
- Legal requirement from 2026 for B2B transactions

**API Details:**
| Property | Value |
|----------|-------|
| Test URL | `https://test.eposlovanje.hr` |
| Prod URL | `https://eracun.eposlovanje.hr` |
| Auth | `Authorization: <api_key>` (no Bearer!) |
| Format | REST/JSON + UBL 2.1 XML payload |
| Docs | https://doc.eposlovanje.hr |

**Key Endpoints:**
```
POST /api/v2/document/send      - Send UBL invoice
GET  /api/v2/document/incoming  - List received invoices
GET  /api/v2/document/outgoing  - List sent invoices
GET  /api/v2/document/get/{id}  - Get document XML
GET  /api/v2/document/status/{id} - Check delivery status
POST /api/v2/document/validate  - Validate without sending
GET  /api/v2/ping               - Health check
```

**Status:** ✅ VERIFIED WORKING (2026-02-04)

---

## System 2: CIS/Porezna (Fiscalization)

**Purpose:** Real-time tax reporting for cash/card transactions

**When used:**
- Cash payments at point of sale
- Card payments at point of sale
- ANY transaction that must be fiscalized per Croatian law

**NOT needed when:**
- Bank transfer payments (B2B)
- E-invoice only transactions

**API Details:**
| Property | Value |
|----------|-------|
| Test URL | `https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest` |
| Prod URL | `https://cis.porezna-uprava.hr:8449/FiskalizacijaService` |
| Auth | P12/PFX digital certificate (from FINA) |
| Format | SOAP/XML |
| Spec | http://www.apis-it.hr/fin/2012/types/f73 |

**Key Components:**
```
xml-builder.ts       - Builds RacunZahtjev XML
xml-signer.ts        - Signs XML with certificate
porezna-client.ts    - Submits to CIS endpoint
certificate-parser.ts - Parses P12/PFX files
envelope-encryption.ts - Encrypts stored certificates
zki.ts               - Calculates ZKI (protective code) ✅ TESTED
```

**Flow:**
```
1. Calculate ZKI (requires: OIB, date, invoice#, premises, device, amount)
2. Build RacunZahtjev XML
3. Sign XML with P12 certificate
4. Submit to CIS via SOAP
5. Parse response for JIR (success) or error
6. Store JIR on invoice
```

**Status:** ⚠️ CODE EXISTS, NEEDS TESTING WITH REAL CERTIFICATE

---

## When to Use Which System

| Scenario | E-Poslovanje | CIS/Porezna |
|----------|--------------|-------------|
| B2B invoice (bank transfer) | ✅ Required | ❌ Not needed |
| B2C invoice (cash) | ❌ Optional | ✅ Required |
| B2C invoice (card) | ❌ Optional | ✅ Required |
| B2B invoice (cash at delivery) | ✅ Required | ✅ Required |
| Credit note | ✅ If original was e-invoice | ✅ If original was fiscalized |

---

## Database Models

### For E-Poslovanje
```prisma
model Company {
  eInvoiceProvider        String?   // "e-poslovanje" | "mock"
  eInvoiceApiKeyEncrypted String?   // AES-256-GCM encrypted
}
```

### For Fiscalization
```prisma
model FiscalCertificate {
  id              String    @id
  companyId       String
  environment     FiscalEnv // TEST | PROD
  certSubject     String
  certSerial      String
  certNotBefore   DateTime
  certNotAfter    DateTime
  oibExtracted    String
  certSha256      String
  encryptedP12    String    // Envelope-encrypted P12
  encryptedDataKey String
  status          CertStatus // PENDING | ACTIVE | EXPIRED
}

model FiscalRequest {
  id            String   @id
  companyId     String
  certificateId String
  invoiceId     String?
  messageType   FiscalMessageType // RACUN | STORNO | PROVJERA
  status        FiscalStatus // QUEUED | PROCESSING | COMPLETED | FAILED
  jir           String?
  zki           String?
  requestXml    String?
  signedXml     String?
  responseXml   String?
}
```

---

## Environment Variables

### E-Poslovanje
```bash
EPOSLOVANJE_API_BASE=https://test.eposlovanje.hr
EPOSLOVANJE_API_KEY=your_api_key
```

### Fiscalization
```bash
FISCAL_CERT_KEY=your_32_char_master_key  # For envelope encryption
FISCAL_DEMO_MODE=true                     # Bypass real CIS in dev
```

---

## Testing Status

| Component | Test File | Status |
|-----------|-----------|--------|
| E-Poslovanje Provider | `eposlovanje.test.ts` | ✅ PASS |
| ZKI Calculation | `zki.test.ts` | ✅ PASS |
| XML Builder | - | ⚠️ No tests |
| XML Signer | - | ⚠️ No tests |
| Porezna Client | - | ⚠️ No tests |
| Certificate Parser | - | ⚠️ No tests |
