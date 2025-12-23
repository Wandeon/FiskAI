# Task 9: Fix Rules Pending Review Without Source Pointers

**Date:** 2025-12-23
**Plan:** /home/admin/FiskAI/docs/plans/2025-12-23-regulatory-truth-p0p1-fixes.md
**Issue:** RTL-009

## Problem

Some rules have been created without proper source pointers, making them impossible to verify. This violates the core principle of the Regulatory Truth Layer: all rules must be traceable to evidence.

**Database Audit:**

- Total rules in database: 29
- Rules without source pointers: 1 (3.45%)
- Status breakdown:
  - PENDING_REVIEW: 1
- Risk tier breakdown:
  - T0 (Critical): 1

**Problematic Rule:**

- ID: `cmjfyu6kj0004e9wa5ndbtxeo`
- Concept: `fiskalizacija-datum-primjene`
- Status: `PENDING_REVIEW`
- Risk Tier: `T0` (Critical - should never be auto-approved)
- Confidence: 1.0
- Created: 2025-12-21

## Implementation

### 1. Composer Validation

**File:** `/home/admin/FiskAI/src/lib/regulatory-truth/agents/composer.ts`

Added two critical validation steps before creating a rule:

1. **Non-empty validation:** Check that at least one source pointer ID was provided
2. **Existence validation:** Verify all pointer IDs exist in the database

**Code added (lines 165-199):**

```typescript
// CRITICAL VALIDATION: Rules MUST have at least one source pointer
// Without source pointers, rules cannot be verified or traced back to evidence
if (validSourcePointerIds.length === 0) {
  console.error(`[composer] Cannot create rule without source pointers: ${draftRule.concept_slug}`)
  return {
    success: false,
    output: result.output,
    ruleId: null,
    error: `Cannot create rule "${draftRule.concept_slug}" without source pointers. Rules must be traceable to evidence.`,
  }
}

// Verify all pointer IDs exist in database
const existingPointers = await db.sourcePointer.findMany({
  where: { id: { in: validSourcePointerIds } },
  select: { id: true },
})

if (existingPointers.length !== validSourcePointerIds.length) {
  const missingIds = validSourcePointerIds.filter(
    (id) => !existingPointers.some((p) => p.id === id)
  )
  console.error(
    `[composer] Missing source pointers for ${draftRule.concept_slug}: expected ${validSourcePointerIds.length}, found ${existingPointers.length}`
  )
  console.error(`[composer] Missing IDs: ${missingIds.join(", ")}`)
  return {
    success: false,
    output: result.output,
    ruleId: null,
    error: `Cannot create rule "${draftRule.concept_slug}": ${missingIds.length} source pointer(s) not found in database`,
  }
}
```

**Behavior:**

- Prevents creation of new rules without source pointers
- Returns clear error messages for debugging
- Logs warnings to console for monitoring
- Early return prevents database writes

### 2. Admin API Endpoint

**File:** `/home/admin/FiskAI/src/app/api/admin/regulatory-truth/rules/check-pointers/route.ts`

Created new admin endpoint for identifying and fixing problematic rules.

#### GET /api/admin/regulatory-truth/rules/check-pointers

Lists all rules without source pointers with detailed statistics.

**Response:**

```json
{
  "total": 29,
  "withoutPointers": 1,
  "percentageWithoutPointers": "3.45",
  "byStatus": {
    "PENDING_REVIEW": 1
  },
  "byRiskTier": {
    "T0": 1
  },
  "rules": [
    {
      "id": "cmjfyu6kj0004e9wa5ndbtxeo",
      "conceptSlug": "fiskalizacija-datum-primjene",
      "status": "PENDING_REVIEW",
      "riskTier": "T0",
      "confidence": 1,
      "createdAt": "2025-12-21T16:53:02.272Z",
      "pointerCount": 0
    }
  ]
}
```

#### POST /api/admin/regulatory-truth/rules/check-pointers

Flags or deletes rules without source pointers.

**Request:**

```json
{
  "action": "flag", // or "delete"
  "dryRun": true // default: true
}
```

**Actions:**

- `flag`: Moves rules to `REJECTED` status with explanatory notes
- `delete`: Permanently removes rules from database
- `dryRun`: Preview changes without applying them

**Response:**

```json
{
  "dryRun": true,
  "action": "flag",
  "totalRulesWithoutPointers": 1,
  "affected": 1,
  "changes": [
    {
      "id": "cmjfyu6kj0004e9wa5ndbtxeo",
      "conceptSlug": "fiskalizacija-datum-primjene",
      "oldStatus": "PENDING_REVIEW",
      "newStatus": "REJECTED",
      "action": "would-flag"
    }
  ]
}
```

## Testing

### TypeScript Compilation

```bash
npx tsc --noEmit --skipLibCheck
```

✅ No errors

### API Endpoint Testing

```bash
# Check for rules without pointers
curl http://localhost:3000/api/admin/regulatory-truth/rules/check-pointers

# Dry run flag operation
curl -X POST http://localhost:3000/api/admin/regulatory-truth/rules/check-pointers \
  -H "Content-Type: application/json" \
  -d '{"action": "flag", "dryRun": true}'
```

## Results

### Current State

- 1 rule without source pointers identified
- Rule is T0 (Critical) risk tier - should have never been auto-approved
- Rule is in PENDING_REVIEW status

### Future Prevention

- ✅ Composer now validates source pointers before creating rules
- ✅ Clear error messages returned when validation fails
- ✅ Admin endpoint available for identifying problematic rules
- ✅ Ability to flag or delete rules without pointers

### Recommendations

1. **Immediate Action:** Flag the existing rule without pointers:

   ```bash
   curl -X POST http://localhost:3000/api/admin/regulatory-truth/rules/check-pointers \
     -H "Content-Type: application/json" \
     -d '{"action": "flag", "dryRun": false}'
   ```

2. **Investigation:** Determine how this rule was created without source pointers
   - Check creation logs
   - Review data migration scripts
   - Verify if this was a manual creation

3. **Monitoring:** Add to watchdog system:
   - Alert on any rules created without source pointers
   - Daily check for orphaned rules
   - Include in quality metrics

## Commit

```
fix(regulatory-truth): validate source pointers in composer

CRITICAL FIX: Rules without source pointers cannot be verified or traced
back to evidence. This fix ensures all new rules have valid source pointers.

Changes:
- Add validation in composer to require at least one source pointer
- Verify all pointer IDs exist in database before creating rule
- Return clear error messages when validation fails
- Create /api/admin/regulatory-truth/rules/check-pointers endpoint:
  * GET - List all rules without source pointers
  * POST - Flag or delete problematic rules (with dry-run option)

Fixes RTL-009
```

## Status

✅ **COMPLETE**

- [x] Add validation in composer to require source pointers
- [x] Reject rules without valid source pointers
- [x] Create script to identify existing problematic rules
- [x] TypeScript check passes
- [x] Commit with proper message
- [x] Document implementation
