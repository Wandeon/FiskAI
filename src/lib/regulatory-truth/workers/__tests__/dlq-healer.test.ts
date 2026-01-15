// src/lib/regulatory-truth/workers/__tests__/dlq-healer.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  classifyError,
  ErrorCategory,
  isTransientError,
  getCooldownMs,
} from "../../utils/error-classifier"
import {
  createIdempotencyKey,
  shouldAutoReplay,
  recordAutoReplay,
  getAutoReplayState,
  clearAutoReplayState,
  type DLQEntryWithClassification,
} from "../dlq-healer"

describe("dlq-healer", () => {
  beforeEach(() => {
    clearAutoReplayState()
    vi.useFakeTimers()
  })

  describe("error classification", () => {
    it("should classify NETWORK errors correctly", () => {
      const networkErrors = [
        "ECONNREFUSED - connection refused",
        "ENOTFOUND - DNS lookup failed",
        "socket hang up",
        "fetch failed: Network request failed",
        "ETIMEDOUT - connection timed out",
        "ECONNRESET - connection reset by peer",
      ]

      for (const error of networkErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.NETWORK)
        expect(result.isRetryable).toBe(true)
      }
    })

    it("should classify QUOTA errors correctly", () => {
      const quotaErrors = [
        "429 Too Many Requests",
        "rate limit exceeded",
        "quota exceeded for today",
        "throttling: too many requests",
      ]

      for (const error of quotaErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.QUOTA)
        expect(result.isRetryable).toBe(true)
      }
    })

    it("should classify TIMEOUT errors correctly", () => {
      const timeoutErrors = [
        "timeout of 30000ms exceeded",
        "request timed out",
        "operation aborted",
        "deadline exceeded",
      ]

      for (const error of timeoutErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.TIMEOUT)
        expect(result.isRetryable).toBe(true)
      }
    })

    it("should classify EMPTY errors correctly", () => {
      const emptyErrors = [
        "empty response body",
        "no content extracted",
        "no text found in document",
        "no extractable content",
        "document too small to process",
      ]

      for (const error of emptyErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.EMPTY)
        expect(result.isRetryable).toBe(false)
      }
    })

    it("should classify AUTH errors correctly", () => {
      const authErrors = [
        "401 Unauthorized",
        "403 Forbidden",
        "authentication failed",
        "invalid credentials",
      ]

      for (const error of authErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.AUTH)
        expect(result.isRetryable).toBe(false)
      }
    })

    it("should classify VALIDATION errors correctly", () => {
      const validationErrors = [
        "validation error: missing required field",
        "schema validation failed",
        "invalid input format",
        "required field 'id' not found in content",
      ]

      for (const error of validationErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.VALIDATION)
        expect(result.isRetryable).toBe(false)
      }
    })

    it("should classify PARSE errors correctly", () => {
      const parseErrors = [
        "JSON parse error at position 123",
        "syntax error: unexpected token",
        "no JSON object found in response",
      ]

      for (const error of parseErrors) {
        const result = classifyError(error)
        expect(result.category).toBe(ErrorCategory.PARSE)
        expect(result.isRetryable).toBe(true)
      }
    })
  })

  describe("transient error detection", () => {
    it("should identify NETWORK as transient", () => {
      expect(isTransientError(ErrorCategory.NETWORK)).toBe(true)
    })

    it("should identify TIMEOUT as transient", () => {
      expect(isTransientError(ErrorCategory.TIMEOUT)).toBe(true)
    })

    it("should identify QUOTA as transient but with longer cooldown", () => {
      expect(isTransientError(ErrorCategory.QUOTA)).toBe(true)
    })

    it("should NOT identify AUTH as transient", () => {
      expect(isTransientError(ErrorCategory.AUTH)).toBe(false)
    })

    it("should NOT identify VALIDATION as transient", () => {
      expect(isTransientError(ErrorCategory.VALIDATION)).toBe(false)
    })

    it("should NOT identify EMPTY as transient", () => {
      expect(isTransientError(ErrorCategory.EMPTY)).toBe(false)
    })
  })

  describe("cooldown periods", () => {
    it("should return 5-minute cooldown for NETWORK errors", () => {
      expect(getCooldownMs(ErrorCategory.NETWORK)).toBe(5 * 60 * 1000) // 5 minutes
    })

    it("should return 5-minute cooldown for TIMEOUT errors", () => {
      expect(getCooldownMs(ErrorCategory.TIMEOUT)).toBe(5 * 60 * 1000) // 5 minutes
    })

    it("should return 1-hour cooldown for QUOTA errors", () => {
      expect(getCooldownMs(ErrorCategory.QUOTA)).toBe(60 * 60 * 1000) // 1 hour
    })

    it("should return Infinity for non-retryable errors", () => {
      expect(getCooldownMs(ErrorCategory.AUTH)).toBe(Infinity)
      expect(getCooldownMs(ErrorCategory.VALIDATION)).toBe(Infinity)
      expect(getCooldownMs(ErrorCategory.EMPTY)).toBe(Infinity)
    })
  })

  describe("idempotency key generation", () => {
    it("should generate consistent key for same job and payload", () => {
      const jobId = "job-123"
      const payload = { sourceId: "src-1", evidenceId: "ev-1" }

      const key1 = createIdempotencyKey(jobId, payload)
      const key2 = createIdempotencyKey(jobId, payload)

      expect(key1).toBe(key2)
    })

    it("should generate different keys for different payloads", () => {
      const jobId = "job-123"
      const payload1 = { sourceId: "src-1", evidenceId: "ev-1" }
      const payload2 = { sourceId: "src-1", evidenceId: "ev-2" }

      const key1 = createIdempotencyKey(jobId, payload1)
      const key2 = createIdempotencyKey(jobId, payload2)

      expect(key1).not.toBe(key2)
    })

    it("should generate different keys for different job IDs", () => {
      const payload = { sourceId: "src-1", evidenceId: "ev-1" }

      const key1 = createIdempotencyKey("job-123", payload)
      const key2 = createIdempotencyKey("job-456", payload)

      expect(key1).not.toBe(key2)
    })

    it("should handle undefined job ID gracefully", () => {
      const payload = { sourceId: "src-1" }
      const key = createIdempotencyKey(undefined, payload)
      expect(key).toBeDefined()
      expect(typeof key).toBe("string")
    })
  })

  describe("retry cap enforcement", () => {
    it("should allow replay when retryCount is 0", () => {
      // Set failedAt to 10 minutes ago (past cooldown period)
      const oldFailure = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 0,
        idempotencyKey: "key-1",
      }

      expect(shouldAutoReplay(entry)).toBe(true)
    })

    it("should allow replay when retryCount is below max (3)", () => {
      // Set failedAt to 30 minutes ago (past exponential backoff for retry 2)
      const oldFailure = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 2,
        idempotencyKey: "key-1",
      }

      expect(shouldAutoReplay(entry)).toBe(true)
    })

    it("should deny replay when retryCount reaches max (3)", () => {
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: new Date().toISOString(),
        retryCount: 3,
        idempotencyKey: "key-1",
      }

      expect(shouldAutoReplay(entry)).toBe(false)
    })

    it("should deny replay when retryCount exceeds max", () => {
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: new Date().toISOString(),
        retryCount: 5,
        idempotencyKey: "key-1",
      }

      expect(shouldAutoReplay(entry)).toBe(false)
    })
  })

  describe("idempotency prevents duplicate replays", () => {
    it("should allow first replay for an idempotency key", () => {
      // Set failedAt to 10 minutes ago (past cooldown period)
      const oldFailure = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 0,
        idempotencyKey: "unique-key-1",
      }

      expect(shouldAutoReplay(entry)).toBe(true)
    })

    it("should deny replay if idempotency key already replayed", () => {
      // Set failedAt to 10 minutes ago (past cooldown period)
      const oldFailure = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 0,
        idempotencyKey: "unique-key-2",
      }

      // First replay should succeed
      expect(shouldAutoReplay(entry)).toBe(true)
      recordAutoReplay(entry.idempotencyKey)

      // Second replay should be denied
      expect(shouldAutoReplay(entry)).toBe(false)
    })

    it("should track replay state per idempotency key", () => {
      // Set failedAt to 10 minutes ago (past cooldown period)
      const oldFailure = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const entry1: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 0,
        idempotencyKey: "key-A",
      }

      const entry2: DLQEntryWithClassification = {
        originalJobId: "job-2",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-2" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: oldFailure,
        retryCount: 0,
        idempotencyKey: "key-B",
      }

      // Replay entry1
      recordAutoReplay(entry1.idempotencyKey)

      // entry1 should be blocked, entry2 should still be allowed
      expect(shouldAutoReplay(entry1)).toBe(false)
      expect(shouldAutoReplay(entry2)).toBe(true)
    })
  })

  describe("exponential backoff per error class", () => {
    it("should apply exponential backoff for NETWORK errors", () => {
      const baseMs = getCooldownMs(ErrorCategory.NETWORK)
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: new Date().toISOString(),
        retryCount: 0,
        idempotencyKey: "key-1",
      }

      // Retry 0: 5 min cooldown
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs)

      // Simulate retry 1: 10 min cooldown (2x)
      entry.retryCount = 1
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs * 2)

      // Retry 2: 20 min cooldown (4x)
      entry.retryCount = 2
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs * 4)
    })

    it("should apply exponential backoff for QUOTA errors", () => {
      const baseMs = getCooldownMs(ErrorCategory.QUOTA)
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "429 rate limit",
        errorCategory: ErrorCategory.QUOTA,
        failedAt: new Date().toISOString(),
        retryCount: 0,
        idempotencyKey: "key-2",
      }

      // Retry 0: 1 hour cooldown
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs)

      // Retry 1: 2 hour cooldown
      entry.retryCount = 1
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs * 2)

      // Retry 2: 4 hour cooldown
      entry.retryCount = 2
      expect(getAutoReplayState(entry).nextReplayAfterMs).toBe(baseMs * 4)
    })

    it("should respect cooldown time before allowing replay", () => {
      const now = new Date("2024-01-15T10:00:00Z")
      vi.setSystemTime(now)

      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "ECONNREFUSED",
        errorCategory: ErrorCategory.NETWORK,
        failedAt: now.toISOString(),
        retryCount: 0,
        idempotencyKey: "key-cooldown",
      }

      // Immediately after failure - should NOT be ready for replay
      expect(shouldAutoReplay(entry)).toBe(false)

      // Advance time by 4 minutes - still not ready
      vi.advanceTimersByTime(4 * 60 * 1000)
      expect(shouldAutoReplay(entry)).toBe(false)

      // Advance time by 2 more minutes (total 6 min) - now ready
      vi.advanceTimersByTime(2 * 60 * 1000)
      expect(shouldAutoReplay(entry)).toBe(true)
    })
  })

  describe("non-retryable errors", () => {
    it("should never auto-replay AUTH errors", () => {
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "401 Unauthorized",
        errorCategory: ErrorCategory.AUTH,
        failedAt: new Date("2020-01-01").toISOString(), // Old failure
        retryCount: 0,
        idempotencyKey: "key-auth",
      }

      expect(shouldAutoReplay(entry)).toBe(false)
    })

    it("should never auto-replay VALIDATION errors", () => {
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "validation error: missing required field",
        errorCategory: ErrorCategory.VALIDATION,
        failedAt: new Date("2020-01-01").toISOString(),
        retryCount: 0,
        idempotencyKey: "key-validation",
      }

      expect(shouldAutoReplay(entry)).toBe(false)
    })

    it("should never auto-replay EMPTY errors", () => {
      const entry: DLQEntryWithClassification = {
        originalJobId: "job-1",
        originalQueue: "extract",
        originalJobData: { evidenceId: "ev-1" },
        error: "no extractable content",
        errorCategory: ErrorCategory.EMPTY,
        failedAt: new Date("2020-01-01").toISOString(),
        retryCount: 0,
        idempotencyKey: "key-empty",
      }

      expect(shouldAutoReplay(entry)).toBe(false)
    })
  })
})
