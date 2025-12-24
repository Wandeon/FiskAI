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
