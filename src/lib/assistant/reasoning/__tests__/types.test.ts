// src/lib/assistant/reasoning/__tests__/types.test.ts
import { describe, it, expect } from "vitest"
import {
  REASONING_EVENT_VERSION,
  REASONING_STAGES,
  isTerminal,
  getTerminalOutcome,
  type ReasoningEvent,
  type ReasoningStage,
  type TerminalOutcome,
} from "../types"

describe("Reasoning Types", () => {
  describe("REASONING_EVENT_VERSION", () => {
    it("should be 1", () => {
      expect(REASONING_EVENT_VERSION).toBe(1)
    })
  })

  describe("REASONING_STAGES", () => {
    it("should contain all reasoning stages in order", () => {
      expect(REASONING_STAGES).toEqual([
        "QUESTION_INTAKE",
        "CONTEXT_RESOLUTION",
        "CLARIFICATION",
        "SOURCES",
        "RETRIEVAL",
        "APPLICABILITY",
        "CONFLICTS",
        "ANALYSIS",
        "CONFIDENCE",
        "ANSWER",
        "CONDITIONAL_ANSWER",
        "REFUSAL",
        "ERROR",
      ])
    })
  })

  describe("isTerminal", () => {
    it("returns true for ANSWER stage", () => {
      const event = { stage: "ANSWER" } as ReasoningEvent
      expect(isTerminal(event)).toBe(true)
    })

    it("returns true for CONDITIONAL_ANSWER stage", () => {
      const event = { stage: "CONDITIONAL_ANSWER" } as ReasoningEvent
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

  describe("isTerminal helper", () => {
    it("returns true for terminal stages", () => {
      expect(isTerminal({ stage: "ANSWER" } as ReasoningEvent)).toBe(true)
      expect(isTerminal({ stage: "ERROR" } as ReasoningEvent)).toBe(true)
    })

    it("returns false for non-terminal stages", () => {
      expect(isTerminal({ stage: "SOURCES" } as ReasoningEvent)).toBe(false)
      expect(isTerminal({ stage: "CONTEXT_RESOLUTION" } as ReasoningEvent)).toBe(false)
      expect(isTerminal({ stage: "ANALYSIS" } as ReasoningEvent)).toBe(false)
    })
  })
})
