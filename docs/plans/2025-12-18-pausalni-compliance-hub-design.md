# Paušalni Compliance Hub - Design Document

> **Status:** Design Complete - Ready for Implementation
> **Date:** 2025-12-18
> **For Claude:** Use `superpowers:writing-plans` to create implementation tasks from this design.

## Overview

A comprehensive compliance module for paušalni obrt users that automates obligation tracking, EU transaction reporting, payment slip generation, and deadline management.

**Problem Solved:** Paušalni obrt owners, especially those with PDV-ID for EU business, struggle with:

- Tracking which EU transactions require monthly PDV reporting
- Getting the numbers right for PDV/PDV-S/ZP forms
- Remembering payment deadlines and generating correct payment slips
- Understanding which field gets which number in Porezna forms

**Solution:** An all-in-one Compliance Hub that detects EU transactions automatically, generates ready-to-submit forms, and provides payment slips with scannable barcodes.

---

## User Profiles

### Simple Paušalist (No PDV-ID)

- ~80% of paušalni obrt users
- Domestic business only
- Obligations: Monthly doprinosi, quarterly porez, annual PO-SD

### EU-Active Paušalist (Has PDV-ID)

- ~20% of paušalni obrt users
- Issues invoices to EU clients AND/OR purchases services from EU vendors
- Additional obligations: Monthly PDV, PDV-S, ZP forms

The system supports both profiles, with EU features shown only when relevant.

---

## Complete Obligation Reference (2025)

### Monthly Obligations

| Obligation          | Deadline | Amount (2025) | IBAN                  | Model | Poziv na broj |
| ------------------- | -------- | ------------- | --------------------- | ----- | ------------- |
| MIO I. stup         | 15th     | 107,88€       | HR1210010051863000160 | HR68  | 8214-{OIB}    |
| MIO II. stup        | 15th     | 35,96€        | HR7610010051700036001 | HR68  | 2046-{OIB}    |
| Zdravstveno         | 15th     | 118,67€       | HR6510010051550100001 | HR68  | 8478-{OIB}    |
| **Total Doprinosi** | **15th** | **262,51€**   |                       |       |               |

### Monthly EU Obligations (if PDV-ID holder)

| Obligation    | Deadline                    | Notes                       |
| ------------- | --------------------------- | --------------------------- |
| PDV obrazac   | 20th of following month     | Even if zero EU activity    |
| PDV-S obrazac | 20th of following month     | Services RECEIVED from EU   |
| ZP obrazac    | 20th of following month     | Services PROVIDED to EU     |
| PDV payment   | Last day of following month | 25% of EU services received |

### Quarterly Obligations

| Obligation       | Deadlines                      | Notes                           |
| ---------------- | ------------------------------ | ------------------------------- |
| Porez na dohodak | Mar 31, Jun 30, Sep 30, Dec 31 | Amount varies by income bracket |
| HOK članarina    | Quarterly                      | 34,20€ (exempt first 2 years)   |

### Annual Obligations

| Obligation     | Deadline    | Notes                               |
| -------------- | ----------- | ----------------------------------- |
| PO-SD obrazac  | January 15  | For previous year                   |
| DOH obrazac    | February 28 | Only if exceeded 60,000€ threshold  |
| TZ-1 (tourism) | With PO-SD  | Only for tourism-related activities |

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────┤
│  GoCardless Bank Sync  ←→  Manual CSV/PDF Import                │
│         ↓                          ↓                            │
│    Bank Transactions (existing)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EU DETECTION LAYER (NEW)                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: IBAN Analysis (non-HR prefix = EU)                    │
│  Layer 2: Known Vendor Database (Google, Meta, etc.)            │
│  Layer 3: User Confirmation + Learning                          │
│         ↓                                                       │
│  Tagged Transactions: { euCountry, type, pdvAmount }            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               OBLIGATION TRACKER (NEW)                          │
├─────────────────────────────────────────────────────────────────┤
│  Generates monthly/quarterly/annual obligations                 │
│  Matches payments from bank sync to obligations                 │
│  Tracks: PENDING → DUE_SOON → OVERDUE → PAID                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT GENERATORS                            │
├─────────────────────────────────────────────────────────────────┤
│  Form Generator          │  Payment Slip Generator              │
│  - PDV XML (ePorezna)    │  - HUB-3A PDF417 barcodes           │
│  - PDV-S XML             │  - Batch PDF export                  │
│  - ZP XML                │  - Individual slip modal             │
│  - Pre-filled PDFs       │                                      │
│  - Field-by-field guide  │                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│  Email reminders (existing, enhance)                            │
│  In-app notifications                                           │
│  Calendar sync (ICS export + Google Calendar API)               │
│  Smart timing: 7d, 3d, 1d before deadlines                     │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```sql
-- User's paušalni profile
CREATE TABLE pausalni_profile (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES company(id),
  has_pdv_id BOOLEAN DEFAULT false,
  pdv_id VARCHAR(20), -- HR12345678901 format
  pdv_id_since DATE,
  eu_active BOOLEAN DEFAULT false, -- Has EU transactions
  hok_member_since DATE, -- For HOK fee tracking
  tourism_activity BOOLEAN DEFAULT false, -- For TZ-1
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Known EU vendors (pre-loaded + learned)
CREATE TABLE eu_vendor (
  id UUID PRIMARY KEY,
  name_pattern VARCHAR(255), -- Regex or exact match
  display_name VARCHAR(255), -- "Google Ireland"
  country_code CHAR(2), -- IE, DE, NL, etc.
  vendor_type VARCHAR(50), -- ADVERTISING, SOFTWARE, HOSTING, etc.
  is_eu BOOLEAN DEFAULT true, -- false for US vendors like Figma
  confidence_score INTEGER DEFAULT 100, -- Decreases if users override
  is_system BOOLEAN DEFAULT true, -- false = learned from user
  created_at TIMESTAMP
);

-- Individual payment obligations
CREATE TABLE payment_obligation (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES company(id),
  obligation_type VARCHAR(50), -- DOPRINOSI_MIO1, DOPRINOSI_MIO2, DOPRINOSI_ZO, POREZ_DOHODAK, PDV, HOK, etc.
  period_month INTEGER, -- 1-12
  period_year INTEGER,
  amount DECIMAL(10,2),
  due_date DATE,
  status VARCHAR(20), -- PENDING, DUE_SOON, OVERDUE, PAID, SKIPPED
  paid_date DATE,
  paid_amount DECIMAL(10,2),
  matched_transaction_id UUID REFERENCES bank_transaction(id),
  match_type VARCHAR(20), -- AUTO, MANUAL, NONE
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- EU transactions requiring PDV reporting
CREATE TABLE eu_transaction (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES company(id),
  bank_transaction_id UUID REFERENCES bank_transaction(id),
  direction VARCHAR(20), -- RECEIVED (you bought), PROVIDED (you sold)
  counterparty_name VARCHAR(255),
  counterparty_country CHAR(2),
  counterparty_vat_id VARCHAR(20),
  transaction_date DATE,
  amount DECIMAL(10,2),
  currency CHAR(3) DEFAULT 'EUR',
  pdv_rate DECIMAL(4,2) DEFAULT 25.00,
  pdv_amount DECIMAL(10,2), -- Calculated: amount * pdv_rate / 100
  reporting_month INTEGER, -- Month this belongs to for PDV reporting
  reporting_year INTEGER,
  vendor_id UUID REFERENCES eu_vendor(id),
  detection_method VARCHAR(20), -- IBAN, VENDOR_DB, USER_CONFIRMED
  confidence_score INTEGER,
  user_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- Generated forms history
CREATE TABLE generated_form (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES company(id),
  form_type VARCHAR(20), -- PDV, PDV_S, ZP, PO_SD
  period_month INTEGER,
  period_year INTEGER,
  format VARCHAR(10), -- XML, PDF
  file_path VARCHAR(500),
  file_hash VARCHAR(64), -- SHA256 for deduplication
  form_data JSONB, -- Structured form field values
  submitted_to_porezna BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Notification preferences (per user)
CREATE TABLE notification_preference (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user(id),
  channel VARCHAR(20), -- EMAIL, PUSH, CALENDAR
  enabled BOOLEAN DEFAULT true,
  remind_7_days BOOLEAN DEFAULT true,
  remind_3_days BOOLEAN DEFAULT true,
  remind_1_day BOOLEAN DEFAULT true,
  remind_day_of BOOLEAN DEFAULT true,
  google_calendar_connected BOOLEAN DEFAULT false,
  google_calendar_id VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_obligation_company_status ON payment_obligation(company_id, status);
CREATE INDEX idx_obligation_due_date ON payment_obligation(due_date);
CREATE INDEX idx_eu_transaction_reporting ON eu_transaction(company_id, reporting_year, reporting_month);
CREATE INDEX idx_eu_vendor_pattern ON eu_vendor(name_pattern);
```

---

## Component Design

### 1. EU Transaction Detection

**Location:** `src/lib/pausalni/eu-detection.ts`

```typescript
interface EuDetectionResult {
  isEu: boolean
  country: string | null
  vendor: EuVendor | null
  confidence: number // 0-100
  detectionMethod: 'IBAN' | 'VENDOR_DB' | 'USER_CONFIRMED' | 'UNKNOWN'
  requiresUserConfirmation: boolean
}

// Detection layers in order
async function detectEuTransaction(tx: BankTransaction): Promise<EuDetectionResult> {
  // Layer 1: IBAN analysis
  if (tx.counterpartyIban && !tx.counterpartyIban.startsWith('HR')) {
    const country = tx.counterpartyIban.substring(0, 2)
    if (EU_COUNTRY_CODES.includes(country)) {
      return { isEu: true, country, confidence: 95, detectionMethod: 'IBAN', ... }
    }
  }

  // Layer 2: Known vendor database
  const vendor = await matchVendor(tx.counterpartyName)
  if (vendor) {
    return { isEu: vendor.isEu, country: vendor.countryCode, vendor, confidence: vendor.confidenceScore, detectionMethod: 'VENDOR_DB', ... }
  }

  // Layer 3: Unknown foreign transaction - needs user input
  if (looksLikeForeignTransaction(tx)) {
    return { isEu: false, confidence: 0, detectionMethod: 'UNKNOWN', requiresUserConfirmation: true, ... }
  }

  return { isEu: false, confidence: 100, detectionMethod: 'IBAN', ... }
}
```

**Pre-loaded EU Vendors (seed data):**

```typescript
const EU_VENDORS = [
  // Advertising
  { pattern: "GOOGLE.*IRELAND", name: "Google Ireland", country: "IE", type: "ADVERTISING" },
  { pattern: "META.*IRELAND", name: "Meta Platforms Ireland", country: "IE", type: "ADVERTISING" },
  { pattern: "FACEBOOK.*IRELAND", name: "Facebook Ireland", country: "IE", type: "ADVERTISING" },
  { pattern: "LINKEDIN.*IRELAND", name: "LinkedIn Ireland", country: "IE", type: "ADVERTISING" },
  { pattern: "TWITTER.*IRELAND", name: "Twitter Ireland", country: "IE", type: "ADVERTISING" },

  // Software/SaaS (EU)
  {
    pattern: "STRIPE.*EUROPE",
    name: "Stripe Payments Europe",
    country: "IE",
    type: "PAYMENT_PROCESSING",
  },
  { pattern: "AMAZON.*EMEA", name: "Amazon Web Services EMEA", country: "LU", type: "HOSTING" },
  { pattern: "MICROSOFT.*IRELAND", name: "Microsoft Ireland", country: "IE", type: "SOFTWARE" },
  { pattern: "ATLASSIAN.*PTY", name: "Atlassian", country: "NL", type: "SOFTWARE" },
  { pattern: "SPOTIFY", name: "Spotify AB", country: "SE", type: "SOFTWARE" },
  { pattern: "NOTION.*LABS", name: "Notion Labs", country: "IE", type: "SOFTWARE" },

  // Hosting (EU)
  { pattern: "HETZNER", name: "Hetzner Online", country: "DE", type: "HOSTING" },
  { pattern: "OVH", name: "OVH", country: "FR", type: "HOSTING" },
  { pattern: "SCALEWAY", name: "Scaleway", country: "FR", type: "HOSTING" },

  // Non-EU (important to exclude!)
  { pattern: "CANVA.*PTY", name: "Canva", country: "AU", type: "SOFTWARE", isEu: false },
  { pattern: "FIGMA", name: "Figma Inc", country: "US", type: "SOFTWARE", isEu: false },
  { pattern: "DIGITALOCEAN", name: "DigitalOcean", country: "US", type: "HOSTING", isEu: false },
  { pattern: "VERCEL", name: "Vercel Inc", country: "US", type: "HOSTING", isEu: false },
  { pattern: "OPENAI", name: "OpenAI", country: "US", type: "SOFTWARE", isEu: false },
  { pattern: "ANTHROPIC", name: "Anthropic", country: "US", type: "SOFTWARE", isEu: false },
]
```

### 2. Form Generator

**Location:** `src/lib/pausalni/forms/`

```
src/lib/pausalni/forms/
├── pdv-generator.ts      # PDV obrazac XML/PDF
├── pdv-s-generator.ts    # PDV-S obrazac XML/PDF
├── zp-generator.ts       # ZP obrazac XML/PDF
├── po-sd-generator.ts    # PO-SD obrazac (annual)
├── xml-templates/        # ePorezna XML schemas
│   ├── pdv-schema.xsd
│   ├── pdv-s-schema.xsd
│   └── zp-schema.xsd
└── index.ts              # Unified form generation API
```

**PDV Form Generation:**

```typescript
interface PdvFormData {
  period: { month: number; year: number }
  company: { oib: string; name: string; address: string }

  // Section I - Isporuke (services provided)
  I_4_services_to_eu: number // Services to EU clients

  // Section II - Stjecanja (services received)
  II_9_services_from_eu: number // Services from EU (base)
  II_10_pdv_self_assessed: number // 25% of II_9

  // Section VI - Ukupno
  VI_4_total_non_hr_services: number
}

async function generatePdvXml(data: PdvFormData): Promise<string> {
  // Generate ePorezna-compatible XML
}

async function generatePdvPdf(data: PdvFormData): Promise<Buffer> {
  // Generate pre-filled PDF form
}
```

### 3. HUB-3A Payment Slip Generator

**Location:** `src/lib/pausalni/payment-slips/`

```typescript
import { PDF417 } from "pdf417-generator"

interface PaymentSlipData {
  amount: number // In cents (10788 = 107.88€)
  currency: "EUR"
  recipientName: string
  recipientIban: string
  recipientModel: string // 'HR68'
  recipientReference: string // '8214-12345678901'
  payerName: string
  payerAddress: string
  payerCity: string
  description: string
}

// HUB-3A format specification
function formatHub3a(data: PaymentSlipData): string {
  // Field order per HUB-3A spec (https://www.hub.hr/sites/default/files/inline-files/2dbc_0.pdf)
  const lines = [
    "HRVHUB30", // Header
    data.currency,
    String(data.amount).padStart(15, "0"),
    data.payerName.substring(0, 30),
    data.payerAddress.substring(0, 27),
    data.payerCity.substring(0, 27),
    data.recipientName.substring(0, 25),
    data.recipientAddress.substring(0, 25),
    data.recipientCity.substring(0, 27),
    data.recipientIban,
    data.recipientModel,
    data.recipientReference,
    "COST", // Purpose code
    data.description.substring(0, 35),
  ]
  return lines.join("\n")
}

function generateBarcode(data: PaymentSlipData): string {
  const hub3aString = formatHub3a(data)
  return PDF417.encode(hub3aString)
}

// Pre-configured obligation types
const PAYMENT_CONFIGS = {
  MIO_I: {
    recipientName: "Državni proračun RH",
    recipientIban: "HR1210010051863000160",
    recipientModel: "HR68",
    referencePrefix: "8214",
    amount: 10788, // 107.88€
  },
  MIO_II: {
    recipientName: "Državni proračun RH",
    recipientIban: "HR7610010051700036001",
    recipientModel: "HR68",
    referencePrefix: "2046",
    amount: 3596, // 35.96€
  },
  ZDRAVSTVENO: {
    recipientName: "Državni proračun RH",
    recipientIban: "HR6510010051550100001",
    recipientModel: "HR68",
    referencePrefix: "8478",
    amount: 11867, // 118.67€
  },
  PDV: {
    recipientName: "Državni proračun RH",
    recipientIban: "HR1210010051863000160",
    recipientModel: "HR68",
    referencePrefix: "1201",
    amount: null, // Variable
  },
}
```

### 4. Payment Dashboard Component

**Location:** `src/app/(dashboard)/pausalni/page.tsx`

Timeline view showing:

- Chronological list of obligations
- Status indicators (✅ Paid, ⏳ Due Soon, 📅 Upcoming, 🔴 Overdue)
- Quick actions (Generate slip, Generate forms, Mark paid)
- Bank sync match indicators
- Monthly/yearly summary stats

### 5. Calendar Integration

**Location:** `src/lib/calendar/`

```typescript
// ICS Export
async function generateIcsCalendar(
  companyId: string,
  options: { year: number; euActive: boolean }
): Promise<string> {
  const obligations = await getYearObligations(companyId, options.year, options.euActive)

  const events = obligations.map((ob) => ({
    uid: `${ob.id}@fiskai.hr`,
    dtstart: ob.dueDate,
    summary: `${ob.title} - ${formatCurrency(ob.amount)}`,
    description: `IBAN: ${ob.iban}\nPoziv na broj: ${ob.reference}`,
    alarms: [
      { trigger: "-P7D", action: "DISPLAY" },
      { trigger: "-P3D", action: "DISPLAY" },
      { trigger: "-P1D", action: "DISPLAY" },
    ],
  }))

  return generateIcs(events)
}

// Google Calendar Sync
async function syncToGoogleCalendar(
  userId: string,
  obligations: PaymentObligation[]
): Promise<void> {
  const auth = await getGoogleAuth(userId, ["calendar.events"])
  const calendar = google.calendar({ version: "v3", auth })

  // Create or get FiskAI calendar
  const calendarId = await getOrCreateFiskaiCalendar(calendar)

  // Upsert events
  for (const ob of obligations) {
    await calendar.events.upsert({
      calendarId,
      eventId: ob.id,
      resource: formatAsGoogleEvent(ob),
    })
  }
}
```

---

## UI Wireframes

### Payment Dashboard (Timeline View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Paušalni Compliance Hub                    [⚙️] [📅 Kalendar]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💰 Ukupno za platiti ovaj mjesec: 350,01€              │   │
│  │    Doprinosi: 262,51€  │  PDV: 87,50€                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📅 Prosinac 2025                                               │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  ✅ 15.12. │ Doprinosi za studeni                              │
│            │ MIO I: 107,88€ • MIO II: 35,96€ • ZO: 118,67€     │
│            │ Plaćeno 14.12. • Auto-matched iz Erste izvoda     │
│            │                                                    │
│  ⏳ 20.12. │ PDV/ZP za studeni                    [Za 2 dana]  │
│            │ PDV za platiti: 87,50€                            │
│            │ EU transakcije: 3 (Google, Meta, AWS)             │
│            │ [Pregledaj transakcije] [Generiraj forme]         │
│            │                                                    │
│  📅 31.12. │ Porez na dohodak Q4                  [Za 13 dana] │
│            │ Procjena: 250,00€                                 │
│            │ [Generiraj uplatnicu]                              │
│            │                                                    │
│  📅 31.12. │ PDV uplata za studeni               [Za 13 dana]  │
│            │ 87,50€                                             │
│            │ [Generiraj uplatnicu]                              │
│                                                                 │
│  📅 Siječanj 2026                                               │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  📅 15.01. │ PO-SD za 2025                       [Za 28 dana]  │
│            │ Godišnji izvještaj                                │
│            │ [Pripremi PO-SD]                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### EU Transaction Review Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  EU transakcije za studeni 2025                          [✕]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Primljene usluge iz EU (za PDV-S obrazac)                     │
│  ─────────────────────────────────────────                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 05.11. │ GOOGLE IRELAND LIMITED          │ 150,00€  │ IE │  │
│  │        │ Google Ads                       │          │    │  │
│  │        │ ✅ Auto-detected (vendor DB)                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 12.11. │ META PLATFORMS IRELAND          │ 200,00€  │ IE │  │
│  │        │ Facebook Ads                     │          │    │  │
│  │        │ ✅ Auto-detected (vendor DB)                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 18.11. │ AMAZON WEB SERVICES EMEA        │ 50,00€   │ LU │  │
│  │        │ Hosting                          │          │    │  │
│  │        │ ✅ Auto-detected (IBAN: LU...)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Ukupno primljene usluge:        350,00€                       │
│  PDV za platiti (25%):            87,50€                       │
│                                                                 │
│  ─────────────────────────────────────────                     │
│                                                                 │
│  ⚠️ 1 transakcija treba potvrdu                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 22.11. │ SOME UNKNOWN VENDOR             │ 30,00€   │ ?? │  │
│  │        │ IBAN: DE89370400440532013000     │          │    │  │
│  │        │ Je li ovo EU usluga?  [Da, EU] [Ne] [Preskoči]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                          [Generiraj PDV/PDV-S/ZP forme]        │
└─────────────────────────────────────────────────────────────────┘
```

### HUB-3A Barcode Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Uplatnica: MIO I. stup - Siječanj 2025                  [✕]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Primatelj:      Državni proračun RH                           │
│  IBAN:           HR1210010051863000160                         │
│  Model:          HR68                                          │
│  Poziv na broj:  8214-12345678901                              │
│  Iznos:          107,88 EUR                                    │
│  Opis:           Doprinosi MIO I za 01/2025                    │
│                                                                 │
│           ┌─────────────────────────────────┐                  │
│           │  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  │                  │
│           │  ██████████████████████████████  │                  │
│           │  ██  PDF417 HUB-3A BARCODE  ███  │                  │
│           │  ██████████████████████████████  │                  │
│           │  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  │                  │
│           └─────────────────────────────────┘                  │
│              Skeniraj s mBanking aplikacijom                   │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐           │
│  │ 📄 PDF     │  │ 📋 Kopiraj │  │ 📧 Pošalji     │           │
│  │ Preuzmi    │  │ podatke    │  │ na email       │           │
│  └────────────┘  └────────────┘  └────────────────┘           │
│                                                                 │
│  ─────────────────────────────────────────                     │
│  Generiraj sve uplatnice za siječanj:                          │
│  [MIO I + MIO II + Zdravstveno = 262,51€]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Paušalni Profile

```
GET    /api/pausalni/profile           # Get user's paušalni profile
PUT    /api/pausalni/profile           # Update profile (PDV-ID, etc.)
```

### Obligations

```
GET    /api/pausalni/obligations                    # List all obligations
GET    /api/pausalni/obligations?status=pending     # Filter by status
GET    /api/pausalni/obligations?month=12&year=2025 # Filter by period
POST   /api/pausalni/obligations/:id/mark-paid      # Manual mark as paid
```

### EU Transactions

```
GET    /api/pausalni/eu-transactions                # List EU transactions
GET    /api/pausalni/eu-transactions?month=11&year=2025
POST   /api/pausalni/eu-transactions/:id/confirm    # User confirms EU status
POST   /api/pausalni/eu-transactions/detect         # Trigger detection on new transactions
```

### Forms

```
GET    /api/pausalni/forms/pdv?month=11&year=2025&format=xml    # Generate PDV
GET    /api/pausalni/forms/pdv-s?month=11&year=2025&format=xml  # Generate PDV-S
GET    /api/pausalni/forms/zp?month=11&year=2025&format=xml     # Generate ZP
GET    /api/pausalni/forms/po-sd?year=2024&format=pdf           # Generate PO-SD
GET    /api/pausalni/forms/history                               # List generated forms
```

### Payment Slips

```
GET    /api/pausalni/payment-slip/:type?month=1&year=2025       # Single slip
GET    /api/pausalni/payment-slip/batch?month=1&year=2025       # All monthly slips
POST   /api/pausalni/payment-slip/custom                        # Custom amount slip
```

### Calendar

```
GET    /api/pausalni/calendar/ics?year=2025                     # ICS export
POST   /api/pausalni/calendar/google-sync                       # Sync to Google
GET    /api/pausalni/calendar/google-status                     # Check sync status
```

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── pausalni/
│   │       ├── page.tsx                    # Main dashboard
│   │       ├── eu-transactions/
│   │       │   └── page.tsx                # EU transaction review
│   │       ├── forms/
│   │       │   └── page.tsx                # Form generation history
│   │       └── settings/
│   │           └── page.tsx                # Paušalni profile settings
│   └── api/
│       └── pausalni/
│           ├── profile/route.ts
│           ├── obligations/route.ts
│           ├── eu-transactions/route.ts
│           ├── forms/
│           │   ├── pdv/route.ts
│           │   ├── pdv-s/route.ts
│           │   ├── zp/route.ts
│           │   └── po-sd/route.ts
│           ├── payment-slip/route.ts
│           └── calendar/
│               ├── ics/route.ts
│               └── google-sync/route.ts
├── components/
│   └── pausalni/
│       ├── obligation-timeline.tsx         # Timeline view component
│       ├── eu-transaction-review.tsx       # EU review modal
│       ├── payment-slip-modal.tsx          # HUB-3A barcode modal
│       ├── form-generator-card.tsx         # Form generation UI
│       └── pausalni-profile-form.tsx       # Profile settings
├── lib/
│   └── pausalni/
│       ├── eu-detection.ts                 # EU transaction detection
│       ├── obligation-tracker.ts           # Obligation management
│       ├── payment-matcher.ts              # Bank sync matching
│       ├── forms/
│       │   ├── pdv-generator.ts
│       │   ├── pdv-s-generator.ts
│       │   ├── zp-generator.ts
│       │   └── po-sd-generator.ts
│       ├── payment-slips/
│       │   ├── hub3a-formatter.ts
│       │   └── barcode-generator.ts
│       └── calendar/
│           ├── ics-export.ts
│           └── google-calendar-sync.ts
└── lib/db/schema/
    └── pausalni.ts                         # New schema additions
```

---

## Implementation Priority

### Phase 1: Foundation (Must Have)

1. Database schema additions
2. Paušalni profile management
3. Obligation tracker (generate monthly/quarterly/annual obligations)
4. Payment dashboard UI (timeline view)
5. HUB-3A barcode generator

### Phase 2: EU Compliance (Critical for EU-active)

6. EU transaction detection layer
7. EU transaction review UI
8. PDV/PDV-S/ZP form generators (XML priority)
9. Form generation history

### Phase 3: Automation

10. Bank sync payment matching
11. Smart reminders (enhance existing cron)
12. ICS calendar export
13. Google Calendar sync

### Phase 4: Polish

14. Upgrade existing DeadlineCalendar to database-driven
15. Notification preferences UI
16. Annual PO-SD wizard
17. Batch operations (generate all slips, all forms)

---

## External Dependencies

### NPM Packages to Add

```json
{
  "pdf417-generator": "^1.0.0", // HUB-3A barcode generation
  "ics": "^3.0.0", // ICS calendar file generation
  "xml2js": "^0.6.0" // XML parsing for ePorezna schemas
}
```

### APIs Used

- **HUB-3A Spec**: https://www.hub.hr/sites/default/files/inline-files/2dbc_0.pdf
- **Google Calendar API**: Already have googleapis package
- **ePorezna XML Schemas**: Need to obtain from Porezna documentation

---

## Success Metrics

1. **Time saved**: From 30+ minutes to <5 minutes for monthly EU reporting
2. **Error reduction**: Zero rejected forms due to calculation errors
3. **Payment compliance**: 100% on-time payments with smart reminders
4. **User satisfaction**: "Finally someone who understands paušalni obrt"

---

## Sources

Research conducted on 2025-12-18:

- [PO-SD obrazac za paušalce 2025](https://www.moj-knjigovoda.hr/novosti/po-sd-obrazac-za-pausalce-2025-obveze-rokovi-i-upute/)
- [Obveze u paušalnom obrtu](https://instrukcijeerzen.hr/blog/obveze-u-pausalnom-obrtu-mjesecne-kvartalne-i-godisnje)
- [Paušalni obrt i poslovanje s inozemstvom](https://www.minimax.hr/hr-hr/pausalni-obrt-i-poslovanje-s-inozemstvom)
- [Doprinosi za paušalni obrt 2025](https://fiskalopedija.hr/baza-znanja/placanja-doprinosa-pausalni-obrt)
- [PDV-ID i EU transakcije](https://solo.com.hr/blog/iako-niste-u-sustavu-pdv-a-evo-kada-ipak-morate-imati-pdv-broj/154)
- [ZP obrazac - Zbirna prijava](https://informator.hr/obrasci/obrazac-zp-zbirna-prijava-za-isporuke-dobara-i-usluga-u-druge-drzave-clanice-eu)
- [HUB-3A PDF417 Specifikacija](https://www.hub.hr/hr/format-zapisa-pdf417-2d-bar-koda-prema-hub3-standardu)
- [PDF417 Generator (GitHub)](https://github.com/pkoretic/pdf417-generator)
