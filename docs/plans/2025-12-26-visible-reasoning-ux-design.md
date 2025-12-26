# Visible Reasoning UX Design

> **Status:** Approved
> **Author:** Product & Engineering
> **Date:** 2025-12-26
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

> _Note: This model is default for high-risk regulatory domains. Future low-risk surfaces may use a faster mode._

### Terminal Outcomes

| Outcome   | When                                              | User Experience                             |
| --------- | ------------------------------------------------- | ------------------------------------------- |
| `ANSWER`  | Verified, citable response with evidence          | Confident, actionable answer with citations |
| `REFUSAL` | Expected stop (no rules, missing data, ambiguous) | Clear message with next steps               |
| `ERROR`   | Infrastructure failure                            | Apologetic message with correlation ID      |

### Success Metric

Users report the system feels like a "professional advisor researching their question" rather than "a chatbot generating an answer."

---

## 2. UX Flow — The Seven Stages

Every regulatory question flows through seven visible stages. Users see each stage as it executes, building trust through demonstrated effort.

| #   | Stage                         | Streaming Mode       | What User Sees                                             |
| --- | ----------------------------- | -------------------- | ---------------------------------------------------------- |
| 1   | **Question Intake**           | Buffered             | "Analysing your question..."                               |
| 2   | **Classification**            | Buffered             | Domain, jurisdiction, risk level, temporal context         |
| 3   | **Source Discovery**          | **True Progressive** | Sources searched and found, streamed live                  |
| 4   | **Rule Retrieval**            | Buffered             | Concepts matched, rules retrieved                          |
| 5   | **Applicability & Conflicts** | Buffered             | Rules filtered, conflicts detected/resolved                |
| 6   | **Analysis**                  | Hybrid               | Checkpoints streamed: "Comparing X vs Y..."                |
| 7   | **Confidence & Answer**       | Buffered + Pause     | Confidence frame, then final answer after deliberate pause |

### Stage Details

**Stages 1-2 (Classification):** Fast, deterministic. Presented as single event:

> "Croatian tax · High risk · VAT · E-commerce"

**Stage 3 (Source Discovery):** _This is where authenticity matters most._ Stream each source as found:

- "Searching Porezna uprava..."
- "Searching EU VAT directives..."
- "Found 3 relevant sources"

**Stages 4-5 (Retrieval & Applicability):** Internal computation, streamed as summary:

> "Retrieved 12 rules, 8 eligible for your context"
> "4 rules excluded due to date or scope mismatch" _(expandable)_

**Stage 6 (Analysis):** Stream checkpoints showing intellectual work:

- "Evaluating OSS threshold applicability..."
- "Comparing Croatian VAT Act vs EU Directive..."
- "Checking temporal validity (as of today)..."

**Stage 7 (Confidence & Answer):**

- Confidence badge with drivers: "HIGH — based on LAW authority, multi-source verification"
- Optional: "Confidence would be lower if your turnover exceeds €10,000"
- **Deliberate pause** before answer (the pause _is_ the feature)
- Final answer in plain language: "What this means for you"

**Post-Completion:** Stepper collapses into chat-inline cards. User can expand any stage for details.

---

## 3. Streaming Architecture

The pipeline follows a **Generator + Sink** pattern. The generator is the single source of truth for reasoning events. Sinks consume events for different purposes.

```
┌─────────────────────────────────────────────────────────┐
│  buildAnswerWithReasoning(requestId, query, surface)    │
│  ─────────────────────────────────────────────────────  │
│  AsyncGenerator<ReasoningEvent, TerminalPayload>        │
│                                                         │
│  yield* classificationStage(query)                      │
│  yield* sourceDiscoveryStage(concepts)     ← live       │
│  yield* retrievalStage(sources)                         │
│  yield* applicabilityStage(rules, context)              │
│  yield* conflictsStage(eligibleRules)                   │
│  yield* analysisStage(rules)               ← checkpoints│
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
3. Exactly one terminal event: `ANSWER`, `REFUSAL`, or `ERROR`
4. Terminal is both yielded (for UI) and returned (for wrappers)
5. Event IDs are monotonic per request (`{requestId}_{seq}`)

---

## 4. Event Schema

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
  | "CLASSIFYING"
  | "SOURCES"
  | "RETRIEVAL"
  | "APPLICABILITY"
  | "CONFLICTS"
  | "ANALYSIS"
  | "CONFIDENCE"
  | "ANSWER"
  | "REFUSAL"
  | "ERROR"

type ReasoningStatus = "started" | "progress" | "checkpoint" | "complete"
```

### Payload Types

| Stage           | Payload Contains                                                |
| --------------- | --------------------------------------------------------------- |
| `CLASSIFYING`   | jurisdiction, domain, risk tier, intent, entities, asOfDate     |
| `SOURCES`       | provider, sources found with authority level, summary           |
| `RETRIEVAL`     | concepts matched, rules retrieved count                         |
| `APPLICABILITY` | eligible/ineligible counts, exclusion reasons                   |
| `CONFLICTS`     | conflict count, resolved/unresolved, notes                      |
| `ANALYSIS`      | bullets (user-facing), compared sources                         |
| `CONFIDENCE`    | score, label, drivers, evidence strength                        |
| `ANSWER`        | answerHr, structured obligations/deadlines, citations, asOfDate |
| `REFUSAL`       | reason code, message, required fields                           |
| `ERROR`         | code, message, correlationId, retriable flag                    |

### Wire Format

Standard SSE with event types:

```
event: reasoning
id: req_abc123_001
data: {"v":1,"stage":"CLASSIFYING","status":"started",...}

event: reasoning
id: req_abc123_002
data: {"v":1,"stage":"SOURCES","status":"progress",...}

event: terminal
id: req_abc123_final
data: {"v":1,"stage":"ANSWER","status":"complete","outcome":"ANSWER",...}

event: heartbeat
data: {"ts":"2025-12-26T10:00:05Z"}
```

---

## 5. Frontend Components

### Component Structure

**ReasoningStepper (Live Phase)**

Rendered while the stream is active. Pinned near input area.

```typescript
interface ReasoningStepperProps {
  events: ReasoningEvent[]
  selectors: ReasoningSelectors
  streamState: "idle" | "streaming" | "ended"
  terminalOutcome?: "ANSWER" | "REFUSAL" | "ERROR"
}
```

Behavior:

- Shows all 7 stages as steps
- Current stage: expanded, shows live updates
- Completed stages: collapsed to single line with ✓
- Failed stage (ERROR only): stays expanded, shows error details
- "Last updated: 2.1s ago" liveness indicator

**ReasoningCard (History Phase)**

Inserted into chat after completion. One card per stage.

```typescript
interface ReasoningCardProps {
  stage: ReasoningStage
  completeEvent: ReasoningEvent // the "complete" event for this stage
  allEvents: ReasoningEvent[] // for expanded view
  defaultExpanded: boolean
}
```

Behavior:

- Collapsed by default: shows `completeEvent.data.summary` or `completeEvent.message`
- "Show details" expands to full content
- Sources card shows top 3 + "+ N more"
- Confidence card shows badge + drivers

**AnswerCard (Terminal)**

```typescript
interface AnswerCardProps {
  payload: FinalAnswerPayload | RefusalPayload | ErrorPayload
  outcome: "ANSWER" | "REFUSAL" | "ERROR"
}
```

### Event Selectors

```typescript
interface ReasoningSelectors {
  byStage: Record<ReasoningStage, ReasoningEvent[]>
  latestByStage: Record<ReasoningStage, ReasoningEvent | undefined>
  terminal?: ReasoningEvent
}

const REASONING_STAGES: ReasoningStage[] = [
  "CLASSIFYING",
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
IDLE → STREAMING → ENDED
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
      [ANSWER]   [REFUSAL]    [ERROR]
```

### Transition Animation

When stream completes, stepper fades out (300ms), cards fade in above the answer.

---

## 6. Backend Pipeline Changes

### New Generator-Based Pipeline

```typescript
// src/lib/assistant/query-engine/reasoning-pipeline.ts

export async function* buildAnswerWithReasoning(
  requestId: string,
  query: string,
  surface: Surface,
  context?: CompanyContext
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
    // Stage 1-2: Classification
    yield emit({ stage: "CLASSIFYING", status: "started", message: "Analysing question..." })
    const classification = await classifyQuery(query)
    yield emit({
      stage: "CLASSIFYING",
      status: "complete",
      data: {
        ...classification,
        summary: `${classification.jurisdiction} · ${classification.domain} · ${classification.riskTier}`,
      },
    })

    // Stage 3: Source Discovery (true progressive)
    yield emit({
      stage: "SOURCES",
      status: "started",
      message: "Searching authoritative sources...",
    })
    const sources: SourceSummary[] = []
    for await (const source of discoverSourcesIter(classification.concepts)) {
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
    const candidates = await retrieveRules(classification.concepts, classification.asOfDate)
    yield emit({
      stage: "RETRIEVAL",
      status: "complete",
      data: {
        summary: `Retrieved ${candidates.length} candidate rules`,
        concepts: classification.concepts,
      },
    })

    // Stage 5: Applicability
    yield emit({ stage: "APPLICABILITY", status: "started" })
    const { eligible, ineligible } = await evaluateApplicability(candidates, context)
    yield emit({
      stage: "APPLICABILITY",
      status: "complete",
      data: {
        summary: `${eligible.length} rules apply to your situation`,
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
        exclusionReasons: summarizeExclusions(ineligible),
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
            ? `${conflicts.unresolved} unresolved conflicts`
            : "No conflicts detected",
        ...conflicts,
      },
    })

    // Handle unresolved conflicts
    if (conflicts.unresolved > 0 && !conflicts.canProceed) {
      const refusal = buildConflictRefusal(conflicts)
      yield emit({ stage: "REFUSAL", status: "complete", severity: "warning", data: refusal })
      return { outcome: "REFUSAL", ...refusal }
    }

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
    const confidence = computeConfidence(analysis, sources, eligible)
    yield emit({
      stage: "CONFIDENCE",
      status: "complete",
      data: {
        summary: `${confidence.label} confidence`,
        ...confidence,
      },
    })

    // Terminal: Answer
    const answer = buildFinalAnswer(analysis, confidence, classification.asOfDate)
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

## 7. Error Handling & Fail-Closed

### Error Categories

| Category                 | Terminal | Severity | Code                       | User Message                           |
| ------------------------ | -------- | -------- | -------------------------- | -------------------------------------- |
| No citable rules         | REFUSAL  | info     | `NO_CITABLE_RULES`         | "We couldn't find verified sources"    |
| Missing client data      | REFUSAL  | info     | `MISSING_CLIENT_DATA`      | "We need more information"             |
| Ambiguous query          | REFUSAL  | info     | `NEEDS_CLARIFICATION`      | "Please clarify your question"         |
| Unsupported jurisdiction | REFUSAL  | info     | `UNSUPPORTED_JURISDICTION` | "We don't cover this jurisdiction yet" |
| Unsupported domain       | REFUSAL  | info     | `UNSUPPORTED_DOMAIN`       | "This topic is outside our scope"      |
| Out of scope             | REFUSAL  | info     | `OUT_OF_SCOPE`             | "This isn't a regulatory question"     |
| Unresolved conflict      | REFUSAL  | warning  | `UNRESOLVED_CONFLICT`      | "Sources disagree, can't verify"       |
| Validation failure       | ERROR    | critical | `VALIDATION_FAILED`        | "Something went wrong"                 |
| Capacity exceeded        | ERROR    | warning  | `CAPACITY`                 | "Service busy, try again"              |
| Timeout                  | ERROR    | warning  | `TIMEOUT`                  | "Request timed out"                    |
| Internal exception       | ERROR    | critical | `INTERNAL`                 | "Something went wrong"                 |

### Fail-Closed Invariants

If terminal is `ANSWER`, ALL of these must be true:

```typescript
interface AnswerInvariants {
  citations: Citation[] // non-empty, each with evidenceId
  asOfDate: string // present and used
  appliesWhenEvaluated: boolean // true
  eligibleRulesCount: number // > 0
}
```

Violation of any invariant triggers `ERROR` with `VALIDATION_FAILED`, not silent degradation.

### Audit Trail

```sql
CREATE TABLE "ReasoningTrace" (
  id TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  events JSONB NOT NULL,  -- full typed events

  -- Summary columns for fast queries
  outcome TEXT NOT NULL,  -- ANSWER | REFUSAL | ERROR
  domain TEXT,
  "riskTier" TEXT,
  confidence FLOAT,
  "sourceCount" INT,
  "eligibleRuleCount" INT,
  "refusalReason" TEXT,
  "durationMs" INT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON "ReasoningTrace"("requestId");
CREATE INDEX ON "ReasoningTrace"(outcome);
CREATE INDEX ON "ReasoningTrace"("riskTier");
CREATE INDEX ON "ReasoningTrace"("createdAt");
```

---

## 8. Success Metrics

### Primary Metrics (Trust)

| Metric                     | Measurement                                           | Target   |
| -------------------------- | ----------------------------------------------------- | -------- |
| **Perceived Effort Score** | Post-answer survey: "Did this feel researched?" (1-5) | ≥4.0 avg |
| **Trust Rating**           | "Would you trust this for a real decision?" (1-5)     | ≥3.8 avg |
| **Citation Click-Through** | % of users who expand citations                       | ≥15%     |

### Truth Metrics (Pipeline Health)

| Metric                        | Measurement                                         | Target                |
| ----------------------------- | --------------------------------------------------- | --------------------- |
| **Citable Coverage Rate**     | % of queries with ≥1 eligible rule found            | Track, improve weekly |
| **Source Freshness Rate**     | % of answers where top citation fetchedAt < 30 days | ≥90%                  |
| **Temporal Enforcement Rate** | % of ANSWERs with asOfDate + appliesWhenEvaluated   | **100%**              |

### Completion by Risk Tier

| Risk  | ANSWER Rate | REFUSAL Rate | Notes                              |
| ----- | ----------- | ------------ | ---------------------------------- |
| T0    | Lower OK    | Higher OK    | Safety-critical, refusals expected |
| T1    | ~50%        | ~40%         | Complex, may need client data      |
| T2/T3 | ≥70%        | ≤25%         | Should answer most                 |

### Refusal Quality

| Metric                    | Measurement                                | Target |
| ------------------------- | ------------------------------------------ | ------ |
| **Refusal Recovery Rate** | % converting to ANSWER within 2 follow-ups | ≥40%   |
| **Next-Step Click Rate**  | % clicking structured prompts on REFUSAL   | ≥30%   |

### Hallucination Workflow

| Metric                       | Measurement                     | Target |
| ---------------------------- | ------------------------------- | ------ |
| **Dispute Rate**             | % of answers flagged by users   | <2%    |
| **Confirmed Incorrect Rate** | Flagged answers confirmed wrong | **0%** |
| **Time-to-Triage**           | Flag → reviewer decision        | <24h   |

### UX Responsiveness

| Metric    | Measurement                                    | Target |
| --------- | ---------------------------------------------- | ------ |
| **TTFUS** | Submit → classification + first source visible | <1.5s  |

### Safety Metrics (Non-Negotiable)

| Metric                      | Measurement                           | Target    |
| --------------------------- | ------------------------------------- | --------- |
| **Uncited Answer Rate**     | ANSWER events without valid citations | **0%**    |
| **Validation Failure Rate** | ERROR with VALIDATION_FAILED          | **<0.1%** |

---

## 9. Rollout Plan

### Phase 1: Internal Dogfood (Week 1-2)

- Deploy to `staff.fiskai.hr` only
- Staff uses for real client questions
- Collect qualitative feedback on reasoning UX
- Fix obvious bugs, tune stage timing
- **Exit criteria:** Staff rates "feels researched" ≥4.0

### Phase 2: Shadow Mode (Week 3-4)

- Production traffic runs both pipelines
- Old pipeline serves response
- New pipeline runs in background, logs traces
- Compare: latency, completion rates, citation coverage
- **Exit criteria:** New pipeline within 20% latency, ≥ parity on coverage

### Phase 3: Beta Cohort (Week 5-6)

- 10% of APP users see new UX (feature flag)
- A/B test trust metrics
- Monitor TTFUS, completion rates, error rates
- **Exit criteria:** Trust rating ≥3.8, no safety regressions

### Phase 4: Gradual Rollout (Week 7-8)

- 25% → 50% → 100% over 2 weeks
- Monitor all metrics dashboards
- Kill switch ready for instant rollback
- **Exit criteria:** All targets met, no critical issues

### Phase 5: MARKETING Surface (Week 9+)

- Extend to public marketing site
- Simplified reasoning (fewer stages visible)
- Focus on trust-building for conversion
- **Exit criteria:** Signup conversion ≥ baseline

### Rollback Triggers

- Validation failure rate >0.5%
- Confirmed hallucination
- TTFUS >5s (perceived freeze)
- Trust rating drops below 3.5

---

## Appendix A: Complete TypeScript Types

```typescript
// src/lib/assistant/reasoning/types.ts

export const SCHEMA_VERSION = 1 as const

export type ReasoningStage =
  | "CLASSIFYING"
  | "SOURCES"
  | "RETRIEVAL"
  | "APPLICABILITY"
  | "CONFLICTS"
  | "ANALYSIS"
  | "CONFIDENCE"
  | "ANSWER"
  | "REFUSAL"
  | "ERROR"

export type ReasoningStatus = "started" | "progress" | "checkpoint" | "complete"

export type Severity = "info" | "warning" | "critical"

export type TerminalOutcome = "ANSWER" | "REFUSAL" | "ERROR"

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

// Discriminated union for type-safe payloads
export type ReasoningEvent =
  | (BaseReasoningEvent & { stage: "CLASSIFYING"; status: "started" })
  | (BaseReasoningEvent & { stage: "CLASSIFYING"; status: "complete"; data: ClassificationPayload })
  | (BaseReasoningEvent & { stage: "SOURCES"; status: "started" })
  | (BaseReasoningEvent & { stage: "SOURCES"; status: "progress"; data: SourceProgressPayload })
  | (BaseReasoningEvent & { stage: "SOURCES"; status: "complete"; data: SourcesCompletePayload })
  | (BaseReasoningEvent & { stage: "RETRIEVAL"; status: "complete"; data: RetrievalPayload })
  | (BaseReasoningEvent & {
      stage: "APPLICABILITY"
      status: "complete"
      data: ApplicabilityPayload
    })
  | (BaseReasoningEvent & { stage: "CONFLICTS"; status: "complete"; data: ConflictsPayload })
  | (BaseReasoningEvent & { stage: "ANALYSIS"; status: "started" })
  | (BaseReasoningEvent & { stage: "ANALYSIS"; status: "checkpoint" })
  | (BaseReasoningEvent & { stage: "ANALYSIS"; status: "complete"; data: AnalysisPayload })
  | (BaseReasoningEvent & { stage: "CONFIDENCE"; status: "complete"; data: ConfidencePayload })
  | (BaseReasoningEvent & { stage: "ANSWER"; status: "complete"; data: FinalAnswerPayload })
  | (BaseReasoningEvent & { stage: "REFUSAL"; status: "complete"; data: RefusalPayload })
  | (BaseReasoningEvent & { stage: "ERROR"; status: "complete"; data: ErrorPayload })

// Payload definitions
export interface ClassificationPayload {
  summary: string
  jurisdiction: "HR" | "EU" | "UNKNOWN"
  domain: "TAX" | "LABOR" | "COMPANY" | "FINANCE" | "OTHER"
  riskTier: "T0" | "T1" | "T2" | "T3"
  language: "hr" | "en"
  intent: "QUESTION" | "HOWTO" | "CHECKLIST" | "UNKNOWN"
  asOfDate: string
  entities: Array<{ type: string; value: string; confidence: number }>
}

export interface SourceSummary {
  sourceId?: string
  name: string
  url: string
  authority?: "LAW" | "BYLAW" | "TAX_AUTHORITY" | "EU" | "OTHER"
}

export interface SourceProgressPayload {
  source: SourceSummary
}

export interface SourcesCompletePayload {
  summary: string
  sources: SourceSummary[]
}

export interface RetrievalPayload {
  summary: string
  concepts: Array<{ slug: string; title?: string; matchedBy: "exact" | "alias" | "vector" }>
  candidateCount: number
}

export interface ApplicabilityPayload {
  summary: string
  eligibleCount: number
  ineligibleCount: number
  exclusionReasons: Array<{ code: string; count: number }>
}

export interface ConflictsPayload {
  summary: string
  conflictCount: number
  resolvedCount: number
  unresolvedCount: number
  canProceed: boolean
  notes?: string
}

export interface AnalysisPayload {
  summary: string
  bullets: string[]
  comparedSources?: Array<{ url: string; what: string }>
}

export interface ConfidencePayload {
  summary: string
  score: number
  label: "LOW" | "MEDIUM" | "HIGH"
  drivers: string[]
  evidenceStrength: "SINGLE_SOURCE" | "MULTI_SOURCE"
  wouldBeLowerIf?: string[]
}

export interface Citation {
  url: string
  quote: string
  fetchedAt: string
  evidenceId: string
}

export interface FinalAnswerPayload {
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
  limits?: string[]
}

export interface RefusalPayload {
  reason:
    | "NO_CITABLE_RULES"
    | "NEEDS_CLARIFICATION"
    | "MISSING_CLIENT_DATA"
    | "UNSUPPORTED_JURISDICTION"
    | "UNSUPPORTED_DOMAIN"
    | "OUT_OF_SCOPE"
    | "UNRESOLVED_CONFLICT"
  message: string
  requiredFields?: string[]
  relatedTopics?: string[]
}

export interface ErrorPayload {
  code: "VALIDATION_FAILED" | "CAPACITY" | "TIMEOUT" | "INTERNAL"
  message: string
  correlationId: string
  retriable: boolean
}

export type TerminalPayload =
  | ({ outcome: "ANSWER" } & FinalAnswerPayload)
  | ({ outcome: "REFUSAL" } & RefusalPayload)
  | ({ outcome: "ERROR" } & ErrorPayload)

// Utility functions
export function isTerminal(event: ReasoningEvent): boolean {
  return event.stage === "ANSWER" || event.stage === "REFUSAL" || event.stage === "ERROR"
}

export function getTerminalOutcome(event: ReasoningEvent): TerminalOutcome | null {
  if (event.stage === "ANSWER") return "ANSWER"
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

_Document generated: 2025-12-26_
