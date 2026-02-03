# FiskAI-App Decisions

This document records key technical choices for the fresh start.

---

## Decision 1: Fresh Start with Turborepo

**Date:** 2026-02-03
**Status:** Implemented

**Decision:** Start fresh with a clean Turborepo monorepo structure instead of fixing the old codebase.

**Why:**
- Old codebase had feature creep (17 modules before core invoicing worked)
- Mixed concerns (marketing, workers, app were all in one repo)
- Broken integrations not properly wired up
- Invoice numbering conflicts with external systems
- Over-engineered architecture (15 workers, DDD, regulatory truth layer)

**Structure:**
```
apps/web/      → Next.js frontend
packages/db/   → Prisma schema + client
packages/shared/ → Zod schemas, constants
packages/trpc/ → tRPC routers
packages/ui/   → shadcn components
```

---

## Decision 2: Tech Stack (2026 Latest)

**Date:** 2026-02-03
**Status:** Implemented

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | Next.js 16 | Latest (16.1.6) with Turbopack |
| Build | Turborepo 2.3 | Monorepo orchestration |
| Package Manager | pnpm 9.15 | Fast, deterministic |
| Database | PostgreSQL 16 + Prisma 7 | Type-safe ORM, multi-file schema |
| API | tRPC 11 | Type-safe client-server |
| Styling | Tailwind CSS v4 | Latest, simplified config |
| UI Components | shadcn/ui | Copy-paste components |
| Validation | Zod | Runtime type validation |
| Auth | NextAuth v5 | Planned |

---

## Decision 3: MVP Scope (Phase 0-2)

**Date:** 2026-02-03
**Status:** Planning

**Must Have (MVP):**
- User authentication (login/register)
- Company setup (OIB, name, address)
- Business premises & payment device configuration
- E-invoice creation (buyer, items, amounts, VAT)
- Croatian invoice numbering (broj-poslovni_prostor-naplatni_uređaj)
- Invoice list with status
- E-poslovanje integration (send invoice)

**NOT in MVP:**
- AI assistant
- Regulatory truth layer
- News/content features
- Staff portal
- Admin portal
- Bank reconciliation
- Expense tracking

---

## Decision 4: Code Reuse from Old Repo

**Date:** 2026-02-03
**Status:** Planned

**Worth keeping:**
```
src/domain/shared/           # Money, VatRate value objects
src/lib/invoice-numbering.ts # Croatian format logic
src/lib/e-invoice/providers/eposlovanje-einvoice.ts # API client
```

**Simplify/Rewrite:**
```
src/lib/e-invoice/poll-*.ts  # Too complex
src/lib/integration/         # Over-engineered vault
prisma/schema.prisma         # 50+ tables → ~10 tables
```

**Drop entirely:**
```
src/lib/regulatory-truth/    # Not needed for MVP
src/lib/news/                # Not needed for MVP
src/lib/assistant/           # Not needed for MVP
src/app/staff/               # Phase 2+
src/app/admin/               # Phase 2+
```

---

## Decision 5: Infrastructure - Simple First

**Date:** 2026-02-03
**Status:** Implemented

**Choice:** All-in-one deployment (Option A)

- Single Next.js app with API routes
- Single PostgreSQL database
- No background workers initially
- Deploy to Coolify on VPS-01

**Future (if needed):**
- Add BullMQ worker for async tasks
- Add Redis for caching/queues

---

## Decision 6: E-Poslovanje Integration Approach

**Date:** 2026-02-03
**Status:** Planned

**Choice:** Direct API calls (Option A)

- Simple fetch() to e-poslovanje API
- Store credentials in env vars
- Poll for inbound via API route or cron

**Rationale:** Keep it simple. IntegrationAccount model adds complexity we don't need yet.

---

## Discussion Log

### Session 1 - 2026-02-03

**Context:** User frustrated with current state. Many features built but basic invoicing doesn't work. E-poslovanje integration exists but isn't connected properly. Invoice numbers conflict with externally-created invoices.

**Key insight:** "I did the most basic and fundamental mistake which was going for endless features before I had the most basic logic functional."

**Decision:** Start fresh, step by step, properly documented.

**Reference:** Used GenAI2 repo structure as template for Turborepo scaffolding.

---

## Decision 7: Prisma Multi-File Schema

**Date:** 2026-02-03
**Status:** Implemented

**Decision:** Use Prisma's multi-file schema feature to keep files small and organized.

**Structure:**
```
packages/db/prisma/schema/
├── base.prisma      # Generator + datasource (13 lines)
├── auth.prisma      # User, Account, Session (66 lines)
├── company.prisma   # Company, BusinessPremises (90 lines)
└── invoice.prisma   # Invoice, InvoiceLine (101 lines)
```

**Rules:**
- Each file stays under 200 lines
- Each domain gets its own file
- New features = new file (expense.prisma, banking.prisma, etc.)

**Why:** Old repo had 50+ tables in one file (1000+ lines). Impossible to maintain.

---

## Decision 8: Prisma 7 with PrismaPg Adapter

**Date:** 2026-02-03
**Status:** Implemented

**Decision:** Use Prisma 7 with PrismaPg driver adapter instead of native engine.

**Why:**
- Prisma 7 removed `url` from datasource block
- Requires `prisma.config.ts` for configuration
- Connection via `@prisma/adapter-pg` with node `pg` pool

**Files:**
- `packages/db/prisma.config.ts` - Prisma configuration
- `packages/db/src/index.ts` - Client initialization with adapter

---

## Decision 9: Auth UI Reuse

**Date:** 2026-02-03
**Status:** Implemented

**Decision:** Reuse the premium glassmorphic auth UI from old FiskAI repo.

**Components copied:**
- GlassCard - Mouse-following spotlight, 3D tilt
- FloatingOrbs - Animated background orbs with state-based colors
- AnimatedButton - Loading/success/error states
- OTPInput - 6-digit code input with auto-advance
- AuthFlow - Multi-step orchestrator
- Step components - Identify, Authenticate, Register, Verify, Reset, Success

**Why:** The auth UX was production-quality and Croatian-localized.

---

## Decision 10: NextAuth v5 with JWT Sessions

**Date:** 2026-02-03
**Status:** Implemented

**Decision:** Use NextAuth v5 (beta) with JWT sessions and credentials provider.

**Configuration:**
- JWT sessions (no database sessions table)
- Credentials provider with bcryptjs password hashing
- Google OAuth ready (needs client ID/secret)
- OTP verification via VerificationCode model

**Why:**
- JWT sessions are simpler and faster
- Credentials provider gives full control over auth flow
- OTP adds security without requiring email verification links
