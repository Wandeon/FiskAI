# DECISIONS.md - FiskAI Fresh Start Discussion

> **Purpose:** This document captures our discussion about starting FiskAI-App from scratch.
> **Status:** PLANNING - Not yet implemented
> **Date:** 2026-02-03

---

## The Problem

The current FiskAI codebase has accumulated significant technical debt:

1. **Feature creep before fundamentals** - Built 17 modules before core invoicing worked
2. **Over-engineering** - 15 background workers, regulatory truth layer, DDD architecture
3. **Mixed concerns** - Marketing, workers, and app were all in one repo before split
4. **Broken integrations** - E-poslovanje integration exists but isn't wired up properly
5. **Invoice numbering issues** - Can't sync with externally-created invoices
6. **Configuration complexity** - Multiple integration paths (V1 env vars, V2 IntegrationAccount)

**Root cause:** We went for endless features before the most basic logic was functional.

---

## The Goal

Build a **working** Croatian e-invoicing app that:

1. **Creates e-invoices** in Croatian fiscalization format
2. **Sends to e-poslovanje** (or other providers)
3. **Receives inbound invoices** and syncs invoice numbers correctly
4. **Tracks invoice status** (draft, sent, delivered, accepted, rejected)

That's it. No AI assistant, no regulatory truth layer, no 17 modules.

---

## Questions to Decide

### Q1: Start completely fresh or salvage from current repo?

**Option A: Brand new repo (empty)**
- Pro: Zero cruft, zero confusion
- Pro: Latest tooling (Next.js 16? Prisma 8?)
- Con: Need to re-implement everything from scratch
- Con: Lose any working code

**Option B: Clean branch in current repo**
- Pro: Git history preserved
- Pro: Can cherry-pick working code
- Con: Temptation to keep "just this one thing"
- Con: Old patterns might leak through

**Option C: New repo, copy specific files**
- Pro: Start fresh but reuse proven code
- Pro: Explicit about what we keep
- Con: Need to carefully audit what we copy

**Your choice:** ___

---

### Q2: Tech stack - Latest or stable?

**Framework:**
- [ ] Next.js 15 (current stable, what we have now)
- [ ] Next.js 16 (latest, Turbopack default, React 19.2)

**Database:**
- [ ] Prisma 7 (current)
- [ ] Prisma 8 (if available)
- [ ] Drizzle (alternative)

**Auth:**
- [ ] NextAuth v5 (current, but never reached stable)
- [ ] Better Auth (newer, TypeScript-first)
- [ ] Lucia Auth (lightweight)

**Styling:**
- [ ] Tailwind v3 (current)
- [ ] Tailwind v4 (latest)

**Your choice:** ___

---

### Q3: What's the absolute minimum for v1.0?

**Must have (MVP):**
- [ ] User authentication (login/register)
- [ ] Company setup (OIB, name, address)
- [ ] E-invoice creation (buyer, items, amounts, VAT)
- [ ] Croatian invoice numbering (broj-poslovni_prostor-naplatni_uređaj)
- [ ] E-poslovanje integration (send invoice)
- [ ] Invoice list with status
- [ ] Basic settings (business premises, payment devices)

**Nice to have (v1.1):**
- [ ] Inbound invoice polling
- [ ] Contact management (buyers/suppliers)
- [ ] Document upload
- [ ] Expense tracking

**Later (v2+):**
- [ ] Bank reconciliation
- [ ] Multi-company support
- [ ] Staff portal
- [ ] AI features
- [ ] Regulatory updates

**Your choice:** ___

---

### Q4: Infrastructure - Simple or distributed?

**Option A: All-in-one**
- Single Next.js app with API routes
- Single PostgreSQL database
- No background workers (use Vercel cron or simple polling)
- Deploy to Vercel or single VPS

**Option B: Minimal split**
- Next.js app on Coolify/Vercel
- PostgreSQL on managed service (Neon/Supabase/same VPS)
- One optional worker for async tasks (BullMQ)

**Option C: Current architecture** (NOT RECOMMENDED)
- Multiple VPS servers
- 15 workers
- Tailscale networking
- Complex deployment

**Your choice:** ___

---

### Q5: E-poslovanje integration approach?

**Option A: Direct API calls**
- Simple fetch() to e-poslovanje API
- Store credentials in env vars
- Poll for inbound in API route or cron

**Option B: IntegrationAccount model**
- Store credentials per company in DB
- Encrypted secrets vault
- Support multiple providers

**Option C: External service**
- Use a third-party e-invoice gateway
- Let them handle the API complexity

**Your choice:** ___

---

## Code to Reuse (If Choosing Option C)

These are well-written and worth keeping:

```
src/domain/shared/           # Money, VatRate value objects
src/components/ui/           # Button, Card, Input, DataTable
src/lib/e-invoice/providers/eposlovanje-einvoice.ts  # API client
src/lib/invoice-numbering.ts # Croatian format logic
```

These should be simplified or rewritten:

```
src/lib/e-invoice/poll-*.ts  # Too complex, multiple paths
src/lib/integration/         # Over-engineered vault
prisma/schema.prisma         # 50+ tables, need ~10
```

These should be dropped:

```
src/lib/regulatory-truth/    # Not needed for MVP
src/lib/news/                # Not needed for MVP
src/lib/assistant/           # Not needed for MVP
src/app/staff/               # Phase 2
src/app/admin/               # Phase 2
```

---

## Proposed Roadmap (If We Agree)

**Phase 0: Foundation (1-2 days)**
- [ ] Project scaffold (Next.js + Prisma + Tailwind)
- [ ] Database schema (User, Company, EInvoice, Contact, BusinessPremises, PaymentDevice, InvoiceSequence)
- [ ] Authentication setup
- [ ] Basic UI components

**Phase 1: Core Invoicing (2-3 days)**
- [ ] Company setup flow
- [ ] Business premises & payment device configuration
- [ ] Invoice creation form
- [ ] Invoice number generation
- [ ] Invoice list view

**Phase 2: E-Poslovanje Integration (1-2 days)**
- [ ] API client (reuse existing)
- [ ] Send invoice flow
- [ ] Status polling
- [ ] Error handling

**Phase 3: Polish & Deploy (1-2 days)**
- [ ] Settings pages
- [ ] Error states
- [ ] Loading states
- [ ] Production deployment

**Total: ~7-10 days to working MVP**

---

## Next Steps

After you answer the questions above, I'll:

1. Create ROADMAP.md with detailed sprints and gates
2. Create CLAUDE.md with project rules
3. Create AGENTS.md with Definition of Done
4. Set up the project scaffold
5. Start Phase 0

---

## Discussion Log

### Session 1 - 2026-02-03

**Context:** User frustrated with current state. Many features built but basic invoicing doesn't work. E-poslovanje integration exists but isn't connected to user's company. Invoice numbers conflict with externally-created invoices.

**Key insight from user:** "I did the most basic and fundamental mistake which was going for endless features before I had the most basic logic functional."

**Decision:** Start fresh, step by step, properly documented.

**Reference:** WebVB repo structure (DECISIONS.md, ROADMAP.md, CLAUDE.md, AGENTS.md, CHANGELOG.md)

---

_Waiting for your answers to proceed._
