# Modularization Plan – Legal Form, VAT, and Entitlements

Goal: Gate features/fields per company type (obrt variants, j.d.o.o., d.o.o.), VAT status, and purchased modules. Only relevant flows and fields should show after setup, and access should respect entitlements.

## Data Model
- Extend `Company`:
  - `legalForm` enum: `OBRT_PAUSAL`, `OBRT_REAL`, `OBRT_VAT`, `JDOO`, `DOO`.
  - `isVatPayer` boolean (existing, ensure normalized).
  - `entitlements` JSON array of module keys (e.g., `['invoicing','expenses','banking','reports','payroll']`).
  - `featureFlags` JSON (fine-grained switches: `canIssueFiskalized`, `needsEPdv`, `allowReverseCharge`, etc.).
- Migration: add columns, backfill current companies with defaults (e.g., `DOO`, `isVatPayer=false`, `entitlements=all`) to avoid breaking access.

## Capability Layer
- Add server utility `getCapabilities(companyId)` and client hook `useCapabilities()` returning booleans such as:
  - Access: `canAccessInvoices`, `canAccessExpenses`, `canAccessBanking`, `canAccessReports`.
  - Legal/VAT: `requireVatFields`, `allowReverseCharge`, `requiresJoppd`, `isPausal`.
  - UI gating: `showModule(key)`, `isModuleLocked(key)`.
- Add `FeatureGuard` component/HOC for pages: if locked, redirect to upgrade/forbidden state.
- Add `fieldVisibility` configs keyed by `legalForm` and `isVatPayer` per domain (`invoice`, `product`, `contact`, `settings`).

## Navigation & Shell
- Build nav items from capabilities map; hide locked modules. Show upsell badges/CTA if allowed.
- Command palette and mobile nav read the same capability data.
- Add plan badge in header/sidebar showing `legalForm`, VAT status, and active modules.

## Forms & Validation
- Presets per legal form:
  - Obrt paušal: hide VAT fields, optional OIB in some flows, show EPdv export later.
  - Obrt real/VAT: show VAT rate/category, PDV ID, reverse charge when applicable.
  - j.d.o.o./d.o.o.: full fields (IBAN, VAT, reverse charge).
- Apply `fieldVisibility` in form components via a helper (e.g., `useFieldVisibility('invoice')`).
- Update zod schemas to align required fields with visibility (e.g., OIB required for d.o.o./j.d.o.o., optional for paušal unless sending e-invoice).
- Server actions enforce entitlements and VAT constraints (reject invoice creation if module locked or VAT fields used while `isVatPayer=false` without reverse charge flag).

## Routing & Access Control
- Middleware/route guards to block access to locked modules; return 403 or upsell page.
- Pages should render “not in plan” empty states when accessed via deep link but locked.

## Settings & Onboarding
- Onboarding step: choose legal form + VAT; select/purchase modules; store on Company.
- Settings tab “Plan & pravna forma”: admins can change legal form/VAT (with warnings) and toggle purchased modules (when billing allows).
- Record audit entries when legal form/VAT/entitlements change.

## Billing Tie-in (future)
- Map entitlements to SKU keys; sync from billing provider via webhook to update `Company.entitlements`.
- UI should gracefully degrade if billing is pending; keep read-only until synced.

## Reporting/Exports
- For VAT-enabled forms, add EPdv/PDV export flags; scope reports to capabilities.
- Hide/disable reports module if not entitled.

## Implementation Steps
1) Migration: add `legalForm`, `entitlements` JSON, `featureFlags` JSON to Company; backfill defaults. ✅
2) Capability utilities: server + client hooks, `FeatureGuard`, `fieldVisibility` configs. ✅ (capability API + hook + guard stub)
3) Nav/shell: build from capability map; add plan badge; update command palette/mobile nav. ✅ (sidebar, bottom nav, command palette, header badge)
4) Forms: apply visibility presets to invoices/e-invoices/products/contacts; update zod + server action guards. ⏳ (e-invoice VAT visibility applied; remaining forms incremental)
5) Settings/onboarding: add legal form + VAT + module selection; persist to Company; audit changes. ✅ (settings tab + server action)
6) Route protection: middleware and “not in plan” states for locked modules. ✅ (guards on invoices/e-invoices/expenses/products/reports; FeatureGuard component)
7) Reports/exports: hide or gate based on entitlements; prep EPdv/PDV export flags. ✅ (reports gated)
8) Billing sync (optional now): wire entitlements to billing provider; webhook to update Company. ✅ (stub webhook added)

## Notes
- Keep defaults permissive during rollout (existing tenants get full access) to avoid breaking prod; tighten after verification.
- All gating must be enforced server-side (not just hidden in UI).
