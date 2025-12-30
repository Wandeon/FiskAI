import { describe, it } from "node:test"
import assert from "node:assert"
import {
  isValidOIB,
  validateCertificate,
  ParsedCertificate,
  forgeToPem,
} from "../certificate-parser"
import * as forge from "node-forge"

describe("certificate-parser", () => {
  describe("isValidOIB", () => {
    it("should reject invalid OIBs", () => {
      assert.strictEqual(isValidOIB("12345678901"), false)
      assert.strictEqual(isValidOIB(""), false)
    })
  })

  describe("validateCertificate", () => {
    const baseCert: ParsedCertificate = {
      subject: "Test",
      oib: "12345678903",
      serial: "123456",
      notBefore: new Date("2024-01-01"),
      notAfter: new Date("2026-01-01"),
      issuer: "Test CA",
      sha256: "abc123",
      privateKey: {} as forge.pki.PrivateKey,
      certificate: {} as forge.pki.Certificate,
    }

    it("should validate valid certificate", () => {
      assert.strictEqual(validateCertificate(baseCert, "PROD").valid, true)
    })

    it("should reject expired certificate", () => {
      const result = validateCertificate({ ...baseCert, notAfter: new Date("2020-01-01") }, "PROD")
      assert.strictEqual(result.valid, false)
    })
  })

  describe("forgeToPem", () => {
    it("should convert to PEM format", () => {
      const keys = forge.pki.rsa.generateKeyPair({ bits: 512, workers: -1 })
      const cert = forge.pki.createCertificate()
      cert.publicKey = keys.publicKey
      cert.serialNumber = "01"
      cert.validity.notBefore = new Date()
      cert.validity.notAfter = new Date()
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
      const attrs = [{ name: "commonName", value: "Test" }]
      cert.setSubject(attrs)
      cert.setIssuer(attrs)
      cert.sign(keys.privateKey, forge.md.sha256.create())
      const result = forgeToPem(keys.privateKey, cert)
      assert.ok(result.privateKeyPem.includes("-----BEGIN RSA PRIVATE KEY-----"))
    })
  })
})
