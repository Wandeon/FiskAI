import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({ db: {} }))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}))

vi.mock("@/lib/auth-utils", () => ({
  requireCompanyWithPermission: vi
    .fn()
    .mockRejectedValue(
      new Error("Permission denied: User with role ADMIN does not have permission 'billing:manage'")
    ),
}))

import { POST } from "../route"

describe("POST /api/billing/portal permissions", () => {
  it("returns 403 when non-owner cannot open billing portal", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/portal", {
      method: "POST",
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Forbidden")
  })
})
