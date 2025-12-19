// src/lib/auth/otp.test.ts
import { describe, it } from "node:test"
import assert from "node:assert"
import { generateOTP, hashOTP, verifyOTP } from "./otp"

describe("OTP utilities", () => {
  describe("generateOTP", () => {
    it("generates a 6-digit numeric code", () => {
      const code = generateOTP()
      assert.match(code, /^\d{6}$/)
    })

    it("generates different codes on each call", () => {
      const codes = new Set([generateOTP(), generateOTP(), generateOTP()])
      assert.strictEqual(codes.size, 3)
    })
  })

  describe("hashOTP and verifyOTP", () => {
    it("verifies a correct code", async () => {
      const code = "123456"
      const hash = await hashOTP(code)
      const isValid = await verifyOTP(code, hash)
      assert.strictEqual(isValid, true)
    })

    it("rejects an incorrect code", async () => {
      const hash = await hashOTP("123456")
      const isValid = await verifyOTP("654321", hash)
      assert.strictEqual(isValid, false)
    })

    it("produces different hashes for same code", async () => {
      const code = "123456"
      const hash1 = await hashOTP(code)
      const hash2 = await hashOTP(code)
      assert.notStrictEqual(hash1, hash2)
    })
  })
})
