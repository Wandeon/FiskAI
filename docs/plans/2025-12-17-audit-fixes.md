# Audit Fixes Implementation Plan

**Created:** 2025-12-17
**Issues:** #62, #63, #64, #65
**Priority:** Security → Infrastructure → Architecture → UI

---

## Overview

This plan addresses 4 issues from the codebase audit:

1. **#62 (CRITICAL)**: Missing RBAC permission checks in delete actions
2. **#64 (HIGH)**: Missing Docker HEALTHCHECK
3. **#65 (MEDIUM)**: Loopback HTTP calls for PDF generation
4. **#63 (LOW)**: Custom Combobox needs Radix replacement

---

## Task 1: RBAC Permission Enforcement (Issue #62)

**Priority:** CRITICAL - Security vulnerability
**Risk:** Low (well-defined pattern exists)
**Files:** 3

### Problem

Delete functions use `requireCompanyWithContext` which only checks company membership, not role permissions. Any company member can delete contacts, products, and invoices.

### Solution

Replace `requireCompanyWithContext` with `requireCompanyWithPermission` and specify the required permission.

### Changes

#### 1.1 `src/app/actions/contact.ts`

**Current (line 57-76):**

```typescript
export async function deleteContact(contactId: string) {
  const user = await requireAuth()
  return requireCompanyWithContext(user.id!, async () => {
    const contact = await db.contact.findFirst({
      where: { id: contactId },
    })
    if (!contact) {
      return { error: "Contact not found" }
    }
    await db.contact.delete({
      where: { id: contactId },
    })
    revalidatePath("/contacts")
    return { success: "Contact deleted" }
  })
}
```

**New:**

```typescript
export async function deleteContact(contactId: string) {
  const user = await requireAuth()
  return requireCompanyWithPermission(user.id!, "contact:delete", async () => {
    const contact = await db.contact.findFirst({
      where: { id: contactId },
    })
    if (!contact) {
      return { error: "Contact not found" }
    }
    await db.contact.delete({
      where: { id: contactId },
    })
    revalidatePath("/contacts")
    return { success: "Contact deleted" }
  })
}
```

**Import change:** Add `requireCompanyWithPermission` to imports from `@/lib/auth-utils`

#### 1.2 `src/app/actions/product.ts`

**Current (line 109-128):**

```typescript
export async function deleteProduct(productId: string) {
  const user = await requireAuth()
  return requireCompanyWithContext(user.id!, async () => {
    const product = await db.product.findFirst({
      where: { id: productId },
    })
    if (!product) {
      return { error: "Product not found" }
    }
    await db.product.delete({
      where: { id: productId },
    })
    revalidatePath("/products")
    return { success: "Product deleted" }
  })
}
```

**New:**

```typescript
export async function deleteProduct(productId: string) {
  const user = await requireAuth()
  return requireCompanyWithPermission(user.id!, "product:delete", async () => {
    const product = await db.product.findFirst({
      where: { id: productId },
    })
    if (!product) {
      return { error: "Product not found" }
    }
    await db.product.delete({
      where: { id: productId },
    })
    revalidatePath("/products")
    return { success: "Product deleted" }
  })
}
```

**Import change:** Add `requireCompanyWithPermission` to imports from `@/lib/auth-utils`

#### 1.3 `src/app/actions/e-invoice.ts`

**Current (line 290-312):**

```typescript
export async function deleteEInvoice(invoiceId: string) {
  const user = await requireAuth()
  return requireCompanyWithContext(user.id!, async () => {
    // ... deletion logic
  })
}
```

**New:**

```typescript
export async function deleteEInvoice(invoiceId: string) {
  const user = await requireAuth()
  return requireCompanyWithPermission(user.id!, "invoice:delete", async () => {
    // ... deletion logic (unchanged)
  })
}
```

**Import change:** Add `requireCompanyWithPermission` to imports from `@/lib/auth-utils`

### Verification

```bash
npm run build
# Test: Login as MEMBER role, attempt to delete contact → should fail with permission error
# Test: Login as OWNER role, attempt to delete contact → should succeed
```

---

## Task 2: Docker HEALTHCHECK (Issue #64)

**Priority:** HIGH - Infrastructure reliability
**Risk:** Very low
**Files:** 1

### Problem

Dockerfile lacks HEALTHCHECK instruction. Container orchestrators can't determine if the app is healthy.

### Solution

Add HEALTHCHECK that pings the existing `/api/health` endpoint.

### Changes

#### 2.1 `Dockerfile`

**Add after CMD instruction:**

```dockerfile
# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
```

### Verification

```bash
docker build -t fiskai-test .
docker run -d --name fiskai-health-test fiskai-test
docker inspect --format='{{.State.Health.Status}}' fiskai-health-test
# Should show "healthy" after ~40 seconds
docker rm -f fiskai-health-test
```

---

## Task 3: Remove Loopback HTTP Calls (Issue #65)

**Priority:** MEDIUM - Architecture improvement
**Risk:** Medium (touches PDF generation)
**Files:** 2-3

### Problem

`sendInvoiceEmail` in `e-invoice.ts` makes HTTP request to its own `/api/invoices/[id]/pdf` endpoint:

```typescript
const pdfResponse = await fetch(`${baseUrl}/api/invoices/${invoiceId}/pdf`, {
  headers: { Cookie: `next-auth.session-token=${sessionToken}` },
})
```

This is fragile (needs session token, network overhead, can fail in certain deployments).

### Solution

Extract PDF generation to a shared module and call it directly.

### Changes

#### 3.1 Create `src/lib/pdf/invoice-pdf.ts`

Extract the PDF generation logic from `/api/invoices/[id]/pdf/route.ts` into a reusable function:

```typescript
import { db } from "@/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDFDocument } from "@/components/pdf/InvoicePDF"

export interface GenerateInvoicePDFOptions {
  invoiceId: string
  companyId: string
}

export async function generateInvoicePDF({ invoiceId, companyId }: GenerateInvoicePDFOptions): Promise<Buffer> {
  // Fetch invoice with all relations
  const invoice = await db.eInvoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      company: true,
      contact: true,
      items: { include: { product: true } },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  // Generate PDF buffer
  const pdfBuffer = await renderToBuffer(
    <InvoicePDFDocument invoice={invoice} />
  )

  return Buffer.from(pdfBuffer)
}
```

#### 3.2 Update `src/app/api/invoices/[id]/pdf/route.ts`

Use the shared function:

```typescript
import { generateInvoicePDF } from "@/lib/pdf/invoice-pdf"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // ... auth check ...

  const pdfBuffer = await generateInvoicePDF({
    invoiceId: params.id,
    companyId: company.id,
  })

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${params.id}.pdf"`,
    },
  })
}
```

#### 3.3 Update `src/app/actions/e-invoice.ts` - `sendInvoiceEmail`

Replace loopback fetch with direct call:

```typescript
import { generateInvoicePDF } from "@/lib/pdf/invoice-pdf"

// In sendInvoiceEmail function, replace:
// const pdfResponse = await fetch(`${baseUrl}/api/invoices/${invoiceId}/pdf`, {...})
// const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

// With:
const pdfBuffer = await generateInvoicePDF({
  invoiceId,
  companyId: company.id,
})
```

### Verification

```bash
npm run build
# Test: Send invoice email, verify PDF attachment works
```

---

## Task 4: Replace Custom Combobox (Issue #63)

**Priority:** LOW - UI/UX improvement
**Risk:** Medium (UI component used across app)
**Files:** 2+

### Problem

Custom `combobox.tsx` has:

- Hardcoded colors (gray-200, blue-50, blue-100) instead of design tokens
- `setTimeout` blur hack that causes race conditions
- Missing proper accessibility attributes

### Solution

Replace with Radix UI Combobox or use existing patterns from the codebase.

### Changes

#### 4.1 Install Radix UI Popover (if not installed)

```bash
npm install @radix-ui/react-popover
```

#### 4.2 Rewrite `src/components/ui/combobox.tsx`

Use Radix primitives with CVA design tokens:

```typescript
"use client"

import * as React from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md",
            "border border-white/10 bg-white/5 px-3 py-2",
            "text-sm text-white placeholder:text-white/40",
            "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] rounded-md",
            "border border-white/10 bg-gray-900 p-1 shadow-xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
          sideOffset={4}
        >
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-md border-0 bg-white/5 px-3 py-2 mb-1",
              "text-sm text-white placeholder:text-white/40",
              "focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            )}
          />
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-white/50">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2",
                    "text-sm text-white hover:bg-white/10",
                    value === option.value && "bg-blue-500/20"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

### Verification

```bash
npm run build
# Visual test: Navigate to pages using Combobox, verify styling matches design system
# Test: Keyboard navigation works (arrow keys, enter, escape)
```

---

## Execution Order

1. **Task 1: RBAC** - Fix security vulnerabilities first
2. **Task 2: HEALTHCHECK** - Quick infrastructure win
3. **Task 3: Loopback removal** - Architecture cleanup
4. **Task 4: Combobox** - UI polish last

## Post-Implementation

- [ ] Close GitHub issues #62, #63, #64, #65
- [ ] Run full build verification
- [ ] Deploy to Coolify
