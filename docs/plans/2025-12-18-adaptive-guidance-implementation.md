# Adaptive Guidance System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an adaptive guidance system that helps users based on their competence level, featuring a monthly "What to do" checklist as the killer feature.

**Architecture:** 3×3 competence model (Beginner/Average/Pro × Fakturiranje/Financije/EU). Checklist aggregates from deadlines, obligations, pending actions, onboarding gaps, and seasonal tasks. User preferences stored in Drizzle tables, UI adapts based on level.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (new tables), Prisma (existing models), React Server Components, Tailwind CSS, CVA design system.

**Related Docs:**

- Design: `docs/plans/2025-12-18-adaptive-guidance-system-design.md`
- Schema: `src/lib/db/schema/guidance.ts`
- Services: `src/lib/guidance/`

---

## Phase 1: Foundation

### Task 1.1: Generate Database Migration

**Files:**

- Verify: `src/lib/db/schema/guidance.ts`
- Verify: `src/lib/db/schema/index.ts`
- Create: `drizzle/0006_guidance_tables.sql`

**Step 1: Verify schema exports**

Check that guidance schema is exported in index:

```bash
cat src/lib/db/schema/index.ts
```

Expected: Contains `export * from "./guidance"`

**Step 2: Generate Drizzle migration**

```bash
npm run db:generate
```

Expected: Creates new migration file in `drizzle/` directory

**Step 3: Verify migration SQL**

```bash
cat drizzle/0006_*.sql
```

Expected: Contains CREATE TABLE for `user_guidance_preferences` and `checklist_interactions`

**Step 4: Commit migration**

```bash
git add drizzle/ src/lib/db/schema/
git commit -m "feat(guidance): add database schema for guidance system"
```

---

### Task 1.2: Write Tests for Preferences Service

**Files:**

- Create: `src/lib/guidance/__tests__/preferences.test.ts`
- Reference: `src/lib/guidance/preferences.ts`

**Step 1: Create test file with basic tests**

```typescript
// src/lib/guidance/__tests__/preferences.test.ts
import { describe, it, beforeEach, mock } from "node:test"
import assert from "node:assert"
import {
  COMPETENCE_LEVELS,
  GUIDANCE_CATEGORIES,
  getEffectiveLevel,
  shouldShowGuidance,
  getNotificationDays,
  LEVEL_LABELS,
} from "../preferences"

describe("Guidance Preferences", () => {
  describe("getEffectiveLevel", () => {
    it("returns category-specific level when no global override", () => {
      const prefs = {
        id: "1",
        userId: "user1",
        levelFakturiranje: "pro",
        levelFinancije: "beginner",
        levelEu: "average",
        globalLevel: null,
        emailDigest: "weekly",
        pushEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      assert.strictEqual(getEffectiveLevel(prefs, "fakturiranje"), "pro")
      assert.strictEqual(getEffectiveLevel(prefs, "financije"), "beginner")
      assert.strictEqual(getEffectiveLevel(prefs, "eu"), "average")
    })

    it("returns global level when set", () => {
      const prefs = {
        id: "1",
        userId: "user1",
        levelFakturiranje: "pro",
        levelFinancije: "beginner",
        levelEu: "average",
        globalLevel: "average",
        emailDigest: "weekly",
        pushEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      assert.strictEqual(getEffectiveLevel(prefs, "fakturiranje"), "average")
      assert.strictEqual(getEffectiveLevel(prefs, "financije"), "average")
      assert.strictEqual(getEffectiveLevel(prefs, "eu"), "average")
    })
  })

  describe("shouldShowGuidance", () => {
    const makePrefs = (level: string) => ({
      id: "1",
      userId: "user1",
      levelFakturiranje: level,
      levelFinancije: level,
      levelEu: level,
      globalLevel: null,
      emailDigest: "weekly",
      pushEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    it("beginners see all guidance types", () => {
      const prefs = makePrefs("beginner")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "detailed_help"), true)
    })

    it("average users don't see constant tooltips", () => {
      const prefs = makePrefs("average")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
    })

    it("pro users only see notifications", () => {
      const prefs = makePrefs("pro")
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "tooltip"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "wizard"), false)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "notification"), true)
      assert.strictEqual(shouldShowGuidance(prefs, "fakturiranje", "detailed_help"), false)
    })
  })

  describe("getNotificationDays", () => {
    it("beginners get all reminder days", () => {
      const days = getNotificationDays("beginner")
      assert.deepStrictEqual(days, [7, 3, 1, 0])
    })

    it("average users get fewer reminders", () => {
      const days = getNotificationDays("average")
      assert.deepStrictEqual(days, [3, 1, 0])
    })

    it("pro users get minimal reminders", () => {
      const days = getNotificationDays("pro")
      assert.deepStrictEqual(days, [1, 0])
    })
  })

  describe("constants", () => {
    it("has all competence levels", () => {
      assert.strictEqual(COMPETENCE_LEVELS.BEGINNER, "beginner")
      assert.strictEqual(COMPETENCE_LEVELS.AVERAGE, "average")
      assert.strictEqual(COMPETENCE_LEVELS.PRO, "pro")
    })

    it("has all guidance categories", () => {
      assert.strictEqual(GUIDANCE_CATEGORIES.FAKTURIRANJE, "fakturiranje")
      assert.strictEqual(GUIDANCE_CATEGORIES.FINANCIJE, "financije")
      assert.strictEqual(GUIDANCE_CATEGORIES.EU, "eu")
    })

    it("has Croatian labels for all levels", () => {
      assert.strictEqual(LEVEL_LABELS.beginner, "Početnik")
      assert.strictEqual(LEVEL_LABELS.average, "Srednji")
      assert.strictEqual(LEVEL_LABELS.pro, "Profesionalac")
    })
  })
})
```

**Step 2: Run tests to verify they pass**

```bash
node --import tsx --test src/lib/guidance/__tests__/preferences.test.ts
```

Expected: All tests pass

**Step 3: Commit tests**

```bash
git add src/lib/guidance/__tests__/
git commit -m "test(guidance): add unit tests for preferences service"
```

---

### Task 1.3: Write Tests for Checklist Service

**Files:**

- Create: `src/lib/guidance/__tests__/checklist.test.ts`
- Reference: `src/lib/guidance/checklist.ts`

**Step 1: Create test file for checklist utilities**

```typescript
// src/lib/guidance/__tests__/checklist.test.ts
import { describe, it } from "node:test"
import assert from "node:assert"
import { URGENCY_LEVELS, ACTION_TYPES, CHECKLIST_ITEM_TYPES } from "../checklist"

describe("Checklist Service", () => {
  describe("constants", () => {
    it("has all urgency levels", () => {
      assert.strictEqual(URGENCY_LEVELS.CRITICAL, "critical")
      assert.strictEqual(URGENCY_LEVELS.SOON, "soon")
      assert.strictEqual(URGENCY_LEVELS.UPCOMING, "upcoming")
      assert.strictEqual(URGENCY_LEVELS.OPTIONAL, "optional")
    })

    it("has all action types", () => {
      assert.strictEqual(ACTION_TYPES.LINK, "link")
      assert.strictEqual(ACTION_TYPES.WIZARD, "wizard")
      assert.strictEqual(ACTION_TYPES.QUICK_ACTION, "quick_action")
    })

    it("has all checklist item types from schema", () => {
      assert.strictEqual(CHECKLIST_ITEM_TYPES.DEADLINE, "deadline")
      assert.strictEqual(CHECKLIST_ITEM_TYPES.PAYMENT, "payment")
      assert.strictEqual(CHECKLIST_ITEM_TYPES.ACTION, "action")
      assert.strictEqual(CHECKLIST_ITEM_TYPES.ONBOARDING, "onboarding")
      assert.strictEqual(CHECKLIST_ITEM_TYPES.SEASONAL, "seasonal")
      assert.strictEqual(CHECKLIST_ITEM_TYPES.SUGGESTION, "suggestion")
    })
  })
})
```

**Step 2: Run tests**

```bash
node --import tsx --test src/lib/guidance/__tests__/checklist.test.ts
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/guidance/__tests__/
git commit -m "test(guidance): add unit tests for checklist service"
```

---

### Task 1.4: Verify API Endpoints

**Files:**

- Verify: `src/app/api/guidance/checklist/route.ts`
- Verify: `src/app/api/guidance/preferences/route.ts`

**Step 1: Check checklist API structure**

```bash
head -50 src/app/api/guidance/checklist/route.ts
```

Expected: Contains GET and POST handlers with auth checks

**Step 2: Check preferences API structure**

```bash
head -50 src/app/api/guidance/preferences/route.ts
```

Expected: Contains GET and PUT handlers with auth checks

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit src/app/api/guidance/checklist/route.ts src/app/api/guidance/preferences/route.ts 2>&1 | head -20
```

Expected: No type errors (or fix any that appear)

**Step 4: Commit any fixes**

```bash
git add src/app/api/guidance/
git commit -m "feat(guidance): add API endpoints for checklist and preferences"
```

---

### Task 1.5: Build Verification

**Step 1: Run full build**

```bash
npm run build 2>&1 | tail -50
```

Expected: Build succeeds without errors

**Step 2: Commit all Phase 1 work**

```bash
git add .
git commit -m "feat(guidance): complete Phase 1 foundation"
```

**Step 3: Push to trigger deployment**

```bash
git push origin main
```

---

## Phase 2: Core UI Components

### Task 2.1: Create Competence Selector Component

**Files:**

- Create: `src/components/guidance/CompetenceSelector.tsx`
- Reference: `src/lib/guidance/preferences.ts`

**Step 1: Create the component**

```typescript
// src/components/guidance/CompetenceSelector.tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  COMPETENCE_LEVELS,
  GUIDANCE_CATEGORIES,
  LEVEL_LABELS,
  LEVEL_DESCRIPTIONS,
  CATEGORY_LABELS,
  type CompetenceLevel,
  type GuidanceCategory,
} from "@/lib/guidance"

interface CompetenceSelectorProps {
  levels: {
    fakturiranje: CompetenceLevel
    financije: CompetenceLevel
    eu: CompetenceLevel
  }
  globalLevel?: CompetenceLevel | null
  onChange: (category: GuidanceCategory | "global", level: CompetenceLevel) => void
  variant?: "full" | "compact"
  className?: string
}

const levelColors: Record<CompetenceLevel, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  average: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pro: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

export function CompetenceSelector({
  levels,
  globalLevel,
  onChange,
  variant = "full",
  className,
}: CompetenceSelectorProps) {
  const categories = Object.values(GUIDANCE_CATEGORIES) as GuidanceCategory[]
  const allLevels = Object.values(COMPETENCE_LEVELS) as CompetenceLevel[]

  if (variant === "compact") {
    return (
      <div className={cn("flex gap-1", className)}>
        {allLevels.map((level) => (
          <button
            key={level}
            onClick={() => onChange("global", level)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all border",
              globalLevel === level
                ? levelColors[level]
                : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
            )}
          >
            {LEVEL_LABELS[level]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-sm text-white/60 mb-2">
        Odaberite razinu pomoći za svaku kategoriju:
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <label className="text-sm font-medium text-white/80">
            {CATEGORY_LABELS[category]}
          </label>
          <div className="flex gap-2">
            {allLevels.map((level) => {
              const isActive = globalLevel
                ? globalLevel === level
                : levels[category] === level

              return (
                <button
                  key={level}
                  onClick={() => onChange(category, level)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all border",
                    isActive
                      ? levelColors[level]
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                  )}
                >
                  {LEVEL_LABELS[level]}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-white/10">
        <div className="text-xs text-white/40">
          {globalLevel
            ? LEVEL_DESCRIPTIONS[globalLevel]
            : "Različite razine po kategoriji"}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create index export**

```typescript
// src/components/guidance/index.ts
export * from "./CompetenceSelector"
```

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit src/components/guidance/CompetenceSelector.tsx
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/components/guidance/
git commit -m "feat(guidance): add CompetenceSelector component"
```

---

### Task 2.2: Create Checklist Item Component

**Files:**

- Create: `src/components/guidance/ChecklistItem.tsx`
- Update: `src/components/guidance/index.ts`

**Step 1: Create the component**

```typescript
// src/components/guidance/ChecklistItem.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, X, Clock, ChevronRight, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/primitives/button"
import type { ChecklistItem as ChecklistItemType } from "@/lib/guidance"

interface ChecklistItemProps {
  item: ChecklistItemType
  onComplete?: (reference: string) => void
  onDismiss?: (reference: string) => void
  onSnooze?: (reference: string, until: Date) => void
  showActions?: boolean
  className?: string
}

const urgencyStyles = {
  critical: {
    icon: "🔴",
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-400",
  },
  soon: {
    icon: "🟡",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
  },
  upcoming: {
    icon: "🔵",
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-400",
  },
  optional: {
    icon: "⚪",
    bg: "bg-white/5 border-white/10",
    text: "text-white/60",
  },
}

function formatDueDate(date: Date): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)

  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return `Kasni ${Math.abs(daysUntil)} dana!`
  if (daysUntil === 0) return "Danas!"
  if (daysUntil === 1) return "Sutra"
  if (daysUntil <= 7) return `Za ${daysUntil} dana`
  return due.toLocaleDateString("hr-HR", { day: "numeric", month: "short" })
}

export function ChecklistItem({
  item,
  onComplete,
  onDismiss,
  onSnooze,
  showActions = true,
  className,
}: ChecklistItemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const style = urgencyStyles[item.urgency]

  const handleComplete = async () => {
    if (!onComplete) return
    setIsLoading(true)
    await onComplete(item.reference)
    setIsLoading(false)
  }

  const handleDismiss = async () => {
    if (!onDismiss) return
    setIsLoading(true)
    await onDismiss(item.reference)
    setIsLoading(false)
  }

  const content = (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-3 transition-all",
        style.bg,
        item.action.href && "hover:bg-white/5 cursor-pointer",
        className
      )}
    >
      <span className="text-lg mt-0.5">{style.icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-white">{item.title}</p>
            <p className="text-sm text-white/60 mt-0.5">{item.description}</p>
          </div>

          {item.dueDate && (
            <span className={cn("text-sm font-medium whitespace-nowrap", style.text)}>
              {formatDueDate(item.dueDate)}
            </span>
          )}
        </div>

        {showActions && (onComplete || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onComplete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault()
                  handleComplete()
                }}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Gotovo
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  handleDismiss()
                }}
                disabled={isLoading}
                className="h-7 text-xs text-white/40 hover:text-white/60"
              >
                <X className="h-3 w-3 mr-1" />
                Odbaci
              </Button>
            )}
          </div>
        )}
      </div>

      {item.action.href && (
        <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/60 transition-colors mt-0.5" />
      )}
    </div>
  )

  if (item.action.href) {
    return <Link href={item.action.href}>{content}</Link>
  }

  return content
}
```

**Step 2: Update index exports**

```typescript
// src/components/guidance/index.ts
export * from "./CompetenceSelector"
export * from "./ChecklistItem"
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit src/components/guidance/ChecklistItem.tsx
```

**Step 4: Commit**

```bash
git add src/components/guidance/
git commit -m "feat(guidance): add ChecklistItem component"
```

---

### Task 2.3: Create Dashboard Checklist Widget

**Files:**

- Create: `src/components/guidance/ChecklistWidget.tsx`
- Update: `src/components/guidance/index.ts`

**Step 1: Create the widget component**

```typescript
// src/components/guidance/ChecklistWidget.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ClipboardList, ChevronRight, Loader2 } from "lucide-react"
import { GlassCard } from "@/components/ui/patterns/GlassCard"
import { ChecklistItem } from "./ChecklistItem"
import type { ChecklistItem as ChecklistItemType } from "@/lib/guidance"

interface ChecklistWidgetProps {
  initialItems?: ChecklistItemType[]
  initialStats?: {
    total: number
    critical: number
    soon: number
    byCategory: Record<string, number>
  }
}

export function ChecklistWidget({ initialItems, initialStats }: ChecklistWidgetProps) {
  const [items, setItems] = useState<ChecklistItemType[]>(initialItems || [])
  const [stats, setStats] = useState(initialStats)
  const [isLoading, setIsLoading] = useState(!initialItems)

  useEffect(() => {
    if (initialItems) return

    async function fetchChecklist() {
      try {
        const res = await fetch("/api/guidance/checklist?limit=5")
        const data = await res.json()
        setItems(data.items || [])
        setStats(data.stats)
      } catch (error) {
        console.error("Failed to fetch checklist:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChecklist()
  }, [initialItems])

  const handleComplete = async (reference: string) => {
    const item = items.find((i) => i.reference === reference)
    if (!item) return

    try {
      await fetch("/api/guidance/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          itemType: item.type,
          itemReference: reference,
        }),
      })

      setItems((prev) => prev.filter((i) => i.reference !== reference))
    } catch (error) {
      console.error("Failed to complete item:", error)
    }
  }

  const handleDismiss = async (reference: string) => {
    const item = items.find((i) => i.reference === reference)
    if (!item) return

    try {
      await fetch("/api/guidance/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          itemType: item.type,
          itemReference: reference,
        }),
      })

      setItems((prev) => prev.filter((i) => i.reference !== reference))
    } catch (error) {
      console.error("Failed to dismiss item:", error)
    }
  }

  const currentMonth = new Date().toLocaleDateString("hr-HR", {
    month: "long",
    year: "numeric",
  })

  return (
    <GlassCard hover={false} padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Što moram napraviti?</h3>
        </div>
        <span className="text-sm text-white/50 capitalize">{currentMonth}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/60">Sve je odrađeno! 🎉</p>
          <p className="text-sm text-white/40 mt-1">Nema zadataka za ovaj mjesec</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {stats && stats.total > items.length && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link
            href="/checklist"
            className="flex items-center justify-between text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>
              Još {stats.total - items.length} zadatak
              {stats.total - items.length === 1 ? "" : "a"}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </GlassCard>
  )
}
```

**Step 2: Update exports**

Add to `src/components/guidance/index.ts`:

```typescript
export * from "./ChecklistWidget"
```

**Step 3: TypeScript check and commit**

```bash
npx tsc --noEmit src/components/guidance/ChecklistWidget.tsx
git add src/components/guidance/
git commit -m "feat(guidance): add ChecklistWidget for dashboard"
```

---

### Task 2.4: Add Checklist Widget to Dashboard

**Files:**

- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Import ChecklistWidget**

At the top of the file, add import:

```typescript
import { ChecklistWidget } from "@/components/guidance"
```

**Step 2: Add widget to dashboard layout**

Find the dashboard grid layout and add ChecklistWidget after HeroBanner, before TodayActionsCard:

```tsx
<div className="space-y-6">
  <HeroBanner ... />
  {company.legalForm === "OBRT_PAUSAL" && <ChecklistWidget />}
  <TodayActionsCard ... />
  ...
</div>
```

**Step 3: Build and verify**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(guidance): add ChecklistWidget to dashboard"
```

---

### Task 2.5: Create Dedicated Checklist Page

**Files:**

- Create: `src/app/(dashboard)/checklist/page.tsx`

**Step 1: Create the page**

```typescript
// src/app/(dashboard)/checklist/page.tsx
import { requireAuth, getCurrentCompany } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { getChecklist, getGuidancePreferences } from "@/lib/guidance"
import { ChecklistPageClient } from "./ChecklistPageClient"

export const metadata = {
  title: "Što moram napraviti? | FiskAI",
  description: "Mjesečni pregled svih zadataka i obveza",
}

export default async function ChecklistPage() {
  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)

  if (!company) {
    redirect("/onboarding")
  }

  // Map legalForm to businessType
  const businessTypeMap: Record<string, string> = {
    OBRT_PAUSAL: "pausalni",
    OBRT_REAL: "obrt",
    OBRT_VAT: "obrt",
    JDOO: "doo",
    DOO: "doo",
  }
  const businessType = businessTypeMap[company.legalForm || ""] || "all"

  const [checklistData, preferences] = await Promise.all([
    getChecklist({
      userId: user.id!,
      companyId: company.id,
      businessType,
      limit: 50,
    }),
    getGuidancePreferences(user.id!),
  ])

  return (
    <ChecklistPageClient
      initialItems={checklistData.items}
      initialStats={checklistData.stats}
      preferences={preferences}
      companyName={company.name}
    />
  )
}
```

**Step 2: Create client component**

```typescript
// src/app/(dashboard)/checklist/ChecklistPageClient.tsx
"use client"

import { useState } from "react"
import { ClipboardList, Filter, CheckCircle2 } from "lucide-react"
import { GlassCard } from "@/components/ui/patterns/GlassCard"
import { ChecklistItem, CompetenceSelector } from "@/components/guidance"
import { Button } from "@/components/ui/primitives/button"
import type { ChecklistItem as ChecklistItemType, UserGuidancePreferences } from "@/lib/guidance"
import { CATEGORY_LABELS, type GuidanceCategory } from "@/lib/guidance"

interface Props {
  initialItems: ChecklistItemType[]
  initialStats: {
    total: number
    critical: number
    soon: number
    upcoming: number
    optional: number
    byCategory: Record<GuidanceCategory, number>
  }
  preferences: UserGuidancePreferences
  companyName: string
}

export function ChecklistPageClient({
  initialItems,
  initialStats,
  preferences,
  companyName,
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [stats, setStats] = useState(initialStats)
  const [filter, setFilter] = useState<GuidanceCategory | "all">("all")
  const [showCompleted, setShowCompleted] = useState(false)

  const filteredItems = items.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false
    return true
  })

  const handleComplete = async (reference: string) => {
    const item = items.find((i) => i.reference === reference)
    if (!item) return

    try {
      await fetch("/api/guidance/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          itemType: item.type,
          itemReference: reference,
        }),
      })

      setItems((prev) => prev.filter((i) => i.reference !== reference))
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        [item.urgency]: prev[item.urgency as keyof typeof prev] as number - 1,
      }))
    } catch (error) {
      console.error("Failed to complete item:", error)
    }
  }

  const handleDismiss = async (reference: string) => {
    const item = items.find((i) => i.reference === reference)
    if (!item) return

    try {
      await fetch("/api/guidance/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          itemType: item.type,
          itemReference: reference,
        }),
      })

      setItems((prev) => prev.filter((i) => i.reference !== reference))
    } catch (error) {
      console.error("Failed to dismiss item:", error)
    }
  }

  const currentMonth = new Date().toLocaleDateString("hr-HR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-cyan-400" />
          Što moram napraviti?
        </h1>
        <p className="text-white/60 mt-1">
          {companyName} • <span className="capitalize">{currentMonth}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard hover={false} padding="sm">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-white/60">Ukupno zadataka</div>
        </GlassCard>
        <GlassCard hover={false} padding="sm">
          <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
          <div className="text-sm text-white/60">Kritično</div>
        </GlassCard>
        <GlassCard hover={false} padding="sm">
          <div className="text-2xl font-bold text-amber-400">{stats.soon}</div>
          <div className="text-sm text-white/60">Uskoro</div>
        </GlassCard>
        <GlassCard hover={false} padding="sm">
          <div className="text-2xl font-bold text-emerald-400">
            {initialStats.total - stats.total}
          </div>
          <div className="text-sm text-white/60">Dovršeno</div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Sve ({stats.total})
        </Button>
        {(Object.keys(stats.byCategory) as GuidanceCategory[]).map((cat) => (
          <Button
            key={cat}
            variant={filter === cat ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_LABELS[cat]} ({stats.byCategory[cat]})
          </Button>
        ))}
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <GlassCard hover={false} padding="lg">
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Sve je odrađeno!</p>
            <p className="text-white/60 mt-1">
              {filter === "all"
                ? "Nema zadataka za ovaj mjesec"
                : `Nema zadataka u kategoriji ${CATEGORY_LABELS[filter]}`}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: TypeScript check and commit**

```bash
npx tsc --noEmit src/app/\(dashboard\)/checklist/
git add src/app/\(dashboard\)/checklist/
git commit -m "feat(guidance): add dedicated checklist page"
```

---

### Task 2.6: Add Settings Page Section

**Files:**

- Create: `src/app/(dashboard)/settings/guidance/page.tsx`
- Or modify existing settings page to include guidance section

**Step 1: Create settings guidance page**

```typescript
// src/app/(dashboard)/settings/guidance/page.tsx
import { requireAuth } from "@/lib/auth-utils"
import { getGuidancePreferences } from "@/lib/guidance"
import { GuidanceSettingsClient } from "./GuidanceSettingsClient"

export const metadata = {
  title: "Postavke pomoći | FiskAI",
  description: "Konfigurirajte razinu pomoći i obavijesti",
}

export default async function GuidanceSettingsPage() {
  const user = await requireAuth()
  const preferences = await getGuidancePreferences(user.id!)

  return <GuidanceSettingsClient initialPreferences={preferences} />
}
```

**Step 2: Create client component**

```typescript
// src/app/(dashboard)/settings/guidance/GuidanceSettingsClient.tsx
"use client"

import { useState } from "react"
import { Save, Loader2 } from "lucide-react"
import { GlassCard } from "@/components/ui/patterns/GlassCard"
import { CompetenceSelector } from "@/components/guidance"
import { Button } from "@/components/ui/primitives/button"
import {
  type UserGuidancePreferences,
  type CompetenceLevel,
  type GuidanceCategory,
  LEVEL_DESCRIPTIONS,
} from "@/lib/guidance"

interface Props {
  initialPreferences: UserGuidancePreferences
}

export function GuidanceSettingsClient({ initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleLevelChange = (category: GuidanceCategory | "global", level: CompetenceLevel) => {
    if (category === "global") {
      setPreferences((prev) => ({
        ...prev,
        globalLevel: level,
        levelFakturiranje: level,
        levelFinancije: level,
        levelEu: level,
      }))
    } else {
      setPreferences((prev) => ({
        ...prev,
        globalLevel: null,
        [`level${category.charAt(0).toUpperCase() + category.slice(1)}`]: level,
      }))
    }
    setSaved(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/guidance/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelFakturiranje: preferences.levelFakturiranje,
          levelFinancije: preferences.levelFinancije,
          levelEu: preferences.levelEu,
          globalLevel: preferences.globalLevel,
          emailDigest: preferences.emailDigest,
          pushEnabled: preferences.pushEnabled,
        }),
      })
      setSaved(true)
    } catch (error) {
      console.error("Failed to save preferences:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Postavke pomoći</h1>
        <p className="text-white/60 mt-1">
          Prilagodite razinu pomoći i vodiča prema vašem iskustvu
        </p>
      </div>

      <GlassCard hover={false} padding="lg">
        <h2 className="text-lg font-semibold text-white mb-4">Razina iskustva</h2>

        <CompetenceSelector
          levels={{
            fakturiranje: preferences.levelFakturiranje as CompetenceLevel,
            financije: preferences.levelFinancije as CompetenceLevel,
            eu: preferences.levelEu as CompetenceLevel,
          }}
          globalLevel={preferences.globalLevel as CompetenceLevel | null}
          onChange={handleLevelChange}
        />
      </GlassCard>

      <GlassCard hover={false} padding="lg">
        <h2 className="text-lg font-semibold text-white mb-4">Obavijesti</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80">Email podsjetnici</label>
            <select
              value={preferences.emailDigest || "weekly"}
              onChange={(e) => {
                setPreferences((prev) => ({ ...prev, emailDigest: e.target.value }))
                setSaved(false)
              }}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
            >
              <option value="daily">Dnevno</option>
              <option value="weekly">Tjedno</option>
              <option value="none">Isključeno</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white/80">Push obavijesti</label>
              <p className="text-xs text-white/50">Primaj obavijesti u pregledniku</p>
            </div>
            <button
              onClick={() => {
                setPreferences((prev) => ({ ...prev, pushEnabled: !prev.pushEnabled }))
                setSaved(false)
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.pushEnabled ? "bg-cyan-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  preferences.pushEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || saved}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Spremam...
            </>
          ) : saved ? (
            "Spremljeno ✓"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spremi postavke
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
```

**Step 3: TypeScript check and commit**

```bash
mkdir -p src/app/\(dashboard\)/settings/guidance
npx tsc --noEmit
git add src/app/\(dashboard\)/settings/guidance/
git commit -m "feat(guidance): add settings page for guidance preferences"
```

---

## Phase 2 Completion

**Step 1: Build and verify**

```bash
npm run build
```

**Step 2: Final commit for Phase 2**

```bash
git add .
git commit -m "feat(guidance): complete Phase 2 - Core UI components"
git push origin main
```

---

## Phase 3-5: Future Implementation

Detailed plans for Phases 3-5 will be created when Phase 2 is complete:

- **Phase 3:** Mode Differentiation (tooltips, safety net, dense UI, keyboard shortcuts)
- **Phase 4:** Sidebar & Notifications (mini-view, notification center, email digests)
- **Phase 5:** Intelligence (smart suggestions, pattern detection, AI integration)

---

## Quick Reference

**Key files created:**

- Schema: `src/lib/db/schema/guidance.ts`
- Services: `src/lib/guidance/checklist.ts`, `src/lib/guidance/preferences.ts`
- API: `src/app/api/guidance/checklist/route.ts`, `src/app/api/guidance/preferences/route.ts`
- Components: `src/components/guidance/CompetenceSelector.tsx`, `ChecklistItem.tsx`, `ChecklistWidget.tsx`
- Pages: `src/app/(dashboard)/checklist/page.tsx`, `src/app/(dashboard)/settings/guidance/page.tsx`

**Run tests:**

```bash
node --import tsx --test src/lib/guidance/__tests__/*.test.ts
```

**Build:**

```bash
npm run build
```
