# Data & API

[← Back to Index](./00-INDEX.md)

---

## 13. Monetization & Pricing

### 13.1 Tier Structure

| Tier           | Price     | Status     | Includes                                                                 |
| -------------- | --------- | ---------- | ------------------------------------------------------------------------ |
| **Free**       | 0 EUR     | ✅ Active  | Invoicing, Contacts, Products, Expenses, Basic Reports, Documents        |
| **Paušalni**   | 9 EUR/mo  | ✅ Active  | Free + Paušalni module, Contributions tracking, Banking                  |
| **Pro**        | 19 EUR/mo | ✅ Active  | Paušalni + Fiscalization, Reconciliation, Advanced Reports, AI Assistant |
| **Business**   | 39 EUR/mo | ⚠️ Planned | Pro + VAT, Corporate Tax, Multi-user                                     |
| **Enterprise** | Custom    | ⚠️ Planned | Business + Staff assignments, Custom integrations                        |

**Note:** Business and Enterprise tiers are planned but not yet available in Stripe. Current production supports Free, Paušalni, and Pro.

### 13.2 Module-to-Tier Mapping

| Module           | Free | Paušalni | Pro | Business | Enterprise |
| ---------------- | ---- | -------- | --- | -------- | ---------- |
| invoicing        | ✅   | ✅       | ✅  | ✅       | ✅         |
| e-invoicing      | ✅   | ✅       | ✅  | ✅       | ✅         |
| contacts         | ✅   | ✅       | ✅  | ✅       | ✅         |
| products         | ✅   | ✅       | ✅  | ✅       | ✅         |
| expenses         | ✅   | ✅       | ✅  | ✅       | ✅         |
| banking          | ❌   | ✅       | ✅  | ✅       | ✅         |
| documents        | ✅   | ✅       | ✅  | ✅       | ✅         |
| reports-basic    | ✅   | ✅       | ✅  | ✅       | ✅         |
| pausalni         | ❌   | ✅       | ❌  | ❌       | ✅         |
| fiscalization    | ❌   | ❌       | ✅  | ✅       | ✅         |
| reconciliation   | ❌   | ❌       | ✅  | ✅       | ✅         |
| reports-advanced | ❌   | ❌       | ✅  | ✅       | ✅         |
| vat              | ❌   | ❌       | ❌  | ✅       | ✅         |
| corporate-tax    | ❌   | ❌       | ❌  | ✅       | ✅         |
| ai-assistant     | ❌   | ❌       | ❌  | ✅       | ✅         |
| pos              | ❌   | ❌       | ❌  | ❌       | ✅         |

### 13.3 Stripe Integration

| Feature           | Implementation                    |
| ----------------- | --------------------------------- |
| Checkout          | `/api/billing/checkout`           |
| Customer Portal   | `/api/billing/portal`             |
| Webhooks          | `/api/billing/webhook`            |
| Subscription Sync | `stripeSubscriptionId` on Company |

---

## 14. Implementation Status Matrix

### 14.1 Can We Serve These Scenarios?

| #     | Scenario            | Status | Blockers                  |
| ----- | ------------------- | ------ | ------------------------- |
| 1     | Paušalni, no cash   | ✅ YES | None                      |
| 2     | Paušalni, with cash | ⚠️ 60% | Fiscalization polish      |
| 3-4   | Paušalni, VAT       | ⚠️ 40% | PDV forms                 |
| 5-8   | Obrt Real           | ❌ NO  | KPI, URA/IRA, Assets      |
| 9-12  | Obrt VAT            | ❌ NO  | KPI, URA/IRA, Assets, PDV |
| 13-16 | j.d.o.o.            | ❌ NO  | URA/IRA, Assets, full PDV |
| 17-20 | d.o.o.              | ❌ NO  | URA/IRA, Assets, full PDV |

### 14.2 Module Completion Status

| Module           | Status | Notes                          |
| ---------------- | ------ | ------------------------------ |
| Invoicing        | 80%    | Polish remaining               |
| E-Invoicing      | 90%    | Production ready               |
| Contacts         | 95%    | Minor UX fixes                 |
| Products         | 90%    | Import wizard needed           |
| Expenses         | 85%    | Receipt scanner polish         |
| Banking          | 75%    | Reconciliation AI needed       |
| Documents        | 80%    | Archive complete               |
| Reports Basic    | 90%    | KPR complete                   |
| Reports Advanced | 40%    | PDV/URA/IRA incomplete         |
| Pausalni         | 95%    | Production ready               |
| Fiscalization    | 60%    | FINA cert upload needed        |
| VAT              | 40%    | Forms incomplete               |
| Corporate Tax    | 10%    | Just calculations              |
| AI Assistant     | 70%    | Chat works, extraction partial |
| POS              | 30%    | Stripe Terminal WIP            |
| JOPPD            | 0%     | Not started                    |
| Assets (DI)      | 0%     | Not started                    |
| KPI              | 0%     | Not started                    |
| URA/IRA          | 30%    | Partial implementation         |

### 14.3 Development Priorities

**Tier 1 (Launch for Paušalni):**

- [ ] Fiscalization polish (60% → 90%)
- [ ] Payment Hub3 generator
- [ ] HOK/contribution reminders

**Tier 2 (Unlock Obrt Dohodak):**

- [ ] KPI module
- [ ] URA/IRA reports
- [ ] Assets (DI) module

**Tier 3 (Full D.O.O.):**

- [ ] Complete PDV forms
- [ ] Enhanced URA/IRA
- [ ] Corporate tax calculation

**Tier 4 (Premium):**

- [ ] JOPPD (Payroll)
- [ ] Travel/Locco
- [ ] Advanced analytics

---

## 15. Data Models

### 15.1 Core Models

```prisma
model User {
  id           String      @id
  email        String      @unique
  name         String?
  systemRole   SystemRole  @default(USER)  // USER, STAFF, ADMIN
  companies    CompanyUser[]
}

model Company {
  id               String    @id
  name             String
  oib              String    @unique
  legalForm        LegalForm // OBRT_PAUSAL, OBRT_REAL, OBRT_VAT, JDOO, DOO
  isVatPayer       Boolean   @default(false)
  vatNumber        String?   // HR + OIB if VAT payer
  address          String
  postalCode       String
  city             String
  email            String
  phone            String?
  iban             String
  entitlements     Json      // ["invoicing", "e-invoicing", ...]
  featureFlags     Json      // { competence: "beginner", ... }
  eInvoiceProvider String?   // "ie-racuni", "fina", "mock"
  fiscalEnabled    Boolean   @default(false)
  users            CompanyUser[]
  invoices         EInvoice[]
  contacts         Contact[]
  products         Product[]
  expenses         Expense[]
  // ... more relations
}

model CompanyUser {
  id        String  @id
  userId    String
  companyId String
  role      Role    // OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER
  isDefault Boolean @default(false)
}
```

### 15.2 Invoice Model

**From `/prisma/schema.prisma`:**

```prisma
model EInvoice {
  id                String            @id @default(cuid())
  companyId         String
  direction         EInvoiceDirection // OUTBOUND, INBOUND
  sellerId          String?
  buyerId           String?
  invoiceNumber     String
  issueDate         DateTime
  dueDate           DateTime?
  currency          String            @default("EUR")
  buyerReference    String?
  netAmount         Decimal           @db.Decimal(10, 2)
  vatAmount         Decimal           @db.Decimal(10, 2)
  totalAmount       Decimal           @db.Decimal(10, 2)
  status            EInvoiceStatus    @default(DRAFT)
  jir               String?
  zki               String?
  fiscalizedAt      DateTime?
  ublXml            String?
  providerRef       String?
  providerStatus    String?
  providerError     String?
  archivedAt        DateTime?
  archiveRef        String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  sentAt            DateTime?
  receivedAt        DateTime?
  type              InvoiceType       @default(E_INVOICE)
  internalReference String?
  notes             String?
  convertedFromId   String?
  paidAt            DateTime?
  bankAccount       String?
  includeBarcode    Boolean           @default(true)
  importJobId       String?           @unique
  paymentModel      String?
  paymentReference  String?
  vendorBankName    String?
  vendorIban        String?
  fiscalStatus      String?
}

enum EInvoiceDirection {
  OUTBOUND
  INBOUND
}

enum EInvoiceStatus {
  DRAFT
  PENDING_FISCALIZATION
  FISCALIZED
  SENT
  DELIVERED
  ACCEPTED
  REJECTED
  ARCHIVED
  ERROR
}

enum InvoiceType {
  INVOICE
  E_INVOICE
  QUOTE
  PROFORMA
  CREDIT_NOTE
  DEBIT_NOTE
}
```

### 15.3 Drizzle ORM Models

These tables are managed by Drizzle (not Prisma) for performance-critical or newer features.

**Location:** `/src/lib/db/schema/`

| Schema File     | Tables                                                                                                               | Purpose                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `guidance.ts`   | `user_guidance_preferences`, `checklist_interactions`                                                                | User competence levels, setup progress |
| `pausalni.ts`   | `pausalni_profile`, `eu_vendor`, `eu_transaction`, `payment_obligation`, `generated_form`, `notification_preference` | Paušalni compliance hub                |
| `news.ts`       | `news_sources`, `news_items`, `news_posts`, `news_categories`, `news_tags`, `news_post_sources`                      | News aggregation system                |
| `newsletter.ts` | `newsletter_subscriptions`                                                                                           | Newsletter subscribers                 |
| `deadlines.ts`  | `compliance_deadlines`                                                                                               | Generated tax deadlines                |

**Example Schema:**

```typescript
// src/lib/db/schema/guidance.ts
export const userGuidancePreferences = pgTable("user_guidance_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),

  // Competence levels per category (beginner, average, pro)
  levelFakturiranje: varchar("level_fakturiranje", { length: 20 }).default("beginner"),
  levelFinancije: varchar("level_financije", { length: 20 }).default("beginner"),
  levelEu: varchar("level_eu", { length: 20 }).default("beginner"),

  // Global quick-set
  globalLevel: varchar("global_level", { length: 20 }),

  // Notification preferences
  emailDigest: varchar("email_digest", { length: 20 }).default("weekly"),
  pushEnabled: boolean("push_enabled").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})
```

**Paušalni Profile Schema:**

```typescript
// src/lib/db/schema/pausalni.ts
export const pausalniProfile = pgTable("pausalni_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: text("company_id").notNull(),
  hasPdvId: boolean("has_pdv_id").default(false),
  pdvId: varchar("pdv_id", { length: 20 }), // HR12345678901
  pdvIdSince: date("pdv_id_since"),
  euActive: boolean("eu_active").default(false),
  hokMemberSince: date("hok_member_since"),
  tourismActivity: boolean("tourism_activity").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const paymentObligation = pgTable("payment_obligation", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: text("company_id").notNull(),
  obligationType: varchar("obligation_type", { length: 50 }).notNull(),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).default("PENDING"),
  paidDate: date("paid_date"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
})
```

**News System Schema:**

```typescript
// src/lib/db/schema/news.ts
export const newsPosts = pgTable("news_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(), // 'individual' | 'digest'
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(), // markdown
  excerpt: varchar("excerpt", { length: 500 }),
  categoryId: varchar("category_id", { length: 50 }),
  tags: jsonb("tags").default([]),
  impactLevel: varchar("impact_level", { length: 20 }), // 'high' | 'medium' | 'low'
  status: varchar("status", { length: 20 }).default("draft"), // 'draft' | 'reviewing' | 'published'
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

**Why Both Prisma and Drizzle?**

- **Prisma:** Core business entities (invoices, companies, users) - mature, stable schema
- **Drizzle:** New features and performance-critical tables - faster queries, better PostgreSQL support
- **Migration path:** Gradual migration from Prisma to Drizzle for all tables (planned)

### 15.4 Missing Models (To Be Implemented)

```prisma
// KPI - Income/Expense Book (for Obrt Dohodak)
model KPIEntry {
  id            String   @id
  companyId     String
  date          DateTime
  type          KPIType  // INCOME or EXPENSE
  documentType  String
  documentId    String?
  description   String
  amount        Decimal
  paymentMethod String   // G, K, T, O
  category      String?
}

// Fixed Assets
model FixedAsset {
  id                String   @id
  companyId         String
  name              String
  category          AssetCategory
  acquisitionDate   DateTime
  acquisitionCost   Decimal
  usefulLifeMonths  Int
  depreciationMethod DepreciationMethod
  status            AssetStatus
}

// Employee & Payroll (for JOPPD)
model Employee {
  id            String   @id
  companyId     String
  oib           String
  firstName     String
  lastName      String
  contractType  ContractType
  grossSalary   Decimal
  payrolls      Payroll[]
}

model Payroll {
  id                String   @id
  employeeId        String
  period            DateTime
  grossSalary       Decimal
  pensionI          Decimal
  pensionII         Decimal
  healthInsurance   Decimal
  incomeTax         Decimal
  netSalary         Decimal
}
```

---

## 16. API Reference

### 16.1 Route Groups

| Group      | Base Path           | Purpose              |
| ---------- | ------------------- | -------------------- |
| Auth       | `/api/auth/*`       | Authentication       |
| Billing    | `/api/billing/*`    | Stripe integration   |
| Invoices   | `/api/invoices/*`   | Invoice CRUD         |
| E-Invoices | `/api/e-invoices/*` | E-invoice operations |
| Banking    | `/api/banking/*`    | Bank sync & import   |
| Expenses   | `/api/expenses/*`   | Expense management   |
| Reports    | `/api/reports/*`    | Report generation    |
| Pausalni   | `/api/pausalni/*`   | Paušalni features    |
| Admin      | `/api/admin/*`      | Platform management  |
| Cron       | `/api/cron/*`       | Scheduled jobs       |

### 16.2 Key Endpoints

**Invoices:**

```
POST   /api/invoices           Create invoice
GET    /api/invoices           List invoices
GET    /api/invoices/[id]      Get invoice
PATCH  /api/invoices/[id]      Update invoice
DELETE /api/invoices/[id]      Delete invoice
GET    /api/invoices/[id]/pdf  Generate PDF
POST   /api/invoices/[id]/send Send via email
```

**E-Invoices:**

```
POST   /api/e-invoices              Create e-invoice
POST   /api/e-invoices/[id]/fiscalize  Fiscalize
POST   /api/e-invoices/receive      Receive incoming (webhook)
```

**Banking:**

```
POST   /api/banking/import/upload   Upload file
POST   /api/banking/import/process  Process import
GET    /api/banking/transactions    List transactions
POST   /api/banking/reconciliation/match  Match transaction
```

**Pausalni:**

```
GET    /api/pausalni/forms          List generated forms
POST   /api/pausalni/forms/po-sd    Generate PO-SD
GET    /api/pausalni/obligations    List payment obligations
GET    /api/pausalni/calendar       Tax calendar
```

### 16.3 Server Actions

| File            | Actions                                     |
| --------------- | ------------------------------------------- |
| `company.ts`    | createCompany, updateCompany, switchCompany |
| `invoice.ts`    | createInvoice, updateInvoice, deleteInvoice |
| `expense.ts`    | createExpense, updateExpense, deleteExpense |
| `contact.ts`    | createContact, updateContact, deleteContact |
| `onboarding.ts` | getOnboardingData, saveOnboardingData       |
| `guidance.ts`   | saveCompetenceLevel, getGuidancePreferences |
| `fiscalize.ts`  | uploadCertificate, testConnection           |

---

## 17. Complete API Reference

### 17.1 Authentication & Authorization

| Endpoint                        | Method | Purpose                       |
| ------------------------------- | ------ | ----------------------------- |
| `/api/auth/[...nextauth]`       | ALL    | NextAuth.js handler           |
| `/api/auth/check-email`         | POST   | Check email availability      |
| `/api/auth/register`            | POST   | User registration             |
| `/api/auth/send-code`           | POST   | Send verification code        |
| `/api/auth/verify-code`         | POST   | Verify authentication code    |
| `/api/auth/reset-password`      | POST   | Password reset                |
| `/api/webauthn/register/start`  | POST   | Start passkey registration    |
| `/api/webauthn/register/finish` | POST   | Complete passkey registration |
| `/api/webauthn/login/start`     | POST   | Start passkey login           |
| `/api/webauthn/login/finish`    | POST   | Complete passkey login        |
| `/api/webauthn/passkeys`        | GET    | List user passkeys            |
| `/api/webauthn/passkeys/[id]`   | DELETE | Remove passkey                |
| `/api/admin/auth`               | POST   | Admin authentication          |

### 17.2 Banking & Reconciliation

| Endpoint                               | Method | Purpose                      |
| -------------------------------------- | ------ | ---------------------------- |
| `/api/bank/connect`                    | POST   | Initiate PSD2 connection     |
| `/api/bank/disconnect`                 | POST   | Remove bank connection       |
| `/api/bank/callback`                   | GET    | OAuth callback handler       |
| `/api/banking/import/upload`           | POST   | Upload bank statement        |
| `/api/banking/import/process`          | POST   | Process uploaded statement   |
| `/api/banking/import/jobs/[id]`        | GET    | Get import job status        |
| `/api/banking/import/jobs/[id]/file`   | GET    | Retrieve original file       |
| `/api/banking/import/jobs/[id]/status` | GET    | Check processing status      |
| `/api/banking/reconciliation`          | GET    | List unmatched transactions  |
| `/api/banking/reconciliation/match`    | POST   | Match transaction to invoice |

### 17.3 E-Invoicing & Fiscalization

| Endpoint                  | Method | Purpose                         |
| ------------------------- | ------ | ------------------------------- |
| `/api/e-invoices/inbox`   | GET    | List received e-invoices        |
| `/api/e-invoices/receive` | POST   | Webhook for incoming e-invoices |
| `/api/invoices/[id]/pdf`  | GET    | Generate invoice PDF            |
| `/api/compliance/en16931` | POST   | Validate EN 16931 compliance    |
| `/api/sandbox/e-invoice`  | POST   | Test e-invoice endpoint         |

### 17.4 Billing & Subscriptions

| Endpoint                | Method | Purpose                        |
| ----------------------- | ------ | ------------------------------ |
| `/api/billing/checkout` | POST   | Create Stripe checkout session |
| `/api/billing/portal`   | POST   | Open Stripe customer portal    |
| `/api/billing/webhook`  | POST   | Handle Stripe webhooks         |

### 17.5 Paušalni Features

| Endpoint                                     | Method  | Purpose                     |
| -------------------------------------------- | ------- | --------------------------- |
| `/api/pausalni/profile`                      | GET/PUT | Get/update paušalni profile |
| `/api/pausalni/preferences`                  | PUT     | Update display preferences  |
| `/api/pausalni/obligations`                  | GET     | List payment obligations    |
| `/api/pausalni/obligations/[id]/mark-paid`   | POST    | Mark obligation as paid     |
| `/api/pausalni/income-summary`               | GET     | Get income summary          |
| `/api/pausalni/eu-transactions`              | GET     | List EU transactions        |
| `/api/pausalni/eu-transactions/[id]/confirm` | POST    | Confirm EU transaction      |
| `/api/pausalni/forms`                        | POST    | Generate tax forms          |
| `/api/pausalni/forms/[id]/download`          | GET     | Download generated form     |
| `/api/pausalni/payment-slip`                 | POST    | Generate Hub3 payment slip  |
| `/api/pausalni/calendar/export`              | GET     | Export deadline calendar    |
| `/api/pausalni/calendar/google/sync`         | POST    | Sync to Google Calendar     |

### 17.6 AI Features

| Endpoint                   | Method | Purpose                     |
| -------------------------- | ------ | --------------------------- |
| `/api/ai/extract`          | POST   | Extract data from document  |
| `/api/ai/feedback`         | POST   | Submit extraction feedback  |
| `/api/ai/suggest-category` | POST   | Get category suggestion     |
| `/api/ai/usage`            | GET    | Get AI usage stats          |
| `/api/assistant/chat`      | POST   | AI assistant chat interface |

### 17.7 Email Integration

| Endpoint                               | Method     | Purpose                |
| -------------------------------------- | ---------- | ---------------------- |
| `/api/email/connect`                   | POST       | Start email OAuth flow |
| `/api/email/callback`                  | GET        | OAuth callback         |
| `/api/email/[connectionId]/disconnect` | POST       | Disconnect email       |
| `/api/email/rules`                     | GET/POST   | Manage import rules    |
| `/api/email/rules/[id]`                | PUT/DELETE | Update/delete rule     |

### 17.8 Document Import

| Endpoint                        | Method | Purpose                  |
| ------------------------------- | ------ | ------------------------ |
| `/api/import/upload`            | POST   | Upload document          |
| `/api/import/process`           | POST   | Process document with AI |
| `/api/import/jobs/[id]`         | GET    | Get job details          |
| `/api/import/jobs/[id]/type`    | PUT    | Set document type        |
| `/api/import/jobs/[id]/file`    | GET    | Retrieve file            |
| `/api/import/jobs/[id]/confirm` | POST   | Confirm import           |
| `/api/import/jobs/[id]/reject`  | POST   | Reject import            |
| `/api/receipts/upload`          | POST   | Upload receipt           |
| `/api/receipts/view`            | GET    | View receipt             |

### 17.9 Support & Ticketing

| Endpoint                             | Method   | Purpose                   |
| ------------------------------------ | -------- | ------------------------- |
| `/api/support/tickets`               | GET/POST | List/create tickets       |
| `/api/support/tickets/[id]/status`   | PUT      | Update ticket status      |
| `/api/support/tickets/[id]/messages` | GET/POST | Ticket messages           |
| `/api/support/tickets/summary`       | GET      | Support dashboard summary |
| `/api/admin/support/dashboard`       | GET      | Admin support view        |

### 17.10 Guidance & Notifications

| Endpoint                    | Method | Purpose                  |
| --------------------------- | ------ | ------------------------ |
| `/api/guidance/preferences` | PUT    | Update guidance settings |
| `/api/guidance/checklist`   | GET    | Get setup checklist      |
| `/api/guidance/insights`    | GET    | Get contextual insights  |
| `/api/notifications`        | GET    | List notifications       |
| `/api/notifications/read`   | POST   | Mark as read             |
| `/api/deadlines`            | GET    | List deadlines           |
| `/api/deadlines/upcoming`   | GET    | Upcoming deadlines       |

### 17.11 Cron Jobs

| Endpoint                        | Trigger | Purpose                  |
| ------------------------------- | ------- | ------------------------ |
| `/api/cron/bank-sync`           | Daily   | Sync PSD2 transactions   |
| `/api/cron/fiscal-processor`    | Hourly  | Process fiscal queue     |
| `/api/cron/fiscal-retry`        | 6h      | Retry failed fiscal      |
| `/api/cron/deadline-reminders`  | Daily   | Send deadline emails     |
| `/api/cron/email-sync`          | 15min   | Import email attachments |
| `/api/cron/fetch-news`          | 4h      | Fetch news feeds         |
| `/api/cron/news/fetch-classify` | 4h      | Fetch and classify news  |
| `/api/cron/news/publish`        | Daily   | Publish news posts       |
| `/api/cron/news/review`         | Daily   | Review news items        |
| `/api/cron/checklist-digest`    | Daily   | Send guidance digests    |

### 17.12 News System

| Endpoint                               | Method     | Purpose               |
| -------------------------------------- | ---------- | --------------------- |
| `/api/news`                            | GET        | List news posts       |
| `/api/news/latest`                     | GET        | Latest news           |
| `/api/news/categories`                 | GET        | News categories       |
| `/api/news/posts`                      | GET        | List posts            |
| `/api/news/posts/[slug]`               | GET        | Get post by slug      |
| `/api/admin/news/posts`                | GET/POST   | Admin news management |
| `/api/admin/news/posts/[id]`           | PUT/DELETE | Update/delete post    |
| `/api/admin/news/posts/[id]/reprocess` | POST       | Reprocess with AI     |
| `/api/admin/news/cron/trigger`         | POST       | Manually trigger cron |

### 17.13 Staff Portal

| Endpoint                            | Method     | Purpose                  |
| ----------------------------------- | ---------- | ------------------------ |
| `/api/staff/clients`                | GET        | List assigned clients    |
| `/api/staff/clients/[companyId]`    | GET        | Get client details       |
| `/api/admin/staff-assignments`      | GET/POST   | Manage staff assignments |
| `/api/admin/staff-assignments/[id]` | PUT/DELETE | Update/delete assignment |

### 17.14 Admin Features

| Endpoint                                 | Method | Purpose           |
| ---------------------------------------- | ------ | ----------------- |
| `/api/admin/companies/[companyId]/audit` | GET    | Company audit log |

### 17.15 Reports & Exports

| Endpoint                         | Method | Purpose                          |
| -------------------------------- | ------ | -------------------------------- |
| `/api/reports/kpr`               | GET    | KPR report (Income/Expense book) |
| `/api/reports/kpr/excel`         | GET    | KPR Excel export                 |
| `/api/reports/kpr/pdf`           | GET    | KPR PDF export                   |
| `/api/reports/vat-threshold`     | GET    | VAT threshold monitoring         |
| `/api/reports/accountant-export` | GET    | Accountant export                |
| `/api/exports/company`           | GET    | Full company data export         |
| `/api/exports/expenses`          | GET    | Expense export                   |
| `/api/exports/invoices`          | GET    | Invoice export                   |
| `/api/exports/season-pack`       | GET    | Seasonal compliance pack         |

### 17.16 POS & Terminal

| Endpoint                         | Method | Purpose                 |
| -------------------------------- | ------ | ----------------------- |
| `/api/terminal/connection-token` | POST   | Generate terminal token |
| `/api/terminal/payment-intent`   | POST   | Create payment intent   |
| `/api/terminal/reader-status`    | GET    | Check reader status     |

### 17.17 Products & Inventory

| Endpoint               | Method | Purpose              |
| ---------------------- | ------ | -------------------- |
| `/api/products/import` | POST   | Bulk import products |

### 17.18 Knowledge Hub

| Endpoint                  | Method | Purpose                |
| ------------------------- | ------ | ---------------------- |
| `/api/knowledge-hub/hub3` | GET    | Hub3 payment slip info |

### 17.19 Utilities

| Endpoint               | Method | Purpose               |
| ---------------------- | ------ | --------------------- |
| `/api/health`          | GET    | Basic health check    |
| `/api/health/ready`    | GET    | Readiness probe       |
| `/api/status`          | GET    | Service status        |
| `/api/metrics`         | GET    | System metrics        |
| `/api/oib/lookup`      | GET    | OIB validation/lookup |
| `/api/capabilities`    | GET    | API capabilities      |
| `/api/webhooks/resend` | POST   | Email service webhook |

**Total API Routes:** 119 endpoints

### 17.20 Server Actions

FiskAI uses Next.js Server Actions for most CRUD operations. These are NOT REST endpoints but TypeScript functions called directly from client components.

**Location:** `/src/app/actions/`

| File                        | Purpose                   | Key Functions                                                    |
| --------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `auth.ts`                   | Authentication            | `signIn`, `signOut`, `signUp`                                    |
| `company.ts`                | Company management        | `createCompany`, `updateCompany`, `switchCompany`                |
| `company-switch.ts`         | Company context switching | `switchActiveCompany`                                            |
| `contact.ts`                | Contact CRUD              | `createContact`, `updateContact`, `deleteContact`                |
| `contact-list.ts`           | Contact list management   | `getContacts`, `searchContacts`                                  |
| `product.ts`                | Product management        | `createProduct`, `updateProduct`, `deleteProduct`                |
| `invoice.ts`                | Invoice operations        | `createInvoice`, `updateInvoice`, `deleteInvoice`, `sendInvoice` |
| `expense.ts`                | Expense tracking          | `createExpense`, `updateExpense`, `deleteExpense`                |
| `expense-reconciliation.ts` | Bank matching             | `matchExpense`, `unmatchExpense`, `suggestMatches`               |
| `banking.ts`                | Bank accounts             | `addBankAccount`, `removeBankAccount`, `syncTransactions`        |
| `premises.ts`               | Business premises         | `createPremises`, `updatePremises`, `setPrimaryPremises`         |
| `terminal.ts`               | POS terminals             | `registerTerminal`, `pairReader`, `unpairReader`                 |
| `pos.ts`                    | Point of sale             | `createPOSTransaction`, `voidTransaction`                        |
| `fiscalize.ts`              | Fiscalization             | `fiscalizeInvoice`, `retryFiscalization`, `getFiscalStatus`      |
| `fiscal-certificate.ts`     | Certificates              | `uploadCertificate`, `validateCertificate`, `deleteCertificate`  |
| `support-ticket.ts`         | Support                   | `createTicket`, `addMessage`, `updateTicketStatus`               |
| `onboarding.ts`             | Wizard                    | `saveOnboardingStep`, `completeOnboarding`, `skipOnboarding`     |
| `guidance.ts`               | Preferences               | `updateGuidanceLevel`, `dismissTip`, `saveCompetenceLevel`       |
| `newsletter.ts`             | Newsletter                | `subscribe`, `unsubscribe`, `updatePreferences`                  |
| `article-agent.ts`          | AI articles               | `generateArticle`, `publishArticle`, `reviewArticle`             |

**Usage Pattern:**

```typescript
// In client component
"use client"
import { createInvoice } from "@/app/actions/invoice"

async function handleSubmit(data: InvoiceData) {
  const result = await createInvoice(data)
  if (result.error) {
    toast.error(result.error)
  } else {
    router.push(`/invoices/${result.id}`)
  }
}
```

**Why Server Actions over REST?**

1. Type safety - Full TypeScript types from server to client
2. No API boilerplate - Direct function calls
3. Automatic revalidation - Next.js cache updates
4. Better DX - Single codebase for frontend and backend logic
