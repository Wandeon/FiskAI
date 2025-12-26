// src/lib/assistant/reasoning/sinks/__tests__/types.test.ts
import { describe, it, expect, vi } from "vitest"
import type { ReasoningSink, SinkMode } from "../types"
import type { ReasoningEvent } from "../../types"

describe("ReasoningSink interface", () => {
  it("defines correct sink modes", () => {
    const modes: SinkMode[] = ["nonBlocking", "buffered", "criticalAwait"]
    expect(modes).toHaveLength(3)
  })

  it("allows creating a mock sink", () => {
    const mockSink: ReasoningSink = {
      mode: "nonBlocking",
      write: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
    }

    expect(mockSink.mode).toBe("nonBlocking")
    expect(typeof mockSink.write).toBe("function")
    expect(typeof mockSink.flush).toBe("function")
  })
})
