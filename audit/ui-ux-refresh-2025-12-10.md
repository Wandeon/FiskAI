# UI/UX Modernization Notes – 2025-12-10

Goal: Make FiskAI look/feel like a modern SaaS across desktop & mobile. Below summarizes the gaps observed in the current React/Tailwind implementation and concrete improvements for the design/dev team.

## 1. Global Shell & Navigation
- **Header (`src/components/layout/header.tsx`)**
  - Currently a simple logo + email + logout button. Add: company context pill with status (provider connected, draft count), quick actions (New invoice, +Contact), notification icon, avatar menu.
  - Provide responsive behavior (collapse into hamburger on <1024px) and persistent toaster region for cross-page alerts.
- **Sidebar (`src/components/layout/sidebar.tsx`)**
  - Fixed 256px column with emoji icons; not responsive. Convert to componentized nav that collapses to icons on md screens and becomes slide-in drawer on mobile.
  - Group links under section headers (Finance, Master Data, Settings) and reflect active route tree (e.g., highlight `/contacts/new`). Support badges for pending approvals.
- **Layout container**
  - `src/app/layout.tsx` only wraps children with `<body>`. Introduce root `<body className="bg-slate-950 text-slate-50">` (or theme) + CSS vars for spacing, colors.

## 2. Visual Language
- Establish a design token layer (spacing, radii, typography) in Tailwind config instead of ad-hoc `text-gray-600`. Adopt light/dark palette with subtle gradients, shadows, glassmorphism.
- Use consistent card components with header/footer slots (create `components/ui/page-card.tsx`). Replace raw divs in contacts/products pages with these components.
- Introduce iconography (Lucide/Phosphor) and empty-state illustrations (SVG) for hero sections.

## 3. Responsive Patterns
- Many forms/tables assume desktop width (e.g., contacts search form uses fixed inputs). Implement grid stacks:
  - Use `grid-cols-1 md:grid-cols-2` wrappers for filters, item cards, and keep actions accessible via sticky bottom bars on mobile.
  - For tables (`src/app/(dashboard)/e-invoices/page.tsx`, `.../products/page.tsx`), switch to responsive “card list” on <768px (stacked rows with label/value).
  - Provide mobile FAB for primary actions (New invoice, Add contact) anchored to bottom right.

## 4. Dashboard & Key Screens
- **Dashboard (`src/app/(dashboard)/dashboard/page.tsx`)**
  - Expand from raw count cards to interactive widgets (charts, todo list, “Next steps”). Use a 12-column grid, include KPI spark lines, and highlight upcoming due invoices.
  - Add onboarding checklist card with progress.
- **Contacts (`src/app/(dashboard)/contacts/page.tsx`)**
  - Upgrade filter panel into collapsible side drawer with multi-select tags, quick segments (Top customers). Show avatars/company logos.
  - Use skeleton loaders during server actions. Provide inline “Send email/Create invoice” quick actions.
- **E-Invoices (`src/app/(dashboard)/e-invoices/new/page.tsx`)**
  - Convert long single form into multi-step composer with sticky summary sidebar, autosave drafts, product picker modal, inline validation hints.
  - Provide PDF preview and send schedule controls in footer.
- **Products/Settings pages**
  - Align forms with cards, add inline help tooltips (e.g., VAT category), use segmented tabs for General/Bank/Compliance.

## 5. Feedback & Micro-interactions
- Add global toast/snackbar system (success/error/neutral). Use optimistic updates with skeletons for list fetches.
- Replace default browser confirms (e.g., delete contact) with modal component using animations.
- Introduce progress indicators for long-running tasks (sending invoice, uploading attachment).

## 6. Mobile-specific Enhancements
- Add viewport-safe areas, sticky action bars, and bottom navigation for core modules on phones.
- Support swipe gestures for list actions (e.g., swipe contact card to reveal Edit/Delete).
- Ensure form controls have minimum 44px targets and auto-capitalize settings (name vs email).

## 7. Accessibility
- Continue work started earlier: ensure every form field has `aria-*`, implement focus outlines consistent with brand, and deliver keyboard-friendly modals.
- Provide high-contrast theme toggle; respect prefers-color-scheme.

## 8. Implementation Plan (High-Level)
1. Design system sprint: define tokens, components (header, sidebar, cards, buttons, inputs, nav).
2. Shell refactor: swap in new Header/Sidebar with responsive behaviors + mobile nav.
3. Page-by-page polish: start with Dashboard, Contacts, E-Invoices (list + composer), then Products/Settings.
4. Mobile QA pass: test breakpoints (320, 375, 768, 1024, 1440).
5. Add animation/micro-interactions + feedback layer.

This doc should help designers/developers collaborate on a cohesive refresh without waiting for a later audit. EOF
