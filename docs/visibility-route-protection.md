# Visibility System - Route Protection

## Overview

Phase 4 of the visibility system adds server-side route protection to prevent direct URL access to restricted pages. This ensures users can only access pages that match their business type, competence level, and progression stage.

## Architecture

### Why Not Middleware?

Next.js middleware runs in the Edge runtime and cannot access:

- Database/Prisma operations
- Full Node.js APIs
- Server-side authentication utilities

Therefore, route protection is implemented in page components using server-side utilities.

### Implementation Components

1. **Middleware** (`/src/middleware.ts`):
   - Logs requests
   - Identifies protected routes (marks with header)
   - Does NOT perform visibility checks (Edge runtime limitation)

2. **Route Protection Utility** (`/src/lib/visibility/route-protection.tsx`):
   - `protectRoute(elementId)` - Protects a page, redirects if denied
   - `getRouteAccess(elementId)` - Returns access info without redirecting

3. **Server Utilities** (`/src/lib/visibility/server.ts`):
   - `checkRouteAccess()` - Core visibility checking logic
   - Returns allowed/denied with redirect URL and reason

## How to Protect a Page

### Step 1: Import the Protection Function

```tsx
import { protectRoute } from "@/lib/visibility/route-protection"
```

### Step 2: Add Protection at Top of Component

```tsx
export default async function MyProtectedPage() {
  // Call protectRoute FIRST, before any other logic
  await protectRoute("page:my-feature")

  // Rest of your page logic
  const user = await requireAuth()
  // ...
}
```

### Step 3: Ensure Element is Registered

The element ID must be registered in `/src/lib/visibility/elements.ts`:

```tsx
export const VISIBILITY_ELEMENTS = {
  // ...
  "page:my-feature": { type: "page", path: "/my-feature" },
}
```

### Step 4: Define Visibility Rules

Add rules in `/src/lib/visibility/rules.ts`:

```tsx
// Hide for certain business types
export const BUSINESS_TYPE_HIDDEN: Record<LegalForm, ElementId[]> = {
  OBRT_PAUSAL: [
    "page:my-feature", // Paušalni users can't see this
  ],
  // ...
}

// Lock based on progression
export const PROGRESSION_LOCKED: Record<
  ProgressionStage,
  { locked: ElementId[]; unlockHint: string }
> = {
  "needs-invoice": {
    locked: ["page:my-feature"],
    unlockHint: "Kreirajte prvu fakturu",
  },
  // ...
}
```

## Protected Routes

Current protected routes (as of Phase 4):

- `/reports` - `page:reports` - General reports page
- `/vat` - `page:vat` - VAT-specific pages
- `/pos` - `page:pos` - Point of Sale
- `/doprinosi` - `page:doprinosi` - Contributions
- `/corporate-tax` - `page:corporate-tax` - Corporate tax
- `/bank` - `page:bank` - Banking features

## Redirect Behavior

When access is denied, users are redirected with context:

### Hidden Feature (Business Type Mismatch)

```
/dashboard?blocked=feature-unavailable
```

### Locked Feature (Progression Stage Not Met)

```
/dashboard?locked=<unlock-hint>
```

Example: `/dashboard?locked=Dodajte%20prvi%20proizvod`

### No Authentication

```
/login
```

### No Company

```
/onboarding
```

## Example: Adding Protection to a New Page

Let's say you're adding a new "Tax Calculator" page:

### 1. Register the Element

`/src/lib/visibility/elements.ts`:

```tsx
export const VISIBILITY_ELEMENTS = {
  // ...
  "page:tax-calculator": { type: "page", path: "/tax-calculator" },
}
```

### 2. Define Visibility Rules

`/src/lib/visibility/rules.ts`:

```tsx
// Only for pros
export const COMPETENCE_HIDDEN: Record<CompetenceLevel, ElementId[]> = {
  beginner: ["page:tax-calculator"],
  average: ["page:tax-calculator"],
  pro: [],
}

// Locked until they have invoices
export const PROGRESSION_LOCKED: Record<ProgressionStage, {...}> = {
  // ...
  "needs-invoice": {
    locked: ["page:tax-calculator"],
    unlockHint: "Kreirajte prvu fakturu",
  },
}
```

### 3. Create the Page with Protection

`/src/app/(dashboard)/tax-calculator/page.tsx`:

```tsx
import { protectRoute } from "@/lib/visibility/route-protection"
import { requireAuth, requireCompany } from "@/lib/auth-utils"

export default async function TaxCalculatorPage() {
  // Protect the route
  await protectRoute("page:tax-calculator")

  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  return (
    <div>
      <h1>Tax Calculator</h1>
      {/* Your page content */}
    </div>
  )
}
```

### 4. Update Middleware (Optional)

If you want the middleware to log this as a protected route:

`/src/middleware.ts`:

```tsx
const PROTECTED_ROUTES = [
  "/vat",
  "/reports",
  "/tax-calculator", // Add your route
  // ...
]
```

## Advanced: Conditional Rendering

To show different UI based on access (without redirecting):

```tsx
import { getRouteAccess } from "@/lib/visibility/route-protection"

export default async function MyPage() {
  const access = await getRouteAccess("page:reports")

  if (!access.allowed) {
    return (
      <div className="p-4">
        <h2>Feature Locked</h2>
        <p>{access.hint || "This feature is not available"}</p>
        <Link href="/dashboard">Return to Dashboard</Link>
      </div>
    )
  }

  // Show full content
  return <div>Full page content</div>
}
```

## Testing

### Test Scenario 1: Business Type Restriction

1. Create a paušalni company
2. Try to access `/vat` directly
3. Should redirect to `/dashboard?blocked=feature-unavailable`

### Test Scenario 2: Progression Lock

1. Create a new company (no invoices)
2. Try to access `/reports`
3. Should redirect to `/dashboard?locked=Kreirajte%20prvu%20fakturu`

### Test Scenario 3: Competence Override

1. Set user competence to "pro"
2. Access should bypass progression locks
3. All features unlocked immediately

## Performance Considerations

- Route protection runs on every page load
- Caches are in place for visibility data (server.ts)
- Database queries are optimized with parallel fetching
- Consider caching user's visibility state in session if performance becomes an issue

## Migration Notes

Existing pages may have:

- Capability-based protection (`deriveCapabilities`)
- Permission-based protection (`requirePermission`)

The visibility system is **additive** - it works alongside existing protections:

```tsx
export default async function MyPage() {
  // Visibility system (business type, progression)
  await protectRoute("page:reports")

  // Capability system (subscription tier)
  const capabilities = deriveCapabilities(company)
  if (!capabilities.modules.reports?.enabled) {
    redirect("/settings?tab=plan")
  }

  // Permission system (RBAC)
  await requirePermission(userId, companyId, "reports:view")

  // All checks passed - show content
}
```

## Troubleshooting

### Issue: "Cannot access database in middleware"

- This is expected - visibility checks must be in page components, not middleware
- Use `protectRoute()` in your page component instead

### Issue: "Route not protected"

1. Check if route is in `PROTECTED_ROUTES` in middleware.ts
2. Verify element ID exists in `elements.ts`
3. Ensure `protectRoute()` is called at top of page component
4. Check visibility rules in `rules.ts`

### Issue: "Redirect loop"

- Make sure `/dashboard` is not protected
- Check that redirect targets are accessible
- Verify onboarding flow doesn't require completed onboarding

## Future Enhancements

- [ ] Cache visibility state in session
- [ ] Add middleware protection for Edge-compatible checks
- [ ] Create HOC for route protection
- [ ] Add telemetry for blocked access attempts
- [ ] Build admin UI for visibility rule management
