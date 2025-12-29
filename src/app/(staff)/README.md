# Staff Route Group

This route group contains the staff portal pages accessible via `staff.fiskai.hr` subdomain.

## Implementation Status

- [x] Route group structure created
- [x] Layout with sidebar/header
- [x] Middleware-based subdomain routing (see `/src/middleware.ts`)
- [x] StaffClientProvider context
- [x] Client list with assignment data
- [x] Client context routes (`/clients/[clientId]/*`)

## Access Control

- Requires `systemRole === "STAFF"` or `systemRole === "ADMIN"`
- Middleware at `/src/middleware.ts` handles:
  - Subdomain detection via `getSubdomain()`
  - Role-based access via `canAccessSubdomain()`
  - Route rewriting to `/(staff)` group
- Staff only see clients they are assigned to via `StaffAssignment` model

## Pages

- `/staff-dashboard` - Staff overview with metrics
- `/clients` - Assigned clients list
- `/clients/[clientId]` - Client overview
- `/clients/[clientId]/invoices` - Client invoices
- `/clients/[clientId]/expenses` - Client expenses
- `/clients/[clientId]/contacts` - Client contacts
- `/clients/[clientId]/products` - Client products
- `/clients/[clientId]/reports` - Client reports
- `/calendar` - Shared deadlines view (stub)
- `/tasks` - Assigned work items (stub)
- `/tickets` - Support tickets from clients (stub)
- `/documents` - Cross-client document access (stub)
- `/settings` - Staff settings

## Subdomain Routing Flow

1. Request arrives at `staff.fiskai.hr`
2. Middleware detects subdomain via `x-forwarded-host` header
3. `getSubdomain()` returns `"staff"`
4. `canAccessSubdomain()` verifies user has STAFF or ADMIN role
5. Request is rewritten to `/(staff)` route group
6. Layout checks session and redirects if unauthorized
