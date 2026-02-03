# CLAUDE.md - Claude Code Instructions

> This file contains instructions for Claude Code when working on FiskAI-App.
> Read this file completely before making any changes.

## Project Overview

**Project:** FiskAI-App
**Type:** Croatian e-invoicing application
**Stack:** Next.js 15, TypeScript, PostgreSQL, Prisma, tRPC, Tailwind CSS v4, shadcn/ui
**Purpose:** Simple, working Croatian e-invoicing system

## Critical Rules

### 0. SECURITY IS RULE #1
```
┌─────────────────────────────────────────────────────────────────┐
│  NEVER expose services to 0.0.0.0 or public internet            │
│  NEVER hardcode secrets, API keys, passwords                    │
│  NEVER commit .env files                                        │
│  NEVER disable firewalls or security features                   │
│  NEVER skip input validation                                    │
│  ALWAYS use environment variables for secrets                   │
│  ALWAYS validate and sanitize all inputs                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1. ALWAYS Read Before Writing
- Read ROADMAP.md and DECISIONS.md before making changes
- Read existing code in the module before adding new code
- Understand the context before implementing

### 2. NEVER Break These Rules
- **No code without tests** - Write tests for new functionality
- **No direct database queries** - Use Prisma through `@fiskai/db`
- **No hardcoded strings** - Use constants from `@fiskai/shared`
- **No any types** - Full TypeScript strict mode
- **No console.log in production** - Use proper logging
- **No secrets in code** - Use environment variables
- **No skipping validation** - Validate with Zod schemas

### 3. TEST INTEGRITY
```
┌─────────────────────────────────────────────────────────────────┐
│  TESTS ARE SACRED                                               │
│                                                                 │
│  Tests exist to CATCH BUGS, not to pass CI.                     │
│                                                                 │
│  If a test fails:                                               │
│  1. The CODE is wrong, not the test (usually)                   │
│  2. Investigate WHY it fails                                    │
│  3. Fix the implementation                                      │
│  4. Only update test if requirements changed                    │
│                                                                 │
│  NEVER:                                                         │
│  • Delete tests to make CI pass                                 │
│  • Loosen assertions (expect.anything(), etc.)                  │
│  • Mock away the actual functionality being tested              │
│  • Change expected values to match wrong output                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. FILE SIZE LIMITS
```
┌─────────────────────────────────────────────────────────────────┐
│  Prisma schema (schema.prisma): MAX 500 lines                   │
│  Component files: MAX 300 lines                                 │
│  Utility files: MAX 200 lines                                   │
│  Test files: MAX 500 lines                                      │
│                                                                 │
│  If a file grows beyond limits:                                 │
│  1. STOP and refactor                                           │
│  2. Split into logical modules                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5. DEFINITION OF DONE
```
┌─────────────────────────────────────────────────────────────────┐
│  A FEATURE IS NOT "DONE" UNTIL:                                 │
│                                                                 │
│  □ NO TODO comments in the feature code                         │
│  □ NO FIXME comments                                            │
│  □ NO placeholder values or hardcoded test data                 │
│  □ NO console.log statements                                    │
│  □ NO commented-out code                                        │
│  □ ALL error states handled                                     │
│  □ ALL loading states handled                                   │
│  □ Tests written and passing                                    │
│  □ Works on mobile (375px)                                      │
│  □ Works on desktop                                             │
│                                                                 │
│  When reporting completion, you MUST provide:                   │
│  1. List of files created/modified                              │
│  2. Tests added (with pass count)                               │
│  3. Result of: pnpm lint && pnpm typecheck                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
apps/
  web/      → Next.js frontend (port 3000)

packages/
  db/       → Prisma schema + client
  shared/   → Zod schemas, constants, utilities
  trpc/     → tRPC routers
  ui/       → shadcn/ui components

docs/
  DECISIONS.md   → Architectural decisions
  ROADMAP.md     → Phases and sprints
  AGENTS.md      → Agent instructions
  ARCHITECTURE.md → System architecture
  plans/         → Implementation plans
  specs/         → Feature specifications
```

### File Organization
```
When creating new files:
- Components → apps/web/src/components/
- API routes → apps/web/src/app/api/
- tRPC routers → packages/trpc/src/routers/
- Shared types → packages/shared/src/types/
- Validation schemas → packages/shared/src/schemas/
- Database operations → packages/db/src/
- UI primitives → packages/ui/src/components/
```

---

## Croatian E-Invoicing Specifics

### Invoice Numbering Format
Croatian invoices use format: `broj-oznaka_prostora-oznaka_uređaja`
- Example: `1-1-1` (invoice #1, business premises "1", payment device "1")

### VAT Rates (PDV)
- Standard: 25%
- Reduced: 13%
- Super-reduced: 5%
- Zero: 0%

### Required Fields for E-Invoice
- OIB (Croatian tax ID) - 11 digits with checksum
- Business premises code (Oznaka poslovnog prostora)
- Payment device code (Oznaka naplatnog uređaja)
- Sequential invoice number within year

---

## Key Commands

```bash
pnpm install          # Install deps
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm typecheck        # Type check
pnpm lint             # Lint
pnpm test             # Run tests
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
```

---

## Git Workflow

```
1. Create feature branch: git checkout -b feat/feature-name
2. Make atomic commits with conventional format
3. Run tests before committing: pnpm test
4. Push and create PR
5. Wait for CI to pass
6. Merge only after CI green
```

**Commit Message Format:**
```
type(scope): description

feat(invoice): add invoice creation form
fix(auth): resolve session timeout issue
chore(deps): update dependencies
docs(api): add endpoint documentation
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`

---

## Croatian Language

- Root layout uses `lang="hr"`
- Date format: "29. siječnja 2026."
- Number format: "1.000,00" (not "1,000.00")
- Currency: EUR (from 2023)

---

## When Stuck

1. Check ROADMAP.md for current phase and what's in scope
2. Check DECISIONS.md for architectural guidance
3. Look for similar implementations in codebase
4. Ask for clarification before guessing
5. Prefer simple solutions over clever ones

---

## Forbidden Actions

- Modifying database schema without updating DECISIONS.md
- Adding new dependencies without justification
- Removing tests to make CI pass
- Committing directly to main (use feature branches)
- Using `// @ts-ignore` or `any` types
- Creating features not in current sprint scope
