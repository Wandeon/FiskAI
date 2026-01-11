import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock functions need to be hoisted
const mockExecute = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerInfo = vi.fn()

// Mock drizzle db execute
vi.mock("@/lib/db/drizzle", () => ({
  drizzleDb: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

// Mock logger to capture CRITICAL logs
vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      error: (...args: unknown[]) => mockLoggerError(...args),
      info: (...args: unknown[]) => mockLoggerInfo(...args),
    }),
  },
}))

// Import after mocks
import {
  verifyFeatureContract,
  verifyAllFeatureContracts,
  TYPE_A_FEATURES,
} from "../feature-contracts"

describe("feature-contracts", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("verifyFeatureContract", () => {
    it("returns healthy when all News tables exist", async () => {
      // Enable News as Type A
      process.env.NEWS_TYPE_A = "true"

      // All tables exist
      mockExecute.mockResolvedValue({ rows: [{ exists: true }] })

      const result = await verifyFeatureContract("news")

      expect(result.enabled).toBe(true)
      expect(result.healthy).toBe(true)
      expect(result.missingTables).toEqual([])
      // Should check all required tables
      expect(mockExecute).toHaveBeenCalledTimes(TYPE_A_FEATURES.news.requiredTables.length)
    })

    it("returns unhealthy with missing tables list when some tables missing", async () => {
      process.env.NEWS_TYPE_A = "true"

      // First two tables exist, rest don't
      mockExecute
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // news_posts
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // news_categories
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // news_items
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // news_sources

      const result = await verifyFeatureContract("news")

      expect(result.enabled).toBe(true)
      expect(result.healthy).toBe(false)
      expect(result.missingTables).toEqual(["news_items", "news_sources"])
    })

    it("returns not enabled when NEWS_TYPE_A is false", async () => {
      process.env.NEWS_TYPE_A = "false"

      const result = await verifyFeatureContract("news")

      expect(result.enabled).toBe(false)
      expect(result.healthy).toBe(true)
      expect(result.missingTables).toEqual([])
      // Should not check any tables
      expect(mockExecute).not.toHaveBeenCalled()
    })

    it("logs CRITICAL error in production when tables missing", async () => {
      process.env.NODE_ENV = "production"
      process.env.NEWS_TYPE_A = "true"

      // All tables missing
      mockExecute.mockResolvedValue({ rows: [{ exists: false }] })

      await verifyFeatureContract("news")

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          featureId: "news",
          severity: "CRITICAL",
        }),
        expect.stringContaining("TYPE A CONTRACT VIOLATION")
      )
    })

    it("does not log CRITICAL in development", async () => {
      process.env.NODE_ENV = "development"
      process.env.NEWS_TYPE_A = "true"

      // All tables missing
      mockExecute.mockResolvedValue({ rows: [{ exists: false }] })

      await verifyFeatureContract("news")

      expect(mockLoggerError).not.toHaveBeenCalled()
    })
  })

  describe("verifyAllFeatureContracts", () => {
    it("returns allHealthy: true when all enabled features have their tables", async () => {
      process.env.NEWS_TYPE_A = "true"
      mockExecute.mockResolvedValue({ rows: [{ exists: true }] })

      const { allHealthy, features } = await verifyAllFeatureContracts()

      expect(allHealthy).toBe(true)
      expect(features.length).toBeGreaterThan(0)
      expect(features.every((f) => f.healthy)).toBe(true)
    })

    it("returns allHealthy: false when any enabled feature has missing tables", async () => {
      process.env.NEWS_TYPE_A = "true"
      mockExecute.mockResolvedValue({ rows: [{ exists: false }] })

      const { allHealthy, features } = await verifyAllFeatureContracts()

      expect(allHealthy).toBe(false)
      const newsFeature = features.find((f) => f.featureId === "news")
      expect(newsFeature?.healthy).toBe(false)
    })

    it("returns allHealthy: true when no features are enabled", async () => {
      process.env.NEWS_TYPE_A = "false"
      process.env.NODE_ENV = "development"

      const { allHealthy, features } = await verifyAllFeatureContracts()

      expect(allHealthy).toBe(true)
      expect(features.every((f) => !f.enabled)).toBe(true)
    })
  })

  describe("Type A default behavior", () => {
    it("defaults to enabled in production when env flag not set", async () => {
      process.env.NODE_ENV = "production"
      delete process.env.NEWS_TYPE_A

      mockExecute.mockResolvedValue({ rows: [{ exists: true }] })

      const result = await verifyFeatureContract("news")

      expect(result.enabled).toBe(true)
    })

    it("defaults to disabled in development when env flag not set", async () => {
      process.env.NODE_ENV = "development"
      delete process.env.NEWS_TYPE_A

      const result = await verifyFeatureContract("news")

      expect(result.enabled).toBe(false)
    })
  })
})
