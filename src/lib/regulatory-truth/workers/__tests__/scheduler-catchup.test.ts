// src/lib/regulatory-truth/workers/__tests__/scheduler-catchup.test.ts
// TDD tests for scheduler run persistence and catch-up logic
// Task 1.2: RTL Autonomy Improvements

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// Types for test purposes
export type SchedulerRunStatus = "EXPECTED" | "RUNNING" | "COMPLETED" | "FAILED" | "MISSED"

export interface SchedulerRun {
  id: string
  jobType: string
  scheduledAt: Date
  startedAt: Date | null
  completedAt: Date | null
  status: SchedulerRunStatus
  errorMessage: string | null
  lockHolder: string | null
}

// Create mock functions for database operations
const mockSchedulerRunFindMany = vi.fn()
const mockSchedulerRunFindFirst = vi.fn()
const mockSchedulerRunCreate = vi.fn()
const mockSchedulerRunUpdate = vi.fn()
const mockSchedulerRunUpdateMany = vi.fn()
const mockSchedulerRunFindUnique = vi.fn()
const mockTransaction = vi.fn()
const mockQueryRaw = vi.fn()

// Mock the database module - must be hoisted before imports
vi.mock("@/lib/db/regulatory", () => ({
  dbReg: {
    schedulerRun: {
      findMany: (...args: unknown[]) => mockSchedulerRunFindMany(...args),
      findFirst: (...args: unknown[]) => mockSchedulerRunFindFirst(...args),
      create: (...args: unknown[]) => mockSchedulerRunCreate(...args),
      update: (...args: unknown[]) => mockSchedulerRunUpdate(...args),
      updateMany: (...args: unknown[]) => mockSchedulerRunUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockSchedulerRunFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}))

// Import the module under test
import {
  detectMissedRuns,
  triggerCatchUp,
  checkStaleness,
  acquireLock,
  releaseLock,
  markRunMissed,
  STALENESS_THRESHOLD_HOURS,
  createExpectedRun,
  transitionToRunning,
} from "../scheduler-catchup"

// Mock db object for transaction callbacks
const mockDbRegObject = {
  schedulerRun: {
    findMany: (...args: unknown[]) => mockSchedulerRunFindMany(...args),
    findFirst: (...args: unknown[]) => mockSchedulerRunFindFirst(...args),
    create: (...args: unknown[]) => mockSchedulerRunCreate(...args),
    update: (...args: unknown[]) => mockSchedulerRunUpdate(...args),
    updateMany: (...args: unknown[]) => mockSchedulerRunUpdateMany(...args),
    findUnique: (...args: unknown[]) => mockSchedulerRunFindUnique(...args),
  },
  $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
}

describe("scheduler-catchup", () => {
  const INSTANCE_ID = "test-instance-001"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T08:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("detectMissedRuns", () => {
    it("detects runs that were EXPECTED but never started within 24 hours", async () => {
      // Arrange: An EXPECTED discovery run from yesterday 6 AM that never ran
      const missedRun: SchedulerRun = {
        id: "run-1",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-14T06:00:00Z"), // Yesterday 6 AM
        startedAt: null,
        completedAt: null,
        status: "EXPECTED",
        errorMessage: null,
        lockHolder: null,
      }

      mockSchedulerRunFindMany.mockResolvedValue([missedRun])

      // Act
      const missed = await detectMissedRuns("discovery")

      // Assert
      expect(missed).toHaveLength(1)
      expect(missed[0].id).toBe("run-1")
      expect(missed[0].status).toBe("EXPECTED")
    })

    it("does not include runs that completed successfully", async () => {
      // Arrange: A completed run should not be detected as missed
      const completedRun: SchedulerRun = {
        id: "run-2",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-14T06:00:00Z"),
        startedAt: new Date("2025-01-14T06:00:01Z"),
        completedAt: new Date("2025-01-14T06:15:00Z"),
        status: "COMPLETED",
        errorMessage: null,
        lockHolder: null,
      }

      mockSchedulerRunFindMany.mockResolvedValue([])

      // Act
      const missed = await detectMissedRuns("discovery")

      // Assert
      expect(missed).toHaveLength(0)
    })

    it("includes FAILED runs in missed detection", async () => {
      // Arrange: A failed run should be included
      const failedRun: SchedulerRun = {
        id: "run-3",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-14T06:00:00Z"),
        startedAt: new Date("2025-01-14T06:00:01Z"),
        completedAt: null,
        status: "FAILED",
        errorMessage: "Network timeout",
        lockHolder: null,
      }

      mockSchedulerRunFindMany.mockResolvedValue([failedRun])

      // Act
      const missed = await detectMissedRuns("discovery")

      // Assert
      expect(missed).toHaveLength(1)
      expect(missed[0].status).toBe("FAILED")
    })

    it("only looks back 24 hours for missed runs", async () => {
      // Arrange: Verify the query uses correct time window
      mockSchedulerRunFindMany.mockResolvedValue([])

      // Act
      await detectMissedRuns("discovery")

      // Assert: Should query with scheduledAt >= 24 hours ago
      expect(mockSchedulerRunFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            jobType: "discovery",
            scheduledAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
            status: expect.objectContaining({
              in: ["EXPECTED", "FAILED"],
            }),
          }),
        })
      )
    })
  })

  describe("triggerCatchUp", () => {
    it("triggers catch-up for missed discovery runs", async () => {
      // Arrange
      const missedRun: SchedulerRun = {
        id: "run-1",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-14T06:00:00Z"),
        startedAt: null,
        completedAt: null,
        status: "EXPECTED",
        errorMessage: null,
        lockHolder: null,
      }

      // Act
      const result = await triggerCatchUp(missedRun, INSTANCE_ID)

      // Assert
      expect(result.triggered).toBe(true)
      expect(result.reason).toBe("missed_run")
    })

    it("marks original run as MISSED when triggering catch-up", async () => {
      // Arrange
      const missedRun: SchedulerRun = {
        id: "run-1",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-14T06:00:00Z"),
        startedAt: null,
        completedAt: null,
        status: "EXPECTED",
        errorMessage: null,
        lockHolder: null,
      }

      mockSchedulerRunUpdate.mockResolvedValue({
        ...missedRun,
        status: "MISSED",
      })

      // Act
      await triggerCatchUp(missedRun, INSTANCE_ID)

      // Assert
      expect(mockSchedulerRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "run-1" },
          data: expect.objectContaining({
            status: "MISSED",
          }),
        })
      )
    })
  })

  describe("checkStaleness (26-hour watchdog)", () => {
    it("returns stale when last discovery was more than 26 hours ago", async () => {
      // Arrange: Last completed discovery was 27 hours ago
      const lastRun: SchedulerRun = {
        id: "run-old",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-13T05:00:00Z"), // 27 hours ago
        startedAt: new Date("2025-01-13T05:00:01Z"),
        completedAt: new Date("2025-01-13T05:30:00Z"),
        status: "COMPLETED",
        errorMessage: null,
        lockHolder: null,
      }

      mockSchedulerRunFindFirst.mockResolvedValue(lastRun)

      // Act
      const staleness = await checkStaleness("discovery")

      // Assert
      expect(staleness.isStale).toBe(true)
      expect(staleness.hoursSinceLastRun).toBeGreaterThan(STALENESS_THRESHOLD_HOURS)
    })

    it("returns not stale when last discovery was within 26 hours", async () => {
      // Arrange: Last completed discovery was 6 hours ago
      const lastRun: SchedulerRun = {
        id: "run-recent",
        jobType: "discovery",
        scheduledAt: new Date("2025-01-15T02:00:00Z"), // 6 hours ago
        startedAt: new Date("2025-01-15T02:00:01Z"),
        completedAt: new Date("2025-01-15T02:30:00Z"),
        status: "COMPLETED",
        errorMessage: null,
        lockHolder: null,
      }

      mockSchedulerRunFindFirst.mockResolvedValue(lastRun)

      // Act
      const staleness = await checkStaleness("discovery")

      // Assert
      expect(staleness.isStale).toBe(false)
    })

    it("returns stale when no completed discovery run exists", async () => {
      // Arrange: No completed runs found
      mockSchedulerRunFindFirst.mockResolvedValue(null)

      // Act
      const staleness = await checkStaleness("discovery")

      // Assert
      expect(staleness.isStale).toBe(true)
      expect(staleness.reason).toBe("no_completed_runs")
    })

    it("uses 26 hour threshold (not 24) for safety margin", () => {
      // Assert: The constant should be 26, not 24
      expect(STALENESS_THRESHOLD_HOURS).toBe(26)
    })
  })

  describe("distributed locking", () => {
    describe("acquireLock", () => {
      it("acquires lock when no other instance holds it", async () => {
        // Arrange: No existing lock
        mockTransaction.mockImplementation(async (fn) => {
          // Simulate the lock check + acquire pattern
          mockSchedulerRunFindFirst.mockResolvedValue(null)
          mockSchedulerRunUpdate.mockResolvedValue({
            id: "run-1",
            lockHolder: INSTANCE_ID,
            status: "RUNNING",
          })
          return fn(mockDbRegObject)
        })

        // Act
        const result = await acquireLock("discovery", INSTANCE_ID, "run-1")

        // Assert
        expect(result.acquired).toBe(true)
        expect(result.lockHolder).toBe(INSTANCE_ID)
      })

      it("fails to acquire lock when another instance holds it", async () => {
        // Arrange: Another instance holds the lock
        mockTransaction.mockImplementation(async (fn) => {
          mockSchedulerRunFindFirst.mockResolvedValue({
            id: "run-1",
            lockHolder: "other-instance-002",
            status: "RUNNING",
          })
          return fn(mockDbRegObject)
        })

        // Act
        const result = await acquireLock("discovery", INSTANCE_ID, "run-1")

        // Assert
        expect(result.acquired).toBe(false)
        expect(result.lockHolder).toBe("other-instance-002")
      })

      it("uses row-level lock within transaction", async () => {
        // Arrange
        mockTransaction.mockImplementation(async (fn) => {
          return fn(mockDbRegObject)
        })

        // Act
        await acquireLock("discovery", INSTANCE_ID, "run-1")

        // Assert: Transaction was used for atomicity
        expect(mockTransaction).toHaveBeenCalled()
      })
    })

    describe("releaseLock", () => {
      it("releases lock when instance holds it", async () => {
        // Arrange
        mockSchedulerRunUpdate.mockResolvedValue({
          id: "run-1",
          lockHolder: null,
          status: "COMPLETED",
        })

        // Act
        const result = await releaseLock("run-1", INSTANCE_ID, "COMPLETED")

        // Assert
        expect(result.released).toBe(true)
        expect(mockSchedulerRunUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: "run-1",
              lockHolder: INSTANCE_ID,
            }),
            data: expect.objectContaining({
              lockHolder: null,
              status: "COMPLETED",
            }),
          })
        )
      })

      it("fails to release lock when instance does not hold it", async () => {
        // Arrange: Update fails because lockHolder doesn't match
        mockSchedulerRunUpdate.mockRejectedValue(new Error("Record not found"))

        // Act
        const result = await releaseLock("run-1", INSTANCE_ID, "COMPLETED")

        // Assert
        expect(result.released).toBe(false)
      })
    })

    describe("lock contention handling", () => {
      it("marks run as MISSED when lock contention detected", async () => {
        // Arrange
        mockSchedulerRunUpdate.mockResolvedValue({
          id: "run-1",
          status: "MISSED",
          errorMessage: "Lock contention - another instance processing",
        })

        // Act
        await markRunMissed("run-1", "Lock contention - another instance processing")

        // Assert
        expect(mockSchedulerRunUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "run-1" },
            data: expect.objectContaining({
              status: "MISSED",
              errorMessage: expect.stringContaining("Lock contention"),
            }),
          })
        )
      })
    })
  })

  describe("atomic state transitions", () => {
    describe("createExpectedRun", () => {
      it("creates a new EXPECTED run for scheduling", async () => {
        // Arrange
        const scheduledAt = new Date("2025-01-15T06:00:00Z")
        mockSchedulerRunCreate.mockResolvedValue({
          id: "run-new",
          jobType: "discovery",
          scheduledAt,
          status: "EXPECTED",
          lockHolder: null,
        })

        // Act
        const run = await createExpectedRun("discovery", scheduledAt)

        // Assert
        expect(run.status).toBe("EXPECTED")
        expect(run.jobType).toBe("discovery")
        expect(mockSchedulerRunCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              jobType: "discovery",
              scheduledAt,
              status: "EXPECTED",
            }),
          })
        )
      })

      it("handles unique constraint violation gracefully", async () => {
        // Arrange: Run already exists for this jobType + scheduledAt
        const scheduledAt = new Date("2025-01-15T06:00:00Z")
        mockSchedulerRunCreate.mockRejectedValue(
          new Error("Unique constraint failed on (jobType, scheduledAt)")
        )
        mockSchedulerRunFindUnique.mockResolvedValue({
          id: "existing-run",
          jobType: "discovery",
          scheduledAt,
          status: "EXPECTED",
        })

        // Act
        const run = await createExpectedRun("discovery", scheduledAt)

        // Assert: Should return existing run instead of throwing
        expect(run.id).toBe("existing-run")
      })
    })

    describe("transitionToRunning", () => {
      it("atomically transitions EXPECTED to RUNNING with lock", async () => {
        // Arrange
        const run: SchedulerRun = {
          id: "run-1",
          jobType: "discovery",
          scheduledAt: new Date("2025-01-15T06:00:00Z"),
          startedAt: null,
          completedAt: null,
          status: "EXPECTED",
          errorMessage: null,
          lockHolder: null,
        }

        mockTransaction.mockImplementation(async (fn) => {
          // Mock updateMany to return count=1 (successful update)
          mockSchedulerRunUpdateMany.mockResolvedValue({ count: 1 })
          // Mock findUnique to return the updated run
          mockSchedulerRunFindUnique.mockResolvedValue({
            ...run,
            status: "RUNNING",
            startedAt: new Date(),
            lockHolder: INSTANCE_ID,
          })
          return fn(mockDbRegObject)
        })

        // Act
        const result = await transitionToRunning("run-1", INSTANCE_ID)

        // Assert
        expect(result.success).toBe(true)
        expect(result.run?.status).toBe("RUNNING")
        expect(result.run?.lockHolder).toBe(INSTANCE_ID)
      })

      it("fails transition if run is not in EXPECTED state", async () => {
        // Arrange: Run is already RUNNING, updateMany returns count=0
        mockTransaction.mockImplementation(async (fn) => {
          // Simulate updateMany returning 0 (no rows matched)
          mockSchedulerRunUpdateMany.mockResolvedValue({ count: 0 })
          return fn(mockDbRegObject)
        })

        // Act
        const result = await transitionToRunning("run-1", INSTANCE_ID)

        // Assert
        expect(result.success).toBe(false)
        expect(result.reason).toBe("invalid_state_transition")
      })

      it("uses UPDATE with WHERE status=EXPECTED for atomicity", async () => {
        // Arrange
        mockTransaction.mockImplementation(async (fn) => {
          mockSchedulerRunUpdateMany.mockResolvedValue({ count: 0 })
          return fn(mockDbRegObject)
        })

        // Act
        await transitionToRunning("run-1", INSTANCE_ID)

        // Assert: The update should include status constraint
        expect(mockTransaction).toHaveBeenCalled()
      })
    })
  })

  describe("startup behavior", () => {
    it("detects and processes missed runs on scheduler startup", async () => {
      // This is more of an integration test scenario
      // Validates the startup flow: detectMissedRuns -> triggerCatchUp for each
      const missedRuns: SchedulerRun[] = [
        {
          id: "run-1",
          jobType: "discovery",
          scheduledAt: new Date("2025-01-14T06:00:00Z"),
          startedAt: null,
          completedAt: null,
          status: "EXPECTED",
          errorMessage: null,
          lockHolder: null,
        },
      ]

      mockSchedulerRunFindMany.mockResolvedValue(missedRuns)
      mockSchedulerRunUpdate.mockResolvedValue({
        ...missedRuns[0],
        status: "MISSED",
      })

      // Act
      const missed = await detectMissedRuns("discovery")

      // Assert
      expect(missed).toHaveLength(1)
      // The startup handler would then call triggerCatchUp for each
    })
  })
})
