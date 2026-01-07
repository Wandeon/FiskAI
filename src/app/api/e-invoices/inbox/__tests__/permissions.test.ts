import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1" }),
  requireCompany: vi.fn(),
  requireCompanyWithPermission: vi
    .fn()
    .mockRejectedValue(
      new Error(
        "Permission denied: User with role MEMBER does not have permission 'invoice:update'"
      )
    ),
}))

import { POST } from "../route"

describe("POST /api/e-invoices/inbox permissions", () => {
  it("returns 403 when member cannot approve inbound invoice", async () => {
    const request = new Request("http://localhost:3000/api/e-invoices/inbox?invoiceId=inv_1", {
      method: "POST",
      body: JSON.stringify({ accept: true }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Forbidden")
  })
})
