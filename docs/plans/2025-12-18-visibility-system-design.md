# Visibility & Progressive Unlocking System

**Date:** 2025-12-18
**Status:** Approved
**Author:** Design session with user

---

## Problem Statement

The dashboard shows features irrelevant to certain business types (e.g., PDV to paušalni obrt) and doesn't guide new users through activation. Users are overwhelmed with options they can't use yet, and there's no gamification to drive engagement.

## Goals

1. **Hide irrelevant features** - Business-type-specific visibility (paušalni never sees PDV)
2. **Progressive unlocking** - Gate features until prerequisites are met (can't invoice without products)
3. **Gamification** - Guide users through activation with visible progress
4. **Competence-based UX** - Beginners get hand-holding, experts get everything immediately

---

## Target User Flows

### New Beginner User

```
Onboarding → Select "Početnik" → Dashboard (limited)
→ Add first customer → Unlock product creation
→ Add first product → Unlock invoice creation
→ Create first invoice → Unlock reports
→ Import statements → Unlock financial insights
```

### New Expert User

```
Onboarding → Select "Stručnjak" → Dashboard (full access)
```

### Existing User (Migration)

```
Has invoices? → Set to "average" (skip early steps)
No data? → Set to "beginner" (full progression)
```

---

## Architecture

### Approach: React Context + Hook

A `<VisibilityProvider>` wraps the dashboard, providing a `useVisibility()` hook that components use to check visibility and lock states.

**Why this approach:**

- Fits existing React/Next.js patterns
- Easy to add locked UI states with hints
- Matrix lives in code (version controlled, type-safe)
- Can migrate to database-driven later if needed

---

## Core Data Structures

### Element Registry

Every controllable UI element gets a unique ID:

```typescript
// src/lib/visibility/elements.ts
export const VISIBILITY_ELEMENTS = {
  // Dashboard cards
  "card:pausalni-status": { type: "card", label: "Paušalni status" },
  "card:vat-overview": { type: "card", label: "PDV pregled" },
  "card:doprinosi": { type: "card", label: "Doprinosi" },
  "card:corporate-tax": { type: "card", label: "Porez na dobit" },
  "card:invoice-funnel": { type: "card", label: "Status faktura" },
  "card:revenue-trend": { type: "card", label: "Trend prihoda" },
  "card:cash-flow": { type: "card", label: "Novčani tok" },
  "card:insights": { type: "card", label: "Uvidi" },
  "card:posd-reminder": { type: "card", label: "PO-SD podsjetnik" },
  "card:advanced-insights": { type: "card", label: "Napredni uvidi" },

  // Navigation items
  "nav:vat": { type: "nav", label: "PDV", path: "/vat" },
  "nav:reports": { type: "nav", label: "Izvještaji", path: "/reports" },
  "nav:doprinosi": { type: "nav", label: "Doprinosi", path: "/doprinosi" },
  "nav:corporate-tax": { type: "nav", label: "Porez na dobit", path: "/corporate-tax" },
  "nav:api-settings": { type: "nav", label: "API postavke", path: "/settings/api" },

  // Actions
  "action:create-invoice": { type: "action", label: "Nova faktura" },
  "action:create-contact": { type: "action", label: "Novi kontakt" },
  "action:create-product": { type: "action", label: "Novi proizvod" },

  // Pages (for route protection)
  "page:vat": { type: "page", path: "/vat" },
  "page:reports": { type: "page", path: "/reports" },
  "page:pos": { type: "page", path: "/pos" },
} as const

export type ElementId = keyof typeof VISIBILITY_ELEMENTS
```

### Progression Stages

```typescript
export type ProgressionStage =
  | "onboarding" // Not yet completed
  | "needs-customer" // Onboarding done, no contacts
  | "needs-product" // Has contacts, no products
  | "needs-invoice" // Has products, no invoices
  | "needs-statements" // Has invoices, no bank data
  | "complete" // Fully activated
```

### Competence Levels

```typescript
export type CompetenceLevel = "beginner" | "average" | "pro"
```

---

## Visibility Rules

### Business Type Matrix

Elements completely hidden based on legal form:

```typescript
// src/lib/visibility/rules.ts
export const BUSINESS_TYPE_RULES: Record<LegalForm, ElementId[]> = {
  OBRT_PAUSAL: [
    "card:vat-overview",
    "nav:vat",
    "page:vat", // No PDV
    "card:corporate-tax",
    "nav:corporate-tax", // No porez na dobit
  ],
  OBRT_REAL: [
    "card:vat-overview",
    "nav:vat",
    "page:vat", // No PDV
    "card:pausalni-status", // Not paušalni
    "card:corporate-tax",
    "nav:corporate-tax",
  ],
  OBRT_VAT: [
    "card:pausalni-status", // Not paušalni
    "card:corporate-tax",
    "nav:corporate-tax",
  ],
  JDOO: [
    "card:pausalni-status", // Not paušalni
    "card:doprinosi",
    "nav:doprinosi", // No doprinosi
    "card:posd-reminder", // No PO-SD
  ],
  DOO: ["card:pausalni-status", "card:doprinosi", "nav:doprinosi", "card:posd-reminder"],
}
```

### Progression Rules

Elements locked until stage is reached:

```typescript
export const PROGRESSION_RULES: Record<
  ProgressionStage,
  {
    locked: ElementId[]
    unlockHint: string
  }
> = {
  onboarding: {
    locked: ["*"], // Everything locked
    unlockHint: "Dovršite registraciju",
  },
  "needs-customer": {
    locked: ["action:create-product", "action:create-invoice", "card:invoice-funnel"],
    unlockHint: "Dodajte prvog kupca",
  },
  "needs-product": {
    locked: ["action:create-invoice", "card:invoice-funnel"],
    unlockHint: "Dodajte prvi proizvod ili uslugu",
  },
  "needs-invoice": {
    locked: ["card:revenue-trend", "nav:reports", "page:reports"],
    unlockHint: "Kreirajte prvu fakturu",
  },
  "needs-statements": {
    locked: ["card:doprinosi", "card:cash-flow", "card:insights"],
    unlockHint: "Uvezite bankovne izvode",
  },
  complete: {
    locked: [],
    unlockHint: "",
  },
}
```

### Competence Level Overrides

Competence determines starting progression stage:

```typescript
export const COMPETENCE_STARTING_STAGE: Record<CompetenceLevel, ProgressionStage> = {
  beginner: "needs-customer", // Must go through all steps
  average: "needs-invoice", // Skips customer/product steps
  pro: "complete", // Everything unlocked immediately
}

export const COMPETENCE_HIDDEN_ELEMENTS: Record<CompetenceLevel, ElementId[]> = {
  beginner: [
    "card:advanced-insights", // Hide complex analytics
    "nav:api-settings", // Hide developer features
  ],
  average: ["nav:api-settings"],
  pro: [], // Sees everything
}

export function getEffectiveStage(
  actualProgress: ProgressionStage,
  competence: CompetenceLevel
): ProgressionStage {
  if (competence === "pro") return "complete"

  const stageOrder: ProgressionStage[] = [
    "onboarding",
    "needs-customer",
    "needs-product",
    "needs-invoice",
    "needs-statements",
    "complete",
  ]

  const actualIndex = stageOrder.indexOf(actualProgress)
  const startingIndex = stageOrder.indexOf(COMPETENCE_STARTING_STAGE[competence])

  return stageOrder[Math.max(actualIndex, startingIndex)]
}
```

---

## React Context & Hook

### Provider

```typescript
// src/lib/visibility/context.tsx
'use client'

import { createContext, useContext, useMemo } from 'react'
import type { Company } from '@prisma/client'
import type { ElementId, ProgressionStage, CompetenceLevel } from './rules'

interface VisibilityState {
  company: Company
  competence: CompetenceLevel
  actualStage: ProgressionStage
  effectiveStage: ProgressionStage
}

interface VisibilityContextValue {
  isVisible: (id: ElementId) => boolean
  isLocked: (id: ElementId) => boolean
  getUnlockHint: (id: ElementId) => string | null
  state: VisibilityState
}

const VisibilityContext = createContext<VisibilityContextValue | null>(null)

export function VisibilityProvider({
  children,
  company,
  competence,
  counts,
}: {
  children: React.ReactNode
  company: Company
  competence: CompetenceLevel
  counts: { contacts: number; products: number; invoices: number; statements: number }
}) {
  const value = useMemo(() => {
    const actualStage = calculateStage(counts)
    const effectiveStage = getEffectiveStage(actualStage, competence)

    return {
      isVisible: (id) => !isHiddenByBusinessType(id, company.legalForm)
                       && !isHiddenByCompetence(id, competence),
      isLocked: (id) => isLockedByProgression(id, effectiveStage),
      getUnlockHint: (id) => getHintForElement(id, effectiveStage),
      state: { company, competence, actualStage, effectiveStage },
    }
  }, [company, competence, counts])

  return (
    <VisibilityContext.Provider value={value}>
      {children}
    </VisibilityContext.Provider>
  )
}

export function useVisibility() {
  const ctx = useContext(VisibilityContext)
  if (!ctx) throw new Error('useVisibility must be used within VisibilityProvider')
  return ctx
}
```

---

## Helper Components

### Visible Wrapper

Handles both hidden and locked states:

```typescript
// src/lib/visibility/components.tsx
'use client'

import { useVisibility } from './context'
import type { ElementId } from './rules'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VisibleProps {
  id: ElementId
  children: React.ReactNode
  lockedFallback?: React.ReactNode
}

export function Visible({ id, children, lockedFallback }: VisibleProps) {
  const { isVisible, isLocked, getUnlockHint } = useVisibility()

  if (!isVisible(id)) return null

  if (isLocked(id)) {
    const hint = getUnlockHint(id)

    if (lockedFallback) return <>{lockedFallback}</>

    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]/80 rounded-lg backdrop-blur-sm">
          <div className="text-center p-4">
            <Lock className="h-6 w-6 mx-auto mb-2 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">{hint}</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

### Navigation Item Wrapper

```typescript
interface NavItemProps {
  id: ElementId
  href: string
  icon: React.ReactNode
  label: string
}

export function VisibleNavItem({ id, href, icon, label }: NavItemProps) {
  const { isVisible, isLocked, getUnlockHint } = useVisibility()

  if (!isVisible(id)) return null

  const locked = isLocked(id)
  const hint = getUnlockHint(id)

  if (locked) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 text-[var(--muted)] cursor-not-allowed"
        title={hint || undefined}
      >
        <span className="opacity-40">{icon}</span>
        <span className="opacity-40">{label}</span>
        <Lock className="h-3 w-3 ml-auto" />
      </div>
    )
  }

  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-secondary)]">
      {icon}
      <span>{label}</span>
    </Link>
  )
}
```

### Action Button Wrapper

```typescript
interface VisibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: ElementId
  children: React.ReactNode
}

export function VisibleButton({ id, children, className, ...props }: VisibleButtonProps) {
  const { isVisible, isLocked, getUnlockHint } = useVisibility()

  if (!isVisible(id)) return null

  const locked = isLocked(id)
  const hint = getUnlockHint(id)

  return (
    <Button
      {...props}
      disabled={locked || props.disabled}
      className={cn(className, locked && 'opacity-50')}
      title={locked ? hint || undefined : props.title}
    >
      {children}
      {locked && <Lock className="h-3 w-3 ml-2" />}
    </Button>
  )
}
```

---

## Integration Points

### Dashboard Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { VisibilityProvider } from '@/lib/visibility/context'

export default async function DashboardLayout({ children }) {
  const session = await auth()
  const company = await db.company.findFirst({
    where: { users: { some: { userId: session.user.id } } }
  })

  const [contacts, products, invoices, statements] = await Promise.all([
    db.contact.count({ where: { companyId: company.id } }),
    db.product.count({ where: { companyId: company.id } }),
    db.eInvoice.count({ where: { companyId: company.id } }),
    db.bankTransaction.count({ where: { companyId: company.id } }),
  ])

  const preferences = await getGuidancePreferences(session.user.id)

  return (
    <VisibilityProvider
      company={company}
      competence={preferences?.competenceLevel || 'beginner'}
      counts={{ contacts, products, invoices, statements }}
    >
      <DashboardShell>{children}</DashboardShell>
    </VisibilityProvider>
  )
}
```

### Dashboard Cards

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { Visible } from "@/lib/visibility/components"

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <Visible id="card:pausalni-status">
        <PausalniStatusCard />
      </Visible>

      <Visible id="card:vat-overview">
        <VatOverviewCard />
      </Visible>

      <Visible id="card:revenue-trend">
        <RevenueTrendCard data={revenueTrend} />
      </Visible>

      <Visible id="card:doprinosi">
        <DoprinosiCard />
      </Visible>
    </div>
  )
}
```

### Route Protection

```typescript
// src/middleware.ts
import { getVisibilityForRequest } from "@/lib/visibility/server"

const PROTECTED_ROUTES: Record<string, ElementId> = {
  "/vat": "page:vat",
  "/reports": "page:reports",
  "/pos": "page:pos",
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const elementId = PROTECTED_ROUTES[pathname]

  if (elementId) {
    const visibility = await getVisibilityForRequest(request)

    if (!visibility.isVisible(elementId)) {
      return NextResponse.redirect(new URL("/dashboard?blocked=feature-unavailable", request.url))
    }

    if (visibility.isLocked(elementId)) {
      const hint = visibility.getUnlockHint(elementId)
      return NextResponse.redirect(
        new URL(`/dashboard?locked=${encodeURIComponent(hint)}`, request.url)
      )
    }
  }

  return NextResponse.next()
}
```

---

## Onboarding Integration

### New Competence Selection Step

Add as Step 2 in onboarding wizard:

```typescript
// src/components/onboarding/step-competence.tsx
const COMPETENCE_OPTIONS = [
  {
    value: "beginner",
    label: "Početnik",
    description: "Tek započinjem s fakturiranjem. Trebam vodstvo korak po korak.",
    icon: Sparkles,
    benefits: ["Vodstvo kroz svaki korak", "Detaljne upute", "Postupno otključavanje značajki"],
  },
  {
    value: "average",
    label: "Iskusan",
    description: "Imam iskustva s fakturiranjem. Razumijem osnove.",
    icon: TrendingUp,
    benefits: ["Preskočite osnovne korake", "Direktan pristup fakturama", "Umjerene upute"],
  },
  {
    value: "pro",
    label: "Stručnjak",
    description: "Profesionalac sam. Želim sve značajke odmah.",
    icon: Zap,
    benefits: ["Sve otključano odmah", "Bez ograničenja", "Napredne postavke vidljive"],
  },
]
```

### Updated Flow

```
Step 1: Basic Info (name, OIB, legal form)
Step 2: Competence Level (NEW)
Step 3: Address
Step 4: Contact & Tax Info → Complete
```

---

## Gamification Components

### Progression Tracker

Shows users their progress:

```typescript
// src/components/dashboard/progression-tracker.tsx
const STAGES = [
  { id: "onboarding", label: "Registracija", icon: "📝" },
  { id: "needs-customer", label: "Prvi kupac", icon: "👤" },
  { id: "needs-product", label: "Prvi proizvod", icon: "📦" },
  { id: "needs-invoice", label: "Prva faktura", icon: "🧾" },
  { id: "needs-statements", label: "Bankovni izvodi", icon: "🏦" },
  { id: "complete", label: "Sve otključano", icon: "🎉" },
]

export function ProgressionTracker() {
  const { state } = useVisibility()

  // Pro users don't need this
  if (state.competence === "pro") return null

  // Render progress bar + stage list
}
```

### Next Step CTA

Prominent call-to-action for current step:

```typescript
// src/components/dashboard/next-step-cta.tsx
const NEXT_ACTIONS = {
  "needs-customer": { href: "/contacts/new", label: "Dodaj prvog kupca", icon: "👤" },
  "needs-product": { href: "/products/new", label: "Dodaj prvi proizvod", icon: "📦" },
  "needs-invoice": { href: "/invoices/new", label: "Kreiraj prvu fakturu", icon: "🧾" },
  "needs-statements": { href: "/bank/import", label: "Uvezi bankovne izvode", icon: "🏦" },
}
```

---

## File Summary

### New Files

| File                                               | Purpose                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| `src/lib/visibility/elements.ts`                   | Element registry with all IDs                      |
| `src/lib/visibility/rules.ts`                      | Business type matrix + progression rules           |
| `src/lib/visibility/context.tsx`                   | React Context + Provider                           |
| `src/lib/visibility/components.tsx`                | `<Visible>`, `<VisibleNavItem>`, `<VisibleButton>` |
| `src/lib/visibility/server.ts`                     | Server-side visibility for middleware              |
| `src/lib/visibility/index.ts`                      | Public exports                                     |
| `src/components/onboarding/step-competence.tsx`    | Competence selection step                          |
| `src/components/dashboard/progression-tracker.tsx` | Progress indicator                                 |
| `src/components/dashboard/next-step-cta.tsx`       | Next step call-to-action                           |

### Files to Modify

| File                                     | Changes                                   |
| ---------------------------------------- | ----------------------------------------- |
| `src/app/(dashboard)/layout.tsx`         | Wrap with `<VisibilityProvider>`          |
| `src/app/(dashboard)/dashboard/page.tsx` | Wrap cards with `<Visible>`               |
| `src/components/layout/sidebar.tsx`      | Replace nav items with `<VisibleNavItem>` |
| `src/components/onboarding/wizard.tsx`   | Add Step 2 (competence)                   |
| `src/lib/stores/onboarding-store.ts`     | Add `competence` field                    |
| `src/middleware.ts`                      | Add route protection logic                |

---

## Migration Strategy

### Phase 1: Infrastructure (no user impact)

- Create visibility library
- Add competence step to onboarding (new users only)
- Set existing users to 'average' by default

### Phase 2: Dashboard cards

- Wrap all dashboard cards with `<Visible>`
- Test with internal users

### Phase 3: Navigation & actions

- Update sidebar navigation
- Update action buttons

### Phase 4: Route protection

- Add middleware protection
- Add redirect messages

### Existing User Migration

```typescript
async function migrateExistingUsers() {
  const users = await db.user.findMany({
    include: { companies: { include: { _count: { select: { eInvoices: true } } } } },
  })

  for (const user of users) {
    const hasInvoices = user.companies.some((c) => c._count.eInvoices > 0)
    await updateGuidancePreferences(user.id, {
      competenceLevel: hasInvoices ? "average" : "beginner",
    })
  }
}
```

---

## Security Considerations

- Route protection in middleware prevents direct URL access
- Server-side visibility check ensures API endpoints respect rules
- Business type rules are enforced server-side, not just UI

---

## Future Enhancements

- Admin UI to configure visibility rules without code changes
- A/B testing different progression sequences
- Analytics on conversion rates per stage
- Custom rules per subscription tier
