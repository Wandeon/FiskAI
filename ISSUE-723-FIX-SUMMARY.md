# Fix for Issue #723: Tenant Data Export Security

## Problem
The `exportTenantData` function in `/home/admin/FiskAI/src/lib/admin/actions.ts` (lines 234-346) has critical security vulnerabilities:

1. **No rate limiting** - admins can bulk export all tenant data rapidly
2. **No audit logging** - no record of who exported what data
3. **Exposes bank balances** - `currentBalance` field included in exports
4. **Exposes yearly revenue** - sensitive business metric calculated and exported
5. **No tenant notification** - tenants unaware when their data is accessed

## Proposed Solution

### 1. Add ADMIN_EXPORT Rate Limit

**File:** `/home/admin/FiskAI/src/lib/security/rate-limit.ts` (line 77)

Add new rate limit after `STAFF_BULK_EXPORT`:

```typescript
  ADMIN_EXPORT: {
    attempts: 10, // 10 tenant data exports per hour per admin
    window: 60 * 60 * 1000, // 1 hour
    blockDuration: 60 * 60 * 1000, // 1 hour block
  },
```

Remove the duplicate closing brace on line 78 (there's currently a `},` that should be removed).

### 2. Update exportTenantData Function

**File:** `/home/admin/FiskAI/src/lib/admin/actions.ts`

#### Add Imports (after line 6):
```typescript
import { checkRateLimit } from "@/lib/security/rate-limit"
import { logAudit } from "@/lib/audit"
```

#### Replace lines 234-346 with the secure version:

Key changes:
- Add rate limiting check at the start
- Remove `currentBalance` from bankAccounts select
- Replace `yearlyRevenue` calculation with comment indicating it's redacted
- Add `exportedBy` field to track who exported
- Map bank accounts to exclude currentBalance
- Add audit logging after export
- Add security notification logging

**Croatian error messages:**
- Rate limit error: `Ograničenje stope: Maksimalno 10 izvoza po satu. Pokušajte ponovno za ${resetMinutes} min.`
- Company not found: `Tvrtka nije pronađena`
- Unknown error: `Nepoznata greška`

### 3. Security Improvements Summary

✅ **Rate Limiting**: Max 10 exports per hour per admin
✅ **Audit Logging**: Every export logged with admin ID, company ID, and record counts
✅ **Redacted Fields**:
  - `bankAccounts.currentBalance` - removed from query and mapped out
  - `statistics.yearlyRevenue` - removed, comment added
✅ **Accountability**: Export includes `exportedBy` with admin details
✅ **Notifications**: Console logs for security team (email integration placeholder)

### 4. Testing Checklist

- [ ] Rate limit prevents more than 10 exports per hour
- [ ] Audit log entry created for each export
- [ ] Bank account balances not in export data
- [ ] Yearly revenue not in export data
- [ ] Export includes admin who performed it
- [ ] Croatian error messages display correctly

## Implementation Notes

This fix addresses all points from the security audit:
1. ✅ Rate limiting implemented
2. ✅ Audit logging added
3. ✅ Bank balances redacted
4. ✅ Yearly revenue redacted
5. ✅ Export attribution added
6. ⚠️  Tenant notification (logging added, email TODO)

**Note:** Two-person authorization and approval workflows were deemed out of scope for this initial fix but can be added in a future enhancement.
