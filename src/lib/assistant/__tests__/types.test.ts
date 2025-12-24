import { describe, it, expect } from "vitest"
import {
  SCHEMA_VERSION,
  LIMITS,
  AUTHORITY_ORDER,
  AUTHORITY_RANK,
  type AssistantResponse,
  type RefusalReason,
} from "../types"

describe("Assistant Types", () => {
  it("exports SCHEMA_VERSION as 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0")
  })

  it("exports LIMITS with correct values", () => {
    expect(LIMITS.headline).toBe(120)
    expect(LIMITS.directAnswer).toBe(240)
    expect(LIMITS.totalResponseChars).toBe(3500)
  })

  it("exports AUTHORITY_ORDER in correct sequence", () => {
    expect(AUTHORITY_ORDER).toEqual(["LAW", "REGULATION", "GUIDANCE", "PRACTICE"])
  })

  it("exports AUTHORITY_RANK with correct rankings", () => {
    expect(AUTHORITY_RANK.LAW).toBe(1)
    expect(AUTHORITY_RANK.REGULATION).toBe(2)
    expect(AUTHORITY_RANK.GUIDANCE).toBe(3)
    expect(AUTHORITY_RANK.PRACTICE).toBe(4)
  })
})
