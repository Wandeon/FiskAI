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
