// e2e/assistant/focus-management.spec.ts
import { test, expect } from "@playwright/test"

/**
 * E2E Test: Focus Management
 *
 * Focus should move predictably and never get lost.
 */

test.describe("Focus Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/assistant")
  })

  test("focus moves to headline after answer complete", async ({ page }) => {
    const input = page.getByRole("textbox")
    await input.fill("What is VAT rate?")
    await input.press("Enter")

    // Wait for answer
    const headline = page.getByRole("heading", { level: 2 })
    await expect(headline).toBeVisible()

    // Headline should be focused
    await expect(headline).toBeFocused()
  })

  test("skip links work correctly", async ({ page }) => {
    // Tab to reveal skip links
    await page.keyboard.press("Tab")

    // Should see skip link
    const skipToAnswer = page.getByRole("link", { name: /skip to answer/i })
    await expect(skipToAnswer).toBeVisible()

    // Click skip link
    await skipToAnswer.click()

    // Focus should be in answer region
    const answerRegion = page.locator("#assistant-answer")
    await expect(answerRegion).toBeVisible()
  })

  test("Tab order follows logical sequence", async ({ page }) => {
    const focusOrder: string[] = []

    // Tab through elements and record focus
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab")
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.tagName + (el?.getAttribute("aria-label") || el?.textContent?.slice(0, 20) || "")
      })
      focusOrder.push(focused)
    }

    // Input should come before suggestions
    const inputIndex = focusOrder.findIndex((f) => f.includes("TEXTAREA"))
    const suggestionIndex = focusOrder.findIndex(
      (f) => f.includes("listbox") || f.includes("option")
    )

    if (inputIndex !== -1 && suggestionIndex !== -1) {
      expect(inputIndex).toBeLessThan(suggestionIndex)
    }
  })

  test("Escape closes drawer and returns focus to toggle", async ({ page }) => {
    // Submit query
    const input = page.getByRole("textbox")
    await input.fill("What is VAT rate?")
    await input.press("Enter")

    // Wait for answer with Why button
    const whyButton = page.getByRole("button", { name: /why/i })
    await expect(whyButton).toBeVisible()

    // Open Why drawer
    await whyButton.click()

    // Drawer should be visible
    const drawer = page.getByRole("region", { name: /why/i })
    await expect(drawer).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Drawer should be closed
    await expect(drawer).not.toBeVisible()

    // Focus should return to Why button
    await expect(whyButton).toBeFocused()
  })

  test("focus does not get lost during streaming", async ({ page }) => {
    const input = page.getByRole("textbox")
    await input.fill("What is VAT rate?")
    await input.press("Enter")

    // During loading, focus should not be on a removed element
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).not.toBe("undefined")
    expect(focused).toBeTruthy()

    // Wait for complete
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible()

    // Focus should be on headline
    await expect(page.getByRole("heading", { level: 2 })).toBeFocused()
  })
})
