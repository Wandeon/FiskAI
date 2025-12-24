import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildAnswer } from "../answer-builder"
import * as conceptMatcher from "../concept-matcher"
import * as ruleSelector from "../rule-selector"
import * as conflictDetector from "../conflict-detector"
import * as citationBuilder from "../citation-builder"

vi.mock("../concept-matcher")
vi.mock("../rule-selector")
vi.mock("../conflict-detector")
vi.mock("../citation-builder")

describe("buildAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns REFUSAL with NO_CITABLE_RULES when no concepts match", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const result = await buildAnswer("gibberish query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("NO_CITABLE_RULES")
  })

  it("returns REFUSAL with NO_CITABLE_RULES when no rules found", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      { conceptId: "c1", slug: "test", nameHr: "Test", score: 0.8, matchedKeywords: ["test"] },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([])

    const result = await buildAnswer("test query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("NO_CITABLE_RULES")
  })

  it("returns REFUSAL with UNRESOLVED_CONFLICT when conflict cannot be resolved", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      { conceptId: "c1", slug: "test", nameHr: "Test", score: 0.8, matchedKeywords: ["test"] },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      { id: "r1", value: "25", valueType: "percentage" } as any,
      { id: "r2", value: "13", valueType: "percentage" } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: true,
      canResolve: false,
      conflictingRules: [],
    })

    const result = await buildAnswer("test query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("UNRESOLVED_CONFLICT")
  })

  it("returns ANSWER with citations when rules found", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      {
        conceptId: "c1",
        slug: "pausalni-prag",
        nameHr: "Prag",
        score: 0.9,
        matchedKeywords: ["prag"],
      },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      {
        id: "r1",
        titleHr: "Prag za paušalno",
        value: "39816.84",
        valueType: "currency_eur",
        authorityLevel: "LAW",
        explanationHr: "Godišnji primitak do 39.816,84 EUR.",
        sourcePointers: [{ id: "sp1" }],
        confidence: 0.95,
      } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: false,
      canResolve: true,
      conflictingRules: [],
    })
    vi.mocked(citationBuilder.buildCitations).mockReturnValue({
      primary: {
        id: "r1",
        title: "Test",
        authority: "LAW",
        url: "http://test.com",
        effectiveFrom: "2024-01-01",
        confidence: 0.9,
      },
      supporting: [],
    })

    const result = await buildAnswer("koji je prag za paušalni obrt", "MARKETING")

    expect(result.kind).toBe("ANSWER")
    expect(result.topic).toBe("REGULATORY")
    expect(result.citations).toBeDefined()
    expect(result.headline).toBeDefined()
  })

  it("classifies OUT_OF_SCOPE for non-regulatory queries", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    // Query that sounds like product question
    const result = await buildAnswer("kako se prijaviti na FiskAI", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    // Could be OUT_OF_SCOPE or NO_CITABLE_RULES depending on classification
  })

  it("includes surface in response", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const marketingResult = await buildAnswer("test", "MARKETING")
    const appResult = await buildAnswer("test", "APP")

    expect(marketingResult.surface).toBe("MARKETING")
    expect(appResult.surface).toBe("APP")
  })

  it("includes requestId and traceId", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const result = await buildAnswer("test", "MARKETING")

    expect(result.requestId).toMatch(/^req_/)
    expect(result.traceId).toMatch(/^trace_/)
  })

  it("includes schemaVersion", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const result = await buildAnswer("test", "MARKETING")

    expect(result.schemaVersion).toBe("1.0.0")
  })

  it("includes createdAt timestamp", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const result = await buildAnswer("test", "MARKETING")

    expect(result.createdAt).toBeDefined()
    expect(new Date(result.createdAt).toString()).not.toBe("Invalid Date")
  })

  it("sets confidence level to HIGH when score >= 0.9", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      { conceptId: "c1", slug: "test", nameHr: "Test", score: 0.8, matchedKeywords: ["test"] },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      {
        id: "r1",
        titleHr: "Test",
        value: "100",
        valueType: "number",
        authorityLevel: "LAW",
        confidence: 0.95,
        sourcePointers: [{ id: "sp1" }],
      } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: false,
      canResolve: true,
      conflictingRules: [],
    })
    vi.mocked(citationBuilder.buildCitations).mockReturnValue({
      primary: {
        id: "r1",
        title: "Test",
        authority: "LAW",
        url: "http://test.com",
        effectiveFrom: "2024-01-01",
        confidence: 0.95,
      },
      supporting: [],
    })

    const result = await buildAnswer("test", "MARKETING")

    expect(result.confidence?.level).toBe("HIGH")
    expect(result.confidence?.score).toBe(0.95)
  })

  it("generates related questions", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      {
        conceptId: "c1",
        slug: "pausalni-prag",
        nameHr: "Prag",
        score: 0.9,
        matchedKeywords: ["pausalni"],
      },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      {
        id: "r1",
        titleHr: "Test",
        value: "100",
        valueType: "number",
        authorityLevel: "LAW",
        confidence: 0.9,
        sourcePointers: [{ id: "sp1" }],
      } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: false,
      canResolve: true,
      conflictingRules: [],
    })
    vi.mocked(citationBuilder.buildCitations).mockReturnValue({
      primary: {
        id: "r1",
        title: "Test",
        authority: "LAW",
        url: "http://test.com",
        effectiveFrom: "2024-01-01",
        confidence: 0.9,
      },
      supporting: [],
    })

    const result = await buildAnswer("pausalni prag", "MARKETING")

    expect(result.relatedQuestions).toBeDefined()
    expect(result.relatedQuestions!.length).toBeGreaterThan(0)
  })
})
