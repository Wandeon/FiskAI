# Vision & Architecture

[← Back to Index](./00-INDEX.md)

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
| **Document Integrity**     | SHA-256 hashing + audit logging for all documents                   | 11-year archive must prove documents unaltered            |

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

| Layer      | Technology               | Purpose                                |
| ---------- | ------------------------ | -------------------------------------- |
| Framework  | Next.js 15 App Router    | Server components, streaming, routing  |
| Database   | PostgreSQL 16 + Prisma 7 | Primary data persistence, multi-tenant |
| Database   | Drizzle ORM              | Guidance, news, paušalni tables        |
| Auth       | NextAuth v5 (Auth.js)    | Session management, OAuth, Passkeys    |
| Styling    | Tailwind CSS + CVA       | Design system, component variants      |
| Validation | Zod                      | Schema validation everywhere           |
| Email      | Resend                   | Transactional email                    |
| Storage    | Cloudflare R2            | Encrypted document archive             |
| Payments   | Stripe                   | Subscriptions, Terminal                |
| Banking    | Gocardless/SaltEdge      | PSD2 bank connections                  |
| Fiscal     | FINA CIS                 | Croatian fiscalization                 |

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
│   ├── e-invoice/       # UBL/XML generation
│   └── db/
│       ├── drizzle.ts   # Drizzle client
│       └── schema/      # Drizzle table definitions
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
