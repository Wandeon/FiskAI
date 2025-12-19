# Multi-Role Architecture Design

**Date:** 2025-12-19
**Status:** Approved
**Author:** Claude (with partner input)

## Overview

Split FiskAI into three distinct portals serving different user types:

| Portal           | Domain            | Audience             | Purpose                     |
| ---------------- | ----------------- | -------------------- | --------------------------- |
| **Marketing**    | `fiskai.eu`       | Public               | Landing, guides, news, auth |
| **Client App**   | `app.fiskai.eu`   | Clients              | Business dashboard          |
| **Staff Portal** | `staff.fiskai.eu` | Internal accountants | Multi-client workspace      |
| **Admin Portal** | `admin.fiskai.eu` | Platform owner       | Platform management         |

## Key Decisions

| Decision                     | Choice                                      | Rationale                                     |
| ---------------------------- | ------------------------------------------- | --------------------------------------------- |
| Staff access model           | Dedicated dashboard with client switcher    | Efficient multi-client management             |
| Staff scope per client       | Module-based (follows client subscription)  | No extra permission layer to manage           |
| Admin features               | Tenants, subscriptions, external services   | Full platform control                         |
| Module granularity           | Fine-grained (16 modules)                   | Flexible subscription packaging               |
| Accountant-client assignment | Admin assigns                               | Full control, clear accountability            |
| URL structure                | Subdomain-based                             | Clean separation, clear branding              |
| Role separation              | systemRole separate from per-company roles  | Avoids confusion with client's own accountant |
| Staff permission level       | Operational (ADMIN-equivalent, no billing)  | Work on financials, not account admin         |
| Authentication               | SSO with role selection                     | Login once, choose mode                       |
| Support tickets              | Tiered (technical→admin, accounting→staff)  | Route to right person                         |
| Staff dashboard              | Full overview with tasks, calendar, metrics | Comprehensive workspace                       |
| Marketing location           | Root domain (fiskai.eu)                     | Standard SaaS pattern                         |

## System-Level Role Concept

New field on User model separate from per-company roles:

```typescript
enum SystemRole {
  USER   // Regular clients → app.fiskai.eu
  STAFF  // Internal accountants → staff.fiskai.eu
  ADMIN  // Platform owner → admin.fiskai.eu
}
```

**Per-company roles unchanged:** OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER still control permissions within a specific company.

**Key distinction:**

- Client's own accountant = User with `systemRole: USER` + `CompanyUser.role: ACCOUNTANT`
- Platform's staff accountant = User with `systemRole: STAFF` + `StaffAssignment` records

## Module System

16 toggleable modules stored in Company's `entitlements` array:

| #   | Module Key         | Features Included                               | Default |
| --- | ------------------ | ----------------------------------------------- | ------- |
| 1   | `invoicing`        | Invoices, quotes, proformas, credit/debit notes | Yes     |
| 2   | `e-invoicing`      | E-invoices, UBL/XML, provider integration       | Yes     |
| 3   | `fiscalization`    | JIR/ZKI, fiscal receipts, CIS                   | No      |
| 4   | `contacts`         | Customer & supplier management                  | Yes     |
| 5   | `products`         | Product catalog, pricing                        | Yes     |
| 6   | `expenses`         | Expense tracking, categories, recurring         | Yes     |
| 7   | `banking`          | Bank accounts, transactions, imports            | No      |
| 8   | `reconciliation`   | Auto-matching, statement reconciliation         | No      |
| 9   | `reports-basic`    | Aging, KPR, profit/loss                         | Yes     |
| 10  | `reports-advanced` | VAT reports, exports, custom reports            | No      |
| 11  | `pausalni`         | Paušalni obrt: PO-SD, calendar, obligations     | No      |
| 12  | `vat`              | VAT management, thresholds, submissions         | No      |
| 13  | `corporate-tax`    | DOO/JDOO tax features                           | No      |
| 14  | `pos`              | Point of sale, Stripe Terminal                  | No      |
| 15  | `documents`        | Document storage, attachments                   | Yes     |
| 16  | `ai-assistant`     | AI help, document analysis                      | No      |

### Module Visibility Control

1. **Navigation**: Menu items hidden if module disabled
2. **Routes**: Middleware blocks access, redirects to upgrade page
3. **Actions**: Create buttons hidden/disabled
4. **API**: Endpoints return 403 if module not entitled

### Module Assignment

- Tied to subscription plan (e.g., "Starter" = 6 modules, "Pro" = 16)
- Admin can override per-company for custom deals
- Staff access follows client's modules (no separate config)

## Database Schema Changes

### User Model Extension

```prisma
model User {
  // ... existing fields
  systemRole  SystemRole  @default(USER)
}

enum SystemRole {
  USER
  STAFF
  ADMIN
}
```

### New StaffAssignment Table

```prisma
model StaffAssignment {
  id          String   @id @default(cuid())
  staffId     String   // User with systemRole=STAFF
  companyId   String   // Client company
  assignedAt  DateTime @default(now())
  assignedBy  String   // Admin who made assignment
  notes       String?  // Optional notes about this client

  staff       User     @relation("StaffAssignments", fields: [staffId])
  company     Company  @relation("AssignedStaff", fields: [companyId])
  assigner    User     @relation("AssignmentsMade", fields: [assignedBy])

  @@unique([staffId, companyId])
}
```

### Company Model Update

```prisma
model Company {
  // ... existing fields
  entitlements    String[]  @default(["invoicing", "contacts", "products",
                                       "expenses", "reports-basic", "documents"])

  // New relation
  assignedStaff   StaffAssignment[]  @relation("AssignedStaff")
}
```

### SupportTicket Category

```prisma
model SupportTicket {
  // ... existing fields
  category    TicketCategory  @default(GENERAL)
}

enum TicketCategory {
  TECHNICAL   // → Admin
  BILLING     // → Admin
  ACCOUNTING  // → Assigned staff
  GENERAL     // → Admin (default)
}
```

## Portal Specifications

### Admin Portal (`admin.fiskai.eu`)

**Purpose:** Platform management, system configuration, oversight

**Dashboard:**

- Total tenants, active subscriptions, MRR metrics
- Recent signups, churn alerts
- System health indicators

**Sections:**

| Section           | Features                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Tenants**       | List all companies, search/filter, view details, subscription status, usage stats, edit entitlements, impersonate |
| **Staff**         | List staff accountants, create/deactivate, assign to clients, view workload                                       |
| **Subscriptions** | Plans overview, revenue metrics, renewals, failed payments                                                        |
| **Services**      | External integrations: e-invoice providers, bank connections, email, payments. API keys, health, toggles          |
| **Support**       | All tickets (technical/billing), assign, respond                                                                  |
| **Settings**      | Global settings, feature flags, announcements, maintenance mode                                                   |
| **Audit Log**     | System-wide audit trail                                                                                           |

**Access:** Only `systemRole: ADMIN`

### Staff Portal (`staff.fiskai.eu`)

**Purpose:** Multi-client workspace for internal accountants

**Dashboard (unified overview):**

- Task list: Aggregated deadlines across all clients
- Calendar view: Monthly obligations, color-coded by client
- Alerts: Items needing attention
- Metrics: Quick stats across portfolio
- Ticket queue: Accounting-related tickets
- Activity feed: Recent changes across clients
- Document inbox: New uploads awaiting processing

**Client Management:**

- Client list with quick indicators
- Search/filter
- Context switcher
- "Working as: [Client Name]" indicator

**When working on client:**

- Full access to client's enabled modules
- ADMIN-equivalent permissions (create/edit/delete)
- Cannot: manage billing, subscription, invite users

**Batch Actions:**

- Reports for multiple clients
- Cross-client exports
- Bulk deadline tracking

**Access:** Only `systemRole: STAFF`, limited to assigned companies

### Client App (`app.fiskai.eu`)

**Purpose:** Client's business dashboard

**Navigation (module-dependent):**

```
Dashboard (always)
├── Invoicing*
├── E-Invoicing*
├── Contacts*
├── Products*
├── Expenses*
├── Banking*
├── Reconciliation*
├── Reports Basic*
├── Reports Advanced*
├── Paušalni*
├── VAT*
├── Corporate Tax*
├── POS*
├── Documents*
├── AI Assistant*
├── Support (always)
└── Settings (always)

* = shown only if module enabled
```

**Preserved systems:**

- Per-company roles (OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER)
- Visibility layers (legal form, competence, progression)
- Tenant isolation

**Changes:**

- Module-based route protection
- Upgrade prompts for disabled modules
- Support ticket category selector

**Access:** `systemRole: USER` with at least one `CompanyUser` record

## Authentication & Routing

### Auth Flow

```
fiskai.eu/login
       ↓
   Authenticate
       ↓
 Multiple roles? ─── No ──→ Redirect to subdomain
       │
      Yes
       ↓
 Role Selection
       ↓
 Redirect to chosen subdomain
```

### Session Management

- Cookie domain: `.fiskai.eu` (shared across subdomains)
- JWT contains: `userId`, `systemRole`, `currentMode`
- "Switch mode" in profile menu

### Middleware Logic

```typescript
function middleware(request) {
  const subdomain = getSubdomain(request.headers.host)
  const session = await getSession()

  // Unauthenticated → login
  if (!session && isProtectedRoute(request.pathname)) {
    return redirect("https://fiskai.eu/login")
  }

  // Wrong subdomain → redirect
  if (subdomain === "admin" && session.systemRole !== "ADMIN") {
    return redirect(getCorrectSubdomain(session.systemRole))
  }

  // Module protection (app subdomain)
  if (subdomain === "app") {
    const requiredModule = getModuleForRoute(request.pathname)
    if (requiredModule && !companyHasModule(requiredModule)) {
      return redirect("/upgrade?module=" + requiredModule)
    }
  }
}
```

## Project Structure

```
src/
├── app/
│   ├── (marketing)/              # fiskai.eu
│   │   ├── page.tsx              # Landing
│   │   ├── vijesti/
│   │   ├── vodici/
│   │   ├── usporedbe/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── layout.tsx
│   │
│   ├── (app)/                    # app.fiskai.eu
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   ├── e-invoices/
│   │   ├── contacts/
│   │   ├── ... (current routes)
│   │   └── layout.tsx
│   │
│   ├── (staff)/                  # staff.fiskai.eu
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── clients/[companyId]/
│   │   ├── calendar/
│   │   ├── tickets/
│   │   ├── tasks/
│   │   └── layout.tsx
│   │
│   ├── (admin)/                  # admin.fiskai.eu
│   │   ├── dashboard/
│   │   ├── tenants/
│   │   ├── tenants/[companyId]/
│   │   ├── staff/
│   │   ├── subscriptions/
│   │   ├── services/
│   │   ├── support/
│   │   ├── settings/
│   │   └── layout.tsx
│   │
│   └── api/
│
├── lib/
│   ├── auth.ts
│   ├── middleware/
│   │   ├── subdomain.ts
│   │   └── module-guard.ts
│   ├── modules/
│   └── staff/
│
└── middleware.ts
```

## Migration Strategy

### Phase 1: Foundation (no user-facing changes)

- Add `systemRole` to User model (default: USER)
- Create `StaffAssignment` table
- Add `category` to SupportTicket
- Update entitlements to new module keys
- Set admin account to `systemRole: ADMIN`

### Phase 2: Subdomain Infrastructure

- Configure DNS (app., staff., admin. subdomains)
- Update middleware for subdomain detection
- Configure NextAuth cookie domain
- Set up subdomain → route group mapping

### Phase 3: Admin Portal

- Build `(admin)` route group
- Migrate/expand existing admin pages
- Add tenant, staff, services management

### Phase 4: Staff Portal

- Build `(staff)` route group
- Create unified dashboard, client switcher
- Implement "working as client" context
- Add calendar, tasks, tickets

### Phase 5: Client App Refinement

- Move routes to `(app)` route group
- Implement module-based protection
- Add upgrade prompts
- Update support ticket form

### Phase 6: Cutover

- Update production DNS
- Redirect old routes
- Monitor and deprecate old paths

## DNS Configuration (When Ready)

Domain: `fiskai.eu`

Required records (exact values depend on hosting provider):

- `fiskai.eu` → A record to host
- `app.fiskai.eu` → A/CNAME to host
- `staff.fiskai.eu` → A/CNAME to host
- `admin.fiskai.eu` → A/CNAME to host

Will provide exact values when domain is purchased and hosting confirmed.

## Open Questions

None at this time. Design approved and ready for implementation planning.
