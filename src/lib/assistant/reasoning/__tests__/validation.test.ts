// src/lib/assistant/reasoning/__tests__/validation.test.ts
import { describe, it, expect } from "vitest"
import { ReasoningEventSchema, validateReasoningEvent, TerminalPayloadSchema } from "../validation"

describe("Reasoning Validation", () => {
  describe("ReasoningEventSchema", () => {
    it("validates a valid reasoning event", () => {
      const event = {
        v: 1,
        id: "req_abc_001",
        requestId: "req_abc",
        seq: 1,
        ts: "2025-12-26T10:00:00Z",
        stage: "SOURCES",
        status: "started",
        message: "Searching sources...",
      }

      const result = ReasoningEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("rejects invalid schema version", () => {
      const event = {
        v: 2, // Invalid
        id: "req_abc_001",
        requestId: "req_abc",
        seq: 1,
        ts: "2025-12-26T10:00:00Z",
        stage: "SOURCES",
        status: "started",
      }

      const result = ReasoningEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it("rejects invalid stage", () => {
      const event = {
        v: 1,
        id: "req_abc_001",
        requestId: "req_abc",
        seq: 1,
        ts: "2025-12-26T10:00:00Z",
        stage: "INVALID_STAGE",
        status: "started",
      }

      const result = ReasoningEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })

  describe("validateReasoningEvent", () => {
    it("returns valid result for correct event", () => {
      const event = {
        v: 1,
        id: "req_abc_001",
        requestId: "req_abc",
        seq: 1,
        ts: "2025-12-26T10:00:00Z",
        stage: "CONTEXT_RESOLUTION",
        status: "complete",
      }

      const result = validateReasoningEvent(event)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("returns errors for invalid event", () => {
      const event = {
        v: 1,
        // missing required fields
      }

      const result = validateReasoningEvent(event as any)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
