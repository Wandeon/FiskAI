# Paušalni Launch-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make FiskAI ready for first Paušalni Obrt customers with complete onboarding, guidance, compliance demonstration, and admin visibility.

**Architecture:** Build on existing systems (onboarding-store, guidance, visibility rules, fiscal-data). Add Step 5 to onboarding, create /compliance page, enhance admin dashboard. All fiscal values from centralized fiscal-data library.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma, Drizzle, Zustand, fiscal-data library

---

## Phase 1: Core Flows (Tasks 1-12)

### Task 1: Create Postal Code Data Library

**Files:**

- Create: `src/lib/fiscal-data/data/postal-codes.ts`
- Modify: `src/lib/fiscal-data/index.ts`
- Test: Manual verification with known postal codes

**Step 1: Create postal code data file**

```typescript
// src/lib/fiscal-data/data/postal-codes.ts

export interface PostalCodeData {
  postalCode: string
  city: string
  municipality: string
  county: string
  prirezRate: number // Surtax rate as decimal (e.g., 0.18 for 18%)
}

/**
 * Croatian postal codes with municipality and surtax data
 * Source: Official Croatian Post and Tax Authority
 */
export const POSTAL_CODES: PostalCodeData[] = [
  // Zagreb
  {
    postalCode: "10000",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18,
  },
  {
    postalCode: "10010",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18,
  },
  {
    postalCode: "10020",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18,
  },
  {
    postalCode: "10040",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18,
  },
  {
    postalCode: "10090",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18,
  },
  // Split
  {
    postalCode: "21000",
    city: "Split",
    municipality: "Grad Split",
    county: "Splitsko-dalmatinska",
    prirezRate: 0.15,
  },
  // Rijeka
  {
    postalCode: "51000",
    city: "Rijeka",
    municipality: "Grad Rijeka",
    county: "Primorsko-goranska",
    prirezRate: 0.15,
  },
  // Osijek
  {
    postalCode: "31000",
    city: "Osijek",
    municipality: "Grad Osijek",
    county: "Osječko-baranjska",
    prirezRate: 0.13,
  },
  // Zadar
  {
    postalCode: "23000",
    city: "Zadar",
    municipality: "Grad Zadar",
    county: "Zadarska",
    prirezRate: 0.12,
  },
  // Pula
  {
    postalCode: "52100",
    city: "Pula",
    municipality: "Grad Pula",
    county: "Istarska",
    prirezRate: 0.12,
  },
  // ... More postal codes will be added
]

/**
 * Lookup postal code data
 */
export function lookupPostalCode(postalCode: string): PostalCodeData | null {
  return POSTAL_CODES.find((p) => p.postalCode === postalCode) || null
}

/**
 * Get all counties (for dropdown fallback)
 */
export function getAllCounties(): string[] {
  const counties = new Set(POSTAL_CODES.map((p) => p.county))
  return Array.from(counties).sort()
}
```

**Step 2: Export from index**

Add to `src/lib/fiscal-data/index.ts`:

```typescript
export * from "./data/postal-codes"
```

**Step 3: Commit**

```bash
git add src/lib/fiscal-data/data/postal-codes.ts src/lib/fiscal-data/index.ts
git commit -m "feat(fiscal-data): add postal code lookup with municipality and surtax rates"
```

---

### Task 2: Add Paušalni Profile Fields to Onboarding Store

**Files:**

- Modify: `src/lib/stores/onboarding-store.ts`
- Modify: `src/app/actions/onboarding.ts`

**Step 1: Extend OnboardingData interface**

In `src/lib/stores/onboarding-store.ts`, add after line 29:

```typescript
// Step 5: Paušalni Profile (only for OBRT_PAUSAL)
acceptsCash: boolean
hasEmployees: boolean
employedElsewhere: boolean
hasEuVatId: boolean
taxBracket: number // 1-7
municipality: string
county: string
prirezRate: number
```

**Step 2: Update OnboardingStep type**

Change line 7 to:

```typescript
export type OnboardingStep = 1 | 2 | 3 | 4 | 5
```

**Step 3: Add Step 5 validation**

Add to `isStepValid` function after case 4:

```typescript
case 5:
  // Only required for paušalni
  if (data.legalForm !== "OBRT_PAUSAL") return true
  return !!(
    data.acceptsCash !== undefined &&
    data.hasEmployees !== undefined &&
    data.employedElsewhere !== undefined &&
    data.hasEuVatId !== undefined &&
    data.taxBracket &&
    data.taxBracket >= 1 &&
    data.taxBracket <= 7
  )
```

**Step 4: Update initial data**

```typescript
const initialData: Partial<OnboardingData> = {
  country: "HR",
  isVatPayer: false,
  acceptsCash: false,
  hasEmployees: false,
  employedElsewhere: false,
  hasEuVatId: false,
  taxBracket: 1,
  prirezRate: 0,
}
```

**Step 5: Commit**

```bash
git add src/lib/stores/onboarding-store.ts
git commit -m "feat(onboarding): add Step 5 paušalni profile fields to store"
```

---

### Task 3: Create Step 5 Paušalni Profile Component

**Files:**

- Create: `src/components/onboarding/step-pausalni-profile.tsx`

**Step 1: Create the component**

```typescript
// src/components/onboarding/step-pausalni-profile.tsx
"use client"

import { useEffect, useState } from "react"
import { useOnboardingStore } from "@/lib/stores/onboarding-store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import { lookupPostalCode } from "@/lib/fiscal-data"
import { TAX_RATES } from "@/lib/fiscal-data/data/tax-rates"
import { CONTRIBUTIONS } from "@/lib/fiscal-data/data/contributions"
import { CHAMBER_FEES } from "@/lib/fiscal-data/data/chamber-fees"
import { saveOnboardingData } from "@/app/actions/onboarding"
import { useRouter } from "next/navigation"

interface ObligationRow {
  label: string
  enabled: boolean
  annualAmount: number
  description: string
}

export function StepPausalniProfile() {
  const router = useRouter()
  const { data, updateData, setStep, isStepValid } = useOnboardingStore()
  const [isSaving, setIsSaving] = useState(false)

  // Auto-fill from postal code
  useEffect(() => {
    if (data.postalCode && data.postalCode.length === 5) {
      const postalData = lookupPostalCode(data.postalCode)
      if (postalData) {
        updateData({
          municipality: postalData.municipality,
          county: postalData.county,
          prirezRate: postalData.prirezRate,
        })
      }
    }
  }, [data.postalCode, updateData])

  // Calculate annual expenses based on selections
  const calculateObligations = (): ObligationRow[] => {
    const base = CONTRIBUTIONS.base.minimum
    const bracket = TAX_RATES.pausal.brackets.find(b => b.min <= 0 && data.taxBracket === 1)
      || TAX_RATES.pausal.brackets[Number(data.taxBracket) - 1]
    const quarterlyTax = bracket?.quarterlyTax || 50.85
    const annualTax = quarterlyTax * 4
    const prirezAmount = annualTax * (data.prirezRate || 0)

    return [
      {
        label: "MIO I (15%)",
        enabled: !data.employedElsewhere,
        annualAmount: data.employedElsewhere ? 0 : base * CONTRIBUTIONS.rates.MIO_I.rate * 12,
        description: "Mirovinsko osiguranje I. stup",
      },
      {
        label: "MIO II (5%)",
        enabled: !data.employedElsewhere,
        annualAmount: data.employedElsewhere ? 0 : base * CONTRIBUTIONS.rates.MIO_II.rate * 12,
        description: "Mirovinsko osiguranje II. stup",
      },
      {
        label: "HZZO (16.5%)",
        enabled: true,
        annualAmount: base * CONTRIBUTIONS.rates.HZZO.rate * 12,
        description: "Zdravstveno osiguranje",
      },
      {
        label: `Porez (razred ${data.taxBracket || 1})`,
        enabled: true,
        annualAmount: annualTax,
        description: `Paušalni porez na dohodak`,
      },
      {
        label: `Prirez (${((data.prirezRate || 0) * 100).toFixed(0)}%)`,
        enabled: (data.prirezRate || 0) > 0,
        annualAmount: prirezAmount,
        description: "Prirez porezu na dohodak",
      },
      {
        label: "HOK",
        enabled: true,
        annualAmount: CHAMBER_FEES.hok.annualFee,
        description: "Hrvatska obrtnička komora",
      },
    ]
  }

  const obligations = calculateObligations()
  const totalAnnual = obligations.filter(o => o.enabled).reduce((sum, o) => sum + o.annualAmount, 0)

  const handleBack = () => setStep(4)

  const handleComplete = async () => {
    if (!isStepValid(5)) return

    setIsSaving(true)
    try {
      await saveOnboardingData({
        ...data,
        hasCompletedOnboarding: true,
      })
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to complete onboarding:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paušalni profil</h2>
        <p className="text-sm text-muted-foreground">
          Konfigurirajte postavke specifične za paušalni obrt
        </p>
      </div>

      {/* Location Auto-fill */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lokacija</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Općina</Label>
              <p className="font-medium">{data.municipality || "—"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Županija</Label>
              <p className="font-medium">{data.county || "—"}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Stopa prireza</Label>
            <p className="font-medium">{((data.prirezRate || 0) * 100).toFixed(0)}%</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Automatski popunjeno iz poštanskog broja
          </p>
        </CardContent>
      </Card>

      {/* Situation Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Situacija</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Primate gotovinu ili kartice?</Label>
              <p className="text-xs text-muted-foreground">Zahtijeva FINA certifikat za fiskalizaciju</p>
            </div>
            <Switch
              checked={data.acceptsCash}
              onCheckedChange={(checked) => updateData({ acceptsCash: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Imate zaposlenike?</Label>
              <p className="text-xs text-muted-foreground">Potreban JOPPD modul</p>
            </div>
            <Switch
              checked={data.hasEmployees}
              onCheckedChange={(checked) => updateData({ hasEmployees: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Zaposleni ste kod drugog poslodavca?</Label>
              <p className="text-xs text-muted-foreground">MIO doprinosi se ne plaćaju dvostruko</p>
            </div>
            <Switch
              checked={data.employedElsewhere}
              onCheckedChange={(checked) => updateData({ employedElsewhere: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Imate EU PDV-ID broj?</Label>
              <p className="text-xs text-muted-foreground">Za reverse charge mehanizam</p>
            </div>
            <Switch
              checked={data.hasEuVatId}
              onCheckedChange={(checked) => updateData({ hasEuVatId: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Bracket Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Porezni razred</CardTitle>
          <p className="text-xs text-muted-foreground">Iz Rješenja Porezne uprave ili procjena</p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={String(data.taxBracket || 1)}
            onValueChange={(val) => updateData({ taxBracket: parseInt(val) })}
            className="space-y-2"
          >
            {TAX_RATES.pausal.brackets.map((bracket, idx) => (
              <div key={idx} className="flex items-center space-x-3 rounded-lg border p-3">
                <RadioGroupItem value={String(idx + 1)} id={`bracket-${idx}`} />
                <Label htmlFor={`bracket-${idx}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">Razred {idx + 1}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {bracket.min.toLocaleString()} - {bracket.max.toLocaleString()} EUR
                  </span>
                  <span className="ml-2 text-sm font-medium text-brand-600">
                    {bracket.quarterlyTax.toFixed(2)} EUR/kvartal
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Live Expense Preview */}
      <Card className="border-brand-200 bg-brand-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Godišnji pregled troškova</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {obligations.map((ob, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${ob.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className={ob.enabled ? "" : "text-muted-foreground line-through"}>
                    {ob.label}
                  </span>
                </div>
                <span className={`font-medium ${ob.enabled ? "" : "text-muted-foreground"}`}>
                  {ob.annualAmount.toFixed(2)} EUR
                </span>
              </div>
            ))}
            <div className="mt-3 border-t pt-3 flex items-center justify-between font-semibold">
              <span>Ukupno godišnje</span>
              <span className="text-brand-600">{totalAnnual.toFixed(2)} EUR</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Module Upsell */}
      <div className="rounded-lg border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4">
        <p className="text-sm">
          <span className="font-semibold">📈 FiskAI Pro:</span>{" "}
          Praćenje prihoda u realnom vremenu, projekcije razreda, optimizacija poreza
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Natrag
        </Button>
        <Button onClick={handleComplete} disabled={!isStepValid(5) || isSaving}>
          {isSaving ? "Spremanje..." : "Završi postavljanje"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/onboarding/step-pausalni-profile.tsx
git commit -m "feat(onboarding): create Step 5 paušalni profile component with expense calculator"
```

---

### Task 4: Integrate Step 5 into Onboarding Flow

**Files:**

- Modify: `src/app/(app)/onboarding/page.tsx`
- Modify: `src/components/onboarding/step-indicator.tsx`

**Step 1: Update onboarding page to include Step 5**

In `src/app/(app)/onboarding/page.tsx`, add import:

```typescript
import { StepPausalniProfile } from "@/components/onboarding/step-pausalni-profile"
```

Update `calculateOnboardingStep` function to handle Step 5:

```typescript
function calculateOnboardingStep(data: OnboardingData | null): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!data) return 1

  // ... existing steps 1-4 ...

  // Step 5: Paušalni Profile (only for OBRT_PAUSAL)
  if (data.legalForm === "OBRT_PAUSAL") {
    const step5Complete = !!(
      data.acceptsCash !== undefined &&
      data.hasEmployees !== undefined &&
      data.employedElsewhere !== undefined &&
      data.hasEuVatId !== undefined &&
      data.taxBracket
    )
    if (!step5Complete) return 5
  }

  return 6 // All complete
}
```

Add Step 5 rendering in the Card:

```typescript
{currentStep === 5 && <StepPausalniProfile />}
```

Update step count message:

```typescript
<p className="mt-2 text-gray-600">
  Postavite svoju tvrtku u {data.legalForm === "OBRT_PAUSAL" ? "5" : "4"} jednostavna koraka
</p>
```

**Step 2: Update step indicator for 5 steps**

In `src/components/onboarding/step-indicator.tsx`, update to handle 5 steps conditionally based on legal form.

**Step 3: Commit**

```bash
git add src/app/(app)/onboarding/page.tsx src/components/onboarding/step-indicator.tsx
git commit -m "feat(onboarding): integrate Step 5 paušalni profile into onboarding flow"
```

---

### Task 5: Create Tutorial Track Data Structure

**Files:**

- Create: `src/lib/tutorials/tracks.ts`
- Create: `src/lib/tutorials/types.ts`

**Step 1: Create types file**

```typescript
// src/lib/tutorials/types.ts

export interface TutorialTask {
  id: string
  title: string
  description?: string
  isOptional?: boolean
  href: string
  completionCheck?: (context: TutorialContext) => boolean
}

export interface TutorialDay {
  day: number
  title: string
  tasks: TutorialTask[]
}

export interface TutorialTrack {
  id: string
  name: string
  description: string
  targetLegalForm: string[]
  days: TutorialDay[]
}

export interface TutorialContext {
  contactsCount: number
  productsCount: number
  invoicesCount: number
  hasKprEntry: boolean
  hasPosdDraft: boolean
  hasCalendarReminder: boolean
}

export interface TutorialProgress {
  trackId: string
  completedTasks: string[]
  currentDay: number
  startedAt: Date
  lastActivityAt: Date
}
```

**Step 2: Create tracks file**

```typescript
// src/lib/tutorials/tracks.ts

import type { TutorialTrack } from "./types"

export const PAUSALNI_FIRST_WEEK: TutorialTrack = {
  id: "pausalni-first-week",
  name: "Paušalni First Week",
  description: "Naučite koristiti FiskAI u 5 dana",
  targetLegalForm: ["OBRT_PAUSAL"],
  days: [
    {
      day: 1,
      title: "Kontakti",
      tasks: [
        {
          id: "add-first-customer",
          title: "Dodaj prvog kupca",
          href: "/contacts/new",
          completionCheck: (ctx) => ctx.contactsCount >= 1,
        },
        {
          id: "understand-oib",
          title: "Razumij OIB validaciju",
          description: "OIB je 11-znamenkasti identifikacijski broj",
          href: "/vodici/oib-validacija",
        },
        {
          id: "import-csv",
          title: "Uvezi kontakte iz CSV",
          isOptional: true,
          href: "/contacts/import",
        },
      ],
    },
    {
      day: 2,
      title: "Proizvodi/Usluge",
      tasks: [
        {
          id: "add-first-product",
          title: "Dodaj svoju glavnu uslugu",
          href: "/products/new",
          completionCheck: (ctx) => ctx.productsCount >= 1,
        },
        {
          id: "set-price-vat",
          title: "Postavi cijenu i PDV status",
          description: "Paušalci ne naplaćuju PDV",
          href: "/products",
        },
        {
          id: "understand-no-vat",
          title: "Razumij 'bez PDV-a' za paušalce",
          href: "/vodici/pausalni-pdv",
        },
      ],
    },
    {
      day: 3,
      title: "Prvi račun",
      tasks: [
        {
          id: "create-first-invoice",
          title: "Kreiraj račun za kupca",
          href: "/invoices/new",
          completionCheck: (ctx) => ctx.invoicesCount >= 1,
        },
        {
          id: "preview-pdf",
          title: "Pregledaj PDF preview",
          href: "/invoices",
        },
        {
          id: "send-or-download",
          title: "Pošalji e-mailom ili preuzmi",
          href: "/invoices",
        },
        {
          id: "understand-kpr",
          title: "Razumij KPR unos",
          description: "Račun se automatski upisuje u Knjigu primitaka",
          href: "/vodici/kpr",
        },
      ],
    },
    {
      day: 4,
      title: "KPR i PO-SD",
      tasks: [
        {
          id: "open-kpr",
          title: "Otvori Knjiga primitaka",
          href: "/pausalni",
          completionCheck: (ctx) => ctx.hasKprEntry,
        },
        {
          id: "understand-60k",
          title: "Razumij running total vs 60k",
          description: "Limit za paušalni obrt je 60.000 EUR godišnje",
          href: "/vodici/pausalni-limit",
        },
        {
          id: "preview-posd",
          title: "Pregledaj PO-SD wizard",
          href: "/pausalni/po-sd",
        },
        {
          id: "set-reminder",
          title: "Postavi podsjetnik za 15.1.",
          description: "Rok za PO-SD je 15. siječnja",
          href: "/settings/reminders",
        },
      ],
    },
    {
      day: 5,
      title: "Doprinosi i rokovi",
      tasks: [
        {
          id: "view-calendar",
          title: "Pregledaj kalendar obveza",
          href: "/rokovi",
        },
        {
          id: "understand-contributions",
          title: "Razumij MIO/HZZO/HOK",
          href: "/vodici/doprinosi",
        },
        {
          id: "generate-payment",
          title: "Generiraj uplatnicu (Hub3)",
          href: "/pausalni/forms",
        },
        {
          id: "connect-google",
          title: "Poveži s Google kalendarom",
          isOptional: true,
          href: "/settings/integrations",
          completionCheck: (ctx) => ctx.hasCalendarReminder,
        },
      ],
    },
  ],
}

export const ALL_TRACKS = [PAUSALNI_FIRST_WEEK]

export function getTrackForLegalForm(legalForm: string): TutorialTrack | null {
  return ALL_TRACKS.find((track) => track.targetLegalForm.includes(legalForm)) || null
}
```

**Step 3: Commit**

```bash
git add src/lib/tutorials/types.ts src/lib/tutorials/tracks.ts
git commit -m "feat(tutorials): create tutorial track data structure with Paušalni First Week track"
```

---

### Task 6: Create Tutorial Progress Database Schema

**Files:**

- Create: `src/lib/db/schema/tutorials.ts`
- Modify: `src/lib/db/schema/index.ts`

**Step 1: Create tutorials schema**

```typescript
// src/lib/db/schema/tutorials.ts

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

export const tutorialProgress = pgTable(
  "tutorial_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    companyId: text("company_id").notNull(),
    trackId: text("track_id").notNull(),
    completedTasks: jsonb("completed_tasks").$type<string[]>().default([]),
    currentDay: text("current_day").default("1"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userCompanyIdx: index("tutorial_user_company_idx").on(table.userId, table.companyId),
    trackIdx: index("tutorial_track_idx").on(table.trackId),
  })
)
```

**Step 2: Export from schema index**

Add to `src/lib/db/schema/index.ts`:

```typescript
export * from "./tutorials"
```

**Step 3: Run migration**

```bash
npx drizzle-kit push
```

**Step 4: Commit**

```bash
git add src/lib/db/schema/tutorials.ts src/lib/db/schema/index.ts
git commit -m "feat(db): add tutorial progress schema"
```

---

### Task 7: Create Tutorial Progress Widget Component

**Files:**

- Create: `src/components/tutorials/tutorial-progress-widget.tsx`
- Create: `src/lib/tutorials/progress.ts`

**Step 1: Create progress functions**

```typescript
// src/lib/tutorials/progress.ts

import { drizzleDb } from "@/lib/db/drizzle"
import { tutorialProgress } from "@/lib/db/schema/tutorials"
import { eq, and } from "drizzle-orm"
import { getTrackForLegalForm } from "./tracks"
import type { TutorialProgress, TutorialContext, TutorialTrack } from "./types"

export async function getTutorialProgress(
  userId: string,
  companyId: string,
  trackId: string
): Promise<TutorialProgress | null> {
  const result = await drizzleDb
    .select()
    .from(tutorialProgress)
    .where(
      and(
        eq(tutorialProgress.userId, userId),
        eq(tutorialProgress.companyId, companyId),
        eq(tutorialProgress.trackId, trackId)
      )
    )
    .limit(1)

  if (!result[0]) return null

  return {
    trackId: result[0].trackId,
    completedTasks: (result[0].completedTasks as string[]) || [],
    currentDay: parseInt(result[0].currentDay || "1"),
    startedAt: result[0].startedAt,
    lastActivityAt: result[0].lastActivityAt,
  }
}

export async function initTutorialProgress(
  userId: string,
  companyId: string,
  trackId: string
): Promise<TutorialProgress> {
  const [result] = await drizzleDb
    .insert(tutorialProgress)
    .values({
      userId,
      companyId,
      trackId,
      completedTasks: [],
      currentDay: "1",
    })
    .returning()

  return {
    trackId: result.trackId,
    completedTasks: [],
    currentDay: 1,
    startedAt: result.startedAt,
    lastActivityAt: result.lastActivityAt,
  }
}

export async function markTaskComplete(
  userId: string,
  companyId: string,
  trackId: string,
  taskId: string
): Promise<void> {
  const existing = await getTutorialProgress(userId, companyId, trackId)

  if (!existing) {
    await initTutorialProgress(userId, companyId, trackId)
  }

  const currentTasks = existing?.completedTasks || []
  if (currentTasks.includes(taskId)) return

  await drizzleDb
    .update(tutorialProgress)
    .set({
      completedTasks: [...currentTasks, taskId],
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tutorialProgress.userId, userId),
        eq(tutorialProgress.companyId, companyId),
        eq(tutorialProgress.trackId, trackId)
      )
    )
}

export function calculateTrackProgress(
  track: TutorialTrack,
  completedTasks: string[]
): { completed: number; total: number; percentage: number } {
  const allTasks = track.days.flatMap((d) => d.tasks.filter((t) => !t.isOptional))
  const completed = allTasks.filter((t) => completedTasks.includes(t.id)).length
  const total = allTasks.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { completed, total, percentage }
}
```

**Step 2: Create widget component**

```typescript
// src/components/tutorials/tutorial-progress-widget.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { TutorialTrack, TutorialProgress } from "@/lib/tutorials/types"
import { calculateTrackProgress } from "@/lib/tutorials/progress"

interface TutorialProgressWidgetProps {
  track: TutorialTrack
  progress: TutorialProgress | null
}

export function TutorialProgressWidget({ track, progress }: TutorialProgressWidgetProps) {
  const completedTasks = progress?.completedTasks || []
  const stats = calculateTrackProgress(track, completedTasks)
  const currentDay = progress?.currentDay || 1
  const currentDayData = track.days.find((d) => d.day === currentDay) || track.days[0]

  // Find next incomplete task
  const nextTask = currentDayData?.tasks.find((t) => !completedTasks.includes(t.id))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{track.name}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Dan {currentDay}/{track.days.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{stats.completed}/{stats.total} zadataka</span>
            <span className="font-medium">{stats.percentage}%</span>
          </div>
          <Progress value={stats.percentage} className="h-2" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{currentDayData?.title}</p>
          <ul className="space-y-1">
            {currentDayData?.tasks.slice(0, 4).map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                {completedTasks.includes(task.id) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={completedTasks.includes(task.id) ? "line-through text-muted-foreground" : ""}>
                  {task.title}
                </span>
                {task.isOptional && (
                  <span className="text-xs text-muted-foreground">(opcionalno)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {nextTask && (
          <Button asChild className="w-full">
            <Link href={nextTask.href}>
              Nastavi: {nextTask.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/tutorials/progress.ts src/components/tutorials/tutorial-progress-widget.tsx
git commit -m "feat(tutorials): create tutorial progress widget and progress tracking functions"
```

---

### Task 8: Create Competence-Aware Tooltip Component

**Files:**

- Create: `src/components/ui/competence-tooltip.tsx`
- Modify: `src/lib/visibility/rules.ts` (if needed)

**Step 1: Create competence tooltip**

```typescript
// src/components/ui/competence-tooltip.tsx
"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { useCompanyContext } from "@/contexts/company-context"
import type { CompetenceLevel } from "@/lib/visibility/rules"

interface CompetenceTooltipProps {
  children: React.ReactNode
  content: string
  showFor?: CompetenceLevel[] // Which competence levels see the tooltip
  className?: string
}

const DEFAULT_SHOW_FOR: CompetenceLevel[] = ["beginner", "average"]

export function CompetenceTooltip({
  children,
  content,
  showFor = DEFAULT_SHOW_FOR,
  className,
}: CompetenceTooltipProps) {
  const { company } = useCompanyContext()
  const competence = (company?.featureFlags?.competence as CompetenceLevel) || "beginner"

  // Don't show tooltip if user's competence level is not in showFor
  if (!showFor.includes(competence)) {
    return <>{children}</>
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className || ""}`}>
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 cursor-help text-muted-foreground hover:text-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

/**
 * Field-level help text that shows based on competence
 */
export function FieldHelp({
  children,
  showFor = DEFAULT_SHOW_FOR
}: {
  children: React.ReactNode
  showFor?: CompetenceLevel[]
}) {
  const { company } = useCompanyContext()
  const competence = (company?.featureFlags?.competence as CompetenceLevel) || "beginner"

  if (!showFor.includes(competence)) {
    return null
  }

  return (
    <p className="text-xs text-muted-foreground mt-1">{children}</p>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/competence-tooltip.tsx
git commit -m "feat(ui): create competence-aware tooltip and field help components"
```

---

### Task 9: Create Context-Sensitive Help Triggers

**Files:**

- Create: `src/lib/tutorials/triggers.ts`
- Create: `src/components/tutorials/contextual-help-banner.tsx`

**Step 1: Create triggers logic**

```typescript
// src/lib/tutorials/triggers.ts

import { db } from "@/lib/db"
import { THRESHOLDS } from "@/lib/fiscal-data/data/thresholds"

export interface ContextualTrigger {
  id: string
  type: "success" | "warning" | "info"
  title: string
  description: string
  href?: string
  dismissible: boolean
}

interface TriggerContext {
  companyId: string
  invoiceCount: number
  yearlyRevenue: number
  hasFiscalCert: boolean
  lastBankImport?: Date
}

export async function getActiveTriggersForContext(
  ctx: TriggerContext
): Promise<ContextualTrigger[]> {
  const triggers: ContextualTrigger[] = []
  const limit = THRESHOLDS.pausalni.value

  // First invoice created
  if (ctx.invoiceCount === 1) {
    triggers.push({
      id: "first-invoice",
      type: "success",
      title: "Prvi račun kreiran!",
      description: "Vaš račun je automatski upisan u Knjigu primitaka (KPR)",
      href: "/pausalni",
      dismissible: true,
    })
  }

  // Approaching 60k limit (85%)
  if (ctx.yearlyRevenue >= limit * 0.85 && ctx.yearlyRevenue < limit * 0.95) {
    triggers.push({
      id: "approaching-60k",
      type: "warning",
      title: `Na ${Math.round((ctx.yearlyRevenue / limit) * 100)}% ste limita`,
      description: "Približavate se limitu od 60.000 EUR za paušalni obrt",
      href: "/vodici/pausalni-limit",
      dismissible: false,
    })
  }

  // Critical 60k limit (95%)
  if (ctx.yearlyRevenue >= limit * 0.95) {
    triggers.push({
      id: "critical-60k",
      type: "warning",
      title: "HITNO: Na 95% ste limita!",
      description: "Trebate razmotriti prijelaz na d.o.o. ili realni obrt",
      href: "/vodici/prelazak-doo",
      dismissible: false,
    })
  }

  // First bank import
  if (ctx.lastBankImport) {
    const hoursSinceImport = (Date.now() - ctx.lastBankImport.getTime()) / (1000 * 60 * 60)
    if (hoursSinceImport < 1) {
      triggers.push({
        id: "first-bank-import",
        type: "info",
        title: "Bankovni podaci uvezeni!",
        description: "Povežite uplate s računima za automatsko označavanje plaćenih",
        href: "/banking/reconcile",
        dismissible: true,
      })
    }
  }

  return triggers
}
```

**Step 2: Create contextual help banner**

```typescript
// src/components/tutorials/contextual-help-banner.tsx
"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, ArrowRight, AlertTriangle, CheckCircle, Info } from "lucide-react"
import Link from "next/link"
import type { ContextualTrigger } from "@/lib/tutorials/triggers"

interface ContextualHelpBannerProps {
  triggers: ContextualTrigger[]
  onDismiss?: (triggerId: string) => void
}

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
}

const VARIANTS = {
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
}

export function ContextualHelpBanner({ triggers, onDismiss }: ContextualHelpBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visibleTriggers = triggers.filter((t) => !dismissed.has(t.id))

  if (visibleTriggers.length === 0) return null

  const handleDismiss = (triggerId: string) => {
    setDismissed((prev) => new Set([...prev, triggerId]))
    onDismiss?.(triggerId)
  }

  return (
    <div className="space-y-2">
      {visibleTriggers.map((trigger) => {
        const Icon = ICONS[trigger.type]
        return (
          <Alert key={trigger.id} className={VARIANTS[trigger.type]}>
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              {trigger.title}
              {trigger.dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDismiss(trigger.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{trigger.description}</span>
              {trigger.href && (
                <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                  <Link href={trigger.href}>
                    Saznaj više <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/tutorials/triggers.ts src/components/tutorials/contextual-help-banner.tsx
git commit -m "feat(tutorials): create context-sensitive help triggers and banner component"
```

---

### Task 10: Add Tutorial Widget to Dashboard

**Files:**

- Modify: `src/app/(app)/dashboard/page.tsx`

**Step 1: Import tutorial components**

Add imports:

```typescript
import { TutorialProgressWidget } from "@/components/tutorials/tutorial-progress-widget"
import { ContextualHelpBanner } from "@/components/tutorials/contextual-help-banner"
import { getTrackForLegalForm } from "@/lib/tutorials/tracks"
import { getTutorialProgress } from "@/lib/tutorials/progress"
import { getActiveTriggersForContext } from "@/lib/tutorials/triggers"
```

**Step 2: Fetch tutorial data in page**

Add to server component data fetching:

```typescript
// Get tutorial track and progress for paušalni users
const tutorialTrack =
  company?.legalForm === "OBRT_PAUSAL" ? getTrackForLegalForm("OBRT_PAUSAL") : null

const tutorialProgress =
  tutorialTrack && user ? await getTutorialProgress(user.id!, company!.id, tutorialTrack.id) : null

// Get contextual triggers
const triggers = await getActiveTriggersForContext({
  companyId: company!.id,
  invoiceCount: invoiceStats.total,
  yearlyRevenue: revenueStats.ytd,
  hasFiscalCert: !!company?.fiscalCertificate,
})
```

**Step 3: Render in dashboard**

Add to dashboard layout (after the main metrics):

```tsx
{
  /* Contextual Help */
}
{
  triggers.length > 0 && <ContextualHelpBanner triggers={triggers} />
}

{
  /* Tutorial Progress for Paušalni */
}
{
  tutorialTrack && <TutorialProgressWidget track={tutorialTrack} progress={tutorialProgress} />
}
```

**Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): integrate tutorial progress widget and contextual help banners"
```

---

### Task 11: Create Help Density Configuration

**Files:**

- Create: `src/lib/guidance/help-density.ts`
- Modify: `src/components/onboarding/step-competence.tsx` (add density preview)

**Step 1: Create help density configuration**

```typescript
// src/lib/guidance/help-density.ts

import type { CompetenceLevel } from "@/lib/visibility/rules"

export interface HelpDensityConfig {
  fieldTooltips: "all" | "key" | "none"
  actionConfirmations: "always" | "destructive" | "never"
  successExplanations: "detailed" | "brief" | "toast"
  keyboardShortcuts: "hidden" | "hover" | "visible"
}

export const HELP_DENSITY: Record<CompetenceLevel, HelpDensityConfig> = {
  beginner: {
    fieldTooltips: "all",
    actionConfirmations: "always",
    successExplanations: "detailed",
    keyboardShortcuts: "hidden",
  },
  average: {
    fieldTooltips: "key",
    actionConfirmations: "destructive",
    successExplanations: "brief",
    keyboardShortcuts: "hover",
  },
  pro: {
    fieldTooltips: "none",
    actionConfirmations: "never",
    successExplanations: "toast",
    keyboardShortcuts: "visible",
  },
}

export function getHelpDensity(competence: CompetenceLevel): HelpDensityConfig {
  return HELP_DENSITY[competence]
}

export const COMPETENCE_DESCRIPTIONS: Record<CompetenceLevel, string> = {
  beginner: "Maksimalna pomoć: tooltipovi svugdje, objašnjenja, upozorenja",
  average: "Uravnoteženo: ključne napomene, opcionalno proširenje",
  pro: "Minimalno: čist UI, napredne prečace vidljive",
}
```

**Step 2: Update step-competence to show density preview**

Add help density preview in `src/components/onboarding/step-competence.tsx`:

```typescript
import { COMPETENCE_DESCRIPTIONS } from "@/lib/guidance/help-density"

// In the component, under each competence option:
<p className="text-xs text-muted-foreground mt-1">
  {COMPETENCE_DESCRIPTIONS[level]}
</p>
```

**Step 3: Commit**

```bash
git add src/lib/guidance/help-density.ts src/components/onboarding/step-competence.tsx
git commit -m "feat(guidance): create help density configuration by competence level"
```

---

### Task 12: Create Keyboard Shortcuts by Competence

**Files:**

- Create: `src/lib/shortcuts/index.ts`
- Create: `src/components/ui/keyboard-shortcut.tsx`

**Step 1: Create shortcuts configuration**

```typescript
// src/lib/shortcuts/index.ts

export interface Shortcut {
  id: string
  keys: string[] // e.g., ["cmd", "n"] or ["ctrl", "n"]
  action: string
  description: string
  href?: string
}

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  {
    id: "new-invoice",
    keys: ["cmd", "n"],
    action: "newInvoice",
    description: "Novi račun",
    href: "/invoices/new",
  },
  {
    id: "new-contact",
    keys: ["cmd", "shift", "c"],
    action: "newContact",
    description: "Novi kontakt",
    href: "/contacts/new",
  },
  {
    id: "new-product",
    keys: ["cmd", "shift", "p"],
    action: "newProduct",
    description: "Novi proizvod",
    href: "/products/new",
  },
  {
    id: "dashboard",
    keys: ["cmd", "d"],
    action: "dashboard",
    description: "Dashboard",
    href: "/dashboard",
  },
  { id: "search", keys: ["cmd", "k"], action: "search", description: "Pretraga" },
]

export function formatShortcut(keys: string[]): string {
  return keys
    .map((key) => {
      if (key === "cmd") return "⌘"
      if (key === "ctrl") return "Ctrl"
      if (key === "shift") return "⇧"
      if (key === "alt") return "⌥"
      return key.toUpperCase()
    })
    .join("")
}
```

**Step 2: Create keyboard shortcut display component**

```typescript
// src/components/ui/keyboard-shortcut.tsx
"use client"

import { useCompanyContext } from "@/contexts/company-context"
import type { CompetenceLevel } from "@/lib/visibility/rules"
import { formatShortcut, type Shortcut } from "@/lib/shortcuts"

interface KeyboardShortcutProps {
  shortcut: Shortcut
  className?: string
}

export function KeyboardShortcut({ shortcut, className }: KeyboardShortcutProps) {
  const { company } = useCompanyContext()
  const competence = (company?.featureFlags?.competence as CompetenceLevel) || "beginner"

  // Hidden for beginners
  if (competence === "beginner") return null

  // Visible always for pro, on hover for average (handled via CSS)
  const baseClasses = "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono"
  const visibilityClass = competence === "average"
    ? "opacity-0 group-hover:opacity-100 transition-opacity"
    : ""

  return (
    <kbd className={`${baseClasses} ${visibilityClass} ${className || ""}`}>
      {formatShortcut(shortcut.keys)}
    </kbd>
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/shortcuts/index.ts src/components/ui/keyboard-shortcut.tsx
git commit -m "feat(shortcuts): create keyboard shortcuts system with competence-aware display"
```

---

## Phase 2: Compliance (Tasks 13-20)

### Task 13: Create Compliance Dashboard Page

**Files:**

- Create: `src/app/(app)/compliance/page.tsx`
- Create: `src/app/(app)/compliance/compliance-dashboard.tsx`

**Step 1: Create page component**

```typescript
// src/app/(app)/compliance/page.tsx
import { requireAuth } from "@/lib/auth-utils"
import { requireCompany } from "@/lib/company-utils"
import { ComplianceDashboard } from "./compliance-dashboard"

export const metadata = {
  title: "Usklađenost | FiskAI",
  description: "Pregled statusa fiskalizacije i usklađenosti",
}

export default async function CompliancePage() {
  const user = await requireAuth()
  const company = await requireCompany()

  // Fetch compliance data
  const complianceData = await getComplianceData(company.id)

  return <ComplianceDashboard data={complianceData} />
}

async function getComplianceData(companyId: string) {
  // Implementation will fetch certificate status, fiscalization stats, etc.
  // This is a placeholder structure
  return {
    certificate: null,
    premises: [],
    stats: { total: 0, success: 0, lastSync: null },
    recentInvoices: [],
  }
}
```

**Step 2: Create dashboard component**

```typescript
// src/app/(app)/compliance/compliance-dashboard.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ComplianceData {
  certificate: {
    validUntil: Date
    daysRemaining: number
    status: "active" | "expiring" | "expired" | "missing"
  } | null
  premises: Array<{
    id: string
    name: string
    address: string
    registered: boolean
  }>
  stats: {
    total: number
    success: number
    lastSync: Date | null
  }
  recentInvoices: Array<{
    id: string
    number: string
    jir: string
    zki: string
    createdAt: Date
  }>
}

export function ComplianceDashboard({ data }: { data: ComplianceData }) {
  const successRate = data.stats.total > 0
    ? Math.round((data.stats.success / data.stats.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usklađenost</h1>
        <p className="text-muted-foreground">Pregled fiskalizacije i certificiranja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Certificate Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FINA Certifikat</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.certificate ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={data.certificate.status === "active" ? "default" : "destructive"}>
                    {data.certificate.status === "active" ? "Aktivan" :
                     data.certificate.status === "expiring" ? "Ističe uskoro" :
                     data.certificate.status === "expired" ? "Istekao" : "Nedostaje"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data.certificate.daysRemaining} dana do isteka
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Nije učitan</p>
                <Button size="sm" variant="outline" className="mt-2" asChild>
                  <Link href="/settings/fiscalisation">Učitaj certifikat</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fiscalization Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fiskalizirani računi</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {successRate}% uspješnost
            </p>
          </CardContent>
        </Card>

        {/* Last Sync */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zadnja sinkronizacija</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.lastSync
                ? new Date(data.stats.lastSync).toLocaleDateString("hr-HR")
                : "—"
              }
            </div>
          </CardContent>
        </Card>

        {/* Premises */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Poslovni prostori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.premises.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.premises.filter(p => p.registered).length} registrirano
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Fiscalized Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Nedavno fiskalizirani računi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {data.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      JIR: {invoice.jir}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`https://porezna.gov.hr/provjera-racuna?jir=${invoice.jir}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Provjeri <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nema fiskaliziranih računa</p>
          )}
        </CardContent>
      </Card>

      {/* Compliance Checklist for Cash Businesses */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist za fiskalizaciju</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem
              done={!!data.certificate}
              title="Učitajte FINA certifikat (.p12 datoteka)"
              href="/settings/fiscalisation"
            />
            <ChecklistItem
              done={data.premises.length > 0}
              title="Registrirajte poslovni prostor"
              href="/settings/premises"
            />
            <ChecklistItem
              done={data.stats.total > 0}
              title="Testirajte fiskalizaciju (sandbox mod)"
              href="/invoices/new?mode=test"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChecklistItem({ done, title, href }: { done: boolean; title: string; href: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? "bg-green-100" : "bg-gray-100"}`}>
        {done ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
        )}
      </div>
      <span className={done ? "line-through text-muted-foreground" : ""}>{title}</span>
      {!done && (
        <Button variant="link" size="sm" className="ml-auto p-0 h-auto" asChild>
          <Link href={href}>Započni</Link>
        </Button>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(app)/compliance/page.tsx src/app/(app)/compliance/compliance-dashboard.tsx
git commit -m "feat(compliance): create compliance dashboard page with certificate status and checklist"
```

---

### Task 14: Create QR Code Generator for Invoices

**Files:**

- Create: `src/lib/fiscal/qr-generator.ts`
- Modify: Invoice PDF generation to include QR code

**Step 1: Create QR generator**

```typescript
// src/lib/fiscal/qr-generator.ts

import QRCode from "qrcode"

export interface FiscalQRData {
  jir: string
  zki: string
  invoiceNumber: string
  issuerOib: string
  amount: number
  dateTime: Date
}

/**
 * Generate Porezna verification URL for fiscalized invoice
 */
export function generateVerificationUrl(data: FiscalQRData): string {
  // Official Porezna URL format for invoice verification
  const params = new URLSearchParams({
    jir: data.jir,
    datumvrijeme: formatDateTime(data.dateTime),
    iznos: data.amount.toFixed(2),
  })

  return `https://porezna.gov.hr/provjera-racuna?${params.toString()}`
}

/**
 * Generate QR code as data URL for invoice PDF
 */
export async function generateFiscalQRCode(data: FiscalQRData): Promise<string> {
  const url = generateVerificationUrl(data)

  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 150,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  })
}

/**
 * Generate QR code as SVG string for web display
 */
export async function generateFiscalQRCodeSVG(data: FiscalQRData): Promise<string> {
  const url = generateVerificationUrl(data)

  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 150,
  })
}

function formatDateTime(date: Date): string {
  // Format: DD.MM.YYYY HH:MM:SS
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}
```

**Step 2: Install qrcode package**

```bash
npm install qrcode @types/qrcode
```

**Step 3: Commit**

```bash
git add src/lib/fiscal/qr-generator.ts package.json package-lock.json
git commit -m "feat(fiscal): create QR code generator for invoice verification"
```

---

### Task 15: Add QR Code to Invoice PDF Template

**Files:**

- Modify: `src/lib/pdf/invoice-template.tsx` (or equivalent)

**Step 1: Import QR generator and add to template**

Add to the invoice PDF template:

```typescript
import { generateFiscalQRCode, type FiscalQRData } from "@/lib/fiscal/qr-generator"

// In the PDF generation function, if invoice is fiscalized:
if (invoice.jir && invoice.zki) {
  const qrData: FiscalQRData = {
    jir: invoice.jir,
    zki: invoice.zki,
    invoiceNumber: invoice.invoiceNumber,
    issuerOib: company.oib,
    amount: invoice.totalAmount,
    dateTime: invoice.fiscalizedAt || invoice.createdAt,
  }

  const qrCodeDataUrl = await generateFiscalQRCode(qrData)

  // Add to PDF footer section
  // QR code + text "Ovaj račun je prijavljen Poreznoj upravi"
}
```

**Step 2: Add PDF footer with compliance message**

```tsx
{
  /* Fiscal compliance footer */
}
{
  invoice.jir && (
    <View style={styles.fiscalFooter}>
      <Image src={qrCodeDataUrl} style={styles.qrCode} />
      <View style={styles.fiscalInfo}>
        <Text style={styles.fiscalText}>Ovaj račun je prijavljen Poreznoj upravi</Text>
        <Text style={styles.fiscalCode}>JIR: {invoice.jir}</Text>
        <Text style={styles.fiscalCode}>ZKI: {invoice.zki}</Text>
        <Text style={styles.scanHint}>Skenirajte QR kod za provjeru na porezna.gov.hr</Text>
      </View>
    </View>
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/pdf/invoice-template.tsx
git commit -m "feat(pdf): add QR code and fiscal compliance footer to invoice PDF"
```

---

### Task 16: Create Compliance Data Fetching Functions

**Files:**

- Create: `src/lib/compliance/data.ts`

**Step 1: Create data fetching functions**

```typescript
// src/lib/compliance/data.ts

import { db } from "@/lib/db"
import { drizzleDb } from "@/lib/db/drizzle"
import { fiscalPremises, fiscalDevices } from "@/lib/db/schema/fiscal"
import { eq, desc, and, gte } from "drizzle-orm"

export interface CertificateStatus {
  loaded: boolean
  validUntil: Date | null
  daysRemaining: number
  status: "active" | "expiring" | "expired" | "missing"
  issuer: string | null
}

export interface FiscalizationStats {
  total: number
  success: number
  failed: number
  successRate: number
  lastSync: Date | null
  todayCount: number
}

export interface PremisesInfo {
  id: string
  name: string
  address: string
  oznakaProstora: string
  registered: boolean
  devices: number
}

export interface ComplianceOverview {
  certificate: CertificateStatus
  premises: PremisesInfo[]
  stats: FiscalizationStats
  recentInvoices: Array<{
    id: string
    number: string
    jir: string
    zki: string
    amount: number
    fiscalizedAt: Date
  }>
}

export async function getComplianceOverview(companyId: string): Promise<ComplianceOverview> {
  // Fetch company with fiscal certificate
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      fiscalCertificateId: true,
      fiscalCertificate: {
        select: {
          validUntil: true,
          issuer: true,
        },
      },
    },
  })

  // Calculate certificate status
  const certificate = getCertificateStatus(company?.fiscalCertificate)

  // Fetch premises
  const premises = await getFiscalPremises(companyId)

  // Fetch fiscalization stats
  const stats = await getFiscalizationStats(companyId)

  // Fetch recent fiscalized invoices
  const recentInvoices = await getRecentFiscalizedInvoices(companyId, 5)

  return {
    certificate,
    premises,
    stats,
    recentInvoices,
  }
}

function getCertificateStatus(
  cert: { validUntil: Date | null; issuer: string | null } | null
): CertificateStatus {
  if (!cert || !cert.validUntil) {
    return {
      loaded: false,
      validUntil: null,
      daysRemaining: 0,
      status: "missing",
      issuer: null,
    }
  }

  const now = new Date()
  const validUntil = new Date(cert.validUntil)
  const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  let status: CertificateStatus["status"] = "active"
  if (daysRemaining <= 0) {
    status = "expired"
  } else if (daysRemaining <= 30) {
    status = "expiring"
  }

  return {
    loaded: true,
    validUntil,
    daysRemaining: Math.max(0, daysRemaining),
    status,
    issuer: cert.issuer,
  }
}

async function getFiscalPremises(companyId: string): Promise<PremisesInfo[]> {
  const premises = await drizzleDb
    .select()
    .from(fiscalPremises)
    .where(eq(fiscalPremises.companyId, companyId))

  return premises.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address || "",
    oznakaProstora: p.oznakaProstora,
    registered: p.registeredAt !== null,
    devices: 0, // TODO: Count devices
  }))
}

async function getFiscalizationStats(companyId: string): Promise<FiscalizationStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const invoices = await db.eInvoice.findMany({
    where: {
      companyId,
      jir: { not: null },
    },
    select: {
      id: true,
      jir: true,
      fiscalizedAt: true,
    },
    orderBy: { fiscalizedAt: "desc" },
  })

  const total = invoices.length
  const success = invoices.filter((i) => i.jir).length
  const todayCount = invoices.filter(
    (i) => i.fiscalizedAt && new Date(i.fiscalizedAt) >= today
  ).length

  return {
    total,
    success,
    failed: total - success,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    lastSync: invoices[0]?.fiscalizedAt || null,
    todayCount,
  }
}

async function getRecentFiscalizedInvoices(companyId: string, limit: number) {
  return db.eInvoice.findMany({
    where: {
      companyId,
      jir: { not: null },
    },
    select: {
      id: true,
      invoiceNumber: true,
      jir: true,
      zki: true,
      totalAmount: true,
      fiscalizedAt: true,
    },
    orderBy: { fiscalizedAt: "desc" },
    take: limit,
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/compliance/data.ts
git commit -m "feat(compliance): create compliance data fetching functions"
```

---

### Task 17: Add Navigation Link to Compliance Page

**Files:**

- Modify: `src/components/layout/app-sidebar.tsx` (or navigation config)

**Step 1: Add compliance link to navigation**

Add to sidebar navigation items:

```typescript
{
  title: "Usklađenost",
  href: "/compliance",
  icon: Shield,
  // Only show for cash businesses or VAT payers
  showFor: ["OBRT_PAUSAL", "OBRT_REAL", "OBRT_VAT", "DOO", "JDOO"],
}
```

**Step 2: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(nav): add compliance page to sidebar navigation"
```

---

### Task 18: Create Compliance Footer Badge Component

**Files:**

- Create: `src/components/compliance/compliance-badge.tsx`

**Step 1: Create badge component**

```typescript
// src/components/compliance/compliance-badge.tsx
"use client"

import { Shield, CheckCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

interface ComplianceBadgeProps {
  variant?: "footer" | "inline" | "card"
  showDetails?: boolean
}

export function ComplianceBadge({ variant = "footer", showDetails = false }: ComplianceBadgeProps) {
  if (variant === "footer") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/compliance"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <span>Fiskalizacija 2.0 Certificirano</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Usklađeno s hrvatskim zakonima o fiskalizaciji</p>
          <p className="text-xs text-muted-foreground">Kliknite za više detalja</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (variant === "card") {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-900">Fiskalizacija 2.0 Certificirano</p>
          <p className="text-xs text-green-700">Usklađeno s Poreznom upravom</p>
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Shield className="h-3 w-3 text-green-600" />
      <span>Certificirano</span>
    </span>
  )
}
```

**Step 2: Add to app footer**

Add the badge to the main app footer component.

**Step 3: Commit**

```bash
git add src/components/compliance/compliance-badge.tsx
git commit -m "feat(compliance): create compliance badge component for footer and inline display"
```

---

### Task 19: Create Certificate Expiry Monitor

**Files:**

- Create: `src/lib/compliance/certificate-monitor.ts`
- Create: `src/app/api/cron/certificate-check/route.ts`

**Step 1: Create monitor logic**

```typescript
// src/lib/compliance/certificate-monitor.ts

import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export interface ExpiringCertificate {
  companyId: string
  companyName: string
  ownerEmail: string
  validUntil: Date
  daysRemaining: number
}

export async function findExpiringCertificates(
  daysThreshold: number = 30
): Promise<ExpiringCertificate[]> {
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

  const companies = await db.company.findMany({
    where: {
      fiscalCertificate: {
        validUntil: {
          lte: thresholdDate,
          gte: new Date(), // Not expired yet
        },
      },
    },
    include: {
      fiscalCertificate: true,
      users: {
        where: { role: "OWNER" },
        include: { user: true },
      },
    },
  })

  return companies.map((company) => {
    const validUntil = company.fiscalCertificate!.validUntil!
    const daysRemaining = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      companyId: company.id,
      companyName: company.name,
      ownerEmail: company.users[0]?.user?.email || "",
      validUntil,
      daysRemaining,
    }
  })
}

export async function sendCertificateExpiryNotification(cert: ExpiringCertificate): Promise<void> {
  await sendEmail({
    to: cert.ownerEmail,
    subject: `FiskAI: FINA certifikat ističe za ${cert.daysRemaining} dana`,
    template: "certificate-expiry",
    data: {
      companyName: cert.companyName,
      daysRemaining: cert.daysRemaining,
      validUntil: cert.validUntil.toLocaleDateString("hr-HR"),
      renewLink: "https://fina.hr/e-servisi/fiskalizacija",
    },
  })
}
```

**Step 2: Create cron endpoint**

```typescript
// src/app/api/cron/certificate-check/route.ts

import { NextResponse } from "next/server"
import {
  findExpiringCertificates,
  sendCertificateExpiryNotification,
} from "@/lib/compliance/certificate-monitor"

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expiringCerts = await findExpiringCertificates(30)

  // Send notifications for certificates expiring in <30 days
  for (const cert of expiringCerts) {
    if (cert.daysRemaining <= 30 && cert.daysRemaining % 7 === 0) {
      // Send weekly reminders
      await sendCertificateExpiryNotification(cert)
    }
    if (cert.daysRemaining <= 7) {
      // Send daily reminders in final week
      await sendCertificateExpiryNotification(cert)
    }
  }

  return NextResponse.json({
    checked: expiringCerts.length,
    notified: expiringCerts.filter((c) => c.daysRemaining <= 30).length,
  })
}
```

**Step 3: Commit**

```bash
git add src/lib/compliance/certificate-monitor.ts src/app/api/cron/certificate-check/route.ts
git commit -m "feat(compliance): create certificate expiry monitor with email notifications"
```

---

### Task 20: Add Compliance Status to Dashboard Card

**Files:**

- Modify: `src/app/(app)/dashboard/page.tsx` (add compliance card)
- Create: `src/components/dashboard/compliance-status-card.tsx`

**Step 1: Create compliance status card**

```typescript
// src/components/dashboard/compliance-status-card.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { CertificateStatus, FiscalizationStats } from "@/lib/compliance/data"

interface ComplianceStatusCardProps {
  certificate: CertificateStatus
  stats: FiscalizationStats
}

export function ComplianceStatusCard({ certificate, stats }: ComplianceStatusCardProps) {
  const isHealthy = certificate.status === "active" && stats.successRate >= 95

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Fiskalizacija</CardTitle>
        <Shield className={`h-4 w-4 ${isHealthy ? "text-green-600" : "text-amber-500"}`} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Certifikat</span>
          <Badge variant={certificate.status === "active" ? "default" : "destructive"}>
            {certificate.status === "active" ? "Aktivan" :
             certificate.status === "expiring" ? `${certificate.daysRemaining}d` :
             certificate.status === "expired" ? "Istekao" : "Nedostaje"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Danas</span>
          <span className="text-sm font-medium">{stats.todayCount} računa</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Uspješnost</span>
          <span className={`text-sm font-medium ${stats.successRate >= 95 ? "text-green-600" : "text-amber-600"}`}>
            {stats.successRate}%
          </span>
        </div>

        <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
          <Link href="/compliance">
            Detalji
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Add to dashboard**

Import and render the compliance card on the dashboard.

**Step 3: Commit**

```bash
git add src/components/dashboard/compliance-status-card.tsx src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): add compliance status card with certificate and fiscalization health"
```

---

## Phase 3: Admin Visibility (Tasks 21-28)

### Task 21: Create Admin Dashboard Overview Page

**Files:**

- Modify: `src/app/(admin)/tenants/page.tsx`
- Create: `src/app/(admin)/page.tsx`
- Create: `src/lib/admin/metrics.ts`

**Step 1: Create metrics functions**

```typescript
// src/lib/admin/metrics.ts

import { db } from "@/lib/db"

export interface AdminMetrics {
  totalTenants: number
  activeSubscriptions: number
  thisWeekSignups: number
  needsHelp: number
}

export interface OnboardingFunnel {
  started: number
  step2: number
  step3: number
  step4: number
  completed: number
  firstInvoice: number
}

export interface ComplianceHealth {
  certificatesActive: number
  certificatesExpiring: number
  certificatesMissing: number
  fiscalizedToday: number
  successRate: number
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const [totalTenants, activeSubscriptions, thisWeekSignups, needsHelp] = await Promise.all([
    db.company.count(),
    db.company.count({ where: { subscriptionStatus: "active" } }),
    db.company.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.company.count({
      where: {
        OR: [
          {
            hasCompletedOnboarding: false,
            createdAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          // Add more "needs help" criteria
        ],
      },
    }),
  ])

  return { totalTenants, activeSubscriptions, thisWeekSignups, needsHelp }
}

export async function getOnboardingFunnel(): Promise<OnboardingFunnel> {
  const companies = await db.company.findMany({
    select: {
      hasCompletedOnboarding: true,
      onboardingStep: true,
      _count: { select: { eInvoices: true } },
    },
  })

  return {
    started: companies.length,
    step2: companies.filter((c) => (c.onboardingStep || 0) >= 2).length,
    step3: companies.filter((c) => (c.onboardingStep || 0) >= 3).length,
    step4: companies.filter((c) => (c.onboardingStep || 0) >= 4).length,
    completed: companies.filter((c) => c.hasCompletedOnboarding).length,
    firstInvoice: companies.filter((c) => c._count.eInvoices > 0).length,
  }
}

export async function getComplianceHealth(): Promise<ComplianceHealth> {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeCount, expiringCount, missingCount, todayInvoices] = await Promise.all([
    db.fiscalCertificate.count({
      where: { validUntil: { gt: thirtyDaysFromNow } },
    }),
    db.fiscalCertificate.count({
      where: {
        validUntil: { lte: thirtyDaysFromNow, gte: new Date() },
      },
    }),
    db.company.count({
      where: {
        fiscalCertificateId: null,
        legalForm: { in: ["OBRT_PAUSAL", "OBRT_REAL", "OBRT_VAT"] },
      },
    }),
    db.eInvoice.count({
      where: { fiscalizedAt: { gte: today }, jir: { not: null } },
    }),
  ])

  const allFiscalized = await db.eInvoice.count({ where: { jir: { not: null } } })
  const totalAttempts = await db.eInvoice.count({ where: { fiscalizedAt: { not: null } } })

  return {
    certificatesActive: activeCount,
    certificatesExpiring: expiringCount,
    certificatesMissing: missingCount,
    fiscalizedToday: todayInvoices,
    successRate: totalAttempts > 0 ? Math.round((allFiscalized / totalAttempts) * 100) : 100,
  }
}
```

**Step 2: Create admin dashboard page**

```typescript
// src/app/(admin)/page.tsx
import { requireAdmin } from "@/lib/auth-utils"
import { getAdminMetrics, getOnboardingFunnel, getComplianceHealth } from "@/lib/admin/metrics"
import { AdminDashboard } from "./admin-dashboard"

export const metadata = {
  title: "Admin Dashboard | FiskAI",
}

export default async function AdminPage() {
  await requireAdmin()

  const [metrics, funnel, compliance] = await Promise.all([
    getAdminMetrics(),
    getOnboardingFunnel(),
    getComplianceHealth(),
  ])

  return <AdminDashboard metrics={metrics} funnel={funnel} compliance={compliance} />
}
```

**Step 3: Create admin dashboard component**

```typescript
// src/app/(admin)/admin-dashboard.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, UserPlus, AlertTriangle, Shield, CheckCircle } from "lucide-react"
import type { AdminMetrics, OnboardingFunnel, ComplianceHealth } from "@/lib/admin/metrics"

interface AdminDashboardProps {
  metrics: AdminMetrics
  funnel: OnboardingFunnel
  compliance: ComplianceHealth
}

export function AdminDashboard({ metrics, funnel, compliance }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tenants"
          value={metrics.totalTenants}
          icon={Users}
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions}
          icon={CreditCard}
        />
        <MetricCard
          title="This Week Signups"
          value={metrics.thisWeekSignups}
          icon={UserPlus}
        />
        <MetricCard
          title="Needs Help"
          value={metrics.needsHelp}
          icon={AlertTriangle}
          variant={metrics.needsHelp > 0 ? "warning" : "default"}
        />
      </div>

      {/* Onboarding Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <FunnelStep label="Started" value={funnel.started} percentage={100} />
            <FunnelStep label="Step 2" value={funnel.step2} percentage={(funnel.step2 / funnel.started) * 100} />
            <FunnelStep label="Step 3" value={funnel.step3} percentage={(funnel.step3 / funnel.started) * 100} />
            <FunnelStep label="Step 4" value={funnel.step4} percentage={(funnel.step4 / funnel.started) * 100} />
            <FunnelStep label="Completed" value={funnel.completed} percentage={(funnel.completed / funnel.started) * 100} />
            <FunnelStep label="1st Invoice" value={funnel.firstInvoice} percentage={(funnel.firstInvoice / funnel.started) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Health */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{compliance.certificatesActive}</p>
              <p className="text-sm text-muted-foreground">Active Certificates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{compliance.certificatesExpiring}</p>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{compliance.fiscalizedToday}</p>
              <p className="text-sm text-muted-foreground">Fiscalized Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant = "default"
}: {
  title: string
  value: number
  icon: React.ElementType
  variant?: "default" | "warning"
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "warning" ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === "warning" ? "text-amber-600" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function FunnelStep({ label, value, percentage }: { label: string; value: number; percentage: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/lib/admin/metrics.ts src/app/(admin)/page.tsx src/app/(admin)/admin-dashboard.tsx
git commit -m "feat(admin): create admin dashboard with metrics, funnel, and compliance health"
```

---

### Task 22: Create Tenant Detail View with Health Metrics

**Files:**

- Modify: `src/app/(admin)/tenants/[companyId]/page.tsx`
- Create: `src/lib/admin/tenant-health.ts`

**Step 1: Create tenant health functions**

```typescript
// src/lib/admin/tenant-health.ts

import { db } from "@/lib/db"
import { THRESHOLDS } from "@/lib/fiscal-data/data/thresholds"

export interface TenantHealth {
  onboardingComplete: boolean
  onboardingStep: number
  tutorialProgress: number
  competenceLevel: string
  lastLoginAt: Date | null
  thirtyDayActivity: number
}

export interface LimitTracker {
  currentRevenue: number
  limit: number
  percentage: number
  projectedYearly: number
  status: "safe" | "warning" | "critical"
}

export interface TenantProfile {
  id: string
  name: string
  oib: string
  legalForm: string
  isVatPayer: boolean
  createdAt: Date
}

export interface TenantSubscription {
  plan: string
  status: string
  mrr: number
  startedAt: Date | null
}

export interface TenantOwner {
  email: string
  name: string | null
  lastLoginAt: Date | null
}

export interface TenantDetail {
  profile: TenantProfile
  subscription: TenantSubscription
  owner: TenantOwner | null
  health: TenantHealth
  limitTracker: LimitTracker
  modules: string[]
  flags: string[]
}

export async function getTenantDetail(companyId: string): Promise<TenantDetail | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        where: { role: "OWNER" },
        include: { user: true },
      },
      eInvoices: {
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
          status: { not: "DRAFT" },
        },
        select: { totalAmount: true },
      },
    },
  })

  if (!company) return null

  const owner = company.users[0]?.user
  const yearlyRevenue = company.eInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
  const limit = THRESHOLDS.pausalni.value

  // Calculate projected yearly (based on current month)
  const currentMonth = new Date().getMonth() + 1
  const projectedYearly = (yearlyRevenue / currentMonth) * 12

  // Calculate 30-day activity
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentActivity = await db.eInvoice.count({
    where: { companyId, createdAt: { gte: thirtyDaysAgo } },
  })

  return {
    profile: {
      id: company.id,
      name: company.name,
      oib: company.oib || "",
      legalForm: company.legalForm || "UNKNOWN",
      isVatPayer: company.isVatPayer,
      createdAt: company.createdAt,
    },
    subscription: {
      plan: company.plan || "free",
      status: company.subscriptionStatus || "none",
      mrr: 0, // TODO: Calculate from Stripe
      startedAt: company.subscriptionStartedAt,
    },
    owner: owner
      ? {
          email: owner.email,
          name: owner.name,
          lastLoginAt: owner.lastLoginAt,
        }
      : null,
    health: {
      onboardingComplete: company.hasCompletedOnboarding,
      onboardingStep: company.onboardingStep || 1,
      tutorialProgress: 0, // TODO: Calculate from tutorial_progress table
      competenceLevel: (company.featureFlags as any)?.competence || "beginner",
      lastLoginAt: owner?.lastLoginAt || null,
      thirtyDayActivity: recentActivity,
    },
    limitTracker: {
      currentRevenue: yearlyRevenue,
      limit,
      percentage: (yearlyRevenue / limit) * 100,
      projectedYearly,
      status:
        yearlyRevenue >= limit * 0.95
          ? "critical"
          : yearlyRevenue >= limit * 0.85
            ? "warning"
            : "safe",
    },
    modules: (company.entitlements as string[]) || [],
    flags: calculateFlags(company, yearlyRevenue, limit, owner?.lastLoginAt),
  }
}

function calculateFlags(
  company: any,
  revenue: number,
  limit: number,
  lastLogin: Date | null
): string[] {
  const flags: string[] = []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  if (!company.hasCompletedOnboarding && company.createdAt < sevenDaysAgo) {
    flags.push("stuck-onboarding")
  }
  if (revenue >= limit * 0.85) {
    flags.push("approaching-limit")
  }
  if (revenue >= limit * 0.95) {
    flags.push("critical-limit")
  }
  if (!lastLogin || lastLogin < thirtyDaysAgo) {
    flags.push("inactive")
  }

  return flags
}
```

**Step 2: Update tenant detail page**

```typescript
// src/app/(admin)/tenants/[companyId]/page.tsx
import { requireAdmin } from "@/lib/auth-utils"
import { getTenantDetail } from "@/lib/admin/tenant-health"
import { TenantDetailView } from "./tenant-detail-view"
import { notFound } from "next/navigation"

export default async function TenantDetailPage({
  params,
}: {
  params: { companyId: string }
}) {
  await requireAdmin()

  const tenant = await getTenantDetail(params.companyId)
  if (!tenant) notFound()

  return <TenantDetailView tenant={tenant} />
}
```

**Step 3: Create tenant detail view component**

```typescript
// src/app/(admin)/tenants/[companyId]/tenant-detail-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Mail, Gift, Download, Flag } from "lucide-react"
import type { TenantDetail } from "@/lib/admin/tenant-health"

export function TenantDetailView({ tenant }: { tenant: TenantDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.profile.name}</h1>
          <p className="text-muted-foreground">OIB: {tenant.profile.oib}</p>
        </div>
        <div className="flex gap-2">
          {tenant.flags.map((flag) => (
            <Badge key={flag} variant="destructive">{flag}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Legal Form: {tenant.profile.legalForm}</p>
            <p>VAT: {tenant.profile.isVatPayer ? "Yes" : "No"}</p>
            <p>Since: {tenant.profile.createdAt.toLocaleDateString()}</p>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Plan: {tenant.subscription.plan}</p>
            <Badge>{tenant.subscription.status}</Badge>
          </CardContent>
        </Card>

        {/* Owner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{tenant.owner?.email || "No owner"}</p>
            <p className="text-muted-foreground">
              Last login: {tenant.owner?.lastLoginAt?.toLocaleDateString() || "Never"}
            </p>
          </CardContent>
        </Card>

        {/* Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Onboarding: {tenant.health.onboardingComplete ? "Complete" : `Step ${tenant.health.onboardingStep}`}</p>
            <p>Competence: {tenant.health.competenceLevel}</p>
            <p>30-day activity: {tenant.health.thirtyDayActivity} invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* 60k Limit Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>60k Limit Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Current: €{tenant.limitTracker.currentRevenue.toFixed(2)}</span>
            <span>Limit: €{tenant.limitTracker.limit.toLocaleString()}</span>
          </div>
          <Progress
            value={tenant.limitTracker.percentage}
            className={
              tenant.limitTracker.status === "critical" ? "bg-red-200" :
              tenant.limitTracker.status === "warning" ? "bg-amber-200" : ""
            }
          />
          <p className="text-sm text-muted-foreground">
            Projected yearly: €{tenant.limitTracker.projectedYearly.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <Gift className="mr-2 h-4 w-4" />
            Gift Module
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Flag className="mr-2 h-4 w-4" />
            Flag
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/lib/admin/tenant-health.ts src/app/(admin)/tenants/[companyId]/page.tsx src/app/(admin)/tenants/[companyId]/tenant-detail-view.tsx
git commit -m "feat(admin): create tenant detail view with health metrics and 60k limit tracker"
```

---

### Task 23: Create Alert System for Admin

**Files:**

- Create: `src/lib/admin/alerts.ts`
- Create: `src/components/admin/alerts-panel.tsx`

**Step 1: Create alerts system**

```typescript
// src/lib/admin/alerts.ts

import { db } from "@/lib/db"
import { THRESHOLDS } from "@/lib/fiscal-data/data/thresholds"

export type AlertLevel = "critical" | "warning" | "info"
export type AlertType =
  | "onboarding-stuck"
  | "approaching-limit"
  | "critical-limit"
  | "cert-expiring"
  | "cert-expired"
  | "inactive"
  | "support-ticket"

export interface Alert {
  id: string
  type: AlertType
  level: AlertLevel
  companyId: string
  companyName: string
  title: string
  description: string
  createdAt: Date
  autoAction?: string
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const limit = THRESHOLDS.pausalni.value

  // Stuck in onboarding >7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const stuckCompanies = await db.company.findMany({
    where: {
      hasCompletedOnboarding: false,
      createdAt: { lte: sevenDaysAgo },
    },
    select: { id: true, name: true, createdAt: true },
  })

  for (const company of stuckCompanies) {
    alerts.push({
      id: `stuck-${company.id}`,
      type: "onboarding-stuck",
      level: "critical",
      companyId: company.id,
      companyName: company.name,
      title: "Stuck in onboarding",
      description: `Started ${Math.ceil((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days ago`,
      createdAt: company.createdAt,
      autoAction: "Queue reminder email",
    })
  }

  // Approaching 60k limit
  const companies = await db.company.findMany({
    where: { legalForm: "OBRT_PAUSAL" },
    include: {
      eInvoices: {
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
          status: { not: "DRAFT" },
        },
        select: { totalAmount: true },
      },
    },
  })

  for (const company of companies) {
    const revenue = company.eInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

    if (revenue >= limit * 0.95) {
      alerts.push({
        id: `limit-critical-${company.id}`,
        type: "critical-limit",
        level: "critical",
        companyId: company.id,
        companyName: company.name,
        title: "95% of 60k limit",
        description: `Current: €${revenue.toFixed(2)}`,
        createdAt: new Date(),
        autoAction: "Urgent outreach",
      })
    } else if (revenue >= limit * 0.85) {
      alerts.push({
        id: `limit-warning-${company.id}`,
        type: "approaching-limit",
        level: "warning",
        companyId: company.id,
        companyName: company.name,
        title: "85% of 60k limit",
        description: `Current: €${revenue.toFixed(2)}`,
        createdAt: new Date(),
        autoAction: "Send threshold guide",
      })
    }
  }

  // Certificate expiring
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const expiringCerts = await db.fiscalCertificate.findMany({
    where: {
      validUntil: { lte: thirtyDaysFromNow, gte: new Date() },
    },
    include: { company: { select: { id: true, name: true } } },
  })

  for (const cert of expiringCerts) {
    if (!cert.company) continue
    const daysRemaining = Math.ceil(
      (cert.validUntil!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    alerts.push({
      id: `cert-expiring-${cert.id}`,
      type: "cert-expiring",
      level: daysRemaining <= 7 ? "critical" : "warning",
      companyId: cert.company.id,
      companyName: cert.company.name,
      title: "Certificate expiring",
      description: `${daysRemaining} days remaining`,
      createdAt: new Date(),
      autoAction: "Send renewal notice",
    })
  }

  // Sort by level (critical first)
  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.level] - order[b.level]
  })
}
```

**Step 2: Create alerts panel component**

```typescript
// src/components/admin/alerts-panel.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Alert, AlertLevel } from "@/lib/admin/alerts"

const LEVEL_STYLES: Record<AlertLevel, { icon: typeof AlertTriangle; color: string }> = {
  critical: { icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  info: { icon: Info, color: "text-blue-600 bg-blue-50 border-blue-200" },
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active alerts
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Needs Attention ({alerts.length})</span>
          <Badge variant="destructive">
            {alerts.filter((a) => a.level === "critical").length} Critical
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 10).map((alert) => {
          const { icon: Icon, color } = LEVEL_STYLES[alert.level]
          return (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${color}`}>
              <Icon className="h-5 w-5 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{alert.companyName}</span>
                  <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                </div>
                <p className="text-sm">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
                {alert.autoAction && (
                  <p className="text-xs mt-1">Auto: {alert.autoAction}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/tenants/${alert.companyId}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Add to admin dashboard**

**Step 4: Commit**

```bash
git add src/lib/admin/alerts.ts src/components/admin/alerts-panel.tsx
git commit -m "feat(admin): create alert system for customer health monitoring"
```

---

### Task 24-28: Remaining Admin Tasks

Tasks 24-28 cover:

- Weekly admin digest email automation
- Admin action handlers (email, gift module, flag tenant)
- Tenant list with filtering and sorting
- Admin navigation improvements
- Final integration tests

These follow the same pattern as above. Each task creates focused, testable increments.

---

## Phase 4: Polish (Tasks 29-33)

### Task 29: Add Loading States and Skeletons

**Files:**

- Create loading.tsx files for each major page
- Add Suspense boundaries

### Task 30: Add Error Boundaries

**Files:**

- Create error.tsx files for graceful error handling

### Task 31: Performance Optimization

**Files:**

- Add `dynamic` imports for heavy components
- Implement proper caching strategies

### Task 32: Accessibility Improvements

**Files:**

- Add aria labels
- Ensure keyboard navigation
- Check color contrast

### Task 33: Final Integration Testing

**Files:**

- Create E2E tests for critical flows
- Verify all components work together

---

## Summary

Total: 33 tasks across 4 phases

**Phase 1 (Core Flows):** 12 tasks

- Postal code data, onboarding Step 5, tutorial tracks, competence-aware help

**Phase 2 (Compliance):** 8 tasks

- Compliance dashboard, QR codes, certificate monitoring

**Phase 3 (Admin Visibility):** 8 tasks

- Admin dashboard, tenant health, alert system

**Phase 4 (Polish):** 5 tasks

- Loading states, error handling, performance, accessibility, testing

Each task is atomic and executable by a subagent with zero prior context.
