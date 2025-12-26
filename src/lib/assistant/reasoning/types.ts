// src/lib/assistant/reasoning/types.ts

// === SCHEMA VERSION ===
export const SCHEMA_VERSION = 1 as const

// === REASONING STAGES ===
export const REASONING_STAGES = [
  "CONTEXT_RESOLUTION",
  "SOURCES",
  "RETRIEVAL",
  "APPLICABILITY",
  "CONFLICTS",
  "ANALYSIS",
  "CONFIDENCE",
] as const

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

export type RiskTier = "T0" | "T1" | "T2" | "T3"

// === BASE EVENT ===
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

// === USER CONTEXT SNAPSHOT ===
export interface UserContextSnapshot {
  vatStatus?: "registered" | "unregistered" | "unknown"
  turnoverBand?: string
  companySize?: "micro" | "small" | "medium" | "large"
  jurisdiction?: string
  assumedDefaults: string[]
}

// === STAGE PAYLOADS ===

export interface ContextResolutionPayload {
  summary: string
  jurisdiction: "HR" | "EU" | "UNKNOWN"
  domain: "TAX" | "LABOR" | "COMPANY" | "FINANCE" | "OTHER"
  riskTier: RiskTier
  language: "hr" | "en"
  intent: "QUESTION" | "HOWTO" | "CHECKLIST" | "UNKNOWN"
  asOfDate: string
  entities: Array<{ type: string; value: string; confidence: number }>
  confidence: number
  requiresClarification: boolean
  userContextSnapshot: UserContextSnapshot
}

export interface ClarificationPayload {
  question: string
  options?: Array<{ label: string; value: string }>
  freeformAllowed: boolean
}

export interface SourceSummary {
  id: string
  name: string
  authority: "LAW" | "REGULATION" | "GUIDANCE" | "PRACTICE"
  url?: string
}

export interface SourcesPayload {
  summary: string
  sources: SourceSummary[]
}

export interface RetrievalPayload {
  summary: string
  concepts: string[]
  candidateCount: number
}

export type ExclusionCode =
  | "THRESHOLD_EXCEEDED"
  | "DATE_MISMATCH"
  | "JURISDICTION_MISMATCH"
  | "MISSING_CONTEXT"
  | "CONDITION_FALSE"

export interface RuleExclusion {
  ruleId: string
  ruleTitle: string
  code: ExclusionCode
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

export interface ConflictsPayload {
  summary: string
  conflictCount: number
  resolved: number
  unresolved: number
  canProceedWithWarning: boolean
}

export interface AnalysisPayload {
  summary: string
  bullets: string[]
  comparedSources?: string[]
}

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

export interface Citation {
  id: string
  title: string
  authority: "LAW" | "REGULATION" | "GUIDANCE" | "PRACTICE"
  quote: string
  url: string
  evidenceId: string
  fetchedAt: string
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

export interface RefusalPayload {
  reason:
    | "NO_CITABLE_RULES"
    | "OUT_OF_SCOPE"
    | "MISSING_CLIENT_DATA"
    | "UNRESOLVED_CONFLICT"
    | "NEEDS_CLARIFICATION"
    | "UNSUPPORTED_JURISDICTION"
    | "UNSUPPORTED_DOMAIN"
  message: string
  relatedTopics?: string[]
  requiredFields?: string[]
}

export interface ErrorPayload {
  code: "INTERNAL" | "VALIDATION_FAILED" | "CAPACITY" | "TIMEOUT"
  message: string
  correlationId: string
  retriable: boolean
}

// === DISCRIMINATED UNION EVENT ===
export type StagePayload =
  | ContextResolutionPayload
  | ClarificationPayload
  | SourcesPayload
  | RetrievalPayload
  | ApplicabilityPayload
  | ConflictsPayload
  | AnalysisPayload
  | ConfidencePayload
  | FinalAnswerPayload
  | QualifiedAnswerPayload
  | RefusalPayload
  | ErrorPayload

export interface ReasoningEvent extends BaseReasoningEvent {
  data?: StagePayload
}

// === TERMINAL PAYLOAD ===
export type TerminalPayload =
  | ({ outcome: "ANSWER" } & FinalAnswerPayload)
  | ({ outcome: "QUALIFIED_ANSWER" } & QualifiedAnswerPayload)
  | ({ outcome: "REFUSAL" } & RefusalPayload)
  | ({ outcome: "ERROR" } & ErrorPayload)

// === UTILITY FUNCTIONS ===
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

export function isNonTerminalStage(stage: ReasoningStage): boolean {
  return REASONING_STAGES.includes(stage as (typeof REASONING_STAGES)[number])
}
