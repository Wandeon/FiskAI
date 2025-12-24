import { describe, it, expect } from "vitest"
import { orderCitations, type SourceCard } from "../citations"

describe("orderCitations", () => {
  const lawSource: SourceCard = {
    id: "law_1",
    title: "Zakon o PDV-u",
    authority: "LAW",
    url: "https://example.com/law",
    effectiveFrom: "2024-01-01",
    confidence: 0.95,
  }

  const regulationSource: SourceCard = {
    id: "reg_1",
    title: "Pravilnik",
    authority: "REGULATION",
    url: "https://example.com/reg",
    effectiveFrom: "2024-01-01",
    confidence: 0.9,
  }

  const guidanceSource: SourceCard = {
    id: "guid_1",
    title: "Mišljenje",
    authority: "GUIDANCE",
    url: "https://example.com/guid",
    effectiveFrom: "2024-06-01",
    confidence: 0.85,
  }

  it("orders by authority level (LAW > REGULATION > GUIDANCE)", () => {
    const sources = [guidanceSource, lawSource, regulationSource]
    const ordered = orderCitations(sources)

    expect(ordered[0].authority).toBe("LAW")
    expect(ordered[1].authority).toBe("REGULATION")
    expect(ordered[2].authority).toBe("GUIDANCE")
  })

  it("uses effective date as tiebreaker (newer first)", () => {
    const older: SourceCard = { ...regulationSource, id: "reg_old", effectiveFrom: "2023-01-01" }
    const newer: SourceCard = { ...regulationSource, id: "reg_new", effectiveFrom: "2024-06-01" }

    const ordered = orderCitations([older, newer])
    expect(ordered[0].id).toBe("reg_new")
  })

  it("uses confidence as secondary tiebreaker", () => {
    const low: SourceCard = { ...regulationSource, id: "reg_low", confidence: 0.7 }
    const high: SourceCard = { ...regulationSource, id: "reg_high", confidence: 0.95 }

    const ordered = orderCitations([low, high])
    expect(ordered[0].id).toBe("reg_high")
  })

  it("uses id as final stable tiebreaker", () => {
    const a: SourceCard = { ...regulationSource, id: "aaa" }
    const b: SourceCard = { ...regulationSource, id: "bbb" }

    const ordered = orderCitations([b, a])
    expect(ordered[0].id).toBe("aaa")
  })
})
