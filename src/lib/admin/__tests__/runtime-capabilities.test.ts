import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock drizzle db execute
const mockExecute = vi.fn()
vi.mock("@/lib/db/drizzle", () => ({
  drizzleDb: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

// Import after mocks
import { hasNewsTables, hasRegulatoryTruthTables } from "../runtime-capabilities"

describe("runtime-capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("hasNewsTables", () => {
    it("returns available: true when all news tables exist", async () => {
      // Mock all tables exist
      mockExecute.mockResolvedValue({ rows: [{ exists: true }] })

      const result = await hasNewsTables()

      expect(result.available).toBe(true)
      expect(result.missingTables).toEqual([])
      // Should check both news_posts and news_categories
      expect(mockExecute).toHaveBeenCalledTimes(2)
    })

    it("returns available: false with missing tables when news_posts is missing", async () => {
      // First call (news_posts) returns false, second (news_categories) returns true
      mockExecute
        .mockResolvedValueOnce({ rows: [{ exists: false }] })
        .mockResolvedValueOnce({ rows: [{ exists: true }] })

      const result = await hasNewsTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["news_posts"])
    })

    it("returns available: false with missing tables when news_categories is missing", async () => {
      // First call (news_posts) returns true, second (news_categories) returns false
      mockExecute
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({ rows: [{ exists: false }] })

      const result = await hasNewsTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["news_categories"])
    })

    it("returns all missing tables when none exist", async () => {
      mockExecute.mockResolvedValue({ rows: [{ exists: false }] })

      const result = await hasNewsTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["news_posts", "news_categories"])
    })
  })

  describe("hasRegulatoryTruthTables", () => {
    it("returns available: true when all content automation tables exist", async () => {
      mockExecute.mockResolvedValue({ rows: [{ exists: true }] })

      const result = await hasRegulatoryTruthTables()

      expect(result.available).toBe(true)
      expect(result.missingTables).toEqual([])
      // Should check both ArticleJob and content_sync_events
      expect(mockExecute).toHaveBeenCalledTimes(2)
    })

    it("returns available: false with missing tables when ArticleJob is missing", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ exists: false }] })
        .mockResolvedValueOnce({ rows: [{ exists: true }] })

      const result = await hasRegulatoryTruthTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["ArticleJob"])
    })

    it("returns available: false with missing tables when content_sync_events is missing", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({ rows: [{ exists: false }] })

      const result = await hasRegulatoryTruthTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["content_sync_events"])
    })

    it("returns all missing tables when none exist", async () => {
      mockExecute.mockResolvedValue({ rows: [{ exists: false }] })

      const result = await hasRegulatoryTruthTables()

      expect(result.available).toBe(false)
      expect(result.missingTables).toEqual(["ArticleJob", "content_sync_events"])
    })
  })
})
