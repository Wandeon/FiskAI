// src/lib/regulatory-truth/watchdog/__tests__/llm-circuit-breaker.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest"

// In-memory store for Redis mock
const mockRedisStore = new Map<string, string>()

// Mock Redis with stateful behavior
vi.mock("@/lib/regulatory-truth/workers/redis", () => ({
  redis: {
    get: vi.fn((key: string) => Promise.resolve(mockRedisStore.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      mockRedisStore.set(key, value)
      return Promise.resolve("OK")
    }),
    del: vi.fn((key: string) => {
      mockRedisStore.delete(key)
      return Promise.resolve(1)
    }),
  },
}))

import { LLMCircuitBreaker, type LLMProvider, type CircuitState } from "../llm-circuit-breaker"

describe("LLMCircuitBreaker", () => {
  let breaker: LLMCircuitBreaker

  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisStore.clear()
    breaker = new LLMCircuitBreaker()
  })

  describe("state transitions", () => {
    it("starts CLOSED", async () => {
      const state = await breaker.getState("ollama")
      expect(state.state).toBe("CLOSED")
    })

    it("opens after consecutive failures threshold", async () => {
      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }
      const state = await breaker.getState("ollama")
      expect(state.state).toBe("OPEN")
    })

    it("resets on success when CLOSED", async () => {
      await breaker.recordFailure("ollama", "timeout")
      await breaker.recordSuccess("ollama")
      const state = await breaker.getState("ollama")
      expect(state.consecutiveFailures).toBe(0)
    })

    it("canCall returns false when OPEN", async () => {
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }
      expect(await breaker.canCall("ollama")).toBe(false)
    })

    it("canCall returns true when CLOSED", async () => {
      expect(await breaker.canCall("ollama")).toBe(true)
    })

    it("canCall returns true when HALF_OPEN (probe allowed)", async () => {
      // First open the circuit
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      // Manually force HALF_OPEN state for testing
      const key = "llm-circuit:ollama"
      const data = mockRedisStore.get(key)
      if (data) {
        const state = JSON.parse(data)
        state.state = "HALF_OPEN"
        mockRedisStore.set(key, JSON.stringify(state))
      }

      expect(await breaker.canCall("ollama")).toBe(true)
    })

    it("transitions to CLOSED on success when HALF_OPEN", async () => {
      // First open the circuit
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      // Manually force HALF_OPEN state
      const key = "llm-circuit:ollama"
      const data = mockRedisStore.get(key)
      if (data) {
        const state = JSON.parse(data)
        state.state = "HALF_OPEN"
        mockRedisStore.set(key, JSON.stringify(state))
      }

      // Success should close the circuit
      await breaker.recordSuccess("ollama")
      const state = await breaker.getState("ollama")
      expect(state.state).toBe("CLOSED")
      expect(state.consecutiveFailures).toBe(0)
    })

    it("stays OPEN on failure when HALF_OPEN", async () => {
      // First open the circuit
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      // Manually force HALF_OPEN state
      const key = "llm-circuit:ollama"
      const data = mockRedisStore.get(key)
      if (data) {
        const state = JSON.parse(data)
        state.state = "HALF_OPEN"
        mockRedisStore.set(key, JSON.stringify(state))
      }

      // Failure should re-open the circuit
      await breaker.recordFailure("ollama", "another timeout")
      const state = await breaker.getState("ollama")
      expect(state.state).toBe("OPEN")
    })
  })

  describe("failure tracking", () => {
    it("increments consecutive failures", async () => {
      await breaker.recordFailure("ollama", "error 1")
      let state = await breaker.getState("ollama")
      expect(state.consecutiveFailures).toBe(1)

      await breaker.recordFailure("ollama", "error 2")
      state = await breaker.getState("ollama")
      expect(state.consecutiveFailures).toBe(2)
    })

    it("stores the last error message", async () => {
      await breaker.recordFailure("ollama", "specific error message")
      const state = await breaker.getState("ollama")
      expect(state.lastError).toBe("specific error message")
    })

    it("updates lastFailureAt timestamp", async () => {
      const before = Date.now()
      await breaker.recordFailure("ollama", "error")
      const after = Date.now()

      const state = await breaker.getState("ollama")
      expect(state.lastFailureAt).toBeGreaterThanOrEqual(before)
      expect(state.lastFailureAt).toBeLessThanOrEqual(after)
    })
  })

  describe("success tracking", () => {
    it("resets consecutive failures to 0", async () => {
      await breaker.recordFailure("ollama", "error 1")
      await breaker.recordFailure("ollama", "error 2")
      await breaker.recordSuccess("ollama")

      const state = await breaker.getState("ollama")
      expect(state.consecutiveFailures).toBe(0)
    })

    it("updates lastSuccessAt timestamp", async () => {
      const before = Date.now()
      await breaker.recordSuccess("ollama")
      const after = Date.now()

      const state = await breaker.getState("ollama")
      expect(state.lastSuccessAt).toBeGreaterThanOrEqual(before)
      expect(state.lastSuccessAt).toBeLessThanOrEqual(after)
    })

    it("clears lastError on success", async () => {
      await breaker.recordFailure("ollama", "some error")
      await breaker.recordSuccess("ollama")

      const state = await breaker.getState("ollama")
      expect(state.lastError).toBeNull()
    })
  })

  describe("provider isolation", () => {
    it("tracks state independently per provider", async () => {
      // Fail ollama
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      // openai should still be CLOSED
      const ollamaState = await breaker.getState("ollama")
      const openaiState = await breaker.getState("openai")

      expect(ollamaState.state).toBe("OPEN")
      expect(openaiState.state).toBe("CLOSED")
    })

    it("canCall is provider-specific", async () => {
      // Open circuit for ollama
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      expect(await breaker.canCall("ollama")).toBe(false)
      expect(await breaker.canCall("openai")).toBe(true)
      expect(await breaker.canCall("deepseek")).toBe(true)
    })
  })

  describe("getAllStates", () => {
    it("returns states for all providers", async () => {
      await breaker.recordFailure("ollama", "error")
      await breaker.recordSuccess("openai")

      const states = await breaker.getAllStates()

      expect(states).toHaveLength(3)
      expect(states.map((s) => s.provider).sort()).toEqual(["deepseek", "ollama", "openai"])
    })
  })

  describe("reset", () => {
    it("clears state for a provider", async () => {
      // Build up some state
      for (let i = 0; i < 5; i++) {
        await breaker.recordFailure("ollama", "timeout")
      }

      // Verify it's OPEN
      let state = await breaker.getState("ollama")
      expect(state.state).toBe("OPEN")

      // Reset
      await breaker.reset("ollama")

      // Should be back to initial state
      state = await breaker.getState("ollama")
      expect(state.state).toBe("CLOSED")
      expect(state.consecutiveFailures).toBe(0)
    })
  })
})
