# GEMINI.md - Context & Instructions for Gemini Agent

## Project Overview

**FiskAI** is an AI-first accounting and invoicing SaaS platform for the Croatian market. It serves clients ranging from "paušalni obrt" to "d.o.o.", automating accounting tasks via AI.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL 16 (via Prisma 7)
- **Auth:** NextAuth v5 (Auth.js)
- **Styling:** Tailwind CSS + CVA + Radix UI
- **Deployment:** Docker + Coolify (Hetzner VPS)
- **Emails:** Resend

## Architecture

### Subdomains & Routing

The application uses subdomain-based routing handled by `middleware.ts`:

- `fiskai.eu` -> `(marketing)`: Public landing pages.
- `app.fiskai.eu` -> `(app)`: Client dashboard.
- `staff.fiskai.eu` -> `(staff)`: Internal accountants portal.
- `admin.fiskai.eu` -> `(admin)`: Platform owner/admin portal.

### Module System

Features are organized into 16 toggleable modules defined in `src/lib/modules/definitions.ts`.

- **Gating:** Modules are enabled per-company via the `Company.entitlements` array in the database.
- **Access Control:** `src/lib/modules/access.ts` handles route protection based on entitlements.
- **Core Modules:** Invoicing, E-Invoicing, Expenses, Banking, VAT, etc.

### Visibility System

UI elements are further controlled by `src/lib/visibility`. This considers:

- **Legal Form:** Differences between `obrt` and `d.o.o.`
- **Competence:** User's skill level.
- **Progression:** Company's usage level (e.g., number of invoices).

## Coding Conventions

- **Style:** Follow existing patterns. Use functional components and hooks.
- **UI:** Use Tailwind CSS for styling. Use Radix UI primitives where applicable.
- **Type Safety:** Strict TypeScript usage. Zod for validation.
- **Database:** Use Prisma for all DB interactions.
- **Testing:** Vitest for unit/integration tests.

## Deployment & Operations

- **Staging:** Auto-deployed from `main` branch to `http://erp.metrica.hr:3002`.
- **Production:** Manually deployed via Coolify to `https://erp.metrica.hr` (or `fiskai.eu`).
- **Environment Vars:** Managed in Coolify.
- **Database Access:** via `docker exec fiskai-db psql ...`.

## Development Workflow

1.  **Dev:** Work on local dev server (`npm run dev`).
2.  **Commit:** Push to feature branches.
3.  **Merge:** PRs merge to `main`.
4.  **Test:** Run `npm test` and `npm run lint` before finalizing.

## Key Commands

- `npm run dev`: Start dev server.
- `npm run build`: Build for production.
- `npm run test`: Run tests.
- `npx prisma studio`: Open Prisma Studio.
- `npx prisma db push`: Push schema changes (dev only).

## Instructions for Gemini

- **Context First:** Always check `GEMINI.md`, `CLAUDE.md`, and `AGENTS.md` (if updated) for context.
- **Safety:** Explain critical commands before running.
- **Modularity:** Respect the module boundaries. Don't import client code into admin portal blindly.
- **Testing:** Add tests for new features.
- **Proactive:** Fix lint errors and type issues immediately.
