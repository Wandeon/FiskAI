// src/lib/regulatory-truth/__tests__/sentinel.test.ts

import { describe, it, expect } from "vitest"
import { SentinelOutputSchema, validateSentinelOutput, isSentinelOutputValid } from "../schemas"

describe("Sentinel Schema", () => {
  const validOutput = {
    source_url: "https://porezna.hr/pausalno",
    fetch_timestamp: "2024-12-21T10:00:00.000Z",
    content_hash: "a".repeat(64),
    has_changed: true,
    previous_hash: "b".repeat(64),
    extracted_content: "Some regulatory text about paušalni obrt...",
    content_type: "html",
    change_summary: "Updated threshold from €35,000 to €40,000",
    sections_changed: ["section-thresholds"],
    fetch_status: "success",
    error_message: null,
  }

  it("should validate correct sentinel output", () => {
    const result = SentinelOutputSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
  })

  it("should reject invalid content_hash length", () => {
    const invalid = { ...validOutput, content_hash: "tooshort" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid content_type", () => {
    const invalid = { ...validOutput, content_type: "docx" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid fetch_status", () => {
    const invalid = { ...validOutput, fetch_status: "pending" }
    const result = SentinelOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should accept null previous_hash for first fetch", () => {
    const firstFetch = { ...validOutput, previous_hash: null, has_changed: false }
    const result = SentinelOutputSchema.safeParse(firstFetch)
    expect(result.success).toBe(true)
  })

  it("validateSentinelOutput should throw on invalid input", () => {
    expect(() => validateSentinelOutput({ invalid: true })).toThrow()
  })

  it("isSentinelOutputValid should return false for invalid input", () => {
    expect(isSentinelOutputValid({ invalid: true })).toBe(false)
  })

  it("isSentinelOutputValid should return true for valid input", () => {
    expect(isSentinelOutputValid(validOutput)).toBe(true)
  })
})
