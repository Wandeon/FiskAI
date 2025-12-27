// src/lib/assistant/reasoning/types.ts

/**
 * Schema version for reasoning events
 */
export const REASONING_EVENT_VERSION = 1

/**
 * All possible reasoning stages
 */
export type ReasoningStage =
  | "QUESTION_INTAKE"
  | "CONTEXT_RESOLUTION"
  | "CLARIFICATION"
  | "SOURCES"
  | "RETRIEVAL"
  | "APPLICABILITY"
  | "ANALYSIS"
  | "CONFIDENCE"
  | "ANSWER"
  | "CONDITIONAL_ANSWER"
  | "REFUSAL"
  | "ERROR"

/**
 * Array of all reasoning stages in order
 */
export const REASONING_STAGES: ReasoningStage[] = [
  "QUESTION_INTAKE",
  "CONTEXT_RESOLUTION",
  "CLARIFICATION",
  "SOURCES",
  "RETRIEVAL",
  "APPLICABILITY",
  "ANALYSIS",
  "CONFIDENCE",
  "ANSWER",
  "CONDITIONAL_ANSWER",
  "REFUSAL",
  "ERROR",
]

/**
 * Risk tier classification
 */
export type RiskTier = "T1" | "T2" | "T3"

/**
 * Event status
 */
export type EventStatus = "started" | "progress" | "checkpoint" | "complete" | "awaiting_input"

/**
 * Severity level for events
 */
export type EventSeverity = "info" | "warning" | "critical"

/**
 * Progress tracking
 */
export interface EventProgress {
  current: number
  total?: number
}

/**
 * Stage-specific payload types
 */
export interface QuestionIntakePayload {
  normalizedQuery: string
  detectedLanguage: string
  entities: {
    subjects: string[]
    products: string[]
    locations: string[]
    dates: string[]
  }
}

export interface ContextResolutionPayload {
  domain: string
  jurisdiction: string
  riskTier: string
  userContext?: Record<string, unknown>
  confidence: number
}

export interface ClarificationPayload {
  question: string
  questionHr: string
  options?: string[]
  dimensionNeeded: string
}

export interface SourcePayload {
  sourceId: string
  sourceName: string
  sourceType: string
  url?: string
}

export interface RetrievalPayload {
  intent: string
  conceptsMatched: string[]
  rulesRetrieved: number
}

export interface ApplicabilityPayload {
  eligibleRules: number
  excludedRules: number
  exclusionReasons: string[]
  coverageResult: {
    requiredScore: number
    totalScore: number
    terminalOutcome: string
  }
}

export interface AnalysisPayload {
  checkpoint?: string
  conflictsDetected: number
  riskAssessment?: string
}

export interface ConfidencePayload {
  overallConfidence: number
  sourceConfidence: number
  ruleConfidence: number
  coverageConfidence: number
}

export interface AnswerPayload {
  answer: string
  answerHr: string
  citations: Array<{
    ruleId: string
    ruleName: string
    sourceUrl?: string
  }>
  value?: string
  valueType?: string
}

export interface ConditionalAnswerPayload {
  branches: Array<{
    condition: string
    conditionHr: string
    answer: string
    answerHr: string
    probability?: number
  }>
  commonParts?: string
}

export interface RefusalPayload {
  code: string
  messageHr: string
  messageEn: string
  nextSteps: Array<{
    type: string
    prompt?: string
    promptHr?: string
  }>
  context?: {
    missingDimensions?: string[]
    conflictingRules?: string[]
  }
}

export interface ErrorPayload {
  correlationId: string
  message: string
  retryable: boolean
}

/**
 * Union of all payload types
 */
export type StagePayload =
  | QuestionIntakePayload
  | ContextResolutionPayload
  | ClarificationPayload
  | SourcePayload
  | RetrievalPayload
  | ApplicabilityPayload
  | AnalysisPayload
  | ConfidencePayload
  | AnswerPayload
  | ConditionalAnswerPayload
  | RefusalPayload
  | ErrorPayload

/**
 * Core reasoning event structure
 */
export interface ReasoningEvent {
  v: typeof REASONING_EVENT_VERSION
  id: string
  requestId: string
  seq: number
  ts: string
  stage: ReasoningStage
  status: EventStatus
  message?: string
  severity?: EventSeverity
  progress?: EventProgress
  data?: StagePayload
}

/**
 * Terminal payloads (final outcomes)
 */
export type TerminalPayload =
  | AnswerPayload
  | ConditionalAnswerPayload
  | RefusalPayload
  | ErrorPayload

/**
 * User context for pipeline
 */
export interface UserContext {
  userId?: string
  companyId?: string
  isVatPayer?: boolean
  legalForm?: string
  jurisdiction?: string
}

/**
 * User context snapshot for audit logging
 */
export interface UserContextSnapshot {
  assumedDefaults: string[]
  resolvedContext?: UserContext
}

/**
 * Terminal outcome type
 */
export type TerminalOutcome = "ANSWER" | "CONDITIONAL_ANSWER" | "REFUSAL" | "ERROR"

/**
 * Check if an event is terminal
 */
export function isTerminal(event: ReasoningEvent): boolean {
  return ["ANSWER", "CONDITIONAL_ANSWER", "REFUSAL", "ERROR"].includes(event.stage)
}

/**
 * Get terminal outcome from event
 */
export function getTerminalOutcome(event: ReasoningEvent): TerminalOutcome | null {
  if (isTerminal(event)) {
    return event.stage as TerminalOutcome
  }
  return null
}

/**
 * Conflicts payload for analysis stage
 */
export interface ConflictsPayload {
  conflictId: string
  ruleIds: string[]
  resolution?: string
}

/**
 * Helper to create event ID
 */
export function createEventId(requestId: string, seq: number): string {
  return `${requestId}_${String(seq).padStart(3, "0")}`
}
