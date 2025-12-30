import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    businessPremises: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    paymentDevice: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
  requireCompanyWithContext: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { db } from "@/lib/db"
import { requireAuth, requireCompanyWithContext } from "@/lib/auth-utils"
import { bulkTogglePremisesStatus, bulkImportPremises } from "@/lib/premises/bulk-actions"

const user = { id: "user-1" }
const company = { id: "company-1" }

describe("premises bulk actions auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(user as any)
    vi.mocked(requireCompanyWithContext).mockImplementation(async (_userId, fn) => {
      return fn(company as any, user as any)
    })
  })

  it("bulkTogglePremisesStatus scopes updateMany by company", async () => {
    vi.mocked(db.businessPremises.updateMany).mockResolvedValue({ count: 1 } as any)

    await bulkTogglePremisesStatus(["prem-1"], true)

    expect(db.businessPremises.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["prem-1"] }, companyId: "company-1" },
      data: { isActive: true },
    })
  })

  it("bulkImportPremises scopes default reset to company", async () => {
    vi.mocked(db.businessPremises.findMany).mockResolvedValue([] as any)
    vi.mocked(db.businessPremises.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(db.businessPremises.create).mockResolvedValue({ id: "prem-1" } as any)

    await bulkImportPremises("company-999", [{ code: 1, name: "Main", isDefault: true }])

    expect(db.businessPremises.updateMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", isDefault: true },
      data: { isDefault: false },
    })
  })
})
