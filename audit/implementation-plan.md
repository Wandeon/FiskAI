# Implementation Plan

## Phase 1 – Secrets, CI, and Core Safeguards
- Rotate every leaked credential and remove literals from `docker-compose.yml:6-33`; add `.env.example` with placeholders and document secret management in `README.md`.
- Split compose files into `docker-compose.dev.yml` (local defaults) and `docker-compose.prod.yml`, and update `Dockerfile` to pin the ARM64 platform (`FROM --platform=linux/arm64 node:20-alpine`).
- Add `.github/workflows/ci.yml` running lint/build/prisma checks (`npm run lint`, `npm run build`, `npx prisma migrate diff`).
- Introduce npm scripts for Prisma migrations (`"db:migrate"`, `"db:push"`) and reference them in docs/CI.

## Phase 2 – Data Integrity & Multi-tenancy Enforcement
- Update `prisma/schema.prisma` with composite constraints: `@@unique([companyId, invoiceNumber])`, `@@unique([companyId, oib])`, and a partial unique on `CompanyUser` defaults.
- Write migration scripts to deduplicate existing data before enforcing constraints.
- Add Prisma middleware or helper guards to inject `companyId` filters automatically; refactor server actions to pass resolved company context instead of re-querying.
- Verify tenant ownership for every foreign key (`buyerId`, `sellerId`, contacts, products) prior to insert/update.

## Phase 3 – Security & Secret Handling Enhancements
- Implement encrypted storage for provider API keys (libsodium/KMS) and restrict read access in server actions.
- Remove `AUTH_TRUST_HOST` unless traffic is proxied; rely on `NEXTAUTH_URL` and add host validation middleware.
- Define a shared `ActionResult` type plus structured logging for server actions to standardize success/error responses.

## Phase 4 – Performance & Architecture Improvements
- Refactor the new invoice page to fetch contacts/products server-side (or via paginated API + caching) instead of calling server actions from the client bundle.
- Add pagination/filtering to `getEInvoices`, only selecting needed fields for list views and lazy-loading relations for detail pages.
- Replace floating-point arithmetic in server actions with Decimal-based helpers.
- Optimize Docker build by pruning devDependencies in the runner image (`npm ci --omit=dev`).

## Phase 5 – Accessibility & UX Foundation
- Set `<html lang="hr">` (or dynamic locale) in `src/app/layout.tsx` and ensure all labels/inputs use proper `htmlFor`, `id`, `aria-invalid`, and `aria-describedby` attributes.
- Enhance the shared `Input` component to apply ARIA attributes automatically when errors exist.
- Add table captions and `scope` attributes to data tables; supplement color-coded statuses with text/icons.
- Implement a reusable toast/alert system with live regions and move focus to the first invalid input on form errors.

## Phase 6 – UX/Product Enhancements
- Add a company switcher and context display in the header; hide unfinished navigation items until their modules exist.
- Redesign onboarding as a multi-step wizard with autosave and post-submit guidance.
- Expand the dashboard with actionable insights/CTAs (draft invoices, overdue totals, provider status).
- Upgrade the e-invoice composer (typeahead buyer search, product picker, line item totals) and list (filters, bulk actions, empty-state guidance).
- Build full Contacts and Settings modules enforcing mandatory business data before exposing their links.

## Phase 7 – Observability & Monitoring
- Adopt structured logging (e.g., Pino) and integrate with Coolify/Cloudflare logging; add health endpoints.
- Configure uptime/metric monitoring and, optionally, analytics (PostHog) to monitor onboarding/invoice funnels.
