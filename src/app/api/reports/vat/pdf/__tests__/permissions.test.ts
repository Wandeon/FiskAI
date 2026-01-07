import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({ db: {} }))

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1" }),
  requireCompanyWithPermission: vi
    .fn()
    .mockRejectedValue(
      new Error(
        "Permission denied: User with role VIEWER does not have permission 'reports:export'"
      )
    ),
}))

import { GET } from "../route"

describe("GET /api/reports/vat/pdf permissions", () => {
  it("returns 403 when viewer lacks export permission", async () => {
    const request = new NextRequest("http://localhost:3000/api/reports/vat/pdf")

    const response = await GET(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Forbidden")
  })
})
