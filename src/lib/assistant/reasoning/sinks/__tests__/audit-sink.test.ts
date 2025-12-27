// src/lib/assistant/reasoning/sinks/__tests__/audit-sink.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAuditSink } from "../audit-sink"
import type { ReasoningEvent, UserContextSnapshot } from "../../types"
import { REASONING_EVENT_VERSION } from "../../types"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    reasoningTrace: {
      create: vi.fn().mockResolvedValue({ id: "trace_123" }),
    },
  },
}))

describe("AuditSink", () => {
  const mockUserContext: UserContextSnapshot = {
    vatStatus: "registered",
    assumedDefaults: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("mode", () => {
    it("is buffered mode", () => {
      const sink = createAuditSink("req_test", mockUserContext)
      expect(sink.mode).toBe("buffered")
    })
  })

  describe("write", () => {
    it("buffers events without writing to DB", async () => {
      const sink = createAuditSink("req_test", mockUserContext)
      const event: ReasoningEvent = {
        v: REASONING_EVENT_VERSION,
        id: "req_test_001",
        requestId: "req_test",
        seq: 1,
        ts: new Date().toISOString(),
        stage: "SOURCES",
        status: "started",
      }

      sink.write(event)

      // Should not have written to DB yet
      const { prisma } = await import("@/lib/prisma")
      expect(prisma.reasoningTrace.create).not.toHaveBeenCalled()
    })
  })

  describe("flush", () => {
    it("writes all buffered events to database", async () => {
      const sink = createAuditSink("req_test", mockUserContext)

      // Buffer some events
      sink.write({
        v: REASONING_EVENT_VERSION,
        id: "req_test_000",
        requestId: "req_test",
        seq: 0,
        ts: new Date().toISOString(),
        stage: "CONTEXT_RESOLUTION",
        status: "complete",
        data: {
          summary: "HR · TAX · T1",
          jurisdiction: "HR",
          domain: "TAX",
          riskTier: "T1",
          language: "hr",
          intent: "QUESTION",
          asOfDate: "2025-12-26",
          entities: [],
          confidence: 0.95,
          requiresClarification: false,
          userContextSnapshot: mockUserContext,
        },
      } as ReasoningEvent)

      sink.write({
        v: REASONING_EVENT_VERSION,
        id: "req_test_001",
        requestId: "req_test",
        seq: 1,
        ts: new Date().toISOString(),
        stage: "ANSWER",
        status: "complete",
      } as ReasoningEvent)

      await sink.flush?.()

      const { prisma } = await import("@/lib/prisma")
      expect(prisma.reasoningTrace.create).toHaveBeenCalledTimes(1)
      expect(prisma.reasoningTrace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: "req_test",
            outcome: "ANSWER",
          }),
        })
      )
    })
  })
})
