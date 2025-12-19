# FiskAI Product Bible

## The Complete System Truth

**Version:** 4.0.0
**Date:** 2025-12-19
**Status:** Canonical - Single Source of Truth
**Scope:** Every flow, every button, every permission, every scenario

---

## Table of Contents

1. [Vision & Non-Negotiables](#1-vision--non-negotiables)
2. [Architecture Overview](#2-architecture-overview)
3. [User Personas & Journey Matrix](#3-user-personas--journey-matrix)
4. [Legal Forms & Compliance Requirements](#4-legal-forms--compliance-requirements)
5. [Module System & Entitlements](#5-module-system--entitlements)
6. [Permission Matrix (RBAC)](#6-permission-matrix-rbac)
7. [Visibility & Feature Gating](#7-visibility--feature-gating)
8. [Dashboard & Progressive Disclosure](#8-dashboard--progressive-disclosure)
9. [UI Components & Behaviors](#9-ui-components--behaviors)
10. [Complete User Flows](#10-complete-user-flows)
11. [Tax & Regulatory Data](#11-tax--regulatory-data)
12. [Integration Ecosystem](#12-integration-ecosystem)
13. [Monetization & Pricing](#13-monetization--pricing)
14. [Implementation Status Matrix](#14-implementation-status-matrix)
15. [Data Models](#15-data-models)
16. [API Reference](#16-api-reference)

---

## 1. Vision & Non-Negotiables

### 1.1 What FiskAI Is

FiskAI is not a dashboard. It is a **Financial Cockpit** - a single command center where Croatian business owners see everything they need to run their business legally and efficiently.

**Core Promise:** "Never miss a deadline, never overpay taxes, never wonder what to do next."

### 1.2 Non-Negotiables

| Rule                       | Enforcement                                                         | Why                                                       |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| **Zero Data Leakage**      | Prisma query extensions enforce tenant isolation at DB level        | Multi-tenant SaaS - one company cannot see another's data |
| **Regulatory First**       | Croatian legal requirements are hardcoded, not configurable         | Fiskalizacija, 11-year archive, PDV rules are law         |
| **Experience-Clean**       | No empty states without clear "Step 1" CTA                          | Users should never feel lost or abandoned                 |
| **One Truth**              | Single module registry, single key system, single visibility engine | No conflicting logic paths                                |
| **Progressive Disclosure** | Show complexity only when user is ready                             | Don't overwhelm beginners                                 |

### 1.3 The Three Portals

| Portal           | URL               | SystemRole | Purpose                           |
| ---------------- | ----------------- | ---------- | --------------------------------- |
| **Client App**   | `app.fiskai.hr`   | `USER`     | Business owner's cockpit          |
| **Staff Portal** | `staff.fiskai.hr` | `STAFF`    | Accountant multi-client workspace |
| **Admin Portal** | `admin.fiskai.hr` | `ADMIN`    | Platform management               |

**Marketing Site:** `fiskai.hr` (public, no auth required)

---

## 2. Architecture Overview

### 2.1 Tech Stack

| Layer      | Technology               | Purpose                                  |
| ---------- | ------------------------ | ---------------------------------------- |
| Framework  | Next.js 15 App Router    | Server components, streaming, routing    |
| Database   | PostgreSQL 16 + Prisma 7 | Data persistence, multi-tenant isolation |
| Auth       | NextAuth v5 (Auth.js)    | Session management, OAuth, Passkeys      |
| Styling    | Tailwind CSS + CVA       | Design system, component variants        |
| Validation | Zod                      | Schema validation everywhere             |
| Email      | Resend                   | Transactional email                      |
| Storage    | Cloudflare R2            | Encrypted document archive               |
| Payments   | Stripe                   | Subscriptions, Terminal                  |
| Banking    | Gocardless/SaltEdge      | PSD2 bank connections                    |
| Fiscal     | FINA CIS                 | Croatian fiscalization                   |

### 2.2 Directory Structure

```
/src
├── app/
│   ├── (marketing)/     # Public pages (fiskai.hr)
│   ├── (app)/           # Client dashboard (app.fiskai.hr)
│   ├── (staff)/         # Staff portal (staff.fiskai.hr)
│   ├── (admin)/         # Admin portal (admin.fiskai.hr)
│   ├── (auth)/          # Authentication flows
│   └── api/             # API routes
├── components/
│   ├── ui/              # Design system primitives
│   ├── layout/          # Header, sidebar, navigation
│   ├── dashboard/       # Dashboard widgets
│   ├── onboarding/      # Wizard steps
│   ├── guidance/        # Help system
│   └── [feature]/       # Feature-specific components
├── lib/
│   ├── modules/         # Module definitions & gating
│   ├── visibility/      # Progressive disclosure rules
│   ├── rbac.ts          # Permission matrix
│   ├── fiscal-data/     # Tax rates, thresholds, deadlines
│   ├── pausalni/        # Paušalni obrt logic
│   └── e-invoice/       # UBL/XML generation
└── content/             # MDX guides & tools
```

### 2.3 Request Flow

```
User Request
    ↓
middleware.ts (subdomain routing)
    ↓
Route Group Layout (portal check)
    ↓
Page Component (auth + company check)
    ↓
Visibility Provider (feature gating)
    ↓
Server Action (RBAC check)
    ↓
Prisma (tenant isolation)
    ↓
PostgreSQL
```

---

## 3. User Personas & Journey Matrix

### 3.1 The Five Personas

#### Persona 1: Marko - The Paušalni Freelancer

| Attribute         | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| **Legal Form**    | `OBRT_PAUSAL`                                                                   |
| **Revenue**       | < 40,000 EUR/year                                                               |
| **VAT Status**    | Not in system                                                                   |
| **Employees**     | None                                                                            |
| **Cash Payments** | Occasionally                                                                    |
| **Competence**    | Beginner                                                                        |
| **Pain Points**   | "What forms do I need?", "When do I pay contributions?", "Am I near the limit?" |

**Marko's Journey:**

```
STAGE 0: ONBOARDING
├── Step 1: Basic Info (OIB, Company Name, Select "Paušalni obrt")
├── Step 2: Competence Level → "Beginner" (shows all help)
├── Step 3: Address (for invoice header)
└── Step 4: Contact & IBAN (for payment slips)

STAGE 1: SETUP (0 invoices)
├── Dashboard: Hero Banner + Setup Checklist
├── Tasks: "Create your first contact", "Create your first invoice"
├── Hidden: Charts, Advanced Reports, AI Insights
└── Visible: Paušalni Status Card (40k limit at 0%)

STAGE 2: ACTIVE (1+ invoice)
├── Dashboard: + Recent Activity, Revenue Trend, Invoice Funnel
├── Unlocked: Basic Reports, KPR Export
├── Shown: Contribution Payment Reminders
└── Alert: "You've earned X EUR. Y EUR until VAT threshold."

STAGE 3: STRATEGIC (10+ invoices OR VAT)
├── Dashboard: + AI Insights, Advanced Deadlines
├── Unlocked: AI Assistant, Advanced Reports
└── Proactive: "You're at 90% of limit. Plan ahead."
```

**What Marko Sees:**

| Element                 | Visible? | Notes                             |
| ----------------------- | -------- | --------------------------------- |
| VAT fields on invoices  | NO       | "Nije u sustavu PDV-a" auto-added |
| PDV reports             | NO       | Not a VAT payer                   |
| Paušalni Status Card    | YES      | Shows 40k limit progress          |
| PO-SD Generator         | YES      | Annual tax form                   |
| HOK Payment Reminder    | YES      | Quarterly chamber fee             |
| Contribution Calculator | YES      | Monthly MIO/HZZO                  |
| Corporate Tax           | NO       | Not applicable                    |
| Asset Registry          | NO       | Not required for paušalni         |

---

#### Persona 2: Ana - The Growing Obrt

| Attribute       | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| **Legal Form**  | `OBRT_REAL` (or `OBRT_VAT` if VAT-registered)                      |
| **Revenue**     | 40,000 - 150,000 EUR/year                                          |
| **VAT Status**  | May or may not be registered                                       |
| **Employees**   | 0-2                                                                |
| **Competence**  | Standard                                                           |
| **Pain Points** | "How do I track expenses?", "What can I deduct?", "Do I need VAT?" |

**What Ana Needs (vs Marko):**

| Module                    | Paušalni | Ana's Obrt   |
| ------------------------- | -------- | ------------ |
| KPR (Daily Sales)         | YES      | NO           |
| KPI (Income/Expense Book) | NO       | YES          |
| PO-SD                     | YES      | NO           |
| DOH Form                  | NO       | YES          |
| URA/IRA                   | NO       | YES          |
| Asset Registry            | NO       | YES          |
| PDV Forms                 | NO       | IF VAT       |
| JOPPD                     | NO       | IF EMPLOYEES |

---

#### Persona 3: Ivan - The D.O.O. Owner

| Attribute       | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| **Legal Form**  | `DOO` or `JDOO`                                                |
| **Revenue**     | Any                                                            |
| **VAT Status**  | Always YES                                                     |
| **Employees**   | 0+                                                             |
| **Competence**  | Standard/Expert                                                |
| **Pain Points** | "Corporate tax calculation", "VAT returns", "Employee payroll" |

**What Ivan Needs:**

| Module         | Required     | Purpose                       |
| -------------- | ------------ | ----------------------------- |
| Invoicing      | YES          | Issue invoices                |
| URA/IRA        | YES          | Invoice registers (mandatory) |
| PDV Forms      | YES          | VAT reporting (mandatory)     |
| Asset Registry | YES          | Depreciation affects tax      |
| Corporate Tax  | YES          | 10%/18% calculation           |
| JOPPD          | IF EMPLOYEES | Payroll reporting             |
| Fiscalization  | IF CASH      | POS/card payments             |

---

#### Persona 4: Petra - The Accountant (Staff)

| Attribute      | Value                                       |
| -------------- | ------------------------------------------- |
| **SystemRole** | `STAFF`                                     |
| **Manages**    | Multiple client companies                   |
| **Needs**      | Bulk operations, export, multi-company view |

**Petra's Portal (`staff.fiskai.hr`):**

```
Staff Dashboard
├── Assigned Clients List (company cards)
├── Pending Actions (deadlines across all clients)
├── Quick Export (bulk KPR, URA/IRA, PDV)
└── Client Switcher (jump into client context)

Per-Client View (same as client app, but with accountant role)
├── Can: Read all, Export reports
├── Cannot: Change billing, Invite users
└── Special: "Mark as Reviewed" button
```

---

#### Persona 5: Admin (Platform Owner)

| Attribute        | Value             |
| ---------------- | ----------------- |
| **SystemRole**   | `ADMIN`           |
| **Portal**       | `admin.fiskai.hr` |
| **Capabilities** | Everything        |

**Admin Portal Features:**

| Section | Purpose                                      |
| ------- | -------------------------------------------- |
| Tenants | List all companies, view status, impersonate |
| Staff   | Manage accountant assignments                |
| News    | Create/edit platform announcements           |
| Support | View/respond to support tickets              |
| Metrics | Platform health, usage stats                 |

---

### 3.2 Journey Matrix (Persona × Stage)

| Stage          | Paušalni (Marko)            | Obrt Real (Ana)               | D.O.O. (Ivan)                   |
| -------------- | --------------------------- | ----------------------------- | ------------------------------- |
| **Onboarding** | Basic + Competence          | + VAT question                | VAT forced ON                   |
| **Setup**      | KPR tutorial, First invoice | + KPI setup, Expense tracking | + URA/IRA, PDV setup            |
| **Active**     | Limit monitor, PO-SD        | + Asset tracking, DOH prep    | + Corporate tax, Full reporting |
| **Strategic**  | "Consider D.O.O.?"          | + Employee prep               | + JOPPD, Advanced analytics     |

---

## 4. Legal Forms & Compliance Requirements

### 4.1 Croatian Business Types

| Legal Form     | Code          | Min Capital | Tax Regime    | Accounting   | VAT      |
| -------------- | ------------- | ----------- | ------------- | ------------ | -------- |
| Paušalni Obrt  | `OBRT_PAUSAL` | 0           | Flat-rate 12% | Single-entry | NO       |
| Obrt (Dohodak) | `OBRT_REAL`   | 0           | Income tax    | Single-entry | Optional |
| Obrt (PDV)     | `OBRT_VAT`    | 0           | Income + VAT  | Single-entry | YES      |
| j.d.o.o.       | `JDOO`        | 10 HRK      | Corporate     | Double-entry | YES      |
| d.o.o.         | `DOO`         | 20,000 HRK  | Corporate     | Double-entry | YES      |

### 4.2 Module Requirements by Legal Form

| Module               | OBRT_PAUSAL | OBRT_REAL  | OBRT_VAT   | JDOO       | DOO        |
| -------------------- | ----------- | ---------- | ---------- | ---------- | ---------- |
| Invoicing            | ✅          | ✅         | ✅         | ✅         | ✅         |
| KPR (Sales Log)      | ✅          | ❌         | ❌         | ❌         | ❌         |
| KPI (Income/Expense) | ❌          | ✅         | ✅         | ❌         | ❌         |
| PO-SD (Annual Form)  | ✅          | ❌         | ❌         | ❌         | ❌         |
| DOH (Income Tax)     | ❌          | ✅         | ✅         | ❌         | ❌         |
| URA/IRA              | ❌          | ✅         | ✅         | ✅         | ✅         |
| PDV Forms            | ❌          | ⚠️ IF VAT  | ✅         | ✅         | ✅         |
| Assets (DI)          | ❌          | ✅         | ✅         | ✅         | ✅         |
| Corporate Tax        | ❌          | ❌         | ❌         | ✅         | ✅         |
| JOPPD                | ❌          | ⚠️ IF EMP  | ⚠️ IF EMP  | ⚠️ IF EMP  | ⚠️ IF EMP  |
| Fiscalization        | ⚠️ IF CASH  | ⚠️ IF CASH | ⚠️ IF CASH | ⚠️ IF CASH | ⚠️ IF CASH |

### 4.3 The 20 Scenarios Matrix

Every possible combination of legal form × VAT × cash × employees:

| #   | Legal Form | VAT   | Cash | Employees | Required Modules                |
| --- | ---------- | ----- | ---- | --------- | ------------------------------- |
| 1   | Paušalni   | No    | No   | No        | Invoicing, KPR, PO-SD           |
| 2   | Paušalni   | No    | Yes  | No        | + **Fiscalization**             |
| 3   | Paušalni   | Yes\* | No   | No        | + **PDV**                       |
| 4   | Paušalni   | Yes\* | Yes  | No        | + **PDV, Fiscalization**        |
| 5   | Obrt Real  | No    | No   | No        | Invoicing, KPI, URA/IRA, Assets |
| 6   | Obrt Real  | No    | Yes  | No        | + **Fiscalization**             |
| 7   | Obrt Real  | No    | No   | Yes       | + **JOPPD**                     |
| 8   | Obrt Real  | No    | Yes  | Yes       | + **Fiscalization, JOPPD**      |
| 9   | Obrt Real  | Yes   | No   | No        | + **PDV**                       |
| 10  | Obrt Real  | Yes   | Yes  | No        | + **PDV, Fiscalization**        |
| 11  | Obrt Real  | Yes   | No   | Yes       | + **PDV, JOPPD**                |
| 12  | Obrt Real  | Yes   | Yes  | Yes       | + **PDV, Fiscalization, JOPPD** |
| 13  | j.d.o.o.   | Yes   | No   | No        | Invoicing, URA/IRA, Assets, PDV |
| 14  | j.d.o.o.   | Yes   | Yes  | No        | + **Fiscalization**             |
| 15  | j.d.o.o.   | Yes   | No   | Yes       | + **JOPPD**                     |
| 16  | j.d.o.o.   | Yes   | Yes  | Yes       | + **Fiscalization, JOPPD**      |
| 17  | d.o.o.     | Yes   | No   | No        | Invoicing, URA/IRA, Assets, PDV |
| 18  | d.o.o.     | Yes   | Yes  | No        | + **Fiscalization**             |
| 19  | d.o.o.     | Yes   | No   | Yes       | + **JOPPD**                     |
| 20  | d.o.o.     | Yes   | Yes  | Yes       | + **Fiscalization, JOPPD**      |

\*Paušalni with VAT = exceeded 40k threshold

### 4.4 Invoice Requirements by VAT Status

**NOT in VAT system (Paušalni < 40k):**

```
MUST include:
"Porezni obveznik nije u sustavu PDV-a prema čl. 90. st. 2. Zakona o PDV-u"

CANNOT show:
- VAT breakdown
- VAT registration number (HR + OIB)
```

**IN VAT system:**

```
MUST include:
- Seller VAT ID: HR + OIB
- Buyer VAT ID (if B2B)
- VAT breakdown by rate (25%, 13%, 5%, 0%)
- Tax point date
- Sequential invoice number
```

### 4.5 Fiscalization Requirements

**When Required:**
| Payment Method | Fiscalization? |
|----------------|----------------|
| Cash (Gotovina) | YES |
| Card (Kartica) | YES |
| Bank Transfer | NO |
| Mixed | YES (for cash portion) |

**The Flow:**

```
1. Create Invoice
       ↓
2. Calculate ZKI (32-char hex from RSA signature)
       ↓
3. Send to CIS (Tax Authority)
       ↓
4. Receive JIR (36-char UUID)
       ↓
5. Print Invoice with ZKI + JIR + QR Code
```

---

## 5. Module System & Entitlements

### 5.1 The 16 Module Keys

Stored in `Company.entitlements[]` as kebab-case strings:

| Module Key         | Description              | Default |
| ------------------ | ------------------------ | ------- |
| `invoicing`        | Manual PDF generation    | ✅ FREE |
| `e-invoicing`      | UBL/XML B2B/B2G          | ✅ FREE |
| `contacts`         | CRM directory            | ✅ FREE |
| `products`         | Product catalog          | ✅ FREE |
| `expenses`         | Expense tracking         | ✅ FREE |
| `banking`          | Bank import & sync       | ✅ FREE |
| `documents`        | Document vault (archive) | ✅ FREE |
| `reports-basic`    | KPR, aging, P&L          | ✅ FREE |
| `fiscalization`    | CIS integration          | PAID    |
| `reconciliation`   | Auto-matching            | PAID    |
| `reports-advanced` | VAT reports, exports     | PAID    |
| `pausalni`         | Paušalni features        | AUTO\*  |
| `vat`              | VAT management           | AUTO\*  |
| `corporate-tax`    | D.O.O./JDOO tax          | AUTO\*  |
| `pos`              | Point of sale            | PAID    |
| `ai-assistant`     | AI chat & extraction     | PAID    |

\*AUTO = Automatically enabled based on `legalForm`

### 5.2 Module Definition Structure

```typescript
// src/lib/modules/definitions.ts
export const MODULES = {
  invoicing: {
    key: "invoicing",
    name: "Fakturiranje",
    description: "Izrada i slanje računa",
    routes: ["/invoices", "/invoices/new", "/invoices/[id]"],
    navItems: [{ label: "Računi", href: "/invoices", icon: FileText }],
    requiredFor: ["OBRT_PAUSAL", "OBRT_REAL", "OBRT_VAT", "JDOO", "DOO"],
  },
  // ... all 16 modules
}
```

### 5.3 Entitlement Checking

```typescript
// In route protection
const moduleAccess = createModuleAccess(company.entitlements)
if (!moduleAccess.canAccessRoute(pathname)) {
  redirect("/dashboard?error=module_required")
}

// In components
<ModuleGate module="ai-assistant">
  <AIAssistantButton />
</ModuleGate>
```

---

## 6. Permission Matrix (RBAC)

### 6.1 The Five Tenant Roles

| Role         | Description                     | Typical User        |
| ------------ | ------------------------------- | ------------------- |
| `OWNER`      | Full control, including billing | Business founder    |
| `ADMIN`      | Manage resources, invite users  | Trusted manager     |
| `MEMBER`     | Create/edit, no delete          | Employee            |
| `ACCOUNTANT` | Read-only + exports             | External accountant |
| `VIEWER`     | Read-only                       | Investor, advisor   |

### 6.2 Permission Matrix

| Permission          | OWNER | ADMIN | MEMBER | ACCOUNTANT | VIEWER |
| ------------------- | ----- | ----- | ------ | ---------- | ------ |
| **Invoices**        |
| `invoice:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `invoice:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `invoice:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `invoice:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Expenses**        |
| `expense:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `expense:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `expense:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `expense:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Contacts**        |
| `contact:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `contact:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `contact:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `contact:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Products**        |
| `product:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `product:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `product:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `product:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Settings**        |
| `settings:read`     | ✅    | ✅    | ❌     | ✅         | ❌     |
| `settings:update`   | ✅    | ✅    | ❌     | ❌         | ❌     |
| `billing:manage`    | ✅    | ❌    | ❌     | ❌         | ❌     |
| **Users**           |
| `users:invite`      | ✅    | ✅    | ❌     | ❌         | ❌     |
| `users:remove`      | ✅    | ✅    | ❌     | ❌         | ❌     |
| `users:update_role` | ✅    | ❌    | ❌     | ❌         | ❌     |
| **Reports**         |
| `reports:read`      | ✅    | ✅    | ❌     | ✅         | ✅     |
| `reports:export`    | ✅    | ✅    | ❌     | ✅         | ❌     |
| **Fiscal**          |
| `fiscal:manage`     | ✅    | ✅    | ❌     | ❌         | ❌     |

### 6.3 Usage in Code

```typescript
// Server action
return requireCompanyWithPermission(user.id!, 'invoice:delete', async (company) => {
  await db.eInvoice.delete({ where: { id } })
})

// Component
if (roleHasPermission(userRole, 'invoice:delete')) {
  return <DeleteButton />
}
```

---

## 7. Visibility & Feature Gating

### 7.1 Three-Layer Visibility System

**Layer 1: Business Type (Legal Form)**

```typescript
// What's hidden based on legalForm
OBRT_PAUSAL: ["vat-fields", "corporate-tax", "asset-registry"]
OBRT_REAL: ["pausalni-widgets", "kpr", "po-sd"]
DOO/JDOO: ["pausalni-widgets", "doprinosi-personal"]
```

**Layer 2: Progression Stage**

```typescript
// calculateActualStage(company)
onboarding  → Wizard incomplete
setup       → Profile complete, 0 invoices
active      → 1+ invoice OR bank statement
strategic   → 10+ invoices OR VAT registered
```

**Layer 3: Competence Level**

```typescript
// User's self-declared expertise
beginner → Hide advanced settings, show all help
standard → Normal UI
expert   → Show everything, minimal hand-holding
```

### 7.2 Element Visibility Rules

| Element ID                  | Legal Form  | Stage     | Competence | Module        |
| --------------------------- | ----------- | --------- | ---------- | ------------- |
| `card:hero-banner`          | All         | setup+    | All        | Core          |
| `card:checklist-widget`     | All         | setup     | beginner   | Guidance      |
| `card:recent-activity`      | All         | active+   | standard+  | Core          |
| `card:revenue-trend`        | All         | active+   | standard+  | invoicing     |
| `card:invoice-funnel`       | All         | active+   | standard+  | invoicing     |
| `card:pausalni-status`      | OBRT_PAUSAL | setup+    | All        | pausalni      |
| `card:vat-overview`         | VAT payers  | active+   | standard+  | vat           |
| `card:fiscalization-status` | Cash payers | setup+    | All        | fiscalization |
| `card:insights-widget`      | All         | strategic | All        | ai-assistant  |
| `card:corporate-tax`        | DOO/JDOO    | strategic | expert     | corporate-tax |

### 7.3 Visibility Component Usage

```tsx
// In dashboard
<Visible id="card:pausalni-status">
  <PausalniStatusCard />
</Visible>

// The component internally checks:
// 1. Is legalForm === "OBRT_PAUSAL"?
// 2. Is stage >= "setup"?
// 3. Is module "pausalni" in entitlements?
```

---

## 8. Dashboard & Progressive Disclosure

### 8.1 The Four Stages

#### Stage 0: Onboarding (Wizard)

**Trigger:** `hasCompletedOnboarding: false` (company missing required fields)

**User Sees:**

- Full-screen 4-step wizard
- NO access to dashboard
- Cannot skip

**Wizard Steps:**
| Step | Fields | Validation |
|------|--------|------------|
| 1. Basic Info | Name, OIB, Legal Form | OIB = 11 digits |
| 2. Competence | Global level, Category levels | At least one selected |
| 3. Address | Street, Postal Code, City | All required |
| 4. Contact & Tax | Email, IBAN, VAT checkbox | Email valid, IBAN valid |

**Completion Logic:**

```typescript
isOnboardingComplete = Boolean(
  company.name &&
  company.oib &&
  company.legalForm &&
  company.address &&
  company.postalCode &&
  company.city &&
  company.email &&
  company.iban &&
  company.featureFlags?.competence
)
```

---

#### Stage 1: Setup (New User)

**Trigger:** Onboarding complete + 0 invoices + 0 bank statements

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Hero Banner                                            │
│  "Dobrodošli, [Name]! Postavimo vaš poslovni cockpit."  │
├─────────────────────────────────────────────────────────┤
│  Setup Checklist                    │  Today's Actions  │
│  □ Create first contact             │  No pending tasks │
│  □ Create first invoice             │                   │
│  □ Connect bank account             │                   │
│  □ Upload fiscal certificate        │                   │
├─────────────────────────────────────────────────────────┤
│  [Paušalni Status Card]             │  Deadlines        │
│  40k Limit: 0 EUR (0%)              │  Next: MIO 15.01  │
│  "You haven't earned anything yet"  │                   │
└─────────────────────────────────────────────────────────┘
```

**Hidden in Stage 1:**

- Revenue Trend (empty chart is sad)
- Invoice Funnel (no data)
- AI Insights (need context)
- Recent Activity (nothing yet)

---

#### Stage 2: Active (Operational)

**Trigger:** 1+ invoice created OR 1+ bank statement imported

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Hero Banner (condensed)                                │
│  "[Company] • [X] contacts • Provider: [Connected/Not]" │
├─────────────────────────────────────────────────────────┤
│  Revenue Trend (6mo)     │  Invoice Funnel              │
│  ████ 2,500 EUR          │  Draft → Fiscal → Sent →    │
│  ███ 1,800 EUR           │  Delivered → Accepted        │
├─────────────────────────────────────────────────────────┤
│  Recent Activity         │  [Paušalni/VAT Status]       │
│  • Invoice #001 - Sent   │  Limit: 4,300 EUR (10.75%)   │
│  • Invoice #002 - Draft  │  ████░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│  Quick Actions           │  Upcoming Deadlines          │
│  [+ E-Račun] [+ Račun]   │  MIO I: 15.01 (3 days)       │
│  [+ Kontakt] [+ Trošak]  │  HOK: 27.02 (45 days)        │
└─────────────────────────────────────────────────────────┘
```

**Setup Checklist:**

- Moved to sidebar (collapsed)
- Or Settings page
- Not prominent on dashboard

---

#### Stage 3: Strategic (Mature)

**Trigger:** 10+ invoices OR VAT registered

**Additional Elements:**

```
┌─────────────────────────────────────────────────────────┐
│  AI Insights                                            │
│  "Your average invoice is 450 EUR. Consider bundling."  │
│  "You're at 85% of VAT threshold. Plan ahead."          │
├─────────────────────────────────────────────────────────┤
│  VAT Overview            │  Corporate Tax (D.O.O. only) │
│  Paid: 1,250 EUR         │  Estimated: 2,400 EUR        │
│  Pending: 450 EUR        │  Due: 30.04.2025             │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Dashboard Element Catalog

| Element         | Component                     | Module        | Competence | Stage     |
| --------------- | ----------------------------- | ------------- | ---------- | --------- |
| Hero Banner     | `hero-banner.tsx`             | Core          | All        | setup+    |
| Setup Checklist | `ChecklistWidget.tsx`         | Guidance      | beginner   | setup     |
| Recent Activity | `recent-activity.tsx`         | Core          | standard+  | active+   |
| Revenue Trend   | `revenue-trend-card.tsx`      | invoicing     | standard+  | active+   |
| Invoice Funnel  | `invoice-funnel-card.tsx`     | invoicing     | standard+  | active+   |
| Paušalni Status | `pausalni-status-card.tsx`    | pausalni      | All        | setup+    |
| VAT Overview    | `vat-overview-card.tsx`       | vat           | standard+  | active+   |
| Fiscal Status   | `fiscalization-status.tsx`    | fiscalization | All        | setup+    |
| AI Insights     | `insights-card.tsx`           | ai-assistant  | All        | strategic |
| Deadlines       | `deadline-countdown-card.tsx` | Core          | All        | setup+    |
| Action Cards    | `action-cards.tsx`            | ai-assistant  | All        | active+   |
| Quick Stats     | `quick-stats.tsx`             | Core          | standard+  | active+   |

---

## 9. UI Components & Behaviors

### 9.1 Layout Components

#### Header (`header.tsx`)

| Element             | Visibility                     | Behavior                   |
| ------------------- | ------------------------------ | -------------------------- |
| Logo                | Always                         | Click → /dashboard         |
| Company Switcher    | Desktop, if multiple companies | Dropdown, switch context   |
| Company Status Pill | Tablet                         | Shows e-invoice connection |
| Onboarding Progress | Desktop, if incomplete         | Click → /onboarding        |
| Plan Badge          | XL screens                     | Shows subscription tier    |
| Quick Level Toggle  | Desktop                        | beginner/standard/expert   |
| Command Palette     | Always                         | ⌘K to open                 |
| Quick Actions       | Desktop                        | + dropdown                 |
| Notifications       | Always                         | Bell + unread count        |
| User Menu           | Always                         | Profile, Settings, Logout  |

#### Sidebar (`sidebar.tsx`)

**Sections:**

1. User Card (expanded view only)
2. Checklist Mini-View (if beginner + setup stage)
3. Navigation Groups:
   - Dashboard
   - Invoicing (Računi, E-Računi)
   - Accounting (PDV, Paušalni, Doprinosi, Porez)
   - Operations (Kontakti, Proizvodi, Troškovi, Dokumenti, Import)
   - Banking (Računi, Transakcije, Sravnjenje)
   - POS
   - Izvještaji
   - Postavke
   - Podrška

**Module Gating:**

- Each nav item checks `moduleAccess.canAccessRoute(href)`
- Hidden items don't show (no "locked" state in nav)

#### Bottom Navigation (Mobile)

| Element   | Icon     | Action              |
| --------- | -------- | ------------------- |
| Dashboard | Home     | Navigate            |
| Invoices  | FileText | Navigate            |
| Add (+)   | Plus     | Opens action drawer |
| Banking   | Building | Navigate            |
| More      | Menu     | Opens full nav      |

**Action Drawer:**

- E-Račun → /e-invoices/new
- Račun → /invoices/new
- Kontakt → /contacts/new
- Trošak → /expenses/new

### 9.2 Form Components

#### Invoice Form

**Fields:**
| Field | Type | Validation |
|-------|------|------------|
| Kupac | Contact selector | Required |
| Datum izdavanja | Date picker | Required |
| Datum dospijeća | Date picker | > issue date |
| Stavke | Line item table | Min 1 |
| └─ Opis | Text | Required |
| └─ Količina | Number | > 0 |
| └─ Jedinica | Select | kom/h/dan/mj |
| └─ Cijena | Decimal | >= 0 |
| └─ PDV | Select | 25%/13%/5%/0% |
| Napomena | Textarea | Optional |

**Paušalni Logic:**

- If `legalForm === "OBRT_PAUSAL"` && `!isVatPayer`:
  - PDV column hidden
  - Auto-add footer: "Nije u sustavu PDV-a"

**Line Item Behavior:**

- Add row: Button at bottom
- Remove row: X button (if > 1 row)
- Auto-calculate: Amount = Qty × Price
- Running total: Updates on any change

#### Onboarding Steps

**Step 1 - Basic Info:**

```tsx
<Input name="name" label="Naziv tvrtke" required />
<OIBInput name="oib" label="OIB" required />
<Select name="legalForm" label="Pravni oblik" options={[
  { value: "OBRT_PAUSAL", label: "Paušalni obrt" },
  { value: "OBRT_REAL", label: "Obrt (dohodak)" },
  { value: "OBRT_VAT", label: "Obrt u PDV sustavu" },
  { value: "JDOO", label: "j.d.o.o." },
  { value: "DOO", label: "d.o.o." },
]} />
```

**Step 2 - Competence:**

```tsx
// Three cards, selectable
<CompetenceCard level="beginner"
  title="Početnik"
  description="Pokazuj mi sve savjete i upute" />
<CompetenceCard level="standard"
  title="Prosječan"
  description="Standardni prikaz" />
<CompetenceCard level="expert"
  title="Stručnjak"
  description="Minimalne upute, maksimalna kontrola" />
```

**Step 3 - Address:**

```tsx
<Input name="address" label="Adresa" required />
<Input name="postalCode" label="Poštanski broj" required />
<Input name="city" label="Grad" required />
<Select name="country" label="Država" default="HR" />
```

**Step 4 - Contact & Tax:**

```tsx
<Input name="email" type="email" label="Email" required />
<Input name="phone" label="Telefon" optional />
<Input name="iban" label="IBAN" required />
<Checkbox name="isVatPayer" label="U sustavu PDV-a"
  disabled={legalForm === "OBRT_PAUSAL"} />
// Note for paušalni: "Paušalni obrt nije u sustavu PDV-a"
```

### 9.3 Modal & Dialog Behaviors

| Modal              | Trigger             | Content                     | Actions              |
| ------------------ | ------------------- | --------------------------- | -------------------- |
| Confirm Delete     | Delete button click | "Are you sure?" + item name | Cancel, Delete (red) |
| Certificate Upload | Settings → Fiscal   | File dropzone + password    | Cancel, Upload       |
| Payment Slip       | View payment        | Hub3 barcode + details      | Close, Download      |
| Form Generator     | Generate PO-SD      | Year/quarter selection      | Cancel, Generate     |

### 9.4 Empty States

Every list/table has an empty state:

| Page              | Empty State Message           | CTA                     |
| ----------------- | ----------------------------- | ----------------------- |
| Invoices          | "Nemate još nijedan račun"    | "Izradi prvi račun"     |
| Contacts          | "Nemate još nijedan kontakt"  | "Dodaj kontakt"         |
| Products          | "Nemate još nijedan proizvod" | "Dodaj proizvod"        |
| Expenses          | "Nemate još nijedan trošak"   | "Dodaj trošak"          |
| Bank Transactions | "Nema transakcija"            | "Poveži bankovni račun" |

### 9.5 Toast Notifications

| Type    | Icon          | Background | Duration |
| ------- | ------------- | ---------- | -------- |
| Success | CheckCircle   | Green      | 3s       |
| Error   | XCircle       | Red        | 5s       |
| Warning | AlertTriangle | Yellow     | 4s       |
| Info    | Info          | Blue       | 3s       |

**Examples:**

- Success: "Račun uspješno kreiran!"
- Error: "Greška pri spremanju. Pokušajte ponovno."
- Warning: "Blizu ste limita od 40.000 EUR"
- Info: "Novi izvještaj je dostupan"

---

## 10. Complete User Flows

### 10.1 Authentication Flows

#### Registration

```
1. /register
   └─ Enter email
2. Check if email exists
   ├─ YES → "Email already registered" → Login link
   └─ NO → Continue
3. Set password (or passkey)
4. Verify email (6-digit OTP)
5. Create User record
6. Redirect → /onboarding
```

#### Login

```
1. /login
   └─ Enter email
2. Check auth methods available
   ├─ Has passkey → Offer passkey login
   ├─ Has password → Show password field
   └─ Has both → Show both options
3. Authenticate
4. Check company setup
   ├─ No company → /onboarding
   └─ Has company → /dashboard
```

#### Password Reset

```
1. /forgot-password
   └─ Enter email
2. Send OTP to email
3. Enter OTP
4. Set new password
5. Redirect → /login
```

### 10.2 Invoice Creation Flow

```
1. Click "+ E-Račun" (or navigate to /e-invoices/new)
2. Select buyer (from contacts)
   ├─ Existing contact → Auto-fill
   └─ "Add new" → Quick contact form
3. Set dates (issue date, due date)
4. Add line items
   ├─ Manual entry
   └─ Select from products → Auto-fill price/VAT
5. Review totals
6. Click "Spremi kao nacrt" OR "Fiskaliziraj i pošalji"
   ├─ Draft → Save, redirect to invoice view
   └─ Fiscalize →
       ├─ Generate ZKI
       ├─ Send to CIS
       ├─ Receive JIR
       ├─ Save with JIR/ZKI
       └─ Option: Send via email
```

### 10.3 Bank Reconciliation Flow

```
1. Navigate to /banking/reconciliation
2. View unmatched transactions
3. For each transaction:
   ├─ System suggests matches (AI)
   │   └─ "This looks like payment for Invoice #001"
   ├─ User actions:
   │   ├─ Accept match → Link transaction to invoice
   │   ├─ Reject match → Mark as ignored
   │   └─ Manual match → Search invoices/expenses
   └─ Create new:
       ├─ "Create expense from this" → Opens expense form
       └─ "Create income from this" → Opens invoice form
4. Transaction status updates:
   UNMATCHED → AUTO_MATCHED → confirmed
   UNMATCHED → MANUAL_MATCHED → confirmed
   UNMATCHED → IGNORED
```

### 10.4 Paušalni Monthly Flow

```
Monthly Contribution Payment:
1. Dashboard shows "Doprinosi dospijevaju za 5 dana"
2. Click → Opens payment details
3. View:
   ├─ MIO I: 107.88 EUR
   ├─ MIO II: 35.96 EUR
   ├─ HZZO: 118.67 EUR
   └─ Total: 262.51 EUR
4. Generate payment slips (Hub3 barcode)
5. Mark as paid when done
```

```
Quarterly Tax Payment:
1. Dashboard shows "Porez na dohodak dospijeva"
2. Click → Opens quarterly calculation
3. System calculates based on revenue bracket
4. Generate payment slip
5. Mark as paid
```

```
Annual PO-SD Submission:
1. January: System prompts "Time for PO-SD"
2. Click "Generate PO-SD"
3. Review auto-filled form
4. Download XML
5. Submit to ePorezna (external)
6. Upload confirmation
```

### 10.5 VAT Return Flow (DOO/JDOO)

```
1. Navigate to /reports/vat
2. Select period (month or quarter)
3. System calculates:
   ├─ Output VAT (from sales invoices)
   ├─ Input VAT (from purchase invoices/expenses)
   └─ Net payable/refund
4. Review URA (incoming) register
5. Review IRA (outgoing) register
6. Generate PDV-RR form
7. Download XML
8. Submit to ePorezna
9. If payable: Generate payment slip
```

---

## 11. Tax & Regulatory Data

### 11.1 Key Thresholds (2025)

| Threshold            | Amount        | Consequence                         |
| -------------------- | ------------- | ----------------------------------- |
| VAT Registration     | 60,000 EUR    | Must register for VAT within 8 days |
| Paušalni Limit       | 60,000 EUR    | Must switch to real income basis    |
| Cash B2B Limit       | 700 EUR       | Fines for both parties if exceeded  |
| Asset Capitalization | 464.53 EUR    | Must depreciate over useful life    |
| Small Business       | 1,000,000 EUR | Corporate tax 10% vs 18%            |

### 11.2 Tax Rates

**Income Tax (Porez na dohodak):**
| Bracket | Rate | With Surtax (~18%) |
|---------|------|-------------------|
| 0 - 50,400 EUR | 20% | ~23.6% |
| 50,400+ EUR | 30% | ~35.4% |

**Corporate Tax (Porez na dobit):**
| Revenue | Rate |
|---------|------|
| ≤ 1,000,000 EUR | 10% |
| > 1,000,000 EUR | 18% |

**VAT Rates:**
| Rate | Applies To |
|------|------------|
| 25% | Most goods and services |
| 13% | Hospitality, newspapers |
| 5% | Bread, milk, books, medicines |
| 0% | Exports, financial services |

**Paušalni Tax (12% base):**
7 brackets from 1,695 EUR to 9,000 EUR base amounts.

### 11.3 Contribution Rates (2025)

| Contribution        | Rate      | Minimum Monthly |
| ------------------- | --------- | --------------- |
| MIO I (Pension I)   | 15%       | 107.88 EUR      |
| MIO II (Pension II) | 5%        | 35.96 EUR       |
| HZZO (Health)       | 16.5%     | 118.67 EUR      |
| **Total**           | **36.5%** | **262.51 EUR**  |

Minimum base: 719.2 EUR/month

### 11.4 Payment IBANs

| Payment Type | IBAN                  | Model |
| ------------ | --------------------- | ----- |
| State Budget | HR1210010051863000160 | HR68  |
| MIO II       | HR8724070001007120013 | HR68  |
| HZZO         | HR6510010051550100001 | HR68  |
| HOK          | HR1223400091100106237 | HR68  |

### 11.5 Deadlines Calendar

**Monthly:**
| Day | What | Who |
|-----|------|-----|
| 15th | Contributions (MIO, HZZO) | All |
| 15th | JOPPD | Employers |
| 20th | PDV (monthly filers) | VAT > 800k |

**Quarterly:**
| When | What | Who |
|------|------|-----|
| 20.01/04/07/10 | PDV (quarterly) | Small VAT payers |
| 31.01/04/07/10 | Paušalni tax | Paušalni obrt |
| 27.02/31.05/31.08/30.11 | HOK | All obrts |

**Annual:**
| When | What | Who |
|------|------|-----|
| 15.01 | PO-SD | Paušalni |
| 28.02 | DOH | Obrt dohodak |
| 30.04 | PDO | D.O.O. |

---

## 12. Integration Ecosystem

### 12.1 External Systems

| System        | Purpose                 | Status        |
| ------------- | ----------------------- | ------------- |
| FINA CIS      | Fiscalization (JIR/ZKI) | ⚠️ 60%        |
| IE-Računi     | E-invoice intermediary  | ✅ Production |
| Gocardless    | PSD2 bank sync          | ✅ Production |
| SaltEdge      | PSD2 bank sync          | ✅ Production |
| Stripe        | Payments + Terminal     | ✅ Production |
| Resend        | Transactional email     | ✅ Production |
| Cloudflare R2 | Document storage        | ✅ Production |

### 12.2 E-Invoice Providers

| Provider   | Type         | Our Support |
| ---------- | ------------ | ----------- |
| IE-Računi  | Intermediary | ✅ Full     |
| FINA       | Direct       | ⚠️ Planned  |
| Moj-eRačun | Intermediary | ❌ Not yet  |
| Solo       | Intermediary | ❌ Not yet  |
| Mock       | Testing      | ✅ Full     |

### 12.3 Bank Import Formats

| Format        | Extension | Support |
| ------------- | --------- | ------- |
| CSV (generic) | .csv      | ✅      |
| CAMT.053      | .xml      | ✅      |
| MT940         | .sta      | ✅      |
| PBZ Export    | .csv      | ✅      |
| Erste Export  | .csv      | ✅      |

---

## 13. Monetization & Pricing

### 13.1 Tier Structure

| Tier           | Price     | Includes                                                                   |
| -------------- | --------- | -------------------------------------------------------------------------- |
| **Free**       | 0 EUR     | Invoicing, Contacts, Products, Expenses, Banking, Basic Reports, Documents |
| **Paušalni**   | 9 EUR/mo  | Free + Paušalni module, Contributions tracking                             |
| **Pro**        | 19 EUR/mo | Free + Fiscalization, Reconciliation, Advanced Reports                     |
| **Business**   | 39 EUR/mo | Pro + VAT, Corporate Tax, AI Assistant                                     |
| **Enterprise** | Custom    | Business + Staff assignments, Multi-user                                   |

### 13.2 Module-to-Tier Mapping

| Module           | Free | Paušalni | Pro | Business | Enterprise |
| ---------------- | ---- | -------- | --- | -------- | ---------- |
| invoicing        | ✅   | ✅       | ✅  | ✅       | ✅         |
| e-invoicing      | ✅   | ✅       | ✅  | ✅       | ✅         |
| contacts         | ✅   | ✅       | ✅  | ✅       | ✅         |
| products         | ✅   | ✅       | ✅  | ✅       | ✅         |
| expenses         | ✅   | ✅       | ✅  | ✅       | ✅         |
| banking          | ✅   | ✅       | ✅  | ✅       | ✅         |
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

**Tier 1 (Launch for Paušalni):** ~2 weeks

- [ ] Fiscalization polish (60% → 90%)
- [ ] Payment Hub3 generator
- [ ] HOK/contribution reminders

**Tier 2 (Unlock Obrt Dohodak):** ~4 weeks

- [ ] KPI module
- [ ] URA/IRA reports
- [ ] Assets (DI) module

**Tier 3 (Full D.O.O.):** ~4 weeks

- [ ] Complete PDV forms
- [ ] Enhanced URA/IRA
- [ ] Corporate tax calculation

**Tier 4 (Premium):** ~6 weeks

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

```prisma
model EInvoice {
  id          String         @id
  companyId   String
  contactId   String
  number      String
  type        InvoiceType    // INVOICE, E_INVOICE, QUOTE, PROFORMA, CREDIT_NOTE
  status      InvoiceStatus  // DRAFT, PENDING_FISCALIZATION, FISCALIZED, SENT, DELIVERED, ACCEPTED, REJECTED
  direction   Direction      // OUTBOUND, INBOUND
  issueDate   DateTime
  dueDate     DateTime
  subtotal    Decimal
  vatTotal    Decimal
  total       Decimal
  jir         String?        // Fiscal JIR
  zki         String?        // Fiscal ZKI
  ublXml      String?        // UBL XML content
  lines       EInvoiceLine[]
}

model EInvoiceLine {
  id          String   @id
  invoiceId   String
  description String
  quantity    Decimal
  unit        String
  unitPrice   Decimal
  vatRate     Decimal
  vatAmount   Decimal
  lineTotal   Decimal
}
```

### 15.3 Missing Models (To Be Implemented)

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

## Appendix A: Glossary

| Term  | Croatian                                     | Meaning                      |
| ----- | -------------------------------------------- | ---------------------------- |
| OIB   | Osobni identifikacijski broj                 | 11-digit tax ID              |
| PDV   | Porez na dodanu vrijednost                   | VAT                          |
| MIO   | Mirovinsko osiguranje                        | Pension insurance            |
| HZZO  | Hrvatski zavod za zdravstveno osiguranje     | Health insurance             |
| JIR   | Jedinstveni identifikator računa             | Fiscal receipt ID            |
| ZKI   | Zaštitni kod izdavatelja                     | Issuer security code         |
| KPR   | Knjiga prometa                               | Daily sales log (paušalni)   |
| KPI   | Knjiga primitaka i izdataka                  | Income/expense book          |
| PO-SD | Prijava poreza na dohodak - pojednostavljena | Simplified income tax return |
| URA   | Ulazni računi                                | Incoming invoices            |
| IRA   | Izlazni računi                               | Outgoing invoices            |
| HOK   | Hrvatska obrtnička komora                    | Croatian Chamber of Trades   |
| FINA  | Financijska agencija                         | Financial Agency             |
| CIS   | Centralni informacijski sustav               | Central Information System   |

---

## Appendix B: File Locations

| Purpose              | Path                              |
| -------------------- | --------------------------------- |
| Module definitions   | `/src/lib/modules/definitions.ts` |
| Visibility rules     | `/src/lib/visibility/rules.ts`    |
| RBAC permissions     | `/src/lib/rbac.ts`                |
| Tax data             | `/src/lib/fiscal-data/`           |
| Paušalni logic       | `/src/lib/pausalni/`              |
| E-invoice generation | `/src/lib/e-invoice/`             |
| Dashboard widgets    | `/src/components/dashboard/`      |
| Onboarding steps     | `/src/components/onboarding/`     |
| Guidance system      | `/src/components/guidance/`       |

---

## Document History

| Version | Date       | Author | Changes                          |
| ------- | ---------- | ------ | -------------------------------- |
| 4.0.0   | 2025-12-19 | Claude | Complete rewrite - unified bible |
| 3.1.0   | 2025-12-19 | Gemini | V3.1 Expansion                   |
| 2.0.0   | 2025-12-19 | Codex  | V2 Rewrite                       |
| 1.0.0   | 2025-12-19 | Gemini | Initial draft                    |

---

**This document is the single source of truth for FiskAI product definition.**
