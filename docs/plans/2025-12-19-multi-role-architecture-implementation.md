# Multi-Role Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split FiskAI into three subdomain-based portals (admin, staff, app) with module-based access control.

**Architecture:** Subdomain routing via Next.js middleware, systemRole field for portal access, StaffAssignment table for accountant-client relationships, 16-module entitlement system controlling feature visibility.

**Tech Stack:** Next.js 15 App Router, Prisma 7, NextAuth v5, TypeScript, Tailwind CSS

**Reference Design:** `docs/plans/2025-12-19-multi-role-architecture-design.md`

---

## Phase 1: Database Schema Foundation

### Task 1.1: Add SystemRole Enum to Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add the SystemRole enum**

Add after the existing `Role` enum:

```prisma
enum SystemRole {
  USER   // Regular clients
  STAFF  // Internal accountants
  ADMIN  // Platform owner
}
```

**Step 2: Add systemRole field to User model**

In the `User` model, add:

```prisma
model User {
  // ... existing fields after image
  systemRole    SystemRole @default(USER)

  // ... rest of model
}
```

**Step 3: Verify schema is valid**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add SystemRole enum and user.systemRole field"
```

---

### Task 1.2: Create StaffAssignment Table

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add StaffAssignment model**

Add after the `CompanyUser` model:

```prisma
model StaffAssignment {
  id          String   @id @default(cuid())
  staffId     String
  companyId   String
  assignedAt  DateTime @default(now())
  assignedBy  String
  notes       String?

  staff       User     @relation("StaffAssignments", fields: [staffId], references: [id], onDelete: Cascade)
  company     Company  @relation("AssignedStaff", fields: [companyId], references: [id], onDelete: Cascade)
  assigner    User     @relation("AssignmentsMade", fields: [assignedBy], references: [id])

  @@unique([staffId, companyId])
  @@index([staffId])
  @@index([companyId])
}
```

**Step 2: Add relations to User model**

Add these relations to the `User` model:

```prisma
  // Staff assignment relations
  staffAssignments    StaffAssignment[] @relation("StaffAssignments")
  assignmentsMade     StaffAssignment[] @relation("AssignmentsMade")
```

**Step 3: Add relation to Company model**

Add to the `Company` model:

```prisma
  assignedStaff       StaffAssignment[] @relation("AssignedStaff")
```

**Step 4: Verify schema**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add StaffAssignment table for accountant-client relationships"
```

---

### Task 1.3: Add TicketCategory Enum and Update SupportTicket

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add TicketCategory enum**

```prisma
enum TicketCategory {
  TECHNICAL   // Routes to admin
  BILLING     // Routes to admin
  ACCOUNTING  // Routes to assigned staff
  GENERAL     // Routes to admin (default)
}
```

**Step 2: Add category field to SupportTicket model**

Find the `SupportTicket` model and add:

```prisma
  category    TicketCategory @default(GENERAL)
```

**Step 3: Verify schema**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add TicketCategory enum for support ticket routing"
```

---

### Task 1.4: Update Default Entitlements on Company

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Update entitlements default value**

Find the `entitlements` field in the `Company` model and ensure it has the new module keys:

```prisma
  entitlements    String[]  @default(["invoicing", "e-invoicing", "contacts", "products", "expenses", "reports-basic", "documents"])
```

**Step 2: Verify schema**

Run: `cd /home/admin/FiskAI && npx prisma validate`
Expected: "The schema is valid!"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): update default entitlements with module keys"
```

---

### Task 1.5: Generate and Run Migration

**Files:**

- Create: `prisma/migrations/[timestamp]_multi_role_architecture/migration.sql`

**Step 1: Generate migration**

Run: `cd /home/admin/FiskAI && npx prisma migrate dev --name multi_role_architecture`
Expected: Migration created successfully

**Step 2: Verify migration applied**

Run: `cd /home/admin/FiskAI && npx prisma migrate status`
Expected: All migrations applied

**Step 3: Generate Prisma client**

Run: `cd /home/admin/FiskAI && npx prisma generate`
Expected: Prisma Client generated

**Step 4: Commit**

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(db): run multi_role_architecture migration"
```

---

### Task 1.6: Set Admin User systemRole

**Files:**

- Create: `scripts/set-admin-role.ts`

**Step 1: Create the script**

```typescript
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []

  if (adminEmails.length === 0) {
    console.log("No ADMIN_EMAILS configured")
    return
  }

  const result = await prisma.user.updateMany({
    where: {
      email: { in: adminEmails },
    },
    data: {
      systemRole: "ADMIN",
    },
  })

  console.log(`Updated ${result.count} users to ADMIN role`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2: Run the script**

Run: `cd /home/admin/FiskAI && npx tsx scripts/set-admin-role.ts`
Expected: "Updated 1 users to ADMIN role"

**Step 3: Commit**

```bash
git add scripts/set-admin-role.ts
git commit -m "feat(scripts): add set-admin-role script"
```

---

## Phase 2: Module System

### Task 2.1: Create Module Definitions

**Files:**

- Create: `src/lib/modules/definitions.ts`

**Step 1: Write the module definitions**

```typescript
export const MODULE_KEYS = [
  "invoicing",
  "e-invoicing",
  "fiscalization",
  "contacts",
  "products",
  "expenses",
  "banking",
  "reconciliation",
  "reports-basic",
  "reports-advanced",
  "pausalni",
  "vat",
  "corporate-tax",
  "pos",
  "documents",
  "ai-assistant",
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

export interface ModuleDefinition {
  key: ModuleKey
  name: string
  description: string
  routes: string[]
  navItems: string[]
  defaultEnabled: boolean
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  invoicing: {
    key: "invoicing",
    name: "Invoicing",
    description: "Create and manage invoices, quotes, proformas",
    routes: ["/invoices", "/invoices/new", "/invoices/[id]"],
    navItems: ["invoices"],
    defaultEnabled: true,
  },
  "e-invoicing": {
    key: "e-invoicing",
    name: "E-Invoicing",
    description: "Electronic invoices with UBL/XML support",
    routes: ["/e-invoices", "/e-invoices/new", "/e-invoices/[id]"],
    navItems: ["e-invoices"],
    defaultEnabled: true,
  },
  fiscalization: {
    key: "fiscalization",
    name: "Fiscalization",
    description: "Fiscal receipts, JIR/ZKI, CIS integration",
    routes: ["/settings/fiscalisation", "/settings/premises"],
    navItems: ["fiscalization"],
    defaultEnabled: false,
  },
  contacts: {
    key: "contacts",
    name: "Contacts",
    description: "Customer and supplier management",
    routes: ["/contacts", "/contacts/new", "/contacts/[id]"],
    navItems: ["contacts"],
    defaultEnabled: true,
  },
  products: {
    key: "products",
    name: "Products",
    description: "Product catalog and pricing",
    routes: ["/products", "/products/new", "/products/[id]"],
    navItems: ["products"],
    defaultEnabled: true,
  },
  expenses: {
    key: "expenses",
    name: "Expenses",
    description: "Expense tracking and categories",
    routes: ["/expenses", "/expenses/new", "/expenses/[id]", "/expenses/categories"],
    navItems: ["expenses"],
    defaultEnabled: true,
  },
  banking: {
    key: "banking",
    name: "Banking",
    description: "Bank accounts, transactions, imports",
    routes: ["/banking", "/banking/accounts", "/banking/transactions", "/banking/import"],
    navItems: ["banking"],
    defaultEnabled: false,
  },
  reconciliation: {
    key: "reconciliation",
    name: "Reconciliation",
    description: "Auto-matching and statement reconciliation",
    routes: ["/banking/reconciliation"],
    navItems: ["reconciliation"],
    defaultEnabled: false,
  },
  "reports-basic": {
    key: "reports-basic",
    name: "Basic Reports",
    description: "Aging, KPR, profit/loss reports",
    routes: ["/reports", "/reports/aging", "/reports/kpr", "/reports/profit-loss"],
    navItems: ["reports-basic"],
    defaultEnabled: true,
  },
  "reports-advanced": {
    key: "reports-advanced",
    name: "Advanced Reports",
    description: "VAT reports, exports, custom reports",
    routes: ["/reports/vat-threshold", "/reports/export"],
    navItems: ["reports-advanced"],
    defaultEnabled: false,
  },
  pausalni: {
    key: "pausalni",
    name: "Paušalni",
    description: "Paušalni obrt tax management",
    routes: ["/pausalni", "/pausalni/forms", "/pausalni/settings", "/pausalni/po-sd"],
    navItems: ["pausalni"],
    defaultEnabled: false,
  },
  vat: {
    key: "vat",
    name: "VAT",
    description: "VAT management and submissions",
    routes: ["/vat"],
    navItems: ["vat"],
    defaultEnabled: false,
  },
  "corporate-tax": {
    key: "corporate-tax",
    name: "Corporate Tax",
    description: "DOO/JDOO tax features",
    routes: ["/corporate-tax"],
    navItems: ["corporate-tax"],
    defaultEnabled: false,
  },
  pos: {
    key: "pos",
    name: "POS",
    description: "Point of sale and Stripe Terminal",
    routes: ["/pos"],
    navItems: ["pos"],
    defaultEnabled: false,
  },
  documents: {
    key: "documents",
    name: "Documents",
    description: "Document storage and attachments",
    routes: ["/documents", "/documents/[id]"],
    navItems: ["documents"],
    defaultEnabled: true,
  },
  "ai-assistant": {
    key: "ai-assistant",
    name: "AI Assistant",
    description: "AI-powered help and document analysis",
    routes: ["/assistant", "/article-agent"],
    navItems: ["ai-assistant"],
    defaultEnabled: false,
  },
}

export const DEFAULT_ENTITLEMENTS: ModuleKey[] = MODULE_KEYS.filter(
  (key) => MODULES[key].defaultEnabled
)
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/modules/definitions.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/modules/definitions.ts
git commit -m "feat(modules): add module definitions with routes and nav items"
```

---

### Task 2.2: Create Module Access Checker

**Files:**

- Create: `src/lib/modules/access.ts`

**Step 1: Write the access checker**

```typescript
import { ModuleKey, MODULES } from "./definitions"

export interface ModuleAccess {
  hasModule: (moduleKey: ModuleKey) => boolean
  getEnabledModules: () => ModuleKey[]
  canAccessRoute: (pathname: string) => boolean
  getModuleForRoute: (pathname: string) => ModuleKey | null
}

export function createModuleAccess(entitlements: string[]): ModuleAccess {
  const enabledModules = new Set(entitlements as ModuleKey[])

  function hasModule(moduleKey: ModuleKey): boolean {
    return enabledModules.has(moduleKey)
  }

  function getEnabledModules(): ModuleKey[] {
    return Array.from(enabledModules)
  }

  function getModuleForRoute(pathname: string): ModuleKey | null {
    // Normalize pathname - remove trailing slash, handle dynamic segments
    const normalizedPath = pathname.replace(/\/$/, "").replace(/\/[^\/]+$/, "/[id]")

    for (const [key, module] of Object.entries(MODULES)) {
      for (const route of module.routes) {
        // Check exact match
        if (pathname === route || pathname.startsWith(route + "/")) {
          return key as ModuleKey
        }
        // Check dynamic route match
        if (normalizedPath === route) {
          return key as ModuleKey
        }
      }
    }
    return null
  }

  function canAccessRoute(pathname: string): boolean {
    const moduleKey = getModuleForRoute(pathname)
    // If route doesn't belong to any module, allow access
    if (!moduleKey) return true
    // Check if module is enabled
    return hasModule(moduleKey)
  }

  return {
    hasModule,
    getEnabledModules,
    canAccessRoute,
    getModuleForRoute,
  }
}
```

**Step 2: Create index export**

Create `src/lib/modules/index.ts`:

```typescript
export * from "./definitions"
export * from "./access"
```

**Step 3: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/modules/index.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/modules/
git commit -m "feat(modules): add module access checker with route matching"
```

---

### Task 2.3: Write Module Access Tests

**Files:**

- Create: `src/lib/modules/__tests__/access.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest"
import { createModuleAccess } from "../access"
import { DEFAULT_ENTITLEMENTS } from "../definitions"

describe("createModuleAccess", () => {
  describe("hasModule", () => {
    it("returns true for enabled modules", () => {
      const access = createModuleAccess(["invoicing", "expenses"])
      expect(access.hasModule("invoicing")).toBe(true)
      expect(access.hasModule("expenses")).toBe(true)
    })

    it("returns false for disabled modules", () => {
      const access = createModuleAccess(["invoicing"])
      expect(access.hasModule("banking")).toBe(false)
      expect(access.hasModule("pos")).toBe(false)
    })
  })

  describe("canAccessRoute", () => {
    it("allows access to routes for enabled modules", () => {
      const access = createModuleAccess(["invoicing", "expenses"])
      expect(access.canAccessRoute("/invoices")).toBe(true)
      expect(access.canAccessRoute("/invoices/new")).toBe(true)
      expect(access.canAccessRoute("/expenses")).toBe(true)
    })

    it("denies access to routes for disabled modules", () => {
      const access = createModuleAccess(["invoicing"])
      expect(access.canAccessRoute("/banking")).toBe(false)
      expect(access.canAccessRoute("/pos")).toBe(false)
    })

    it("allows access to routes not belonging to any module", () => {
      const access = createModuleAccess([])
      expect(access.canAccessRoute("/settings")).toBe(true)
      expect(access.canAccessRoute("/support")).toBe(true)
      expect(access.canAccessRoute("/dashboard")).toBe(true)
    })
  })

  describe("getModuleForRoute", () => {
    it("returns correct module for route", () => {
      const access = createModuleAccess(DEFAULT_ENTITLEMENTS)
      expect(access.getModuleForRoute("/invoices")).toBe("invoicing")
      expect(access.getModuleForRoute("/banking/reconciliation")).toBe("reconciliation")
      expect(access.getModuleForRoute("/pausalni/forms")).toBe("pausalni")
    })

    it("returns null for routes not in any module", () => {
      const access = createModuleAccess(DEFAULT_ENTITLEMENTS)
      expect(access.getModuleForRoute("/settings")).toBeNull()
      expect(access.getModuleForRoute("/support")).toBeNull()
    })
  })
})
```

**Step 2: Run the tests**

Run: `cd /home/admin/FiskAI && npx vitest run src/lib/modules/__tests__/access.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/modules/__tests__/
git commit -m "test(modules): add module access tests"
```

---

## Phase 3: Subdomain Infrastructure

### Task 3.1: Create Subdomain Detection Utility

**Files:**

- Create: `src/lib/middleware/subdomain.ts`

**Step 1: Write the subdomain utility**

```typescript
export type Subdomain = "app" | "staff" | "admin" | "marketing"

const SUBDOMAIN_MAP: Record<string, Subdomain> = {
  app: "app",
  staff: "staff",
  admin: "admin",
}

export function getSubdomain(host: string): Subdomain {
  // Remove port if present
  const hostname = host.split(":")[0]

  // Handle localhost development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Check for subdomain simulation via query param or header
    return "app" // Default to app in development
  }

  // Extract subdomain from hostname
  const parts = hostname.split(".")

  // Expected format: subdomain.fiskai.eu or fiskai.eu
  if (parts.length >= 3) {
    const subdomain = parts[0]
    if (subdomain in SUBDOMAIN_MAP) {
      return SUBDOMAIN_MAP[subdomain]
    }
  }

  // Root domain = marketing
  return "marketing"
}

export function getSubdomainFromRequest(request: Request): Subdomain {
  const host = request.headers.get("host") || ""

  // Development override via header
  const subdomainOverride = request.headers.get("x-subdomain")
  if (subdomainOverride && subdomainOverride in SUBDOMAIN_MAP) {
    return SUBDOMAIN_MAP[subdomainOverride]
  }

  return getSubdomain(host)
}

export function getRouteGroupForSubdomain(subdomain: Subdomain): string {
  switch (subdomain) {
    case "admin":
      return "(admin)"
    case "staff":
      return "(staff)"
    case "app":
      return "(app)"
    case "marketing":
    default:
      return "(marketing)"
  }
}

export function getRedirectUrlForSystemRole(
  systemRole: "USER" | "STAFF" | "ADMIN",
  baseUrl: string
): string {
  const url = new URL(baseUrl)
  const baseDomain = url.hostname.replace(/^(app|staff|admin)\./, "")

  switch (systemRole) {
    case "ADMIN":
      return `${url.protocol}//admin.${baseDomain}`
    case "STAFF":
      return `${url.protocol}//staff.${baseDomain}`
    case "USER":
    default:
      return `${url.protocol}//app.${baseDomain}`
  }
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/middleware/subdomain.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/middleware/subdomain.ts
git commit -m "feat(middleware): add subdomain detection utility"
```

---

### Task 3.2: Write Subdomain Detection Tests

**Files:**

- Create: `src/lib/middleware/__tests__/subdomain.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest"
import { getSubdomain, getRouteGroupForSubdomain, getRedirectUrlForSystemRole } from "../subdomain"

describe("getSubdomain", () => {
  it("returns app for app.fiskai.eu", () => {
    expect(getSubdomain("app.fiskai.eu")).toBe("app")
  })

  it("returns staff for staff.fiskai.eu", () => {
    expect(getSubdomain("staff.fiskai.eu")).toBe("staff")
  })

  it("returns admin for admin.fiskai.eu", () => {
    expect(getSubdomain("admin.fiskai.eu")).toBe("admin")
  })

  it("returns marketing for fiskai.eu (root domain)", () => {
    expect(getSubdomain("fiskai.eu")).toBe("marketing")
  })

  it("returns marketing for www.fiskai.eu", () => {
    expect(getSubdomain("www.fiskai.eu")).toBe("marketing")
  })

  it("handles port in hostname", () => {
    expect(getSubdomain("app.fiskai.eu:3000")).toBe("app")
  })

  it("returns app for localhost (development default)", () => {
    expect(getSubdomain("localhost")).toBe("app")
    expect(getSubdomain("localhost:3000")).toBe("app")
  })
})

describe("getRouteGroupForSubdomain", () => {
  it("maps subdomains to route groups", () => {
    expect(getRouteGroupForSubdomain("admin")).toBe("(admin)")
    expect(getRouteGroupForSubdomain("staff")).toBe("(staff)")
    expect(getRouteGroupForSubdomain("app")).toBe("(app)")
    expect(getRouteGroupForSubdomain("marketing")).toBe("(marketing)")
  })
})

describe("getRedirectUrlForSystemRole", () => {
  it("redirects ADMIN to admin subdomain", () => {
    const result = getRedirectUrlForSystemRole("ADMIN", "https://app.fiskai.eu/dashboard")
    expect(result).toBe("https://admin.fiskai.eu")
  })

  it("redirects STAFF to staff subdomain", () => {
    const result = getRedirectUrlForSystemRole("STAFF", "https://admin.fiskai.eu")
    expect(result).toBe("https://staff.fiskai.eu")
  })

  it("redirects USER to app subdomain", () => {
    const result = getRedirectUrlForSystemRole("USER", "https://staff.fiskai.eu")
    expect(result).toBe("https://app.fiskai.eu")
  })
})
```

**Step 2: Run the tests**

Run: `cd /home/admin/FiskAI && npx vitest run src/lib/middleware/__tests__/subdomain.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/middleware/__tests__/
git commit -m "test(middleware): add subdomain detection tests"
```

---

### Task 3.3: Create System Role Utilities

**Files:**

- Create: `src/lib/auth/system-role.ts`

**Step 1: Write the system role utilities**

```typescript
import { db } from "@/lib/db"

export type SystemRole = "USER" | "STAFF" | "ADMIN"

export async function getSystemRole(userId: string): Promise<SystemRole> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  })
  return (user?.systemRole as SystemRole) || "USER"
}

export async function setSystemRole(userId: string, role: SystemRole): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { systemRole: role },
  })
}

export function canAccessSubdomain(systemRole: SystemRole, subdomain: string): boolean {
  switch (subdomain) {
    case "admin":
      return systemRole === "ADMIN"
    case "staff":
      return systemRole === "STAFF" || systemRole === "ADMIN"
    case "app":
      return true // All roles can access app
    case "marketing":
      return true // Public
    default:
      return false
  }
}

export function getAvailableSubdomains(systemRole: SystemRole): string[] {
  switch (systemRole) {
    case "ADMIN":
      return ["admin", "staff", "app"]
    case "STAFF":
      return ["staff", "app"]
    case "USER":
    default:
      return ["app"]
  }
}

export function hasMultipleRoles(systemRole: SystemRole): boolean {
  return systemRole === "ADMIN" || systemRole === "STAFF"
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/lib/auth/system-role.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/auth/system-role.ts
git commit -m "feat(auth): add system role utilities"
```

---

### Task 3.4: Update NextAuth Configuration for Subdomain Cookies

**Files:**

- Modify: `src/lib/auth.ts`

**Step 1: Read the current auth.ts file**

Read the file to understand current structure before modifying.

**Step 2: Update cookie configuration**

In the NextAuth configuration, update the cookies option to use the root domain:

```typescript
// Add to NextAuth configuration
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.fiskai.eu' : undefined,
    },
  },
},
```

**Step 3: Add systemRole to session callback**

In the callbacks.session, add systemRole:

```typescript
session: async ({ session, token }) => {
  if (token && session.user) {
    session.user.id = token.sub as string
    session.user.systemRole = token.systemRole as SystemRole
    // ... existing fields
  }
  return session
}
```

**Step 4: Add systemRole to JWT callback**

In the callbacks.jwt, fetch and add systemRole:

```typescript
jwt: async ({ token, user, trigger }) => {
  if (user) {
    token.systemRole = user.systemRole || "USER"
  }
  // On session update, refresh the role
  if (trigger === "update") {
    const dbUser = await db.user.findUnique({
      where: { id: token.sub },
      select: { systemRole: true },
    })
    token.systemRole = dbUser?.systemRole || "USER"
  }
  return token
}
```

**Step 5: Update types**

Add to `src/types/next-auth.d.ts`:

```typescript
import { SystemRole } from "@/lib/auth/system-role"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      systemRole: SystemRole
      // ... existing fields
    }
  }

  interface User {
    systemRole?: SystemRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    systemRole?: SystemRole
  }
}
```

**Step 6: Verify build**

Run: `cd /home/admin/FiskAI && npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat(auth): configure subdomain cookies and add systemRole to session"
```

---

### Task 3.5: Update Root Middleware for Subdomain Routing

**Files:**

- Modify: `src/middleware.ts`

**Step 1: Read the current middleware**

Read the file to understand current structure.

**Step 2: Add subdomain routing logic**

Update middleware to include subdomain detection and role validation:

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  getSubdomainFromRequest,
  getRedirectUrlForSystemRole,
  canAccessSubdomain,
} from "@/lib/middleware/subdomain"
import { createModuleAccess } from "@/lib/modules"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next()
  }

  const subdomain = getSubdomainFromRequest(request)
  const token = await getToken({ req: request })

  // Marketing subdomain - allow all
  if (subdomain === "marketing") {
    // Auth pages are on marketing subdomain
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return NextResponse.next()
    }
    return NextResponse.next()
  }

  // Protected subdomains require authentication
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.hostname = request.nextUrl.hostname.replace(/^(app|staff|admin)\./, "")
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  const systemRole = (token.systemRole as string) || "USER"

  // Check subdomain access
  if (!canAccessSubdomain(systemRole, subdomain)) {
    const redirectUrl = getRedirectUrlForSystemRole(systemRole, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Module-based route protection (app subdomain only)
  if (subdomain === "app" && token.companyId) {
    // TODO: Fetch company entitlements and check module access
    // This will be implemented when we have the company context
  }

  // Add subdomain to headers for route group selection
  const response = NextResponse.next()
  response.headers.set("x-subdomain", subdomain)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

**Step 3: Verify build**

Run: `cd /home/admin/FiskAI && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): add subdomain routing and role validation"
```

---

## Phase 4: Route Group Reorganization

### Task 4.1: Create (marketing) Route Group Structure

**Files:**

- Create: `src/app/(marketing)/layout.tsx`
- Move: existing marketing pages

**Step 1: Create marketing layout**

```typescript
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
```

**Step 2: Move auth pages to marketing**

Move these directories under `(marketing)`:

- `login/`
- `register/`
- `forgot-password/`
- `reset-password/`
- `verify-email/`
- `check-email/`

**Step 3: Verify pages load**

Run: `cd /home/admin/FiskAI && npm run dev`
Test: Navigate to login page
Expected: Page loads correctly

**Step 4: Commit**

```bash
git add src/app/\(marketing\)/
git commit -m "feat(routes): create (marketing) route group with auth pages"
```

---

### Task 4.2: Create (app) Route Group Structure

**Files:**

- Create: `src/app/(app)/layout.tsx`
- Move: existing dashboard pages

**Step 1: Create app layout**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AppSidebar } from '@/components/app/sidebar'
import { AppHeader } from '@/components/app/header'
import { CompanyProvider } from '@/contexts/company-context'
import { VisibilityProvider } from '@/contexts/visibility-context'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <CompanyProvider>
      <VisibilityProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
      </VisibilityProvider>
    </CompanyProvider>
  )
}
```

**Step 2: Move dashboard pages**

Move these directories under `(app)`:

- `dashboard/`
- `invoices/`
- `e-invoices/`
- `contacts/`
- `products/`
- `expenses/`
- `banking/`
- `reports/`
- `pausalni/`
- `pos/`
- `documents/`
- `settings/`
- `support/`
- `checklist/`
- `assistant/`
- `onboarding/`

**Step 3: Verify pages load**

Run: `cd /home/admin/FiskAI && npm run dev`
Test: Navigate to dashboard
Expected: Page loads correctly

**Step 4: Commit**

```bash
git add src/app/\(app\)/
git commit -m "feat(routes): create (app) route group with dashboard pages"
```

---

### Task 4.3: Create (staff) Route Group Structure

**Files:**

- Create: `src/app/(staff)/layout.tsx`
- Create: `src/app/(staff)/dashboard/page.tsx`
- Create: `src/app/(staff)/clients/page.tsx`

**Step 1: Create staff layout**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { StaffSidebar } from '@/components/staff/sidebar'
import { StaffHeader } from '@/components/staff/header'
import { StaffClientProvider } from '@/contexts/staff-client-context'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  if (user.systemRole !== 'STAFF' && user.systemRole !== 'ADMIN') {
    redirect('/')
  }

  return (
    <StaffClientProvider>
      <div className="flex h-screen">
        <StaffSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StaffHeader />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </StaffClientProvider>
  )
}
```

**Step 2: Create staff dashboard page**

```typescript
import { Suspense } from 'react'
import { StaffDashboard } from '@/components/staff/dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StaffDashboard />
    </Suspense>
  )
}
```

**Step 3: Create clients list page**

```typescript
import { Suspense } from 'react'
import { ClientsList } from '@/components/staff/clients-list'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function ClientsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClientsList />
    </Suspense>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/\(staff\)/
git commit -m "feat(routes): create (staff) route group structure"
```

---

### Task 4.4: Create (admin) Route Group Structure

**Files:**

- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/dashboard/page.tsx`
- Create: `src/app/(admin)/tenants/page.tsx`
- Create: `src/app/(admin)/staff/page.tsx`

**Step 1: Create admin layout**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminHeader } from '@/components/admin/header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  if (user.systemRole !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

**Step 2: Create admin dashboard page**

```typescript
import { Suspense } from 'react'
import { AdminDashboard } from '@/components/admin/dashboard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  )
}
```

**Step 3: Create tenants page**

```typescript
import { Suspense } from 'react'
import { TenantsList } from '@/components/admin/tenants-list'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function TenantsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TenantsList />
    </Suspense>
  )
}
```

**Step 4: Create staff management page**

```typescript
import { Suspense } from 'react'
import { StaffManagement } from '@/components/admin/staff-management'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function StaffPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StaffManagement />
    </Suspense>
  )
}
```

**Step 5: Commit**

```bash
git add src/app/\(admin\)/
git commit -m "feat(routes): create (admin) route group structure"
```

---

## Phase 5: Staff Portal Components

### Task 5.1: Create Staff Client Context

**Files:**

- Create: `src/contexts/staff-client-context.tsx`

**Step 1: Write the context**

```typescript
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface StaffClient {
  id: string
  name: string
  oib: string
  entitlements: string[]
}

interface StaffClientContextType {
  currentClient: StaffClient | null
  setCurrentClient: (client: StaffClient | null) => void
  switchClient: (clientId: string) => Promise<void>
  clearClient: () => void
  isWorkingOnClient: boolean
}

const StaffClientContext = createContext<StaffClientContextType | undefined>(undefined)

export function StaffClientProvider({ children }: { children: ReactNode }) {
  const [currentClient, setCurrentClient] = useState<StaffClient | null>(null)
  const router = useRouter()

  const switchClient = useCallback(async (clientId: string) => {
    const response = await fetch(`/api/staff/clients/${clientId}`)
    if (response.ok) {
      const client = await response.json()
      setCurrentClient(client)
      router.push(`/clients/${clientId}`)
    }
  }, [router])

  const clearClient = useCallback(() => {
    setCurrentClient(null)
    router.push('/dashboard')
  }, [router])

  return (
    <StaffClientContext.Provider
      value={{
        currentClient,
        setCurrentClient,
        switchClient,
        clearClient,
        isWorkingOnClient: currentClient !== null,
      }}
    >
      {children}
    </StaffClientContext.Provider>
  )
}

export function useStaffClient() {
  const context = useContext(StaffClientContext)
  if (context === undefined) {
    throw new Error('useStaffClient must be used within a StaffClientProvider')
  }
  return context
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/contexts/staff-client-context.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/contexts/staff-client-context.tsx
git commit -m "feat(staff): add staff client context for multi-client management"
```

---

### Task 5.2: Create Staff Sidebar Component

**Files:**

- Create: `src/components/staff/sidebar.tsx`

**Step 1: Write the sidebar component**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  FileText,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStaffClient } from '@/contexts/staff-client-context'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Tickets', href: '/tickets', icon: MessageSquare },
  { name: 'Documents', href: '/documents', icon: FileText },
]

export function StaffSidebar() {
  const pathname = usePathname()
  const { currentClient, clearClient } = useStaffClient()

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">FiskAI Staff</h1>
      </div>

      {currentClient && (
        <div className="p-4 bg-blue-900/50 border-b border-slate-700">
          <div className="text-xs text-blue-300 mb-1">Working as:</div>
          <div className="font-medium truncate">{currentClient.name}</div>
          <button
            onClick={clearClient}
            className="text-xs text-blue-300 hover:text-white mt-2"
          >
            ← Back to overview
          </button>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/components/staff/sidebar.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/staff/sidebar.tsx
git commit -m "feat(staff): add staff sidebar component"
```

---

### Task 5.3: Create Staff Dashboard Component

**Files:**

- Create: `src/components/staff/dashboard.tsx`

**Step 1: Write the dashboard component**

```typescript
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  AlertCircle,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp
} from 'lucide-react'

async function getStaffStats(userId: string) {
  const [assignedClients, pendingTickets, upcomingDeadlines] = await Promise.all([
    db.staffAssignment.count({ where: { staffId: userId } }),
    db.supportTicket.count({
      where: {
        category: 'ACCOUNTING',
        status: { not: 'CLOSED' }
      }
    }),
    // TODO: Implement deadline tracking
    Promise.resolve(0),
  ])

  return {
    assignedClients,
    pendingTickets,
    upcomingDeadlines,
  }
}

async function getRecentActivity(userId: string) {
  const assignments = await db.staffAssignment.findMany({
    where: { staffId: userId },
    include: { company: true },
    take: 5,
  })

  // TODO: Fetch recent activity across assigned companies
  return assignments.map(a => ({
    id: a.id,
    companyName: a.company.name,
    action: 'Assigned',
    date: a.assignedAt,
  }))
}

export async function StaffDashboard() {
  const user = await getCurrentUser()
  if (!user) return null

  const stats = await getStaffStats(user.id)
  const recentActivity = await getRecentActivity(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your client portfolio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Need Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.companyName}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/components/staff/dashboard.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/staff/dashboard.tsx
git commit -m "feat(staff): add staff dashboard component with stats and activity"
```

---

### Task 5.4: Create Staff Clients List Component

**Files:**

- Create: `src/components/staff/clients-list.tsx`

**Step 1: Write the clients list component**

```typescript
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Building2, AlertCircle, ChevronRight } from 'lucide-react'

async function getAssignedClients(userId: string) {
  const assignments = await db.staffAssignment.findMany({
    where: { staffId: userId },
    include: {
      company: {
        include: {
          _count: {
            select: {
              eInvoices: true,
              expenses: true,
              supportTickets: { where: { status: { not: 'CLOSED' } } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return assignments.map(a => ({
    id: a.company.id,
    name: a.company.name,
    oib: a.company.oib,
    entitlements: a.company.entitlements as string[],
    assignedAt: a.assignedAt,
    notes: a.notes,
    stats: {
      invoices: a.company._count.eInvoices,
      expenses: a.company._count.expenses,
      openTickets: a.company._count.supportTickets,
    },
  }))
}

export async function ClientsList() {
  const user = await getCurrentUser()
  if (!user) return null

  const clients = await getAssignedClients(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            {clients.length} assigned client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Input
          type="search"
          placeholder="Search clients..."
          className="w-64"
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clients assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Contact your admin to get client assignments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      {client.stats.openTickets > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {client.stats.openTickets}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">OIB: {client.oib}</p>
                    {client.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{client.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="text-center">
                      <div className="font-medium text-foreground">{client.stats.invoices}</div>
                      <div className="text-xs">Invoices</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{client.stats.expenses}</div>
                      <div className="text-xs">Expenses</div>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/admin/FiskAI && npx tsc --noEmit src/components/staff/clients-list.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/staff/clients-list.tsx
git commit -m "feat(staff): add clients list component with stats and search"
```

---

## Phase 6: Admin Portal Components

### Task 6.1: Create Admin Sidebar Component

**Files:**

- Create: `src/components/admin/sidebar.tsx`

**Step 1: Write the sidebar component**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Server,
  MessageSquare,
  Settings,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Services', href: '/services', icon: Server },
  { name: 'Support', href: '/support', icon: MessageSquare },
  { name: 'Audit Log', href: '/audit', icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-xl font-bold">FiskAI Admin</h1>
        <p className="text-xs text-slate-400">Platform Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/sidebar.tsx
git commit -m "feat(admin): add admin sidebar component"
```

---

### Task 6.2: Create Admin Dashboard Component

**Files:**

- Create: `src/components/admin/dashboard.tsx`

**Step 1: Write the dashboard component**

```typescript
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

async function getAdminStats() {
  const [
    totalTenants,
    activeSubscriptions,
    totalStaff,
    pendingTickets,
  ] = await Promise.all([
    db.company.count(),
    db.company.count({ where: { subscriptionStatus: 'active' } }),
    db.user.count({ where: { systemRole: 'STAFF' } }),
    db.supportTicket.count({ where: { status: { not: 'CLOSED' } } }),
  ])

  return {
    totalTenants,
    activeSubscriptions,
    totalStaff,
    pendingTickets,
  }
}

async function getRecentSignups() {
  return db.company.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      createdAt: true,
      subscriptionStatus: true,
    },
  })
}

export async function AdminDashboard() {
  const stats = await getAdminStats()
  const recentSignups = await getRecentSignups()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTickets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSignups.map((company) => (
              <div key={company.id} className="flex items-center gap-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {company.subscriptionStatus === 'active' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/dashboard.tsx
git commit -m "feat(admin): add admin dashboard component with platform stats"
```

---

### Task 6.3: Create Tenants List Component

**Files:**

- Create: `src/components/admin/tenants-list.tsx`

**Step 1: Write the tenants list component**

```typescript
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Building2, ChevronRight, Search } from 'lucide-react'

async function getTenants() {
  return db.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          users: true,
          eInvoices: true,
        },
      },
    },
  })
}

export async function TenantsList() {
  const tenants = await getTenants()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            {tenants.length} registered compan{tenants.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tenants..."
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {tenants.map((tenant) => (
          <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{tenant.name}</h3>
                    <Badge
                      variant={tenant.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                    >
                      {tenant.subscriptionStatus || 'trial'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">OIB: {tenant.oib}</p>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium text-foreground">{tenant._count.users}</div>
                    <div className="text-xs">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">{tenant._count.eInvoices}</div>
                    <div className="text-xs">Invoices</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {(tenant.entitlements as string[])?.length || 0}
                    </div>
                    <div className="text-xs">Modules</div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/tenants-list.tsx
git commit -m "feat(admin): add tenants list component with search and stats"
```

---

### Task 6.4: Create Staff Management Component

**Files:**

- Create: `src/components/admin/staff-management.tsx`

**Step 1: Write the staff management component**

```typescript
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Plus, Search, Building2 } from 'lucide-react'

async function getStaffMembers() {
  return db.user.findMany({
    where: { systemRole: 'STAFF' },
    include: {
      _count: {
        select: {
          staffAssignments: true,
        },
      },
      staffAssignments: {
        include: {
          company: {
            select: { name: true },
          },
        },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function StaffManagement() {
  const staff = await getStaffMembers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            {staff.length} staff member{staff.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search staff..."
              className="pl-9 w-64"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No staff members yet</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{member.name || 'Unnamed'}</h3>
                    <Badge variant="outline">Staff</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {member._count.staffAssignments} clients
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.staffAssignments.slice(0, 2).map(a => a.company.name).join(', ')}
                      {member._count.staffAssignments > 2 && '...'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/staff-management.tsx
git commit -m "feat(admin): add staff management component"
```

---

## Phase 7: API Routes for Staff Operations

### Task 7.1: Create Staff Clients API Route

**Files:**

- Create: `src/app/api/staff/clients/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.systemRole !== "STAFF" && user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const assignments = await db.staffAssignment.findMany({
    where: { staffId: user.id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          oib: true,
          entitlements: true,
          subscriptionStatus: true,
        },
      },
    },
  })

  const clients = assignments.map((a) => ({
    id: a.company.id,
    name: a.company.name,
    oib: a.company.oib,
    entitlements: a.company.entitlements,
    subscriptionStatus: a.company.subscriptionStatus,
    assignedAt: a.assignedAt,
    notes: a.notes,
  }))

  return NextResponse.json(clients)
}
```

**Step 2: Commit**

```bash
git add src/app/api/staff/clients/route.ts
git commit -m "feat(api): add staff clients list endpoint"
```

---

### Task 7.2: Create Staff Client Detail API Route

**Files:**

- Create: `src/app/api/staff/clients/[companyId]/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.systemRole !== "STAFF" && user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Verify staff is assigned to this company
  const assignment = await db.staffAssignment.findUnique({
    where: {
      staffId_companyId: {
        staffId: user.id,
        companyId: params.companyId,
      },
    },
  })

  // Admins can access any company, staff only assigned ones
  if (!assignment && user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Not assigned to this client" }, { status: 403 })
  }

  const company = await db.company.findUnique({
    where: { id: params.companyId },
    select: {
      id: true,
      name: true,
      oib: true,
      vatNumber: true,
      address: true,
      city: true,
      postalCode: true,
      email: true,
      phone: true,
      entitlements: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
      legalForm: true,
      isVatPayer: true,
    },
  })

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  return NextResponse.json(company)
}
```

**Step 2: Commit**

```bash
git add src/app/api/staff/clients/\[companyId\]/route.ts
git commit -m "feat(api): add staff client detail endpoint"
```

---

### Task 7.3: Create Admin Staff Assignment API Routes

**Files:**

- Create: `src/app/api/admin/staff-assignments/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { z } from "zod"

const createAssignmentSchema = z.object({
  staffId: z.string().min(1),
  companyId: z.string().min(1),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const assignments = await db.staffAssignment.findMany({
    include: {
      staff: {
        select: { id: true, name: true, email: true },
      },
      company: {
        select: { id: true, name: true, oib: true },
      },
      assigner: {
        select: { id: true, name: true },
      },
    },
    orderBy: { assignedAt: "desc" },
  })

  return NextResponse.json(assignments)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createAssignmentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
  }

  const { staffId, companyId, notes } = parsed.data

  // Verify staff user exists and has STAFF role
  const staffUser = await db.user.findUnique({
    where: { id: staffId },
    select: { systemRole: true },
  })

  if (!staffUser || staffUser.systemRole !== "STAFF") {
    return NextResponse.json({ error: "Invalid staff user" }, { status: 400 })
  }

  // Verify company exists
  const company = await db.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  // Check if assignment already exists
  const existing = await db.staffAssignment.findUnique({
    where: {
      staffId_companyId: { staffId, companyId },
    },
  })

  if (existing) {
    return NextResponse.json({ error: "Assignment already exists" }, { status: 409 })
  }

  const assignment = await db.staffAssignment.create({
    data: {
      staffId,
      companyId,
      assignedBy: user.id,
      notes,
    },
    include: {
      staff: {
        select: { id: true, name: true, email: true },
      },
      company: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(assignment, { status: 201 })
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/staff-assignments/route.ts
git commit -m "feat(api): add admin staff assignment endpoints"
```

---

### Task 7.4: Create Admin Staff Assignment Delete Route

**Files:**

- Create: `src/app/api/admin/staff-assignments/[id]/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const assignment = await db.staffAssignment.findUnique({
    where: { id: params.id },
  })

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  }

  await db.staffAssignment.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/staff-assignments/\[id\]/route.ts
git commit -m "feat(api): add admin staff assignment delete endpoint"
```

---

## Phase 8: Role Selection Page

### Task 8.1: Create Role Selection Page

**Files:**

- Create: `src/app/(marketing)/select-role/page.tsx`

**Step 1: Write the role selection page**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { getAvailableSubdomains, hasMultipleRoles } from '@/lib/auth/system-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, Users, Shield } from 'lucide-react'

const SUBDOMAIN_INFO = {
  app: {
    title: 'Client Dashboard',
    description: 'Access your business dashboard',
    icon: Building2,
    color: 'text-blue-500',
  },
  staff: {
    title: 'Staff Portal',
    description: 'Manage assigned client accounts',
    icon: Users,
    color: 'text-green-500',
  },
  admin: {
    title: 'Admin Portal',
    description: 'Platform management and oversight',
    icon: Shield,
    color: 'text-purple-500',
  },
}

export default async function SelectRolePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const systemRole = user.systemRole || 'USER'

  // If user only has one role, redirect directly
  if (!hasMultipleRoles(systemRole)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fiskai.eu'
    redirect(`${baseUrl.replace('fiskai.eu', 'app.fiskai.eu')}/dashboard`)
  }

  const availableSubdomains = getAvailableSubdomains(systemRole)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fiskai.eu'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back, {user.name || user.email}</h1>
          <p className="text-muted-foreground mt-2">Select which portal you'd like to access</p>
        </div>

        <div className="grid gap-4">
          {availableSubdomains.map((subdomain) => {
            const info = SUBDOMAIN_INFO[subdomain as keyof typeof SUBDOMAIN_INFO]
            if (!info) return null

            const Icon = info.icon
            const url = `${baseUrl.replace('fiskai.eu', `${subdomain}.fiskai.eu`)}/dashboard`

            return (
              <a key={subdomain} href={url}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center ${info.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.title}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(marketing\)/select-role/page.tsx
git commit -m "feat(auth): add role selection page for multi-role users"
```

---

### Task 8.2: Update Login to Redirect to Role Selection

**Files:**

- Modify: `src/app/(marketing)/login/page.tsx` or auth callback

**Step 1: Update auth callback to check for multiple roles**

In the NextAuth configuration or login success handler, add logic to redirect to role selection:

```typescript
// In auth.ts callbacks or login page
async function handleLoginSuccess(user: User) {
  const systemRole = user.systemRole || "USER"

  if (hasMultipleRoles(systemRole)) {
    return "/select-role"
  }

  // Redirect to appropriate subdomain
  return getRedirectUrlForSystemRole(systemRole, process.env.NEXT_PUBLIC_APP_URL!)
}
```

**Step 2: Verify login flow works**

Test: Log in with an admin user
Expected: Redirects to role selection page

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): redirect multi-role users to role selection after login"
```

---

## Phase 9: Final Integration & Testing

### Task 9.1: Update Support Ticket Form with Category

**Files:**

- Modify: Support ticket creation form (location varies)

**Step 1: Add category selector to ticket form**

Add a select field for ticket category:

```typescript
<Select name="category" defaultValue="GENERAL">
  <SelectTrigger>
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="TECHNICAL">Technical Issue</SelectItem>
    <SelectItem value="BILLING">Billing Question</SelectItem>
    <SelectItem value="ACCOUNTING">Accounting Help</SelectItem>
    <SelectItem value="GENERAL">General Question</SelectItem>
  </SelectContent>
</Select>
```

**Step 2: Update ticket creation API to save category**

**Step 3: Commit**

```bash
git commit -m "feat(support): add category selector to ticket form"
```

---

### Task 9.2: Write Integration Tests

**Files:**

- Create: `src/__tests__/integration/multi-role.test.ts`

**Step 1: Write integration tests**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createModuleAccess } from "@/lib/modules"
import { getSubdomain, canAccessSubdomain } from "@/lib/middleware/subdomain"

describe("Multi-Role Architecture Integration", () => {
  describe("Subdomain Access Control", () => {
    it("allows ADMIN to access all subdomains", () => {
      expect(canAccessSubdomain("ADMIN", "admin")).toBe(true)
      expect(canAccessSubdomain("ADMIN", "staff")).toBe(true)
      expect(canAccessSubdomain("ADMIN", "app")).toBe(true)
    })

    it("allows STAFF to access staff and app", () => {
      expect(canAccessSubdomain("STAFF", "admin")).toBe(false)
      expect(canAccessSubdomain("STAFF", "staff")).toBe(true)
      expect(canAccessSubdomain("STAFF", "app")).toBe(true)
    })

    it("allows USER only to app", () => {
      expect(canAccessSubdomain("USER", "admin")).toBe(false)
      expect(canAccessSubdomain("USER", "staff")).toBe(false)
      expect(canAccessSubdomain("USER", "app")).toBe(true)
    })
  })

  describe("Module Access Control", () => {
    it("blocks routes for disabled modules", () => {
      const access = createModuleAccess(["invoicing"])
      expect(access.canAccessRoute("/invoices")).toBe(true)
      expect(access.canAccessRoute("/banking")).toBe(false)
      expect(access.canAccessRoute("/pos")).toBe(false)
    })

    it("allows common routes regardless of modules", () => {
      const access = createModuleAccess([])
      expect(access.canAccessRoute("/dashboard")).toBe(true)
      expect(access.canAccessRoute("/settings")).toBe(true)
      expect(access.canAccessRoute("/support")).toBe(true)
    })
  })
})
```

**Step 2: Run tests**

Run: `cd /home/admin/FiskAI && npx vitest run src/__tests__/integration/multi-role.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/integration/multi-role.test.ts
git commit -m "test: add multi-role architecture integration tests"
```

---

### Task 9.3: Build Verification

**Step 1: Run full build**

Run: `cd /home/admin/FiskAI && npm run build`
Expected: Build succeeds without errors

**Step 2: Run all tests**

Run: `cd /home/admin/FiskAI && npm run test`
Expected: All tests pass

**Step 3: Create final commit**

```bash
git add -A
git commit -m "feat: complete multi-role architecture implementation

- Add SystemRole enum (USER, STAFF, ADMIN)
- Create StaffAssignment table for accountant-client relationships
- Implement 16-module entitlement system
- Create subdomain routing infrastructure
- Build admin portal with tenant/staff management
- Build staff portal with client switcher
- Reorganize routes into (marketing), (app), (staff), (admin) groups
- Add role selection page for multi-role users
- Add support ticket category routing

Closes #XXX"
```

---

## DNS Configuration (When Ready)

When you've purchased the `fiskai.eu` domain, you'll need to create the following DNS records.

**For Vercel hosting:**

```
Type  | Name   | Value
------|--------|------------------
A     | @      | 76.76.21.21
CNAME | www    | cname.vercel-dns.com
CNAME | app    | cname.vercel-dns.com
CNAME | staff  | cname.vercel-dns.com
CNAME | admin  | cname.vercel-dns.com
```

**For self-hosted (replace with your server IP):**

```
Type  | Name   | Value
------|--------|------------------
A     | @      | YOUR_SERVER_IP
A     | app    | YOUR_SERVER_IP
A     | staff  | YOUR_SERVER_IP
A     | admin  | YOUR_SERVER_IP
```

After DNS propagation, configure your hosting to handle wildcard subdomains or add each subdomain explicitly.

---

## Summary

This plan implements the multi-role architecture in 9 phases:

1. **Database Schema** - SystemRole, StaffAssignment, TicketCategory
2. **Module System** - 16 modules with access control
3. **Subdomain Infrastructure** - Detection, routing, cookies
4. **Route Groups** - (marketing), (app), (staff), (admin)
5. **Staff Portal Components** - Dashboard, clients, context
6. **Admin Portal Components** - Dashboard, tenants, staff management
7. **API Routes** - Staff and admin endpoints
8. **Role Selection** - Multi-role user login flow
9. **Integration & Testing** - Tests and build verification

Total tasks: ~35 bite-sized steps following TDD principles.
