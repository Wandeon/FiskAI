// src/app/(app)/__tests__/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

const mockAuth = vi.fn<[], Promise<Session | null>>()

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

describe("App Root Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to control-center when user is authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    const { default: Page } = await import("../page")
    await Page()
    expect(redirect).toHaveBeenCalledWith("/control-center")
  })

  it("redirects to login when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const { default: Page } = await import("../page")
    await Page()
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
