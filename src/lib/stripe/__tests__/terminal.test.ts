import { describe, it } from "node:test"
import assert from "node:assert"
import { validateTerminalReaderId, formatAmountForStripe } from "../terminal"

describe("Stripe Terminal Helpers", () => {
  describe("formatAmountForStripe", () => {
    it("should convert EUR to cents", () => {
      assert.strictEqual(formatAmountForStripe(10.0), 1000)
      assert.strictEqual(formatAmountForStripe(125.5), 12550)
      assert.strictEqual(formatAmountForStripe(0.01), 1)
    })

    it("should round to nearest cent", () => {
      assert.strictEqual(formatAmountForStripe(10.999), 1100)
      assert.strictEqual(formatAmountForStripe(10.001), 1000)
    })
  })

  describe("validateTerminalReaderId", () => {
    it("should accept valid reader IDs", () => {
      assert.strictEqual(validateTerminalReaderId("tmr_FooBar123"), true)
    })

    it("should reject invalid reader IDs", () => {
      assert.strictEqual(validateTerminalReaderId("invalid"), false)
      assert.strictEqual(validateTerminalReaderId(""), false)
    })
  })
})
