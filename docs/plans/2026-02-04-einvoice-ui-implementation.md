# E-Invoice UI/UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete UI for creating, validating, and sending Croatian B2B e-invoices via e-Poslovanje

**Architecture:** Multi-step wizard form (Buyer → Items → Review → Send) using existing glass-card design patterns. Validates against CIUS-2025 specification before submission. Integrates with e-Poslovanje REST API.

**Tech Stack:** Next.js 15 App Router, React Server Components, tRPC, Prisma, Zod validation, Framer Motion animations

---

## Required Fields Analysis (from CIUS-2025 Golden Fixture)

### Invoice Header
| Field | Required | Source | Notes |
|-------|----------|--------|-------|
| Invoice Number | Yes | Auto-generated | Format: sequential-premises-device |
| Issue Date | Yes | User selects | Default: today |
| Issue Time | Yes | Auto | Generated on creation |
| Due Date | Optional | User selects | Default: +30 days |
| Currency | Yes | Fixed | EUR (Croatia adopted Euro) |
| Invoice Type | Yes | Fixed | 380 (commercial invoice) |
| Buyer Reference | Optional | User input | PO number, contract ref |

### Supplier Party (from Company settings)
| Field | Required | Source |
|-------|----------|--------|
| OIB | Yes | Company.oib |
| Name | Yes | Company.name |
| Street Address | Yes | Company.address |
| City | Yes | Company.city |
| Postal Code | Yes | Company.zipCode |
| Country Code | Yes | Company.country |
| VAT Number | Conditional | Company.vatNumber (if VAT payer) |
| IBAN | Yes for B2B | Company.iban |

### Customer Party (from Contact selection)
| Field | Required | Source |
|-------|----------|--------|
| OIB | Yes for HR B2B | Contact.oib |
| Name | Yes | Contact.name |
| Street Address | Yes | Contact.address |
| City | Yes | Contact.city |
| Postal Code | Yes | Contact.zipCode |
| Country Code | Yes | Contact.country |
| VAT Number | Conditional | Derived from OIB |

### Invoice Lines
| Field | Required | Source |
|-------|----------|--------|
| Line ID | Yes | Auto (sequential) |
| Description | Yes | User input / Product.name |
| Quantity | Yes | User input |
| Unit Code | Yes | User selects (HUR, DAY, C62, etc.) |
| Unit Price | Yes | User input / Product.price |
| VAT Rate | Yes | User selects (25%, 13%, 5%, 0%) |
| VAT Category | Yes | S, AA, E, Z, O |
| Line Total | Yes | Calculated |

---

## Task 1: Update Database Schema

**Files:**
- Modify: `packages/db/prisma/schema/company.prisma`
- Modify: `packages/db/prisma/schema/invoice.prisma`

**Step 1: Add e-invoice settings to Company**

Add to `company.prisma`:
```prisma
model Company {
  // ... existing fields ...

  // E-Invoice settings (Phase 1)
  eInvoiceProvider        String?   // "e-poslovanje" | "mock" | null
  eInvoiceApiKeyEncrypted String?   // AES-256-GCM encrypted API key
  eInvoiceEnabled         Boolean   @default(false)
}
```

**Step 2: Enhance Invoice model for e-invoice tracking**

Add to `invoice.prisma`:
```prisma
model Invoice {
  // ... existing fields ...

  // E-invoice provider tracking
  eInvoiceProviderRef   String?   // Provider's document ID
  eInvoiceProviderData  Json?     // Full provider response
  eInvoiceSentAt        DateTime?
  eInvoiceDeliveredAt   DateTime?

  // Buyer reference for e-invoice (PO number, etc.)
  buyerReference        String?
}
```

**Step 3: Add unit field to InvoiceLine**

```prisma
model InvoiceLine {
  // ... existing fields ...
  unit        String   @default("C62")  // UN/CEFACT code
  vatCategory String   @default("S")    // S, AA, E, Z, O
}
```

**Step 4: Run migration**

```bash
cd packages/db && pnpm prisma migrate dev --name add-einvoice-fields
```

**Step 5: Generate client**

```bash
pnpm db:generate
```

**Step 6: Commit**

```bash
git add packages/db/prisma/
git commit -m "feat(db): add e-invoice fields to Company and Invoice models"
```

---

## Task 2: Create E-Invoice Validation Schema

**Files:**
- Create: `packages/shared/src/schemas/e-invoice.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Write the e-invoice line schema**

```typescript
// packages/shared/src/schemas/e-invoice.ts
import { z } from "zod"

// UN/CEFACT unit codes used in Croatia
export const UNIT_CODES = {
  C62: "kom",     // Piece/item
  HUR: "sat",     // Hour
  DAY: "dan",     // Day
  MON: "mj",      // Month
  KGM: "kg",      // Kilogram
  MTR: "m",       // Meter
  LTR: "L",       // Liter
  MTK: "m²",      // Square meter
  MTQ: "m³",      // Cubic meter
} as const

export const VAT_CATEGORIES = {
  S: "Standardna stopa",    // Standard rate
  AA: "Snižena stopa",      // Reduced rate
  E: "Oslobođeno",          // Exempt
  Z: "Nulta stopa",         // Zero rate
  O: "Izvan PDV-a",         // Outside scope
} as const

export const VAT_RATES = [25, 13, 5, 0] as const
```

**Step 2: Write the line item schema**

```typescript
export const eInvoiceLineSchema = z.object({
  description: z.string().min(1, "Opis je obavezan"),
  quantity: z.number().positive("Količina mora biti pozitivna"),
  unit: z.enum(Object.keys(UNIT_CODES) as [string, ...string[]]).default("C62"),
  unitPrice: z.number().min(0, "Cijena ne može biti negativna"),
  vatRate: z.number().refine((v) => VAT_RATES.includes(v as typeof VAT_RATES[number]), {
    message: "Nevažeća stopa PDV-a",
  }).default(25),
  vatCategory: z.enum(["S", "AA", "E", "Z", "O"]).default("S"),
  productId: z.string().optional(), // Link to product catalog
})

export type EInvoiceLineInput = z.infer<typeof eInvoiceLineSchema>
```

**Step 3: Write the full e-invoice schema**

```typescript
export const eInvoiceSchema = z.object({
  // Buyer selection
  contactId: z.string().min(1, "Kupac je obavezan"),

  // Dates
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),

  // Optional fields
  buyerReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),

  // Line items
  lines: z.array(eInvoiceLineSchema).min(1, "Potrebna je najmanje jedna stavka"),
}).refine((data) => {
  if (data.dueDate && data.issueDate) {
    return data.dueDate >= data.issueDate
  }
  return true
}, {
  message: "Datum dospijeća mora biti nakon datuma izdavanja",
  path: ["dueDate"],
})

export type EInvoiceInput = z.infer<typeof eInvoiceSchema>
```

**Step 4: Export from index**

Add to `packages/shared/src/index.ts`:
```typescript
export * from "./schemas/e-invoice"
```

**Step 5: Verify types**

```bash
pnpm typecheck
```

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add e-invoice Zod validation schemas"
```

---

## Task 3: Create E-Invoice tRPC Router

**Files:**
- Create: `packages/trpc/src/routers/einvoice.ts`
- Modify: `packages/trpc/src/routers/index.ts`

**Step 1: Create the router file**

```typescript
// packages/trpc/src/routers/einvoice.ts
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../trpc"
import { eInvoiceSchema } from "@fiskai/shared"

export const einvoiceRouter = router({
  // Get contacts for buyer selection
  getBuyers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.contact.findMany({
      where: {
        companyId: ctx.company.id,
        type: { in: ["CUSTOMER", "BOTH"] },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        oib: true,
        address: true,
        city: true,
        zipCode: true,
        country: true,
      },
    })
  }),

  // Get products for line item suggestions
  getProducts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.product.findMany({
      where: {
        companyId: ctx.company.id,
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        unit: true,
        vatRate: true,
        vatCategory: true,
      },
    })
  }),

  // Create draft e-invoice
  createDraft: protectedProcedure
    .input(eInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Get next invoice number
      const year = new Date().getFullYear()
      const premises = await ctx.db.businessPremises.findFirst({
        where: { companyId: ctx.company.id, isActive: true },
        include: { paymentDevices: { where: { isActive: true }, take: 1 } },
      })

      if (!premises || !premises.paymentDevices[0]) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Poslovni prostor nije konfiguriran",
        })
      }

      const device = premises.paymentDevices[0]

      // Get or create sequence
      const sequence = await ctx.db.invoiceSequence.upsert({
        where: {
          companyId_businessPremisesId_paymentDeviceId_year: {
            companyId: ctx.company.id,
            businessPremisesId: premises.id,
            paymentDeviceId: device.id,
            year,
          },
        },
        create: {
          companyId: ctx.company.id,
          businessPremisesId: premises.id,
          paymentDeviceId: device.id,
          year,
          lastNumber: 0,
        },
        update: {},
      })

      const nextNumber = sequence.lastNumber + 1
      const invoiceNumberFull = `${nextNumber}-${premises.code}-${device.code}`

      // Calculate totals
      const lines = input.lines.map((line, index) => {
        const lineTotal = Math.round(line.quantity * line.unitPrice * 100)
        const vatAmount = Math.round(lineTotal * (line.vatRate / 100))
        return {
          sortOrder: index,
          description: line.description,
          quantity: Math.round(line.quantity * 100),
          unitPrice: Math.round(line.unitPrice * 100),
          unit: line.unit,
          vatRate: line.vatRate,
          vatCategory: line.vatCategory,
          lineTotalCents: lineTotal,
          vatAmountCents: vatAmount,
        }
      })

      const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0)
      const vatAmountCents = lines.reduce((sum, l) => sum + l.vatAmountCents, 0)
      const totalCents = subtotalCents + vatAmountCents

      // Create invoice with lines in transaction
      const invoice = await ctx.db.$transaction(async (tx) => {
        await tx.invoiceSequence.update({
          where: { id: sequence.id },
          data: { lastNumber: nextNumber },
        })

        return tx.invoice.create({
          data: {
            companyId: ctx.company.id,
            businessPremisesId: premises.id,
            paymentDeviceId: device.id,
            contactId: input.contactId,
            invoiceNumber: nextNumber,
            invoiceNumberFull,
            year,
            status: "DRAFT",
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            buyerReference: input.buyerReference,
            notes: input.notes,
            subtotalCents,
            vatAmountCents,
            totalCents,
            currency: "EUR",
            lines: {
              create: lines,
            },
          },
          include: {
            contact: true,
            lines: { orderBy: { sortOrder: "asc" } },
          },
        })
      })

      return invoice
    }),

  // Get invoice by ID for review/edit
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: {
          id: input,
          companyId: ctx.company.id,
        },
        include: {
          contact: true,
          lines: { orderBy: { sortOrder: "asc" } },
          businessPremises: true,
          paymentDevice: true,
        },
      })

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Račun nije pronađen",
        })
      }

      return invoice
    }),

  // Send e-invoice
  send: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: invoiceId }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: {
          id: invoiceId,
          companyId: ctx.company.id,
          status: { in: ["DRAFT", "ISSUED"] },
        },
        include: {
          contact: true,
          lines: true,
          company: true,
        },
      })

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Račun nije pronađen ili nije u statusu za slanje",
        })
      }

      if (!invoice.contact?.oib) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kupac mora imati OIB za slanje e-računa",
        })
      }

      // TODO: Generate UBL XML
      // TODO: Send via e-Poslovanje provider
      // TODO: Update invoice status and provider ref

      return { success: true, invoiceId }
    }),
})
```

**Step 2: Add to root router**

```typescript
// packages/trpc/src/routers/index.ts
import { einvoiceRouter } from "./einvoice"

export const appRouter = router({
  // ... existing routers ...
  einvoice: einvoiceRouter,
})
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add packages/trpc/
git commit -m "feat(trpc): add e-invoice router with draft creation"
```

---

## Task 4: Create Invoice Form - Step 1 (Buyer Selection)

**Files:**
- Create: `apps/web/src/components/einvoice/EInvoiceWizard.tsx`
- Create: `apps/web/src/components/einvoice/steps/BuyerStep.tsx`
- Create: `apps/web/src/app/(app)/invoices/new/page.tsx`

**Step 1: Create the wizard container**

```typescript
// apps/web/src/components/einvoice/EInvoiceWizard.tsx
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { BuyerStep } from "./steps/BuyerStep"
import { ItemsStep } from "./steps/ItemsStep"
import { ReviewStep } from "./steps/ReviewStep"
import type { EInvoiceInput, EInvoiceLineInput } from "@fiskai/shared"

const STEPS = [
  { id: "buyer", label: "Kupac", number: 1 },
  { id: "items", label: "Stavke", number: 2 },
  { id: "review", label: "Pregled", number: 3 },
] as const

type StepId = typeof STEPS[number]["id"]

interface WizardState {
  contactId: string
  buyerReference: string
  issueDate: Date
  dueDate: Date | undefined
  notes: string
  lines: EInvoiceLineInput[]
}

const initialState: WizardState = {
  contactId: "",
  buyerReference: "",
  issueDate: new Date(),
  dueDate: undefined,
  notes: "",
  lines: [],
}

export function EInvoiceWizard() {
  const [currentStep, setCurrentStep] = useState<StepId>("buyer")
  const [formData, setFormData] = useState<WizardState>(initialState)

  const updateFormData = useCallback((updates: Partial<WizardState>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((step: StepId) => {
    setCurrentStep(step)
  }, [])

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isCompleted && goToStep(step.id)}
                  disabled={!isCompleted}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all",
                    isActive && "border-cyan-500 bg-cyan-500/20 text-cyan-400",
                    isCompleted && "border-emerald-500 bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30",
                    !isActive && !isCompleted && "border-white/20 bg-white/5 text-white/40"
                  )}
                >
                  {isCompleted ? "✓" : step.number}
                </button>
                <span
                  className={cn(
                    "ml-3 text-sm font-medium hidden sm:block",
                    isActive && "text-cyan-400",
                    isCompleted && "text-emerald-400",
                    !isActive && !isCompleted && "text-white/40"
                  )}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-0.5 w-12 sm:w-24 lg:w-32",
                      index < currentStepIndex ? "bg-emerald-500" : "bg-white/10"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {currentStep === "buyer" && (
            <motion.div
              key="buyer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <BuyerStep
                data={formData}
                onUpdate={updateFormData}
                onNext={() => goToStep("items")}
              />
            </motion.div>
          )}
          {currentStep === "items" && (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ItemsStep
                data={formData}
                onUpdate={updateFormData}
                onBack={() => goToStep("buyer")}
                onNext={() => goToStep("review")}
              />
            </motion.div>
          )}
          {currentStep === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ReviewStep
                data={formData}
                onBack={() => goToStep("items")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Step 2: Create BuyerStep component**

```typescript
// apps/web/src/components/einvoice/steps/BuyerStep.tsx
"use client"

import { useState } from "react"
import { Search, User, Building2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"
import type { EInvoiceLineInput } from "@fiskai/shared"

interface BuyerStepProps {
  data: {
    contactId: string
    buyerReference: string
    issueDate: Date
    dueDate: Date | undefined
  }
  onUpdate: (updates: Partial<BuyerStepProps["data"]>) => void
  onNext: () => void
}

export function BuyerStep({ data, onUpdate, onNext }: BuyerStepProps) {
  const [search, setSearch] = useState("")
  const { data: buyers, isLoading } = trpc.einvoice.getBuyers.useQuery()

  const filteredBuyers = buyers?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.oib?.includes(search)
  )

  const selectedBuyer = buyers?.find((b) => b.id === data.contactId)

  const canProceed = !!data.contactId

  const inputClasses = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white",
    "placeholder:text-white/30",
    "focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
    "transition-colors"
  )

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Odaberi kupca</h2>
      <p className="text-white/60 mb-6">Odaberite kupca iz postojećih kontakata</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Pretraži po nazivu ili OIB-u..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(inputClasses, "pl-10")}
        />
      </div>

      {/* Buyer List */}
      <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
        {isLoading ? (
          <div className="text-center py-8 text-white/40">Učitavanje...</div>
        ) : filteredBuyers?.length === 0 ? (
          <div className="text-center py-8 text-white/40">Nema pronađenih kontakata</div>
        ) : (
          filteredBuyers?.map((buyer) => {
            const isSelected = data.contactId === buyer.id
            return (
              <button
                key={buyer.id}
                onClick={() => onUpdate({ contactId: buyer.id })}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isSelected ? "bg-cyan-500/20" : "bg-white/10"
                )}>
                  {buyer.oib ? (
                    <Building2 className={cn("h-5 w-5", isSelected ? "text-cyan-400" : "text-white/50")} />
                  ) : (
                    <User className={cn("h-5 w-5", isSelected ? "text-cyan-400" : "text-white/50")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium truncate", isSelected ? "text-cyan-400" : "text-white")}>
                    {buyer.name}
                  </div>
                  <div className="text-sm text-white/50 truncate">
                    {buyer.oib && <span>OIB: {buyer.oib}</span>}
                    {buyer.oib && buyer.city && <span> · </span>}
                    {buyer.city && <span>{buyer.city}</span>}
                  </div>
                </div>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Additional Fields */}
      {selectedBuyer && (
        <div className="space-y-4 mb-6 pt-4 border-t border-white/10">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Referenca kupca (opcionalno)
            </label>
            <input
              type="text"
              value={data.buyerReference}
              onChange={(e) => onUpdate({ buyerReference: e.target.value })}
              placeholder="Broj narudžbe, ugovor..."
              className={inputClasses}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Datum izdavanja
              </label>
              <input
                type="date"
                value={data.issueDate.toISOString().split("T")[0]}
                onChange={(e) => onUpdate({ issueDate: new Date(e.target.value) })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Datum dospijeća
              </label>
              <input
                type="date"
                value={data.dueDate?.toISOString().split("T")[0] || ""}
                onChange={(e) => onUpdate({
                  dueDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className={inputClasses}
              />
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all",
            canProceed
              ? "bg-cyan-500 text-white hover:bg-cyan-400"
              : "bg-white/10 text-white/40 cursor-not-allowed"
          )}
        >
          Dalje
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
```

**Step 3: Create placeholder components for remaining steps**

Create `apps/web/src/components/einvoice/steps/ItemsStep.tsx` and `ReviewStep.tsx` with basic placeholders.

**Step 4: Create the page**

```typescript
// apps/web/src/app/(app)/invoices/new/page.tsx
import { EInvoiceWizard } from "@/components/einvoice/EInvoiceWizard"

export default function NewInvoicePage() {
  return <EInvoiceWizard />
}
```

**Step 5: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

**Step 6: Commit**

```bash
git add apps/web/src/components/einvoice/ apps/web/src/app/\(app\)/invoices/new/
git commit -m "feat(ui): add e-invoice wizard with buyer selection step"
```

---

## Task 5: Create Invoice Form - Step 2 (Line Items)

**Files:**
- Create: `apps/web/src/components/einvoice/steps/ItemsStep.tsx`
- Create: `apps/web/src/components/einvoice/LineItemRow.tsx`

**Step 1: Create the LineItemRow component**

The line item row should include:
- Description (textarea with auto-resize)
- Quantity (number input)
- Unit selector (dropdown: HUR, DAY, C62, etc.)
- Unit price (number input)
- VAT rate selector (25%, 13%, 5%, 0%)
- Calculated line total
- Delete button

**Step 2: Create the ItemsStep component**

Features:
- Add line button
- Product suggestion search
- Running total display
- Validation feedback

**Step 3: Test manually**

**Step 4: Commit**

```bash
git add apps/web/src/components/einvoice/
git commit -m "feat(ui): add line items step with product suggestions"
```

---

## Task 6: Create Invoice Form - Step 3 (Review & Send)

**Files:**
- Create: `apps/web/src/components/einvoice/steps/ReviewStep.tsx`
- Create: `apps/web/src/components/einvoice/InvoicePreview.tsx`

**Step 1: Create InvoicePreview component**

Shows:
- Seller info (from company settings)
- Buyer info (from selected contact)
- Line items table
- Tax summary
- Totals

**Step 2: Create ReviewStep component**

Features:
- Invoice preview
- Notes field
- "Save as Draft" button
- "Send E-Invoice" button
- Validation errors display

**Step 3: Implement send mutation**

**Step 4: Test complete flow**

**Step 5: Commit**

```bash
git add apps/web/src/components/einvoice/
git commit -m "feat(ui): add review step with invoice preview and send"
```

---

## Task 7: Update UBL Generator for CIUS-2025

**Files:**
- Modify: `packages/einvoice-lab/src/ubl/ubl-generator.ts`
- Create: `packages/einvoice-lab/src/ubl/__tests__/ubl-generator.test.ts`

**Step 1: Write test against golden fixture**

```typescript
import { test, expect } from "vitest"
import { generateUBLInvoice } from "../ubl-generator"
import { readFileSync } from "fs"
import { join } from "path"

const goldenXml = readFileSync(
  join(__dirname, "../../fixtures/golden-invoice-194571.xml"),
  "utf-8"
)

test("generates valid CIUS-2025 UBL invoice", () => {
  const invoice = {
    // ... test fixture matching golden data
  }

  const xml = generateUBLInvoice(invoice)

  // Check required elements
  expect(xml).toContain("urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.hr:cius-2025:1.0")
  expect(xml).toContain('schemeID="9934"')
  expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>")
})
```

**Step 2: Update CustomizationID and ProfileID**

```typescript
const CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.hr:cius-2025:1.0#conformant#urn:mfin.gov.hr:ext-2025:1.0"
const PROFILE_ID = "P1"
```

**Step 3: Update EndpointID to use schemeID="9934"**

**Step 4: Add IssueTime generation**

**Step 5: Run tests**

```bash
pnpm test packages/einvoice-lab
```

**Step 6: Commit**

```bash
git add packages/einvoice-lab/
git commit -m "fix(ubl): update generator for CIUS-2025 compliance"
```

---

## Task 8: Integrate E-Poslovanje Provider

**Files:**
- Copy: `packages/einvoice-lab/src/providers/eposlovanje.ts` → `packages/trpc/src/lib/eposlovanje.ts`
- Modify: `packages/trpc/src/routers/einvoice.ts`

**Step 1: Copy and adapt provider**

**Step 2: Add decryption for API key**

```typescript
import { decryptSecret } from "@/lib/crypto"

async function getProvider(company: Company) {
  if (!company.eInvoiceApiKeyEncrypted) {
    throw new Error("E-invoice API key not configured")
  }

  const apiKey = decryptSecret(company.eInvoiceApiKeyEncrypted)
  return new EPoslovanjeProvider({
    apiKey,
    apiUrl: process.env.EPOSLOVANJE_API_BASE || "https://test.eposlovanje.hr",
  })
}
```

**Step 3: Implement send mutation**

**Step 4: Test with mock**

**Step 5: Commit**

```bash
git add packages/trpc/
git commit -m "feat(trpc): integrate e-Poslovanje provider for invoice sending"
```

---

## Task 9: Add E-Invoice Settings UI

**Files:**
- Create: `apps/web/src/app/(app)/settings/einvoice/page.tsx`
- Create: `apps/web/src/components/settings/EInvoiceSettings.tsx`

**Step 1: Create settings page**

Features:
- Provider selection (e-Poslovanje / Mock)
- API key input (masked)
- Connection test button
- Enable/disable toggle

**Step 2: Create server action for saving settings**

**Step 3: Add link to navigation**

**Step 4: Test settings flow**

**Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat(ui): add e-invoice settings page with connection test"
```

---

## Task 10: End-to-End Testing

**Files:**
- Create: `apps/web/src/__tests__/einvoice-flow.test.ts`

**Step 1: Write integration test**

Test complete flow:
1. Select buyer
2. Add line items
3. Review invoice
4. Save as draft
5. Send e-invoice (mock)

**Step 2: Test with real e-Poslovanje test environment**

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add .
git commit -m "test(e2e): add e-invoice flow integration tests"
```

---

## Verification Checklist

Before marking complete:

- [ ] Database migrations applied successfully
- [ ] All TypeScript types compile
- [ ] Lint passes with no errors
- [ ] All tests pass
- [ ] Buyer selection works with search
- [ ] Line items can be added/removed
- [ ] Product suggestions work
- [ ] Totals calculate correctly
- [ ] Invoice preview shows all data
- [ ] Draft saving works
- [ ] E-invoice sending works (mock mode)
- [ ] Settings page allows configuration
- [ ] Connection test works
- [ ] Mobile responsive (375px minimum)
- [ ] Croatian language throughout UI

---

## Dependencies

This plan requires:
- Existing Company, Contact, Product models
- Existing authentication/authorization
- Existing glass-card UI patterns
- E-Poslovanje API credentials (test environment)
