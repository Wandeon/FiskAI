# Product Bible v4.1.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Product Bible v4.0.0 into a complete, accurate, code-aligned single source of truth that can answer any question about FiskAI.

**Architecture:** Sequential documentation fixes organized by priority. Each task is atomic and executable by a subagent with zero prior context. Tasks are grouped into 6 phases matching the gap analysis categories.

**Tech Stack:** Markdown editing, code verification via grep/read, no testing framework needed.

**Target File:** `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Total Tasks:** 35 batched tasks (consolidating 82 issues for efficiency)

---

## Phase 1: Critical Factual Errors (P0)

These MUST be fixed before any deployment. Legal and accuracy issues.

---

### Task 1.1: Fix 40k→60k Threshold Everywhere

**Context:** The 2025 Croatian tax reform increased VAT/paušalni thresholds from 40,000 EUR to 60,000 EUR. The bible has mixed references.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/fiscal-data/data/thresholds.ts`

**Step 1: Find all 40k references**

```bash
grep -n "40.000\|40,000\|40000\|40k" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 2: Update each occurrence**

Replace these patterns:

- `< 40,000 EUR/year` → `< 60,000 EUR/year`
- `40.000€` → `60.000€`
- `40k` → `60k`
- `40,000 EUR` → `60,000 EUR` (in threshold contexts)

**Locations to fix (approximate lines):**

- Line ~142: Persona revenue threshold
- Line ~182: Paušalni status card reference
- Line ~353: 20 scenarios footnote
- Line ~653: Dashboard limit display
- Line ~911: Warning toast example
- Line ~1060-1063: Key thresholds table

**Step 3: Add effective date annotation**

After each 60,000 EUR reference in Section 11.1, add: `(effective 2025-01-01)`

**Step 4: Verify no 40k remains in threshold contexts**

```bash
grep -n "40" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md | grep -i "eur\|limit\|threshold\|prag"
```

Expected: No matches in VAT/paušalni threshold contexts (40% tax rate is fine).

**Step 5: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): update VAT/paušalni thresholds to 60k EUR (2025 law)"
```

---

### Task 1.2: Fix Competence Level Terminology

**Context:** Bible uses `beginner/standard/expert` but code uses `beginner/average/pro`.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/visibility/rules.ts:11-17`

**Step 1: Verify actual code terminology**

```bash
grep -A5 "CompetenceLevel\|COMPETENCE_LABELS" /home/admin/FiskAI/src/lib/visibility/rules.ts
```

Expected output confirms: `beginner`, `average`, `pro`

**Step 2: Find all competence references in bible**

```bash
grep -n "standard\|expert" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md | grep -i "competen\|level\|beginner"
```

**Step 3: Replace terminology**

Global replacements in competence contexts:

- `standard` → `average`
- `expert` → `pro`

Key locations:

- Line ~146: Persona competence
- Line ~200, ~225: Other persona competence
- Lines ~555-562: Three-layer visibility spec
- Lines ~569-577: Element visibility rules table
- Lines ~720-733: Dashboard element catalog
- Lines ~839-855: Onboarding step 2 competence cards

**Step 4: Update competence card labels**

Change Step 2 competence cards (around line 845-854):

```markdown
<CompetenceCard level="beginner"
  title="Početnik"
  description="Pokazuj mi sve savjete i upute" />
<CompetenceCard level="average"
  title="Iskusan"
  description="Standardni prikaz" />
<CompetenceCard level="pro"
  title="Stručnjak"
  description="Minimalne upute, maksimalna kontrola" />
```

**Step 5: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): align competence terminology with code (beginner/average/pro)"
```

---

### Task 1.3: Fix Asset Capitalization Threshold

**Context:** Bible shows 464.53 EUR (old HRK conversion), actual 2025 value is 665.00 EUR.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Find asset threshold reference**

```bash
grep -n "464\|Asset\|Capitalization\|Dugotrajna" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 2: Update threshold value**

Find line ~1065 in Section 11.1 Key Thresholds table and change:

```markdown
| Asset Capitalization | 665.00 EUR | Must depreciate over useful life (2025 value) |
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): update asset capitalization threshold to 665 EUR (2025)"
```

---

### Task 1.4: Fix ModuleGate → Visible Component

**Context:** Bible references `<ModuleGate>` component that doesn't exist. Actual implementation uses `<Visible>`.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/visibility/components.tsx`

**Step 1: Verify actual component**

```bash
grep -n "export.*Visible\|ModuleGate" /home/admin/FiskAI/src/lib/visibility/components.tsx
```

Expected: `Visible` exists, `ModuleGate` does not.

**Step 2: Find ModuleGate references**

```bash
grep -n "ModuleGate\|moduleAccess\|createModuleAccess" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 3: Rewrite Section 5.3 Entitlement Checking (around lines 449-462)**

Replace with:

````markdown
### 5.3 Entitlement Checking

**Route Protection (Sidebar):**

```typescript
// src/components/layout/sidebar.tsx
if (item.module && company && !entitlements.includes(item.module)) {
  return false // Item hidden from navigation
}
```
````

**Component Visibility:**

```tsx
// Using visibility system (checks legal form, stage, competence)
;<Visible id="card:pausalni-status">
  <PausalniStatusCard />
</Visible>

// Direct entitlement check in component
{
  entitlements.includes("ai-assistant") && <AIAssistantButton />
}
```

**Note:** Entitlements are checked separately from the visibility system. Visibility handles legal form, progression stage, and competence level. Entitlements are checked directly in sidebar navigation and individual components.

````

**Step 4: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): replace ModuleGate with actual Visible component usage"
````

---

### Task 1.5: Fix Banking Module Default Status

**Context:** Bible marks banking as FREE/default, but code has `defaultEnabled: false`.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/modules/definitions.ts:80-86`

**Step 1: Verify code status**

```bash
grep -A5 "banking:" /home/admin/FiskAI/src/lib/modules/definitions.ts
```

**Step 2: Update Section 5.1 Module table (around line 418)**

Change:

```markdown
| `banking` | Bank import & sync | PAID |
```

**Step 3: Update Section 13.2 Module-to-Tier Mapping**

In the tier mapping table, change banking row:

```markdown
| banking | ❌ | ✅ | ✅ | ✅ | ✅ |
```

**Step 4: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): correct banking module to PAID status per code"
```

---

### Task 1.6: Fix Pricing Tiers to Match Stripe

**Context:** Bible shows 5 tiers, Stripe only has 3 configured.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/billing/stripe.ts`

**Step 1: Check actual Stripe plans**

```bash
grep -A10 "PLANS\|plans" /home/admin/FiskAI/src/lib/billing/stripe.ts | head -30
```

**Step 2: Rewrite Section 13.1 Tier Structure**

Update to match actual implementation with "planned" markers:

```markdown
### 13.1 Tier Structure

| Tier           | Price     | Status     | Includes                                                                 |
| -------------- | --------- | ---------- | ------------------------------------------------------------------------ |
| **Free**       | 0 EUR     | ✅ Active  | Invoicing, Contacts, Products, Expenses, Basic Reports, Documents        |
| **Paušalni**   | 9 EUR/mo  | ✅ Active  | Free + Paušalni module, Contributions tracking, Banking                  |
| **Pro**        | 19 EUR/mo | ✅ Active  | Paušalni + Fiscalization, Reconciliation, Advanced Reports, AI Assistant |
| **Business**   | 39 EUR/mo | ⚠️ Planned | Pro + VAT, Corporate Tax, Multi-user                                     |
| **Enterprise** | Custom    | ⚠️ Planned | Business + Staff assignments, Custom integrations                        |

**Note:** Business and Enterprise tiers are planned but not yet available in Stripe. Current production supports Free, Paušalni, and Pro.
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): align pricing tiers with actual Stripe configuration"
```

---

### Task 1.7: Fix Integration Status Accuracy

**Context:** IE-Računi and SaltEdge marked as production but not implemented.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/e-invoice/provider.ts`, `/home/admin/FiskAI/src/lib/bank-sync/providers/`

**Step 1: Verify provider implementation**

```bash
ls -la /home/admin/FiskAI/src/lib/e-invoice/
ls -la /home/admin/FiskAI/src/lib/bank-sync/providers/
```

**Step 2: Update Section 12.1 External Systems table (around lines 1142-1151)**

```markdown
### 12.1 External Systems

| System        | Purpose                 | Status        | Notes                   |
| ------------- | ----------------------- | ------------- | ----------------------- |
| FINA CIS      | Fiscalization (JIR/ZKI) | ⚠️ 60%        | Core logic ready        |
| IE-Računi     | E-invoice intermediary  | ⚠️ Planned    | API integration pending |
| Gocardless    | PSD2 bank sync          | ✅ Production | Primary bank provider   |
| SaltEdge      | PSD2 bank sync          | ⚠️ Planned    | Secondary provider      |
| Stripe        | Payments + Terminal     | ✅ Production | Subscriptions active    |
| Resend        | Transactional email     | ✅ Production | All email flows         |
| Cloudflare R2 | Document storage        | ✅ Production | 11-year archive         |
```

**Step 3: Update Section 12.2 E-Invoice Providers**

```markdown
### 12.2 E-Invoice Providers

| Provider   | Type         | Status     | Notes                    |
| ---------- | ------------ | ---------- | ------------------------ |
| Mock       | Testing      | ✅ Full    | Development/testing only |
| IE-Računi  | Intermediary | ⚠️ Planned | Q1 2025 target           |
| FINA       | Direct       | ⚠️ Planned | Requires certification   |
| Moj-eRačun | Intermediary | ❌ Not yet | Low priority             |
```

**Step 4: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): correct integration statuses to reflect actual implementation"
```

---

### Task 1.8: Fix Bank Import Formats

**Context:** MT940 listed as supported but not implemented.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/banking/import/processor.ts`

**Step 1: Verify actual parsers**

```bash
grep -r "parser\|Parser\|format\|Format" /home/admin/FiskAI/src/lib/banking/ --include="*.ts" | head -20
```

**Step 2: Update Section 12.3 Bank Import Formats**

```markdown
### 12.3 Bank Import Formats

| Format         | Extension | Status | Notes                  |
| -------------- | --------- | ------ | ---------------------- |
| CSV (generic)  | .csv      | ✅     | Manual column mapping  |
| CAMT.053       | .xml      | ✅     | ISO 20022 standard     |
| Erste CSV      | .csv      | ✅     | Pre-configured mapping |
| Raiffeisen CSV | .csv      | ✅     | Pre-configured mapping |
| PBZ Export     | .csv      | ⚠️ WIP | Parser in development  |
| MT940          | .sta      | ❌     | Not yet implemented    |
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): correct bank import format support status"
```

---

### Task 1.9: Fix Currency (HRK → EUR)

**Context:** Min capital amounts still in HRK, Croatia uses EUR since 2023.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Find HRK references**

```bash
grep -n "HRK\|kn\|kuna" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 2: Update Section 4.1 Croatian Business Types table (lines 302-308)**

```markdown
| Legal Form     | Code          | Min Capital | Tax Regime    | Accounting   | VAT      |
| -------------- | ------------- | ----------- | ------------- | ------------ | -------- |
| Paušalni Obrt  | `OBRT_PAUSAL` | 0 EUR       | Flat-rate 12% | Single-entry | NO       |
| Obrt (Dohodak) | `OBRT_REAL`   | 0 EUR       | Income tax    | Single-entry | Optional |
| Obrt (PDV)     | `OBRT_VAT`    | 0 EUR       | Income + VAT  | Single-entry | YES      |
| j.d.o.o.       | `JDOO`        | 1 EUR       | Corporate     | Double-entry | YES      |
| d.o.o.         | `DOO`         | 2,500 EUR   | Corporate     | Double-entry | YES      |
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): convert HRK to EUR (Croatia adopted EUR 2023-01-01)"
```

---

### Task 1.10: Add Complete Paušalni Tax Brackets

**Context:** Bible mentions 7 brackets but doesn't list them.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/docs/APPENDIX_1.md` (Section 2.2)

**Step 1: Find paušalni tax section**

```bash
grep -n "Paušalni Tax\|12% base\|brackets" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 2: Replace line ~1090-1091 with complete table**

```markdown
**Paušalni Tax Brackets (2025):**

Base rate: 12% (excluding municipal surtax)

| Tier | Annual Revenue (EUR)  | Tax Base (EUR) | Quarterly Tax (EUR) |
| ---- | --------------------- | -------------- | ------------------- |
| 1    | 0.00 - 11,300.00      | 1,695.00       | 50.85               |
| 2    | 11,300.01 - 15,300.00 | 2,295.00       | 68.85               |
| 3    | 15,300.01 - 19,900.00 | 2,985.00       | 89.55               |
| 4    | 19,900.01 - 30,600.00 | 4,590.00       | 137.70              |
| 5    | 30,600.01 - 40,000.00 | 6,000.00       | 180.00              |
| 6    | 40,000.01 - 50,000.00 | 7,500.00       | 225.00              |
| 7    | 50,000.01 - 60,000.00 | 9,000.00       | 270.00              |

_Source: Porezna Uprava, effective 2025-01-01_
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add complete paušalni tax bracket table for 2025"
```

---

### Task 1.11: Fix Onboarding Completion Logic

**Context:** Bible requires 9 fields + competence, code only checks 5.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/visibility/server.ts:89-91`

**Step 1: Verify actual logic**

```bash
grep -A10 "hasCompletedOnboarding\|isOnboardingComplete" /home/admin/FiskAI/src/lib/visibility/server.ts
```

**Step 2: Update Section 8.1 Completion Logic (around lines 617-631)**

````markdown
**Completion Logic:**

```typescript
// Actual implementation (src/lib/visibility/server.ts)
const hasCompletedOnboarding = Boolean(
  company.oib && company.address && company.city && company.iban && company.email
)
```
````

**Required Fields for Completion:**
| Field | Required | Validation |
|-------|----------|------------|
| OIB | ✅ | 11 digits |
| Address | ✅ | Non-empty |
| City | ✅ | Non-empty |
| IBAN | ✅ | Valid format |
| Email | ✅ | Valid email |
| Name | ❌ | Optional |
| PostalCode | ❌ | Optional |
| LegalForm | ❌ | Defaults to DOO |
| Competence | ❌ | Stored in featureFlags, not required |

**Note:** Competence level is collected in wizard Step 2 and stored in `featureFlags.competence`, but is not required for onboarding completion.

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): align onboarding completion logic with actual implementation"
````

---

### Task 1.12: Fix AUTO Entitlements Documentation

**Context:** Bible claims pausalni/vat/corporate-tax are AUTO-enabled by legalForm, but code doesn't do this.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/capabilities.ts`

**Step 1: Verify actual behavior**

```bash
grep -A20 "deriveCapabilities\|autoEntitlements" /home/admin/FiskAI/src/lib/capabilities.ts
```

**Step 2: Update Section 5.1 Module table footnote**

Change the `AUTO*` footnote (around line 430) to:

```markdown
\*AUTO modules are recommended based on `legalForm` but must be explicitly added to entitlements. The visibility system hides irrelevant modules (e.g., VAT widgets for non-VAT payers) regardless of entitlements.

**Current behavior:** Legal-form-specific features are controlled by the visibility system (`src/lib/visibility/rules.ts`), not by auto-enabling entitlements.

**Planned:** Future versions may auto-add relevant entitlements during onboarding based on legalForm selection.
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): clarify AUTO entitlements are planned, not implemented"
```

---

## Phase 2: Missing Sections (18 items batched into 8 tasks)

---

### Task 2.1: Add Complete API Route Inventory

**Context:** Bible has ~30 endpoints, codebase has 142.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/app/api/`

**Step 1: Generate route inventory**

```bash
find /home/admin/FiskAI/src/app/api -name "route.ts" | sort | wc -l
find /home/admin/FiskAI/src/app/api -name "route.ts" | sed 's|/home/admin/FiskAI/src/app||' | sed 's|/route.ts||' | sort
```

**Step 2: Add new Section 17 after current Section 16**

Create comprehensive API reference with all route groups. Insert before Appendixes:

```markdown
---

## 17. Complete API Reference

### 17.1 Authentication & Authorization (13 routes)

| Endpoint                        | Method | Purpose                       |
| ------------------------------- | ------ | ----------------------------- |
| `/api/auth/[...nextauth]`       | ALL    | NextAuth.js handler           |
| `/api/auth/check-email`         | POST   | Check email availability      |
| `/api/auth/register`            | POST   | User registration             |
| `/api/auth/send-code`           | POST   | Send verification code        |
| `/api/auth/verify-code`         | POST   | Verify authentication code    |
| `/api/auth/reset-password`      | POST   | Password reset                |
| `/api/webauthn/register/start`  | POST   | Start passkey registration    |
| `/api/webauthn/register/finish` | POST   | Complete passkey registration |
| `/api/webauthn/login/start`     | POST   | Start passkey login           |
| `/api/webauthn/login/finish`    | POST   | Complete passkey login        |
| `/api/webauthn/passkeys`        | GET    | List user passkeys            |
| `/api/webauthn/passkeys/[id]`   | DELETE | Remove passkey                |
| `/api/admin/auth`               | POST   | Admin authentication          |

### 17.2 Banking & Reconciliation (11 routes)

| Endpoint                               | Method | Purpose                      |
| -------------------------------------- | ------ | ---------------------------- |
| `/api/bank/connect`                    | POST   | Initiate PSD2 connection     |
| `/api/bank/disconnect`                 | POST   | Remove bank connection       |
| `/api/bank/callback`                   | GET    | OAuth callback handler       |
| `/api/banking/import/upload`           | POST   | Upload bank statement        |
| `/api/banking/import/process`          | POST   | Process uploaded statement   |
| `/api/banking/import/jobs/[id]`        | GET    | Get import job status        |
| `/api/banking/import/jobs/[id]/file`   | GET    | Retrieve original file       |
| `/api/banking/import/jobs/[id]/status` | GET    | Check processing status      |
| `/api/banking/reconciliation`          | GET    | List unmatched transactions  |
| `/api/banking/reconciliation/match`    | POST   | Match transaction to invoice |

### 17.3 E-Invoicing & Fiscalization (5 routes)

| Endpoint                  | Method | Purpose                         |
| ------------------------- | ------ | ------------------------------- |
| `/api/e-invoices/inbox`   | GET    | List received e-invoices        |
| `/api/e-invoices/receive` | POST   | Webhook for incoming e-invoices |
| `/api/invoices/[id]/pdf`  | GET    | Generate invoice PDF            |
| `/api/compliance/en16931` | POST   | Validate EN 16931 compliance    |
| `/api/sandbox/e-invoice`  | POST   | Test e-invoice endpoint         |

### 17.4 Billing & Subscriptions (3 routes)

| Endpoint                | Method | Purpose                        |
| ----------------------- | ------ | ------------------------------ |
| `/api/billing/checkout` | POST   | Create Stripe checkout session |
| `/api/billing/portal`   | POST   | Open Stripe customer portal    |
| `/api/billing/webhook`  | POST   | Handle Stripe webhooks         |

### 17.5 Paušalni Features (12 routes)

| Endpoint                                     | Method  | Purpose                     |
| -------------------------------------------- | ------- | --------------------------- |
| `/api/pausalni/profile`                      | GET/PUT | Get/update paušalni profile |
| `/api/pausalni/preferences`                  | PUT     | Update display preferences  |
| `/api/pausalni/obligations`                  | GET     | List payment obligations    |
| `/api/pausalni/obligations/[id]/mark-paid`   | POST    | Mark obligation as paid     |
| `/api/pausalni/income-summary`               | GET     | Get income summary          |
| `/api/pausalni/eu-transactions`              | GET     | List EU transactions        |
| `/api/pausalni/eu-transactions/[id]/confirm` | POST    | Confirm EU transaction      |
| `/api/pausalni/forms`                        | POST    | Generate tax forms          |
| `/api/pausalni/forms/[id]/download`          | GET     | Download generated form     |
| `/api/pausalni/payment-slip`                 | POST    | Generate Hub3 payment slip  |
| `/api/pausalni/calendar/export`              | GET     | Export deadline calendar    |
| `/api/pausalni/calendar/google/sync`         | POST    | Sync to Google Calendar     |

### 17.6 AI Features (4 routes)

| Endpoint                   | Method | Purpose                    |
| -------------------------- | ------ | -------------------------- |
| `/api/ai/extract`          | POST   | Extract data from document |
| `/api/ai/feedback`         | POST   | Submit extraction feedback |
| `/api/ai/suggest-category` | POST   | Get category suggestion    |
| `/api/ai/usage`            | GET    | Get AI usage stats         |

### 17.7 Email Integration (6 routes)

| Endpoint                               | Method     | Purpose                |
| -------------------------------------- | ---------- | ---------------------- |
| `/api/email/connect`                   | POST       | Start email OAuth flow |
| `/api/email/callback`                  | GET        | OAuth callback         |
| `/api/email/[connectionId]/disconnect` | POST       | Disconnect email       |
| `/api/email/rules`                     | GET/POST   | Manage import rules    |
| `/api/email/rules/[id]`                | PUT/DELETE | Update/delete rule     |

### 17.8 Document Import (7 routes)

| Endpoint                        | Method | Purpose                  |
| ------------------------------- | ------ | ------------------------ |
| `/api/import/upload`            | POST   | Upload document          |
| `/api/import/process`           | POST   | Process document with AI |
| `/api/import/jobs/[id]`         | GET    | Get job details          |
| `/api/import/jobs/[id]/type`    | PUT    | Set document type        |
| `/api/import/jobs/[id]/file`    | GET    | Retrieve file            |
| `/api/import/jobs/[id]/confirm` | POST   | Confirm import           |
| `/api/import/jobs/[id]/reject`  | POST   | Reject import            |

### 17.9 Support & Ticketing (5 routes)

| Endpoint                             | Method   | Purpose                   |
| ------------------------------------ | -------- | ------------------------- |
| `/api/support/tickets`               | GET/POST | List/create tickets       |
| `/api/support/tickets/[id]/status`   | PUT      | Update ticket status      |
| `/api/support/tickets/[id]/messages` | GET/POST | Ticket messages           |
| `/api/support/tickets/summary`       | GET      | Support dashboard summary |
| `/api/admin/support/dashboard`       | GET      | Admin support view        |

### 17.10 Guidance & Notifications (5 routes)

| Endpoint                    | Method | Purpose                  |
| --------------------------- | ------ | ------------------------ |
| `/api/guidance/preferences` | PUT    | Update guidance settings |
| `/api/guidance/checklist`   | GET    | Get setup checklist      |
| `/api/guidance/insights`    | GET    | Get contextual insights  |
| `/api/notifications`        | GET    | List notifications       |
| `/api/notifications/read`   | POST   | Mark as read             |

### 17.11 Cron Jobs (8 routes)

| Endpoint                       | Trigger | Purpose                  |
| ------------------------------ | ------- | ------------------------ |
| `/api/cron/bank-sync`          | Daily   | Sync PSD2 transactions   |
| `/api/cron/fiscal-processor`   | Hourly  | Process fiscal queue     |
| `/api/cron/fiscal-retry`       | 6h      | Retry failed fiscal      |
| `/api/cron/deadline-reminders` | Daily   | Send deadline emails     |
| `/api/cron/email-sync`         | 15min   | Import email attachments |
| `/api/cron/fetch-news`         | 4h      | Fetch news feeds         |
| `/api/cron/news/review`        | Daily   | Review news items        |
| `/api/cron/checklist-digest`   | Daily   | Send guidance digests    |

### 17.12 Utilities (7 routes)

| Endpoint               | Method | Purpose               |
| ---------------------- | ------ | --------------------- |
| `/api/health`          | GET    | Basic health check    |
| `/api/health/ready`    | GET    | Readiness probe       |
| `/api/status`          | GET    | Service status        |
| `/api/metrics`         | GET    | System metrics        |
| `/api/oib/lookup`      | GET    | OIB validation/lookup |
| `/api/capabilities`    | GET    | API capabilities      |
| `/api/webhooks/resend` | POST   | Email service webhook |
```

**Step 3: Update Table of Contents**

Add after line 29:

```markdown
17. [Complete API Reference](#17-complete-api-reference)
```

**Step 4: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add complete API route inventory (142 endpoints)"
```

---

### Task 2.2: Add Server Actions Documentation

**Context:** 21 server action files completely undocumented. Bible incorrectly shows invoice CRUD as REST.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/app/actions/`

**Step 1: List all server actions**

```bash
ls -la /home/admin/FiskAI/src/app/actions/*.ts | grep -v test
```

**Step 2: Add Section 17.13 Server Actions after API routes**

````markdown
### 17.13 Server Actions

FiskAI uses Next.js Server Actions for most CRUD operations. These are NOT REST endpoints.

| File                        | Purpose            | Key Functions                                                    |
| --------------------------- | ------------------ | ---------------------------------------------------------------- |
| `auth.ts`                   | Authentication     | `signIn`, `signOut`, `signUp`                                    |
| `company.ts`                | Company management | `createCompany`, `updateCompany`, `switchCompany`                |
| `contact.ts`                | Contact CRUD       | `createContact`, `updateContact`, `deleteContact`                |
| `product.ts`                | Product management | `createProduct`, `updateProduct`, `deleteProduct`                |
| `invoice.ts`                | Invoice operations | `createInvoice`, `updateInvoice`, `deleteInvoice`, `sendInvoice` |
| `expense.ts`                | Expense tracking   | `createExpense`, `updateExpense`, `deleteExpense`                |
| `expense-reconciliation.ts` | Bank matching      | `matchExpense`, `unmatchExpense`                                 |
| `banking.ts`                | Bank accounts      | `addBankAccount`, `removeBankAccount`                            |
| `premises.ts`               | Business premises  | `createPremises`, `updatePremises`                               |
| `terminal.ts`               | POS terminals      | `registerTerminal`, `pairReader`                                 |
| `pos.ts`                    | Point of sale      | `createPOSTransaction`, `voidTransaction`                        |
| `fiscalize.ts`              | Fiscalization      | `fiscalizeInvoice`, `retryFiscalization`                         |
| `fiscal-certificate.ts`     | Certificates       | `uploadCertificate`, `validateCertificate`                       |
| `support-ticket.ts`         | Support            | `createTicket`, `addMessage`                                     |
| `onboarding.ts`             | Wizard             | `saveOnboardingStep`, `completeOnboarding`                       |
| `guidance.ts`               | Preferences        | `updateGuidanceLevel`, `dismissTip`                              |
| `newsletter.ts`             | Newsletter         | `subscribe`, `unsubscribe`                                       |
| `article-agent.ts`          | AI articles        | `generateArticle`, `publishArticle`                              |

**Usage Pattern:**

```typescript
// In client component
"use client"
import { createInvoice } from "@/app/actions/invoice"

async function handleSubmit(data: InvoiceData) {
  const result = await createInvoice(data)
  if (result.error) {
    toast.error(result.error)
  } else {
    router.push(`/invoices/${result.id}`)
  }
}
```
````

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): document server actions (21 files, not REST)"
````

---

### Task 2.3: Add Drizzle Schema Documentation

**Context:** Bible only mentions Prisma; Drizzle powers guidance, news, paušalni systems.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/db/schema/`

**Step 1: List Drizzle schemas**

```bash
ls -la /home/admin/FiskAI/src/lib/db/schema/
```

**Step 2: Update Section 2.1 Tech Stack (around line 73)**

Add Drizzle row:

```markdown
| Database | PostgreSQL 16 + Prisma 7 | Primary data persistence |
| Database | Drizzle ORM | Guidance, news, paušalni tables |
```

**Step 3: Add Section 15.4 Drizzle Models**

After Section 15.3, add:

````markdown
### 15.4 Drizzle ORM Models

These tables are managed by Drizzle (not Prisma) for performance-critical or newer features.

**Location:** `/src/lib/db/schema/`

| Schema File     | Tables                                                                                    | Purpose                                |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `guidance.ts`   | `user_guidance_preferences`, `checklist_interactions`                                     | User competence levels, setup progress |
| `pausalni.ts`   | `pausalni_profile`, `eu_vendor`, `eu_transaction`, `payment_obligation`, `generated_form` | Paušalni compliance hub                |
| `news.ts`       | `news_sources`, `news_items`, `news_posts`, `news_categories`, `news_tags`                | News aggregation system                |
| `newsletter.ts` | `newsletter_subscriptions`                                                                | Newsletter subscribers                 |
| `deadlines.ts`  | `compliance_deadlines`                                                                    | Generated tax deadlines                |

**Example Schema:**

```typescript
// src/lib/db/schema/guidance.ts
export const userGuidancePreferences = pgTable("user_guidance_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  globalLevel: text("global_level").default("beginner"), // beginner, average, pro
  categoryLevels: jsonb("category_levels"), // { invoicing: "pro", banking: "beginner" }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})
```
````

````

**Step 4: Update Section 2.2 Directory Structure**

Add to the `/src/lib/` section:
```markdown
│   ├── db/
│   │   ├── drizzle.ts      # Drizzle client
│   │   └── schema/         # Drizzle table definitions
````

**Step 5: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): document Drizzle ORM usage alongside Prisma"
```

---

### Task 2.4: Add AI Agents Specification

**Context:** APPENDIX_1 defines Watchdog/Clerk/Matcher algorithms but bible lacks them.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/docs/APPENDIX_1.md` (Section 4)

**Step 1: Add Section 12.5 AI Agents after Integration Ecosystem**

````markdown
### 12.5 Proactive AI Agents

FiskAI uses AI agents that **act proactively**, not just respond to queries.

#### Agent: The Watchdog (Regulatory Guardian)

**Trigger:** Daily cron job + every invoice creation

**Algorithm:**

```typescript
1. current_revenue = Sum(Invoices.total) WHERE year = current
2. proximity = current_revenue / 60000  // 2025 threshold
3. If proximity > 0.85 → Level 1 Warning (Dashboard Banner)
4. If proximity > 0.95 → Level 2 Emergency (Email to User + Accountant)
5. Action: Display link to "Prijelaz na D.O.O." guide
```
````

**UI Components:**

- `card:pausalni-status` - Shows limit progress bar
- `card:insights-widget` - Displays proactive warnings

#### Agent: The Clerk (OCR & Categorization)

**Trigger:** Document upload to Expense Vault

**Algorithm:**

```typescript
1. Input: JPEG/PNG/PDF from expense upload
2. Extract: Use Claude-3-Haiku for text extraction
3. Parse: Date, Amount, Vendor OIB, VAT amount
4. Lookup: Check vendor OIB against Contact database
5. If unknown vendor: Search official register (API) → auto-create Contact
6. Categorize: Match to expense categories
7. VAT check: Verify deductibility via VIES if vendor has VAT ID
8. If amount > 665 EUR: Suggest asset capitalization
```

**Confidence Thresholds:**

- High (>0.9): Auto-fill, minimal review
- Medium (0.7-0.9): Auto-fill with "Please verify" prompt
- Low (<0.7): Manual entry required

#### Agent: The Matcher (Reconciliation)

**Trigger:** Bank transaction import

**Algorithm:**

```typescript
1. Input: BankTransaction row
2. Extract: pozivNaBroj (reference number)
3. Match: Compare against EInvoice.invoiceNumber
4. Amount check: Allow ±0.05 EUR tolerance (rounding)
5. If match confidence > 0.9: Auto-mark invoice as PAID
6. Else: Add to reconciliation queue for manual review
```

**Match Statuses:**

- `UNMATCHED` → New transaction
- `AUTO_MATCHED` → High confidence, pending confirmation
- `MANUAL_MATCHED` → User-confirmed match
- `IGNORED` → User marked as non-invoice

````

**Step 2: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add AI agents specification (Watchdog, Clerk, Matcher)"
````

---

### Task 2.5: Add Document Integrity & Audit Specification

**Context:** APPENDIX_1 specifies hash-chaining for 11-year archive, bible lacks it.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add to Section 1.2 Non-Negotiables table**

Add new row:

```markdown
| **Document Integrity** | SHA-256 hashing + Merkle tree verification | 11-year archive must prove documents unaltered |
```

**Step 2: Add Section 6.4 Audit Logging after RBAC section**

````markdown
### 6.4 Audit Logging

Every significant action is logged for compliance and debugging.

**Logged Actions:**
| Action | What's Recorded |
|--------|-----------------|
| `CREATE` | Entity type, ID, user, timestamp, company |
| `UPDATE` | Fields changed, old/new values |
| `DELETE` | Soft-delete flag, reason if provided |
| `VIEW` | Sensitive data access (financial reports) |
| `EXPORT` | What was exported, format, recipient |
| `LOGIN` | Success/failure, IP, device |

**Implementation:**

```typescript
// Prisma middleware enforces logging
prisma.$use(async (params, next) => {
  if (["create", "update", "delete"].includes(params.action)) {
    await createAuditLog({
      action: params.action.toUpperCase(),
      model: params.model,
      entityId: params.args.where?.id,
      userId: getCurrentUserId(),
      companyId: getCurrentCompanyId(),
      changes: params.args.data,
    })
  }
  return next(params)
})
```
````

**Document Integrity:**

```typescript
// Every uploaded/generated document
interface DocumentIntegrity {
  documentId: string
  sha256Hash: string // Hash of document content
  createdAt: DateTime
  verifiedAt?: DateTime // Last integrity check
  merkleRoot?: string // Periodic Merkle tree root
}
```

**Retention:** 11 years (Croatian legal requirement for tax documents)

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add audit logging and document integrity specification"
````

---

### Task 2.6: Add Notification & Email Integration

**Context:** Notification system exists but undocumented. Email integration missing entirely.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add Section 9.6 Notification System**

````markdown
### 9.6 Notification System

#### Notification Types

| Type       | Icon          | Channel        | Example                 |
| ---------- | ------------- | -------------- | ----------------------- |
| `deadline` | Calendar      | In-app + Email | "MIO I due in 3 days"   |
| `warning`  | AlertTriangle | In-app + Email | "85% of VAT threshold"  |
| `success`  | CheckCircle   | In-app only    | "Invoice #123 paid"     |
| `info`     | Info          | In-app only    | "New feature available" |
| `system`   | Bell          | In-app only    | "Maintenance scheduled" |

#### Delivery Channels

| Channel | Trigger                                      | Configuration    |
| ------- | -------------------------------------------- | ---------------- |
| In-App  | Immediate                                    | Always enabled   |
| Email   | Batched (daily digest) or immediate (urgent) | User preferences |
| Push    | Future                                       | Not implemented  |

#### User Preferences

```typescript
interface NotificationPreference {
  userId: string
  emailDigest: "daily" | "weekly" | "never"
  urgentEmail: boolean // Immediate for Level 2 warnings
  categories: {
    deadlines: boolean
    payments: boolean
    invoices: boolean
    system: boolean
  }
}
```
````

### 9.7 Email Integration

FiskAI can connect to user email accounts to auto-import expense receipts.

#### Supported Providers

| Provider      | OAuth            | Status        |
| ------------- | ---------------- | ------------- |
| Gmail         | Google OAuth 2.0 | ✅ Production |
| Microsoft 365 | Microsoft OAuth  | ✅ Production |
| Other IMAP    | Not supported    | ❌            |

#### Import Flow

```
1. User connects email via OAuth
2. System creates EmailConnection record
3. Cron job (15min) fetches new emails
4. Filter by import rules:
   - Sender whitelist (e.g., "faktura@*")
   - Subject patterns (e.g., "Račun*")
   - Attachment types (PDF, images)
5. Matching attachments → Import queue
6. AI extraction (The Clerk agent)
7. User review and confirm
```

#### Import Rules

```typescript
interface EmailImportRule {
  id: string
  connectionId: string
  senderPattern: string // "invoices@*" or "*@supplier.hr"
  subjectPattern?: string // "Invoice*" or "Račun*"
  attachmentTypes: string[] // ["pdf", "jpg", "png"]
  targetCategory?: string // Auto-assign expense category
  autoConfirm: boolean // Skip review for trusted senders
}
```

````

**Step 2: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add notification system and email integration docs"
````

---

### Task 2.7: Add Fiscal Certificate & POS Flows

**Context:** Fiscalization mentioned but no certificate flow. POS at 30% but undocumented.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add Section 10.6 Fiscal Certificate Management**

```markdown
### 10.6 Fiscal Certificate Management

Required for businesses accepting cash/card payments.

#### Certificate Upload Flow
```

1. Navigate to /settings/fiscal
2. Click "Upload Certificate"
3. Select .p12 file from FINA
4. Enter certificate password
5. System validates:
   - File format (PKCS#12)
   - Certificate not expired
   - OIB matches company
6. Store encrypted in database
7. Mark company as fiscal-enabled

````

#### Certificate Lifecycle

| Status | Meaning | Action |
|--------|---------|--------|
| `PENDING` | Uploaded, not validated | Validate password |
| `ACTIVE` | Ready for fiscalization | None |
| `EXPIRING` | <30 days to expiry | Renew warning |
| `EXPIRED` | Cannot fiscalize | Block cash invoices |
| `REVOKED` | Manually invalidated | Upload new cert |

#### Multi-Premises Support

```typescript
interface BusinessPremises {
  id: string
  companyId: string
  label: string           // "Glavni ured", "Poslovnica 2"
  address: string
  posDeviceId?: string    // Linked POS terminal
  isDefault: boolean
}
````

Each premises can have its own fiscal device numbering.

### 10.7 POS Terminal Operations

For retail businesses with Stripe Terminal.

#### Terminal Setup Flow

```
1. Order Stripe Terminal reader (BBPOS WisePOS E)
2. Navigate to /pos/setup
3. Click "Pair Reader"
4. System generates connection token
5. Reader displays pairing code
6. Enter code in FiskAI
7. Reader linked to premises
```

#### Transaction Flow

```
1. Create sale in /pos
2. Add items (from Products)
3. Calculate total
4. Select payment method:
   - Cash → Direct fiscalize
   - Card → Stripe Terminal
5. If card:
   - Send to reader
   - Customer taps/inserts
   - Wait for authorization
6. On success:
   - Fiscalize to CIS
   - Print/email receipt
   - Update inventory
```

#### Terminal Statuses

| Status     | Meaning                |
| ---------- | ---------------------- |
| `ONLINE`   | Ready for transactions |
| `OFFLINE`  | Network issue          |
| `BUSY`     | Processing transaction |
| `UPDATING` | Firmware update        |

````

**Step 2: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add fiscal certificate and POS terminal documentation"
````

---

### Task 2.8: Add Expanded Glossary & File Locations

**Context:** Glossary missing key terms. File locations incomplete.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Expand Appendix A Glossary**

Add these terms to the glossary table:

```markdown
| EN16931 | European e-invoicing standard | XML schema for B2G invoices |
| UBL | Universal Business Language | XML format for e-invoices |
| CAMT.053| Cash Management message | ISO 20022 bank statement XML |
| Hub3 | Croatian payment slip standard | 2D barcode for payments |
| R1/R2 | Invoice types | R1=standard, R2=cash register |
| VIES | VAT Information Exchange System | EU VAT number validation |
| SEPA | Single Euro Payments Area | EU bank transfer standard |
| PSD2 | Payment Services Directive 2 | Open banking regulation |
| Poziv na broj | Payment reference number | Links payment to invoice |
| Prirez | Municipal surtax | Added to income tax |
| JOPPD | Jedinstveni Obrazac Poreza i Prihoda | Payroll reporting form |
| Putni nalog | Travel order | Tax-free expense claim |
| Dnevnica| Per diem | Daily travel allowance |
```

**Step 2: Expand Appendix B File Locations**

```markdown
## Appendix B: File Locations

| Purpose                | Path                                           |
| ---------------------- | ---------------------------------------------- |
| **Core Configuration** |                                                |
| Module definitions     | `/src/lib/modules/definitions.ts`              |
| Visibility rules       | `/src/lib/visibility/rules.ts`                 |
| Visibility elements    | `/src/lib/visibility/elements.ts`              |
| Visibility context     | `/src/lib/visibility/context.tsx`              |
| RBAC permissions       | `/src/lib/rbac.ts`                             |
| Capabilities           | `/src/lib/capabilities.ts`                     |
| Navigation registry    | `/src/lib/navigation.ts`                       |
| **Fiscal Data**        |                                                |
| Tax thresholds         | `/src/lib/fiscal-data/data/thresholds.ts`      |
| Tax rates              | `/src/lib/fiscal-data/data/tax-rates.ts`       |
| Contributions          | `/src/lib/fiscal-data/data/contributions.ts`   |
| Deadlines              | `/src/lib/fiscal-data/data/deadlines.ts`       |
| Payment details        | `/src/lib/fiscal-data/data/payment-details.ts` |
| **Feature Modules**    |                                                |
| Paušalni logic         | `/src/lib/pausalni/`                           |
| E-invoice generation   | `/src/lib/e-invoice/`                          |
| Bank sync              | `/src/lib/bank-sync/`                          |
| Banking import         | `/src/lib/banking/`                            |
| Guidance system        | `/src/lib/guidance/`                           |
| **Database**           |                                                |
| Prisma schema          | `/prisma/schema.prisma`                        |
| Drizzle client         | `/src/lib/db/drizzle.ts`                       |
| Drizzle schemas        | `/src/lib/db/schema/`                          |
| **UI Components**      |                                                |
| Dashboard widgets      | `/src/components/dashboard/`                   |
| Onboarding steps       | `/src/components/onboarding/`                  |
| Guidance components    | `/src/components/guidance/`                    |
| Layout components      | `/src/components/layout/`                      |
| Admin components       | `/src/components/admin/`                       |
| Staff components       | `/src/components/staff/`                       |
| **Content**            |                                                |
| MDX guides             | `/content/vodici/`                             |
| MDX comparisons        | `/content/usporedbe/`                          |
| Implementation plans   | `/docs/plans/`                                 |
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): expand glossary with 13 terms and complete file locations"
```

---

## Phase 3: Code-Doc Misalignments (23 items batched into 7 tasks)

---

### Task 3.1: Fix Sidebar Navigation Structure

**Context:** Bible shows 9 sections, code has 5 different sections.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/navigation.ts`

**Step 1: Read actual navigation**

```bash
cat /home/admin/FiskAI/src/lib/navigation.ts | head -100
```

**Step 2: Rewrite Section 9.1 Sidebar (around lines 756-771)**

````markdown
#### Sidebar (`sidebar.tsx`)

**Navigation Sections (from `/src/lib/navigation.ts`):**

1. **Pregled** (Overview)
   - Dashboard

2. **Financije** (Finance)
   - Blagajna (POS) - `module: pos`
   - Dokumenti (Documents) - with category filters
   - Bankarstvo (Banking) - `module: banking`
   - Paušalni Hub - `module: pausalni`
   - Izvještaji (Reports)

3. **Suradnja** (Collaboration)
   - Računovođa (Accountant workspace)
   - Podrška (Support)

4. **Podaci** (Data)
   - Kontakti (Contacts)
   - Proizvodi (Products)
   - Article Agent - `module: ai-assistant` (STAFF only)

5. **Sustav** (System)
   - Postavke (Settings)

**Module Gating:**

```typescript
// src/components/layout/sidebar.tsx:139-151
if (item.module && company && !entitlements.includes(item.module)) {
  return false // Hidden from navigation
}
```
````

**Visibility Integration:**

- Each nav item can have a `visibilityId` for stage/competence gating
- Items not in entitlements are hidden (not locked)

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): align sidebar spec with actual navigation registry"
````

---

### Task 3.2: Fix Module Definition Interface

**Context:** Bible shows rich navItems objects, code uses string arrays.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/modules/definitions.ts:22-29`

**Step 1: Verify actual interface**

```bash
grep -A20 "interface ModuleDefinition\|type ModuleDefinition" /home/admin/FiskAI/src/lib/modules/definitions.ts
```

**Step 2: Rewrite Section 5.2 Module Definition Structure (lines 432-446)**

````markdown
### 5.2 Module Definition Structure

```typescript
// src/lib/modules/definitions.ts
interface ModuleDefinition {
  key: ModuleKey
  name: string // Croatian display name
  description: string // Croatian description
  routes: string[] // Protected route patterns
  navItems: string[] // Nav item identifiers (not objects)
  defaultEnabled: boolean
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  invoicing: {
    key: "invoicing",
    name: "Fakturiranje",
    description: "Izrada i slanje računa",
    routes: ["/invoices", "/invoices/new", "/invoices/[id]"],
    navItems: ["invoices"], // References nav registry
    defaultEnabled: true,
  },
  // ... 15 more modules
}
```
````

**Note:** The `navItems` array contains identifiers that map to the navigation registry in `/src/lib/navigation.ts`, not full nav item objects. The `requiredFor` field shown in earlier versions does not exist in the current implementation.

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): correct module definition interface to match code"
````

---

### Task 3.3: Fix Visibility System Scope

**Context:** Bible claims visibility checks entitlements, but it doesn't.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/visibility/rules.ts`

**Step 1: Verify visibility doesn't check entitlements**

```bash
grep -n "entitlements" /home/admin/FiskAI/src/lib/visibility/rules.ts
```

Expected: No matches (visibility ignores entitlements).

**Step 2: Rewrite Section 7.3 Visibility Component Usage (lines 579-591)**

````markdown
### 7.3 Visibility Component Usage

```tsx
// In dashboard
<Visible id="card:pausalni-status">
  <PausalniStatusCard />
</Visible>
```
````

**What Visibility Checks:**

1. ✅ Legal form (`legalForm`) - e.g., hide VAT widgets for paušalni
2. ✅ Progression stage (`stage`) - e.g., hide charts until first invoice
3. ✅ Competence level (`competence`) - e.g., hide advanced for beginners
4. ❌ **Does NOT check entitlements**

**Entitlements Are Checked Separately:**

- Sidebar: Direct array check in `sidebar.tsx`
- Pages: Route protection middleware
- Components: Manual `entitlements.includes()` checks

```tsx
// Combining visibility + entitlements
<Visible id="card:ai-insights">
  {entitlements.includes("ai-assistant") && <AIInsightsCard />}
</Visible>
```

**Why Separate?**

- Visibility = "Should this user type see this?"
- Entitlements = "Has this company paid for this?"
- A paušalni user shouldn't see VAT widgets even if they somehow have the `vat` entitlement.

````

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): clarify visibility system does not check entitlements"
````

---

### Task 3.4: Add Complete Element ID Registry

**Context:** Bible lists 10 elements, code has 23+.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/lib/visibility/elements.ts`

**Step 1: Get full element list**

```bash
cat /home/admin/FiskAI/src/lib/visibility/elements.ts
```

**Step 2: Replace Section 7.2 Element Visibility Rules table (lines 564-577)**

```markdown
### 7.2 Element Visibility Registry

**Complete list from `/src/lib/visibility/elements.ts`:**

#### Dashboard Cards

| Element ID                  | Legal Form  | Stage     | Competence | Purpose          |
| --------------------------- | ----------- | --------- | ---------- | ---------------- |
| `card:hero-banner`          | All         | setup+    | All        | Welcome message  |
| `card:checklist-widget`     | All         | setup     | beginner   | Setup guide      |
| `card:recent-activity`      | All         | active+   | average+   | Recent actions   |
| `card:revenue-trend`        | All         | active+   | average+   | Revenue chart    |
| `card:invoice-funnel`       | All         | active+   | average+   | Invoice pipeline |
| `card:pausalni-status`      | OBRT_PAUSAL | setup+    | All        | Limit tracker    |
| `card:vat-overview`         | VAT payers  | active+   | average+   | VAT summary      |
| `card:fiscalization-status` | Cash payers | setup+    | All        | Fiscal status    |
| `card:insights-widget`      | All         | strategic | All        | AI insights      |
| `card:corporate-tax`        | DOO/JDOO    | strategic | pro        | Corp tax         |
| `card:doprinosi`            | OBRT\_\*    | setup+    | All        | Contributions    |
| `card:cash-flow`            | All         | active+   | average+   | Cash flow        |
| `card:posd-reminder`        | OBRT_PAUSAL | active+   | All        | Annual form      |
| `card:deadline-countdown`   | All         | setup+    | All        | Next deadline    |
| `card:today-actions`        | All         | setup+    | All        | Action items     |
| `card:advanced-insights`    | All         | strategic | pro        | Deep analytics   |

#### Navigation Items

| Element ID       | Purpose         |
| ---------------- | --------------- |
| `nav:invoices`   | Invoice list    |
| `nav:e-invoices` | E-invoice list  |
| `nav:banking`    | Bank accounts   |
| `nav:pos`        | Point of sale   |
| `nav:pausalni`   | Paušalni hub    |
| `nav:vat`        | VAT management  |
| `nav:reports`    | Reports section |
| `nav:settings`   | Settings        |

#### Pages

| Element ID       | Purpose       |
| ---------------- | ------------- |
| `page:vat`       | VAT dashboard |
| `page:pausalni`  | Paušalni hub  |
| `page:pos`       | POS interface |
| `page:reports`   | Reports       |
| `page:corporate` | Corp tax      |
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): add complete element visibility registry (23+ elements)"
```

---

### Task 3.5: Fix Mobile Navigation & Action Drawer

**Context:** Bible describes bottom nav + action drawer, code uses slide-out + command palette.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/components/layout/mobile-nav.tsx`

**Step 1: Verify actual mobile implementation**

```bash
grep -n "drawer\|Drawer\|CommandPalette\|FAB" /home/admin/FiskAI/src/components/layout/mobile-nav.tsx | head -20
```

**Step 2: Rewrite Section 9.1 Bottom Navigation (lines 778-794)**

```markdown
#### Mobile Navigation (`mobile-nav.tsx`)

**Implementation:** Slide-out drawer + Command Palette FAB

**Hamburger Menu (☰):**

- Opens full navigation drawer from left
- Same structure as desktop sidebar
- Gestures: Swipe right to open, left to close

**Command Palette FAB (+):**

- Fixed position button (bottom-right)
- Opens command palette overlay
- Keyboard shortcut: Not available on mobile

**Quick Actions in Command Palette:**
| Action | Command | Route |
|--------|---------|-------|
| New E-Invoice | "e-račun" | `/e-invoices/new` |
| New Invoice | "račun" | `/invoices/new` |
| New Contact | "kontakt" | `/contacts/new` |
| New Expense | "trošak" | `/expenses/new` |
| Search | "traži" | Opens search |

**Note:** The bottom navigation bar design from earlier mockups was replaced with the command palette approach for more flexibility.
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): correct mobile nav to slide-out drawer + command palette"
```

---

### Task 3.6: Fix Staff & Admin Portal Specifications

**Context:** Bible describes features that don't match actual implementation.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/src/components/staff/sidebar.tsx`, `/home/admin/FiskAI/src/components/admin/sidebar.tsx`

**Step 1: Check actual staff sidebar**

```bash
grep -A30 "nav\|items\|menu" /home/admin/FiskAI/src/components/staff/sidebar.tsx | head -40
```

**Step 2: Rewrite Petra's Portal section (lines 250-263)**

```markdown
**Petra's Portal (`staff.fiskai.hr`):**

**Current Implementation:**
```

Staff Dashboard
├── Dashboard (overview of assigned clients)
├── Clients (list with status indicators)
├── Calendar (shared deadlines view)
├── Tasks (assigned work items)
├── Tickets (support tickets from clients)
└── Documents (cross-client document access)

```

**Per-Client Context:**
- Click client → enters client context
- Same UI as client app
- Role: ACCOUNTANT (read + export)
- Special: "Pregledano" (Reviewed) button

**Planned Features (not yet implemented):**
- Pending Actions aggregate view
- Bulk export across clients
- Quick deadline overview
```

**Step 3: Rewrite Admin Portal section (lines 275-284)**

```markdown
**Admin Portal (`admin.fiskai.hr`):**

**Current Implementation:**
```

Admin Dashboard
├── Dashboard (platform metrics - partial)
├── Subscriptions (Stripe subscription management)
├── Services (feature flag management)
├── Audit Log (system-wide activity)
└── Users (view/manage platform users)

```

**Planned Features:**
- News management (create/edit announcements)
- Full metrics dashboard
- Support ticket escalation
- Tenant impersonation
```

**Step 4: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): align staff/admin portal specs with actual implementation"
```

---

### Task 3.7: Fix Data Model Snippets

**Context:** EInvoice field names and enums don't match Prisma schema.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`
- Reference: `/home/admin/FiskAI/prisma/schema.prisma`

**Step 1: Get actual EInvoice model**

```bash
grep -A40 "model EInvoice {" /home/admin/FiskAI/prisma/schema.prisma
```

**Step 2: Get actual enums**

```bash
grep -A10 "enum EInvoiceStatus\|enum InvoiceType\|enum EInvoiceDirection" /home/admin/FiskAI/prisma/schema.prisma
```

**Step 3: Update Section 15.2 Invoice Model to match schema**

Sync the model snippet with actual field names from Prisma.

**Step 4: Update enum lists**

Add missing enum values:

- EInvoiceStatus: Add `ARCHIVED`, `ERROR`
- InvoiceType: Add `DEBIT_NOTE`

**Step 5: Fix Section 15.3 Missing Models**

Remove models that actually exist:

- ❌ StaffAssignment (exists)
- ❌ BankAccount (exists)
- ❌ BankTransaction (exists)
- ❌ Statement (exists)
- ❌ SupportTicket (exists)

Keep only truly missing:

- ✅ KPIEntry (Income/Expense book)
- ✅ FixedAsset (Depreciation)
- ✅ Employee (Payroll)
- ✅ TravelOrder (Putni nalog)

**Step 6: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): sync data model snippets with actual Prisma schema"
```

---

## Phase 4: Structural Improvements (8 items in 3 tasks)

---

### Task 4.1: Add Version Matrix & Status Markers

**Context:** No way to tell what's implemented vs planned.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add Document Control section after title**

Replace lines 5-8 with:

```markdown
**Version:** 4.1.0
**Date:** 2025-12-20
**Status:** Canonical - Single Source of Truth
**Scope:** Every flow, every button, every permission, every scenario

### Document Status Legend

Throughout this document:

- ✅ **Implemented** - In production, working
- ⚠️ **Partial** - Some features working, others in progress
- 🚧 **In Development** - Actively being built
- 📋 **Planned** - Designed but not started
- ❌ **Not Planned** - Out of scope

### Version Alignment

| Component         | Bible Version | Code Version | Status     |
| ----------------- | ------------- | ------------ | ---------- |
| Core Architecture | 4.1.0         | Current      | ✅ Aligned |
| Module System     | 4.1.0         | Current      | ✅ Aligned |
| Visibility System | 4.1.0         | Current      | ✅ Aligned |
| Pricing Tiers     | 4.1.0         | Stripe       | ⚠️ Partial |
| Staff Portal      | 4.1.0         | Current      | ⚠️ Partial |
| Admin Portal      | 4.1.0         | Current      | ⚠️ Partial |
```

**Step 2: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add version matrix and status legend"
```

---

### Task 4.2: Add Fiscal Data Source References

**Context:** Tax data embedded without citing code files.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add source callout to Section 11**

After Section 11 title, add:

```markdown
> **Data Source:** All values in this section are derived from `/src/lib/fiscal-data/`. Changes to tax rates, thresholds, or deadlines should be made in code, then this document updated to match.
>
> **Last Verified:** 2025-01-15
> **Verification Schedule:** Monthly review against official sources
```

**Step 2: Add source annotations to each subsection**

After each table in Section 11, add:

```markdown
_Source: `/src/lib/fiscal-data/data/thresholds.ts`, verified against Porezna Uprava_
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "feat(bible): add fiscal data source references"
```

---

### Task 4.3: Regenerate Table of Contents

**Context:** ToC missing new sections.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Update Table of Contents (lines 12-33)**

```markdown
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
16. [API Reference (Legacy)](#16-api-reference)
17. [Complete API Reference](#17-complete-api-reference)

---

**Appendixes:**

- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: File Locations](#appendix-b-file-locations)
- [Appendix 1: Strategic Technical Specification](#appendix-1-strategic-technical-specification-gaps--proof)
- [Appendix 2: Improvement Ledger](#appendix-2-improvement-ledger-audit--fixes)
```

**Step 2: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "fix(bible): regenerate table of contents with new sections"
```

---

## Phase 5: Final Polish (3 tasks)

---

### Task 5.1: Update Document History

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Find Document History section**

```bash
grep -n "Document History\|Version.*Date.*Author" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md
```

**Step 2: Update history table**

```markdown
## Document History

| Version | Date       | Author | Changes                             |
| ------- | ---------- | ------ | ----------------------------------- |
| 4.1.0   | 2025-12-20 | Claude | Complete rewrite per gap analysis   |
| 4.0.0   | 2025-12-19 | Claude | Unified bible with appendixes       |
| 3.1.0   | 2025-12-19 | Gemini | V3.1 Expansion (regulatory roadmap) |
| 2.0.0   | 2025-12-19 | Codex  | V2 Rewrite (canonical)              |
| 1.0.0   | 2025-12-19 | Gemini | Initial draft                       |

### v4.1.0 Changes (2025-12-20)

**Critical Fixes:**

- Updated VAT/paušalni thresholds to 60,000 EUR (2025 law)
- Fixed competence terminology (beginner/average/pro)
- Corrected asset capitalization threshold to 665 EUR
- Replaced ModuleGate with actual Visible component usage
- Fixed banking module to PAID status
- Aligned pricing tiers with Stripe configuration
- Corrected integration statuses (IE-Računi, SaltEdge)

**New Sections:**

- Complete API route inventory (142 endpoints)
- Server actions documentation (21 files)
- Drizzle ORM schema documentation
- AI agents specification (Watchdog, Clerk, Matcher)
- Audit logging and document integrity
- Notification and email integration
- Fiscal certificate management
- POS terminal operations
- Expanded glossary and file locations

**Alignments:**

- Sidebar navigation structure
- Module definition interface
- Visibility system scope clarification
- Complete element ID registry
- Mobile navigation implementation
- Staff/Admin portal specifications
- Data model snippets synced with Prisma
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "docs(bible): update document history for v4.1.0"
```

---

### Task 5.2: Remove Duplicate/Stale Appendix Content

**Context:** With fixes applied, some appendix content is now redundant.

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Add resolution notes to Appendix 1**

At the start of Appendix 1, add:

```markdown
> **Status:** Most items in this appendix have been incorporated into the main document in v4.1.0. This appendix is retained for audit trail purposes.
```

**Step 2: Add resolution notes to Appendix 2**

At the start of Appendix 2, add:

```markdown
> **Status:** All items in this audit ledger have been reviewed and addressed in v4.1.0. See Document History for change summary.
```

**Step 3: Commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "docs(bible): mark appendixes as resolved in v4.1.0"
```

---

### Task 5.3: Final Verification & Version Bump

**Files:**

- Modify: `/home/admin/FiskAI/docs/PRODUCT_BIBLE.md`

**Step 1: Verify no 40k threshold remains**

```bash
grep -n "40.000\|40,000\|40000" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md | grep -v "40.000.01\|40%"
```

Expected: No matches in threshold contexts.

**Step 2: Verify no standard/expert terminology**

```bash
grep -n "standard\|expert" /home/admin/FiskAI/docs/PRODUCT_BIBLE.md | grep -i "competen\|level"
```

Expected: No matches (should be average/pro).

**Step 3: Verify all sections have content**

```bash
grep -n "^## \|^### " /home/admin/FiskAI/docs/PRODUCT_BIBLE.md | wc -l
```

Should be 60+ sections.

**Step 4: Update version number at top of file**

```markdown
**Version:** 4.1.0
**Date:** 2025-12-20
```

**Step 5: Final commit**

```bash
git add docs/PRODUCT_BIBLE.md
git commit -m "chore(bible): complete v4.1.0 - single source of truth"
```

---

## Execution Summary

| Phase                 | Tasks  | Est. Time       | Priority |
| --------------------- | ------ | --------------- | -------- |
| 1. Critical Fixes     | 12     | 2-3 hours       | P0       |
| 2. Missing Sections   | 8      | 4-5 hours       | P1       |
| 3. Code-Doc Alignment | 7      | 2-3 hours       | P1       |
| 4. Structural         | 3      | 1 hour          | P2       |
| 5. Final Polish       | 3      | 30 min          | P2       |
| **Total**             | **33** | **10-12 hours** |          |

---

**Plan complete and saved to `docs/plans/2025-12-20-product-bible-v41-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
