import { describe, it } from "node:test"
import assert from "node:assert"
import { Prisma } from "@prisma/client"
import { fiscalizePosSale, type PosFiscalInput } from "../pos-fiscalize"

describe("fiscalizePosSale", () => {
  const validInput: PosFiscalInput = {
    invoice: {
      id: "inv-1",
      invoiceNumber: "2025-1-1-00001",
      issueDate: new Date("2025-01-15T14:30:00"),
      totalAmount: new Prisma.Decimal("125.00"),
      paymentMethod: "CASH",
    },
    company: {
      id: "company-1",
      oib: "12345678901",
      fiscalEnabled: false, // Test mode
      premisesCode: "1",
      deviceCode: "1",
    },
  }

  it("should return demo JIR when fiscalization disabled", async () => {
    const result = await fiscalizePosSale(validInput)

    assert.strictEqual(result.success, true)
    assert.ok(result.zki, "ZKI should be defined")
    assert.ok(result.jir?.startsWith("DEMO-"), "JIR should be demo")
  })

  it("should calculate valid ZKI", async () => {
    const result = await fiscalizePosSale(validInput)

    assert.ok(result.zki, "ZKI should be defined")
    assert.strictEqual(result.zki.length, 32, "ZKI should be 32 chars")
    assert.ok(/^[a-f0-9]{32}$/.test(result.zki), "ZKI should be hex")
  })
})
