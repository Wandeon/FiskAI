import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCTAEligibility } from "../useCTAEligibility"
import type { AssistantResponse, Surface } from "../../types"
import { SCHEMA_VERSION } from "../../types"

const mockRegulatoryAnswer: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: "req_1",
  traceId: "trace_1",
  kind: "ANSWER",
  topic: "REGULATORY",
  surface: "MARKETING",
  createdAt: new Date().toISOString(),
  headline: "VAT is 25%",
  directAnswer: "Standard rate.",
  citations: {
    primary: {
      id: "src_1",
      title: "Law",
      authority: "LAW",
      url: "https://example.com",
      effectiveFrom: "2024-01-01",
      confidence: 0.95,
    },
    supporting: [],
  },
}

const mockPersonalizationAnswer: AssistantResponse = {
  ...mockRegulatoryAnswer,
  headline: "Your VAT threshold status",
  // Personalization intent detected in query
}

describe("useCTAEligibility", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns not eligible on first answer (non-personalization)", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "What is VAT rate?")
    })

    expect(result.current.isEligible).toBe(false)
    expect(result.current.eligibilityReason).toBe("first_query")
  })

  it("returns eligible after 2+ successful REGULATORY answers", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "What is VAT rate?")
      result.current.recordAnswer(mockRegulatoryAnswer, "When is deadline?")
    })

    expect(result.current.isEligible).toBe(true)
    expect(result.current.ctaType).toBe("contextual")
  })

  it("returns eligible on first personalization query", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockPersonalizationAnswer, "my VAT threshold")
    })

    expect(result.current.isEligible).toBe(true)
    expect(result.current.ctaType).toBe("personalization")
  })

  it("detects personalization intent in query", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    const intents = [
      "my revenue",
      "my business",
      "calculate for me",
      "my threshold",
      "for my company",
    ]

    intents.forEach((query) => {
      expect(result.current.hasPersonalizationIntent(query)).toBe(true)
    })
  })

  it("returns not eligible for APP surface (always has client data)", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "APP" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "test")
      result.current.recordAnswer(mockRegulatoryAnswer, "test2")
    })

    expect(result.current.isEligible).toBe(false)
  })

  it("returns not eligible for REFUSAL answers", () => {
    const refusalAnswer: AssistantResponse = {
      ...mockRegulatoryAnswer,
      kind: "REFUSAL",
      refusalReason: "OUT_OF_SCOPE",
    }

    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(refusalAnswer, "test")
      result.current.recordAnswer(refusalAnswer, "test2")
    })

    expect(result.current.isEligible).toBe(false)
  })

  it("tracks successful query count", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "q1")
      result.current.recordAnswer(mockRegulatoryAnswer, "q2")
      result.current.recordAnswer(mockRegulatoryAnswer, "q3")
    })

    expect(result.current.successfulQueryCount).toBe(3)
  })
})
