import { describe, it, expect } from "vitest"
import { validateOib, oibSchema, oibOptionalSchema } from "../oib"

describe("validateOib", () => {
  describe("valid OIBs", () => {
    it("should return true for valid OIB 12345678903", () => {
      expect(validateOib("12345678903")).toBe(true)
    })

    it("should return true for valid OIB 77562783694", () => {
      expect(validateOib("77562783694")).toBe(true)
    })

    it("should return true for valid OIB 81457836525", () => {
      expect(validateOib("81457836525")).toBe(true)
    })

    it("should return true for valid OIB with leading zeros", () => {
      expect(validateOib("00000000010")).toBe(true)
    })
  })

  describe("invalid checksum", () => {
    it("should return false for OIB with wrong checksum 12345678901", () => {
      expect(validateOib("12345678901")).toBe(false)
    })

    it("should return false for OIB with wrong checksum 12345678902", () => {
      expect(validateOib("12345678902")).toBe(false)
    })

    it("should return false for OIB with wrong last digit", () => {
      expect(validateOib("77562783691")).toBe(false)
    })
  })

  describe("wrong length", () => {
    it("should return false for OIB with 9 digits", () => {
      expect(validateOib("123456789")).toBe(false)
    })

    it("should return false for OIB with 10 digits", () => {
      expect(validateOib("1234567890")).toBe(false)
    })

    it("should return false for OIB with 12 digits", () => {
      expect(validateOib("123456789012")).toBe(false)
    })

    it("should return false for OIB with 13 digits", () => {
      expect(validateOib("1234567890123")).toBe(false)
    })
  })

  describe("non-numeric input", () => {
    it("should return false for OIB with letter at end", () => {
      expect(validateOib("1234567890a")).toBe(false)
    })

    it("should return false for OIB with letter at start", () => {
      expect(validateOib("a2345678903")).toBe(false)
    })

    it("should return false for OIB with letter in middle", () => {
      expect(validateOib("12345a78903")).toBe(false)
    })

    it("should return false for OIB with special characters", () => {
      expect(validateOib("123456789-3")).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("should return false for empty string", () => {
      expect(validateOib("")).toBe(false)
    })

    it("should return false for string with spaces", () => {
      expect(validateOib("123 456 789")).toBe(false)
    })

    it("should return false for OIB with leading zeros removed context", () => {
      expect(validateOib("01234567890")).toBe(false)
    })
  })
})

describe("oibSchema", () => {
  describe("valid input", () => {
    it("should pass for valid OIB", () => {
      const result = oibSchema.safeParse("12345678903")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("12345678903")
      }
    })

    it("should pass for another valid OIB", () => {
      const result = oibSchema.safeParse("77562783694")
      expect(result.success).toBe(true)
    })
  })

  describe("invalid input with Croatian error messages", () => {
    it("should fail with Croatian message for wrong length", () => {
      const result = oibSchema.safeParse("123456789")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("OIB mora imati točno 11 znamenki")
      }
    })

    it("should fail with Croatian message for non-numeric", () => {
      const result = oibSchema.safeParse("1234567890a")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("OIB mora sadržavati samo znamenke")
      }
    })

    it("should fail with Croatian message for invalid checksum", () => {
      const result = oibSchema.safeParse("12345678901")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("Neispravan OIB - kontrolna znamenka ne odgovara")
      }
    })
  })
})

describe("oibOptionalSchema", () => {
  describe("empty values", () => {
    it("should pass for empty string", () => {
      const result = oibOptionalSchema.safeParse("")
      expect(result.success).toBe(true)
    })

    it("should pass for undefined", () => {
      const result = oibOptionalSchema.safeParse(undefined)
      expect(result.success).toBe(true)
    })
  })

  describe("valid OIB", () => {
    it("should pass for valid OIB", () => {
      const result = oibOptionalSchema.safeParse("12345678903")
      expect(result.success).toBe(true)
    })

    it("should pass for another valid OIB", () => {
      const result = oibOptionalSchema.safeParse("77562783694")
      expect(result.success).toBe(true)
    })
  })

  describe("invalid OIB", () => {
    it("should fail for invalid OIB with wrong checksum", () => {
      const result = oibOptionalSchema.safeParse("12345678901")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("Neispravan OIB format")
      }
    })

    it("should fail for OIB with wrong length when provided", () => {
      const result = oibOptionalSchema.safeParse("123456789")
      expect(result.success).toBe(false)
    })
  })
})
