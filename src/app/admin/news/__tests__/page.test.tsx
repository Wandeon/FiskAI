import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock runtime capabilities
const mockHasNewsTables = vi.fn()
vi.mock("@/lib/admin/runtime-capabilities", () => ({
  hasNewsTables: () => mockHasNewsTables(),
  NEWS_TABLES: ["news_posts", "news_categories"],
}))

// Mock drizzle db - track if queries are invoked
const mockDrizzleSelect = vi.fn()
vi.mock("@/lib/db/drizzle", () => ({
  drizzleDb: {
    select: (...args: unknown[]) => {
      mockDrizzleSelect(...args)
      return {
        from: () => ({
          groupBy: () => Promise.resolve([]),
          orderBy: () => Promise.resolve([]),
        }),
      }
    },
  },
}))

// Mock schema
vi.mock("@/lib/db/schema/news", () => ({
  newsPosts: { status: "status", id: "id" },
  newsCategories: { id: "id", nameHr: "nameHr" },
}))

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  desc: vi.fn(),
  sql: vi.fn(),
}))

// Mock child components
vi.mock("../news-table-client", () => ({
  NewsTableClient: () => <div data-testid="news-table-client">NewsTableClient</div>,
}))

// Import after mocks
import AdminNewsPage from "../page"

describe("AdminNewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders NotConfigured when tables are missing", async () => {
    mockHasNewsTables.mockResolvedValue({
      available: false,
      missingTables: ["news_posts", "news_categories"],
    })

    const Page = await AdminNewsPage()
    render(Page)

    // Should show not configured message
    expect(screen.getByText("Not configured on this environment")).toBeInTheDocument()
    expect(screen.getByText("news_posts")).toBeInTheDocument()
    expect(screen.getByText("news_categories")).toBeInTheDocument()

    // Should NOT invoke any database queries
    expect(mockDrizzleSelect).not.toHaveBeenCalled()
  })

  it("renders page content when tables exist", async () => {
    mockHasNewsTables.mockResolvedValue({
      available: true,
      missingTables: [],
    })

    const Page = await AdminNewsPage()
    render(Page)

    // Should NOT show not configured message
    expect(screen.queryByText("Not configured on this environment")).not.toBeInTheDocument()

    // Should show normal content (the mocked child component)
    expect(screen.getByTestId("news-table-client")).toBeInTheDocument()

    // Should have invoked database queries
    expect(mockDrizzleSelect).toHaveBeenCalled()
  })

  it("shows specific missing tables in error state", async () => {
    mockHasNewsTables.mockResolvedValue({
      available: false,
      missingTables: ["news_posts"],
    })

    const Page = await AdminNewsPage()
    render(Page)

    // Should show only the missing table
    expect(screen.getByText("news_posts")).toBeInTheDocument()
    expect(screen.queryByText("news_categories")).not.toBeInTheDocument()
  })
})
