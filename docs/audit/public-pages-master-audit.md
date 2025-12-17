# Public Pages Master Audit (Non-`/dashboard`)

**Last verified:** 2025-12-17  
**Scope:** All client-facing pages that are **not** part of the main app under `/dashboard` (i.e. everything outside `src/app/(dashboard)`), excluding API routes.  
**Purpose:** A single master list + per-page audit so we can systematically raise every marketing/knowledge/tools page to the same bar as the best landing experience.

This doc is intended to be actionable: each route has concrete P0/P1/P2 next steps, and there’s a master backlog at the end.

---

## 1) Route Inventory (verified)

**Source of truth:** `src/app/**/page.*` excluding `src/app/(dashboard)` and `src/app/api`.  
**Total:** 51 routes (42 public/marketing, 4 auth, 5 internal admin).

### 1.1 Public / Marketing (42)

| Route                         | Source                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `/`                           | `src/app/(marketing)/page.tsx`                            |
| `/about`                      | `src/app/(marketing)/about/page.tsx`                      |
| `/contact`                    | `src/app/(marketing)/contact/page.tsx`                    |
| `/features`                   | `src/app/(marketing)/features/page.tsx`                   |
| `/pricing`                    | `src/app/(marketing)/pricing/page.tsx`                    |
| `/security`                   | `src/app/(marketing)/security/page.tsx`                   |
| `/status`                     | `src/app/(marketing)/status/page.tsx`                     |
| `/prelazak`                   | `src/app/(marketing)/prelazak/page.tsx`                   |
| `/fiskalizacija`              | `src/app/(marketing)/fiskalizacija/page.tsx`              |
| `/wizard`                     | `src/app/(marketing)/wizard/page.tsx`                     |
| `/for/pausalni-obrt`          | `src/app/(marketing)/for/pausalni-obrt/page.tsx`          |
| `/for/dooo`                   | `src/app/(marketing)/for/dooo/page.tsx`                   |
| `/for/accountants`            | `src/app/(marketing)/for/accountants/page.tsx`            |
| `/alati`                      | `src/app/(marketing)/alati/page.tsx`                      |
| `/alati/pdv-kalkulator`       | `src/app/(marketing)/alati/pdv-kalkulator/page.tsx`       |
| `/alati/posd-kalkulator`      | `src/app/(marketing)/alati/posd-kalkulator/page.tsx`      |
| `/alati/kalendar`             | `src/app/(marketing)/alati/kalendar/page.tsx`             |
| `/alati/uplatnice`            | `src/app/(marketing)/alati/uplatnice/page.tsx`            |
| `/alati/kalkulator-doprinosa` | `src/app/(marketing)/alati/kalkulator-doprinosa/page.tsx` |
| `/alati/kalkulator-poreza`    | `src/app/(marketing)/alati/kalkulator-poreza/page.tsx`    |
| `/alati/oib-validator`        | `src/app/(marketing)/alati/oib-validator/page.tsx`        |
| `/alati/e-racun`              | `src/app/(marketing)/alati/e-racun/page.tsx`              |
| `/baza-znanja`                | `src/app/(marketing)/baza-znanja/page.tsx`                |
| `/vodic`                      | `src/app/(marketing)/vodic/page.tsx`                      |
| `/vodic/[slug]`               | `src/app/(marketing)/vodic/[slug]/page.tsx`               |
| `/usporedba`                  | `src/app/(marketing)/usporedba/page.tsx`                  |
| `/usporedba/[slug]`           | `src/app/(marketing)/usporedba/[slug]/page.tsx`           |
| `/kako-da`                    | `src/app/(marketing)/kako-da/page.tsx`                    |
| `/kako-da/[slug]`             | `src/app/(marketing)/kako-da/[slug]/page.tsx`             |
| `/rjecnik`                    | `src/app/(marketing)/rjecnik/page.tsx`                    |
| `/rjecnik/[pojam]`            | `src/app/(marketing)/rjecnik/[pojam]/page.tsx`            |
| `/izvori`                     | `src/app/(marketing)/izvori/page.tsx`                     |
| `/metodologija`               | `src/app/(marketing)/metodologija/page.tsx`               |
| `/urednicka-politika`         | `src/app/(marketing)/urednicka-politika/page.tsx`         |
| `/vijesti`                    | `src/app/(marketing)/vijesti/page.tsx`                    |
| `/vijesti/kategorija/[slug]`  | `src/app/(marketing)/vijesti/kategorija/[slug]/page.tsx`  |
| `/vijesti/[slug]`             | `src/app/(marketing)/vijesti/[slug]/page.tsx`             |
| `/privacy`                    | `src/app/(marketing)/privacy/page.tsx`                    |
| `/terms`                      | `src/app/(marketing)/terms/page.tsx`                      |
| `/dpa`                        | `src/app/(marketing)/dpa/page.tsx`                        |
| `/cookies`                    | `src/app/(marketing)/cookies/page.tsx`                    |
| `/ai-data-policy`             | `src/app/(marketing)/ai-data-policy/page.tsx`             |

### 1.2 Auth (4) _(visitor-facing, but “product utility” pages)_

| Route              | Source                                    |
| ------------------ | ----------------------------------------- |
| `/login`           | `src/app/(auth)/login/page.tsx`           |
| `/register`        | `src/app/(auth)/register/page.tsx`        |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` |
| `/reset-password`  | `src/app/(auth)/reset-password/page.tsx`  |

### 1.3 Internal admin (5) _(out of marketing scope; keep for completeness)_

| Route                 | Source                                |
| --------------------- | ------------------------------------- |
| `/admin-login`        | `src/app/admin-login/page.tsx`        |
| `/admin`              | `src/app/admin/page.tsx`              |
| `/admin/[companyId]`  | `src/app/admin/[companyId]/page.tsx`  |
| `/admin/vijesti`      | `src/app/admin/vijesti/page.tsx`      |
| `/admin/vijesti/[id]` | `src/app/admin/vijesti/[id]/page.tsx` |

---

## 2) Systemic Findings (cross-cutting)

### 2.1 P0 — Contrast/theme bugs from non-theme-aware components

**Root cause (confirmed in code):** `src/components/content/FAQ.tsx` hard-codes a light palette (`text-slate-900`, `border-slate-200`, `hover:bg-slate-50`). When rendered inside dark marketing pages (`SectionBackground`), the FAQ becomes “dark text on dark background”.

**Where it currently breaks (non-exhaustive but high impact):**

- Tools pages: `/alati/*` (most of them end with `<FAQ />`)
- Templates: `/kako-da/[slug]`, `/rjecnik/[pojam]`

**Fix direction (recommended):**

- Make `FAQ` theme-aware using CSS variables (`var(--foreground)`, `var(--muted)`, `var(--surface)`, `var(--border)`), or add `variant="dark" | "light"` and use the right variant per page.
- After fixing `FAQ`, re-check all tool/how-to/glossary pages for remaining hard-coded slate buttons inside dark sections (notably `src/app/(marketing)/alati/posd-kalkulator/POSDCalculatorClient.tsx`).

### 2.2 P0 — `/contact` page theme mismatch

`/contact` is rendered on the default (light) body background but uses dark-page typography (`text-white/60`, dark glass cards). Result: low/zero contrast on production depending on scroll and backdrop.

**Fix direction:**

- Wrap the page in `SectionBackground` (dark), or convert it to token-based light UI (`text-[var(--muted)]`, `bg-[var(--surface)]`, etc.).

### 2.3 P0 — Footer/background transition

`src/app/(marketing)/layout.tsx` renders a light-ish footer via `bg-[var(--surface)]` outside any dark wrapper, so dark pages end with a stark “white block”. This looks like a bug even when it’s technically consistent with the root theme.

**Fix direction:**

- Decide: (A) marketing footer is always dark, or (B) footer follows page theme (recommended, but needs a per-route/page signal), or (C) add a gradient “fade to light” section before footer on dark pages.

### 2.4 P1 — Content accuracy & consistency

Several tool/FAQ snippets include values that are likely outdated or inconsistent within the same page (example: contributions/tax assumptions). This is a trust risk (especially for a “news & tools hub”).

**Fix direction:**

- Centralize all hard-coded “2025 numbers” in one source (prefer `src/lib/fiscal-data` / thresholds/constants), and render copy from those values.
- Add “Last updated” and “Sources” blocks consistently on tools pages (many already have `Sources`, but not all tools use it).

### 2.5 P1 — Navigation/discoverability

The new `MarketingHeader` + portal navigation is a strong solution for “too many links”, but it needs to be the single, consistent way visitors discover all public content.

**Fix direction:**

- Ensure the portal includes every “hub” destination (Tools, Guides, Comparisons, How‑to, Glossary, News, Fiskalizacija hub).
- Add a small persistent “Start here” strip on `/` and `/baza-znanja` for new visitors.

### 2.6 P1 — News authority (/vijesti)

Layout is strong (good hierarchy, deadlines module, sources), but the site’s perceived authority will be dominated by the writing quality of individual articles and digests.

**Fix direction:**

- Standardize the article format: TL;DR, “Što to znači za vas”, checklist, deadlines, links to official sources, and relevant tools.

---

## 3) Per‑Page Audits (route-by-route)

> **Legend:** P0 = must fix (readability/trust), P1 = important (UX/conversion), P2 = polish.  
> Templates apply to all slugs.

### 3.1 Core marketing

#### `/` (Homepage)

- **What works:** Excellent “cockpit” hero, motion, clear CTAs, strong “high-tech” vibe, good integration of Fiskalizacija wizard + quick access.
- **What’s missing:** A clearer “choose your path” module for visitors whose intent is (A) read news, (B) use tools, (C) learn business types.
- **Next**
  - [ ] P1: Add a “Start here” strip (News / Tools / Guides / Wizard) above the fold or immediately after hero.
  - [ ] P1: Ensure graceful content fallback if `latestNews` is empty (show featured guides/tools instead).

#### `/features`

- **What works:** Scrolly-telling already implemented (`FeatureStoryScroller`), nice staging/animations.
- **What’s missing:** The “demo” visuals still feel like placeholders; needs higher-fidelity micro-visuals that match premium positioning.
- **Next**
  - [ ] P1: Replace/upgrade scrolly visuals to feel like real UI (even if mocked).
  - [ ] P2: Add an “outcomes” section (time saved, fewer errors) with proof placeholders.

#### `/pricing`

- **What works:** Monthly/annual toggle + animated prices, good plan framing, CTA hierarchy, FAQ accordion is theme-aware (`FaqAccordion`).
- **What’s missing:** “Decision helper” content (who each plan is for) and a consistent design language for small pills (some are light UI inside dark hero).
- **Next**
  - [ ] P1: Add “For who” blocks per plan (1–2 bullets each).
  - [ ] P2: Normalize pills/badges to dark-theme variants (avoid `bg-blue-100` style inside dark sections).

#### `/security`

- **What works:** Trust Center style layout already exists; good structure and scannability.
- **What’s missing:** Stronger “proof” and consistency with policy pages (dates, ownership, links).
- **Next**
  - [ ] P1: Add “Last reviewed” + owner/contact, and link to relevant policy pages.
  - [ ] P2: Replace aspirational items (“planned Q2 2025”) with either roadmap wording or remove.

#### `/about`

- **What works:** Clear principles.
- **What’s missing:** Credibility, story, and differentiation (why you, why now, why Croatia, why this is “beyond any other”).
- **Next**
  - [ ] P1: Expand into a narrative page: origin, mission, “what’s uniquely hard in Croatia”, and how FiskAI solves it.
  - [ ] P2: Add proof placeholders (logos, testimonials, numbers) and a CTA.

#### `/contact`

- **What works:** Structured info + demo form fields + “already have an account” paths.
- **What’s broken:** Theme mismatch (white text on light background).
- **Next**
  - [ ] P0: Fix page theming (wrap with `SectionBackground` or convert to light tokens).
  - [ ] P1: Make the form real (submission handling, validation, success state).
  - [ ] P2: Add scheduling CTA (Calendly/Google Calendar) and “what happens next” timeline.

#### `/status`

- **What works:** Clear health status, checks, metrics, monitoring endpoints.
- **Next**
  - [ ] P2: Add a plain-language “What we track / what counts as incident” block.

#### `/prelazak`

- **What works:** High-quality storytelling page with motion, step-by-step framing, and FAQs; close to “top-end landing page” bar.
- **Next**
  - [ ] P2: Add concrete “What we import” checklist + supported vendors list (even if partial).

#### `/fiskalizacija`

- **What works:** Already a hub (key dates, readiness wizard, FAQ, sources, CTA).
- **Next**
  - [ ] P1: Ensure the key dates/sources are kept current and clearly cited.
  - [ ] P2: Add links to relevant tools/news filters (“show me Fiskalizacija updates”).

#### `/wizard`

- **What works:** Animated transitions, progress bar animation, icons, “thinking” delay; feels premium.
- **Next**
  - [ ] P2: Add “Save result / email me result” option to improve conversion.

### 3.2 Segment landing pages

#### `/for/pausalni-obrt`

- **What works:** Strong, conversion-oriented page with workflow scroller and good FAQ (marketing accordion).
- **Next**
  - [ ] P2: Add proof placeholders (screenshots/testimonials) and a lightweight “compare to alternatives” section.

#### `/for/dooo`

- **What works:** Solid copy and structure.
- **What’s missing:** A real “show, don’t tell” demo moment comparable to `/for/pausalni-obrt`.
- **Next**
  - [ ] P1: Add a scrolly-telling demo for PDV + e‑račun + approvals/audit trail.
  - [ ] P2: Add “compliance & audit” proof blocks (what reports you can export).

#### `/for/accountants`

- **What works:** Clear value proposition.
- **What’s missing:** Concrete collaboration workflow visuals and “how it fits your office”.
- **Next**
  - [ ] P1: Add collaboration story: client → exports → audit trail → bookkeeping package, with UI mock.
  - [ ] P2: Add “free for accountants” explanation and onboarding steps.

### 3.3 Tools

#### `/alati`

- **What works:** Clean tools hub, good cards, good cross-links back to wizard/comparisons.
- **Next**
  - [ ] P2: Add categories/search once tool count grows.

#### `/alati/pdv-kalkulator`

- **What works:** Clear calculator, good related links, good upsell module.
- **What’s broken:** FAQ rendering (uses `src/components/content/FAQ.tsx`).
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P2: Add “assumptions” and “last updated” + official sources.

#### `/alati/posd-kalkulator`

- **What works:** High-value tool (XML import), strong upsell copy, multi-step flow.
- **What’s broken:** Mixed light/dark styling inside dark section + FAQ theme.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P0: Replace hard-coded slate button styles with token-based styles for dark sections.
  - [ ] P1: Add export/download outputs (PDF/CSV) as primary actions.

#### `/alati/kalendar`

- **What works:** Helpful “deadline calendar” concept, strong upsell module.
- **What’s broken:** FAQ theme.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Add filtering by business type and “subscribe to calendar” (ICS/Google) UX.

#### `/alati/uplatnice`

- **What works:** Solid generator + helpful instructions, good upsell.
- **What’s broken:** FAQ theme.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Add saved templates + one-click download/share.

#### `/alati/kalkulator-doprinosa`

- **What works:** Strong tool + linked content + upsell.
- **What’s broken:** FAQ theme; copy contains inconsistent numbers.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Make all “2025 numbers” come from a single data source and match the UI.

#### `/alati/kalkulator-poreza`

- **What works:** Useful calculator + upsell.
- **What’s broken:** FAQ theme; copy likely includes outdated concepts (e.g. prirez) and should be verified.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Verify/refresh tax copy and sources; remove outdated rules.

#### `/alati/oib-validator`

- **What works:** Clean tool UI and explanation blocks.
- **What’s broken:** FAQ theme.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P2: Add “copy/share” UX and link to e‑račun readiness.

#### `/alati/e-racun`

- **What works:** Big-value tool, detailed UI, validations.
- **What’s broken:** FAQ theme.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Add “download XML” and “send via provider” positioning (with links to `/fiskalizacija`).

### 3.4 Knowledge hub

#### `/baza-znanja`

- **What works:** Strong hub cards and content sections; good starting points.
- **Next**
  - [ ] P2: Add global search across Guides/Comparisons/How-to/Glossary/Tools.

#### `/vodic`

- **What works:** Featured guide + search/filter + animated grid are already implemented.
- **Next**
  - [ ] P2: Add small “how to use this” strip for first-time visitors on mobile.

#### `/vodic/[slug]` _(template)_

- **What works:** Prose layout + TOC + SEO metadata; good baseline.
- **Next**
  - [ ] P1: Add “Next steps” block at end (relevant tools + comparison + CTA).

#### `/usporedba`

- **What works:** Clean index with animated cards.
- **Next**
  - [ ] P2: Add filtering/search (“starting solo”, “VAT”, “employees”) once comparisons grow.

#### `/usporedba/[slug]` _(template)_

- **What works:** Comparison table already supports sticky headers/first column and mobile “comparison cards”; calculator outputs are animated.
- **Next**
  - [ ] P2: Add a “share link with recommendation” UX (pre-fills `?preporuka=`).

#### `/kako-da`

- **What works:** Good “how to” listing layout.
- **Next**
  - [ ] P2: Add search + tags (Fiskalizacija, PDV, PO‑SD).

#### `/kako-da/[slug]` _(template)_

- **What works:** Strong MDX layout + prerequisites + sources.
- **What’s broken:** FAQ theme when `frontmatter.faq` is present.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Add “related tools” block + “next article” navigation.

#### `/rjecnik`

- **What works:** Great A‑Z index, easy scanning.
- **Next**
  - [ ] P2: Add search and “popular terms” list.

#### `/rjecnik/[pojam]` _(template)_

- **What works:** GlossaryCard + “appears in” + sources.
- **What’s broken:** FAQ theme when `frontmatter.faq` is present.
- **Next**
  - [ ] P0: Fix FAQ theme.
  - [ ] P1: Turn `appearsIn` into real links (not just strings) and add backlinks to guides/tools/news.

#### `/izvori`

- **What works:** Structured and credible.
- **Next**
  - [ ] P2: Add “last checked” + responsible editor.

#### `/metodologija`

- **What works:** Clear transparency page.
- **Next**
  - [ ] P2: Link each number/formula to its official source page (Narodne novine / Porezna uprava).

#### `/urednicka-politika`

- **What works:** Good “authority” supporting page.
- **Next**
  - [ ] P2: Add a short “How to request a correction” form/flow.

### 3.5 News

#### `/vijesti`

- **What works:** Strong layout, empty-state fallback, deadlines module, sources list.
- **Next**
  - [ ] P1: Improve/standardize generated writing quality and structure (TL;DR + checklist + sources).
  - [ ] P2: Add a simple “subscribe” UX that actually stores preferences (or link to register).

#### `/vijesti/kategorija/[slug]` _(template)_

- **What works:** Good taxonomy navigation and pagination.
- **Next**
  - [ ] P2: Add a “top story” hero card for the category.

#### `/vijesti/[slug]` _(template)_

- **What works:** Solid article layout with sources + related posts.
- **Next**
  - [ ] P1: Add TL;DR + “Što napraviti” checklist blocks (either in content generation or as a rendering component).

### 3.6 Legal

#### `/privacy`

- **What works:** Comprehensive.
- **Next**
  - [ ] P2: Replace dynamic “last updated” date with a real revision date and remove placeholders (address).

#### `/terms`

- **What works:** Comprehensive.
- **Next**
  - [ ] P2: Replace dynamic “last updated” date with a real revision date and remove placeholders (address).

#### `/dpa`

- **What works:** Good placeholder structure.
- **Next**
  - [ ] P1: Mark clearly as draft vs. legal final; then replace with reviewed text.

#### `/cookies`

- **What works:** Clear and concise.
- **Next**
  - [ ] P2: Ensure the “analytics cookies” statement matches actual tracking configuration.

#### `/ai-data-policy`

- **What works:** Clear baseline.
- **Next**
  - [ ] P2: Make claims precise (which providers, retention, opt-out path) and link to `/security`.

### 3.7 Auth

#### `/login`

- **What works:** Passkey flow, Google login, animated form switching; branded auth layout provided by `src/app/(auth)/layout.tsx`.
- **Next**
  - [ ] P2: Add better “error attention” micro-interactions (shake/highlight) and success messaging.

#### `/register`

- **What works:** Google registration, clean form.
- **Next**
  - [ ] P2: Add “what happens after registration” (company setup) hint.

#### `/forgot-password`

- **What works:** Secure “always success” UX.
- **Next**
  - [ ] P2: Add a clearer resend/back-to-login path on mobile.

#### `/reset-password`

- **What works:** Token handling and validations.
- **Next**
  - [ ] P2: Add a password strength hint.

### 3.8 Internal admin (out of scope for marketing backlog)

#### `/admin-login`, `/admin`, `/admin/*`

- Track separately; not part of public marketing UX goals.

---

## 4) Master Backlog (what still needs work)

### P0 (must fix)

- [ ] Fix `FAQ` theme (update `src/components/content/FAQ.tsx` to use token-based colors or add variants) and verify on: `/alati/*`, `/kako-da/[slug]`, `/rjecnik/[pojam]`.
- [ ] Fix `/contact` theme mismatch (`src/app/(marketing)/contact/page.tsx`).
- [ ] Decide dark-page footer strategy and implement in `src/app/(marketing)/layout.tsx`.
- [ ] Replace remaining hard-coded slate light styles inside dark sections (start with `src/app/(marketing)/alati/posd-kalkulator/POSDCalculatorClient.tsx`).

### P1 (high impact improvements)

- [ ] Verify and correct tool copy/assumptions and link to official sources (tax/contributions/calendar).
- [ ] Standardize News writing format and improve article quality (TL;DR + checklist + sources).
- [ ] Add “next steps” modules to long-form pages (`/vodic/[slug]`, `/kako-da/[slug]`, `/vijesti/[slug]`).
- [ ] Add a “show, don’t tell” demo moment to `/for/dooo` and `/for/accountants`.

### P2 (polish)

- [ ] Add global search across knowledge hub (`/baza-znanja`).
- [ ] Replace placeholders in legal pages (addresses, dynamic revision dates).
- [ ] Normalize small UI elements (badges/pills) for dark backgrounds on `/pricing`.

---

## 5) Done (already implemented in code)

- `/features`: scrolly-telling section (`FeatureStoryScroller`) + motion wrappers.
- `/pricing`: monthly/annual toggle + animated pricing; premium card hover; FAQ accordion is theme-aware.
- `/vodic`: featured guide + search/filter + animated grid (`GuidesExplorer`).
- `/usporedba/[slug]`: sticky headers + mobile “comparison cards” + animated calculator outputs.
- `/wizard`: animated question transitions, progress bar animation, “thinking” delay, icons.
- Auth: branded two-column layout + Google login + passkey flow (`src/app/(auth)/layout.tsx`, `/login`).
