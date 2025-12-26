# Visible Reasoning UX Design

> **Status:** Approved (Rev 2)
> **Author:** Product & Engineering
> **Date:** 2025-12-26
> **Revision:** 2 — incorporates audit feedback
> **Scope:** Assistant UX transformation from instant-answer to transparent reasoning

---

## 1. Product Goal & Principles

### Goal

Transform FiskAI from an instant-answer chatbot into a transparent, step-by-step regulatory analysis experience that explicitly shows _how_ an answer is reached, not just _what_ the answer is.

### Core Insight

In high-risk legal/tax domains, users don't trust speed. They trust visible effort, structure, and honesty about uncertainty. We stream _credibility_, not tokens.

### Design Principles

1. **Epistemic Streaming** (visible reasoning milestones) — Stream knowledge acquisition, not raw computation
2. **Transparency over brevity** — Show what we searched, what we found, how we reasoned
3. **Uncertainty is explicit** — Confidence signals, missing data, and limitations are always visible
4. **Failure is visible** — If research stops, users see exactly where and why
5. **Slower is acceptable** — We trade speed for trust in high-risk domains
6. **Copy discipline** — User-facing messages are treated like API surface; changes require review

> _Note: This model is default for high-risk regulatory domains (T0/T1). Lower-risk queries (T2/T3) use adaptive UX intensity._

### Terminal Outcomes

| Outcome            | When                                              | User Experience                                         |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| `ANSWER`           | Verified, citable response with evidence          | Confident, actionable answer with citations             |
| `QUALIFIED_ANSWER` | Valid answer with disclosed conflicts/caveats     | Answer with visible warnings about source disagreements |
| `REFUSAL`          | Expected stop (no rules, missing data, ambiguous) | Clear message with next steps                           |
| `ERROR`            | Infrastructure failure                            | Apologetic message with correlation ID                  |

### Success Metric

Users report the system feels like a "professional advisor researching their question" rather than "a chatbot generating an answer."

---

## 2. UX Flow — The Seven Stages

Every regulatory question flows through seven visible stages. Users see each stage as it executes, building trust through demonstrated effort.

| #   | Stage                         | Streaming Mode                | What User Sees                                             |
| --- | ----------------------------- | ----------------------------- | ---------------------------------------------------------- |
| 1   | **Question Intake**           | Buffered                      | "Analysing your question..."                               |
| 2   | **Context Resolution**        | Buffered + Clarification Gate | Domain, jurisdiction, risk level, temporal context         |
| 3   | **Source Discovery**          | **True Progressive**          | Sources searched and found, streamed live                  |
| 4   | **Rule Retrieval**            | Buffered                      | Concepts matched, rules retrieved                          |
| 5   | **Applicability & Conflicts** | Buffered                      | Rules filtered with explanations, conflicts detected       |
| 6   | **Analysis**                  | Hybrid                        | Checkpoints streamed: "Comparing X vs Y..."                |
| 7   | **Confidence & Answer**       | Buffered + Pause              | Confidence frame, then final answer after deliberate pause |

### Stage Details

**Stages 1-2 (Context Resolution):**

> ⚠️ **Important:** Context resolution is _probabilistic_, not deterministic. Jurisdiction, domain, and intent inference can fail.

Behavior:

- Resolve jurisdiction, domain, risk tier, temporal context
- Compute **context confidence score** (0-1)
- If confidence < 0.9: **pause pipeline and ask clarification question**
- Resume only after user confirms context

Example clarification:

> "Before we research, we need to confirm we understood your situation correctly. Are you asking about Croatian VAT for e-commerce sales?"

**Stage 3 (Source Discovery):** _This is where authenticity matters most._ Stream each source as found:

- "Searching Porezna uprava..."
- "Searching EU VAT directives..."
- "Found 3 relevant sources"

**Stages 4-5 (Retrieval & Applicability):**

Exclusions are **rule-level with explanations**, not just counts:

```typescript
exclusions: [
  {
    ruleId: "oss-threshold-check",
    code: "THRESHOLD_EXCEEDED",
    expected: "≤€10,000",
    actual: "€15,000",
    source: "user profile",
  },
]
```

UX renders as:

> "Excluded because your turnover (€15,000) exceeds the OSS threshold (€10,000)."

This enables user self-correction.

**Stage 6 (Analysis):** Stream checkpoints showing intellectual work:

- "Evaluating OSS threshold applicability..."
- "Comparing Croatian VAT Act vs EU Directive..."
- "Checking temporal validity (as of today)..."

**Stage 7 (Confidence & Answer):**

- Confidence badge with drivers: "HIGH — based on LAW authority, multi-source verification"
- Interactive drivers (see Section 10: Counterfactual Simulation)
- **Deliberate pause** before answer (the pause _is_ the feature)
- Final answer in plain language: "What this means for you"

**Post-Completion:** Stepper collapses into chat-inline cards. User can expand any stage for details.

---

## 3. Adaptive UX Intensity

Not every question needs all seven visible stages.

### Behavior by Risk Tier

| Risk Tier         | Internal Pipeline | External UX                                 |
| ----------------- | ----------------- | ------------------------------------------- |
| **T0 (Critical)** | Full pipeline     | Full visible reasoning, all stages expanded |
| **T1 (High)**     | Full pipeline     | Full visible reasoning                      |
| **T2 (Medium)**   | Full pipeline     | Collapsed stages, expand on click           |
| **T3 (Low)**      | Full pipeline     | Morphing pill → Answer card only            |

### Key Rule

> **Never fake reasoning.** Internally, always run the full pipeline. Externally, only collapse _presentation_.

This prevents theatrical slowdown for trivial queries while maintaining audit integrity.

---

## 4. Streaming Architecture

The pipeline follows a **Generator + Sink** pattern. The generator is the single source of truth for reasoning events. Sinks consume events for different purposes.

```
┌─────────────────────────────────────────────────────────┐
│  buildAnswerWithReasoning(requestId, query, surface)    │
│  ─────────────────────────────────────────────────────  │
│  AsyncGenerator<ReasoningEvent, TerminalPayload>        │
│                                                         │
│  yield* contextResolutionStage(query)    ← may pause    │
│  yield* sourceDiscoveryStage(concepts)   ← live         │
│  yield* retrievalStage(sources)                         │
│  yield* applicabilityStage(rules, context)              │
│  yield* conflictsStage(eligibleRules)                   │
│  yield* analysisStage(rules)             ← checkpoints  │
│  yield* confidenceStage(analysis)                       │
│  return terminalPayload                                 │
└──────────────────────┬──────────────────────────────────┘
                       │ yields ReasoningEvent
                       ▼
┌─────────────────────────────────────────────────────────┐
│  consumeReasoning(generator, sinks: Sink[])             │
│  ─────────────────────────────────────────              │
│  for await (const event of generator) {                 │
│    for (const sink of sinks) {                          │
│      if (sink.mode === "criticalAwait" &&               │
│          event.severity === "critical") {               │
│        await sink.write(event)                          │
│      } else {                                           │
│        sink.write(event)  // non-blocking               │
│      }                                                  │
│    }                                                    │
│    if (isTerminal(event)) {                             │
│      await flushAllSinks(sinks)                         │
│      return event                                       │
│    }                                                    │
│  }                                                      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬───────────────┐
        ▼              ▼              ▼               ▼
   [SSE Sink]    [Audit Sink]   [Metrics Sink]  [Alert Sink]
   nonBlocking    buffered       nonBlocking    criticalAwait
```

### Sink Interface

```typescript
interface ReasoningSink {
  mode: "nonBlocking" | "buffered" | "criticalAwait"
  write(event: ReasoningEvent): void | Promise<void>
  flush?(): Promise<void>
}
```

### Key Invariants

1. Generator yields events in stage order — never out of sequence
2. Each stage yields `started` → (optional `progress`/`checkpoint`) → `complete`
3. Exactly one terminal event: `ANSWER`, `QUALIFIED_ANSWER`, `REFUSAL`, or `ERROR`
4. Terminal is both yielded (for UI) and returned (for wrappers)
5. Event IDs are monotonic per request (`{requestId}_{seq}`)

---

## 5. Event Schema

### Core Event Structure

```typescript
type ReasoningEvent = {
  v: 1 // schema version
  id: string // unique event ID
  requestId: string // correlation ID (first-class)
  seq: number // monotonic per request
  ts: string // ISO timestamp
  stage: ReasoningStage
  status: ReasoningStatus

  // Presentation layer
  message?: string // user-facing copy (localizable)
  severity?: "info" | "warning" | "critical"
  progress?: { current: number; total?: number }

  // Debug/audit (not shown to users)
  trace?: { runId: string; span?: string }
  meta?: Record<string, unknown>

  // Typed payload (discriminated by stage)
  data?: StagePayload
}

type ReasoningStage =
  | "CONTEXT_RESOLUTION"
  | "CLARIFICATION"
  | "SOURCES"
  | "RETRIEVAL"
  | "APPLICABILITY"
  | "CONFLICTS"
  | "ANALYSIS"
  | "CONFIDENCE"
  | "ANSWER"
  | "QUALIFIED_ANSWER"
  | "REFUSAL"
  | "ERROR"

type ReasoningStatus = "started" | "progress" | "checkpoint" | "complete" | "awaiting_input"
```

### Payload Types

| Stage                | Payload Contains                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `CONTEXT_RESOLUTION` | jurisdiction, domain, risk tier, intent, entities, asOfDate, **confidence**, **userContextSnapshot** |
| `CLARIFICATION`      | question, options, required (blocks pipeline until answered)                                         |
| `SOURCES`            | provider, sources found with authority level, summary                                                |
| `RETRIEVAL`          | concepts matched, rules retrieved count                                                              |
| `APPLICABILITY`      | eligible/ineligible counts, **rule-level exclusions with explanations**                              |
| `CONFLICTS`          | conflict count, resolved/unresolved, disclosed conflicts for QUALIFIED_ANSWER                        |
| `ANALYSIS`           | bullets (user-facing), compared sources                                                              |
| `CONFIDENCE`         | score, label, drivers, evidence strength, **interactive toggles**                                    |
| `ANSWER`             | answerHr, structured obligations/deadlines, citations, asOfDate                                      |
| `QUALIFIED_ANSWER`   | answerHr, citations, **conflictWarnings**, caveats                                                   |
| `REFUSAL`            | reason code, message, required fields                                                                |
| `ERROR`              | code, message, correlationId, retriable flag                                                         |

### Context Resolution Payload (with confidence gate)

```typescript
export interface ContextResolutionPayload {
  summary: string
  jurisdiction: "HR" | "EU" | "UNKNOWN"
  domain: "TAX" | "LABOR" | "COMPANY" | "FINANCE" | "OTHER"
  riskTier: "T0" | "T1" | "T2" | "T3"
  language: "hr" | "en"
  intent: "QUESTION" | "HOWTO" | "CHECKLIST" | "UNKNOWN"
  asOfDate: string
  entities: Array<{ type: string; value: string; confidence: number }>

  // Confidence gate
  confidence: number // 0-1
  requiresClarification: boolean // true if confidence < 0.9

  // Immutable snapshot for audit
  userContextSnapshot: {
    vatStatus?: "registered" | "unregistered" | "unknown"
    turnoverBand?: string
    companySize?: "micro" | "small" | "medium" | "large"
    jurisdiction?: string
    assumedDefaults: string[]
  }
}
```

### Applicability Payload (with rule-level explanations)

```typescript
export interface ApplicabilityPayload {
  summary: string
  eligibleCount: number
  ineligibleCount: number

  // Rule-level exclusions (not just counts)
  exclusions: Array<{
    ruleId: string
    ruleTitle: string
    code:
      | "THRESHOLD_EXCEEDED"
      | "DATE_MISMATCH"
      | "JURISDICTION_MISMATCH"
      | "MISSING_CONTEXT"
      | "CONDITION_FALSE"
    expected: string
    actual: string
    source: "user_profile" | "query" | "assumed_default"
    userCanFix: boolean
  }>
}
```

### Qualified Answer Payload

```typescript
export interface QualifiedAnswerPayload {
  asOfDate: string
  answerHr: string
  structured?: {
    obligations?: string[]
    deadlines?: string[]
    thresholds?: string[]
    exceptions?: string[]
    actions?: string[]
  }
  citations: Citation[]

  // Disclosed conflicts (not blocking, but visible)
  conflictWarnings: Array<{
    description: string
    sourceA: { name: string; says: string }
    sourceB: { name: string; says: string }
    practicalResolution?: string // "In practice, authorities usually apply..."
  }>

  caveats: string[]
  limits?: string[]
}
```

### Wire Format

Standard SSE with event types:

```
event: reasoning
id: req_abc123_001
data: {"v":1,"stage":"CONTEXT_RESOLUTION","status":"started",...}

event: reasoning
id: req_abc123_002
data: {"v":1,"stage":"CLARIFICATION","status":"awaiting_input",...}

event: reasoning
id: req_abc123_003
data: {"v":1,"stage":"SOURCES","status":"progress",...}

event: terminal
id: req_abc123_final
data: {"v":1,"stage":"QUALIFIED_ANSWER","status":"complete",...}

event: heartbeat
data: {"ts":"2025-12-26T10:00:05Z"}
```

---

## 6. Frontend Components

### Component Structure

**ReasoningStepper (Live Phase — Desktop)**

Rendered while the stream is active. Pinned near input area.

```typescript
interface ReasoningStepperProps {
  events: ReasoningEvent[]
  selectors: ReasoningSelectors
  streamState: "idle" | "streaming" | "awaiting_input" | "ended"
  terminalOutcome?: "ANSWER" | "QUALIFIED_ANSWER" | "REFUSAL" | "ERROR"
  riskTier: "T0" | "T1" | "T2" | "T3"
}
```

Behavior:

- T0/T1: Shows all stages, current expanded
- T2/T3: Shows collapsed stages, expand on click
- Completed stages: collapsed to single line with ✓
- Failed stage (ERROR only): stays expanded, shows error details
- "Last updated: 2.1s ago" liveness indicator

**MorphingPill (Live Phase — Mobile)**

Replaces stepper on mobile for T2/T3 queries.

```typescript
interface MorphingPillProps {
  currentStage: ReasoningStage
  streamState: "streaming" | "ended"
}
```

Behavior:

- Small pill that morphs through states: "Searching…" → "Analyzing…" → expands into Answer Card
- Tap to open full reasoning modal
- T0/T1 on mobile: use compact stepper, not pill

**ReasoningCard (History Phase)**

Inserted into chat after completion. One card per stage.

```typescript
interface ReasoningCardProps {
  stage: ReasoningStage
  completeEvent: ReasoningEvent
  allEvents: ReasoningEvent[]
  defaultExpanded: boolean
  riskTier: "T0" | "T1" | "T2" | "T3"
}
```

Behavior:

- Collapsed by default: shows `completeEvent.data.summary`
- "Show details" expands to full content
- Sources card shows top 3 + "+ N more"
- Confidence card shows badge + **interactive drivers** (see Section 10)
- Applicability card shows exclusion explanations

**AnswerCard (Terminal)**

```typescript
interface AnswerCardProps {
  payload: FinalAnswerPayload | QualifiedAnswerPayload | RefusalPayload | ErrorPayload
  outcome: "ANSWER" | "QUALIFIED_ANSWER" | "REFUSAL" | "ERROR"
}
```

QUALIFIED_ANSWER rendering:

- Answer text with normal confidence
- Yellow warning banner for each conflict
- "The VAT Act states X. A newer bylaw states Y. In practice, authorities usually apply Y."

### Event Selectors

```typescript
interface ReasoningSelectors {
  byStage: Record<ReasoningStage, ReasoningEvent[]>
  latestByStage: Record<ReasoningStage, ReasoningEvent | undefined>
  terminal?: ReasoningEvent
}

const REASONING_STAGES: ReasoningStage[] = [
  "CONTEXT_RESOLUTION",
  "SOURCES",
  "RETRIEVAL",
  "APPLICABILITY",
  "CONFLICTS",
  "ANALYSIS",
  "CONFIDENCE",
]
```

### State Machine

```
IDLE → STREAMING → AWAITING_INPUT → STREAMING → ENDED
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                          [ANSWER]         [QUALIFIED_ANSWER]    [REFUSAL]
                                                                      │
                                                                      ▼
                                                                  [ERROR]
```

---

## 7. Backend Pipeline Changes

### New Generator-Based Pipeline

```typescript
// src/lib/assistant/query-engine/reasoning-pipeline.ts

export async function* buildAnswerWithReasoning(
  requestId: string,
  query: string,
  surface: Surface,
  context?: CompanyContext,
  clarificationCallback?: (question: ClarificationQuestion) => Promise<ClarificationAnswer>
): AsyncGenerator<ReasoningEvent, TerminalPayload> {
  let seq = 0
  const emit = (partial: Partial<ReasoningEvent>): ReasoningEvent =>
    ({
      v: 1,
      id: `${requestId}_${String(seq).padStart(3, "0")}`,
      requestId,
      seq: seq++,
      ts: new Date().toISOString(),
      ...partial,
    }) as ReasoningEvent

  try {
    // Stage 1-2: Context Resolution (with confidence gate)
    yield emit({ stage: "CONTEXT_RESOLUTION", status: "started", message: "Analysing question..." })
    const resolution = await resolveContext(query, context)

    // Freeze user context for audit
    const userContextSnapshot = {
      vatStatus: context?.vatStatus,
      turnoverBand: context?.turnoverBand,
      companySize: context?.companySize,
      jurisdiction: context?.jurisdiction,
      assumedDefaults: resolution.assumedDefaults,
    }

    yield emit({
      stage: "CONTEXT_RESOLUTION",
      status: "complete",
      data: {
        ...resolution,
        userContextSnapshot,
        summary: `${resolution.jurisdiction} · ${resolution.domain} · ${resolution.riskTier}`,
      },
    })

    // Confidence gate: pause if < 90%
    if (resolution.confidence < 0.9 && clarificationCallback) {
      const question = buildClarificationQuestion(resolution)
      yield emit({
        stage: "CLARIFICATION",
        status: "awaiting_input",
        data: question,
      })

      const answer = await clarificationCallback(question)
      resolution.applyUserClarification(answer)

      yield emit({
        stage: "CLARIFICATION",
        status: "complete",
        data: { confirmedContext: resolution.summary },
      })
    }

    // Stage 3: Source Discovery (true progressive)
    yield emit({
      stage: "SOURCES",
      status: "started",
      message: "Searching authoritative sources...",
    })
    const sources: SourceSummary[] = []
    for await (const source of discoverSourcesIter(resolution.concepts)) {
      sources.push(source)
      yield emit({
        stage: "SOURCES",
        status: "progress",
        message: `Found: ${source.name}`,
        data: { source },
      })
    }
    yield emit({
      stage: "SOURCES",
      status: "complete",
      data: {
        summary: `Found ${sources.length} sources`,
        sources,
      },
    })

    // Stage 4: Retrieval
    yield emit({ stage: "RETRIEVAL", status: "started" })
    const candidates = await retrieveRules(resolution.concepts, resolution.asOfDate)
    yield emit({
      stage: "RETRIEVAL",
      status: "complete",
      data: {
        summary: `Retrieved ${candidates.length} candidate rules`,
        concepts: resolution.concepts,
      },
    })

    // Stage 5: Applicability (with rule-level explanations)
    yield emit({ stage: "APPLICABILITY", status: "started" })
    const { eligible, exclusions } = await evaluateApplicability(
      candidates,
      context,
      userContextSnapshot
    )
    yield emit({
      stage: "APPLICABILITY",
      status: "complete",
      data: {
        summary: `${eligible.length} rules apply to your situation`,
        eligibleCount: eligible.length,
        ineligibleCount: exclusions.length,
        exclusions: exclusions.map((e) => ({
          ruleId: e.rule.id,
          ruleTitle: e.rule.titleHr,
          code: e.code,
          expected: e.expected,
          actual: e.actual,
          source: e.source,
          userCanFix: e.userCanFix,
        })),
      },
    })

    // Stage 5b: Conflicts
    const conflicts = detectConflicts(eligible)
    yield emit({
      stage: "CONFLICTS",
      status: "complete",
      data: {
        summary:
          conflicts.unresolved > 0
            ? `${conflicts.unresolved} source disagreements (will be disclosed)`
            : "No conflicts detected",
        ...conflicts,
      },
    })

    // Stage 6: Analysis (with checkpoints)
    yield emit({ stage: "ANALYSIS", status: "started" })
    yield emit({ stage: "ANALYSIS", status: "checkpoint", message: "Comparing sources..." })
    const analysis = await analyzeRules(eligible)
    yield emit({
      stage: "ANALYSIS",
      status: "checkpoint",
      message: "Checking thresholds and conditions...",
    })
    yield emit({
      stage: "ANALYSIS",
      status: "complete",
      data: {
        summary: "Analysis complete",
        bullets: analysis.keyPoints,
      },
    })

    // Stage 7: Confidence
    const confidence = computeConfidence(analysis, sources, eligible, conflicts)
    yield emit({
      stage: "CONFIDENCE",
      status: "complete",
      data: {
        summary: `${confidence.label} confidence`,
        ...confidence,
        interactiveDrivers: confidence.drivers.map((d) => ({
          id: d.id,
          label: d.label,
          canToggle: d.affectsApplicability,
        })),
      },
    })

    // Terminal: Answer or Qualified Answer
    if (conflicts.unresolved > 0 && conflicts.canProceedWithWarning) {
      const answer = buildQualifiedAnswer(analysis, confidence, resolution.asOfDate, conflicts)
      yield emit({ stage: "QUALIFIED_ANSWER", status: "complete", data: answer })
      return { outcome: "QUALIFIED_ANSWER", ...answer }
    }

    if (conflicts.unresolved > 0 && !conflicts.canProceed) {
      const refusal = buildConflictRefusal(conflicts)
      yield emit({ stage: "REFUSAL", status: "complete", severity: "warning", data: refusal })
      return { outcome: "REFUSAL", ...refusal }
    }

    const answer = buildFinalAnswer(analysis, confidence, resolution.asOfDate)
    yield emit({ stage: "ANSWER", status: "complete", data: answer })
    return { outcome: "ANSWER", ...answer }
  } catch (err) {
    const errorPayload = {
      code: "INTERNAL",
      message: "An unexpected error occurred",
      correlationId: requestId,
      retriable: true,
    }
    yield emit({ stage: "ERROR", status: "complete", severity: "critical", data: errorPayload })
    return { outcome: "ERROR", ...errorPayload }
  }
}
```

### Backward Compatibility Wrapper

```typescript
// Maintains existing API contract
export async function buildAnswer(
  query: string,
  surface: Surface,
  companyId?: string
): Promise<AssistantResponse> {
  const requestId = nanoid()
  const context = companyId ? await loadCompanyContext(companyId) : undefined

  const generator = buildAnswerWithReasoning(requestId, query, surface, context)

  let terminal: TerminalPayload | undefined
  for await (const event of generator) {
    if (isTerminal(event)) {
      terminal = event.data as TerminalPayload
    }
  }

  if (!terminal) {
    throw new Error("Pipeline ended without terminal event")
  }

  const response = mapToLegacyResponse(terminal, requestId)

  // Fail-closed validation
  const validation = validateResponse(response)
  if (!validation.valid) {
    return buildFailClosedRefusal(requestId, validation.errors)
  }

  return response
}
```

---

## 8. Error Handling & Fail-Closed

### Error Categories

| Category                 | Terminal         | Severity | Code                       | User Message                           |
| ------------------------ | ---------------- | -------- | -------------------------- | -------------------------------------- |
| No citable rules         | REFUSAL          | info     | `NO_CITABLE_RULES`         | "We couldn't find verified sources"    |
| Missing client data      | REFUSAL          | info     | `MISSING_CLIENT_DATA`      | "We need more information"             |
| Ambiguous query          | REFUSAL          | info     | `NEEDS_CLARIFICATION`      | "Please clarify your question"         |
| Unsupported jurisdiction | REFUSAL          | info     | `UNSUPPORTED_JURISDICTION` | "We don't cover this jurisdiction yet" |
| Unsupported domain       | REFUSAL          | info     | `UNSUPPORTED_DOMAIN`       | "This topic is outside our scope"      |
| Out of scope             | REFUSAL          | info     | `OUT_OF_SCOPE`             | "This isn't a regulatory question"     |
| Disclosed conflict       | QUALIFIED_ANSWER | warning  | n/a                        | Answer with conflict warnings          |
| Unresolved conflict      | REFUSAL          | warning  | `UNRESOLVED_CONFLICT`      | "Sources disagree, can't verify"       |
| Validation failure       | ERROR            | critical | `VALIDATION_FAILED`        | "Something went wrong"                 |
| Capacity exceeded        | ERROR            | warning  | `CAPACITY`                 | "Service busy, try again"              |
| Timeout                  | ERROR            | warning  | `TIMEOUT`                  | "Request timed out"                    |
| Internal exception       | ERROR            | critical | `INTERNAL`                 | "Something went wrong"                 |

### Fail-Closed Invariants

If terminal is `ANSWER` or `QUALIFIED_ANSWER`, ALL of these must be true:

```typescript
interface AnswerInvariants {
  citations: Citation[] // non-empty, each with evidenceId
  asOfDate: string // present and used
  appliesWhenEvaluated: boolean // true
  eligibleRulesCount: number // > 0
  userContextSnapshot: object // frozen at start, immutable
}
```

Violation of any invariant triggers `ERROR` with `VALIDATION_FAILED`, not silent degradation.

### Audit Trail

```sql
CREATE TABLE "ReasoningTrace" (
  id TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  events JSONB NOT NULL,  -- full typed events

  -- Frozen context (immutable)
  "userContextSnapshot" JSONB NOT NULL,

  -- Summary columns for fast queries
  outcome TEXT NOT NULL,  -- ANSWER | QUALIFIED_ANSWER | REFUSAL | ERROR
  domain TEXT,
  "riskTier" TEXT,
  confidence FLOAT,
  "sourceCount" INT,
  "eligibleRuleCount" INT,
  "exclusionCount" INT,
  "conflictCount" INT,
  "refusalReason" TEXT,
  "durationMs" INT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON "ReasoningTrace"("requestId");
CREATE INDEX ON "ReasoningTrace"(outcome);
CREATE INDEX ON "ReasoningTrace"("riskTier");
CREATE INDEX ON "ReasoningTrace"("createdAt");
CREATE INDEX ON "ReasoningTrace"(confidence);
```

---

## 9. Copy Discipline

User-facing messages are treated as **API surface**. Changes require review.

### Copy Contracts by Stage

| Stage              | Allowed Copy Style                           | Not Allowed          |
| ------------------ | -------------------------------------------- | -------------------- |
| Context Resolution | Declarative only                             | Advice, opinions     |
| Sources            | Factual names and counts                     | Assessments          |
| Applicability      | Factual exclusions with values               | Legal interpretation |
| Analysis           | Describe actions taken                       | Conclusions          |
| Confidence         | State drivers factually                      | Promises             |
| Answer             | Interpretation allowed, aligned with sources | Unsupported claims   |

### Review Process

1. All `message` field changes require PM sign-off
2. Legal review for any copy in ANSWER/QUALIFIED_ANSWER templates
3. A/B testing for engagement-related copy changes
4. Localization must maintain meaning, not just translate

---

## 10. Counterfactual Simulation

High-value UX upgrade: turn FiskAI from an answer engine into a "what-if" simulator.

### Behavior

Confidence drivers become interactive toggles in the UI:

```typescript
interface InteractiveDriver {
  id: string
  label: string // e.g., "Turnover ≤€10,000"
  currentValue: boolean
  canToggle: boolean
  affectedStages: ReasoningStage[] // typically APPLICABILITY, ANALYSIS
}
```

### User Interaction

1. User sees confidence card with drivers
2. Each driver that affects applicability has a toggle
3. Toggling a driver re-runs:
   - APPLICABILITY (with hypothetical context)
   - ANALYSIS (with new eligible rules)
   - CONFIDENCE (recalculated)
4. No re-fetching sources required
5. Results shown as "If your turnover were ≤€10,000, then..."

### Technical Implementation

```typescript
async function runCounterfactual(
  requestId: string,
  originalTrace: ReasoningTrace,
  toggledDrivers: string[]
): AsyncGenerator<ReasoningEvent> {
  // Reuse sources and retrieval from original trace
  // Re-run applicability with modified context
  // Re-run analysis with new eligible set
  // Return hypothetical answer (marked as counterfactual)
}
```

### UX

- Counterfactual results appear in a "What if..." panel
- Clearly marked as hypothetical
- User can save interesting scenarios

---

## 11. Success Metrics

### Primary Metrics (Trust)

| Metric                     | Measurement                                           | Target   |
| -------------------------- | ----------------------------------------------------- | -------- |
| **Perceived Effort Score** | Post-answer survey: "Did this feel researched?" (1-5) | ≥4.0 avg |
| **Trust Rating**           | "Would you trust this for a real decision?" (1-5)     | ≥3.8 avg |
| **Citation Click-Through** | % of users who expand citations                       | ≥15%     |

### Truth Metrics (Pipeline Health)

| Metric                         | Measurement                                         | Target                |
| ------------------------------ | --------------------------------------------------- | --------------------- |
| **Citable Coverage Rate**      | % of queries with ≥1 eligible rule found            | Track, improve weekly |
| **Source Freshness Rate**      | % of answers where top citation fetchedAt < 30 days | ≥90%                  |
| **Temporal Enforcement Rate**  | % of ANSWERs with asOfDate + appliesWhenEvaluated   | **100%**              |
| **Context Clarification Rate** | % of queries requiring clarification step           | Track (target: <20%)  |

### Completion by Risk Tier

| Risk  | ANSWER Rate | QUALIFIED_ANSWER Rate | REFUSAL Rate | Notes              |
| ----- | ----------- | --------------------- | ------------ | ------------------ |
| T0    | Lower OK    | Track                 | Higher OK    | Safety-critical    |
| T1    | ~50%        | ~10%                  | ~40%         | Complex            |
| T2/T3 | ≥70%        | ~5%                   | ≤25%         | Should answer most |

### Refusal Quality

| Metric                             | Measurement                                                   | Target |
| ---------------------------------- | ------------------------------------------------------------- | ------ |
| **Refusal Recovery Rate**          | % converting to ANSWER within 2 follow-ups                    | ≥40%   |
| **Next-Step Click Rate**           | % clicking structured prompts on REFUSAL                      | ≥30%   |
| **Exclusion Self-Correction Rate** | % of users who fix profile after seeing exclusion explanation | Track  |

### Hallucination Workflow

| Metric                           | Measurement                             | Target    |
| -------------------------------- | --------------------------------------- | --------- |
| **Dispute Rate**                 | % of answers flagged by users           | <2%       |
| **Confirmed Incorrect Rate**     | Flagged answers confirmed wrong         | **0%**    |
| **Time-to-Triage**               | Flag → reviewer decision                | <24h      |
| **High-Confidence Dispute Rate** | % of HIGH confidence answers challenged | **<0.5%** |

### UX Responsiveness

| Metric    | Measurement                                        | Target |
| --------- | -------------------------------------------------- | ------ |
| **TTFUS** | Submit → context resolution + first source visible | <1.5s  |

### Safety Metrics (Non-Negotiable)

| Metric                       | Measurement                                          | Target    |
| ---------------------------- | ---------------------------------------------------- | --------- |
| **Uncited Answer Rate**      | ANSWER events without valid citations                | **0%**    |
| **Validation Failure Rate**  | ERROR with VALIDATION_FAILED                         | **<0.1%** |
| **Frozen Context Violation** | Answers where userContextSnapshot differs from audit | **0%**    |

---

## 12. Rollout Plan

### Phase 0: Shadow Mode (Mandatory — Week 1-2)

> ⚠️ Shadow mode is **mandatory** before any user-facing rollout.

- Production traffic runs both pipelines
- Old pipeline serves response
- New pipeline runs in background, logs traces
- Compare:
  - Refusal rate delta
  - Completion rate by tier
  - Latency distribution
  - Confidence score distribution
  - Clarification trigger rate
- **Adjust thresholds** before proceeding
- **Exit criteria:** New pipeline metrics understood, no unexpected regressions

### Phase 1: Internal Dogfood (Week 3-4)

- Deploy to `staff.fiskai.hr` only
- Staff uses for real client questions
- Collect qualitative feedback on reasoning UX
- Test clarification flow, exclusion explanations, qualified answers
- **Exit criteria:** Staff rates "feels researched" ≥4.0

### Phase 2: Beta Cohort (Week 5-6)

- 10% of APP users see new UX (feature flag)
- A/B test trust metrics
- Monitor TTFUS, completion rates, error rates
- Test counterfactual simulation with power users
- **Exit criteria:** Trust rating ≥3.8, no safety regressions

### Phase 3: Gradual Rollout (Week 7-8)

- 25% → 50% → 100% over 2 weeks
- Monitor all metrics dashboards
- Kill switch ready for instant rollback
- **Exit criteria:** All targets met, no critical issues

### Phase 4: MARKETING Surface (Week 9+)

- Extend to public marketing site
- Simplified reasoning (adaptive UX for T2/T3)
- Mobile: morphing pill UX
- Focus on trust-building for conversion
- **Exit criteria:** Signup conversion ≥ baseline

### Rollback Triggers

- Validation failure rate >0.5%
- Confirmed hallucination
- TTFUS >5s (perceived freeze)
- Trust rating drops below 3.5
- High-Confidence Dispute Rate >1%
- Clarification abandonment rate >50%

---

## Appendix A: Complete TypeScript Types

```typescript
// src/lib/assistant/reasoning/types.ts

export const SCHEMA_VERSION = 1 as const

export type ReasoningStage =
  | "CONTEXT_RESOLUTION"
  | "CLARIFICATION"
  | "SOURCES"
  | "RETRIEVAL"
  | "APPLICABILITY"
  | "CONFLICTS"
  | "ANALYSIS"
  | "CONFIDENCE"
  | "ANSWER"
  | "QUALIFIED_ANSWER"
  | "REFUSAL"
  | "ERROR"

export type ReasoningStatus = "started" | "progress" | "checkpoint" | "complete" | "awaiting_input"

export type Severity = "info" | "warning" | "critical"

export type TerminalOutcome = "ANSWER" | "QUALIFIED_ANSWER" | "REFUSAL" | "ERROR"

export interface BaseReasoningEvent {
  v: typeof SCHEMA_VERSION
  id: string
  requestId: string
  seq: number
  ts: string
  stage: ReasoningStage
  status: ReasoningStatus
  message?: string
  severity?: Severity
  progress?: { current: number; total?: number }
  trace?: { runId: string; span?: string }
  meta?: Record<string, unknown>
}

// User context snapshot (immutable, frozen at request start)
export interface UserContextSnapshot {
  vatStatus?: "registered" | "unregistered" | "unknown"
  turnoverBand?: string
  companySize?: "micro" | "small" | "medium" | "large"
  jurisdiction?: string
  assumedDefaults: string[]
}

// Context Resolution with confidence gate
export interface ContextResolutionPayload {
  summary: string
  jurisdiction: "HR" | "EU" | "UNKNOWN"
  domain: "TAX" | "LABOR" | "COMPANY" | "FINANCE" | "OTHER"
  riskTier: "T0" | "T1" | "T2" | "T3"
  language: "hr" | "en"
  intent: "QUESTION" | "HOWTO" | "CHECKLIST" | "UNKNOWN"
  asOfDate: string
  entities: Array<{ type: string; value: string; confidence: number }>
  confidence: number
  requiresClarification: boolean
  userContextSnapshot: UserContextSnapshot
}

// Clarification question
export interface ClarificationPayload {
  question: string
  options?: Array<{ label: string; value: string }>
  freeformAllowed: boolean
}

// Rule-level exclusion explanation
export interface RuleExclusion {
  ruleId: string
  ruleTitle: string
  code:
    | "THRESHOLD_EXCEEDED"
    | "DATE_MISMATCH"
    | "JURISDICTION_MISMATCH"
    | "MISSING_CONTEXT"
    | "CONDITION_FALSE"
  expected: string
  actual: string
  source: "user_profile" | "query" | "assumed_default"
  userCanFix: boolean
}

export interface ApplicabilityPayload {
  summary: string
  eligibleCount: number
  ineligibleCount: number
  exclusions: RuleExclusion[]
}

// Conflict warning for QUALIFIED_ANSWER
export interface ConflictWarning {
  description: string
  sourceA: { name: string; says: string }
  sourceB: { name: string; says: string }
  practicalResolution?: string
}

export interface QualifiedAnswerPayload {
  asOfDate: string
  answerHr: string
  structured?: {
    obligations?: string[]
    deadlines?: string[]
    thresholds?: string[]
    exceptions?: string[]
    actions?: string[]
  }
  citations: Citation[]
  conflictWarnings: ConflictWarning[]
  caveats: string[]
  limits?: string[]
}

// Interactive confidence driver
export interface InteractiveDriver {
  id: string
  label: string
  currentValue: boolean
  canToggle: boolean
  affectedStages: ReasoningStage[]
}

export interface ConfidencePayload {
  summary: string
  score: number
  label: "LOW" | "MEDIUM" | "HIGH"
  drivers: string[]
  evidenceStrength: "SINGLE_SOURCE" | "MULTI_SOURCE"
  wouldBeLowerIf?: string[]
  interactiveDrivers?: InteractiveDriver[]
}

// ... (other types remain the same)

export type TerminalPayload =
  | ({ outcome: "ANSWER" } & FinalAnswerPayload)
  | ({ outcome: "QUALIFIED_ANSWER" } & QualifiedAnswerPayload)
  | ({ outcome: "REFUSAL" } & RefusalPayload)
  | ({ outcome: "ERROR" } & ErrorPayload)

// Utility functions
export function isTerminal(event: ReasoningEvent): boolean {
  return (
    event.stage === "ANSWER" ||
    event.stage === "QUALIFIED_ANSWER" ||
    event.stage === "REFUSAL" ||
    event.stage === "ERROR"
  )
}

export function getTerminalOutcome(event: ReasoningEvent): TerminalOutcome | null {
  if (event.stage === "ANSWER") return "ANSWER"
  if (event.stage === "QUALIFIED_ANSWER") return "QUALIFIED_ANSWER"
  if (event.stage === "REFUSAL") return "REFUSAL"
  if (event.stage === "ERROR") return "ERROR"
  return null
}
```

---

## Appendix B: SSE Endpoint Example

```typescript
// src/app/api/assistant/chat/reasoning/route.ts

import { buildAnswerWithReasoning } from "@/lib/assistant/query-engine/reasoning-pipeline"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  const { query, surface, companyId } = await request.json()
  const requestId = `req_${nanoid()}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const generator = buildAnswerWithReasoning(requestId, query, surface, context)

      // Heartbeat interval
      const heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(`event: heartbeat\ndata: {"ts":"${new Date().toISOString()}"}\n\n`)
        )
      }, 10000)

      try {
        for await (const event of generator) {
          const eventType = isTerminal(event) ? "terminal" : "reasoning"
          const data = JSON.stringify(event)
          controller.enqueue(
            encoder.encode(`event: ${eventType}\nid: ${event.id}\ndata: ${data}\n\n`)
          )

          if (isTerminal(event)) break
        }
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

---

## Appendix C: Revision History

| Rev | Date       | Changes                                                                                                                                                                                                                                                               |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2025-12-26 | Initial design                                                                                                                                                                                                                                                        |
| 2   | 2025-12-26 | Incorporated audit feedback: Context Resolution rename, confidence gate, QUALIFIED_ANSWER, rule-level exclusions, userContextSnapshot, adaptive UX, copy discipline, counterfactual simulation, mobile UX, shadow mode mandatory, High-Confidence Dispute Rate metric |

---

_Document generated: 2025-12-26_
