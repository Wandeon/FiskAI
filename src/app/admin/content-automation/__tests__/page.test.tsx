import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock runtime capabilities
const mockHasRegulatoryTruthTables = vi.fn()
vi.mock("@/lib/admin/runtime-capabilities", () => ({
  hasRegulatoryTruthTables: () => mockHasRegulatoryTruthTables(),
  CONTENT_AUTOMATION_TABLES: ["ArticleJob", "content_sync_events"],
}))

// Mock metrics functions - track if they are invoked
const mockCollectArticleAgentMetrics = vi.fn()
const mockCollectContentSyncMetrics = vi.fn()
const mockGetRecentArticleJobs = vi.fn()
const mockGetRecentContentSyncEvents = vi.fn()
const mockGetContentPipelineHealth = vi.fn()
const mockGetPendingContentSyncPRs = vi.fn()

vi.mock("@/lib/regulatory-truth/monitoring/metrics", () => ({
  collectArticleAgentMetrics: () => mockCollectArticleAgentMetrics(),
  collectContentSyncMetrics: () => mockCollectContentSyncMetrics(),
  getRecentArticleJobs: (limit: number) => mockGetRecentArticleJobs(limit),
  getRecentContentSyncEvents: (limit: number) => mockGetRecentContentSyncEvents(limit),
  getContentPipelineHealth: () => mockGetContentPipelineHealth(),
  getPendingContentSyncPRs: (limit: number) => mockGetPendingContentSyncPRs(limit),
}))

// Mock the dashboard component
vi.mock("../content-automation-dashboard", () => ({
  ContentAutomationDashboard: () => (
    <div data-testid="content-automation-dashboard">ContentAutomationDashboard</div>
  ),
}))

// Mock loading spinner
vi.mock("@/components/ui/loading-spinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

// Import after mocks
import ContentAutomationPage from "../page"

describe("ContentAutomationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock return values for metrics
    mockCollectArticleAgentMetrics.mockResolvedValue({})
    mockCollectContentSyncMetrics.mockResolvedValue({})
    mockGetRecentArticleJobs.mockResolvedValue([])
    mockGetRecentContentSyncEvents.mockResolvedValue([])
    mockGetContentPipelineHealth.mockResolvedValue({})
    mockGetPendingContentSyncPRs.mockResolvedValue([])
  })

  it("renders NotConfigured when tables are missing", async () => {
    mockHasRegulatoryTruthTables.mockResolvedValue({
      available: false,
      missingTables: ["ArticleJob", "content_sync_events"],
    })

    const Page = await ContentAutomationPage()
    render(Page)

    // Should show not configured message
    expect(screen.getByText("Not configured on this environment")).toBeInTheDocument()
    expect(screen.getByText("ArticleJob")).toBeInTheDocument()
    expect(screen.getByText("content_sync_events")).toBeInTheDocument()

    // Should NOT invoke any metrics queries
    expect(mockCollectArticleAgentMetrics).not.toHaveBeenCalled()
    expect(mockCollectContentSyncMetrics).not.toHaveBeenCalled()
    expect(mockGetRecentArticleJobs).not.toHaveBeenCalled()
    expect(mockGetRecentContentSyncEvents).not.toHaveBeenCalled()
    expect(mockGetContentPipelineHealth).not.toHaveBeenCalled()
    expect(mockGetPendingContentSyncPRs).not.toHaveBeenCalled()
  })

  it("renders dashboard when tables exist", async () => {
    mockHasRegulatoryTruthTables.mockResolvedValue({
      available: true,
      missingTables: [],
    })

    const Page = await ContentAutomationPage()
    render(Page)

    // Should NOT show not configured message
    expect(screen.queryByText("Not configured on this environment")).not.toBeInTheDocument()

    // Should show the dashboard component
    expect(screen.getByTestId("content-automation-dashboard")).toBeInTheDocument()

    // Should have invoked metrics queries
    expect(mockCollectArticleAgentMetrics).toHaveBeenCalled()
    expect(mockCollectContentSyncMetrics).toHaveBeenCalled()
    expect(mockGetRecentArticleJobs).toHaveBeenCalledWith(10)
    expect(mockGetRecentContentSyncEvents).toHaveBeenCalledWith(10)
    expect(mockGetContentPipelineHealth).toHaveBeenCalled()
    expect(mockGetPendingContentSyncPRs).toHaveBeenCalledWith(50)
  })

  it("shows specific missing tables in error state", async () => {
    mockHasRegulatoryTruthTables.mockResolvedValue({
      available: false,
      missingTables: ["ArticleJob"],
    })

    const Page = await ContentAutomationPage()
    render(Page)

    // Should show only the missing table
    expect(screen.getByText("ArticleJob")).toBeInTheDocument()
    expect(screen.queryByText("content_sync_events")).not.toBeInTheDocument()
  })
})
