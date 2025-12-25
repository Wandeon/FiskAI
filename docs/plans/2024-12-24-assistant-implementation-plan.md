# FiskAI Assistant UI/UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the premium "consultation surface" assistant with evidence-first responses, client-aware mode, and fail-closed behavior.

**Architecture:** React components with a centralized state controller hook. Streaming API responses. Two surfaces (MARKETING/APP) sharing the same component tree with conditional panels.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest for unit tests, Playwright for E2E.

**Design Document:** `docs/plans/2024-12-24-assistant-ui-ux-design.md`

---

## Phase Overview

| Phase | Description                    | Tasks |
| ----- | ------------------------------ | ----- |
| 1     | Foundation (Types & Constants) | 1-4   |
| 2     | State Management               | 5-9   |
| 3     | API Endpoint                   | 10-14 |
| 4     | Core UI Components             | 15-22 |
| 5     | Answer Components              | 23-30 |
| 6     | Evidence & Client Data Panels  | 31-36 |
| 7     | Accessibility                  | 37-41 |
| 8     | Marketing CTA System           | 42-46 |
| 9     | Analytics & Quality Gates      | 47-52 |

---

## Phase 1: Foundation (Types & Constants)

### Task 1: Create Response Contract Types

**Files:**

- Create: `src/lib/assistant/types.ts`
- Test: `src/lib/assistant/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/__tests__/types.test.ts
import { describe, it, expect } from "vitest"
import {
  SCHEMA_VERSION,
  LIMITS,
  AUTHORITY_ORDER,
  AUTHORITY_RANK,
  type AssistantResponse,
  type RefusalReason,
} from "../types"

describe("Assistant Types", () => {
  it("exports SCHEMA_VERSION as 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0")
  })

  it("exports LIMITS with correct values", () => {
    expect(LIMITS.headline).toBe(120)
    expect(LIMITS.directAnswer).toBe(240)
    expect(LIMITS.totalResponseChars).toBe(3500)
  })

  it("exports AUTHORITY_ORDER in correct sequence", () => {
    expect(AUTHORITY_ORDER).toEqual(["LAW", "REGULATION", "GUIDANCE", "PRACTICE"])
  })

  it("exports AUTHORITY_RANK with correct rankings", () => {
    expect(AUTHORITY_RANK.LAW).toBe(1)
    expect(AUTHORITY_RANK.REGULATION).toBe(2)
    expect(AUTHORITY_RANK.GUIDANCE).toBe(3)
    expect(AUTHORITY_RANK.PRACTICE).toBe(4)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../types'"

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/types.ts

// === SCHEMA METADATA ===
export const SCHEMA_VERSION = "1.0.0" as const

// === LENGTH BUDGETS (Server-Enforced) ===
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

// === AUTHORITY ORDER (FROZEN - Do not modify) ===
export const AUTHORITY_ORDER = ["LAW", "REGULATION", "GUIDANCE", "PRACTICE"] as const
export type AuthorityLevel = (typeof AUTHORITY_ORDER)[number]

export const AUTHORITY_RANK: Record<AuthorityLevel, number> = {
  LAW: 1,
  REGULATION: 2,
  GUIDANCE: 3,
  PRACTICE: 4,
}

// === REFUSAL REASONS ===
export type RefusalReason =
  | "NO_CITABLE_RULES"
  | "OUT_OF_SCOPE"
  | "MISSING_CLIENT_DATA"
  | "UNRESOLVED_CONFLICT"

// === SURFACE & TOPIC ===
export type Surface = "MARKETING" | "APP"
export type Topic = "REGULATORY" | "PRODUCT" | "SUPPORT" | "OFFTOPIC"
export type ResponseKind = "ANSWER" | "REFUSAL" | "ERROR"

// === SOURCE CARD ===
export interface SourceCard {
  id: string
  title: string
  authority: AuthorityLevel
  reference?: string
  quote?: string
  pageNumber?: number
  url: string
  effectiveFrom: string
  confidence: number
  status?: "ACTIVE" | "SUPERSEDED"
}

// === CITATION BLOCK ===
export interface CitationBlock {
  primary: SourceCard
  supporting: SourceCard[]
}

// === CLIENT CONTEXT ===
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

export type CompletenessStatus = "COMPLETE" | "PARTIAL" | "NONE"

export interface ClientContextBlock {
  used: DataPoint[]
  completeness: {
    status: CompletenessStatus
    score: number
    notes?: string
  }
  assumptions?: string[]
  missing?: MissingData[]
  computedResult?: {
    label: string
    value: string
    explanation?: string
  }
}

// === CONFLICT BLOCK ===
export type ConflictStatus = "RESOLVED" | "UNRESOLVED" | "CONTEXT_DEPENDENT"

export interface ConflictBlock {
  status: ConflictStatus
  resolvedAt?: string
  description: string
  sources: SourceCard[]
  winningSourceId?: string
}

// === REFUSAL BLOCK ===
export interface RedirectOption {
  label: string
  href: string
  type: "SUPPORT" | "DOCS" | "CONTACT"
}

export interface RefusalBlock {
  message: string
  relatedTopics?: string[]
  redirectOptions?: RedirectOption[]
  missingData?: MissingData[]
  conflictingSources?: SourceCard[]
}

// === DEBUG BLOCK (non-production only) ===
export interface DebugBlock {
  latencyMs: number
  rulesConsidered: number
  rulesUsed: number
  conflictsOpen: number
  pipelineStages?: string[]
}

// === CONFIDENCE ===
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW"

export interface Confidence {
  level: ConfidenceLevel
  score?: number
  rationale?: string
}

// === CORE RESPONSE ===
export interface AssistantResponse {
  // Schema & tracing
  schemaVersion: typeof SCHEMA_VERSION
  requestId: string
  traceId: string

  // Classification
  kind: ResponseKind
  topic: Topic
  surface: Surface
  createdAt: string

  // Answer content
  headline: string
  directAnswer: string
  keyDetails?: string[]
  nextStep?: string
  asOfDate?: string
  confidence?: Confidence

  // Drawers
  why?: { bullets: string[] }
  howToApply?: { steps: string[] }

  // Citations
  citations?: CitationBlock

  // Client context (APP only)
  clientContext?: ClientContextBlock

  // Conflict
  conflict?: ConflictBlock

  // Refusal
  refusalReason?: RefusalReason
  refusal?: RefusalBlock

  // Error
  error?: {
    message: string
    retryable: boolean
  }

  // Follow-up
  relatedQuestions?: string[]

  // Debug (non-production)
  _debug?: DebugBlock
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/types.ts src/lib/assistant/__tests__/types.test.ts
git commit -m "feat(assistant): add response contract types and constants"
```

---

### Task 2: Create Error Types

**Files:**

- Modify: `src/lib/assistant/types.ts`
- Test: `src/lib/assistant/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/lib/assistant/__tests__/types.test.ts
import { ERROR_TYPES, type ErrorType } from "../types"

describe("Error Types", () => {
  it("exports all error types", () => {
    expect(ERROR_TYPES).toContain("NETWORK_TIMEOUT")
    expect(ERROR_TYPES).toContain("NETWORK_FAILURE")
    expect(ERROR_TYPES).toContain("SERVER_ERROR")
    expect(ERROR_TYPES).toContain("CLIENT_ERROR")
    expect(ERROR_TYPES).toContain("SCHEMA_VALIDATION")
    expect(ERROR_TYPES).toContain("RATE_LIMITED")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: FAIL with "ERROR_TYPES is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to src/lib/assistant/types.ts

// === ERROR TYPES ===
export const ERROR_TYPES = [
  "NETWORK_TIMEOUT",
  "NETWORK_FAILURE",
  "SERVER_ERROR",
  "CLIENT_ERROR",
  "SCHEMA_VALIDATION",
  "RATE_LIMITED",
] as const

export type ErrorType = (typeof ERROR_TYPES)[number]

export interface AssistantError {
  type: ErrorType
  message: string
  httpStatus?: number
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/types.ts src/lib/assistant/__tests__/types.test.ts
git commit -m "feat(assistant): add error types"
```

---

### Task 3: Create Controller State Types

**Files:**

- Modify: `src/lib/assistant/types.ts`
- Test: `src/lib/assistant/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/lib/assistant/__tests__/types.test.ts
import { CONTROLLER_STATES, type ControllerStatus } from "../types"

describe("Controller State Types", () => {
  it("exports all controller states", () => {
    expect(CONTROLLER_STATES).toContain("IDLE")
    expect(CONTROLLER_STATES).toContain("LOADING")
    expect(CONTROLLER_STATES).toContain("STREAMING")
    expect(CONTROLLER_STATES).toContain("COMPLETE")
    expect(CONTROLLER_STATES).toContain("PARTIAL_COMPLETE")
    expect(CONTROLLER_STATES).toContain("ERROR")
    expect(CONTROLLER_STATES).toHaveLength(6)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Add to src/lib/assistant/types.ts

// === CONTROLLER STATES ===
export const CONTROLLER_STATES = [
  "IDLE",
  "LOADING",
  "STREAMING",
  "COMPLETE",
  "PARTIAL_COMPLETE",
  "ERROR",
] as const

export type ControllerStatus = (typeof CONTROLLER_STATES)[number]

// === HISTORY ITEM ===
export interface HistoryItem {
  id: string
  query: string
  answer: AssistantResponse
  timestamp: string
}

// === STREAM PROGRESS ===
export interface StreamProgress {
  headline: boolean
  directAnswer: boolean
  citations: boolean
  clientContext: boolean
}

// === CONTROLLER STATE ===
export interface AssistantControllerState {
  status: ControllerStatus
  activeRequestId: string | null
  activeQuery: string | null
  activeAnswer: AssistantResponse | null
  history: HistoryItem[]
  error: AssistantError | null
  retryCount: number
  streamProgress: StreamProgress
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/types.ts src/lib/assistant/__tests__/types.test.ts
git commit -m "feat(assistant): add controller state types"
```

---

### Task 4: Create Analytics Event Types

**Files:**

- Create: `src/lib/assistant/analytics.ts`
- Test: `src/lib/assistant/__tests__/analytics.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/__tests__/analytics.test.ts
import { describe, it, expect } from "vitest"
import { ANALYTICS_EVENTS, type AnalyticsEvent } from "../analytics"

describe("Analytics Events", () => {
  it("exports all assistant analytics events", () => {
    expect(ANALYTICS_EVENTS).toContain("assistant.query.submit")
    expect(ANALYTICS_EVENTS).toContain("assistant.query.complete")
    expect(ANALYTICS_EVENTS).toContain("assistant.query.refusal")
    expect(ANALYTICS_EVENTS).toContain("assistant.query.error")
    expect(ANALYTICS_EVENTS).toContain("assistant.drawer.expand")
    expect(ANALYTICS_EVENTS).toContain("assistant.feedback.submit")
  })

  it("exports all marketing analytics events", () => {
    expect(ANALYTICS_EVENTS).toContain("marketing.cta.shown")
    expect(ANALYTICS_EVENTS).toContain("marketing.cta.click")
    expect(ANALYTICS_EVENTS).toContain("marketing.cta.dismiss")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/analytics.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/analytics.ts
import type { Surface, Topic, RefusalReason, ErrorType } from "./types"

export const ANALYTICS_EVENTS = [
  // Query lifecycle
  "assistant.query.submit",
  "assistant.query.complete",
  "assistant.query.partial",
  "assistant.query.refusal",
  "assistant.query.error",
  "assistant.query.cancelled",

  // User interactions
  "assistant.drawer.expand",
  "assistant.feedback.submit",
  "assistant.history.restore",
  "assistant.suggestion.click",
  "assistant.retry.attempt",

  // Marketing CTAs
  "marketing.cta.eligible",
  "marketing.cta.shown",
  "marketing.cta.click",
  "marketing.cta.dismiss",
  "marketing.trust_link.click",
  "marketing.coverage_request",
  "marketing.signup.start",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

// Event payloads
export interface QuerySubmitPayload {
  surface: Surface
  queryLength: number
  suggestionUsed: boolean
  fromHistory: boolean
}

export interface QueryCompletePayload {
  surface: Surface
  topic: Topic
  kind: "ANSWER" | "REFUSAL" | "ERROR"
  latencyMs: number
  citationCount: number
}

export interface QueryRefusalPayload {
  surface: Surface
  topic: Topic
  refusalReason: RefusalReason
}

export interface QueryErrorPayload {
  errorType: ErrorType
  httpStatus?: number
  latencyMs: number
  surface: Surface
  retryCount: number
}

export interface DrawerExpandPayload {
  drawer: "why" | "sources" | "clientData"
}

export interface FeedbackSubmitPayload {
  requestId: string
  positive: boolean
  comment?: string
}

export interface SuggestionClickPayload {
  type: "initial" | "related" | "refusal"
  suggestionText: string
  position: number
}

export interface CTAShownPayload {
  location: "contextual" | "personalization" | "footer"
  variant: string
  topic: Topic
}

export interface CTAClickPayload extends CTAShownPayload {
  queriesInSession: number
}

// Union type for all payloads
export type AnalyticsPayload =
  | QuerySubmitPayload
  | QueryCompletePayload
  | QueryRefusalPayload
  | QueryErrorPayload
  | DrawerExpandPayload
  | FeedbackSubmitPayload
  | SuggestionClickPayload
  | CTAShownPayload
  | CTAClickPayload

export type AnalyticsEvent = {
  name: AnalyticsEventName
  payload: AnalyticsPayload
  timestamp: string
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/analytics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/analytics.ts src/lib/assistant/__tests__/analytics.test.ts
git commit -m "feat(assistant): add analytics event types"
```

---

## Phase 2: State Management

### Task 5: Create useAssistantController Hook - Initial State

**Files:**

- Create: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAssistantController } from "../useAssistantController"

describe("useAssistantController", () => {
  it("initializes with IDLE status", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    expect(result.current.state.status).toBe("IDLE")
    expect(result.current.state.activeQuery).toBeNull()
    expect(result.current.state.activeAnswer).toBeNull()
    expect(result.current.state.history).toEqual([])
    expect(result.current.state.error).toBeNull()
    expect(result.current.state.retryCount).toBe(0)
  })

  it("provides surface from props", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "APP" }))
    expect(result.current.surface).toBe("APP")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/hooks/useAssistantController.ts
import { useReducer, useCallback } from "react"
import type {
  Surface,
  AssistantControllerState,
  AssistantResponse,
  AssistantError,
  HistoryItem,
} from "../types"

interface UseAssistantControllerProps {
  surface: Surface
}

type Action =
  | { type: "SUBMIT"; query: string; requestId: string }
  | { type: "STREAM_START" }
  | { type: "STREAM_UPDATE"; data: Partial<AssistantResponse> }
  | { type: "COMPLETE"; response: AssistantResponse }
  | { type: "ERROR"; error: AssistantError }
  | { type: "CANCEL" }
  | { type: "RESTORE_HISTORY"; index: number }
  | { type: "CLEAR_HISTORY" }
  | { type: "RETRY" }

const initialState: AssistantControllerState = {
  status: "IDLE",
  activeRequestId: null,
  activeQuery: null,
  activeAnswer: null,
  history: [],
  error: null,
  retryCount: 0,
  streamProgress: {
    headline: false,
    directAnswer: false,
    citations: false,
    clientContext: false,
  },
}

function reducer(state: AssistantControllerState, action: Action): AssistantControllerState {
  switch (action.type) {
    case "SUBMIT":
      return {
        ...state,
        status: "LOADING",
        activeRequestId: action.requestId,
        activeQuery: action.query,
        activeAnswer: null,
        error: null,
        streamProgress: {
          headline: false,
          directAnswer: false,
          citations: false,
          clientContext: false,
        },
      }
    default:
      return state
  }
}

export function useAssistantController({ surface }: UseAssistantControllerProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    state,
    surface,
    dispatch,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): add useAssistantController hook with initial state"
```

---

### Task 6: Add Submit Action to Controller

**Files:**

- Modify: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to useAssistantController.test.ts
import { act } from "@testing-library/react"

describe("submit action", () => {
  it("transitions to LOADING and sets query", async () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    await act(async () => {
      result.current.submit("What is VAT rate?")
    })

    expect(result.current.state.status).toBe("LOADING")
    expect(result.current.state.activeQuery).toBe("What is VAT rate?")
    expect(result.current.state.activeRequestId).toBeTruthy()
  })

  it("cancels previous request when submitting during LOADING", async () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    await act(async () => {
      result.current.submit("First query")
    })

    const firstRequestId = result.current.state.activeRequestId

    await act(async () => {
      result.current.submit("Second query")
    })

    expect(result.current.state.activeRequestId).not.toBe(firstRequestId)
    expect(result.current.state.activeQuery).toBe("Second query")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL with "result.current.submit is not a function"

**Step 3: Write minimal implementation**

```typescript
// Update useAssistantController.ts
import { useReducer, useCallback, useRef } from "react"
import { nanoid } from "nanoid"

// ... existing code ...

export function useAssistantController({ surface }: UseAssistantControllerProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const submit = useCallback(async (query: string) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const requestId = nanoid()
    abortControllerRef.current = new AbortController()

    dispatch({ type: "SUBMIT", query, requestId })

    // API call will be added in Task 10
  }, [])

  return {
    state,
    surface,
    submit,
    dispatch,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): add submit action to controller"
```

---

### Task 7: Add Streaming State Updates

**Files:**

- Modify: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to useAssistantController.test.ts
describe("streaming updates", () => {
  it("transitions to STREAMING on first data", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "test", requestId: "req_1" })
    })

    act(() => {
      result.current.dispatch({ type: "STREAM_START" })
    })

    expect(result.current.state.status).toBe("STREAMING")
  })

  it("updates stream progress as fields arrive", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "test", requestId: "req_1" })
      result.current.dispatch({ type: "STREAM_START" })
      result.current.dispatch({
        type: "STREAM_UPDATE",
        data: { headline: "VAT rate is 25%" },
      })
    })

    expect(result.current.state.streamProgress.headline).toBe(true)
    expect(result.current.state.activeAnswer?.headline).toBe("VAT rate is 25%")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Update reducer in useAssistantController.ts
function reducer(state: AssistantControllerState, action: Action): AssistantControllerState {
  switch (action.type) {
    case "SUBMIT":
      return {
        ...state,
        status: "LOADING",
        activeRequestId: action.requestId,
        activeQuery: action.query,
        activeAnswer: null,
        error: null,
        streamProgress: {
          headline: false,
          directAnswer: false,
          citations: false,
          clientContext: false,
        },
      }

    case "STREAM_START":
      return {
        ...state,
        status: "STREAMING",
      }

    case "STREAM_UPDATE": {
      const currentAnswer = state.activeAnswer || ({} as Partial<AssistantResponse>)
      const newAnswer = { ...currentAnswer, ...action.data } as AssistantResponse

      return {
        ...state,
        activeAnswer: newAnswer,
        streamProgress: {
          headline: !!newAnswer.headline || state.streamProgress.headline,
          directAnswer: !!newAnswer.directAnswer || state.streamProgress.directAnswer,
          citations: !!newAnswer.citations || state.streamProgress.citations,
          clientContext: !!newAnswer.clientContext || state.streamProgress.clientContext,
        },
      }
    }

    default:
      return state
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): add streaming state updates to controller"
```

---

### Task 8: Add Complete, Error, and History Actions

**Files:**

- Modify: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to useAssistantController.test.ts
import { SCHEMA_VERSION } from "../../types"

const mockResponse: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: "req_1",
  traceId: "trace_1",
  kind: "ANSWER",
  topic: "REGULATORY",
  surface: "MARKETING",
  createdAt: new Date().toISOString(),
  headline: "VAT rate is 25%",
  directAnswer: "Standard VAT rate in Croatia is 25%.",
}

describe("complete action", () => {
  it("transitions to COMPLETE and adds to history", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "What is VAT?", requestId: "req_1" })
      result.current.dispatch({ type: "COMPLETE", response: mockResponse })
    })

    expect(result.current.state.status).toBe("COMPLETE")
    expect(result.current.state.activeAnswer).toEqual(mockResponse)
    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.history[0].query).toBe("What is VAT?")
  })
})

describe("error action", () => {
  it("transitions to ERROR and stores error", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "test", requestId: "req_1" })
      result.current.dispatch({
        type: "ERROR",
        error: { type: "NETWORK_FAILURE", message: "Connection failed" },
      })
    })

    expect(result.current.state.status).toBe("ERROR")
    expect(result.current.state.error?.type).toBe("NETWORK_FAILURE")
  })
})

describe("history restore", () => {
  it("restores previous answer from history", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    // Complete first query
    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "First query", requestId: "req_1" })
      result.current.dispatch({ type: "COMPLETE", response: mockResponse })
    })

    // Complete second query
    const secondResponse = { ...mockResponse, headline: "Second answer" }
    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "Second query", requestId: "req_2" })
      result.current.dispatch({ type: "COMPLETE", response: secondResponse })
    })

    // Restore first
    act(() => {
      result.current.dispatch({ type: "RESTORE_HISTORY", index: 0 })
    })

    expect(result.current.state.activeAnswer?.headline).toBe("VAT rate is 25%")
    expect(result.current.state.activeQuery).toBe("First query")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Update reducer in useAssistantController.ts
case 'COMPLETE': {
  const historyItem: HistoryItem = {
    id: nanoid(),
    query: state.activeQuery || '',
    answer: action.response,
    timestamp: new Date().toISOString(),
  }

  return {
    ...state,
    status: 'COMPLETE',
    activeAnswer: action.response,
    history: [...state.history, historyItem],
    retryCount: 0,
  }
}

case 'ERROR':
  return {
    ...state,
    status: 'ERROR',
    error: action.error,
  }

case 'RESTORE_HISTORY': {
  const item = state.history[action.index]
  if (!item) return state

  return {
    ...state,
    status: 'COMPLETE',
    activeQuery: item.query,
    activeAnswer: item.answer,
  }
}

case 'CLEAR_HISTORY':
  return {
    ...state,
    history: [],
  }

case 'RETRY':
  return {
    ...state,
    status: 'LOADING',
    error: null,
    retryCount: state.retryCount + 1,
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): add complete, error, and history actions to controller"
```

---

### Task 9: Add PARTIAL_COMPLETE State for APP Surface

**Files:**

- Modify: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to useAssistantController.test.ts
describe("PARTIAL_COMPLETE state", () => {
  it("transitions to PARTIAL_COMPLETE when answer done but clientContext incomplete", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "APP" }))

    const partialResponse: AssistantResponse = {
      ...mockResponse,
      surface: "APP",
      clientContext: {
        used: [],
        completeness: { status: "PARTIAL", score: 0.5 },
      },
    }

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "My threshold", requestId: "req_1" })
      result.current.dispatch({ type: "COMPLETE", response: partialResponse })
    })

    expect(result.current.state.status).toBe("PARTIAL_COMPLETE")
  })

  it("stays COMPLETE when clientContext is complete", () => {
    const { result } = renderHook(() => useAssistantController({ surface: "APP" }))

    const completeResponse: AssistantResponse = {
      ...mockResponse,
      surface: "APP",
      clientContext: {
        used: [{ label: "Revenue", value: "€31,760", source: "Invoices" }],
        completeness: { status: "COMPLETE", score: 1.0 },
      },
    }

    act(() => {
      result.current.dispatch({ type: "SUBMIT", query: "My threshold", requestId: "req_1" })
      result.current.dispatch({ type: "COMPLETE", response: completeResponse })
    })

    expect(result.current.state.status).toBe("COMPLETE")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Update COMPLETE case in reducer
case 'COMPLETE': {
  const historyItem: HistoryItem = {
    id: nanoid(),
    query: state.activeQuery || '',
    answer: action.response,
    timestamp: new Date().toISOString(),
  }

  // Check if APP surface with incomplete client context
  const isPartialComplete =
    action.response.surface === 'APP' &&
    action.response.clientContext?.completeness?.status !== 'COMPLETE'

  return {
    ...state,
    status: isPartialComplete ? 'PARTIAL_COMPLETE' : 'COMPLETE',
    activeAnswer: action.response,
    history: [...state.history, historyItem],
    retryCount: 0,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): add PARTIAL_COMPLETE state for APP surface"
```

---

## Phase 3: API Endpoint

### Task 10: Create Assistant Chat API Route

**Files:**

- Create: `src/app/api/assistant/chat/route.ts`
- Test: `src/app/api/assistant/chat/__tests__/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/app/api/assistant/chat/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest"
import { POST } from "../route"
import { NextRequest } from "next/server"

describe("POST /api/assistant/chat", () => {
  it("returns 400 for missing query", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Query is required")
  })

  it("returns 400 for invalid surface", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test", surface: "INVALID" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("returns structured response for valid request", async () => {
    const request = new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query: "What is VAT rate?", surface: "MARKETING" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.schemaVersion).toBe("1.0.0")
    expect(data.requestId).toBeTruthy()
    expect(data.surface).toBe("MARKETING")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/assistant/chat/__tests__/route.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/app/api/assistant/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { SCHEMA_VERSION, type Surface, type AssistantResponse } from "@/lib/assistant/types"

interface ChatRequest {
  query: string
  surface: Surface
  tenantId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest

    // Validate request
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!body.surface || !["MARKETING", "APP"].includes(body.surface)) {
      return NextResponse.json({ error: "Invalid surface" }, { status: 400 })
    }

    const requestId = `req_${nanoid()}`
    const traceId = `trace_${nanoid()}`

    // TODO: Implement actual query processing
    // For now, return a mock response
    const response: AssistantResponse = {
      schemaVersion: SCHEMA_VERSION,
      requestId,
      traceId,
      kind: "ANSWER",
      topic: "REGULATORY",
      surface: body.surface,
      createdAt: new Date().toISOString(),
      headline: "This is a placeholder response.",
      directAnswer: "The actual implementation will query the regulatory rules database.",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Assistant chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/assistant/chat/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/assistant/chat/route.ts src/app/api/assistant/chat/__tests__/route.test.ts
git commit -m "feat(assistant): add chat API route scaffold"
```

---

### Task 11: Add Response Validation

**Files:**

- Create: `src/lib/assistant/validation.ts`
- Test: `src/lib/assistant/__tests__/validation.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/__tests__/validation.test.ts
import { describe, it, expect } from "vitest"
import { validateResponse, truncateField, enforceEnforcementMatrix } from "../validation"
import { SCHEMA_VERSION, LIMITS, type AssistantResponse } from "../types"

describe("validateResponse", () => {
  const validResponse: AssistantResponse = {
    schemaVersion: SCHEMA_VERSION,
    requestId: "req_1",
    traceId: "trace_1",
    kind: "ANSWER",
    topic: "REGULATORY",
    surface: "MARKETING",
    createdAt: new Date().toISOString(),
    headline: "Test headline",
    directAnswer: "Test answer",
  }

  it("passes for valid response", () => {
    const result = validateResponse(validResponse)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails when REGULATORY answer lacks citations", () => {
    const result = validateResponse(validResponse)
    expect(result.warnings).toContain("REGULATORY answer should have citations")
  })
})

describe("truncateField", () => {
  it("truncates long strings with ellipsis", () => {
    const long = "a".repeat(150)
    const result = truncateField(long, LIMITS.headline)
    expect(result.length).toBe(120)
    expect(result.endsWith("...")).toBe(true)
  })

  it("does not truncate short strings", () => {
    const short = "Hello"
    const result = truncateField(short, LIMITS.headline)
    expect(result).toBe("Hello")
  })
})

describe("enforceEnforcementMatrix", () => {
  it("requires citations for REGULATORY ANSWER", () => {
    const response: Partial<AssistantResponse> = {
      kind: "ANSWER",
      topic: "REGULATORY",
    }
    const result = enforceEnforcementMatrix(response)
    expect(result.citationsRequired).toBe(true)
    expect(result.computedResultAllowed).toBe(true)
  })

  it("forbids citations for OUT_OF_SCOPE refusal", () => {
    const response: Partial<AssistantResponse> = {
      kind: "REFUSAL",
      refusalReason: "OUT_OF_SCOPE",
    }
    const result = enforceEnforcementMatrix(response)
    expect(result.citationsRequired).toBe(false)
    expect(result.citationsForbidden).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/validation.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/validation.ts
import { LIMITS, type AssistantResponse, type RefusalReason } from "./types"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateResponse(response: AssistantResponse): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  if (!response.schemaVersion) errors.push("Missing schemaVersion")
  if (!response.requestId) errors.push("Missing requestId")
  if (!response.traceId) errors.push("Missing traceId")
  if (!response.kind) errors.push("Missing kind")
  if (!response.topic) errors.push("Missing topic")
  if (!response.surface) errors.push("Missing surface")

  // Check length limits
  if (response.headline && response.headline.length > LIMITS.headline) {
    errors.push(`Headline exceeds ${LIMITS.headline} chars`)
  }
  if (response.directAnswer && response.directAnswer.length > LIMITS.directAnswer) {
    errors.push(`DirectAnswer exceeds ${LIMITS.directAnswer} chars`)
  }

  // Check enforcement matrix
  const matrix = enforceEnforcementMatrix(response)
  if (matrix.citationsRequired && !response.citations) {
    warnings.push("REGULATORY answer should have citations")
  }
  if (matrix.citationsForbidden && response.citations) {
    errors.push("Citations not allowed for this response type")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function truncateField(value: string, limit: number): string {
  if (value.length <= limit) return value
  return value.slice(0, limit - 3) + "..."
}

export interface EnforcementResult {
  citationsRequired: boolean
  citationsForbidden: boolean
  computedResultAllowed: boolean
  computedResultForbidden: boolean
}

export function enforceEnforcementMatrix(response: Partial<AssistantResponse>): EnforcementResult {
  const { kind, topic, refusalReason } = response

  // Default: nothing required or forbidden
  const result: EnforcementResult = {
    citationsRequired: false,
    citationsForbidden: false,
    computedResultAllowed: false,
    computedResultForbidden: true,
  }

  if (kind === "ANSWER") {
    if (topic === "REGULATORY") {
      result.citationsRequired = true
      result.computedResultAllowed = true
      result.computedResultForbidden = false
    } else {
      // PRODUCT/SUPPORT/OFFTOPIC
      result.citationsForbidden = true
    }
  } else if (kind === "REFUSAL") {
    if (refusalReason === "UNRESOLVED_CONFLICT") {
      result.citationsRequired = true
    } else if (refusalReason === "MISSING_CLIENT_DATA") {
      // Citations optional
    } else {
      // NO_CITABLE_RULES, OUT_OF_SCOPE
      result.citationsForbidden = true
    }
  }

  return result
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/validation.ts src/lib/assistant/__tests__/validation.test.ts
git commit -m "feat(assistant): add response validation utilities"
```

---

### Task 12: Add Citation Ordering Utility

**Files:**

- Create: `src/lib/assistant/citations.ts`
- Test: `src/lib/assistant/__tests__/citations.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/__tests__/citations.test.ts
import { describe, it, expect } from "vitest"
import { orderCitations, type SourceCard } from "../citations"

describe("orderCitations", () => {
  const lawSource: SourceCard = {
    id: "law_1",
    title: "Zakon o PDV-u",
    authority: "LAW",
    url: "https://example.com/law",
    effectiveFrom: "2024-01-01",
    confidence: 0.95,
  }

  const regulationSource: SourceCard = {
    id: "reg_1",
    title: "Pravilnik",
    authority: "REGULATION",
    url: "https://example.com/reg",
    effectiveFrom: "2024-01-01",
    confidence: 0.9,
  }

  const guidanceSource: SourceCard = {
    id: "guid_1",
    title: "Mišljenje",
    authority: "GUIDANCE",
    url: "https://example.com/guid",
    effectiveFrom: "2024-06-01",
    confidence: 0.85,
  }

  it("orders by authority level (LAW > REGULATION > GUIDANCE)", () => {
    const sources = [guidanceSource, lawSource, regulationSource]
    const ordered = orderCitations(sources)

    expect(ordered[0].authority).toBe("LAW")
    expect(ordered[1].authority).toBe("REGULATION")
    expect(ordered[2].authority).toBe("GUIDANCE")
  })

  it("uses effective date as tiebreaker (newer first)", () => {
    const older: SourceCard = { ...regulationSource, id: "reg_old", effectiveFrom: "2023-01-01" }
    const newer: SourceCard = { ...regulationSource, id: "reg_new", effectiveFrom: "2024-06-01" }

    const ordered = orderCitations([older, newer])
    expect(ordered[0].id).toBe("reg_new")
  })

  it("uses confidence as secondary tiebreaker", () => {
    const low: SourceCard = { ...regulationSource, id: "reg_low", confidence: 0.7 }
    const high: SourceCard = { ...regulationSource, id: "reg_high", confidence: 0.95 }

    const ordered = orderCitations([low, high])
    expect(ordered[0].id).toBe("reg_high")
  })

  it("uses id as final stable tiebreaker", () => {
    const a: SourceCard = { ...regulationSource, id: "aaa" }
    const b: SourceCard = { ...regulationSource, id: "bbb" }

    const ordered = orderCitations([b, a])
    expect(ordered[0].id).toBe("aaa")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/__tests__/citations.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/citations.ts
import { AUTHORITY_RANK, type SourceCard, type CitationBlock } from "./types"

export type { SourceCard }

/**
 * Orders citations according to the frozen authority hierarchy.
 * Tie-breaker sequence:
 * 1. Authority rank: LAW > REGULATION > GUIDANCE > PRACTICE
 * 2. Effective date: newer first
 * 3. Confidence: higher first
 * 4. Source ID: alphabetical (stable tiebreaker)
 *
 * CRITICAL: Frontend MUST NOT reorder. This is the authoritative order.
 */
export function orderCitations(sources: SourceCard[]): SourceCard[] {
  return [...sources].sort((a, b) => {
    // 1. Authority rank
    const rankA = AUTHORITY_RANK[a.authority] ?? 999
    const rankB = AUTHORITY_RANK[b.authority] ?? 999
    if (rankA !== rankB) return rankA - rankB

    // 2. Effective date (newer first)
    const dateA = new Date(a.effectiveFrom).getTime()
    const dateB = new Date(b.effectiveFrom).getTime()
    if (dateA !== dateB) return dateB - dateA

    // 3. Confidence (higher first)
    if (a.confidence !== b.confidence) return b.confidence - a.confidence

    // 4. ID (alphabetical, stable)
    return a.id.localeCompare(b.id)
  })
}

/**
 * Builds a CitationBlock with primary and supporting sources.
 * Primary is always the first (highest authority) source.
 */
export function buildCitationBlock(sources: SourceCard[]): CitationBlock | null {
  if (sources.length === 0) return null

  const ordered = orderCitations(sources)
  return {
    primary: ordered[0],
    supporting: ordered.slice(1),
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/__tests__/citations.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/citations.ts src/lib/assistant/__tests__/citations.test.ts
git commit -m "feat(assistant): add citation ordering utility"
```

---

### Task 13: Create Module Index

**Files:**

- Create: `src/lib/assistant/index.ts`

**Step 1: Create the index file**

```typescript
// src/lib/assistant/index.ts

// Types
export * from "./types"

// Analytics
export * from "./analytics"

// Validation
export * from "./validation"

// Citations
export * from "./citations"

// Hooks
export { useAssistantController } from "./hooks/useAssistantController"
```

**Step 2: Commit**

```bash
git add src/lib/assistant/index.ts
git commit -m "feat(assistant): add module index"
```

---

### Task 14: Connect Controller to API

**Files:**

- Modify: `src/lib/assistant/hooks/useAssistantController.ts`
- Test: `src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to useAssistantController.test.ts
import { vi } from "vitest"

// Mock fetch
global.fetch = vi.fn()

describe("API integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("calls API on submit and transitions through states", async () => {
    const mockResponse = {
      schemaVersion: "1.0.0",
      requestId: "req_1",
      traceId: "trace_1",
      kind: "ANSWER",
      topic: "REGULATORY",
      surface: "MARKETING",
      createdAt: new Date().toISOString(),
      headline: "VAT is 25%",
      directAnswer: "Standard rate.",
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    await act(async () => {
      await result.current.submit("What is VAT?")
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/assistant/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "What is VAT?", surface: "MARKETING" }),
      })
    )

    expect(result.current.state.status).toBe("COMPLETE")
    expect(result.current.state.activeAnswer?.headline).toBe("VAT is 25%")
  })

  it("handles API errors gracefully", async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useAssistantController({ surface: "MARKETING" }))

    await act(async () => {
      await result.current.submit("test")
    })

    expect(result.current.state.status).toBe("ERROR")
    expect(result.current.state.error?.type).toBe("NETWORK_FAILURE")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// Update submit function in useAssistantController.ts
const submit = useCallback(
  async (query: string) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const requestId = nanoid()
    abortControllerRef.current = new AbortController()

    dispatch({ type: "SUBMIT", query, requestId })

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, surface }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const status = response.status
        let errorType: ErrorType = "SERVER_ERROR"

        if (status >= 400 && status < 500) errorType = "CLIENT_ERROR"
        if (status === 429) errorType = "RATE_LIMITED"

        throw { type: errorType, message: `HTTP ${status}`, httpStatus: status }
      }

      const data = (await response.json()) as AssistantResponse
      dispatch({ type: "COMPLETE", response: data })
    } catch (error: any) {
      if (error.name === "AbortError") {
        // Request was cancelled, don't dispatch error
        return
      }

      const assistantError: AssistantError = error.type
        ? error
        : {
            type: "NETWORK_FAILURE" as ErrorType,
            message: error.message || "Network request failed",
          }

      dispatch({ type: "ERROR", error: assistantError })
    }
  },
  [surface]
)
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useAssistantController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useAssistantController.ts src/lib/assistant/hooks/__tests__/useAssistantController.test.ts
git commit -m "feat(assistant): connect controller to API"
```

---

## Phase 4: Core UI Components

### Task 15: Create AssistantContainer Component

**Files:**

- Create: `src/components/assistant-v2/AssistantContainer.tsx`
- Create: `src/components/assistant-v2/index.ts`
- Test: `src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AssistantContainer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssistantContainer } from '../AssistantContainer'

describe('AssistantContainer', () => {
  it('renders with MARKETING surface (2-column layout)', () => {
    render(<AssistantContainer surface="MARKETING" />)

    expect(screen.getByRole('region', { name: /regulatory assistant/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/ask about/i)).toBeInTheDocument()
  })

  it('renders with APP surface (3-column layout)', () => {
    render(<AssistantContainer surface="APP" />)

    expect(screen.getByText(/your data/i)).toBeInTheDocument()
  })

  it('renders skip links for accessibility', () => {
    render(<AssistantContainer surface="MARKETING" />)

    expect(screen.getByText(/skip to answer/i)).toBeInTheDocument()
    expect(screen.getByText(/skip to sources/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```tsx
// src/components/assistant-v2/AssistantContainer.tsx
"use client"

import { useAssistantController, type Surface } from "@/lib/assistant"
import { AssistantInput } from "./AssistantInput"
import { AnswerSection } from "./AnswerSection"
import { EvidencePanel } from "./EvidencePanel"
import { ClientDataPanel } from "./ClientDataPanel"
import { HistoryBar } from "./HistoryBar"
import { SkipLinks } from "./SkipLinks"
import { cn } from "@/lib/utils"

interface AssistantContainerProps {
  surface: Surface
  className?: string
}

export function AssistantContainer({ surface, className }: AssistantContainerProps) {
  const { state, submit } = useAssistantController({ surface })

  const isApp = surface === "APP"

  return (
    <section
      role="region"
      aria-label="Regulatory assistant"
      className={cn("flex flex-col gap-4", className)}
    >
      <SkipLinks />

      {/* History Bar */}
      {state.history.length > 0 && <HistoryBar history={state.history} />}

      {/* Input Section */}
      <div id="assistant-input">
        <AssistantInput
          surface={surface}
          onSubmit={submit}
          disabled={state.status === "LOADING" || state.status === "STREAMING"}
        />
      </div>

      {/* Main Content Grid */}
      <div className={cn("grid gap-6", isApp ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {/* Answer Column */}
        <div id="assistant-answer" className="lg:col-span-1">
          <AnswerSection state={state} surface={surface} />
        </div>

        {/* Evidence Column */}
        <div id="assistant-sources" className="lg:col-span-1">
          <EvidencePanel citations={state.activeAnswer?.citations} status={state.status} />
        </div>

        {/* Client Data Column (APP only) */}
        {isApp && (
          <div className="lg:col-span-1">
            <ClientDataPanel
              clientContext={state.activeAnswer?.clientContext}
              status={state.status}
            />
          </div>
        )}
      </div>
    </section>
  )
}
```

```tsx
// src/components/assistant-v2/SkipLinks.tsx
export function SkipLinks() {
  return (
    <nav className="sr-only focus-within:not-sr-only" aria-label="Skip navigation">
      <a
        href="#assistant-answer"
        className="absolute top-2 left-2 z-50 bg-white px-4 py-2 rounded shadow focus:outline-none focus:ring-2"
      >
        Skip to answer
      </a>
      <a
        href="#assistant-sources"
        className="absolute top-2 left-32 z-50 bg-white px-4 py-2 rounded shadow focus:outline-none focus:ring-2"
      >
        Skip to sources
      </a>
      <a
        href="#assistant-input"
        className="absolute top-2 left-64 z-50 bg-white px-4 py-2 rounded shadow focus:outline-none focus:ring-2"
      >
        Skip to input
      </a>
    </nav>
  )
}
```

```tsx
// src/components/assistant-v2/index.ts
export { AssistantContainer } from "./AssistantContainer"
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/
git commit -m "feat(assistant): add AssistantContainer component"
```

---

_[Continuing with remaining tasks...]_

---

## Phase 4 Continued: Tasks 16-22

### Task 16: Create AssistantInput Component

**Files:**

- Create: `src/components/assistant-v2/AssistantInput.tsx`
- Test: `src/components/assistant-v2/__tests__/AssistantInput.test.tsx`

_(Follow same TDD pattern: test → fail → implement → pass → commit)_

Key implementation points:

- Textarea with Enter=submit, Shift+Enter=newline
- Placeholder text by surface
- Send button with disabled state
- aria-describedby for keyboard hints

---

### Task 17: Create SuggestionChips Component

**Files:**

- Create: `src/components/assistant-v2/SuggestionChips.tsx`
- Test: `src/components/assistant-v2/__tests__/SuggestionChips.test.tsx`

Key implementation points:

- Fill-only behavior (never auto-submit)
- Roving tabindex (arrow key navigation)
- role="listbox" with role="option" children
- 32-char truncation with ellipsis

---

### Task 18: Create HistoryBar Component

**Files:**

- Create: `src/components/assistant-v2/HistoryBar.tsx`
- Test: `src/components/assistant-v2/__tests__/HistoryBar.test.tsx`

Key implementation points:

- Collapsed "Previous questions (N)" toggle
- Expandable list
- Click to restore
- Clear all button

---

### Task 19: Create AnswerSection Component

**Files:**

- Create: `src/components/assistant-v2/AnswerSection.tsx`
- Test: `src/components/assistant-v2/__tests__/AnswerSection.test.tsx`

Key implementation points:

- Renders AnswerCard, RefusalCard, or empty state based on status
- ConflictBanner slot
- Loading skeleton
- Focus management (headline receives focus after complete)

---

### Task 20: Create Empty State Components

**Files:**

- Create: `src/components/assistant-v2/EmptyState.tsx`
- Test: `src/components/assistant-v2/__tests__/EmptyState.test.tsx`

Key implementation points:

- Surface-specific placeholder copy
- "Verified answer will appear here"
- Sources placeholder

---

### Task 21: Create Loading Skeleton

**Files:**

- Create: `src/components/assistant-v2/AnswerSkeleton.tsx`
- Test: `src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx`

Key implementation points:

- Headline skeleton
- DirectAnswer skeleton (2-3 lines)
- Button placeholders
- Respects prefers-reduced-motion

---

### Task 22: Create Screen Reader Announcer

**Files:**

- Create: `src/components/assistant-v2/Announcer.tsx`
- Test: `src/components/assistant-v2/__tests__/Announcer.test.tsx`

Key implementation points:

- Hidden live region (aria-live="polite")
- Milestone announcements only
- Not character-by-character

---

## Phase 5: Answer Components (Tasks 23-30)

### Task 23: Create AnswerCard Component

### Task 24: Create ConfidenceBadge Component

### Task 25: Create ActionButtons Component

### Task 26: Create WhyDrawer Component

### Task 27: Create RelatedQuestions Component

### Task 28: Create RefusalCard Component

### Task 29: Create ConflictBanner Component

### Task 30: Create ErrorCard Component

_(Each follows TDD pattern)_

---

## Phase 6: Evidence & Client Data Panels (Tasks 31-36)

### Task 31: Create EvidencePanel Component

### Task 32: Create SourceCard Component

### Task 33: Create AuthorityBadge Component

### Task 34: Create SupportingSources Component

### Task 35: Create ClientDataPanel Component

### Task 36: Create DataPointList Component

---

## Phase 7: Accessibility (Tasks 37-41)

### Task 37: Add Focus Management Hook

### Task 38: Implement Roving Tabindex for Chips

### Task 39: Add Reduced Motion Support

### Task 40: Add Color Contrast Validation Tests

### Task 41: Add axe-core Accessibility Tests

---

## Phase 8: Marketing CTA System (Tasks 42-46)

### Task 42: Create CTABlock Component

### Task 43: Create useCTAEligibility Hook

### Task 44: Add CTA Dismissal Logic

### Task 45: Create PersonalizationPanel Component

### Task 46: Add CTA Analytics Events

---

## Phase 9: Analytics & Quality Gates (Tasks 47-52)

### Task 47: Create useAssistantAnalytics Hook

### Task 48: Add Analytics Event Firing

### Task 49: Create Quality Gate Tests

### Task 50: Add E2E Tests for Fill-Only Behavior

### Task 51: Add E2E Tests for Focus Management

### Task 52: Add CI Quality Gate Configuration

---

## Final Verification

After all tasks complete:

1. Run full test suite: `npm test`
2. Run E2E tests: `npx playwright test`
3. Run accessibility audit: `npx axe`
4. Run Lighthouse: `npx lighthouse`
5. Manual testing on mobile devices
6. Screen reader testing (VoiceOver, NVDA)

---

## Rollout Checklist

- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Accessibility audit clean
- [ ] Feature flag created
- [ ] Internal testing complete
- [ ] Marketing assistant deployed (feature flag)
- [ ] APP assistant deployed to pilot (10%)
- [ ] Monitoring dashboards ready
- [ ] Rollback procedure documented
