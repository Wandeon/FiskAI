// src/lib/assistant/reasoning/client/types.ts
import type { ReasoningEvent, ReasoningStage, TerminalOutcome, RiskTier } from "../types"

// === STREAM STATE ===
export type StreamState = "idle" | "connecting" | "streaming" | "awaiting_input" | "ended" | "error"

// === SELECTORS ===
export interface ReasoningSelectors {
  byStage: Partial<Record<ReasoningStage, ReasoningEvent[]>>
  latestByStage: Partial<Record<ReasoningStage, ReasoningEvent>>
  terminal?: ReasoningEvent
  terminalOutcome?: TerminalOutcome
}

// === HOOK STATE ===
export interface ReasoningStreamState {
  requestId: string | null
  events: ReasoningEvent[]
  streamState: StreamState
  error: Error | null
  riskTier: RiskTier | null
}

// === HOOK ACTIONS ===
export interface ReasoningStreamActions {
  submit: (query: string) => void
  cancel: () => void
  reset: () => void
  answerClarification: (answer: string) => void
}

// === HOOK RETURN ===
export interface UseReasoningStreamReturn extends ReasoningStreamState {
  actions: ReasoningStreamActions
  selectors: ReasoningSelectors
}

// === SSE EVENT TYPES ===
export const SSE_EVENT_TYPES = {
  REASONING: "reasoning",
  TERMINAL: "terminal",
  HEARTBEAT: "heartbeat",
} as const

export type SSEEventType = (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES]
