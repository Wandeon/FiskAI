# FiskAI Assistant UI/UX Design v1.0

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this design.

**Goal:** A premium, calm "consultation surface" that is evidence-first, non-hallucinating, and (in-app) client-aware.

**Primary UX outcome:** Users get a fast, readable answer immediately, with optional drill-down into "Why" and "Sources".

**Core philosophy:** This is "the product made visible" - not a chatbot, not a support widget. It signals authority + calm + depth.

**Date:** 2024-12-24

---

## Non-Goals (v1)

These are explicitly out of scope to prevent future drift:

- No free-form chat UI (no chat bubbles)
- No conversational memory beyond HistoryBar restore
- No markdown rendering (all responses are plain text)
- No AI-generated suggestions on marketing surface (curated only)
- No inline editing of answers
- No assistant-initiated prompts
- No floating FAB chat widget

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [Response Contract](#2-response-contract)
3. [Interaction States](#3-interaction-states)
4. [Empty State & Suggestions](#4-empty-state--suggestions)
5. [Marketing CTA & Conversion](#5-marketing-cta--conversion)
6. [Accessibility & Responsive](#6-accessibility--responsive)
7. [Implementation Checklist & Quality Gates](#7-implementation-checklist--quality-gates)

---

## 1. Core Architecture

### Component Hierarchy

```
AssistantContainer
├── AssistantStateController (hook: useAssistantController)
│   ├── activeQuery: string | null
│   ├── activeAnswer: AssistantResponse | null
│   ├── history: HistoryItem[]
│   ├── status: 'IDLE' | 'LOADING' | 'STREAMING' | 'COMPLETE' | 'PARTIAL_COMPLETE' | 'ERROR'
│   └── analytics: { submit, expand, feedback, refusalType }
│
├── HistoryBar
│   ├── "Previous questions (N)" toggle
│   └── HistoryList (collapsed, click to swap)
│
├── InputSection
│   ├── AssistantInput (textarea, Enter=send, Shift+Enter=newline)
│   └── SuggestionChips (fill-only, never auto-submit)
│
├── AnswerSection
│   ├── ConflictBanner (slot, only when conflict exists)
│   │   ├── resolved: "Previously conflicting" note
│   │   └── unresolved: calm refusal + "tracking" status
│   │
│   ├── AnswerCard | RefusalCard (mutually exclusive)
│   │
│   │   AnswerCard:
│   │   ├── Headline (1 line, ≤120 chars)
│   │   ├── DirectAnswer (2-3 lines, ≤240 chars)
│   │   ├── KeyDetails (bullets, max 3)
│   │   ├── NextStep (1 line, optional)
│   │   ├── ConfidenceBadge
│   │   └── ActionButtons (Why?, How to apply, Save, Share)
│   │
│   │   RefusalCard:
│   │   ├── type: NO_CITABLE_RULES | OUT_OF_SCOPE | MISSING_CLIENT_DATA | UNRESOLVED_CONFLICT
│   │   ├── Message
│   │   └── NextStepActions (per type)
│   │
│   ├── WhyDrawer (collapsible, longer reasoning)
│   └── RelatedQuestions (chips, fill-only)
│
├── EvidencePanel (always visible)
│   ├── Header: "Sources"
│   ├── PrimarySourceCard (expanded)
│   │   ├── AuthorityBadge (LAW | REGULATION | GUIDANCE)
│   │   ├── Title + Reference
│   │   ├── QuoteExcerpt (with "Open excerpt" expand)
│   │   ├── EffectiveDate + Confidence
│   │   └── "View source ↗" link (+ page number for PDFs)
│   └── SupportingSources
│       └── "Supporting sources (N)" collapsed list
│
└── ClientDataPanel (APP surface only)
    ├── Header: "Your data"
    ├── DataUsedList
    │   └── { label, value, source, asOfDate }
    ├── CompletenessScore + notes
    ├── Assumptions
    └── MissingDataCTA
```

### Layout by Surface

| Surface                           | Columns | Panels                                |
| --------------------------------- | ------- | ------------------------------------- |
| MARKETING                         | 2       | Answer + Evidence                     |
| MARKETING (personalization query) | 3       | Answer + Evidence + Personalize panel |
| APP                               | 3       | Answer + Evidence + Your Data         |

### Hard Rules

- Suggestions/RelatedQuestions: fill input only, never auto-submit
- EvidencePanel + ClientDataPanel: equal visual weight, same card density
- Conflicts: ConflictBanner is a system state, not a source type
- Refusals: first-class RefusalCard, not error state
- Spatial separation: regulatory truth and business facts never visually merge

### Placement

- **Marketing:** Embedded in hero/key sections + dedicated `/assistant` page
- **App:** Dedicated `/assistant` page + possible dashboard widget
- **No floating FAB** (at least for v1)

---

## 2. Response Contract

### Schema Version

```typescript
export const SCHEMA_VERSION = "1.0.0"
```

### Length Budgets (Server-Enforced)

```typescript
export const LIMITS = {
  // Per-field caps
  headline: 120,
  directAnswer: 240,
  keyDetailItem: 120,
  keyDetailCount: 3,
  nextStep: 100,

  // Why drawer
  whyBulletItem: 140,
  whyBulletCount: 5,
  whyTotalChars: 700,

  // Citations
  citationsMax: 4,
  quoteExcerpt: 240,
  citationsTotalChars: 1200,

  // Client context
  computedResultExplanation: 200,

  // Related
  relatedQuestionsMax: 4,
  relatedQuestionLength: 80,

  // Total payload
  totalResponseChars: 3500,
} as const
```

### Authority Order (Immutable)

```typescript
// FROZEN: Do not modify ordering logic
export const AUTHORITY_ORDER = ["LAW", "REGULATION", "GUIDANCE", "PRACTICE"] as const

export const AUTHORITY_RANK: Record<string, number> = {
  LAW: 1,
  REGULATION: 2,
  GUIDANCE: 3,
  PRACTICE: 4,
}

// Tie-breaker sequence (deterministic):
// 1. Authority rank: LAW > REGULATION > GUIDANCE > PRACTICE
// 2. Effective date: newer first
// 3. Confidence: higher first
// 4. Source ID: alphabetical (stable tiebreaker)
```

**CRITICAL:** Frontend MUST NOT reorder citations. Backend order is authoritative.

### Core Response Interface

```typescript
export interface AssistantResponse {
  // Schema & tracing (always present, all environments)
  schemaVersion: typeof SCHEMA_VERSION
  requestId: string
  traceId: string

  // Classification (independent axes)
  kind: "ANSWER" | "REFUSAL" | "ERROR"
  topic: "REGULATORY" | "PRODUCT" | "SUPPORT" | "OFFTOPIC"
  surface: "MARKETING" | "APP"
  createdAt: string

  // === ANSWER CONTENT (plain text, no markdown) ===
  headline: string
  directAnswer: string
  keyDetails?: string[]
  nextStep?: string

  asOfDate?: string

  confidence?: {
    level: "HIGH" | "MEDIUM" | "LOW"
    score?: number
    rationale?: string
  }

  // === DRAWERS ===
  why?: { bullets: string[] }
  howToApply?: { steps: string[] }

  // === CITATIONS ===
  citations?: CitationBlock

  // === CLIENT CONTEXT (APP surface only, required when surface='APP') ===
  clientContext?: ClientContextBlock

  // === CONFLICT STATE ===
  conflict?: ConflictBlock

  // === REFUSAL (only when kind=REFUSAL) ===
  refusalReason?: RefusalReason
  refusal?: RefusalBlock

  // === ERROR (only when kind=ERROR) ===
  error?: {
    message: string
    retryable: boolean
  }

  // === FOLLOW-UP ===
  relatedQuestions?: string[]

  // === DEBUG (non-production only) ===
  _debug?: DebugBlock
}

export type RefusalReason =
  | "NO_CITABLE_RULES"
  | "OUT_OF_SCOPE"
  | "MISSING_CLIENT_DATA"
  | "UNRESOLVED_CONFLICT"

export interface CitationBlock {
  primary: SourceCard
  supporting: SourceCard[]
}

export interface SourceCard {
  id: string
  title: string
  authority: "LAW" | "REGULATION" | "GUIDANCE" | "PRACTICE"
  reference?: string
  quote?: string
  pageNumber?: number
  url: string
  effectiveFrom: string
  confidence: number
  status?: "ACTIVE" | "SUPERSEDED"
}

export interface ClientContextBlock {
  used: DataPoint[]

  completeness: {
    status: "COMPLETE" | "PARTIAL" | "NONE"
    score: number
    notes?: string
  }

  assumptions?: string[]
  missing?: MissingData[]

  // Only present when completeness.status = 'COMPLETE'
  computedResult?: {
    label: string
    value: string
    explanation?: string
  }
}

export interface DataPoint {
  label: string
  value: string
  source: string
  asOfDate?: string
}

export interface MissingData {
  label: string
  impact: string
  connectAction?: string
}

export interface ConflictBlock {
  status: "RESOLVED" | "UNRESOLVED" | "CONTEXT_DEPENDENT"
  resolvedAt?: string
  description: string
  sources: SourceCard[]
  winningSourceId?: string
}

export interface RefusalBlock {
  message: string
  relatedTopics?: string[]
  redirectOptions?: RedirectOption[]
  missingData?: MissingData[]
  conflictingSources?: SourceCard[]
}

export interface RedirectOption {
  label: string
  href: string
  type: "SUPPORT" | "DOCS" | "CONTACT"
}

export interface DebugBlock {
  latencyMs: number
  rulesConsidered: number
  rulesUsed: number
  conflictsOpen: number
  pipelineStages?: string[]
}
```

### Enforcement Matrix

| kind    | refusalReason       | topic                    | citations                 | computedResult                |
| ------- | ------------------- | ------------------------ | ------------------------- | ----------------------------- |
| ANSWER  | —                   | REGULATORY               | **Required**              | Only if completeness=COMPLETE |
| ANSWER  | —                   | PRODUCT/SUPPORT/OFFTOPIC | **Forbidden**             | **Forbidden**                 |
| REFUSAL | NO_CITABLE_RULES    | any                      | Forbidden                 | Forbidden                     |
| REFUSAL | OUT_OF_SCOPE        | any                      | Forbidden                 | Forbidden                     |
| REFUSAL | MISSING_CLIENT_DATA | REGULATORY               | Optional (rule context)   | Forbidden                     |
| REFUSAL | UNRESOLVED_CONFLICT | REGULATORY               | **Required** (both sides) | Forbidden                     |

### Debug Rules

- `_debug` field: server MUST NOT emit when `NODE_ENV=production`
- `requestId` + `traceId`: always present, all environments
- Client should ignore `_debug` if unexpectedly present

---

## 3. Interaction States

### State Machine

```
                                        ┌──────────────┐
                                        │   CANCELLED  │
                                        └──────┬───────┘
                                               │
    ┌──────────────────────────────────────────┼──────────────────────────────┐
    │                                          │                              │
    ▼                                          │                              │
┌──────┐  submit  ┌─────────┐  stream  ┌───────────┐  done  ┌──────────┐     │
│ IDLE │ ───────► │ LOADING │ ───────► │ STREAMING │ ─────► │ COMPLETE │     │
└──────┘          └─────────┘          └───────────┘        └──────────┘     │
    ▲                  │                     │                    │          │
    │                  │ new submit          │ new submit         │          │
    │                  └─────────────────────┴────────────────────┼──────────┘
    │                                                             │
    │                  ┌─────────────────┐                        │
    │                  │ PARTIAL_COMPLETE│ ◄── clientContext lag  │
    │                  └─────────────────┘                        │
    │                           │                                 │
    │                           │ data arrives                    │
    │                           ▼                                 │
    │                      ┌──────────┐                           │
    │                      │ COMPLETE │                           │
    │                      └──────────┘                           │
    │                                                             │
    │              ┌───────┐                                      │
    │              │ ERROR │ ◄── network/server failure           │
    │              └───────┘                                      │
    │                  │                                          │
    └──────────────────┴──────────────────────────────────────────┘
```

### States

| State            | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| IDLE             | No active query, showing empty state or last completed answer         |
| LOADING          | Request sent, waiting for first chunk                                 |
| STREAMING        | Receiving chunks, UI populating progressively                         |
| COMPLETE         | Full response received and rendered                                   |
| PARTIAL_COMPLETE | Answer + citations done, but clientContext missing/partial (APP only) |
| CANCELLED        | Previous request aborted due to new submission                        |
| ERROR            | Request failed, showing error card                                    |

### Controller State Shape

```typescript
interface AssistantControllerState {
  status: "IDLE" | "LOADING" | "STREAMING" | "COMPLETE" | "PARTIAL_COMPLETE" | "ERROR"

  activeRequestId: string | null
  activeQuery: string | null
  activeAnswer: AssistantResponse | null

  history: HistoryItem[]

  error: { type: ErrorType; message: string; httpStatus?: number } | null
  retryCount: number

  streamProgress: {
    headline: boolean
    directAnswer: boolean
    citations: boolean
    clientContext: boolean
  }
}

type ErrorType =
  | "NETWORK_TIMEOUT"
  | "NETWORK_FAILURE"
  | "SERVER_ERROR"
  | "CLIENT_ERROR"
  | "SCHEMA_VALIDATION"
  | "RATE_LIMITED"
```

### Cancellation Rule

When user submits during LOADING or STREAMING:

1. Set `activeRequestId` to new request ID
2. Transition to LOADING
3. Ignore all chunks where `chunk.requestId !== activeRequestId`

### UI Behavior by State

| State            | AnswerSection             | EvidencePanel                                | ClientDataPanel (APP)                     | Input    |
| ---------------- | ------------------------- | -------------------------------------------- | ----------------------------------------- | -------- |
| IDLE             | Empty state + suggestions | Placeholder: "Sources will appear here"      | Placeholder: "Your data will appear here" | Enabled  |
| LOADING          | Skeleton                  | Frame visible, skeleton card                 | Frame visible, "Waiting for data…"        | Disabled |
| STREAMING        | Content populates         | Frame visible, cards populate as they arrive | Frame visible, populates as data arrives  | Disabled |
| COMPLETE         | Full card                 | Full panel                                   | Full panel                                | Enabled  |
| PARTIAL_COMPLETE | Full card                 | Full panel                                   | "Still syncing…" + spinner + CTA          | Enabled  |
| ERROR            | ErrorCard                 | Hidden                                       | Hidden                                    | Enabled  |

### Streaming Order

1. `headline` (appears immediately)
2. `directAnswer` (streams)
3. `confidence` (badge appears)
4. `citations.primary` (EvidencePanel populates)
5. `citations.supporting` (collapsed list appears)
6. `clientContext` (APP only, ClientDataPanel populates)
7. `why`, `relatedQuestions` (drawers become available)

### Retry Policy

| Error type                 | Retry?              | Backoff        |
| -------------------------- | ------------------- | -------------- |
| NETWORK_TIMEOUT            | Yes, once           | 500ms → 1500ms |
| NETWORK_FAILURE            | Yes, once           | 500ms → 1500ms |
| SERVER_ERROR (502/503/504) | Yes, once           | 500ms → 1500ms |
| SERVER_ERROR (500/other)   | No                  | —              |
| CLIENT_ERROR (4xx)         | No                  | —              |
| SCHEMA_VALIDATION          | No                  | —              |
| RATE_LIMITED               | No (show countdown) | —              |

### Analytics Events

| Event                        | When                 | Payload                                                      |
| ---------------------------- | -------------------- | ------------------------------------------------------------ |
| `assistant.query.submit`     | User sends query     | `{ surface, queryLength, suggestionUsed, fromHistory }`      |
| `assistant.query.complete`   | Response complete    | `{ surface, topic, kind, latencyMs, citationCount }`         |
| `assistant.query.partial`    | PARTIAL_COMPLETE     | `{ surface, missingContext: string[] }`                      |
| `assistant.query.refusal`    | Refusal received     | `{ surface, topic, refusalReason }`                          |
| `assistant.query.error`      | Error occurred       | `{ errorType, httpStatus?, latencyMs, surface, retryCount }` |
| `assistant.query.cancelled`  | Request aborted      | `{ surface, reason: 'new_query' }`                           |
| `assistant.drawer.expand`    | User opens drawer    | `{ drawer: 'why' \| 'sources' \| 'clientData' }`             |
| `assistant.feedback.submit`  | Thumbs up/down       | `{ requestId, positive, comment? }`                          |
| `assistant.history.restore`  | User clicks history  | `{ historyIndex }`                                           |
| `assistant.suggestion.click` | Chip clicked         | `{ type, suggestionText, position }`                         |
| `assistant.retry.attempt`    | Auto-retry triggered | `{ errorType, retryCount }`                                  |

---

## 4. Empty State & Suggestions

### Empty State Philosophy

The empty state is not a welcome message. It signals:

"This is a system that knows Croatian regulations. Ask anything."

No chatbot warmth. No "Hi, I'm FiskAI!" Just calm, authoritative invitation.

### Empty State Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    ┌─────────────────────────────────────────────────┐      │
│                    │ Ask about Croatian regulations...           [→] │      │
│                    └─────────────────────────────────────────────────┘      │
│                                                                             │
│     [VAT thresholds]  [Paušalni limits]  [Fiscalization rules]             │
│     [Contribution deadlines]  [e-Invoice requirements]                      │
│                                                                             │
├─────────────────────────────────────────┬───────────────────────────────────┤
│                                         │                                   │
│     Verified answer will appear here    │  Sources will appear here         │
│                                         │                                   │
│     ┌─────────────────────────────┐     │  ┌─────────────────────────┐     │
│     │  Every response includes    │     │  │  Official regulations,  │     │
│     │  verified citations from    │     │  │  laws, and guidance     │     │
│     │  official sources           │     │  └─────────────────────────┘     │
│     └─────────────────────────────┘     │                                   │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### Empty State Copy

**Marketing surface:**

| Element              | Copy                                                               |
| -------------------- | ------------------------------------------------------------------ |
| Input placeholder    | "Ask about Croatian tax, VAT, contributions, fiscalization..."     |
| Answer placeholder   | "Verified answer will appear here"                                 |
| Answer subtext       | "Every response includes verified citations from official sources" |
| Evidence placeholder | "Sources"                                                          |
| Evidence subtext     | "Official regulations, laws, and guidance"                         |

**APP surface:**

| Element                | Copy                                                            |
| ---------------------- | --------------------------------------------------------------- |
| Input placeholder      | "Ask about regulations or your business..."                     |
| Answer placeholder     | "Verified answer will appear here"                              |
| Answer subtext         | "Answers can include calculations based on your connected data" |
| Evidence placeholder   | "Sources"                                                       |
| Evidence subtext       | "Official regulations and your business data"                   |
| ClientData placeholder | "Your data"                                                     |
| ClientData subtext     | "Connected sources will be used for personalized answers"       |

### IDLE with History

When history exists, show:

- HistoryBar with collapsed pills
- Input with subtext: "Ask a new question"
- No initial suggestion chips

### Suggestion Types

| Type                | When shown       | Source                       |
| ------------------- | ---------------- | ---------------------------- |
| Initial suggestions | IDLE, no history | Curated (not AI-generated)   |
| Related questions   | After COMPLETE   | Server-generated, contextual |
| Refusal suggestions | After REFUSAL    | Curated fallbacks            |

### Initial Suggestions (Curated)

**Marketing surface:**

```
[VAT registration threshold]  [Paušalni obrt limits]  [Fiscalization requirements]
[Contribution rates 2025]  [e-Invoice deadlines]  [Corporate tax basics]
```

**APP surface:**

```
[My VAT threshold status, based on invoices]  [Upcoming deadlines, from verified rules]
[Missing compliance items]  [Contribution calculator]  [Revenue this year, based on invoices]
```

### Suggestion Behavior (Fill-Only)

```typescript
function handleSuggestionClick(suggestion: string) {
  setInputValue(suggestion)
  inputRef.current?.focus()
  // DO NOT SUBMIT
}
```

### Chip Text Limits

- Label: ≤32 chars (truncate with ellipsis)
- Full input text: ≤120 chars

### Suggestion Visibility Rules

| State              | Initial suggestions | Related questions       |
| ------------------ | ------------------- | ----------------------- |
| IDLE (no history)  | Visible             | Hidden                  |
| IDLE (has history) | Hidden              | Hidden                  |
| LOADING            | Hidden              | Hidden                  |
| STREAMING          | Hidden              | Hidden                  |
| COMPLETE           | Hidden              | Visible (if provided)   |
| REFUSAL            | Hidden              | Visible (relatedTopics) |
| ERROR              | Visible (initial)   | Hidden                  |

### Refusal Suggestions by Type

| Refusal reason      | Suggestions                                       |
| ------------------- | ------------------------------------------------- |
| NO_CITABLE_RULES    | "Request coverage" + curated topics we CAN answer |
| OUT_OF_SCOPE        | Support/docs/contact links                        |
| MISSING_CLIENT_DATA | Connect data CTA                                  |
| UNRESOLVED_CONFLICT | "Try these related angles" chips                  |

---

## 5. Marketing CTA & Conversion

### Philosophy

The marketing assistant is a product demo, not a lead capture form. Users experience the system's authority first. Conversion happens because they want more, not because we blocked them.

**Core rule:** Demonstrate value before asking for anything.

### Layout by Surface

| Surface   | Default layout                          | Conditional                                                   |
| --------- | --------------------------------------- | ------------------------------------------------------------- |
| MARKETING | 2-column (Answer + Sources)             | "Personalize this" panel slides in on personalization queries |
| APP       | 3-column (Answer + Sources + Your Data) | Always                                                        |

Marketing never shows a disabled/placeholder third column.

### CTA Trigger Rules

| Condition                            | Show CTA?                          |
| ------------------------------------ | ---------------------------------- |
| First answer, non-personalization    | No                                 |
| First answer, personalization intent | Yes (personalization panel)        |
| Second+ answer, any topic            | Yes (contextual upsell)            |
| Refusal (NO_CITABLE_RULES)           | No upsell, only "Request coverage" |
| Refusal (OUT_OF_SCOPE)               | No upsell, only support/docs links |
| Refusal (MISSING_CLIENT_DATA)        | Yes (personalization panel)        |
| Refusal (UNRESOLVED_CONFLICT)        | No upsell, only related angles     |

**CTA shown only when:**

1. User received ≥1 successful REGULATORY answer with citations, AND
2. (Query count ≥2) OR (personalization intent detected)

### Contextual Upsell Block

```
┌───────────────────────────────────────────────┐
│  ◆  Calculate this for your business          │  ← Monochrome icon, no emoji
│                                                │
│  Connect your invoices to see your exact      │
│  threshold status and remaining amount.       │
│                                                │
│  [Start free →]                               │  ← Primary action
│  See how sources are verified                 │  ← Trust link (secondary)
└───────────────────────────────────────────────┘
```

### Visual Rules

- No emojis anywhere
- Optional monochrome icon (Lucide)
- Subtle card background
- Primary CTA button (secondary style, not loud)
- Trust link below (text link)

### Trust CTA Options

| Link                           | Destination               |
| ------------------------------ | ------------------------- |
| "See how sources are verified" | /methodology or /izvori   |
| "View all sources we track"    | /izvori                   |
| "How calculations work"        | /methodology#calculations |

### Dismissal Rules

| Surface   | Storage                     | Cooldown                   |
| --------- | --------------------------- | -------------------------- |
| MARKETING | localStorage/cookie         | 7 days                     |
| APP       | Server-side user preference | Permanent until re-enabled |

After dismissal, don't show CTA again until user completes ≥2 more successful answers.

### Conversion Analytics

| Event                        | Payload                                               |
| ---------------------------- | ----------------------------------------------------- |
| `marketing.cta.eligible`     | `{ queryCount, personalizationIntent, topic }`        |
| `marketing.cta.shown`        | `{ location, variant, topic }`                        |
| `marketing.cta.click`        | `{ location, variant, topic, queriesInSession }`      |
| `marketing.cta.dismiss`      | `{ location, queriesAtDismissal }`                    |
| `marketing.trust_link.click` | `{ destination }`                                     |
| `marketing.coverage_request` | `{ topic, queryText }`                                |
| `marketing.signup.start`     | `{ source: 'assistant', topic, queriesBeforeSignup }` |

---

## 6. Accessibility & Responsive

### Target Compliance

WCAG 2.1 AA

### Keyboard Navigation

| Key                | Context                 | Action                                   |
| ------------------ | ----------------------- | ---------------------------------------- |
| `Tab`              | Anywhere                | Move focus through interactive elements  |
| `Shift+Tab`        | Anywhere                | Move focus backwards                     |
| `Enter`            | Input focused           | Submit query                             |
| `Shift+Enter`      | Input focused           | New line                                 |
| `Enter`            | Suggestion chip focused | Fill input (does not submit)             |
| `Enter`            | Drawer toggle focused   | Expand/collapse drawer                   |
| `Escape`           | Drawer open             | Close drawer, return focus to toggle     |
| `Arrow Left/Right` | Chip container focused  | Navigate between chips (roving tabindex) |

### Focus Order

1. Skip links (sr-only until focused)
2. HistoryBar toggle
3. Input field
4. Send button
5. Suggestion chips container
6. AnswerCard headline (receives focus after submit)
7. Action buttons
8. Drawer content (when expanded)
9. EvidencePanel cards
10. ClientDataPanel
11. Related question chips
12. CTA buttons
13. Footer links

### Focus After Submit

Focus lands on **headline element** (`<h2 tabindex="-1">`) after answer complete.

### Skip Links

```html
<nav class="sr-only focus:not-sr-only" aria-label="Skip navigation">
  <a href="#assistant-answer">Skip to answer</a>
  <a href="#assistant-sources">Skip to sources</a>
  <a href="#assistant-input">Skip to input</a>
</nav>
```

### Screen Reader Announcements

Use a separate hidden live region for milestones (not character-by-character streaming):

```html
<article aria-live="off"><!-- Streaming content --></article>

<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Milestone announcements -->
</div>
```

**Announcements:**

- "Loading answer..."
- "Answer received: [headline]"
- "Sources available"
- "Your data loaded" (APP)
- "Error: [message]"

### Roving Tabindex for Chips

```html
<div role="listbox" tabindex="0" aria-activedescendant="chip-0">
  <button role="option" id="chip-0" tabindex="-1">VAT thresholds</button>
  <button role="option" id="chip-1" tabindex="-1">Paušalni limits</button>
</div>
```

### Color Contrast

All text meets WCAG AA (4.5:1 minimum for body text, 3:1 for large text).

**Validation:** axe-core, Lighthouse CI, snapshot tests for theme tokens.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .streaming-text {
    animation: none;
  }
  .drawer,
  .panel {
    transition: none;
  }
  .skeleton {
    animation: none;
    opacity: 0.5;
  }
}
```

### Responsive Breakpoints

| Breakpoint     | Name    | Layout                           |
| -------------- | ------- | -------------------------------- |
| < 640px        | Mobile  | Single column, stacked           |
| 640px - 1024px | Tablet  | 2-column                         |
| > 1024px       | Desktop | 2-column marketing, 3-column APP |

### Touch Targets

All interactive elements: minimum 44x44px.

---

## 7. Implementation Checklist & Quality Gates

### Quality Gates (Block Deploy)

| Gate                                     | Rule                                                      | Enforcement       |
| ---------------------------------------- | --------------------------------------------------------- | ----------------- |
| Citation compliance                      | `kind=ANSWER` + `topic=REGULATORY` → `citations` required | CI test           |
| Conflict safety                          | `UNRESOLVED_CONFLICT` + `kind=ANSWER` → **block deploy**  | CI test           |
| No computed result without complete data | `computedResult` only when `completeness.status=COMPLETE` | CI test           |
| Length limits                            | All fields within LIMITS constants                        | CI test + runtime |
| No markdown in response                  | All text fields plain text                                | Schema validation |
| Schema version                           | Response includes `schemaVersion`                         | CI test           |
| Authority order                          | Frontend does not reorder citations                       | Code review       |
| Accessibility                            | axe-core passes, no critical/serious issues               | CI test           |
| Focus management                         | Focus never lost after state transitions                  | E2E test          |
| Fill-only suggestions                    | Clicking chip does not submit                             | E2E test          |

### Acceptance Criteria

**UX:**

- [ ] Default answer fits on one mobile screen without scrolling (typical case)
- [ ] "Why?" and "Sources" are one tap away
- [ ] Suggestions never auto-submit
- [ ] Evidence panel visible by default (not collapsed)
- [ ] History accessible but never dominant
- [ ] No chat bubbles anywhere

**Trust:**

- [ ] Every REGULATORY answer cites sources
- [ ] Missing coverage → graceful refusal with next steps
- [ ] Unresolved conflicts → refusal, not guess
- [ ] Client-aware answers cite both rules AND data used
- [ ] No hedge language ("probably", "likely", "might")

**Visual:**

- [ ] No emojis in assistant UI
- [ ] Calm, muted color palette
- [ ] Authority badges visible on all sources
- [ ] Layout doesn't shift during streaming

**Operations:**

- [ ] No regressions to "wall of text" (length limits tested)
- [ ] Stable rendering across marketing and app
- [ ] Error states are recoverable
- [ ] Analytics events firing correctly

### Rollout Plan

1. **Feature flag internal** - Team only
2. **Marketing assistant** - Public, no client data
3. **APP assistant (pilot)** - 10% of tenants
4. **APP assistant (full)** - All tenants
5. **Remove feature flag** - Permanent

### Rollback Triggers

- Citation compliance drops below 95%
- Refusal rate exceeds 40%
- Error rate exceeds 5%
- User feedback overwhelmingly negative

### Monitoring Targets

- Refusal rate < 20%
- Median latency < 2s
- Citation compliance 100%

---

## Documentation Policy

- **This document is the single source of truth for Assistant UX**
- Legacy assistant docs are deprecated: `src/components/assistant/` inline comments
- New assistant behavior changes must update:
  1. This document
  2. API README (`docs/plans/assistant-api-readme.md`)
  3. Analytics dictionary (`docs/plans/assistant-analytics.md`)

---

## Appendix A: Example Response (Marketing)

```json
{
  "schemaVersion": "1.0.0",
  "requestId": "req_abc123",
  "traceId": "trace_xyz789",
  "kind": "ANSWER",
  "topic": "REGULATORY",
  "surface": "MARKETING",
  "createdAt": "2024-12-24T10:00:00Z",
  "headline": "You must charge 25% VAT (standard rate).",
  "directAnswer": "This applies to taxable supplies when you are VAT-registered in Croatia.",
  "keyDetails": [
    "Standard rate applies to most goods and services",
    "Reduced rates (13%, 5%) apply to specific categories",
    "Exemptions exist for certain financial and educational services"
  ],
  "asOfDate": "2024-12-24",
  "confidence": {
    "level": "HIGH",
    "score": 0.95,
    "rationale": "2 primary sources, no conflicts"
  },
  "why": {
    "bullets": [
      "You are VAT-registered (threshold exceeded or voluntary)",
      "The supply is taxable under Croatian VAT law",
      "No exemption or reduced rate applies to this category"
    ]
  },
  "citations": {
    "primary": {
      "id": "sp_001",
      "title": "Zakon o porezu na dodanu vrijednost",
      "authority": "LAW",
      "reference": "čl. 38, st. 1",
      "quote": "Standardna stopa poreza na dodanu vrijednost iznosi 25 posto.",
      "url": "https://narodne-novine.nn.hr/...",
      "effectiveFrom": "2024-01-01",
      "confidence": 0.98,
      "status": "ACTIVE"
    },
    "supporting": [
      {
        "id": "sp_002",
        "title": "Pravilnik o porezu na dodanu vrijednost",
        "authority": "REGULATION",
        "reference": "čl. 47",
        "url": "https://narodne-novine.nn.hr/...",
        "effectiveFrom": "2024-01-01",
        "confidence": 0.92,
        "status": "ACTIVE"
      }
    ]
  },
  "relatedQuestions": [
    "When do I become VAT-registered?",
    "What are reduced VAT rates?",
    "How do I file VAT returns?"
  ]
}
```

## Appendix B: Example Response (APP, Client-Aware)

```json
{
  "schemaVersion": "1.0.0",
  "requestId": "req_def456",
  "traceId": "trace_uvw012",
  "kind": "ANSWER",
  "topic": "REGULATORY",
  "surface": "APP",
  "createdAt": "2024-12-24T10:00:00Z",
  "headline": "You have €8,240 remaining until the VAT threshold.",
  "directAnswer": "Based on your invoiced revenue and the applicable threshold rule.",
  "asOfDate": "2024-12-24",
  "confidence": {
    "level": "HIGH",
    "score": 0.92,
    "rationale": "Rule verified, client data 92% complete"
  },
  "citations": {
    "primary": {
      "id": "sp_003",
      "title": "Zakon o porezu na dodanu vrijednost",
      "authority": "LAW",
      "reference": "čl. 90, st. 1",
      "quote": "Prag za upis u registar obveznika PDV-a iznosi 40.000 eura.",
      "url": "https://narodne-novine.nn.hr/...",
      "effectiveFrom": "2024-01-01",
      "confidence": 0.98,
      "status": "ACTIVE"
    },
    "supporting": []
  },
  "clientContext": {
    "used": [
      {
        "label": "Revenue YTD",
        "value": "€31,760",
        "source": "Invoices",
        "asOfDate": "2024-12-23"
      },
      {
        "label": "VAT Threshold",
        "value": "€40,000",
        "source": "Regulatory rule",
        "asOfDate": "2024-01-01"
      }
    ],
    "completeness": {
      "status": "COMPLETE",
      "score": 0.92,
      "notes": "2 invoices from November pending import"
    },
    "assumptions": ["Using invoice issue date for revenue recognition"],
    "missing": [],
    "computedResult": {
      "label": "Remaining until threshold",
      "value": "€8,240",
      "explanation": "€40,000 - €31,760 = €8,240"
    }
  },
  "relatedQuestions": [
    "What happens when I exceed the threshold?",
    "When is the next VAT filing deadline?",
    "Can I voluntarily register earlier?"
  ]
}
```
