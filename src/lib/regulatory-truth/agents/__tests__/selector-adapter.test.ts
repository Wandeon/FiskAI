// src/lib/regulatory-truth/agents/__tests__/selector-adapter.test.ts
//
// Unit tests for LLM-Based Selector Adaptation (Task 3.2)
//
// Tests the selector adapter which:
// 1. Generates CSS selector suggestions via LLM when format drift detected
// 2. Validates selectors against sample HTML
// 3. Enforces 90% precision gate (content vs nav/footer)
// 4. Creates PRs for human approval

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  generateSelectorSuggestions,
  validateSelector,
  calculatePrecision,
  isNavigationOrFooter,
  createSelectorSuggestionPR,
  type SelectorAdaptationInput,
  type SelectorValidation,
  type SelectorSuggestionPR,
  MIN_PRECISION_THRESHOLD,
  MIN_YIELD,
  MAX_YIELD,
} from "../selector-adapter"

// Mock the Ollama client
vi.mock("@/lib/ai/ollama-client", () => ({
  chatJSON: vi.fn(),
}))

import { chatJSON } from "@/lib/ai/ollama-client"

describe("Selector Adapter", () => {
  const mockedChatJSON = vi.mocked(chatJSON)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("generateSelectorSuggestions", () => {
    it("generates selector suggestions from LLM", async () => {
      // Arrange
      const input: SelectorAdaptationInput = {
        endpointUrl: "https://narodne-novine.nn.hr/clanci/sluzbeni/",
        currentHtml: `
          <html>
            <body>
              <nav><a href="/">Home</a></nav>
              <main>
                <article class="document">
                  <h2 class="title">Zakon o PDV-u</h2>
                  <div class="content">Clanak 1...</div>
                </article>
                <article class="document">
                  <h2 class="title">Pravilnik</h2>
                  <div class="content">Clanak 2...</div>
                </article>
              </main>
              <footer>Copyright 2024</footer>
            </body>
          </html>
        `,
        historicalExamples: [
          {
            html: `<div class="zakon"><h1>Zakon</h1><p>Text</p></div>`,
            extractedItems: ["Zakon: Text"],
          },
        ],
        currentSelectors: [".zakon"],
      }

      // Mock LLM response
      mockedChatJSON.mockResolvedValueOnce({
        suggestedSelectors: ["article.document", ".document h2.title", "main article"],
        reasoning: "The page structure changed from .zakon to article.document class pattern",
      })

      // Act
      const result = await generateSelectorSuggestions(input)

      // Assert
      expect(mockedChatJSON).toHaveBeenCalledTimes(1)
      expect(result.suggestedSelectors).toEqual([
        "article.document",
        ".document h2.title",
        "main article",
      ])
      expect(result.reasoning).toContain("article.document")
    })

    it("handles LLM returning empty suggestions", async () => {
      const input: SelectorAdaptationInput = {
        endpointUrl: "https://example.com",
        currentHtml: "<html><body></body></html>",
        historicalExamples: [],
        currentSelectors: [".old-selector"],
      }

      mockedChatJSON.mockResolvedValueOnce({
        suggestedSelectors: [],
        reasoning: "Could not identify suitable selectors",
      })

      const result = await generateSelectorSuggestions(input)

      expect(result.suggestedSelectors).toEqual([])
      expect(result.reasoning).toBeDefined()
    })

    it("handles LLM errors gracefully", async () => {
      const input: SelectorAdaptationInput = {
        endpointUrl: "https://example.com",
        currentHtml: "<html><body><div>Content</div></body></html>",
        historicalExamples: [],
        currentSelectors: [".selector"],
      }

      mockedChatJSON.mockRejectedValueOnce(new Error("LLM timeout"))

      await expect(generateSelectorSuggestions(input)).rejects.toThrow("LLM timeout")
    })
  })

  describe("validateSelector", () => {
    const sampleHtml = `
      <html>
        <body>
          <nav id="nav">
            <ul><li><a href="/">Home</a></li></ul>
          </nav>
          <main>
            <article class="content-item">
              <h2>Article 1</h2>
              <p>Content text here</p>
            </article>
            <article class="content-item">
              <h2>Article 2</h2>
              <p>More content</p>
            </article>
            <article class="content-item">
              <h2>Article 3</h2>
              <p>Even more</p>
            </article>
          </main>
          <footer id="footer">
            <p>Copyright 2024</p>
          </footer>
        </body>
      </html>
    `

    it("validates selectors against sample set", () => {
      const result = validateSelector("article.content-item", sampleHtml)

      expect(result.selector).toBe("article.content-item")
      expect(result.yield).toBe(3)
      expect(result.precision).toBeGreaterThanOrEqual(0.9)
      expect(result.isValid).toBe(true)
      expect(result.rejectionReason).toBeUndefined()
    })

    it("rejects selectors with <90% precision", () => {
      // HTML where the selector matches both content and nav elements
      const mixedHtml = `
        <html>
          <body>
            <nav>
              <div class="item">Nav 1</div>
              <div class="item">Nav 2</div>
              <div class="item">Nav 3</div>
              <div class="item">Nav 4</div>
              <div class="item">Nav 5</div>
              <div class="item">Nav 6</div>
              <div class="item">Nav 7</div>
              <div class="item">Nav 8</div>
              <div class="item">Nav 9</div>
            </nav>
            <main>
              <div class="item">Content 1</div>
            </main>
          </body>
        </html>
      `

      const result = validateSelector(".item", mixedHtml)

      // 10 items, 9 in nav, 1 in content = 10% precision
      expect(result.yield).toBe(10)
      expect(result.precision).toBeLessThan(0.9)
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason?.toLowerCase()).toContain("precision")
    })

    it("rejects selectors that capture nav/footer", () => {
      const navHeavyHtml = `
        <html>
          <body>
            <nav>
              <a class="link" href="/">Home</a>
              <a class="link" href="/about">About</a>
              <a class="link" href="/contact">Contact</a>
            </nav>
            <footer>
              <a class="link" href="/privacy">Privacy</a>
            </footer>
          </body>
        </html>
      `

      const result = validateSelector("a.link", navHeavyHtml)

      // All 4 links are in nav/footer
      expect(result.yield).toBe(4)
      expect(result.precision).toBe(0) // 0% content nodes
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason).toContain("nav")
    })

    it("rejects selectors with yield below minimum", () => {
      const result = validateSelector("article.content-item", sampleHtml, {
        minYield: 10,
      })

      expect(result.yield).toBe(3)
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason).toContain("minimum yield")
    })

    it("rejects selectors with yield above maximum", () => {
      const manyItemsHtml = `
        <html>
          <body>
            <main>
              ${Array.from({ length: 200 }, (_, i) => `<p class="item">Item ${i}</p>`).join("")}
            </main>
          </body>
        </html>
      `

      const result = validateSelector(".item", manyItemsHtml, { maxYield: 100 })

      expect(result.yield).toBe(200)
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason).toContain("maximum yield")
    })

    it("handles invalid CSS selectors gracefully", () => {
      const result = validateSelector("[[invalid", sampleHtml)

      expect(result.yield).toBe(0)
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason?.toLowerCase()).toContain("invalid selector")
    })

    it("handles selectors that match nothing", () => {
      const result = validateSelector(".nonexistent-class", sampleHtml)

      expect(result.yield).toBe(0)
      expect(result.isValid).toBe(false)
      expect(result.rejectionReason).toContain("no elements")
    })
  })

  describe("calculatePrecision", () => {
    it("returns 1.0 for all content nodes", () => {
      const html = `
        <main>
          <article>Article 1</article>
          <article>Article 2</article>
        </main>
      `

      const precision = calculatePrecision("article", html)

      expect(precision).toBe(1.0)
    })

    it("returns 0 for all nav/footer nodes", () => {
      const html = `
        <nav>
          <a href="/">Link 1</a>
          <a href="/about">Link 2</a>
        </nav>
      `

      const precision = calculatePrecision("a", html)

      expect(precision).toBe(0)
    })

    it("calculates correct ratio for mixed content", () => {
      const html = `
        <body>
          <nav><span class="text">Nav</span></nav>
          <main>
            <span class="text">Content 1</span>
            <span class="text">Content 2</span>
            <span class="text">Content 3</span>
          </main>
          <footer><span class="text">Footer</span></footer>
        </body>
      `

      const precision = calculatePrecision(".text", html)

      // 5 total, 3 content, 2 nav/footer = 60% precision
      expect(precision).toBeCloseTo(0.6, 1)
    })

    it("returns 0 for empty match set", () => {
      const html = `<html><body></body></html>`

      const precision = calculatePrecision(".nonexistent", html)

      expect(precision).toBe(0)
    })
  })

  describe("isNavigationOrFooter", () => {
    it("returns true for elements inside nav", () => {
      const html = `<nav><div id="test">Link</div></nav>`
      expect(isNavigationOrFooter("#test", html)).toBe(true)
    })

    it("returns true for elements inside footer", () => {
      const html = `<footer><p id="test">Copyright</p></footer>`
      expect(isNavigationOrFooter("#test", html)).toBe(true)
    })

    it("returns true for elements inside header", () => {
      const html = `<header><h1 id="test">Logo</h1></header>`
      expect(isNavigationOrFooter("#test", html)).toBe(true)
    })

    it("returns true for elements inside aside", () => {
      const html = `<aside><div id="test">Sidebar</div></aside>`
      expect(isNavigationOrFooter("#test", html)).toBe(true)
    })

    it("returns false for elements inside main", () => {
      const html = `<main><article id="test">Content</article></main>`
      expect(isNavigationOrFooter("#test", html)).toBe(false)
    })

    it("returns false for elements inside article", () => {
      const html = `<article><p id="test">Content</p></article>`
      expect(isNavigationOrFooter("#test", html)).toBe(false)
    })

    it("returns false for elements in body without nav/footer ancestors", () => {
      const html = `<body><div id="test">Content</div></body>`
      expect(isNavigationOrFooter("#test", html)).toBe(false)
    })

    it("handles role attributes for accessibility", () => {
      const html = `<div role="navigation"><span id="test">Nav</span></div>`
      expect(isNavigationOrFooter("#test", html)).toBe(true)
    })
  })

  describe("createSelectorSuggestionPR", () => {
    it("creates PR for human approval", async () => {
      const endpointId = "endpoint-123"
      const suggestedSelectors = ["article.document", "main .content"]
      const validationResults: SelectorValidation[] = [
        {
          selector: "article.document",
          yield: 5,
          precision: 0.95,
          isValid: true,
        },
        {
          selector: "main .content",
          yield: 3,
          precision: 0.92,
          isValid: true,
        },
      ]

      const pr = await createSelectorSuggestionPR(endpointId, suggestedSelectors, validationResults)

      expect(pr.endpointId).toBe(endpointId)
      expect(pr.suggestedSelectors).toEqual(suggestedSelectors)
      expect(pr.validationResults).toEqual(validationResults)
      expect(pr.status).toBe("pending_review")
    })

    it("includes all validation results even for invalid selectors", async () => {
      const endpointId = "endpoint-456"
      const suggestedSelectors = [".valid", ".invalid"]
      const validationResults: SelectorValidation[] = [
        {
          selector: ".valid",
          yield: 10,
          precision: 0.95,
          isValid: true,
        },
        {
          selector: ".invalid",
          yield: 50,
          precision: 0.5,
          isValid: false,
          rejectionReason: "Precision below 90%",
        },
      ]

      const pr = await createSelectorSuggestionPR(endpointId, suggestedSelectors, validationResults)

      expect(pr.validationResults).toHaveLength(2)
      expect(pr.validationResults[1].isValid).toBe(false)
      expect(pr.validationResults[1].rejectionReason).toBeDefined()
    })

    it("sets pending_review status by default (never auto-approved)", async () => {
      const pr = await createSelectorSuggestionPR(
        "endpoint-789",
        ["selector"],
        [
          {
            selector: "selector",
            yield: 5,
            precision: 1.0,
            isValid: true,
          },
        ]
      )

      expect(pr.status).toBe("pending_review")
    })
  })

  describe("constants", () => {
    it("has 90% minimum precision threshold", () => {
      expect(MIN_PRECISION_THRESHOLD).toBe(0.9)
    })

    it("has reasonable yield range defaults", () => {
      expect(MIN_YIELD).toBeGreaterThan(0)
      expect(MAX_YIELD).toBeGreaterThan(MIN_YIELD)
      expect(MAX_YIELD).toBeLessThanOrEqual(500)
    })
  })
})
