# Feature: Company Switcher

## Status

- Documentation: ✅ Complete
- Last verified: 2025-12-15
- Evidence count: 11

## Purpose

The Company Switcher feature enables users with access to multiple companies to quickly switch between company contexts from the header. The switcher displays in the header on desktop devices (lg+) and allows switching the default company, which persists across sessions. Users with only one company see a static company name display instead of the interactive switcher.

## User Entry Points

| Type      | Path             | Evidence                                           |
| --------- | ---------------- | -------------------------------------------------- |
| Component | Header (Desktop) | `src/components/layout/header.tsx:91-99`           |
| Component | CompanySwitcher  | `src/components/layout/company-switcher.tsx:14-89` |

## Core Flow

1. User is authenticated and has multiple companies → `src/lib/auth-utils.ts:20-41`
2. Header loads all companies via getUserCompanies → `src/components/layout/header.tsx:22`
3. Header identifies current default company via getCurrentCompany → `src/components/layout/header.tsx:23`
4. If companies.length > 1, CompanySwitcher renders on desktop → `src/components/layout/header.tsx:92-98`
5. User clicks company switcher button → `src/components/layout/company-switcher.tsx:44`
6. Dropdown opens showing all companies with names and OIBs → `src/components/layout/company-switcher.tsx:59-86`
7. Current company highlighted with blue background and checkmark → `src/components/layout/company-switcher.tsx:66,74-82`
8. User selects different company → `src/components/layout/company-switcher.tsx:64`
9. System verifies user has access to selected company → `src/app/actions/company-switch.ts:11-20`
10. System updates isDefault flag in atomic transaction → `src/app/actions/company-switch.ts:23-34`
11. All previous defaults cleared, new company set as default → `src/app/actions/company-switch.ts:25-33`
12. Page revalidates and redirects to refresh context → `src/app/actions/company-switch.ts:36`
13. All subsequent requests use new company context → `src/lib/auth-utils.ts:20-41`

## Key Modules

| Module            | Purpose                                     | Location                                     |
| ----------------- | ------------------------------------------- | -------------------------------------------- |
| CompanySwitcher   | Client component with dropdown UI           | `src/components/layout/company-switcher.tsx` |
| switchCompany     | Server action to update default company     | `src/app/actions/company-switch.ts:7-38`     |
| getUserCompanies  | Fetches all companies for current user      | `src/app/actions/company-switch.ts:40-64`    |
| getCurrentCompany | Retrieves user's default company            | `src/lib/auth-utils.ts:20-41`                |
| Header            | Main header component that renders switcher | `src/components/layout/header.tsx`           |

## Multi-Company Support

### Database Schema

**CompanyUser Model** → `prisma/schema.prisma:132-146`

The CompanyUser junction table manages user-company relationships:

```prisma
model CompanyUser {
  id                 String    @id @default(cuid())
  userId             String
  companyId          String
  role               Role      @default(MEMBER)
  isDefault          Boolean   @default(false)
  createdAt          DateTime  @default(now())
  notificationSeenAt DateTime?
  company            Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
}
```

**User Roles** → `prisma/schema.prisma:784-789`

```prisma
enum Role {
  OWNER
  ADMIN
  MEMBER
  ACCOUNTANT
  VIEWER
}
```

**Key Fields:**

- `isDefault` - Marks which company is active for the user (only one per user)
- `role` - Determines user's permissions within the company
- `@@unique([userId, companyId])` - Prevents duplicate user-company relationships

### Default Company Selection

The system determines the current company using a fallback strategy → `src/lib/auth-utils.ts:20-41`:

1. **Primary**: Find CompanyUser record where `isDefault = true`
2. **Fallback**: If no default set, use first company by createdAt
3. **None**: If user has no companies, return null (redirects to onboarding)

```typescript
export async function getCurrentCompany(userId: string) {
  const companyUser = await db.companyUser.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    include: {
      company: true,
    },
  })

  if (!companyUser) {
    // Get first company if no default
    const firstCompany = await db.companyUser.findFirst({
      where: { userId },
      include: { company: true },
    })
    return firstCompany?.company ?? null
  }

  return companyUser.company
}
```

## Company Switcher Component

### Props and State

**Component Props** → `src/components/layout/company-switcher.tsx:14-20`

```typescript
{
  companies: Company[]        // All companies user has access to
  currentCompanyId: string    // ID of currently active company
}

type Company = {
  id: string
  name: string
  oib: string
  isDefault: boolean
  role: string
}
```

**Component State** → `src/components/layout/company-switcher.tsx:21-22`

- `isOpen` (boolean) - Controls dropdown visibility
- `isPending` (boolean) - Tracks transition state during company switch

### UI States

**Single Company Mode** → `src/components/layout/company-switcher.tsx:26-32`

When user has 1 or fewer companies, renders static text instead of interactive switcher:

```typescript
if (companies.length <= 1) {
  return (
    <div className="text-sm text-gray-600">
      {currentCompany?.name}
    </div>
  )
}
```

**Multi-Company Mode** → `src/components/layout/company-switcher.tsx:41-88`

Interactive dropdown with:

- Trigger button showing current company name (truncated at 150px)
- Chevron icon that rotates when dropdown is open
- Dropdown list of all companies with name and OIB
- Current company highlighted with blue background
- Checkmark icon next to current company
- Disabled state during pending transition

### Responsive Behavior

**Desktop Only** → `src/components/layout/header.tsx:91-99`

The CompanySwitcher only displays on large screens (lg breakpoint, 1024px+):

```tsx
{
  /* Company Switcher (Desktop) */
}
{
  currentCompany && companies.length > 0 && (
    <div className="hidden lg:block">
      <CompanySwitcher companies={companies} currentCompanyId={currentCompany.id} />
    </div>
  )
}
```

**Mobile/Tablet**: Company name shown in alternative UI components (CompanyStatus pill on tablet)

## Switch Company Action

### Server Action Flow

**Function: switchCompany** → `src/app/actions/company-switch.ts:7-38`

1. **Authentication**: Verify user is authenticated → `src/app/actions/company-switch.ts:8`
2. **Authorization**: Check user has access to target company → `src/app/actions/company-switch.ts:11-20`
3. **Transaction**: Atomically update isDefault flags → `src/app/actions/company-switch.ts:23-34`
4. **Revalidation**: Clear Next.js cache and trigger re-render → `src/app/actions/company-switch.ts:36`

### Atomic Transaction

The switch operation uses a database transaction to ensure consistency → `src/app/actions/company-switch.ts:23-34`:

```typescript
await db.$transaction([
  // Remove default from all user's companies
  db.companyUser.updateMany({
    where: { userId: user.id! },
    data: { isDefault: false },
  }),
  // Set new default
  db.companyUser.update({
    where: { id: companyUser.id },
    data: { isDefault: true },
  }),
])
```

**Why Transaction?**

- Ensures only one company is marked as default at a time
- Prevents race conditions if user switches companies rapidly
- Maintains data integrity if operation is interrupted

### Access Control

**Verification Check** → `src/app/actions/company-switch.ts:11-20`

Before allowing switch, system verifies CompanyUser relationship exists:

```typescript
const companyUser = await db.companyUser.findFirst({
  where: {
    userId: user.id!,
    companyId: companyId,
  },
})

if (!companyUser) {
  return { error: "Nemate pristup ovoj tvrtki" }
}
```

**Error Handling:**

- Returns Croatian error message: "Nemate pristup ovoj tvrtki" (You don't have access to this company)
- Prevents unauthorized company access
- No role check required (any role can switch to companies they have access to)

## Get User Companies Action

**Function: getUserCompanies** → `src/app/actions/company-switch.ts:40-64`

Fetches all companies the user has access to with relevant metadata:

```typescript
export async function getUserCompanies() {
  const user = await requireAuth()

  const companies = await db.companyUser.findMany({
    where: { userId: user.id! },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          oib: true,
        },
      },
    },
    orderBy: { company: { name: "asc" } },
  })

  return companies.map((cu) => ({
    id: cu.company.id,
    name: cu.company.name,
    oib: cu.company.oib,
    isDefault: cu.isDefault,
    role: cu.role,
  }))
}
```

**Features:**

- Returns minimal company data (id, name, oib)
- Includes user's role and default status for each company
- Sorted alphabetically by company name for consistent UI
- Called on every page load to populate switcher

## Client-Side Interaction

### Transition Handling

Uses React's `useTransition` hook for optimistic UI updates → `src/components/layout/company-switcher.tsx:22,35-39`

```typescript
const [isPending, startTransition] = useTransition()

const handleSwitch = (companyId: string) => {
  startTransition(async () => {
    await switchCompany(companyId)
    setIsOpen(false)
  })
}
```

**Benefits:**

- Shows loading state during company switch
- Disables buttons to prevent double-clicks
- Provides smooth user experience during navigation
- Automatically handles loading states

### Dropdown Management

**Open/Close Logic** → `src/components/layout/company-switcher.tsx:44,59-86`

- Click trigger button toggles dropdown
- Selecting company closes dropdown automatically
- No click-outside handler (user must select or click trigger again)

**Visual States:**

- Trigger button disabled while `isPending`
- Chevron rotates 180° when dropdown is open
- Company items disabled while `isPending`
- Current company has blue background and checkmark icon

## Layout Integration

### Header Component

**Company Switcher Placement** → `src/components/layout/header.tsx:80-121`

The switcher is positioned in the left section of the header, between the logo and onboarding progress:

```
[Logo] [CompanySwitcher] [OnboardingProgress] [PlanBadge] ... [Actions] [Notifications] [UserMenu]
```

**Conditional Rendering:**

- Only renders if `currentCompany` exists
- Only renders if `companies.length > 0`
- Only visible on desktop (lg+ breakpoint)

### Dashboard Layout

The dashboard layout retrieves the current company for context → `src/app/(dashboard)/layout.tsx:21-26`:

```typescript
let currentCompany: Awaited<ReturnType<typeof getCurrentCompany>> | null = null
try {
  currentCompany = await getCurrentCompany(session.user.id)
} catch {
  // User not fully set up yet
}
```

This company context is passed to:

- Header (for switcher and company status)
- Sidebar (for company-specific navigation)
- MobileNav (for company name display)

## Dependencies

- **Depends on**:
  - [[auth-session]] - User must be authenticated → `src/app/actions/company-switch.ts:8`
  - [[company-management]] - Company records must exist
  - [[auth-rbac]] - Role-based access control for company permissions

- **Depended by**:
  - All dashboard features - Every feature operates within company context
  - [[dashboard-onboarding]] - Company selection affects onboarding flow
  - [[settings-company]] - Company settings page shows current company

## Integrations

None - This is a pure database and UI feature with no external API integrations.

## Verification Checklist

- [x] Authenticated user can see company switcher if they have multiple companies
- [x] User with single company sees static company name display
- [x] Dropdown shows all companies user has access to
- [x] Companies are sorted alphabetically by name
- [x] Each company shows name and OIB in dropdown
- [x] Current company is highlighted with blue background
- [x] Current company shows checkmark icon
- [x] Clicking a company switches the default company
- [x] isDefault flag updates atomically in transaction
- [x] Previous default company is cleared when switching
- [x] Page revalidates after switch to refresh context
- [x] User cannot switch to company they don't have access to
- [x] Error message shown if unauthorized access attempted
- [x] Buttons are disabled during pending transition
- [x] Dropdown closes after company selection
- [x] Switcher only appears on desktop (lg+ breakpoint)
- [x] All subsequent requests use new company context

## Evidence Links

1. `src/components/layout/company-switcher.tsx:14-89` - Main CompanySwitcher component with dropdown UI
2. `src/app/actions/company-switch.ts:7-38` - switchCompany server action with transaction
3. `src/app/actions/company-switch.ts:40-64` - getUserCompanies server action
4. `src/lib/auth-utils.ts:20-41` - getCurrentCompany with default fallback logic
5. `src/components/layout/header.tsx:91-99` - CompanySwitcher integration in Header
6. `prisma/schema.prisma:132-146` - CompanyUser model with isDefault field
7. `prisma/schema.prisma:784-789` - Role enum definition
8. `src/app/actions/company-switch.ts:23-34` - Atomic transaction for isDefault update
9. `src/components/layout/company-switcher.tsx:26-32` - Single company mode UI
10. `src/components/layout/company-switcher.tsx:35-39` - useTransition for optimistic updates
11. `src/app/(dashboard)/layout.tsx:21-26` - Dashboard layout company context loading
