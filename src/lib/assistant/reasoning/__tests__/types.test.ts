// src/lib/assistant/reasoning/__tests__/types.test.ts
import { describe, it, expect } from "vitest"
import {
  SCHEMA_VERSION,
  REASONING_STAGES,
  isTerminal,
  getTerminalOutcome,
  type ReasoningEvent,
  type ReasoningStage,
  type TerminalOutcome,
} from "../types"

describe("Reasoning Types", () => {
  describe("SCHEMA_VERSION", () => {
    it("should be 1", () => {
      expect(SCHEMA_VERSION).toBe(1)
    })
  })

  describe("REASONING_STAGES", () => {
    it("should contain all 7 reasoning stages in order", () => {
      expect(REASONING_STAGES).toEqual([
        "CONTEXT_RESOLUTION",
        "SOURCES",
        "RETRIEVAL",
        "APPLICABILITY",
        "CONFLICTS",
        "ANALYSIS",
        "CONFIDENCE",
      ])
    })
  })

  describe("isTerminal", () => {
    it("returns true for ANSWER stage", () => {
      const event = { stage: "ANSWER" } as ReasoningEvent
      expect(isTerminal(event)).toBe(true)
    })

    it("returns true for QUALIFIED_ANSWER stage", () => {
      const event = { stage: "QUALIFIED_ANSWER" } as ReasoningEvent
      expect(isTerminal(event)).toBe(true)
    })

    it("returns true for REFUSAL stage", () => {
      const event = { stage: "REFUSAL" } as ReasoningEvent
      expect(isTerminal(event)).toBe(true)
    })

    it("returns true for ERROR stage", () => {
      const event = { stage: "ERROR" } as ReasoningEvent
      expect(isTerminal(event)).toBe(true)
    })

    it("returns false for non-terminal stages", () => {
      const event = { stage: "SOURCES" } as ReasoningEvent
      expect(isTerminal(event)).toBe(false)
    })
  })

  describe("getTerminalOutcome", () => {
    it("returns ANSWER for ANSWER stage", () => {
      const event = { stage: "ANSWER" } as ReasoningEvent
      expect(getTerminalOutcome(event)).toBe("ANSWER")
    })

    it("returns null for non-terminal stages", () => {
      const event = { stage: "ANALYSIS" } as ReasoningEvent
      expect(getTerminalOutcome(event)).toBeNull()
    })
  })
})
