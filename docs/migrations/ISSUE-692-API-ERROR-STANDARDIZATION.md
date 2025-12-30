# Issue #692: Standardized API Error Response Migration

**Status:** In Progress
**Created:** 2025-12-30
**Issue:** [#692 - Inconsistent 500 Error Response Format](https://github.com/wandeon/FiskAI/issues/692)

## Problem

API routes return 500 errors in inconsistent formats, creating security risks and debugging challenges:

1. **Security Risk:** Some routes expose raw `error.message` which may leak:
   - Internal error details to clients
   - Stack traces or internal paths
   - Prisma/database errors revealing schema

2. **Debugging Impact:**
   - No consistent error code for client handling
   - Missing correlation ID in responses
   - Inconsistent error formats across 20+ API routes

## Solution

Created a standardized `apiError()` utility at `/src/lib/api-error.ts` that:

- ✅ Logs full error details server-side (with pino's automatic redaction)
- ✅ Returns safe, generic message to client for 5xx errors
- ✅ Includes request ID for support correlation (from AsyncLocalStorage context)
- ✅ Prevents sensitive data leakage
- ✅ Provides consistent error code format

## API Error Utility

### Core Function

```typescript
// src/lib/api-error.ts
export function apiError(
  error: unknown,
  options: ApiErrorOptions = {}
): NextResponse {
  const {
    status = 500,
    code = "INTERNAL_ERROR",
    message = "Internal server error",
    requestId: explicitRequestId,
    logContext = {},
  } = options

  // Get request ID from context
  const context = getContext()
  const requestId = explicitRequestId || context?.requestId

  // Log full error server-side (pino redacts sensitive fields)
  logger.error({
    error,
    code,
    status,
    requestId,
    ...logContext,
  }, "API error")

  // Return safe response to client
  return NextResponse.json(
    {
      error: message,
      code,
      ...(requestId && { requestId }),
    },
    { status }
  )
}
```

### Helper Functions

```typescript
export const ApiErrors = {
  internal(error: unknown, logContext?: Record<string, unknown>),
  unauthorized(message = "Unauthorized"),
  forbidden(message = "Forbidden"),
  notFound(message = "Not found"),
  badRequest(message, details?),
  conflict(message, details?),
}
```

## Migration Pattern

### Before (Insecure)

```typescript
// ❌ INSECURE: Exposes error.message to client
try {
  await someOperation()
} catch (error) {
  console.error("Error executing action:", error)
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Internal server error" },
    { status: 500 }
  )
}
```

### After (Secure)

```typescript
// ✅ SECURE: Logs full error, returns generic message
import { apiError, ApiErrors } from "@/lib/api-error"

try {
  await someOperation()
} catch (error) {
  return apiError(error)
  // Server logs: full error with stack trace, request ID, user/company context
  // Client gets: { "error": "Internal server error", "code": "INTERNAL_ERROR", "requestId": "..." }
}
```

### Examples by Pattern

#### Pattern 1: Generic 500 errors

**Before:**
```typescript
} catch (error) {
  logger.error({ error }, "Failed to process")
  return NextResponse.json({ error: "Failed to process" }, { status: 500 })
}
```

**After:**
```typescript
import { apiError } from "@/lib/api-error"

} catch (error) {
  return apiError(error)
}
```

#### Pattern 2: 500 with exposed details

**Before:**
```typescript
} catch (error) {
  return NextResponse.json(
    { error: "Failed to process", details: error.message },
    { status: 500 }
  )
}
```

**After:**
```typescript
import { apiError } from "@/lib/api-error"

} catch (error) {
  return apiError(error)
}
```

#### Pattern 3: 401/403 errors

**Before:**
```typescript
if (!user || user.systemRole !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**After:**
```typescript
import { ApiErrors } from "@/lib/api-error"

if (!user || user.systemRole !== "ADMIN") {
  return ApiErrors.forbidden("ADMIN role required")
}
```

## Migration Progress

### Phase 1: Core Utility (Completed)
- [x] Create `/src/lib/api-error.ts`
- [x] Implement `apiError()` function
- [x] Implement `ApiErrors` helpers
- [x] Integrate with existing logger and context

### Phase 2: Route Migration (In Progress)

Routes updated to use `apiError()`:

**High Priority (Mentioned in Issue #692):**
- [ ] `/src/app/api/admin/tenants/[companyId]/actions/route.ts`
- [ ] `/src/app/api/pausalni/preferences/route.ts`
- [ ] `/src/app/api/e-invoices/receive/route.ts`
- [ ] `/src/app/api/admin/system-status/refresh/route.ts`

**All Routes:**
Total affected: ~205 route files

Use this grep to find routes still using old patterns:
```bash
# Find routes with 500 errors not using apiError
grep -r "{ status: 500 }" src/app/api --include="route.ts" | \
  grep -v "import.*apiError"
```

## Testing

Test error responses return consistent format:

```typescript
// Expected response format
{
  "error": "Internal server error",  // Safe message
  "code": "INTERNAL_ERROR",          // Consistent error code
  "requestId": "uuid-here"           // For support correlation
}
```

Server logs should include:
- Full error object with stack trace
- Request ID
- User ID and Company ID (from context)
- Any additional logContext provided

## Security Benefits

1. **No Information Disclosure:** Generic messages prevent leaking:
   - Database schema (Prisma errors)
   - Internal file paths (stack traces)
   - Sensitive business logic details

2. **Consistent Error Codes:** Clients can handle errors programmatically without parsing messages

3. **Request Correlation:** Support can trace issues using `requestId` without exposing internals

4. **Automatic Redaction:** Pino logger redacts sensitive fields (passwords, tokens, etc.)

## Notes

- The `apiError()` function automatically uses the request ID from AsyncLocalStorage context
- All server-side logging benefits from pino's built-in redaction of sensitive fields
- For 4xx errors where details are safe to expose, use `ApiErrors` helpers with custom messages
- The utility integrates seamlessly with existing `withApiLogging()` middleware

## Related Files

- `/src/lib/api-error.ts` - Core utility
- `/src/lib/logger.ts` - Logger with automatic redaction
- `/src/lib/context.ts` - AsyncLocalStorage for request context
- `/src/lib/api-logging.ts` - API middleware that sets up context

## References

- GitHub Issue: #692
- Pull Request: #TBD
