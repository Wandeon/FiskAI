# Paušalni Compliance Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive compliance module for paušalni obrt users that automates EU transaction detection, form generation, payment slip creation, and deadline management.

**Architecture:** Four-phase approach - (1) Database schema and core obligation tracking, (2) EU transaction detection with vendor learning, (3) Form generators for PDV/PDV-S/ZP with XML output, (4) HUB-3A barcode generation and calendar integration. Leverages existing bank sync infrastructure.

**Tech Stack:** Next.js 14, Drizzle ORM, PostgreSQL, pdf417-generator (HUB-3A), ics (calendar export), xml2js (form generation)

**Design Document:** `docs/plans/2025-12-18-pausalni-compliance-hub-design.md`

---

## Phase 1: Foundation

### Task 1.1: Install Required NPM Packages

**Files:**

- Modify: `package.json`

**Step 1: Install packages**

```bash
npm install pdf417-generator ics xml2js
npm install -D @types/xml2js
```

**Step 2: Verify installation**

```bash
npm list pdf417-generator ics xml2js
```

Expected: All three packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdf417-generator, ics, xml2js packages"
```

---

### Task 1.2: Create Paušalni Database Schema

**Files:**

- Create: `src/lib/db/schema/pausalni.ts`
- Modify: `src/lib/db/schema/index.ts`

**Step 1: Create the schema file**

Create `src/lib/db/schema/pausalni.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  date,
  timestamp,
  decimal,
  integer,
  jsonb,
  text,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Paušalni profile for each company
export const pausalniProfile = pgTable(
  "pausalni_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    hasPdvId: boolean("has_pdv_id").default(false),
    pdvId: varchar("pdv_id", { length: 20 }), // HR12345678901 format
    pdvIdSince: date("pdv_id_since"),
    euActive: boolean("eu_active").default(false),
    hokMemberSince: date("hok_member_since"),
    tourismActivity: boolean("tourism_activity").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    companyIdx: index("pausalni_profile_company_idx").on(table.companyId),
  })
)

// Known EU vendors (pre-loaded + learned)
export const euVendor = pgTable(
  "eu_vendor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namePattern: varchar("name_pattern", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    vendorType: varchar("vendor_type", { length: 50 }).notNull(),
    isEu: boolean("is_eu").default(true),
    confidenceScore: integer("confidence_score").default(100),
    isSystem: boolean("is_system").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    patternIdx: index("eu_vendor_pattern_idx").on(table.namePattern),
  })
)

// Payment obligations (monthly doprinosi, quarterly porez, etc.)
export const paymentObligation = pgTable(
  "payment_obligation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    obligationType: varchar("obligation_type", { length: 50 }).notNull(),
    periodMonth: integer("period_month").notNull(),
    periodYear: integer("period_year").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(),
    paidDate: date("paid_date"),
    paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }),
    matchedTransactionId: uuid("matched_transaction_id"),
    matchType: varchar("match_type", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("payment_obligation_company_status_idx").on(
      table.companyId,
      table.status
    ),
    dueDateIdx: index("payment_obligation_due_date_idx").on(table.dueDate),
  })
)

// EU transactions requiring PDV reporting
export const euTransaction = pgTable(
  "eu_transaction",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    bankTransactionId: uuid("bank_transaction_id"),
    direction: varchar("direction", { length: 20 }).notNull(), // RECEIVED, PROVIDED
    counterpartyName: varchar("counterparty_name", { length: 255 }),
    counterpartyCountry: varchar("counterparty_country", { length: 2 }),
    counterpartyVatId: varchar("counterparty_vat_id", { length: 20 }),
    transactionDate: date("transaction_date").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    pdvRate: decimal("pdv_rate", { precision: 4, scale: 2 }).default("25.00"),
    pdvAmount: decimal("pdv_amount", { precision: 10, scale: 2 }),
    reportingMonth: integer("reporting_month").notNull(),
    reportingYear: integer("reporting_year").notNull(),
    vendorId: uuid("vendor_id"),
    detectionMethod: varchar("detection_method", { length: 20 }),
    confidenceScore: integer("confidence_score"),
    userConfirmed: boolean("user_confirmed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    reportingIdx: index("eu_transaction_reporting_idx").on(
      table.companyId,
      table.reportingYear,
      table.reportingMonth
    ),
  })
)

// Generated forms history
export const generatedForm = pgTable("generated_form", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  formType: varchar("form_type", { length: 20 }).notNull(), // PDV, PDV_S, ZP, PO_SD
  periodMonth: integer("period_month"),
  periodYear: integer("period_year").notNull(),
  format: varchar("format", { length: 10 }).notNull(), // XML, PDF
  filePath: varchar("file_path", { length: 500 }),
  fileHash: varchar("file_hash", { length: 64 }),
  formData: jsonb("form_data"),
  submittedToPorezna: boolean("submitted_to_porezna").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
})

// Notification preferences
export const notificationPreference = pgTable("notification_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  channel: varchar("channel", { length: 20 }).notNull(), // EMAIL, PUSH, CALENDAR
  enabled: boolean("enabled").default(true),
  remind7Days: boolean("remind_7_days").default(true),
  remind3Days: boolean("remind_3_days").default(true),
  remind1Day: boolean("remind_1_day").default(true),
  remindDayOf: boolean("remind_day_of").default(true),
  googleCalendarConnected: boolean("google_calendar_connected").default(false),
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Obligation types enum for reference
export const OBLIGATION_TYPES = {
  DOPRINOSI_MIO_I: "DOPRINOSI_MIO_I",
  DOPRINOSI_MIO_II: "DOPRINOSI_MIO_II",
  DOPRINOSI_ZDRAVSTVENO: "DOPRINOSI_ZDRAVSTVENO",
  POREZ_DOHODAK: "POREZ_DOHODAK",
  PDV: "PDV",
  HOK: "HOK",
  PO_SD: "PO_SD",
} as const

export const OBLIGATION_STATUS = {
  PENDING: "PENDING",
  DUE_SOON: "DUE_SOON",
  OVERDUE: "OVERDUE",
  PAID: "PAID",
  SKIPPED: "SKIPPED",
} as const
```

**Step 2: Export from schema index**

Add to `src/lib/db/schema/index.ts`:

```typescript
export * from "./pausalni"
```

**Step 3: Generate migration**

```bash
npm run db:generate
```

**Step 4: Run migration**

```bash
npm run db:migrate
```

**Step 5: Commit**

```bash
git add src/lib/db/schema/pausalni.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): add paušalni compliance hub schema"
```

---

### Task 1.3: Create EU Vendor Seed Data

**Files:**

- Create: `src/lib/pausalni/seed-eu-vendors.ts`

**Step 1: Create seed data file**

Create `src/lib/pausalni/seed-eu-vendors.ts`:

```typescript
import { drizzleDb } from "@/lib/db/drizzle"
import { euVendor } from "@/lib/db/schema/pausalni"

export const EU_VENDOR_SEED_DATA = [
  // Advertising (EU - Ireland)
  {
    namePattern: "GOOGLE.*IRELAND",
    displayName: "Google Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },
  {
    namePattern: "META.*IRELAND",
    displayName: "Meta Platforms Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },
  {
    namePattern: "FACEBOOK.*IRELAND",
    displayName: "Facebook Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },
  {
    namePattern: "LINKEDIN.*IRELAND",
    displayName: "LinkedIn Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },
  {
    namePattern: "TWITTER.*IRELAND",
    displayName: "Twitter Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },
  {
    namePattern: "TIKTOK.*IRELAND",
    displayName: "TikTok Ireland",
    countryCode: "IE",
    vendorType: "ADVERTISING",
    isEu: true,
  },

  // Payment Processing (EU)
  {
    namePattern: "STRIPE.*EUROPE",
    displayName: "Stripe Payments Europe",
    countryCode: "IE",
    vendorType: "PAYMENT_PROCESSING",
    isEu: true,
  },
  {
    namePattern: "PAYPAL.*EUROPE",
    displayName: "PayPal Europe",
    countryCode: "LU",
    vendorType: "PAYMENT_PROCESSING",
    isEu: true,
  },
  {
    namePattern: "ADYEN",
    displayName: "Adyen",
    countryCode: "NL",
    vendorType: "PAYMENT_PROCESSING",
    isEu: true,
  },

  // Cloud/Hosting (EU)
  {
    namePattern: "AMAZON.*EMEA",
    displayName: "Amazon Web Services EMEA",
    countryCode: "LU",
    vendorType: "HOSTING",
    isEu: true,
  },
  {
    namePattern: "AWS.*EMEA",
    displayName: "AWS EMEA",
    countryCode: "LU",
    vendorType: "HOSTING",
    isEu: true,
  },
  {
    namePattern: "HETZNER",
    displayName: "Hetzner Online",
    countryCode: "DE",
    vendorType: "HOSTING",
    isEu: true,
  },
  { namePattern: "OVH", displayName: "OVH", countryCode: "FR", vendorType: "HOSTING", isEu: true },
  {
    namePattern: "SCALEWAY",
    displayName: "Scaleway",
    countryCode: "FR",
    vendorType: "HOSTING",
    isEu: true,
  },
  {
    namePattern: "CONTABO",
    displayName: "Contabo",
    countryCode: "DE",
    vendorType: "HOSTING",
    isEu: true,
  },

  // Software/SaaS (EU)
  {
    namePattern: "MICROSOFT.*IRELAND",
    displayName: "Microsoft Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "ATLASSIAN.*B\\.?V",
    displayName: "Atlassian B.V.",
    countryCode: "NL",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "SPOTIFY",
    displayName: "Spotify AB",
    countryCode: "SE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "NOTION.*IRELAND",
    displayName: "Notion Labs Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "SLACK.*IRELAND",
    displayName: "Slack Technologies Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "ZOOM.*IRELAND",
    displayName: "Zoom Video Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "DROPBOX.*IRELAND",
    displayName: "Dropbox Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "HUBSPOT.*IRELAND",
    displayName: "HubSpot Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "MAILCHIMP.*IRELAND",
    displayName: "Mailchimp Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "INTERCOM.*IRELAND",
    displayName: "Intercom Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "TYPEFORM",
    displayName: "Typeform",
    countryCode: "ES",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "MIRO",
    displayName: "Miro",
    countryCode: "NL",
    vendorType: "SOFTWARE",
    isEu: true,
  },

  // Design (EU)
  {
    namePattern: "ADOBE.*IRELAND",
    displayName: "Adobe Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },
  {
    namePattern: "SHUTTERSTOCK.*IRELAND",
    displayName: "Shutterstock Ireland",
    countryCode: "IE",
    vendorType: "SOFTWARE",
    isEu: true,
  },

  // Non-EU (Important to exclude from PDV reporting!)
  {
    namePattern: "CANVA.*PTY",
    displayName: "Canva Pty Ltd",
    countryCode: "AU",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "FIGMA",
    displayName: "Figma Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "DIGITALOCEAN",
    displayName: "DigitalOcean LLC",
    countryCode: "US",
    vendorType: "HOSTING",
    isEu: false,
  },
  {
    namePattern: "VERCEL",
    displayName: "Vercel Inc",
    countryCode: "US",
    vendorType: "HOSTING",
    isEu: false,
  },
  {
    namePattern: "NETLIFY",
    displayName: "Netlify Inc",
    countryCode: "US",
    vendorType: "HOSTING",
    isEu: false,
  },
  {
    namePattern: "HEROKU",
    displayName: "Heroku Inc",
    countryCode: "US",
    vendorType: "HOSTING",
    isEu: false,
  },
  {
    namePattern: "OPENAI",
    displayName: "OpenAI",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "ANTHROPIC",
    displayName: "Anthropic",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "GITHUB",
    displayName: "GitHub Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "GITLAB.*INC",
    displayName: "GitLab Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "CLOUDFLARE",
    displayName: "Cloudflare Inc",
    countryCode: "US",
    vendorType: "HOSTING",
    isEu: false,
  },
  {
    namePattern: "TWILIO",
    displayName: "Twilio Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "SENDGRID",
    displayName: "SendGrid Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "ZAPIER",
    displayName: "Zapier Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "AIRTABLE",
    displayName: "Airtable Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "MONDAY\\.COM",
    displayName: "Monday.com",
    countryCode: "IL",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "ASANA",
    displayName: "Asana Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
  {
    namePattern: "TRELLO",
    displayName: "Trello Inc",
    countryCode: "US",
    vendorType: "SOFTWARE",
    isEu: false,
  },
]

export async function seedEuVendors() {
  console.log("Seeding EU vendors...")

  for (const vendor of EU_VENDOR_SEED_DATA) {
    await drizzleDb
      .insert(euVendor)
      .values({
        ...vendor,
        confidenceScore: 100,
        isSystem: true,
      })
      .onConflictDoNothing()
  }

  console.log(`Seeded ${EU_VENDOR_SEED_DATA.length} EU vendors`)
}
```

**Step 2: Commit**

```bash
git add src/lib/pausalni/seed-eu-vendors.ts
git commit -m "feat(pausalni): add EU vendor seed data with 50+ vendors"
```

---

### Task 1.4: Create Payment Configuration Constants

**Files:**

- Create: `src/lib/pausalni/constants.ts`

**Step 1: Create constants file**

Create `src/lib/pausalni/constants.ts`:

```typescript
// 2025 Contribution amounts for paušalni obrt
export const DOPRINOSI_2025 = {
  MIO_I: {
    amount: 107.88,
    amountCents: 10788,
    recipientName: "Državni proračun RH",
    iban: "HR1210010051863000160",
    model: "HR68",
    referencePrefix: "8214",
    description: "MIO I. stup",
  },
  MIO_II: {
    amount: 35.96,
    amountCents: 3596,
    recipientName: "Državni proračun RH",
    iban: "HR7610010051700036001",
    model: "HR68",
    referencePrefix: "2046",
    description: "MIO II. stup",
  },
  ZDRAVSTVENO: {
    amount: 118.67,
    amountCents: 11867,
    recipientName: "Državni proračun RH",
    iban: "HR6510010051550100001",
    model: "HR68",
    referencePrefix: "8478",
    description: "Zdravstveno osiguranje",
  },
  TOTAL: 262.51,
} as const

// PDV payment configuration
export const PDV_CONFIG = {
  recipientName: "Državni proračun RH",
  iban: "HR1210010051863000160",
  model: "HR68",
  referencePrefix: "1201",
  rate: 25, // 25% Croatian VAT
} as const

// HOK (Croatian Chamber of Trades) configuration
export const HOK_CONFIG = {
  quarterlyAmount: 34.2,
  recipientName: "Hrvatska obrtnička komora",
  iban: "HR4723400091510533498",
  model: "HR68",
  exemptYears: 2, // First 2 years exempt
} as const

// Deadlines configuration
export const DEADLINES = {
  DOPRINOSI: 15, // 15th of month for previous month
  PDV_FORMS: 20, // 20th of following month
  PDV_PAYMENT: -1, // Last day of following month (use -1 as marker)
  POREZ_Q1: { month: 3, day: 31 },
  POREZ_Q2: { month: 6, day: 30 },
  POREZ_Q3: { month: 9, day: 30 },
  POREZ_Q4: { month: 12, day: 31 },
  PO_SD: { month: 1, day: 15 }, // January 15 for previous year
  DOH: { month: 2, day: 28 }, // February 28 if exceeded threshold
} as const

// VAT threshold for paušalni obrt
export const VAT_THRESHOLD_2025 = 60000 // EUR

// EU country codes for IBAN detection
export const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const

// EU country names in Croatian
export const EU_COUNTRY_NAMES: Record<string, string> = {
  AT: "Austrija",
  BE: "Belgija",
  BG: "Bugarska",
  HR: "Hrvatska",
  CY: "Cipar",
  CZ: "Češka",
  DK: "Danska",
  EE: "Estonija",
  FI: "Finska",
  FR: "Francuska",
  DE: "Njemačka",
  GR: "Grčka",
  HU: "Mađarska",
  IE: "Irska",
  IT: "Italija",
  LV: "Latvija",
  LT: "Litva",
  LU: "Luksemburg",
  MT: "Malta",
  NL: "Nizozemska",
  PL: "Poljska",
  PT: "Portugal",
  RO: "Rumunjska",
  SK: "Slovačka",
  SI: "Slovenija",
  ES: "Španjolska",
  SE: "Švedska",
}

// Obligation type labels in Croatian
export const OBLIGATION_LABELS: Record<string, string> = {
  DOPRINOSI_MIO_I: "Doprinosi MIO I. stup",
  DOPRINOSI_MIO_II: "Doprinosi MIO II. stup",
  DOPRINOSI_ZDRAVSTVENO: "Doprinosi zdravstveno",
  POREZ_DOHODAK: "Porez na dohodak",
  PDV: "PDV",
  HOK: "HOK članarina",
  PO_SD: "PO-SD obrazac",
}

// Month names in Croatian
export const CROATIAN_MONTHS = [
  "siječanj",
  "veljača",
  "ožujak",
  "travanj",
  "svibanj",
  "lipanj",
  "srpanj",
  "kolovoz",
  "rujan",
  "listopad",
  "studeni",
  "prosinac",
] as const

// Get month name in Croatian (genitive case for "za")
export const CROATIAN_MONTHS_GENITIVE = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenog",
  "prosinca",
] as const
```

**Step 2: Commit**

```bash
git add src/lib/pausalni/constants.ts
git commit -m "feat(pausalni): add payment configuration constants for 2025"
```

---

### Task 1.5: Create Obligation Generator Service

**Files:**

- Create: `src/lib/pausalni/obligation-generator.ts`

**Step 1: Create obligation generator**

Create `src/lib/pausalni/obligation-generator.ts`:

```typescript
import { drizzleDb } from "@/lib/db/drizzle"
import {
  paymentObligation,
  pausalniProfile,
  OBLIGATION_TYPES,
  OBLIGATION_STATUS,
} from "@/lib/db/schema/pausalni"
import { DOPRINOSI_2025, DEADLINES, HOK_CONFIG, CROATIAN_MONTHS } from "./constants"
import { eq, and } from "drizzle-orm"

interface GenerateOptions {
  companyId: string
  year: number
  month?: number // If provided, generate only for this month
}

/**
 * Generate all payment obligations for a paušalni obrt company
 */
export async function generateObligations({ companyId, year, month }: GenerateOptions) {
  // Get company's paušalni profile
  const profile = await drizzleDb
    .select()
    .from(pausalniProfile)
    .where(eq(pausalniProfile.companyId, companyId))
    .limit(1)

  const hasProfile = profile.length > 0
  const hasPdvId = hasProfile && profile[0].hasPdvId
  const hokMemberSince = hasProfile ? profile[0].hokMemberSince : null

  const obligations: Array<{
    companyId: string
    obligationType: string
    periodMonth: number
    periodYear: number
    amount: string
    dueDate: string
    status: string
  }> = []

  const months = month ? [month] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  for (const m of months) {
    // Monthly doprinosi (due 15th of current month for previous month)
    const doprinosiDueDate = new Date(year, m - 1, DEADLINES.DOPRINOSI)

    obligations.push({
      companyId,
      obligationType: OBLIGATION_TYPES.DOPRINOSI_MIO_I,
      periodMonth: m === 1 ? 12 : m - 1, // Previous month
      periodYear: m === 1 ? year - 1 : year,
      amount: DOPRINOSI_2025.MIO_I.amount.toFixed(2),
      dueDate: doprinosiDueDate.toISOString().split("T")[0],
      status: OBLIGATION_STATUS.PENDING,
    })

    obligations.push({
      companyId,
      obligationType: OBLIGATION_TYPES.DOPRINOSI_MIO_II,
      periodMonth: m === 1 ? 12 : m - 1,
      periodYear: m === 1 ? year - 1 : year,
      amount: DOPRINOSI_2025.MIO_II.amount.toFixed(2),
      dueDate: doprinosiDueDate.toISOString().split("T")[0],
      status: OBLIGATION_STATUS.PENDING,
    })

    obligations.push({
      companyId,
      obligationType: OBLIGATION_TYPES.DOPRINOSI_ZDRAVSTVENO,
      periodMonth: m === 1 ? 12 : m - 1,
      periodYear: m === 1 ? year - 1 : year,
      amount: DOPRINOSI_2025.ZDRAVSTVENO.amount.toFixed(2),
      dueDate: doprinosiDueDate.toISOString().split("T")[0],
      status: OBLIGATION_STATUS.PENDING,
    })

    // PDV forms and payment (only if has PDV-ID)
    if (hasPdvId) {
      // PDV forms due 20th of following month
      const pdvFormsDueDate = new Date(year, m, DEADLINES.PDV_FORMS)

      // PDV payment due last day of following month
      const pdvPaymentDueDate = new Date(year, m + 1, 0) // Day 0 of next month = last day of current month

      obligations.push({
        companyId,
        obligationType: OBLIGATION_TYPES.PDV,
        periodMonth: m,
        periodYear: year,
        amount: "0.00", // Will be calculated from EU transactions
        dueDate: pdvPaymentDueDate.toISOString().split("T")[0],
        status: OBLIGATION_STATUS.PENDING,
      })
    }
  }

  // Quarterly porez na dohodak
  const quarters = [
    { q: 1, deadline: DEADLINES.POREZ_Q1 },
    { q: 2, deadline: DEADLINES.POREZ_Q2 },
    { q: 3, deadline: DEADLINES.POREZ_Q3 },
    { q: 4, deadline: DEADLINES.POREZ_Q4 },
  ]

  for (const { q, deadline } of quarters) {
    if (!month || (month <= deadline.month && month >= (q - 1) * 3 + 1)) {
      const dueDate = new Date(year, deadline.month - 1, deadline.day)
      obligations.push({
        companyId,
        obligationType: OBLIGATION_TYPES.POREZ_DOHODAK,
        periodMonth: q, // Q1, Q2, Q3, Q4
        periodYear: year,
        amount: "0.00", // Will be calculated based on income bracket
        dueDate: dueDate.toISOString().split("T")[0],
        status: OBLIGATION_STATUS.PENDING,
      })
    }
  }

  // HOK quarterly (if member for > 2 years)
  if (hokMemberSince) {
    const membershipYears =
      (new Date().getTime() - new Date(hokMemberSince).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (membershipYears >= HOK_CONFIG.exemptYears) {
      for (const { q, deadline } of quarters) {
        if (!month || (month <= deadline.month && month >= (q - 1) * 3 + 1)) {
          const dueDate = new Date(year, deadline.month - 1, deadline.day)
          obligations.push({
            companyId,
            obligationType: OBLIGATION_TYPES.HOK,
            periodMonth: q,
            periodYear: year,
            amount: HOK_CONFIG.quarterlyAmount.toFixed(2),
            dueDate: dueDate.toISOString().split("T")[0],
            status: OBLIGATION_STATUS.PENDING,
          })
        }
      }
    }
  }

  // Annual PO-SD (January 15 for previous year)
  if (!month || month === 1) {
    const posdDueDate = new Date(year, DEADLINES.PO_SD.month - 1, DEADLINES.PO_SD.day)
    obligations.push({
      companyId,
      obligationType: OBLIGATION_TYPES.PO_SD,
      periodMonth: 12, // For full previous year
      periodYear: year - 1,
      amount: "0.00", // No payment, just filing
      dueDate: posdDueDate.toISOString().split("T")[0],
      status: OBLIGATION_STATUS.PENDING,
    })
  }

  // Insert obligations (skip if already exist)
  for (const ob of obligations) {
    await drizzleDb.insert(paymentObligation).values(ob).onConflictDoNothing()
  }

  return obligations
}

/**
 * Update obligation statuses based on current date
 */
export async function updateObligationStatuses(companyId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Get all pending obligations
  const pending = await drizzleDb
    .select()
    .from(paymentObligation)
    .where(
      and(
        eq(paymentObligation.companyId, companyId),
        eq(paymentObligation.status, OBLIGATION_STATUS.PENDING)
      )
    )

  for (const ob of pending) {
    const dueDate = new Date(ob.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    let newStatus = ob.status

    if (dueDate < today) {
      newStatus = OBLIGATION_STATUS.OVERDUE
    } else if (dueDate <= threeDaysFromNow) {
      newStatus = OBLIGATION_STATUS.DUE_SOON
    }

    if (newStatus !== ob.status) {
      await drizzleDb
        .update(paymentObligation)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(paymentObligation.id, ob.id))
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/pausalni/obligation-generator.ts
git commit -m "feat(pausalni): add obligation generator service"
```

---

### Task 1.6: Create HUB-3A Barcode Generator

**Files:**

- Create: `src/lib/pausalni/payment-slips/hub3a-generator.ts`

**Step 1: Create HUB-3A generator**

Create `src/lib/pausalni/payment-slips/hub3a-generator.ts`:

```typescript
/**
 * HUB-3A Payment Slip Generator
 * Generates PDF417 barcodes according to Croatian HUB-3A standard
 * Spec: https://www.hub.hr/sites/default/files/inline-files/2dbc_0.pdf
 */

export interface PaymentSlipData {
  // Payer info
  payerName: string
  payerAddress: string
  payerCity: string

  // Recipient info
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientIban: string

  // Payment details
  amount: number // In EUR (e.g., 107.88)
  currency?: string // Default: EUR
  model: string // e.g., "HR68"
  reference: string // e.g., "8214-12345678901"
  purposeCode?: string // Default: "OTHR"
  description: string
}

/**
 * Format data according to HUB-3A specification
 * Each field has specific length limits and must be in correct order
 */
export function formatHub3aData(data: PaymentSlipData): string {
  const currency = data.currency || "EUR"

  // Amount must be 15 digits with 2 decimal places, no separator
  // e.g., 107.88 EUR -> "000000000010788"
  const amountCents = Math.round(data.amount * 100)
  const amountStr = String(amountCents).padStart(15, "0")

  // Build HUB-3A string according to spec
  const lines = [
    "HRVHUB30", // Header (8 chars)
    currency, // Currency (3 chars)
    amountStr, // Amount (15 chars)
    truncate(data.payerName, 30), // Payer name (max 30)
    truncate(data.payerAddress, 27), // Payer address (max 27)
    truncate(data.payerCity, 27), // Payer city (max 27)
    truncate(data.recipientName, 25), // Recipient name (max 25)
    truncate(data.recipientAddress, 25), // Recipient address (max 25)
    truncate(data.recipientCity, 27), // Recipient city (max 27)
    data.recipientIban, // IBAN (21 chars for HR)
    data.model, // Model (4 chars, e.g., "HR68")
    truncate(data.reference, 22), // Reference (max 22)
    data.purposeCode || "OTHR", // Purpose code (4 chars)
    truncate(data.description, 35), // Description (max 35)
  ]

  return lines.join("\n")
}

/**
 * Generate PDF417 barcode as SVG
 */
export async function generateBarcodeSvg(data: PaymentSlipData): Promise<string> {
  // Dynamic import to avoid SSR issues
  const { PDF417 } = await import("pdf417-generator")

  const hub3aString = formatHub3aData(data)

  // Generate barcode
  const barcode = PDF417.encode(hub3aString, {
    columns: 10,
    errorLevel: 5,
  })

  return barcode.toSVG({
    width: 300,
    height: 100,
    color: "#000000",
    backgroundColor: "#ffffff",
  })
}

/**
 * Generate PDF417 barcode as data URL for img src
 */
export async function generateBarcodeDataUrl(data: PaymentSlipData): Promise<string> {
  const svg = await generateBarcodeSvg(data)
  const base64 = Buffer.from(svg).toString("base64")
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Helper to truncate strings to max length
 */
function truncate(str: string, maxLength: number): string {
  if (!str) return ""
  return str.length <= maxLength ? str : str.substring(0, maxLength)
}

/**
 * Generate payment slip for specific obligation type
 */
export function generateDoprinosiSlip(
  type: "MIO_I" | "MIO_II" | "ZDRAVSTVENO",
  oib: string,
  payer: { name: string; address: string; city: string },
  periodMonth: number,
  periodYear: number
): PaymentSlipData {
  const { DOPRINOSI_2025 } = require("../constants")
  const config = DOPRINOSI_2025[type]

  const monthNames = [
    "siječanj",
    "veljača",
    "ožujak",
    "travanj",
    "svibanj",
    "lipanj",
    "srpanj",
    "kolovoz",
    "rujan",
    "listopad",
    "studeni",
    "prosinac",
  ]

  return {
    payerName: payer.name,
    payerAddress: payer.address,
    payerCity: payer.city,
    recipientName: config.recipientName,
    recipientAddress: "Zagreb",
    recipientCity: "10000 Zagreb",
    recipientIban: config.iban,
    amount: config.amount,
    model: config.model,
    reference: `${config.referencePrefix}-${oib}`,
    purposeCode: "OTHR",
    description: `${config.description} ${monthNames[periodMonth - 1]} ${periodYear}`,
  }
}

/**
 * Generate PDV payment slip
 */
export function generatePdvSlip(
  oib: string,
  amount: number,
  payer: { name: string; address: string; city: string },
  periodMonth: number,
  periodYear: number
): PaymentSlipData {
  const { PDV_CONFIG, CROATIAN_MONTHS } = require("../constants")

  return {
    payerName: payer.name,
    payerAddress: payer.address,
    payerCity: payer.city,
    recipientName: PDV_CONFIG.recipientName,
    recipientAddress: "Zagreb",
    recipientCity: "10000 Zagreb",
    recipientIban: PDV_CONFIG.iban,
    amount,
    model: PDV_CONFIG.model,
    reference: `${PDV_CONFIG.referencePrefix}-${oib}`,
    purposeCode: "TAXS",
    description: `PDV za ${CROATIAN_MONTHS[periodMonth - 1]} ${periodYear}`,
  }
}
```

**Step 2: Create index export**

Create `src/lib/pausalni/payment-slips/index.ts`:

```typescript
export * from "./hub3a-generator"
```

**Step 3: Commit**

```bash
git add src/lib/pausalni/payment-slips/
git commit -m "feat(pausalni): add HUB-3A barcode generator"
```

---

### Task 1.7: Create Paušalni Profile API Routes

**Files:**

- Create: `src/app/api/pausalni/profile/route.ts`

**Step 1: Create profile API**

Create `src/app/api/pausalni/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { drizzleDb } from "@/lib/db/drizzle"
import { pausalniProfile } from "@/lib/db/schema/pausalni"
import { eq } from "drizzle-orm"
import { getCurrentCompany } from "@/lib/company"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    // Check if company is paušalni obrt
    if (company.legalForm !== "OBRT_PAUSAL") {
      return NextResponse.json({ error: "Not a paušalni obrt" }, { status: 400 })
    }

    // Get or create profile
    let profile = await drizzleDb
      .select()
      .from(pausalniProfile)
      .where(eq(pausalniProfile.companyId, company.id))
      .limit(1)

    if (profile.length === 0) {
      // Create default profile
      const newProfile = await drizzleDb
        .insert(pausalniProfile)
        .values({
          companyId: company.id,
          hasPdvId: false,
          euActive: false,
          tourismActivity: false,
        })
        .returning()

      profile = newProfile
    }

    return NextResponse.json({ profile: profile[0] })
  } catch (error) {
    console.error("Error fetching paušalni profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    if (company.legalForm !== "OBRT_PAUSAL") {
      return NextResponse.json({ error: "Not a paušalni obrt" }, { status: 400 })
    }

    const body = await request.json()
    const { hasPdvId, pdvId, pdvIdSince, euActive, hokMemberSince, tourismActivity } = body

    // Validate PDV-ID format if provided
    if (pdvId && !/^HR\d{11}$/.test(pdvId)) {
      return NextResponse.json(
        { error: "Invalid PDV-ID format. Expected: HR + 11 digits" },
        { status: 400 }
      )
    }

    const updated = await drizzleDb
      .update(pausalniProfile)
      .set({
        hasPdvId: hasPdvId ?? false,
        pdvId: hasPdvId ? pdvId : null,
        pdvIdSince: hasPdvId && pdvIdSince ? new Date(pdvIdSince) : null,
        euActive: euActive ?? false,
        hokMemberSince: hokMemberSince ? new Date(hokMemberSince) : null,
        tourismActivity: tourismActivity ?? false,
        updatedAt: new Date(),
      })
      .where(eq(pausalniProfile.companyId, company.id))
      .returning()

    if (updated.length === 0) {
      // Create if doesn't exist
      const created = await drizzleDb
        .insert(pausalniProfile)
        .values({
          companyId: company.id,
          hasPdvId: hasPdvId ?? false,
          pdvId: hasPdvId ? pdvId : null,
          pdvIdSince: hasPdvId && pdvIdSince ? new Date(pdvIdSince) : null,
          euActive: euActive ?? false,
          hokMemberSince: hokMemberSince ? new Date(hokMemberSince) : null,
          tourismActivity: tourismActivity ?? false,
        })
        .returning()

      return NextResponse.json({ profile: created[0] })
    }

    return NextResponse.json({ profile: updated[0] })
  } catch (error) {
    console.error("Error updating paušalni profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/pausalni/profile/route.ts
git commit -m "feat(api): add paušalni profile endpoints"
```

---

### Task 1.8: Create Obligations API Routes

**Files:**

- Create: `src/app/api/pausalni/obligations/route.ts`

**Step 1: Create obligations API**

Create `src/app/api/pausalni/obligations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { drizzleDb } from "@/lib/db/drizzle"
import { paymentObligation, OBLIGATION_STATUS } from "@/lib/db/schema/pausalni"
import { eq, and, gte, lte, desc } from "drizzle-orm"
import { getCurrentCompany } from "@/lib/company"
import { generateObligations, updateObligationStatuses } from "@/lib/pausalni/obligation-generator"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined

    // Update statuses first
    await updateObligationStatuses(company.id)

    // Build query conditions
    const conditions = [eq(paymentObligation.companyId, company.id)]

    if (status) {
      conditions.push(eq(paymentObligation.status, status))
    }

    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1)
      const endDate = new Date(year, month ? month : 12, 0)
      conditions.push(gte(paymentObligation.dueDate, startDate.toISOString().split("T")[0]))
      conditions.push(lte(paymentObligation.dueDate, endDate.toISOString().split("T")[0]))
    }

    const obligations = await drizzleDb
      .select()
      .from(paymentObligation)
      .where(and(...conditions))
      .orderBy(desc(paymentObligation.dueDate))

    // Calculate summary
    const summary = {
      totalPending: 0,
      totalDueSoon: 0,
      totalOverdue: 0,
      totalPaid: 0,
      amountPending: 0,
      amountDueSoon: 0,
      amountOverdue: 0,
      amountPaid: 0,
    }

    for (const ob of obligations) {
      const amount = parseFloat(ob.amount)
      switch (ob.status) {
        case OBLIGATION_STATUS.PENDING:
          summary.totalPending++
          summary.amountPending += amount
          break
        case OBLIGATION_STATUS.DUE_SOON:
          summary.totalDueSoon++
          summary.amountDueSoon += amount
          break
        case OBLIGATION_STATUS.OVERDUE:
          summary.totalOverdue++
          summary.amountOverdue += amount
          break
        case OBLIGATION_STATUS.PAID:
          summary.totalPaid++
          summary.amountPaid += amount
          break
      }
    }

    return NextResponse.json({ obligations, summary })
  } catch (error) {
    console.error("Error fetching obligations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    const body = await request.json()
    const { year, month } = body

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 })
    }

    // Generate obligations
    const obligations = await generateObligations({
      companyId: company.id,
      year,
      month,
    })

    return NextResponse.json({
      message: `Generated ${obligations.length} obligations`,
      count: obligations.length,
    })
  } catch (error) {
    console.error("Error generating obligations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 2: Create mark-paid endpoint**

Create `src/app/api/pausalni/obligations/[id]/mark-paid/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { drizzleDb } from "@/lib/db/drizzle"
import { paymentObligation, OBLIGATION_STATUS } from "@/lib/db/schema/pausalni"
import { eq, and } from "drizzle-orm"
import { getCurrentCompany } from "@/lib/company"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    const body = await request.json()
    const { paidDate, paidAmount, notes } = body

    const updated = await drizzleDb
      .update(paymentObligation)
      .set({
        status: OBLIGATION_STATUS.PAID,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        paidAmount: paidAmount?.toString(),
        matchType: "MANUAL",
        notes,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentObligation.id, params.id), eq(paymentObligation.companyId, company.id)))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json({ error: "Obligation not found" }, { status: 404 })
    }

    return NextResponse.json({ obligation: updated[0] })
  } catch (error) {
    console.error("Error marking obligation as paid:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/pausalni/obligations/
git commit -m "feat(api): add obligations API endpoints"
```

---

### Task 1.9: Create Payment Slip API Route

**Files:**

- Create: `src/app/api/pausalni/payment-slip/route.ts`

**Step 1: Create payment slip API**

Create `src/app/api/pausalni/payment-slip/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCompany } from "@/lib/company"
import {
  generateDoprinosiSlip,
  generatePdvSlip,
  generateBarcodeDataUrl,
  formatHub3aData,
} from "@/lib/pausalni/payment-slips"
import { DOPRINOSI_2025, PDV_CONFIG, HOK_CONFIG } from "@/lib/pausalni/constants"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") // MIO_I, MIO_II, ZDRAVSTVENO, PDV, HOK
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
    const amount = searchParams.get("amount") ? parseFloat(searchParams.get("amount")!) : undefined

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    const payer = {
      name: company.name,
      address: company.address || "",
      city: company.city || "",
    }

    let slipData

    switch (type) {
      case "MIO_I":
      case "MIO_II":
      case "ZDRAVSTVENO":
        slipData = generateDoprinosiSlip(type, company.oib, payer, month, year)
        break

      case "PDV":
        if (amount === undefined) {
          return NextResponse.json({ error: "Amount is required for PDV" }, { status: 400 })
        }
        slipData = generatePdvSlip(company.oib, amount, payer, month, year)
        break

      case "HOK":
        slipData = {
          payerName: payer.name,
          payerAddress: payer.address,
          payerCity: payer.city,
          recipientName: HOK_CONFIG.recipientName,
          recipientAddress: "Zagreb",
          recipientCity: "10000 Zagreb",
          recipientIban: HOK_CONFIG.iban,
          amount: HOK_CONFIG.quarterlyAmount,
          model: HOK_CONFIG.model,
          reference: company.oib, // HOK uses OIB directly
          purposeCode: "OTHR",
          description: `HOK članarina Q${Math.ceil(month / 3)} ${year}`,
        }
        break

      default:
        return NextResponse.json({ error: "Invalid payment type" }, { status: 400 })
    }

    // Generate barcode
    const barcodeDataUrl = await generateBarcodeDataUrl(slipData)
    const hub3aString = formatHub3aData(slipData)

    return NextResponse.json({
      slip: slipData,
      barcode: barcodeDataUrl,
      hub3aData: hub3aString,
    })
  } catch (error) {
    console.error("Error generating payment slip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Batch endpoint for all monthly doprinosi
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany()
    if (!company) {
      return NextResponse.json({ error: "No company selected" }, { status: 400 })
    }

    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 })
    }

    const payer = {
      name: company.name,
      address: company.address || "",
      city: company.city || "",
    }

    const slips = []

    for (const type of ["MIO_I", "MIO_II", "ZDRAVSTVENO"] as const) {
      const slipData = generateDoprinosiSlip(type, company.oib, payer, month, year)
      const barcodeDataUrl = await generateBarcodeDataUrl(slipData)

      slips.push({
        type,
        slip: slipData,
        barcode: barcodeDataUrl,
      })
    }

    return NextResponse.json({
      slips,
      totalAmount: DOPRINOSI_2025.TOTAL,
    })
  } catch (error) {
    console.error("Error generating batch payment slips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/pausalni/payment-slip/route.ts
git commit -m "feat(api): add payment slip generation endpoint"
```

---

### Task 1.10: Create Payment Dashboard Page

**Files:**

- Create: `src/app/(dashboard)/pausalni/page.tsx`

**Step 1: Create dashboard page**

Create `src/app/(dashboard)/pausalni/page.tsx`:

```typescript
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCompany } from "@/lib/company"
import { ObligationTimeline } from "@/components/pausalni/obligation-timeline"

export const metadata: Metadata = {
  title: "Paušalni Compliance Hub | FiskAI",
  description: "Upravljajte svim obvezama vašeg paušalnog obrta na jednom mjestu",
}

export default async function PausalniDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const company = await getCurrentCompany()
  if (!company) {
    redirect("/onboarding")
  }

  if (company.legalForm !== "OBRT_PAUSAL") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paušalni Compliance Hub</h1>
          <p className="text-muted-foreground">
            Sve obveze vašeg paušalnog obrta na jednom mjestu
          </p>
        </div>
      </div>

      <ObligationTimeline companyId={company.id} />
    </div>
  )
}
```

**Step 2: Create ObligationTimeline component**

Create `src/components/pausalni/obligation-timeline.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  ChevronRight,
  Loader2
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PaymentSlipModal } from "./payment-slip-modal"
import { OBLIGATION_LABELS, CROATIAN_MONTHS } from "@/lib/pausalni/constants"

interface Obligation {
  id: string
  obligationType: string
  periodMonth: number
  periodYear: number
  amount: string
  dueDate: string
  status: string
  paidDate: string | null
  matchType: string | null
}

interface Summary {
  totalPending: number
  totalDueSoon: number
  totalOverdue: number
  totalPaid: number
  amountPending: number
  amountDueSoon: number
  amountOverdue: number
  amountPaid: number
}

interface Props {
  companyId: string
}

export function ObligationTimeline({ companyId }: Props) {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    fetchObligations()
  }, [])

  async function fetchObligations() {
    try {
      const res = await fetch("/api/pausalni/obligations")
      const data = await res.json()
      setObligations(data.obligations || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch obligations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PAID":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "DUE_SOON":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "OVERDUE":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Calendar className="h-5 w-5 text-muted-foreground" />
    }
  }

  function getStatusBadge(status: string, dueDate: string) {
    const due = new Date(dueDate)
    const today = new Date()
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    switch (status) {
      case "PAID":
        return <Badge variant="default" className="bg-green-500">Plaćeno</Badge>
      case "DUE_SOON":
        return <Badge variant="warning">Za {daysUntil} dana</Badge>
      case "OVERDUE":
        return <Badge variant="destructive">Prošao rok!</Badge>
      default:
        return <Badge variant="secondary">Za {daysUntil} dana</Badge>
    }
  }

  function groupObligationsByMonth(obligations: Obligation[]) {
    const grouped: Record<string, Obligation[]> = {}

    for (const ob of obligations) {
      const dueDate = new Date(ob.dueDate)
      const key = `${dueDate.getFullYear()}-${dueDate.getMonth()}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(ob)
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, obs]) => {
        const [year, month] = key.split("-").map(Number)
        return {
          year,
          month,
          label: `${CROATIAN_MONTHS[month].charAt(0).toUpperCase() + CROATIAN_MONTHS[month].slice(1)} ${year}`,
          obligations: obs.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
        }
      })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const groupedObligations = groupObligationsByMonth(obligations)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Za platiti</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.amountPending + summary.amountDueSoon)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uskoro dospijeva</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.amountDueSoon)}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prekoračeno</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.amountOverdue)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plaćeno</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.amountPaid)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pregled obveza
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedObligations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nema obveza za prikaz. Kliknite ispod za generiranje.
            </p>
          ) : (
            <div className="space-y-8">
              {groupedObligations.map(({ label, obligations: monthObs }) => (
                <div key={label}>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {label}
                  </h3>
                  <div className="space-y-3 ml-6 border-l-2 border-muted pl-6">
                    {monthObs.map((ob) => (
                      <div
                        key={ob.id}
                        className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                          ob.status === "OVERDUE"
                            ? "bg-red-500/10"
                            : ob.status === "DUE_SOON"
                            ? "bg-amber-500/10"
                            : ob.status === "PAID"
                            ? "bg-green-500/5"
                            : "bg-muted/30"
                        }`}
                      >
                        <div className="mt-0.5">{getStatusIcon(ob.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {OBLIGATION_LABELS[ob.obligationType] || ob.obligationType}
                            </span>
                            {getStatusBadge(ob.status, ob.dueDate)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Rok: {new Date(ob.dueDate).toLocaleDateString("hr-HR")}
                            {ob.status === "PAID" && ob.paidDate && (
                              <> • Plaćeno {new Date(ob.paidDate).toLocaleDateString("hr-HR")}</>
                            )}
                            {ob.matchType === "AUTO" && (
                              <> • <span className="text-green-600">Auto-matched</span></>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(parseFloat(ob.amount))}</p>
                          {ob.status !== "PAID" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1"
                              onClick={() => {
                                setSelectedObligation(ob)
                                setShowPaymentModal(true)
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Uplatnica
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Slip Modal */}
      {showPaymentModal && selectedObligation && (
        <PaymentSlipModal
          obligation={selectedObligation}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedObligation(null)
          }}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/pausalni/page.tsx src/components/pausalni/obligation-timeline.tsx
git commit -m "feat(ui): add paušalni dashboard with obligation timeline"
```

---

### Task 1.11: Create Payment Slip Modal Component

**Files:**

- Create: `src/components/pausalni/payment-slip-modal.tsx`

**Step 1: Create modal component**

Create `src/components/pausalni/payment-slip-modal.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, Copy, Mail, Check } from "lucide-react"
import { OBLIGATION_LABELS, CROATIAN_MONTHS } from "@/lib/pausalni/constants"

interface Obligation {
  id: string
  obligationType: string
  periodMonth: number
  periodYear: number
  amount: string
  dueDate: string
}

interface PaymentSlip {
  payerName: string
  payerAddress: string
  payerCity: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientIban: string
  amount: number
  model: string
  reference: string
  description: string
}

interface Props {
  obligation: Obligation
  onClose: () => void
}

export function PaymentSlipModal({ obligation, onClose }: Props) {
  const [slip, setSlip] = useState<PaymentSlip | null>(null)
  const [barcode, setBarcode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPaymentSlip()
  }, [obligation])

  async function fetchPaymentSlip() {
    try {
      // Map obligation type to payment slip type
      const typeMap: Record<string, string> = {
        DOPRINOSI_MIO_I: "MIO_I",
        DOPRINOSI_MIO_II: "MIO_II",
        DOPRINOSI_ZDRAVSTVENO: "ZDRAVSTVENO",
        PDV: "PDV",
        HOK: "HOK",
      }

      const slipType = typeMap[obligation.obligationType]
      if (!slipType) {
        console.error("Unknown obligation type:", obligation.obligationType)
        return
      }

      const params = new URLSearchParams({
        type: slipType,
        month: String(obligation.periodMonth),
        year: String(obligation.periodYear),
      })

      if (slipType === "PDV") {
        params.set("amount", obligation.amount)
      }

      const res = await fetch(`/api/pausalni/payment-slip?${params}`)
      const data = await res.json()

      setSlip(data.slip)
      setBarcode(data.barcode)
    } catch (error) {
      console.error("Failed to fetch payment slip:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!slip) return

    const text = `Primatelj: ${slip.recipientName}
IBAN: ${slip.recipientIban}
Model: ${slip.model}
Poziv na broj: ${slip.reference}
Iznos: ${slip.amount.toFixed(2)} EUR
Opis: ${slip.description}`

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {OBLIGATION_LABELS[obligation.obligationType] || obligation.obligationType}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {CROATIAN_MONTHS[obligation.periodMonth - 1]} {obligation.periodYear}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : slip ? (
          <div className="space-y-4">
            {/* Payment Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primatelj:</span>
                <span className="font-medium">{slip.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IBAN:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{slip.recipientIban}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{slip.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poziv na broj:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{slip.reference}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iznos:</span>
                <span className="font-bold text-lg">{slip.amount.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opis:</span>
                <span className="text-right max-w-[200px]">{slip.description}</span>
              </div>
            </div>

            {/* Barcode */}
            {barcode && (
              <div className="border rounded-lg p-4 bg-white">
                <img
                  src={barcode}
                  alt="HUB-3A Barcode"
                  className="w-full h-auto"
                />
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Skenirajte s mBanking aplikacijom
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Kopirano!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiraj
                  </>
                )}
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nije moguće generirati uplatnicu
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Create index export**

Create `src/components/pausalni/index.ts`:

```typescript
export * from "./obligation-timeline"
export * from "./payment-slip-modal"
```

**Step 3: Commit**

```bash
git add src/components/pausalni/
git commit -m "feat(ui): add payment slip modal with HUB-3A barcode"
```

---

### Task 1.12: Add Paušalni Navigation Link

**Files:**

- Modify: `src/lib/navigation.ts`

**Step 1: Find and add navigation link**

Add to the navigation config in `src/lib/navigation.ts` (in the appropriate section for OBRT_PAUSAL):

```typescript
{
  title: "Paušalni Hub",
  href: "/pausalni",
  icon: Calculator,
  showFor: ["OBRT_PAUSAL"],
}
```

**Step 2: Commit**

```bash
git add src/lib/navigation.ts
git commit -m "feat(nav): add Paušalni Hub link for paušalni obrt users"
```

---

## Phase 1 Complete Checkpoint

At this point, Phase 1 (Foundation) is complete. Verify by:

1. Run `npm run build` - should pass
2. Run `npm run db:migrate` - migrations applied
3. Navigate to `/pausalni` as a paušalni obrt user - should see dashboard
4. Generate obligations for 2025
5. Click any obligation to see payment slip with barcode

---

## Phase 2: EU Transaction Detection

### Task 2.1: Create EU Detection Service

**Files:**

- Create: `src/lib/pausalni/eu-detection.ts`

**Step 1: Create EU detection service**

Create `src/lib/pausalni/eu-detection.ts`:

```typescript
import { drizzleDb } from "@/lib/db/drizzle"
import { euVendor, euTransaction } from "@/lib/db/schema/pausalni"
import { EU_COUNTRY_CODES, PDV_CONFIG } from "./constants"
import { like, eq } from "drizzle-orm"

export interface EuDetectionResult {
  isEu: boolean
  country: string | null
  countryName: string | null
  vendor: {
    id: string
    displayName: string
    vendorType: string
  } | null
  confidence: number
  detectionMethod: "IBAN" | "VENDOR_DB" | "USER_CONFIRMED" | "UNKNOWN"
  requiresUserConfirmation: boolean
}

interface BankTransaction {
  id: string
  counterpartyName: string | null
  counterpartyIban: string | null
  amount: number
  transactionDate: Date
}

/**
 * Detect if a bank transaction is an EU transaction requiring PDV reporting
 */
export async function detectEuTransaction(tx: BankTransaction): Promise<EuDetectionResult> {
  // Layer 1: IBAN Analysis
  if (tx.counterpartyIban) {
    const ibanCountry = tx.counterpartyIban.substring(0, 2).toUpperCase()

    // Skip Croatian IBANs
    if (ibanCountry === "HR") {
      return {
        isEu: false,
        country: "HR",
        countryName: "Hrvatska",
        vendor: null,
        confidence: 100,
        detectionMethod: "IBAN",
        requiresUserConfirmation: false,
      }
    }

    // Check if EU country
    if (EU_COUNTRY_CODES.includes(ibanCountry as any)) {
      const { EU_COUNTRY_NAMES } = await import("./constants")
      return {
        isEu: true,
        country: ibanCountry,
        countryName: EU_COUNTRY_NAMES[ibanCountry] || ibanCountry,
        vendor: null,
        confidence: 95,
        detectionMethod: "IBAN",
        requiresUserConfirmation: false,
      }
    }
  }

  // Layer 2: Vendor Database Matching
  if (tx.counterpartyName) {
    const normalizedName = tx.counterpartyName.toUpperCase().trim()

    // Fetch all vendors and match against patterns
    const vendors = await drizzleDb.select().from(euVendor)

    for (const vendor of vendors) {
      const pattern = new RegExp(vendor.namePattern, "i")
      if (pattern.test(normalizedName)) {
        const { EU_COUNTRY_NAMES } = await import("./constants")
        return {
          isEu: vendor.isEu,
          country: vendor.countryCode,
          countryName: EU_COUNTRY_NAMES[vendor.countryCode] || vendor.countryCode,
          vendor: {
            id: vendor.id,
            displayName: vendor.displayName,
            vendorType: vendor.vendorType,
          },
          confidence: vendor.confidenceScore,
          detectionMethod: "VENDOR_DB",
          requiresUserConfirmation: false,
        }
      }
    }
  }

  // Layer 3: Unknown - needs user confirmation if looks foreign
  const looksLikeForeign =
    tx.counterpartyName &&
    (/\b(LTD|LIMITED|INC|GMBH|B\.?V\.?|S\.?A\.?|PTY|LLC)\b/i.test(tx.counterpartyName) ||
      /[A-Z]{2}\d{10,}/.test(tx.counterpartyIban || "")) // Non-HR IBAN pattern

  return {
    isEu: false,
    country: null,
    countryName: null,
    vendor: null,
    confidence: 0,
    detectionMethod: "UNKNOWN",
    requiresUserConfirmation: looksLikeForeign,
  }
}

/**
 * Process bank transactions and create EU transaction records
 */
export async function processTransactionsForEu(
  companyId: string,
  transactions: BankTransaction[]
): Promise<{
  detected: number
  needsConfirmation: number
  skipped: number
}> {
  let detected = 0
  let needsConfirmation = 0
  let skipped = 0

  for (const tx of transactions) {
    // Skip incoming transactions (we're looking for services we PAID FOR)
    if (tx.amount > 0) {
      skipped++
      continue
    }

    const result = await detectEuTransaction(tx)

    if (result.isEu) {
      // Create EU transaction record
      const txDate = new Date(tx.transactionDate)
      const pdvAmount = Math.abs(tx.amount) * (PDV_CONFIG.rate / 100)

      await drizzleDb
        .insert(euTransaction)
        .values({
          companyId,
          bankTransactionId: tx.id,
          direction: "RECEIVED", // We received the service (outgoing payment)
          counterpartyName: tx.counterpartyName,
          counterpartyCountry: result.country,
          transactionDate: tx.transactionDate,
          amount: String(Math.abs(tx.amount)),
          pdvRate: String(PDV_CONFIG.rate),
          pdvAmount: String(pdvAmount),
          reportingMonth: txDate.getMonth() + 1,
          reportingYear: txDate.getFullYear(),
          vendorId: result.vendor?.id,
          detectionMethod: result.detectionMethod,
          confidenceScore: result.confidence,
          userConfirmed: false,
        })
        .onConflictDoNothing()

      detected++
    } else if (result.requiresUserConfirmation) {
      needsConfirmation++
    } else {
      skipped++
    }
  }

  return { detected, needsConfirmation, skipped }
}

/**
 * User confirms a transaction as EU (learns vendor)
 */
export async function confirmEuTransaction(
  transactionId: string,
  isEu: boolean,
  country?: string,
  vendorName?: string
): Promise<void> {
  if (isEu && vendorName && country) {
    // Learn this vendor for future detection
    await drizzleDb
      .insert(euVendor)
      .values({
        namePattern: vendorName.toUpperCase().replace(/[^A-Z0-9\s]/g, ".*"),
        displayName: vendorName,
        countryCode: country,
        vendorType: "OTHER",
        isEu: true,
        confidenceScore: 80, // Lower confidence for learned vendors
        isSystem: false,
      })
      .onConflictDoNothing()
  }

  // Update the EU transaction record
  await drizzleDb
    .update(euTransaction)
    .set({
      userConfirmed: true,
      counterpartyCountry: country,
    })
    .where(eq(euTransaction.id, transactionId))
}
```

**Step 2: Commit**

```bash
git add src/lib/pausalni/eu-detection.ts
git commit -m "feat(pausalni): add EU transaction detection service"
```

---

## Remaining Tasks (Summary)

Due to plan length, remaining tasks are outlined:

### Phase 2 (continued):

- **Task 2.2**: EU Transactions API Route
- **Task 2.3**: EU Transaction Review UI Component
- **Task 2.4**: PDV Form Generator (XML)
- **Task 2.5**: PDV-S Form Generator (XML)
- **Task 2.6**: ZP Form Generator (XML)
- **Task 2.7**: Form Generation API Routes
- **Task 2.8**: Form Generation History Page

### Phase 3: Automation

- **Task 3.1**: Bank Sync Payment Matcher
- **Task 3.2**: Enhanced Deadline Reminder Cron
- **Task 3.3**: ICS Calendar Export
- **Task 3.4**: Google Calendar Sync

### Phase 4: Polish

- **Task 4.1**: Upgrade DeadlineCalendar to Database-Driven
- **Task 4.2**: Notification Preferences UI
- **Task 4.3**: Annual PO-SD Wizard
- **Task 4.4**: Batch Operations UI

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run build` passes
- [ ] All migrations applied successfully
- [ ] Paušalni users see Compliance Hub in navigation
- [ ] Obligations generate correctly for 2025
- [ ] Payment slips show correct HUB-3A barcodes
- [ ] EU transactions detected from bank sync
- [ ] PDV/PDV-S/ZP forms generate as XML
- [ ] Calendar exports work (ICS)
- [ ] Google Calendar sync works
- [ ] Email reminders send correctly

---

## NPM Scripts to Add

Add to `package.json`:

```json
{
  "scripts": {
    "seed:eu-vendors": "tsx src/lib/pausalni/seed-eu-vendors.ts"
  }
}
```
