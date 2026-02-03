import { describe, it, expect } from "vitest"
import {
  validateCroatianIban,
  formatIban,
  ibanSchema,
  ibanOptionalSchema,
} from "../iban"

describe("validateCroatianIban", () => {
  describe("valid IBANs", () => {
    it("should return true for valid Croatian IBAN", () => {
      expect(validateCroatianIban("HR1234567890123456789")).toBe(true)
    })

    it("should return true for valid IBAN with spaces", () => {
      expect(validateCroatianIban("HR12 3456 7890 1234 5678 9")).toBe(true)
    })

    it("should return true for lowercase IBAN", () => {
      expect(validateCroatianIban("hr1234567890123456789")).toBe(true)
    })

    it("should return true for mixed case IBAN with spaces", () => {
      expect(validateCroatianIban("Hr12 3456 7890 1234 5678 9")).toBe(true)
    })
  })

  describe("invalid country prefix", () => {
    it("should return false for German IBAN prefix", () => {
      expect(validateCroatianIban("DE1234567890123456789")).toBe(false)
    })

    it("should return false for Austrian IBAN prefix", () => {
      expect(validateCroatianIban("AT1234567890123456789")).toBe(false)
    })

    it("should return false for Slovenian IBAN prefix", () => {
      expect(validateCroatianIban("SI1234567890123456789")).toBe(false)
    })

    it("should return false for IBAN without country prefix", () => {
      expect(validateCroatianIban("1234567890123456789AB")).toBe(false)
    })
  })

  describe("wrong length", () => {
    it("should return false for IBAN with 20 characters (too short)", () => {
      expect(validateCroatianIban("HR123456789012345678")).toBe(false)
    })

    it("should return false for IBAN with 22 characters (too long)", () => {
      expect(validateCroatianIban("HR12345678901234567890")).toBe(false)
    })

    it("should return false for very short IBAN", () => {
      expect(validateCroatianIban("HR12345")).toBe(false)
    })
  })

  describe("non-numeric after prefix", () => {
    it("should return false for IBAN with letter in account number", () => {
      expect(validateCroatianIban("HR123456789012345678a")).toBe(false)
    })

    it("should return false for IBAN with special character", () => {
      expect(validateCroatianIban("HR12345678901234567-9")).toBe(false)
    })

    it("should return false for IBAN with multiple letters", () => {
      expect(validateCroatianIban("HR12345678901234567ab")).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("should return false for empty string", () => {
      expect(validateCroatianIban("")).toBe(false)
    })

    it("should return false for just prefix", () => {
      expect(validateCroatianIban("HR")).toBe(false)
    })

    it("should return true for IBAN with tabs and spaces mixed", () => {
      // The regex \s matches tabs, so this should be valid
      expect(validateCroatianIban("HR12\t3456 7890 1234 5678 9")).toBe(true)
    })
  })
})

describe("formatIban", () => {
  describe("formatting unformatted IBANs", () => {
    it("should format IBAN correctly with 4-character groups", () => {
      expect(formatIban("HR1234567890123456789")).toBe("HR12 3456 7890 1234 5678 9")
    })

    it("should convert to uppercase while formatting", () => {
      expect(formatIban("hr1234567890123456789")).toBe("HR12 3456 7890 1234 5678 9")
    })
  })

  describe("handling already formatted IBANs", () => {
    it("should preserve correct formatting", () => {
      expect(formatIban("HR12 3456 7890 1234 5678 9")).toBe("HR12 3456 7890 1234 5678 9")
    })

    it("should normalize extra spaces", () => {
      expect(formatIban("HR12  3456  7890  1234  5678  9")).toBe(
        "HR12 3456 7890 1234 5678 9"
      )
    })
  })

  describe("edge cases", () => {
    it("should handle short strings", () => {
      expect(formatIban("HR12")).toBe("HR12")
    })

    it("should handle empty string", () => {
      expect(formatIban("")).toBe("")
    })
  })
})

describe("ibanSchema", () => {
  describe("valid input", () => {
    it("should pass and transform valid IBAN", () => {
      const result = ibanSchema.safeParse("HR1234567890123456789")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })

    it("should transform lowercase to uppercase", () => {
      const result = ibanSchema.safeParse("hr1234567890123456789")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })

    it("should remove spaces from IBAN", () => {
      const result = ibanSchema.safeParse("HR12 3456 7890 1234 5678 9")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })

    it("should handle mixed case with spaces", () => {
      const result = ibanSchema.safeParse("Hr12 3456 7890 1234 5678 9")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })
  })

  describe("invalid input with Croatian error messages", () => {
    it("should fail with Croatian message for wrong country", () => {
      const result = ibanSchema.safeParse("DE1234567890123456789")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("Neispravan IBAN format (HR + 19 znamenki)")
      }
    })

    it("should fail with Croatian message for wrong length", () => {
      const result = ibanSchema.safeParse("HR12345678901234567890")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("Neispravan IBAN format (HR + 19 znamenki)")
      }
    })

    it("should fail for IBAN with non-numeric characters", () => {
      const result = ibanSchema.safeParse("HR123456789012345678a")
      expect(result.success).toBe(false)
    })
  })
})

describe("ibanOptionalSchema", () => {
  describe("empty values", () => {
    it("should pass for empty string", () => {
      const result = ibanOptionalSchema.safeParse("")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("")
      }
    })

    it("should pass for undefined", () => {
      const result = ibanOptionalSchema.safeParse(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("")
      }
    })
  })

  describe("valid IBAN", () => {
    it("should pass and transform valid IBAN", () => {
      const result = ibanOptionalSchema.safeParse("HR1234567890123456789")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })

    it("should transform lowercase to uppercase", () => {
      const result = ibanOptionalSchema.safeParse("hr1234567890123456789")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("HR1234567890123456789")
      }
    })
  })

  describe("invalid IBAN", () => {
    it("should fail for invalid IBAN with wrong country", () => {
      const result = ibanOptionalSchema.safeParse("DE1234567890123456789")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message
        expect(errorMessage).toBe("Neispravan IBAN format")
      }
    })

    it("should fail for IBAN with wrong length when provided", () => {
      const result = ibanOptionalSchema.safeParse("HR123456789012345678")
      expect(result.success).toBe(false)
    })
  })
})
