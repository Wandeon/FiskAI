import { describe, it, expect } from "vitest"
import {
  parseEInvoiceSecrets,
  parseFiscalizationSecrets,
  validateIntegrationKind,
  IntegrationSecretsError,
} from "../types"

describe("Integration Types", () => {
  describe("parseEInvoiceSecrets", () => {
    it("parses valid e-invoice secrets", () => {
      const input = { apiKey: "test-key-123" }
      const result = parseEInvoiceSecrets(input)
      expect(result).toEqual({ apiKey: "test-key-123" })
    })

    it("throws on missing apiKey", () => {
      expect(() => parseEInvoiceSecrets({})).toThrow(IntegrationSecretsError)
    })

    it("throws on empty apiKey", () => {
      expect(() => parseEInvoiceSecrets({ apiKey: "" })).toThrow(IntegrationSecretsError)
    })
  })

  describe("parseFiscalizationSecrets", () => {
    it("parses valid fiscalization secrets", () => {
      const input = {
        p12Base64: "dGVzdA==",
        p12Password: "password123",
      }
      const result = parseFiscalizationSecrets(input)
      expect(result).toEqual(input)
    })

    it("throws on missing p12Base64", () => {
      expect(() => parseFiscalizationSecrets({ p12Password: "x" })).toThrow(IntegrationSecretsError)
    })

    it("throws on missing p12Password", () => {
      expect(() => parseFiscalizationSecrets({ p12Base64: "x" })).toThrow(IntegrationSecretsError)
    })
  })

  describe("validateIntegrationKind", () => {
    it("returns true for valid e-invoice kinds", () => {
      expect(validateIntegrationKind("EINVOICE_EPOSLOVANJE")).toBe(true)
      expect(validateIntegrationKind("EINVOICE_FINA")).toBe(true)
      expect(validateIntegrationKind("EINVOICE_IE_RACUNI")).toBe(true)
    })

    it("returns true for fiscalization kind", () => {
      expect(validateIntegrationKind("FISCALIZATION_CIS")).toBe(true)
    })

    it("returns false for invalid kind", () => {
      expect(validateIntegrationKind("INVALID")).toBe(false)
      expect(validateIntegrationKind("")).toBe(false)
    })
  })
})
