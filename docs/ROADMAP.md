# FiskAI-App Roadmap

Fresh start implementation roadmap for Croatian e-invoicing application.

---

## Philosophy

**Core Working First.**
The basic invoicing flow works before anything else is added.

---

## Roadmap Rules

* A phase is NOT complete until its Gate passes.
* Failed gates block starting the next phase.
* Scope may only be added by creating a new phase.
* If a phase slips > 3 days, pause and re-evaluate scope.
* "In Progress" means code exists in `main`.

---

## Phases Overview

| Phase | Focus                    | Duration | Status          |
|-------|--------------------------|----------|-----------------|
| 0     | Foundation               | 1-2 days | **Complete**    |
| 1     | Core Invoicing           | 2-3 days | **Next**        |
| 2     | E-Poslovanje Integration | 1-2 days | Planned         |
| 3     | Polish & Deploy          | 1-2 days | Planned         |
| 4     | Inbound & Contacts       | 2 days   | Future          |
| 5     | Reports & Export         | 2 days   | Future          |

**Total MVP: ~7-10 days**

---

## Phase 0: Foundation ✅ COMPLETE

**Owner:** Setup

**Goal:** Working scaffold with database connection

### Sprint 0.1 – Project Scaffold ✅ DONE

* [x] Turborepo monorepo structure
* [x] Next.js 15 + Tailwind v4 + shadcn/ui
* [x] tRPC package setup
* [x] Prisma schema (User, Company, Invoice, etc.)
* [x] Shared package with Zod schemas
* [x] UI package with basic components
* [x] Documentation structure

### Sprint 0.2 – Database & Auth ✅ DONE

* [x] Connect to PostgreSQL (VPS-01 fiskai-db:5434)
* [x] Run initial migration (fiskai_fresh database)
* [x] NextAuth v5 setup (credentials + Google providers)
* [x] Login/register pages with glassmorphic UI
* [x] Protected routes (/dashboard)
* [x] OTP verification flow
* [x] Password reset flow

**Gate:** ✅ PASSED
* User can register, login, logout
* Database connection verified
* `pnpm build` passes

---

## Phase 1: Core Invoicing ⬜ PLANNED

**Owner:** Web

**Goal:** Create and list invoices with proper Croatian numbering

### Sprint 1.1 – Company Setup

* [ ] Company creation form
* [ ] OIB validation (11-digit checksum)
* [ ] Business premises setup
* [ ] Payment device setup

**Gate:** User can create company with business premises

### Sprint 1.2 – Invoice Creation

* [ ] Invoice form (buyer, items, amounts)
* [ ] Line item management (add/remove/edit)
* [ ] VAT calculation (25%, 13%, 5%, 0%)
* [ ] Croatian invoice number generation
* [ ] Save as draft

**Gate:** User can create invoice with correct numbering

### Sprint 1.3 – Invoice List & View

* [ ] Invoice list page
* [ ] Filter by status, date
* [ ] Invoice detail view
* [ ] Issue invoice (DRAFT → ISSUED)
* [ ] Cancel invoice

**Gate:** Full invoice lifecycle (create → issue) works

---

## Phase 2: E-Poslovanje Integration ⬜ PLANNED

**Owner:** Web/API

**Goal:** Send invoices to e-poslovanje

### Sprint 2.1 – API Client

* [ ] Copy/adapt eposlovanje-einvoice.ts from old repo
* [ ] Environment variable configuration
* [ ] Connection test endpoint

**Gate:** Can ping e-poslovanje API

### Sprint 2.2 – Send Invoice

* [ ] "Send to e-poslovanje" button
* [ ] E-invoice XML generation
* [ ] Status tracking (SENT, DELIVERED, ACCEPTED, REJECTED)
* [ ] Error handling

**Gate:** Invoice sent and status updated from e-poslovanje

---

## Phase 3: Polish & Deploy ⬜ PLANNED

**Owner:** Infra

**Goal:** Production-ready deployment

### Sprint 3.1 – UI Polish

* [ ] Loading states
* [ ] Error states
* [ ] Empty states
* [ ] Mobile responsiveness (375px)

### Sprint 3.2 – Production Deploy

* [ ] Environment setup on VPS-01
* [ ] Coolify deployment configuration
* [ ] DNS setup (app.fiskai.hr)
* [ ] SSL certificate
* [ ] Monitoring

**Gate:**
* Lighthouse Performance ≥ 85
* Lighthouse Accessibility ≥ 90
* Mobile verified on 375px
* Production deployment working

---

## Phase 4: Inbound & Contacts ⬜ FUTURE

* [ ] Inbound invoice polling
* [ ] Contact management (customers/suppliers)
* [ ] Contact selection in invoice form

---

## Phase 5: Reports & Export ⬜ FUTURE

* [ ] Invoice PDF export
* [ ] Monthly summary report
* [ ] CSV export

---

## Code Reuse Plan

After Phase 0 is complete, evaluate these modules from old repo:

| Module | Action | Priority |
|--------|--------|----------|
| domain/shared/Money | Copy & adapt | High |
| domain/shared/VatRate | Copy & adapt | High |
| invoice-numbering.ts | Copy & adapt | High |
| eposlovanje-einvoice.ts | Copy & adapt | Phase 2 |
| ui/DataTable | Copy & adapt | Phase 1 |

---

## Kill Criteria

If Phase 1 fails to produce working invoice creation within 3 days:

* Stop and simplify scope further
* Focus only on invoice form until it works

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Invoice creation time | < 2 minutes |
| E-invoice send success | > 95% |
| Page load time | < 2 seconds |
| Mobile usability | Works on 375px |
