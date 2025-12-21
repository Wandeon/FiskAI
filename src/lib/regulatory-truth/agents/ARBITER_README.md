# Arbiter Agent

## Overview

The Arbiter agent resolves conflicts between regulatory rules using the Croatian legal hierarchy and conflict resolution strategies.

## Purpose

When the Reviewer agent detects conflicting rules (e.g., two sources stating different values for the same regulation), it creates a `RegulatoryConflict` record and escalates to the Arbiter. The Arbiter uses AI to analyze both rules with their source evidence and determine which should prevail.

## Resolution Hierarchy

The Arbiter follows these strategies (in order of priority):

### 1. Legal Hierarchy

Higher authority sources always win:

```
1. LAW          (Zakon - Parliamentary law from Narodne novine)
2. GUIDANCE     (Uputa - Tax authority guidance from Porezna uprava)
3. PROCEDURE    (Pravilnik - Technical execution from FINA, HZMO, HZZO)
4. PRACTICE     (Praksa - What passes inspections)
```

### 2. Temporal (lex posterior)

Newer law supersedes older:

- Later `effectiveFrom` date wins
- More recent source publication wins

### 3. Specificity (lex specialis)

More specific rule trumps general:

- Narrower `appliesWhen` conditions win
- Industry-specific rules beat general rules

### 4. Conservative

When uncertain, choose stricter interpretation:

- Higher tax rates
- Shorter deadlines
- Stricter compliance requirements

## Escalation Criteria

The Arbiter automatically escalates to human review when:

1. **Low confidence** - Resolution confidence < 0.8
2. **Critical conflicts** - Both rules are T0 (critical tier)
3. **Equal authority** - Both rules have same authority level and hierarchy strategy was used
4. **Same effective date** - Both rules effective on same date and temporal strategy was used
5. **Low rule confidence** - Either rule has confidence < 0.85
6. **Novel patterns** - Conflict type not seen before
7. **High financial impact** - Estimated impact > €10,000

## Usage

### Resolve a Single Conflict

```typescript
import { runArbiter } from "@/lib/regulatory-truth/agents"

const result = await runArbiter(conflictId)

if (result.success) {
  console.log(`Resolution: ${result.resolution}`)
  // RULE_A_PREVAILS | RULE_B_PREVAILS | MERGE_RULES | ESCALATE_TO_HUMAN
}
```

### Batch Process Conflicts

```typescript
import { runArbiterBatch } from "@/lib/regulatory-truth/agents"

const results = await runArbiterBatch(10) // Process up to 10 conflicts

console.log(`Resolved: ${results.resolved}`)
console.log(`Escalated: ${results.escalated}`)
console.log(`Failed: ${results.failed}`)
```

### Get Pending Conflicts

```typescript
import { getPendingConflicts } from "@/lib/regulatory-truth/agents"

const conflicts = await getPendingConflicts()

for (const conflict of conflicts) {
  console.log(`${conflict.conflictType}: ${conflict.description}`)
  console.log(`  Rule A: ${conflict.itemA.titleHr} (${conflict.itemA.riskTier})`)
  console.log(`  Rule B: ${conflict.itemB.titleHr} (${conflict.itemB.riskTier})`)
}
```

## CLI Usage

Run from project root:

```bash
# Resolve all open conflicts
tsx src/lib/regulatory-truth/scripts/run-arbiter.ts

# Resolve a specific conflict
tsx src/lib/regulatory-truth/scripts/run-arbiter.ts <conflict-id>
```

## Resolution Actions

### RULE_A_PREVAILS

- Rule A is marked as active
- Rule B is deprecated
- Rule B's `status` set to `DEPRECATED`
- Conflict marked as `RESOLVED`

### RULE_B_PREVAILS

- Rule B is marked as active
- Rule A is deprecated
- Rule A's `status` set to `DEPRECATED`
- Conflict marked as `RESOLVED`

### MERGE_RULES

- Both rules kept active
- Conflict marked as `ESCALATED`
- Human review required to manually merge

### ESCALATE_TO_HUMAN

- Both rules kept in current state
- Conflict marked as `ESCALATED`
- Added to human review queue

## Database Updates

The Arbiter updates:

1. **RegulatoryConflict** record:
   - `status` → `RESOLVED` or `ESCALATED`
   - `resolution` → JSON with winning item, strategy, rationale
   - `confidence` → AI confidence score
   - `requiresHumanReview` → boolean
   - `humanReviewReason` → explanation if escalated
   - `resolvedAt` → timestamp (if resolved)

2. **Losing RegulatoryRule** (if one prevails):
   - `status` → `DEPRECATED`
   - `reviewerNotes` → JSON with deprecation reason and conflict reference

3. **AgentRun** record:
   - Logs the agent execution
   - Stores input, output, confidence, duration
   - Links to conflict via metadata

## Input Schema

```typescript
interface ArbiterInput {
  conflictId: string
  conflictType:
    | "SOURCE_CONFLICT"
    | "TEMPORAL_CONFLICT"
    | "SCOPE_CONFLICT"
    | "INTERPRETATION_CONFLICT"
  conflictingItems: [
    {
      item_id: string
      item_type: "rule"
      claim: string // Full context including sources, dates, authority
    },
    {
      item_id: string
      item_type: "rule"
      claim: string
    },
  ]
}
```

## Output Schema

```typescript
interface ArbiterOutput {
  arbitration: {
    conflict_id: string
    conflict_type: ConflictType
    conflicting_items: ConflictingItem[]
    resolution: {
      winning_item_id: string
      resolution_strategy: "hierarchy" | "temporal" | "specificity" | "conservative"
      rationale_hr: string // Croatian explanation
      rationale_en: string // English explanation
    }
    confidence: number // 0.0-1.0
    requires_human_review: boolean
    human_review_reason: string | null
  }
}
```

## Examples

### Example 1: Authority Hierarchy

**Conflict**: Two rules about paušalni threshold

- Rule A: "40000 EUR" from LAW (Zakon, 2024)
- Rule B: "42000 EUR" from GUIDANCE (Porezna uprava, 2024)

**Resolution**: RULE_A_PREVAILS
**Strategy**: hierarchy
**Rationale**: "Zakon ima veću pravnu snagu od upute Porezne uprave"

### Example 2: Temporal Precedence

**Conflict**: Same regulation, different years

- Rule A: "25%" from LAW (effective 2024-01-01)
- Rule B: "20%" from LAW (effective 2023-01-01)

**Resolution**: RULE_A_PREVAILS
**Strategy**: temporal
**Rationale**: "Noviji zakon iz 2024 zamjenjuje zakon iz 2023 (lex posterior)"

### Example 3: Escalation

**Conflict**: Equal authority, same date

- Rule A: "5000 EUR" from LAW (2024-01-01, T0, confidence: 0.82)
- Rule B: "5500 EUR" from LAW (2024-01-01, T0, confidence: 0.80)

**Resolution**: ESCALATE_TO_HUMAN
**Reason**: "Both rules are T0 critical tier; confidence < 0.85 on both rules; same authority level and effective date - requires manual review"

## Error Handling

The Arbiter handles:

- **Missing conflict**: Returns error if conflict ID not found
- **Missing rules**: Returns error if either rule missing
- **AI failures**: Retries up to 3 times with exponential backoff
- **Invalid output**: Validates against schema, rejects if malformed
- **DB errors**: Rolls back transaction, logs error

## Monitoring

Track arbiter performance:

```sql
-- Recent arbitrations
SELECT
  id,
  "conflictType",
  status,
  confidence,
  "requiresHumanReview",
  "resolvedAt"
FROM "RegulatoryConflict"
WHERE "resolvedAt" > NOW() - INTERVAL '7 days'
ORDER BY "resolvedAt" DESC;

-- Arbitration success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
  COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated,
  COUNT(*) as total
FROM "RegulatoryConflict"
WHERE "resolvedAt" > NOW() - INTERVAL '30 days';

-- Agent performance
SELECT
  status,
  AVG("durationMs") as avg_duration_ms,
  AVG(confidence) as avg_confidence,
  COUNT(*) as runs
FROM "AgentRun"
WHERE "agentType" = 'ARBITER'
  AND "startedAt" > NOW() - INTERVAL '30 days'
GROUP BY status;
```

## Integration with Pipeline

The Arbiter fits into the agent pipeline:

```
Sentinel → Extractor → Composer → Reviewer
                                      ↓
                                 (conflict?)
                                      ↓
                                   Arbiter → Resolution
                                      ↓
                         (escalate?) → Human Review Queue
```

When Reviewer detects `ESCALATE_ARBITER`:

1. Creates `RegulatoryConflict` record
2. Arbiter processes conflict
3. Either resolves or escalates to human
4. Updates rule statuses accordingly

## Testing

Run tests:

```bash
node --import tsx --test src/lib/regulatory-truth/__tests__/arbiter.test.ts
```

Tests cover:

- Schema validation
- Authority level ordering
- Escalation criteria detection
- Resolution logic

## Future Enhancements

1. **Merge Support**: Implement MERGE_RULES resolution that combines compatible rules
2. **Multi-rule Conflicts**: Support conflicts between 3+ rules
3. **Pattern Learning**: Learn from human overrides to improve resolution strategies
4. **Impact Analysis**: Calculate financial impact of choosing each rule
5. **Confidence Calibration**: Adjust confidence scores based on historical accuracy
